"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@ui/button";
import { FormField, Input, PasswordInput } from "@ui/form";

import {
  handleMutationError,
  shouldToastError,
  useGoogleUrl,
  useLogin,
  usePublicConfig,
  useResendVerification,
} from "@/hooks/auth";
import { ApiError } from "@/lib/axios";
import { normalizeEmail } from "@/lib/email";
import {
  TEMP_TOKEN_STORAGE_KEY,
  generateOAuthState,
  getGoogleRedirectUri,
  saveOAuthState,
} from "@/lib/oauth";
import { getConfig, SYSTEM_CONFIG_KEYS } from "@/lib/system-config";
import { useLocale } from "@/providers/locale-provider";
import { ErrorCode, type GoogleAuthUrlParams } from "@/types";
import {
  isTurnstileConfigured,
  TurnstileField,
  type TurnstileFieldHandle,
} from "../turnstile-field";

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

  // ── Đăng nhập Google (OAuth2 Authorization Code + PKCE-less state) ──────
  // state do client sinh + lưu sessionStorage → trang /auth/callback so khớp
  // chống CSRF. redirectUri phải trùng URI đã đăng ký allowlist phía backend.
  // Gate qua mounted-state: feature flag đến từ query async — render nút sau
  // khi hydrate để tránh mismatch server/client HTML (Next prerender).
  const [mounted, setMounted] = useState(false);
  const { data: publicConfig } = usePublicConfig();
  const socialLoginEnabled =
    mounted &&
    Boolean(getConfig(publicConfig, SYSTEM_CONFIG_KEYS.socialLoginEnabled, false));

  useEffect(() => {
    setMounted(true);
  }, []);

  const [googleParams, setGoogleParams] = useState<GoogleAuthUrlParams | null>(null);
  const googleUrl = useGoogleUrl(googleParams ?? undefined, {
    enabled: googleParams !== null,
    // Click nút mới fetch — lỗi thì toast + cho bấm lại, retry tự động vô ích
    retry: false,
  });

  function handleGoogleLogin() {
    if (googleParams !== null) return;
    const state = generateOAuthState();
    saveOAuthState(state);
    setGoogleParams({ redirectUri: getGoogleRedirectUri(), state });
  }

  // Lấy được URL → chuyển hướng sang màn hình đồng ý của Google
  useEffect(() => {
    if (googleUrl.isSuccess && googleUrl.data?.url && googleParams !== null) {
      window.location.assign(googleUrl.data.url);
    }
  }, [googleUrl.isSuccess, googleUrl.data, googleParams]);

  // Lỗi lấy URL (chưa cấu hình Google, mạng...) → toast + cho bấm lại
  useEffect(() => {
    if (googleUrl.isError && googleParams !== null) {
      handleMutationError(googleUrl.error);
      setGoogleParams(null);
    }
  }, [googleUrl.isError, googleUrl.error, googleParams]);

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

      {socialLoginEnabled && (
        <>
          <div className="flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              {t("login.or")}
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={login.isPending || lockoutActive || googleParams !== null}
            onClick={handleGoogleLogin}
          >
            {googleParams !== null ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {t("login.googleRedirecting")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <GoogleIcon />
                {t("login.googleButton")}
              </span>
            )}
          </Button>
        </>
      )}
    </form>
  );
}

/** Logo "G" của Google (lucide không có icon thương hiệu) */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
