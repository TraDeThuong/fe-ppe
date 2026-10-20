"use client";

import { useLocale } from "@/providers/locale-provider";

/**
 * Trang tạm để kiểm thử guard Bước 7.1 — đích redirect khi
 * user.mustChangePassword = true (lớp 2, app/(auth)/layout.tsx).
 * Bước 7.2 sẽ thay bằng form đổi mật khẩu thật.
 */
export default function ChangePasswordPage() {
  const { t } = useLocale();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <p className="text-muted-foreground">{t("changePassword.placeholderNote")}</p>
    </div>
  );
}
