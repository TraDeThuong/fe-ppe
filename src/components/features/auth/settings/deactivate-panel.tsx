"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MailCheck, ShieldAlert } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@ui/button";
import { FormField, PasswordInput, Textarea } from "@ui/form";

import { handleMutationError, shouldToastError, useRequestDeactivate } from "@/hooks/auth";
import { ApiError } from "@/lib/axios";
import { useLocale } from "@/providers/locale-provider";
import { ErrorCode } from "@/types";

interface DeactivateFormValues {
  password: string;
  reason: string;
}

const REASON_MAX_LENGTH = 500;

/**
 * Panel Vô hiệu hóa tài khoản:
 * - Nhập mật khẩu xác nhận + lý do tùy chọn (≤ 500 ký tự).
 * - POST /auth/deactivate/request → BE gửi email xác nhận (hiệu lực 15 phút).
 * - Thành công → màn hình "kiểm tra email" (xác nhận cuối ở trang
 *   /verify-email/deactivate qua link trong email).
 */
export function DeactivatePanel() {
  const { t } = useLocale();
  const [requested, setRequested] = useState(false);
  const [failure, setFailure] = useState<{ kind: "none" | "invalid" | "generic"; message: string }>({
    kind: "none",
    message: "",
  });

  const schema = useMemo(
    () =>
      z.object({
        password: z.string().min(1, t("security.deactivate.passwordRequired")),
        reason: z.string().trim().max(REASON_MAX_LENGTH, t("security.deactivate.reasonTooLong")),
      }),
    [t],
  );

  const form = useForm<DeactivateFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", reason: "" },
  });

  const requestDeactivate = useRequestDeactivate({
    suppressToast: true,
    onSuccess: () => {
      setRequested(true);
      setFailure({ kind: "none", message: "" });
      form.reset();
    },
    onError: (error) => {
      // 422: lỗi theo field (VD: thiếu mật khẩu ở tài khoản Google-only) → gắn vào ô
      if (error instanceof ApiError && error.status === 422 && error.errors?.length) {
        for (const fieldError of error.errors) {
          if (fieldError.field === "password" || fieldError.field === "reason") {
            form.setError(fieldError.field, { message: fieldError.message });
          }
        }
        return;
      }

      if (!shouldToastError(error)) {
        // 400 VALIDATION_ERROR (VD: tài khoản Google-only không có mật khẩu) —
        // không nằm danh sách toast toàn cục, hiện thẳng message BE dạng banner
        if (error instanceof ApiError && error.code === ErrorCode.VALIDATION_ERROR) {
          setFailure({ kind: "generic", message: error.message });
        }
        return;
      }

      if (error instanceof ApiError && error.code === ErrorCode.INVALID_CREDENTIALS) {
        setFailure({ kind: "invalid", message: error.message });
        form.setValue("password", "");
        form.setFocus("password");
        return;
      }

      setFailure({ kind: "generic", message: t("changePassword.genericError") });
    },
  });

  function onSubmit(values: DeactivateFormValues) {
    setFailure({ kind: "none", message: "" });
    requestDeactivate.mutate({
      password: values.password,
      reason: values.reason.trim() ? values.reason.trim() : undefined,
    });
  }

  // ── Đã gửi yêu cầu → hướng dẫn kiểm tra email (xác nhận ở link email) ──
  if (requested) {
    return (
      <div
        data-testid="deactivate-requested"
        className="flex flex-col items-center gap-4 rounded-2xl border border-success/30 bg-success/5 p-8 text-center"
      >
        <span className="flex size-14 items-center justify-center rounded-full bg-success/15 text-success">
          <MailCheck className="size-7" aria-hidden="true" />
        </span>
        <h3 className="text-lg font-bold text-foreground">
          {t("security.deactivate.successTitle")}
        </h3>
        <p className="text-sm leading-6 text-muted-foreground">
          {t("security.deactivate.successMessage")}
        </p>
      </div>
    );
  }

  return (
    <div data-testid="deactivate-panel" className="flex flex-col gap-4">
      <div className="flex items-start gap-3 rounded-2xl border border-danger/25 bg-danger/5 p-4">
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
        <div>
          <h3 className="font-semibold text-danger">{t("security.deactivate.warningTitle")}</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {t("security.deactivate.warningMessage")}
          </p>
        </div>
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="flex w-full max-w-md flex-col gap-4"
      >
        <FormField
          id="deactivatePassword"
          label={t("security.deactivate.password")}
          required
          error={form.formState.errors.password?.message}
        >
          <PasswordInput
            autoComplete="current-password"
            disabled={requestDeactivate.isPending}
            {...form.register("password")}
          />
        </FormField>

        <FormField
          id="deactivateReason"
          label={t("security.deactivate.reason")}
          error={form.formState.errors.reason?.message}
        >
          <Textarea
            rows={4}
            maxLength={REASON_MAX_LENGTH}
            placeholder={t("security.deactivate.reasonPlaceholder")}
            disabled={requestDeactivate.isPending}
            {...form.register("reason")}
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

        <Button type="submit" variant="outline" className="border-danger/40 text-danger hover:bg-danger/10 hover:text-danger" disabled={requestDeactivate.isPending}>
          {requestDeactivate.isPending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              {t("security.deactivate.submitting")}
            </span>
          ) : (
            t("security.deactivate.submit")
          )}
        </Button>
      </form>
    </div>
  );
}
