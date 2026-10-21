"use client";

import { AuthFooterLink } from "@/components/features/auth/auth-footer-link";
import { AuthShell } from "@/components/features/auth/auth-shell";
import { VerifyEmailForm } from "@/components/features/auth/forms/verify-email-form";
import { useLocale } from "@/providers/locale-provider";

export default function VerifyEmailPage() {
  const { t } = useLocale();

  return (
    <AuthShell
      title={t("verifyEmail.title")}
      description={t("verifyEmail.subtitle")}
      footer={
        <p className="text-sm text-muted-foreground">
          {t("verifyEmail.haveAccount")}{" "}
          <AuthFooterLink href="/login">{t("verifyEmail.loginNow")}</AuthFooterLink>
        </p>
      }
    >
      <VerifyEmailForm />
    </AuthShell>
  );
}
