"use client";

import { useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail, MailCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@ui/button";
import { FormField, Input } from "@ui/form";

import { shouldToastError, useForgotPassword } from "@/hooks/auth";
import { ApiError } from "@/lib/axios";
import { normalizeEmail } from "@/lib/email";
import { useLocale } from "@/providers/locale-provider";
import { ErrorCode } from "@/types";
import {
  isTurnstileConfigured,
  TurnstileField,
  type TurnstileFieldHandle,
} from "../turnstile-field";

interface ForgotPasswordFormValues {
  email: string;
}

type ForgotPasswordFailure =
  | { kind: "none" }
  | { kind: "captcha"; message: string }
  | { kind: "generic"; message: string };

export function ForgotPasswordForm() {
  const { t } = useLocale();
  const router = useRouter();
  const turnstileRef = useRef<TurnstileFieldHandle>(null);

  const [failure, setFailure] = useState<ForgotPasswordFailure>({ kind: "none" });
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const schema = useMemo(
    () =>
      z.object({
        email: z
          .string()
          .transform(normalizeEmail)
          .pipe(z.string().min(1, t("forgotPassword.emailRequired")))
          .pipe(z.email(t("forgotPassword.emailInvalid"))),
      }),
    [t],
  );

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const forgotPassword = useForgotPassword({
    suppressToast: true,
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (error) => {
      // 422: lỗi theo field → gắn thẳng dưới đúng ô input
      if (error instanceof ApiError && error.status === 422 && error.errors?.length) {
        for (const fieldError of error.errors) {
          if (fieldError.field === "email") {
            form.setError(fieldError.field, { message: fieldError.message });
          }
        }
        return;
      }

      // Lỗi đã được interceptor toast toàn cục (mạng / 5xx / 429) → không hiện banner đè
      if (!shouldToastError(error)) return;

      // Token captcha chỉ dùng 1 lần — reset widget và yêu cầu tick lại
      if (
        error instanceof ApiError &&
        (error.code === ErrorCode.CAPTCHA_REQUIRED ||
          error.code === ErrorCode.CAPTCHA_INVALID)
      ) {
        setFailure({ kind: "captcha", message: t("forgotPassword.captchaRequired") });
        resetTurnstileToken();
        return;
      }

      if (error instanceof ApiError) {
        setFailure({ kind: "generic", message: error.message });
        return;
      }

      setFailure({ kind: "generic", message: t("forgotPassword.genericError") });
    },
  });

  const turnstileRequired = isTurnstileConfigured();

  function resetTurnstileToken() {
    setTurnstileToken(null);
    turnstileRef.current?.reset();
  }

  function onSubmit(values: ForgotPasswordFormValues) {
    setFailure({ kind: "none" });
    forgotPassword.mutate({
      email: normalizeEmail(values.email),
      turnstileToken: turnstileToken ?? undefined,
    });
  }

  // ── Màn "check email" (anti-enum: BE luôn 200, dù email có tồn tại hay không) ──
  if (submitted) {
    return (
      <div
        data-testid="forgot-password-success"
        className="flex flex-col items-center gap-4 py-6 text-center"
      >
        <span className="flex size-14 items-center justify-center rounded-full bg-success/15 text-success">
          <MailCheck className="size-7" aria-hidden="true" />
        </span>
        <h2 className="text-xl font-bold tracking-tight">{t("forgotPassword.successTitle")}</h2>
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">
          {t("forgotPassword.successMessage")}
        </p>
        <Button type="button" className="mt-2" onClick={() => router.replace("/login")}>
          {t("forgotPassword.backToLogin")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <FormField
        id="email"
        label={t("forgotPassword.email")}
        required
        error={form.formState.errors.email?.message}
      >
        <Input
          type="email"
          autoComplete="email"
          placeholder={t("forgotPassword.emailPlaceholder")}
          prefix={<Mail aria-hidden="true" />}
          disabled={forgotPassword.isPending}
          {...form.register("email")}
        />
      </FormField>

      <TurnstileField
        ref={turnstileRef}
        action="forgot_password"
        onToken={setTurnstileToken}
      />

      {failure.kind === "captcha" && (
        <div
          role="alert"
          className="rounded-xl border border-warning/40 bg-warning/10 px-3.5 py-2.5 text-sm text-warning"
        >
          {failure.message}
        </div>
      )}

      {failure.kind === "generic" && (
        <div
          role="alert"
          className="rounded-xl border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-sm text-danger"
        >
          {failure.message}
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={forgotPassword.isPending || (turnstileRequired && !turnstileToken)}
      >
        {forgotPassword.isPending ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            {t("forgotPassword.submitting")}
          </span>
        ) : (
          t("forgotPassword.submit")
        )}
      </Button>
    </form>
  );
}
