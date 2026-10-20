"use client";

import { AuthFooterLink } from "@/components/features/auth/auth-footer-link";
import { AuthShell } from "@/components/features/auth/auth-shell";
import { RegisterForm } from "@/components/features/auth/forms/register-form";
import { useLocale } from "@/providers/locale-provider";

export default function RegisterPage() {
  const { t } = useLocale();

  return (
    <AuthShell
      title={t("register.title")}
      description={t("register.subtitle")}
      footer={
        <p className="text-sm text-muted-foreground">
          {t("register.haveAccount")}{" "}
          <AuthFooterLink href="/login">{t("register.loginNow")}</AuthFooterLink>
        </p>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
