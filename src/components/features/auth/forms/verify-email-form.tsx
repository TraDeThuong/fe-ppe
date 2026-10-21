"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Loader2, Mail, MailCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@ui/button";
import { FormField, Input } from "@ui/form";

import { shouldToastError, useResendVerification, useVerifyEmail } from "@/hooks/auth";
import { ApiError } from "@/lib/axios";
import { normalizeEmail } from "@/lib/email";
import { useLocale } from "@/providers/locale-provider";
import { ErrorCode } from "@/types";
import {
  isTurnstileConfigured,
  TurnstileField,
  type TurnstileFieldHandle,
} from "../turnstile-field";

type VerifyState = "verifying" | "success" | "expired" | "invalid" | "error";

function readTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("token");
}

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function StatusPanel({
  testId,
  icon,
  title,
  message,
  actions,
  tone = "success",
}: {
  testId: string;
  icon: React.ReactNode;
  title: string;
  message: string;
  actions?: React.ReactNode;
  tone?: "success" | "warning";
}) {
  const { t } = useLocale();
  const router = useRouter();

  return (
    <div data-testid={testId} className="flex flex-col items-center gap-4 py-6 text-center">
      <span
        className={[
          "flex size-14 items-center justify-center rounded-full",
          tone === "success" ? "bg-success/15 text-success" : "bg-warning/15 text-warning",
        ].join(" ")}
      >
        {icon}
      </span>
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      <p className="max-w-sm text-sm leading-6 text-muted-foreground">{message}</p>
      <div className="flex flex-col items-center gap-3">
        {actions}
        <Button type="button" variant="outline" onClick={() => router.replace("/login")}>
          {t("verifyEmail.backToLogin")}
        </Button>
      </div>
    </div>
  );
}

function ResendPanel() {
  const { t } = useLocale();
  const turnstileRef = useRef<TurnstileFieldHandle>(null);

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [captchaFailure, setCaptchaFailure] = useState<string | null>(null);
  const [resendFailure, setResendFailure] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [sent, setSent] = useState(false);

  const turnstileRequired = isTurnstileConfigured();

  const schema = useMemo(
    () =>
      z.object({
        email: z
          .string()
          .transform(normalizeEmail)
          .pipe(z.string().min(1, t("verifyEmail.emailRequired")))
          .pipe(z.email(t("verifyEmail.emailInvalid"))),
      }),
    [t],
  );

  const form = useForm<{ email: string }>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const resend = useResendVerification({
    suppressToast: true,
    onSuccess: () => setSent(true),
    onError: (error) => {
      // 422: lỗi theo field → gắn thẳng dưới ô email
      if (error instanceof ApiError && error.status === 422 && error.errors?.length) {
        for (const fieldError of error.errors) {
          if (fieldError.field === "email") {
            form.setError("email", { message: fieldError.message });
          }
        }
        return;
      }

      // 429: BE khóa gửi lại 60s (AppError trực tiếp, không có header Retry-After
      // nên fallback về 60) → đếm ngược, nút bị khóa tới khi hết
      if (
        error instanceof ApiError &&
        error.status === 429 &&
        (error.code === ErrorCode.TOO_MANY_REQUESTS ||
          error.code === ErrorCode.RATE_LIMIT_EXCEEDED)
      ) {
        setCooldown(error.retryAfter ?? 60);
        return;
      }

      // Token captcha chỉ dùng 1 lần — reset widget và yêu cầu tick lại
      if (
        error instanceof ApiError &&
        (error.code === ErrorCode.CAPTCHA_REQUIRED ||
          error.code === ErrorCode.CAPTCHA_INVALID)
      ) {
        setCaptchaFailure(t("verifyEmail.captchaRequired"));
        setTurnstileToken(null);
        turnstileRef.current?.reset();
        return;
      }

      // Mạng/5xx đã được interceptor toast toàn cục — không hiện banner đè
      if (!shouldToastError(error)) return;

      // Lỗi nghiệp vụ còn lại → banner chung
      setResendFailure(
        error instanceof ApiError ? error.message : t("verifyEmail.genericError"),
      );
    },
  });

  // Đếm ngược cooldown resend (mirror lockout countdown của login-form)
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((s) => (s > 1 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Anti-enum: BE resend luôn phản hồi thành công kể cả email không tồn tại
  if (sent) {
    return (
      <StatusPanel
        testId="verify-email-resend-success"
        icon={<MailCheck className="size-7" aria-hidden="true" />}
        title={t("verifyEmail.resendSuccessTitle")}
        message={t("verifyEmail.resendSuccessMessage")}
      />
    );
  }

  function onSubmit(values: { email: string }) {
    setCaptchaFailure(null);
    setResendFailure(null);
    resend.mutate({
      email: normalizeEmail(values.email),
      turnstileToken: turnstileToken ?? undefined,
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 px-3.5 py-2.5 text-sm text-warning">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">{t("verifyEmail.expiredTitle")}</p>
          <p className="mt-1 text-xs leading-5 opacity-90">{t("verifyEmail.expiredMessage")}</p>
        </div>
      </div>

      <FormField
        id="email"
        label={t("verifyEmail.email")}
        required
        error={form.formState.errors.email?.message}
      >
        <Input
          type="email"
          autoComplete="email"
          placeholder={t("verifyEmail.emailPlaceholder")}
          prefix={<Mail aria-hidden="true" />}
          disabled={resend.isPending}
          {...form.register("email")}
        />
      </FormField>

      <TurnstileField
        ref={turnstileRef}
        action="resend_verification"
        onToken={setTurnstileToken}
      />

      {captchaFailure && (
        <div
          role="alert"
          className="rounded-xl border border-warning/40 bg-warning/10 px-3.5 py-2.5 text-sm text-warning"
        >
          {captchaFailure}
        </div>
      )}

      {resendFailure && (
        <div
          role="alert"
          className="rounded-xl border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-sm text-danger"
        >
          {resendFailure}
        </div>
      )}

      {cooldown > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-warning/40 bg-warning/10 px-3.5 py-2.5 text-sm text-warning"
        >
          <p className="font-semibold tabular-nums">
            {t("verifyEmail.tryAgainIn")}: {formatCountdown(cooldown)}
          </p>
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={resend.isPending || cooldown > 0 || (turnstileRequired && !turnstileToken)}
      >
        {resend.isPending ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            {t("verifyEmail.resending")}
          </span>
        ) : (
          t("verifyEmail.resend")
        )}
      </Button>
    </form>
  );
}

export function VerifyEmailForm() {
  const { t } = useLocale();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  // Luôn bắt đầu ở "verifying" để khớp server render (server không đọc được
  // window.location) — token được đọc trong effect sau khi hydrate
  const [state, setState] = useState<VerifyState>("verifying");
  const firedRef = useRef(false);

  const verify = useVerifyEmail({
    suppressToast: true,
    onSuccess: () => setState("success"),
    onError: (error) => {
      if (error instanceof ApiError && error.code === ErrorCode.TOKEN_EXPIRED) {
        setState("expired");
        return;
      }
      if (error instanceof ApiError && error.code === ErrorCode.TOKEN_INVALID) {
        setState("invalid");
        return;
      }
      if (!shouldToastError(error)) {
        // Mạng / 5xx: interceptor đã toast → hiện nút thử lại
        setState("error");
        return;
      }
      setState("invalid");
    },
  });

  useEffect(() => {
    // Token chỉ dùng 1 lần — chặn gọi 2 lần (StrictMode double-effect dev)
    if (firedRef.current) return;
    firedRef.current = true;
    const urlToken = readTokenFromUrl();
    if (!urlToken) {
      setState("invalid");
      return;
    }
    setToken(urlToken);
    verify.mutate({ token: urlToken });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === "verifying") {
    return (
      <div data-testid="verify-email-verifying" className="flex flex-col items-center gap-4 py-6 text-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">{t("verifyEmail.verifying")}</p>
      </div>
    );
  }

  if (state === "success") {
    return (
      <StatusPanel
        testId="verify-email-success"
        icon={<MailCheck className="size-7" aria-hidden="true" />}
        title={t("verifyEmail.successTitle")}
        message={t("verifyEmail.successMessage")}
      />
    );
  }

  if (state === "expired") {
    return <ResendPanel />;
  }

  if (state === "error") {
    return (
      <div data-testid="verify-email-error" className="flex flex-col items-center gap-4 py-6 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-danger/15 text-danger">
          <AlertTriangle className="size-7" aria-hidden="true" />
        </span>
        <h2 className="text-xl font-bold tracking-tight">{t("verifyEmail.errorTitle")}</h2>
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">
          {t("verifyEmail.errorMessage")}
        </p>
        <div className="flex flex-col items-center gap-3">
          <Button
            type="button"
            onClick={() => {
              setState("verifying");
              verify.mutate({ token: token ?? "" });
            }}
            disabled={verify.isPending}
          >
            {verify.isPending ? t("verifyEmail.retrying") : t("verifyEmail.retry")}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.replace("/login")}>
            {t("verifyEmail.backToLogin")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <StatusPanel
      testId="verify-email-invalid"
      icon={<AlertTriangle className="size-7" aria-hidden="true" />}
      title={t("verifyEmail.invalidTitle")}
      message={t("verifyEmail.invalidMessage")}
      tone="warning"
    />
  );
}
