
"use client";

import { AuthFooterLink } from "@/components/features/auth/auth-footer-link";
import { AuthShell } from "@/components/features/auth/auth-shell";
import { LoginForm } from "@/components/features/auth/forms/login-form";
import { usePublicConfig } from "@/hooks/auth";
import {
  getConfig,
  isFeatureFlagEnabled,
  SYSTEM_CONFIG_KEYS,
} from "@/lib/system-config";
import { useLocale } from "@/providers/locale-provider";

export default function LoginPage() {
  const { t } = useLocale();
  const { data: publicConfig } = usePublicConfig();
  const registrationEnabled = isFeatureFlagEnabled(
    getConfig(publicConfig, SYSTEM_CONFIG_KEYS.registrationEnabled, true),
  );

  return (
    <AuthShell
      title={t("login.title")}
      description={t("login.subtitle")}
      footer={
        registrationEnabled ? (
          <p className="text-sm text-muted-foreground">
            {t("login.noAccount")}{" "}
            <AuthFooterLink href="/register">
              {t("login.registerNow")}
            </AuthFooterLink>
          </p>
        ) : undefined
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
