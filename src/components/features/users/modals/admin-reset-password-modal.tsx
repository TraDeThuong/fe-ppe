"use client";

import { useState } from "react";
import { KeyRound, Lock, Copy, Check, Sparkles, AlertCircle } from "lucide-react";
import { SculptedModal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useAdminResetPassword } from "@/hooks/users";
import { useLocale } from "@/providers/locale-provider";
import { toast } from "@/lib/toast";
import type { UserResponseDto } from "@/types";

export interface AdminResetPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserResponseDto | null;
}

export function AdminResetPasswordModal({
  open,
  onOpenChange,
  user,
}: AdminResetPasswordModalProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [customPassword, setCustomPassword] = useState("");
  const [mustChangePassword, setMustChangePassword] = useState(true);
  const [resultPassword, setResultPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const resetPasswordMutation = useAdminResetPassword();

  const handleClose = () => {
    setResultPassword(null);
    setCustomPassword("");
    setMode("auto");
    setCopied(false);
    onOpenChange(false);
  };

  const handleCopy = () => {
    if (resultPassword) {
      navigator.clipboard.writeText(resultPassword);
      setCopied(true);
      toast.success(
        isVietnamese
          ? "Đã sao chép mật khẩu tạm thời!"
          : "Temporary password copied to clipboard!"
      );
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (mode === "manual" && customPassword.length < 8) {
      toast.error(
        isVietnamese
          ? "Mật khẩu tự đặt phải có tối thiểu 8 ký tự."
          : "Custom password must be at least 8 characters."
      );
      return;
    }

    try {
      const response = await resetPasswordMutation.mutateAsync({
        id: user.id,
        payload: {
          newPassword: mode === "manual" ? customPassword.trim() : undefined,
          mustChangePassword,
        },
      });

      // Nếu backend trả về temporaryPassword hoặc là customPassword do admin nhập
      const effectivePassword = response.temporaryPassword || customPassword || "********";
      setResultPassword(effectivePassword);
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
      onOpenChange={(next) => {
        if (!next) handleClose();
        else onOpenChange(true);
      }}
      title={t("users.modal.resetPassTitle")}
      description={
        t("users.modal.resetPassSubtitle", { name: user?.email || user?.fullName || "" })
      }
      icon={<KeyRound className="h-5 w-5 text-warning" />}
      size="md"
      footer={
        resultPassword ? (
          <Button variant="primary" onClick={handleClose}>
            {isVietnamese ? "Xong" : "Done"}
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={resetPasswordMutation.isPending}
            >
              {isVietnamese ? "Hủy" : "Cancel"}
            </Button>
            <Button
              type="submit"
              form="reset-password-form"
              variant="primary"
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending
                ? isVietnamese
                  ? "Đang cấp mật khẩu..."
                  : "Resetting..."
                : isVietnamese
                ? "Cấp lại mật khẩu"
                : "Reset Password"}
            </Button>
          </>
        )
      }
    >
      {resultPassword ? (
        <div className="space-y-4 py-2 text-xs">
          <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 text-foreground">
            <span className="font-bold text-sm block text-primary">
              {isVietnamese ? "Đặt lại mật khẩu thành công!" : "Password Reset Successfully!"}
            </span>
            <p className="text-xs text-muted-foreground mt-1">
              {t("users.modal.tempPasswordNotice")}
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-background p-4 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                {isVietnamese ? "Mật khẩu tạm thời" : "Temporary Password"}
              </span>
              <span className="font-mono text-base font-black text-primary tracking-wider break-all select-all">
                {resultPassword}
              </span>
            </div>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleCopy}
              className="shrink-0 gap-1.5"
            >
              {copied ? <Check className="h-4 w-4 text-white" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? (isVietnamese ? "Đã chép" : "Copied") : (isVietnamese ? "Sao chép" : "Copy")}</span>
            </Button>
          </div>
        </div>
      ) : (
        <form id="reset-password-form" onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Mode Tabs */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              {isVietnamese ? "Phương thức đặt lại mật khẩu" : "Password Reset Method"}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("auto")}
                className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold transition-all ${
                  mode === "auto"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "border border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {t("users.modal.resetPassTabAuto")}
              </button>

              <button
                type="button"
                onClick={() => setMode("manual")}
                className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold transition-all ${
                  mode === "manual"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "border border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                <Lock className="h-3.5 w-3.5" />
                {t("users.modal.resetPassTabCustom")}
              </button>
            </div>
          </div>

          {mode === "manual" ? (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                {isVietnamese ? "Nhập mật khẩu mới" : "Enter New Password"} <span className="text-danger">*</span>
              </label>
              <div className={inputSocketClass}>
                <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  type="text"
                  required
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  placeholder={
                    isVietnamese
                      ? "Nhập mật khẩu mới (tối thiểu 8 ký tự)..."
                      : "Enter new password (min 8 characters)..."
                  }
                  className="w-full bg-transparent text-xs sm:text-sm text-foreground outline-none font-mono"
                />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border/60 bg-card/60 p-3 text-muted-foreground text-[11px] leading-relaxed">
              {isVietnamese
                ? "Hệ thống sẽ tự động tạo một mật khẩu tạm ngẫu nhiên mạnh và an toàn. Bạn có thể sao chép mật khẩu này ngay sau khi bấm xác nhận."
                : "The system will generate a strong and secure temporary password. You can copy it once confirmed."}
            </div>
          )}

          {/* Checkbox mustChangePassword */}
          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={mustChangePassword}
                onChange={(e) => setMustChangePassword(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-xs text-foreground font-medium">
                {t("users.form.mustChangePassword")}
              </span>
            </label>
          </div>
        </form>
      )}
    </SculptedModal>
  );
}
