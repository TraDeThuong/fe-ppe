"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/providers/locale-provider";

/**
 * Trang tạm để kiểm thử guard Bước 7.1 — /2fa nằm nhóm (public):
 * giữa luồng 2FA user CHƯA có session cookie (tempToken ở sessionStorage)
 * nên proxy phải cho qua, không đá về /login.
 * Bước 7.2 sẽ thay bằng trang 2FA thật (6 ô TOTP, đếm ngược tempToken...).
 */
export default function TwoFactorPage() {
  const { t } = useLocale();
  const router = useRouter();

  // Guard riêng của trang 2FA: không có tempToken nghĩa là không trong
  // luồng 2FA — đưa về /login (guard thật sẽ chi tiết hơn ở Bước 7.2).
  useEffect(() => {
    if (!sessionStorage.getItem("ppe.tempToken")) {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <p className="text-muted-foreground">{t("2fa.placeholderNote")}</p>
    </div>
  );
}
