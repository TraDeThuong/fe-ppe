"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@ui/button";
import { FormField, Input } from "@ui/form";
import { Loader } from "@ui/loader";

import { handleMutationError, shouldToastError, useVerify2FA } from "@/hooks/auth";
import { ApiError } from "@/lib/axios";
import { TEMP_TOKEN_STORAGE_KEY } from "@/lib/oauth";
import { useLocale } from "@/providers/locale-provider";
import { ErrorCode } from "@/types";

const TEMP_TOKEN_TTL_SECONDS = 5 * 60;

type CodeMode = "totp" | "backup";

const OTP_BOX_COUNT = 6;

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function TwoFactorForm() {
  const { t } = useLocale();
  const router = useRouter();

  // tempToken đọc từ sessionStorage trong effect (server render không thấy
  // sessionStorage — đọc ở initial state sẽ gây hydration mismatch):
  // undefined = đang xác định, null = không trong luồng 2FA → về /login.
  const [tempToken, setTempToken] = useState<string | null | undefined>(undefined);
  const [secondsLeft, setSecondsLeft] = useState(TEMP_TOKEN_TTL_SECONDS);
  const [mode, setMode] = useState<CodeMode>("totp");
  const [digits, setDigits] = useState<string[]>(Array(OTP_BOX_COUNT).fill(""));
  const [expired, setExpired] = useState(false);
  const boxRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    const stored = sessionStorage.getItem(TEMP_TOKEN_STORAGE_KEY);
    setTempToken(stored?.trim() || null);
  }, []);

  // Đếm ngược 5 phút hiệu lực tempToken (spec 7.2) — hết hạn thì hiện nút đăng nhập lại
  useEffect(() => {
    if (expired || tempToken === null) return;
    const timer = setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          setExpired(true);
          sessionStorage.removeItem(TEMP_TOKEN_STORAGE_KEY);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [expired, tempToken]);

  // Không có tempToken nghĩa là không trong luồng 2FA (truy cập thẳng) → về /login
  useEffect(() => {
    if (tempToken === null) {
      router.replace("/login");
    }
  }, [tempToken, router]);

  const schema = useMemo(
    () =>
      z.object({
        code: z
          .string()
          .trim()
          .min(1, t(mode === "totp" ? "2fa.codeRequired" : "2fa.codeRequired"))
          .regex(
            mode === "totp" ? /^\d{6}$/ : /^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/,
            t(mode === "totp" ? "2fa.codeInvalid" : "2fa.backupCodeInvalid"),
          ),
      }),
    [mode, t],
  );

  const form = useForm<{ code: string }>({
    resolver: zodResolver(schema),
    defaultValues: { code: "" },
  });

  const verify = useVerify2FA({
    suppressToast: true,
    onSuccess: () => {
      // Hook đã lưu token + đồng bộ AuthContext — dọn tempToken trước khi rời trang
      sessionStorage.removeItem(TEMP_TOKEN_STORAGE_KEY);
      router.replace("/");
    },
    onError: (error) => {
      // 422: lỗi theo field (code quá dài...) → gắn dưới ô nhập
      if (error instanceof ApiError && error.status === 422 && error.errors?.length) {
        for (const fieldError of error.errors) {
          if (fieldError.field === "code") {
            form.setError("code", { message: fieldError.message });
          }
        }
        return;
      }

      // Lỗi đã được interceptor toast toàn cục (mạng / 5xx / 429) → không đè thêm
      if (!shouldToastError(error)) return;

      if (error instanceof ApiError) {
        // tempToken hết hạn/không hợp lệ → dừng luồng, ép đăng nhập lại
        if (
          error.code === ErrorCode.TOKEN_EXPIRED ||
          error.code === ErrorCode.TOKEN_INVALID
        ) {
          sessionStorage.removeItem(TEMP_TOKEN_STORAGE_KEY);
          setExpired(true);
          return;
        }
        // Tài khoản không còn đủ điều kiện 2FA (đã tắt 2FA giữa chừng...) → đăng nhập lại
        if (error.code === ErrorCode.INVALID_CREDENTIALS) {
          sessionStorage.removeItem(TEMP_TOKEN_STORAGE_KEY);
          setExpired(true);
          return;
        }
        // Sai mã: toast message BE + xóa mã để nhập lại — tempToken vẫn còn hiệu lực
        handleMutationError(error);
        form.setValue("code", "");
        setDigits(Array(OTP_BOX_COUNT).fill(""));
        boxRefs.current[0]?.focus();
        return;
      }

      handleMutationError(error);
    },
  });

  function onSubmit(values: { code: string }) {
    if (!tempToken || expired) return;
    verify.mutate({ tempToken, code: values.code.trim().toUpperCase() });
  }

  function handleLoginAgain() {
    sessionStorage.removeItem(TEMP_TOKEN_STORAGE_KEY);
    router.replace("/login");
  }

  function switchMode(next: CodeMode) {
    setMode(next);
    form.clearErrors("code");
    form.setValue("code", "");
    setDigits(Array(OTP_BOX_COUNT).fill(""));
  }

  function handleDigitChange(index: number, value: string) {
    if (expired || verify.isPending) return;
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    form.setValue("code", next.join(""), { shouldValidate: true });
    if (digit && index < OTP_BOX_COUNT - 1) {
      boxRefs.current[index + 1]?.focus();
    }
  }

  function handleDigitKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      boxRefs.current[index - 1]?.focus();
    }
  }

  function handleDigitPaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text").trim();
    if (!/^\d{6}$/.test(pasted)) return;
    event.preventDefault();
    const next = pasted.split("");
    setDigits(next);
    form.setValue("code", pasted, { shouldValidate: true });
    boxRefs.current[OTP_BOX_COUNT - 1]?.focus();
  }

  const codeError = form.formState.errors.code?.message;

  // ── Đang đọc tempToken từ sessionStorage (effect sau hydrate) ──
  if (tempToken === undefined) {
    return (
      <div className="flex justify-center py-10">
        <Loader showLabel label={t("common.loading")} />
      </div>
    );
  }

  // ── Phiên 2FA hết hạn / không hợp lệ ──
  if (expired) {
    return (
      <div
        data-testid="two-factor-expired"
        className="flex flex-col items-center gap-4 py-6 text-center"
      >
        <span className="flex size-14 items-center justify-center rounded-full bg-danger/15 text-danger">
          <ShieldCheck className="size-7" aria-hidden="true" />
        </span>
        <h2 className="text-xl font-bold tracking-tight">{t("2fa.expiredTitle")}</h2>
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">
          {t("2fa.expiredMessage")}
        </p>
        <Button type="button" className="mt-2" onClick={handleLoginAgain}>
          {t("2fa.loginAgain")}
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-5"
      data-testid="two-factor-form"
    >
      <div className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/30 px-3.5 py-2.5 text-sm">
        <span className="text-muted-foreground">{t("2fa.expiresIn")}</span>
        <span
          data-testid="two-factor-countdown"
          className="font-semibold tabular-nums text-foreground"
        >
          {formatCountdown(secondsLeft)}
        </span>
      </div>

      <input type="hidden" {...form.register("code")} />

      {mode === "totp" ? (
        <FormField id="otp" label={t("2fa.codeLabel")} required error={codeError}>
          <div
            className="flex justify-between gap-2"
            role="group"
            aria-label={t("2fa.codeLabel")}
          >
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  boxRefs.current[index] = el;
                }}
                data-otp-index={index}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                maxLength={2}
                value={digit}
                aria-label={`${t("2fa.codeLabel")} ${index + 1}`}
                disabled={verify.isPending}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleDigitKeyDown(index, e)}
                onPaste={index === 0 ? handleDigitPaste : undefined}
                className={[
                  "h-12 w-full rounded-xl border bg-background text-center text-lg font-semibold",
                  "shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]",
                  "transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  codeError ? "border-danger" : "border-border/50",
                ].join(" ")}
              />
            ))}
          </div>
        </FormField>
      ) : (
        <FormField
          id="backupCode"
          label={t("2fa.backupCodeLabel")}
          required
          error={codeError}
        >
          <Input
            autoComplete="one-time-code"
            placeholder={t("2fa.backupCodePlaceholder")}
            disabled={verify.isPending}
            onChange={(e) =>
              form.setValue("code", e.target.value, { shouldValidate: true })
            }
          />
        </FormField>
      )}

      <button
        type="button"
        onClick={() => switchMode(mode === "totp" ? "backup" : "totp")}
        className="self-start text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        {mode === "totp" ? t("2fa.useBackupCode") : t("2fa.useTotp")}
      </button>

      <Button type="submit" className="w-full" disabled={verify.isPending}>
        {verify.isPending ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            {t("2fa.verifying")}
          </span>
        ) : (
          t("2fa.submit")
        )}
      </Button>
    </form>
  );
}
