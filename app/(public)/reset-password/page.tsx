"use client";

import { AuthFooterLink } from "@/components/features/auth/auth-footer-link";
import { AuthShell } from "@/components/features/auth/auth-shell";
import { ResetPasswordForm } from "@/components/features/auth/forms/reset-password-form";
import { useLocale } from "@/providers/locale-provider";

export default function ResetPasswordPage() {
  const { t } = useLocale();

  return (
    <AuthShell
      title={t("resetPassword.title")}
      description={t("resetPassword.subtitle")}
      footer={
        <p className="text-sm text-muted-foreground">
          <AuthFooterLink href="/login">{t("resetPassword.backToLogin")}</AuthFooterLink>
        </p>
      }
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
