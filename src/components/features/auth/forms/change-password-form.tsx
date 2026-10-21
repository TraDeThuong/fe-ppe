"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@ui/button";
import { FormField, PasswordInput } from "@ui/form";

import { shouldToastError, useChangePassword, useLogout } from "@/hooks/auth";
import { ApiError } from "@/lib/axios";
import { useLocale } from "@/providers/locale-provider";
import { ErrorCode } from "@/types";
import { PasswordChecklist } from "../password-checklist";

interface ChangePasswordFormValues {
  oldPassword: string;
  newPassword: string;
}

type ChangeFailure =
  | { kind: "none" }
  | { kind: "invalid"; message: string }
  | { kind: "googleOnly"; message: string }
  | { kind: "generic"; message: string };

export function ChangePasswordForm() {
  const { t } = useLocale();
  const router = useRouter();

  const [failure, setFailure] = useState<ChangeFailure>({ kind: "none" });

  const schema = useMemo(
    () =>
      z.object({
        oldPassword: z.string().min(1, t("changePassword.oldPasswordRequired")),
        newPassword: z
          .string()
          .min(1, t("changePassword.newPasswordRequired"))
          .min(8, t("changePassword.passwordInvalid"))
          .regex(/[a-z]/, t("changePassword.passwordInvalid"))
          .regex(/[A-Z]/, t("changePassword.passwordInvalid"))
          .regex(/[0-9]/, t("changePassword.passwordInvalid"))
          .regex(/[^a-zA-Z0-9]/, t("changePassword.passwordInvalid")),
      }),
    [t],
  );

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { oldPassword: "", newPassword: "" },
  });

  const changePassword = useChangePassword({
    suppressToast: true,
    onSuccess: () => {
      // Hook đã dọn tokenStore + cache + setUser(null) + emit session-expired
      // (BE revoke TOÀN BỘ session) → ép về /login đăng nhập lại
      router.replace("/login");
    },    onError: (error) => {
      // 422: lỗi theo field → gắn thẳng dưới đúng ô input
      if (error instanceof ApiError && error.status === 422 && error.errors?.length) {
        for (const fieldError of error.errors) {
          if (fieldError.field === "oldPassword" || fieldError.field === "newPassword") {
            form.setError(fieldError.field, { message: fieldError.message });
          }
        }
        return;
      }

      // Lỗi đã được interceptor toast toàn cục (mạng / 5xx / 429) → không hiện banner đè
      if (!shouldToastError(error)) return;

      if (error instanceof ApiError) {
        // Tài khoản Google-only chưa có mật khẩu → hướng dẫn dùng forgot-password
        if (error.code === ErrorCode.BAD_REQUEST) {
          setFailure({ kind: "googleOnly", message: error.message });
          return;
        }
        // Sai mật khẩu hiện tại → hiển thị message, xóa ô để nhập lại
        if (error.code === ErrorCode.INVALID_CREDENTIALS) {
          setFailure({ kind: "invalid", message: t("changePassword.invalidOldPassword") });
          form.setValue("oldPassword", "");
          form.setFocus("oldPassword");
          return;
        }
        setFailure({ kind: "generic", message: error.message });
        return;
      }

      setFailure({ kind: "generic", message: t("changePassword.genericError") });
    },
  });

  function onSubmit(values: ChangePasswordFormValues) {
    setFailure({ kind: "none" });
    changePassword.mutate({
      oldPassword: values.oldPassword,
      newPassword: values.newPassword,
    });
  }

  // Tài khoản Google-only phải qua luồng forgot-password để tạo mật khẩu lần đầu.
  // Trang /forgot-password là public — đang đăng nhập sẽ bị guard đá về "/",
  // nên nút này đăng xuất trước rồi mới chuyển hướng. Dùng hard navigation:
  // router.replace chạy cùng lúc với effect redirect /login?next=... của
  // (auth) layout khi status chuyển sang unauthenticated — guard thắng race.
  const logoutThenForgot = useLogout({
    onSuccess: () => window.location.assign("/forgot-password"),
  });

  const newPassword = form.watch("newPassword") ?? "";

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <FormField
        id="oldPassword"
        label={t("changePassword.oldPassword")}
        required
        error={form.formState.errors.oldPassword?.message}
      >
        <PasswordInput
          autoComplete="current-password"
          placeholder={t("changePassword.oldPasswordPlaceholder")}
          disabled={changePassword.isPending}
          {...form.register("oldPassword")}
        />
      </FormField>

      <FormField
        id="newPassword"
        label={t("changePassword.newPassword")}
        required
        error={form.formState.errors.newPassword?.message}
      >
        <PasswordInput
          autoComplete="new-password"
          placeholder={t("changePassword.newPasswordPlaceholder")}
          disabled={changePassword.isPending}
          {...form.register("newPassword")}
        />
      </FormField>

      {/* Checklist password policy realtime — cập nhật theo từng ký tự gõ */}
      <PasswordChecklist
        titleKey="changePassword.checklistTitle"
        labelPrefix="changePassword.checklist"
        password={newPassword}
      />

      {(failure.kind === "invalid" || failure.kind === "generic") && (
        <div
          role="alert"
          className="rounded-xl border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-sm text-danger"
        >
          {failure.message}
        </div>
      )}

      {failure.kind === "googleOnly" && (
        <div
          role="alert"
          className="rounded-xl border border-warning/40 bg-warning/10 px-3.5 py-3 text-sm text-warning"
        >
          <p className="flex items-start gap-2">
            <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{failure.message}</span>
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t("changePassword.googleOnlyHint")}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 w-full"
            disabled={logoutThenForgot.isPending}
            onClick={() => logoutThenForgot.mutate(undefined)}
          >
            {logoutThenForgot.isPending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {t("changePassword.submitting")}
              </span>
            ) : (
              t("changePassword.googleOnlyAction")
            )}
          </Button>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={changePassword.isPending}>
        {changePassword.isPending ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            {t("changePassword.submitting")}
          </span>
        ) : (
          t("changePassword.submit")
        )}
      </Button>
    </form>
  );
}
