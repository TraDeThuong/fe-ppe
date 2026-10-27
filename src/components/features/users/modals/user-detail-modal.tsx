"use client";

import { useState } from "react";
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Laptop,
  LogOut,
  KeyRound,
  Pencil,
} from "lucide-react";
import { SculptedModal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import {
  useUserSessions,
  useRevokeUserSession,
  useRevokeAllUserSessions,
} from "@/hooks/users";
import { useLocale } from "@/providers/locale-provider";
import type { UserResponseDto } from "@/types";

export interface UserDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserResponseDto | null;
  onEditClick?: (user: UserResponseDto) => void;
  onResetPasswordClick?: (user: UserResponseDto) => void;
}

export function UserDetailModal({
  open,
  onOpenChange,
  user,
  onEditClick,
  onResetPasswordClick,
}: UserDetailModalProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const [activeTab, setActiveTab] = useState<"info" | "sessions">("info");

  const { data: sessions = [], isLoading: isLoadingSessions } = useUserSessions(
    user?.id || "",
    { enabled: Boolean(open && user?.id) },
  );

  const revokeSessionMutation = useRevokeUserSession();
  const revokeAllSessionsMutation = useRevokeAllUserSessions();

  if (!user) return null;

  const roleName = user.role?.name || "USER";
  const is2FA = Boolean(user.twoFactorEnabled);
  const isLocked = Boolean(user.lockedUntil && new Date(user.lockedUntil) > new Date());
  const isDeleted = Boolean(user.deletedAt);
  const isActive = user.isActive && !isDeleted && !isLocked;

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await revokeSessionMutation.mutateAsync({
        userId: user.id,
        sessionId,
      });
    } catch {
      // Handled by toast
    }
  };

  const handleRevokeAllSessions = async () => {
    try {
      await revokeAllSessionsMutation.mutateAsync(user.id);
    } catch {
      // Handled by toast
    }
  };

  return (
    <SculptedModal
      open={open}
      onOpenChange={onOpenChange}
      title={isVietnamese ? "Hồ sơ chi tiết người dùng" : "User Profile Details"}
      description={isVietnamese ? `Mã ID: ${user.id}` : `User ID: ${user.id}`}
      icon={<User className="h-5 w-5 text-primary" />}
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            {onEditClick && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onEditClick(user);
                }}
                className="gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" />
                {isVietnamese ? "Chỉnh sửa" : "Edit Profile"}
              </Button>
            )}
            {onResetPasswordClick && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onResetPasswordClick(user);
                }}
                className="gap-1.5"
              >
                <KeyRound className="h-3.5 w-3.5" />
                {isVietnamese ? "Cấp mật khẩu" : "Reset Password"}
              </Button>
            )}
          </div>
          <Button variant="primary" onClick={() => onOpenChange(false)}>
            {isVietnamese ? "Đóng" : "Close"}
          </Button>
        </div>
      }
    >
      <div className="space-y-5 text-xs">
        {/* Header Profile card */}
        <div className="flex items-center gap-4 rounded-2xl border border-border/50 bg-background p-4 shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]">
          {/* Avatar Socket */}
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/60 dark:border-white/10 bg-background font-mono text-lg font-black text-primary shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)]">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName || user.email || ""}
                className="h-full w-full rounded-2xl object-cover"
              />
            ) : (
              (user.fullName || user.email || "U").charAt(0).toUpperCase()
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-foreground truncate">
                {user.fullName || (isVietnamese ? "Chưa cập nhật tên" : "Unnamed User")}
              </h3>

              {/* Status Badge */}
              {isDeleted ? (
                <span className="rounded-full bg-muted/50 text-muted-foreground border border-border/60 px-2 py-0.5 text-[10px] font-bold line-through">
                  {isVietnamese ? "Đã xóa" : "Deleted"}
                </span>
              ) : isLocked ? (
                <span className="rounded-full bg-accent/10 text-accent border border-accent/30 px-2 py-0.5 text-[10px] font-bold">
                  {isVietnamese ? "Tạm khóa" : "Locked"}
                </span>
              ) : isActive ? (
                <span className="flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 text-[10px] font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]" />
                  {isVietnamese ? "Hoạt động" : "Active"}
                </span>
              ) : (
                <span className="rounded-full bg-muted/40 text-muted-foreground border border-border/40 px-2 py-0.5 text-[10px] font-bold">
                  {isVietnamese ? "Vô hiệu hóa" : "Inactive"}
                </span>
              )}

              {/* Role Badge */}
              <span className="rounded-md bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 font-mono text-[10px] font-bold uppercase">
                {roleName}
              </span>
            </div>

            <p className="text-xs text-muted-foreground mt-0.5 truncate">{user.email}</p>
          </div>
        </div>

        {/* Tab selection */}
        <div className="flex gap-2 border-b border-border/40 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("info")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "info"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {isVietnamese ? "Thông tin chi tiết" : "General Details"}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("sessions")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "sessions"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>
              {isVietnamese
                ? `Phiên hoạt động (${sessions.length})`
                : `Active Sessions (${sessions.length})`}
            </span>
          </button>
        </div>

        {/* Tab 1: Thông tin chi tiết */}
        {activeTab === "info" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/40 bg-card p-3 shadow-nm-pressed space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Email
              </span>
              <p className="font-semibold text-foreground break-all">{user.email || "-"}</p>
            </div>

            <div className="rounded-xl border border-border/40 bg-card p-3 shadow-nm-pressed space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> {isVietnamese ? "Số điện thoại" : "Phone Number"}
              </span>
              <p className="font-semibold text-foreground">
                {user.phoneNumber || (isVietnamese ? "Chưa cung cấp" : "Not provided")}
              </p>
            </div>

            <div className="rounded-xl border border-border/40 bg-card p-3 shadow-nm-pressed space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> {isVietnamese ? "Bảo mật 2FA (TOTP)" : "2FA Security (TOTP)"}
              </span>
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                {is2FA ? (
                  <span className="text-primary font-bold flex items-center gap-1">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    {isVietnamese ? "Đã kích hoạt Google Authenticator" : "Google Authenticator Active"}
                  </span>
                ) : (
                  <span className="text-muted-foreground font-medium flex items-center gap-1">
                    <ShieldAlert className="h-4 w-4 text-muted-foreground/60" />
                    {isVietnamese ? "Chưa kích hoạt 2FA" : "2FA Not Enabled"}
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border/40 bg-card p-3 shadow-nm-pressed space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> {isVietnamese ? "Ngày tạo tài khoản" : "Account Created"}
              </span>
              <p className="font-semibold text-foreground">
                {user.createdAt ? new Date(user.createdAt).toLocaleString(locale) : "-"}
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Phiên hoạt động & Thiết bị */}
        {activeTab === "sessions" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[11px]">
                {isVietnamese
                  ? "Danh sách các phiên làm việc và thiết bị đang đăng nhập tài khoản này."
                  : "List of active login sessions and devices for this account."}
              </span>
              {sessions.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRevokeAllSessions}
                  disabled={revokeAllSessionsMutation.isPending}
                  className="text-danger hover:text-danger text-[11px] gap-1"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {revokeAllSessionsMutation.isPending
                    ? isVietnamese
                      ? "Đang đăng xuất..."
                      : "Signing out..."
                    : isVietnamese
                    ? "Đăng xuất tất cả"
                    : "Sign Out All"}
                </Button>
              )}
            </div>

            {isLoadingSessions ? (
              <div className="py-8 text-center text-muted-foreground">
                {isVietnamese ? "Đang tải danh sách phiên..." : "Loading sessions..."}
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground rounded-2xl border border-border/40 bg-card">
                {isVietnamese
                  ? "Không có phiên đăng nhập nào đang hoạt động."
                  : "No active login sessions found."}
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-background p-3 shadow-[inset_1px_1px_2px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-card border border-border/40 text-primary">
                        <Laptop className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-xs truncate">
                          {s.userAgent || (isVietnamese ? "Thiết bị không xác định" : "Unknown Device")}
                        </p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                          <span>IP: {s.ipAddress || (isVietnamese ? "Ẩn" : "Hidden")}</span>
                          <span>•</span>
                          <span>
                            {(isVietnamese ? "Tạo: " : "Created: ") +
                              new Date(s.createdAt).toLocaleDateString(locale)}
                          </span>
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevokeSession(s.id)}
                      disabled={revokeSessionMutation.isPending}
                      className="text-danger hover:text-danger text-xs shrink-0"
                    >
                      {revokeSessionMutation.isPending
                        ? isVietnamese
                          ? "Đang hủy..."
                          : "Revoking..."
                        : isVietnamese
                        ? "Hủy phiên"
                        : "Revoke"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </SculptedModal>
  );
}
