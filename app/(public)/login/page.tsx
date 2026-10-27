
"use client";

import { AuthFooterLink } from "@/components/features/auth/auth-footer-link";
import { AuthShell } from "@/components/features/auth/auth-shell";
import { LoginForm } from "@/components/features/auth/forms/login-form";
import { useLocale } from "@/providers/locale-provider";

export default function LoginPage() {
  const { t } = useLocale();

  return (
    <AuthShell
      title={t("login.title")}
      description={t("login.subtitle")}
      footer={
        <p className="text-sm text-muted-foreground">
          {t("login.noAccount")}{" "}
          <AuthFooterLink href="/register">
            {t("login.registerNow")}
          </AuthFooterLink>
        </p>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
