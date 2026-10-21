"use client";

import { KeyRound } from "lucide-react";

import { ChangePasswordForm } from "@/components/features/auth/forms/change-password-form";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/providers/locale-provider";

/**
 * Trang đổi mật khẩu (nhóm auth — lớp 2 ép redirect về đây khi
 * user.mustChangePassword). Thành công → BE revoke toàn bộ session →
 * hook dọn cache + AuthContext → form chuyển về /login.
 */
export default function ChangePasswordPage() {
  const { t } = useLocale();
  const { user } = useAuth();

  const forced = Boolean(user?.mustChangePassword);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-[1.75rem] border border-border/40 bg-card p-8 shadow-[8px_8px_20px_var(--shadow-dark),-8px_-8px_20px_var(--shadow-light)]">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <KeyRound className="size-6" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {forced ? t("changePassword.forcedTitle") : t("changePassword.title")}
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            {forced ? t("changePassword.forcedMessage") : t("changePassword.subtitle")}
          </p>
        </div>

        <ChangePasswordForm />
      </div>
    </main>
  );
}
