"use client";

import { useState, useEffect } from "react";
import { Pencil, User, Phone, CheckCircle2, AlertTriangle } from "lucide-react";
import { SculptedModal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useUpdateUser } from "@/hooks/users";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/providers/locale-provider";
import type { UserResponseDto } from "@/types";

export interface EditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserResponseDto | null;
}

export function EditUserModal({ open, onOpenChange, user }: EditUserModalProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const { user: currentAdmin } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isActive, setIsActive] = useState(true);

  const isSelf = Boolean(currentAdmin?.id && user?.id === currentAdmin.id);
  const updateUserMutation = useUpdateUser();

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "");
      setPhoneNumber(user.phoneNumber || "");
      setIsActive(user.isActive);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await updateUserMutation.mutateAsync({
        id: user.id,
        payload: {
          fullName: fullName.trim() || undefined,
          phoneNumber: phoneNumber.trim() || undefined,
          isActive: isSelf ? true : isActive,
        },
      });

      onOpenChange(false);
    } catch {
      // Handled by mutation toast
    }
  };

  const inputSocketClass = [
    "flex items-center gap-2.5 rounded-xl px-3.5 py-2",
    "border border-[var(--shadow-dark)]/30 dark:border-white/10 bg-background",
    "shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]",
    "focus-within:ring-2 focus-within:ring-primary/40 transition-all",
  ].join(" ");

  return (
    <SculptedModal
      open={open}
      onOpenChange={onOpenChange}
      title={isVietnamese ? "Chỉnh sửa thông tin người dùng" : "Edit User Profile"}
      description={
        isVietnamese
          ? `Cập nhật hồ sơ tài khoản: ${user?.email || ""}`
          : `Update profile for account: ${user?.email || ""}`
      }
      icon={<Pencil className="h-5 w-5 text-primary" />}
      size="md"
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={updateUserMutation.isPending}
          >
            {isVietnamese ? "Hủy" : "Cancel"}
          </Button>
          <Button
            type="submit"
            form="edit-user-form"
            variant="primary"
            disabled={updateUserMutation.isPending}
          >
            {updateUserMutation.isPending
              ? isVietnamese
                ? "Đang lưu..."
                : "Saving..."
              : isVietnamese
              ? "Lưu thay đổi"
              : "Save Changes"}
          </Button>
        </>
      }
    >
      <form id="edit-user-form" onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Họ và tên */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            {isVietnamese ? "Họ và tên" : "Full Name"}
          </label>
          <div className={inputSocketClass}>
            <User className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={isVietnamese ? "Nguyễn Văn A" : "John Doe"}
              className="w-full bg-transparent text-xs sm:text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
            />
          </div>
        </div>

        {/* Số điện thoại */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            {isVietnamese ? "Số điện thoại" : "Phone Number"}
          </label>
          <div className={inputSocketClass}>
            <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="0912345678"
              className="w-full bg-transparent text-xs sm:text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
            />
          </div>
        </div>

        {/* Trạng thái hoạt động */}
        <div className="rounded-xl border border-border/50 bg-background p-3.5 shadow-[inset_1px_1px_2px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)]">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="font-bold text-foreground block">
                {isVietnamese ? "Trạng thái tài khoản" : "Account Status"}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {isActive
                  ? isVietnamese
                    ? "Tài khoản đang được kích hoạt và cho phép đăng nhập"
                    : "Account is active and permitted to sign in"
                  : isVietnamese
                  ? "Tài khoản bị vô hiệu hóa"
                  : "Account is deactivated"}
              </span>
            </div>
            <input
              type="checkbox"
              checked={isActive}
              disabled={isSelf}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-5 rounded border-border text-primary focus:ring-primary disabled:opacity-40"
            />
          </label>
          {isSelf && (
            <p className="mt-2 text-[10px] text-accent font-semibold flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-accent" />
              {isVietnamese
                ? "Anti-Lockout: Bạn không thể tự vô hiệu hóa tài khoản của chính mình."
                : "Anti-Lockout: You cannot deactivate your own account."}
            </p>
          )}
        </div>
      </form>
    </SculptedModal>
  );
}
