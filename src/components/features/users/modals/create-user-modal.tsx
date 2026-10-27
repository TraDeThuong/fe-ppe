"use client";

import { useState, useId } from "react";
import { UserPlus, Mail, Lock, User, Phone, Shield, Eye, EyeOff } from "lucide-react";
import { SculptedModal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useCreateUser } from "@/hooks/users";
import { useRoles } from "@/hooks/rbac";
import { useLocale } from "@/providers/locale-provider";
import { toast } from "@/lib/toast";

export interface CreateUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateUserModal({ open, onOpenChange }: CreateUserModalProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [roleId, setRoleId] = useState("");
  const [mustChangePassword, setMustChangePassword] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const { data: roles = [], isLoading: isLoadingRoles } = useRoles();
  const createUserMutation = useCreateUser();

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setFullName("");
    setPhoneNumber("");
    setRoleId("");
    setMustChangePassword(true);
    setShowPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !roleId) {
      toast.error(
        isVietnamese
          ? "Vui lòng điền đầy đủ Email, Mật khẩu và chọn Vai trò."
          : "Please enter Email, Password, and select a Role.",
      );
      return;
    }

    if (password.length < 8) {
      toast.error(
        isVietnamese
          ? "Mật khẩu phải có tối thiểu 8 ký tự."
          : "Password must be at least 8 characters.",
      );
      return;
    }

    try {
      await createUserMutation.mutateAsync({
        email: email.trim(),
        password,
        roleId,
        fullName: fullName.trim() || undefined,
        phoneNumber: phoneNumber.trim() || undefined,
        mustChangePassword,
      });

      resetForm();
      onOpenChange(false);
    } catch {
      // Error handled by mutation hook toast
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
      onOpenChange={(next) => {
        if (!next) resetForm();
        onOpenChange(next);
      }}
      title={isVietnamese ? "Thêm người dùng mới" : "Add New User"}
      description={
        isVietnamese
          ? "Tạo tài khoản mới và thiết lập vai trò ban đầu trong hệ thống Smart PPE"
          : "Provision a new account and configure initial system roles in Smart PPE"
      }
      icon={<UserPlus className="h-5 w-5 text-primary" />}
      size="md"
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={createUserMutation.isPending}
          >
            {isVietnamese ? "Hủy bỏ" : "Cancel"}
          </Button>
          <Button
            type="submit"
            form="create-user-form"
            variant="primary"
            disabled={createUserMutation.isPending}
          >
            {createUserMutation.isPending
              ? isVietnamese
                ? "Đang tạo..."
                : "Creating..."
              : isVietnamese
              ? "Tạo tài khoản"
              : "Create Account"}
          </Button>
        </>
      }
    >
      <form id="create-user-form" onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Email */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            {isVietnamese ? "Email đăng nhập" : "Login Email"} <span className="text-danger">*</span>
          </label>
          <div className={inputSocketClass}>
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full bg-transparent text-xs sm:text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
            />
          </div>
        </div>

        {/* Mật khẩu */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            {isVietnamese ? "Mật khẩu khởi tạo" : "Initial Password"} <span className="text-danger">*</span>
          </label>
          <div className={inputSocketClass}>
            <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isVietnamese ? "Tối thiểu 8 ký tự..." : "At least 8 characters..."}
              className="w-full bg-transparent text-xs sm:text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Họ và tên & Số điện thoại */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        </div>

        {/* Chọn Vai trò */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            {isVietnamese ? "Vai trò hệ thống" : "System Role"} <span className="text-danger">*</span>
          </label>
          <div className={inputSocketClass}>
            <Shield className="h-4 w-4 shrink-0 text-primary" />
            <select
              required
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="w-full bg-transparent text-xs sm:text-sm text-foreground outline-none cursor-pointer"
              disabled={isLoadingRoles}
            >
              <option value="" disabled>
                {isVietnamese ? "-- Chọn vai trò (Role) --" : "-- Select a role --"}
              </option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.description ? `(${r.description})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bắt buộc đổi mật khẩu */}
        <div className="pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={mustChangePassword}
              onChange={(e) => setMustChangePassword(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-xs text-foreground font-medium">
              {isVietnamese
                ? "Yêu cầu đổi mật khẩu ở lần đăng nhập đầu tiên"
                : "Force password change on first login"}
            </span>
          </label>
        </div>
      </form>
    </SculptedModal>
  );
}
