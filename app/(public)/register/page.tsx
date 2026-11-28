"use client";

import { AlertTriangle } from "lucide-react";

import { AuthFooterLink } from "@/components/features/auth/auth-footer-link";
import { AuthShell } from "@/components/features/auth/auth-shell";
import { RegisterForm } from "@/components/features/auth/forms/register-form";
import { usePublicConfig } from "@/hooks/auth";
import {
  getConfig,
  isFeatureFlagEnabled,
  SYSTEM_CONFIG_KEYS,
} from "@/lib/system-config";
import { useLocale } from "@/providers/locale-provider";

export default function RegisterPage() {
  const { t } = useLocale();
  // Cùng nguồn cờ với /login (ẩn link "Đăng ký"): người vào thẳng /register khi
  // Admin đã khóa đăng ký sẽ thấy thông báo ngay, không phải điền form + captcha
  // rồi mới bị BE từ chối. Mặc định true khi config chưa tải (giống /login) —
  // BE vẫn chặn ở POST /auth/register nếu cờ tắt.
  const { data: publicConfig } = usePublicConfig();
  const registrationEnabled = isFeatureFlagEnabled(
    getConfig(publicConfig, SYSTEM_CONFIG_KEYS.registrationEnabled, true),
  );

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
      {registrationEnabled ? (
        <RegisterForm />
      ) : (
        <div
          role="alert"
          data-testid="register-disabled"
          className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 px-3.5 py-3 text-sm text-warning"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">{t("register.disabledTitle")}</p>
            <p className="mt-1 text-xs leading-5 opacity-90">{t("register.disabledMessage")}</p>
          </div>
        </div>
      )}
    </AuthShell>
  );
}
