"use client";

import { AuthFooterLink } from "@/components/features/auth/auth-footer-link";
import { AuthShell } from "@/components/features/auth/auth-shell";
import { TwoFactorForm } from "@/components/features/auth/forms/two-factor-form";
import { useLocale } from "@/providers/locale-provider";

/**
 * Trang nhập mã 2FA sau login (nhóm public — giữa luồng 2FA user chưa có
 * session cookie, tempToken nằm ở sessionStorage; proxy không được đá về /login).
 * Trang tự guard: thiếu tempToken → redirect /login (trong TwoFactorForm).
 */
export default function TwoFactorPage() {
  const { t } = useLocale();

  return (
    <AuthShell
      title={t("2fa.title")}
      description={t("2fa.subtitle")}
      footer={
        <p className="text-sm text-muted-foreground">
          <AuthFooterLink href="/login">{t("2fa.backToLogin")}</AuthFooterLink>
        </p>
      }
    >
      <TwoFactorForm />
    </AuthShell>
  );
}
