"use client";

import { ChangePasswordForm } from "@/components/features/auth/forms/change-password-form";

/**
 * Panel Đổi mật khẩu trong Cài đặt bảo mật — dùng lại form của trang
 * /change-password (cùng hook, cùng checklist policy, cùng xử lý Google-only).
 * Thành công: BE revoke toàn bộ session → form tự chuyển về /login đăng nhập lại.
 */
export function PasswordPanel() {
  return (
    <div data-testid="password-panel" className="w-full max-w-md">
      <ChangePasswordForm />
    </div>
  );
}
