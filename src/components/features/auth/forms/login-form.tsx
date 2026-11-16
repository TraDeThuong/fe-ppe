"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Loader2, Mail, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@ui/button";
import { Checkbox, FormField, Input, PasswordInput } from "@ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthFooterLink } from "../auth-footer-link";
import { isLoginServerUnavailable } from "./login-server-status";
import { releaseActionLock, tryAcquireActionLock } from "./login-action-lock";
import { resolveSocialLoginSlotState } from "./login-social-state";

import {
  handleMutationError,
  shouldToastError,
  useGoogleUrl,
  useLogin,
  usePublicConfig,
  useResendVerification,
} from "@/hooks/auth";
import { useMaintenanceStatus } from "@/hooks/maintenance";
import { ApiError } from "@/lib/axios";
import { normalizeEmail } from "@/lib/email";
import {
  TEMP_TOKEN_STORAGE_KEY,
  generateOAuthState,
  getGoogleRedirectUri,
  saveOAuthState,
} from "@/lib/oauth";
import { getRememberedEmail, isRememberMe } from "@/lib/session-manager";
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
  rememberMe: boolean;
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
  const submitLockRef = useRef(false);
  const googleLockRef = useRef(false);

  const [failure, setFailure] = useState<LoginFailure>({ kind: "none" });
  const [lockout, setLockout] = useState<LockoutState | null>(null);
  const [resendToken, setResendToken] = useState<string | null>(null);
  const [isRedirectingGoogle, setIsRedirectingGoogle] = useState(false);

  const schema = useMemo(
    () =>
      z.object({
        email: z
          .string()
          .transform(normalizeEmail)
          .pipe(z.string().min(1, t("login.emailRequired")))
          .pipe(z.email(t("login.emailInvalid"))),
        password: z.string().min(1, t("login.passwordRequired")),
        rememberMe: z.boolean(),
      }),
    [t],
  );

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  // Tự động điền email và trạng thái ghi nhớ nếu đã từng tick ghi nhớ đăng nhập
  useEffect(() => {
    const rememberedEmail = getRememberedEmail();
    const rememberMe = isRememberMe();
    if (rememberedEmail) {
      form.setValue("email", rememberedEmail);
      form.setValue("rememberMe", rememberMe);
    }
  }, [form]);

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
      releaseActionLock(submitLockRef);

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
  const publicConfigQuery = usePublicConfig();
  const publicConfig = publicConfigQuery.data;
  const socialLoginSlotState = resolveSocialLoginSlotState({
    mounted,
    isPending: publicConfigQuery.isPending,
    isError: publicConfigQuery.isError,
    publicConfig,
  });

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
    if (
      !tryAcquireActionLock(
        googleLockRef,
        googleParams !== null ||
          isRedirectingGoogle ||
          isSubmitting ||
          lockoutActive ||
          isServerUnavailable,
      )
    ) {
      return;
    }

    setIsRedirectingGoogle(true);
    const state = generateOAuthState();
    saveOAuthState(state);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        "ppe_pending_remember_me",
        form.getValues("rememberMe") ? "true" : "false",
      );
    }
    setGoogleParams({ redirectUri: getGoogleRedirectUri(), state });
  }

  // Lấy được URL → chuyển hướng sang màn hình đồng ý của Google
  useEffect(() => {
    if (googleUrl.isSuccess && googleUrl.data?.url && googleParams !== null) {
      window.location.assign(googleUrl.data.url);
    }
  }, [googleUrl.isSuccess, googleUrl.data, googleParams]);

  // Lỗi lấy URL (chưa cấu hình Google, mạng...) → toast + nhả khóa cho bấm lại
  useEffect(() => {
    if (googleUrl.isError && googleParams !== null) {
      handleMutationError(googleUrl.error);
      setGoogleParams(null);
      setIsRedirectingGoogle(false);
      releaseActionLock(googleLockRef);
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

  const lockoutActive = lockout !== null;
  const maintenanceQuery = useMaintenanceStatus();
  const maintenanceStatus = maintenanceQuery.data;

  const isServerUnavailable = isLoginServerUnavailable({
    publicConfigError: publicConfigQuery.error,
    isPublicConfigError: publicConfigQuery.isError,
    maintenanceError: maintenanceQuery.error,
    isMaintenanceError: maintenanceQuery.isError,
    maintenanceEnabled: maintenanceStatus?.enabled,
  });

  const isRetryingConnection =
    (publicConfigQuery.isFetching && publicConfigQuery.isError) ||
    (maintenanceQuery.isFetching && maintenanceQuery.isError);

  // Đồng bộ phục hồi: nếu một trong hai endpoint phản hồi lại, kiểm tra endpoint còn lại ngay
  useEffect(() => {
    if (maintenanceQuery.isSuccess && publicConfigQuery.isError && !publicConfigQuery.isFetching) {
      void publicConfigQuery.refetch();
    }
  }, [
    maintenanceQuery.isSuccess,
    publicConfigQuery.isError,
    publicConfigQuery.isFetching,
    publicConfigQuery.refetch,
  ]);

  useEffect(() => {
    if (publicConfigQuery.isSuccess && maintenanceQuery.isError && !maintenanceQuery.isFetching) {
      void maintenanceQuery.refetch();
    }
  }, [
    publicConfigQuery.isSuccess,
    maintenanceQuery.isError,
    maintenanceQuery.isFetching,
    maintenanceQuery.refetch,
  ]);

  function handleRetryConnection() {
    void Promise.all([publicConfigQuery.refetch(), maintenanceQuery.refetch()]);
  }

  const isSubmitting =
    form.formState.isSubmitting || login.isPending || isRedirectingGoogle;
  const googleLoading = isRedirectingGoogle || googleParams !== null;

  function onSubmit(values: LoginFormValues) {
    if (
      !tryAcquireActionLock(
        submitLockRef,
        isServerUnavailable || lockoutActive || login.isPending || isRedirectingGoogle,
      )
    ) {
      return;
    }
    setFailure({ kind: "none" });
    login.mutate(values);
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      aria-busy={isSubmitting || googleLoading}
      className={[
        "flex flex-col gap-5",
        (isSubmitting || googleLoading) && "pointer-events-none",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {isServerUnavailable && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs text-danger"
        >
          <WifiOff className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 space-y-1.5">
            <p className="font-bold">{t("login.serverUnavailableTitle")}</p>
            <p className="leading-relaxed">{t("login.serverUnavailableMessage")}</p>
            <button
              type="button"
              onClick={handleRetryConnection}
              disabled={isRetryingConnection}
              className="inline-flex items-center gap-1.5 rounded-lg border border-danger/40 bg-background/70 px-2.5 py-1 text-[11px] font-semibold text-danger transition-colors hover:bg-danger/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRetryingConnection && (
                <Loader2 className="size-3 animate-spin" aria-hidden="true" />
              )}
              {isRetryingConnection
                ? t("login.retryingConnection")
                : t("login.retryConnection")}
            </button>
          </div>
        </div>
      )}

      {maintenanceStatus?.enabled && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
          <div className="space-y-0.5">
            <span className="font-bold">{t("maintenance.badge.active")}:</span>
            <p className="leading-relaxed">{t("maintenance.login.notice")}</p>
          </div>
        </div>
      )}

      <FormField
        id="email"
        label={t("login.email")}
        required
        error={form.formState.errors.email?.message}
      >
        <Input
          type="email"
          autoComplete="email"
          spellCheck={false}
          placeholder={t("login.emailPlaceholder")}
          prefix={<Mail aria-hidden="true" />}
          disabled={isSubmitting}
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
          disabled={isSubmitting}
          {...form.register("password")}
        />
      </FormField>

      <div className="flex items-center justify-between">
        <label
          htmlFor="rememberMe"
          className="inline-flex cursor-pointer select-none items-center gap-2 text-sm text-foreground hover:text-foreground/80 transition-colors"
        >
          <Checkbox
            id="rememberMe"
            size="sm"
            checked={form.watch("rememberMe")}
            onCheckedChange={(checked) => form.setValue("rememberMe", checked)}
            disabled={isSubmitting}
          />
          <span>{t("login.rememberMe")}</span>
        </label>

        <AuthFooterLink href="/forgot-password" className="text-sm font-medium">
          {t("login.forgotPassword")}
        </AuthFooterLink>
      </div>

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
          className="rounded-xl border border-warning/40 bg-warning/10 px-3.5 py-2.5 text-sm text-amber-800 dark:text-amber-300"
        >
          <p role="alert">{lockout.message}</p>
          <p className="mt-1 font-semibold tabular-nums" aria-live="off">
            {t("login.tryAgainIn")}: {formatCountdown(lockout.seconds)}
          </p>
        </div>
      )}

      {failure.kind === "inactive" && (
        <div
          role="alert"
          className="rounded-xl border border-warning/40 bg-warning/10 px-3.5 py-3 text-sm text-amber-800 dark:text-amber-300"
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

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting || lockoutActive || isServerUnavailable}
      >
        {form.formState.isSubmitting || login.isPending ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            {t("login.submitting")}
          </span>
        ) : (
          t("login.submit")
        )}
      </Button>

      {/* Giữ vùng chứa cố định 76px (h-4 divider + gap-5 + h-10 button) để triệt tiêu CLS */}
      <div className="flex min-h-[76px] flex-col gap-5" data-testid="social-login-slot">
        {socialLoginSlotState === "loading" && (
          <div aria-hidden="true" className="flex flex-col gap-5">
            <div className="flex h-4 items-center gap-3">
              <span className="h-px flex-1 bg-border/60" />
              <Skeleton rounded="full" className="h-3 w-10" />
              <span className="h-px flex-1 bg-border/60" />
            </div>
            <Skeleton rounded="xl" className="h-10 w-full" />
          </div>
        )}

        {socialLoginSlotState === "enabled" && (
          <>
            <div className="flex h-4 items-center gap-3" aria-hidden="true">
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
              disabled={
                isSubmitting || lockoutActive || googleLoading || isServerUnavailable
              }
              onClick={handleGoogleLogin}
            >
              {googleLoading ? (
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
      </div>
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
