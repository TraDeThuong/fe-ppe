"use client";

import { AuthFooterLink } from "@/components/features/auth/auth-footer-link";
import { AuthShell } from "@/components/features/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/features/auth/forms/forgot-password-form";
import { useLocale } from "@/providers/locale-provider";

export default function ForgotPasswordPage() {
  const { t } = useLocale();

  return (
    <AuthShell
      title={t("forgotPassword.title")}
      description={t("forgotPassword.subtitle")}
      footer={
        <p className="text-sm text-muted-foreground">
          {t("forgotPassword.rememberedPassword")}{" "}
          <AuthFooterLink href="/login">{t("forgotPassword.loginNow")}</AuthFooterLink>
        </p>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
