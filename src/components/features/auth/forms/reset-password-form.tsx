"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@ui/button";
import { FormField, PasswordInput } from "@ui/form";
import { Loader } from "@ui/loader";

import { shouldToastError, useResetPassword } from "@/hooks/auth";
import { ApiError } from "@/lib/axios";
import { useLocale } from "@/providers/locale-provider";
import { ErrorCode } from "@/types";
import { PasswordChecklist } from "../password-checklist";

interface ResetPasswordFormValues {
  newPassword: string;
}

type ResetFailure =
  | { kind: "none" }
  | { kind: "token"; message: string }
  | { kind: "generic"; message: string };

export function ResetPasswordForm() {
  const { t } = useLocale();
  const router = useRouter();

  // Token reset đọc 1 lần duy nhất từ URL lúc mount:
  // undefined = đang xác định, null = link thiếu token.
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [failure, setFailure] = useState<ResetFailure>({ kind: "none" });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("token");
    setToken(fromUrl?.trim() || null);
  }, []);

  const schema = useMemo(
    () =>
      z.object({
        newPassword: z
          .string()
          .min(1, t("resetPassword.passwordRequired"))
          .min(8, t("resetPassword.passwordInvalid"))
          .regex(/[a-z]/, t("resetPassword.passwordInvalid"))
          .regex(/[A-Z]/, t("resetPassword.passwordInvalid"))
          .regex(/[0-9]/, t("resetPassword.passwordInvalid"))
          .regex(/[^a-zA-Z0-9]/, t("resetPassword.passwordInvalid")),
      }),
    [t],
  );

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "" },
  });

  const resetPassword = useResetPassword({
    suppressToast: true,
    onSuccess: () => {
      // BE đã revoke toàn bộ session; hook đã dọn cache + tokenStore → màn thành công
      setSubmitted(true);
    },
    onError: (error) => {
      // 422: lỗi theo field → gắn thẳng dưới đúng ô input
      if (error instanceof ApiError && error.status === 422 && error.errors?.length) {
        for (const fieldError of error.errors) {
          if (fieldError.field === "newPassword") {
            form.setError(fieldError.field, { message: fieldError.message });
          }
        }
        return;
      }

      // Lỗi đã được interceptor toast toàn cục (mạng / 5xx / 429) → không hiện banner đè
      if (!shouldToastError(error)) return;

      if (error instanceof ApiError) {
        if (error.code === ErrorCode.TOKEN_EXPIRED) {
          setFailure({ kind: "token", message: t("resetPassword.tokenExpired") });
          return;
        }
        if (error.code === ErrorCode.TOKEN_INVALID) {
          setFailure({ kind: "token", message: t("resetPassword.tokenInvalid") });
          return;
        }
        setFailure({ kind: "generic", message: error.message });
        return;
      }

      setFailure({ kind: "generic", message: t("resetPassword.genericError") });
    },
  });

  function onSubmit(values: ResetPasswordFormValues) {
    if (!token) return;
    setFailure({ kind: "none" });
    resetPassword.mutate({ token, newPassword: values.newPassword });
  }

  const password = form.watch("newPassword") ?? "";

  // ── Đang đọc token từ URL (effect sau hydrate) ──
  if (token === undefined) {
    return (
      <div className="flex justify-center py-10">
        <Loader showLabel label={t("common.loading")} />
      </div>
    );
  }

  // ── Link thiếu token: màn "liên kết không hợp lệ" ──
  if (token === null) {
    return (
      <div
        data-testid="reset-password-invalid-link"
        className="flex flex-col items-center gap-4 py-6 text-center"
      >
        <span className="flex size-14 items-center justify-center rounded-full bg-danger/15 text-danger">
          <KeyRound className="size-7" aria-hidden="true" />
        </span>
        <h2 className="text-xl font-bold tracking-tight">{t("resetPassword.invalidLinkTitle")}</h2>
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">
          {t("resetPassword.invalidLinkMessage")}
        </p>
        <Button type="button" className="mt-2" onClick={() => router.replace("/forgot-password")}>
          {t("resetPassword.requestNewLink")}
        </Button>
      </div>
    );
  }

  // ── Màn thành công ──
  if (submitted) {
    return (
      <div
        data-testid="reset-password-success"
        className="flex flex-col items-center gap-4 py-6 text-center"
      >
        <span className="flex size-14 items-center justify-center rounded-full bg-success/15 text-success">
          <ShieldCheck className="size-7" aria-hidden="true" />
        </span>
        <h2 className="text-xl font-bold tracking-tight">{t("resetPassword.successTitle")}</h2>
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">
          {t("resetPassword.successMessage")}
        </p>
        <Button type="button" className="mt-2" onClick={() => router.replace("/login")}>
          {t("resetPassword.loginNow")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <FormField
        id="newPassword"
        label={t("resetPassword.newPassword")}
        required
        error={form.formState.errors.newPassword?.message}
      >
        <PasswordInput
          autoComplete="new-password"
          placeholder={t("resetPassword.newPasswordPlaceholder")}
          disabled={resetPassword.isPending}
          {...form.register("newPassword")}
        />
      </FormField>

      {/* Checklist password policy realtime — cập nhật theo từng ký tự gõ */}
      <PasswordChecklist
        titleKey="resetPassword.checklistTitle"
        labelPrefix="resetPassword.checklist"
        password={password}
      />

      {failure.kind === "token" && (
        <div
          role="alert"
          className="rounded-xl border border-danger/40 bg-danger/10 px-3.5 py-3 text-sm text-danger"
        >
          <p>{failure.message}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 w-full"
            onClick={() => router.replace("/forgot-password")}
          >
            {t("resetPassword.requestNewLink")}
          </Button>
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

      <Button type="submit" className="w-full" disabled={resetPassword.isPending}>
        {resetPassword.isPending ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            {t("resetPassword.submitting")}
          </span>
        ) : (
          t("resetPassword.submit")
        )}
      </Button>
    </form>
  );
}
