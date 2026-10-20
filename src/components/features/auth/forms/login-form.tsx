"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Typography } from "@ui/typography";

import { Button } from "@ui/button";
import { FormField, Input, PasswordInput } from "@ui/form";

import { shouldToastError, useLogin, useResendVerification } from "@/hooks/auth";
import { ApiError } from "@/lib/axios";
import { normalizeEmail } from "@/lib/email";
import { useLocale } from "@/providers/locale-provider";
import { ErrorCode } from "@/types";
import {
  isTurnstileConfigured,
  TurnstileField,
  type TurnstileFieldHandle,
} from "../turnstile-field";

const TEMP_TOKEN_STORAGE_KEY = "ppe.tempToken";

interface LoginFormValues {
  email: string;
  password: string;
}

type LoginFailure =
  | { kind: "none" }
  | { kind: "invalid"; message: string }
  | { kind: "inactive"; message: string }
  | { kind: "generic"; message: string };

interface LockoutState {
  message: string;
  seconds: number;
}

/** next query chỉ chấp nhận path nội bộ — chặn open redirect ("//evil.com") */
function getSafeNext(): string {
  if (typeof window === "undefined") return "/";
  const next = new URLSearchParams(window.location.search).get("next");
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/";
}

/** BE nhúng số phút còn lại trong message 423 (2 dạng: "thử lại sau N phút" / "khóa 15 phút") */
function parseLockoutSeconds(message: string): number {
  const match = message.match(/(\d+)\s*(?:phút|minutes?)/i);
  return match ? Number(match[1]) * 60 : 15 * 60;
}

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function LoginForm() {
  const { t } = useLocale();
  const router = useRouter();
  const turnstileRef = useRef<TurnstileFieldHandle>(null);

  const [failure, setFailure] = useState<LoginFailure>({ kind: "none" });
  const [lockout, setLockout] = useState<LockoutState | null>(null);
  const [resendToken, setResendToken] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      z.object({
        email: z
          .string()
          .transform(normalizeEmail)
          .pipe(z.string().min(1, t("login.emailRequired")))
          .pipe(z.email(t("login.emailInvalid"))),
        password: z.string().min(1, t("login.passwordRequired")),
      }),
    [t],
  );

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  // Đếm ngược thời gian khóa tài khoản (spec 7.2: parse số phút từ message 423)
  useEffect(() => {
    if (!lockout || lockout.seconds <= 0) return;
    const timer = setInterval(() => {
      setLockout((current) =>
        current && current.seconds > 1
          ? { ...current, seconds: current.seconds - 1 }
          : null,
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [lockout]);

  const login = useLogin({
    suppressToast: true,
    onSuccess: (data) => {
      if (data.requires2FA) {
        // Luồng 2FA: giữ tempToken trong sessionStorage (đề phòng reload trong 5 phút);
        // trang /2fa đọc lại token này
        sessionStorage.setItem(TEMP_TOKEN_STORAGE_KEY, data.tempToken);
        router.replace("/2fa");
        return;
      }
      router.replace(getSafeNext());
    },
    onError: (error) => {
      // 422: lỗi theo field → gắn thẳng dưới đúng ô input
      if (error instanceof ApiError && error.status === 422 && error.errors?.length) {
        for (const fieldError of error.errors) {
          if (fieldError.field === "email" || fieldError.field === "password") {
            form.setError(fieldError.field, { message: fieldError.message });
          }
        }
        return;
      }

      // Lỗi đã được interceptor toast toàn cục (mạng / 5xx / 429) → không hiện banner đè
      if (!shouldToastError(error)) return;

      if (error instanceof ApiError) {
        if (error.code === ErrorCode.INVALID_CREDENTIALS) {
          setFailure({ kind: "invalid", message: error.message });
          form.setValue("password", "");
          form.setFocus("password");
          return;
        }
        if (error.code === ErrorCode.ACCOUNT_LOCKED) {
          setLockout({ message: error.message, seconds: parseLockoutSeconds(error.message) });
          form.setValue("password", "");
          return;
        }
        if (error.code === ErrorCode.USER_INACTIVE) {
          setFailure({ kind: "inactive", message: error.message });
          return;
        }
        setFailure({ kind: "generic", message: error.message });
        return;
      }

      setFailure({ kind: "generic", message: t("login.genericError") });
    },
  });

  const resend = useResendVerification();

  const turnstileRequired = isTurnstileConfigured();

  function resetTurnstileToken() {
    setResendToken(null);
    turnstileRef.current?.reset();
  }

  function handleResend() {
    resend.mutate(
      { email: normalizeEmail(form.getValues("email")), turnstileToken: resendToken ?? undefined },
      {
        onSuccess: () => resetTurnstileToken(),
        onError: (error) => {
          // Token captcha chỉ dùng 1 lần — BE từ chối thì bắt tick lại
          if (
            error instanceof ApiError &&
            (error.code === ErrorCode.CAPTCHA_INVALID ||
              error.code === ErrorCode.CAPTCHA_REQUIRED)
          ) {
            resetTurnstileToken();
          }
        },
      },
    );
  }

  function onSubmit(values: LoginFormValues) {
    setFailure({ kind: "none" });
    login.mutate(values);
  }

  const lockoutActive = lockout !== null;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <FormField
        id="email"
        label={t("login.email")}
        required
        error={form.formState.errors.email?.message}
      >
        <Input
          type="email"
          autoComplete="email"
          placeholder={t("login.emailPlaceholder")}
          prefix={<Mail aria-hidden="true" />}
          disabled={login.isPending}
          {...form.register("email")}
        />
      </FormField>

      <FormField
        id="password"
        label={t("login.password")}
        required
        error={form.formState.errors.password?.message}
      >
        <PasswordInput
          placeholder={t("login.passwordPlaceholder")}
          disabled={login.isPending}
          {...form.register("password")}
        />
      </FormField>

      {(failure.kind === "invalid" || failure.kind === "generic") && (
        <div
          role="alert"
          className="rounded-xl border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-sm text-danger"
        >
          {failure.message}
        </div>
      )}

      {lockoutActive && (
        <div
          role="alert"
          className="rounded-xl border border-warning/40 bg-warning/10 px-3.5 py-2.5 text-sm text-warning"
        >
          <p>{lockout.message}</p>
          <p className="mt-1 font-semibold tabular-nums">
            {t("login.tryAgainIn")}: {formatCountdown(lockout.seconds)}
          </p>
        </div>
      )}

      {failure.kind === "inactive" && (
        <div
          role="alert"
          className="rounded-xl border border-warning/40 bg-warning/10 px-3.5 py-3 text-sm text-warning"
        >
          <p>{failure.message}</p>
          <TurnstileField
            ref={turnstileRef}
            action="resend_verification"
            onToken={setResendToken}
            className="mt-3"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 w-full"
            disabled={resend.isPending || (turnstileRequired && !resendToken)}
            onClick={handleResend}
          >
            {resend.isPending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {t("login.resending")}
              </span>
            ) : (
              t("login.resendVerification")
            )}
          </Button>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={login.isPending || lockoutActive}>
        {login.isPending ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            {t("login.submitting")}
          </span>
        ) : (
          t("login.submit")
        )}
      </Button>
    </form>
  );
}
