"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Shield,
  KeyRound,
  Building2,
  Trash2,
  RotateCcw,
  Lock,
  Unlock,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  Mail,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/providers/locale-provider";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/lib/toast";
import type { UserResponseDto } from "@/types";

export interface UserDetailHeroProps {
  user?: UserResponseDto;
  loading?: boolean;
  onEditClick: () => void;
  onAssignRoleClick: () => void;
  onAssignSitesClick: () => void;
  onResetPasswordClick: () => void;
  onDeleteClick: (mode: "delete" | "restore" | "activate" | "deactivate") => void;
}

export function UserDetailHero({
  user,
  loading = false,
  onEditClick,
  onAssignRoleClick,
  onAssignSitesClick,
  onResetPasswordClick,
  onDeleteClick,
}: UserDetailHeroProps) {
  const router = useRouter();
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const { user: currentAdmin } = useAuth();

  const [copiedId, setCopiedId] = useState(false);

  if (loading || !user) {
    return (
      <div className="space-y-4">
        {/* Back button & Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => router.push("/users")}
            className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>{isVietnamese ? "Danh sách người dùng" : "Users list"}</span>
          </button>
          <span>/</span>
          <Skeleton className="h-4 w-32 rounded" />
        </div>

        {/* Hero Banner Box Skeleton */}
        <div
          className={[
            "rounded-3xl p-5 sm:p-6",
            "border border-white/80 dark:border-white/5 bg-background dark:bg-card",
            "shadow-[8px_8px_18px_var(--shadow-dark),-7px_-7px_18px_rgba(255,255,255,0.9)]",
            "dark:shadow-[8px_8px_18px_rgba(0,0,0,0.45),-3px_-3px_9px_rgba(255,255,255,0.025)]",
          ].join(" ")}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4 sm:gap-5 min-w-0">
              <Skeleton className="size-20 sm:size-24 rounded-2xl shrink-0" />
              <div className="min-w-0 space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className="h-7 w-48 rounded-lg" />
                  <Skeleton className="h-5 w-24 rounded-lg" />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-40 rounded-md" />
                  <Skeleton className="h-4 w-28 rounded-md" />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Skeleton className="h-9 w-24 rounded-xl" />
              <Skeleton className="h-9 w-28 rounded-xl" />
              <Skeleton className="h-9 w-20 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isSelf = Boolean(currentAdmin?.id && user.id === currentAdmin.id);
  const isLocked = Boolean(user.lockedUntil && new Date(user.lockedUntil) > new Date());
  const isDeleted = Boolean(user.deletedAt);
  const isActive = user.isActive && !isDeleted && !isLocked;

  const roleName = user.role?.name || "USER";
  const initials = (user.fullName || user.email || "U").charAt(0).toUpperCase();

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    toast.success(isVietnamese ? "Đã sao chép User ID" : "Copied User ID");
    setTimeout(() => setCopiedId(false), 2000);
  };

  const roleColors: Record<string, string> = {
    ADMIN: "border-primary/40 bg-primary/10 text-primary",
    SUPER_ADMIN: "border-primary/40 bg-primary/10 text-primary",
    SAFETY_MANAGER: "border-accent/40 bg-accent/10 text-accent",
    SAFETY_OFFICER: "border-accent/30 bg-accent/10 text-accent",
    MANAGER: "border-accent/30 bg-accent/10 text-accent",
  };
  const roleBadgeClass = roleColors[roleName] || "border-border/60 bg-muted/40 text-muted-foreground";

  return (
    <div className="space-y-4">
      {/* Back button & Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <button
          type="button"
          onClick={() => router.push("/users")}
          className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>{isVietnamese ? "Danh sách người dùng" : "Users list"}</span>
        </button>
        <span>/</span>
        <span className="font-bold text-foreground truncate max-w-[200px]">
          {user.fullName || user.email || user.id}
        </span>
      </div>

      {/* Hero Banner Box */}
      <div
        className={[
          "rounded-3xl p-5 sm:p-6",
          "border border-white/80 dark:border-white/5 bg-background dark:bg-card",
          "shadow-[8px_8px_18px_var(--shadow-dark),-7px_-7px_18px_rgba(255,255,255,0.9)]",
          "dark:shadow-[8px_8px_18px_rgba(0,0,0,0.45),-3px_-3px_9px_rgba(255,255,255,0.025)]",
        ].join(" ")}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Avatar + Identity */}
          <div className="flex items-start sm:items-center gap-4 sm:gap-5 min-w-0">
            {/* Avatar */}
            <div className="relative flex size-20 sm:size-24 shrink-0 items-center justify-center rounded-2xl border-2 border-border/40 bg-background font-mono text-2xl font-bold text-primary shadow-[4px_4px_8px_var(--shadow-dark),-4px_-4px_8px_var(--shadow-light)]">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="size-full rounded-2xl object-cover"
                />
              ) : (
                <span>{initials}</span>
              )}

              {/* Status dot */}
              <span
                className={`absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-background ${
                  isActive
                    ? "bg-primary shadow-[0_0_8px_var(--primary)]"
                    : isLocked
                      ? "bg-warning"
                      : "bg-muted-foreground"
                }`}
                title={
                  isActive
                    ? isVietnamese
                      ? "Đang hoạt động"
                      : "Active"
                    : isLocked
                      ? isVietnamese
                        ? "Bị tạm khóa"
                        : "Locked"
                      : isVietnamese
                        ? "Vô hiệu hóa"
                        : "Inactive"
                }
              />
            </div>

            {/* User Meta */}
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight truncate">
                  {user.fullName || (isVietnamese ? "Chưa đặt tên" : "Unnamed User")}
                </h1>

                {/* Role Badge */}
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border font-mono text-[10px] font-bold tracking-wide uppercase ${roleBadgeClass}`}
                >
                  <Shield size={11} className="shrink-0" />
                  {roleName}
                </span>

                {/* 2FA Badge */}
                {user.twoFactorEnabled ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-primary/30 bg-primary/10 text-primary text-[10px] font-bold">
                    <ShieldCheck size={11} />
                    <span>2FA</span>
                  </span>
                ) : null}
              </div>

              {/* Contact info + UUID */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 font-mono">
                  <Mail size={13} className="text-primary" />
                  {user.email || "-"}
                </span>

                {user.phoneNumber && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1.5 font-mono">
                      <Phone size={13} className="text-primary" />
                      {user.phoneNumber}
                    </span>
                  </>
                )}

                <span>•</span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="inline-flex items-center gap-1 font-mono text-[11px] hover:text-foreground transition-colors cursor-pointer"
                  title={isVietnamese ? "Sao chép ID" : "Copy ID"}
                >
                  <span>#{user.id.slice(0, 8)}</span>
                  {copiedId ? <Check size={11} className="text-primary" /> : <Copy size={11} />}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Action Buttons Group */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onEditClick}
              className="gap-1.5 text-xs h-9 shadow-[2px_2px_4px_var(--shadow-dark)]"
            >
              <Pencil size={13} />
              <span>{isVietnamese ? "Sửa hồ sơ" : "Edit Profile"}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onAssignSitesClick}
              className="gap-1.5 text-xs h-9 shadow-[2px_2px_4px_var(--shadow-dark)]"
            >
              <Building2 size={13} className="text-primary" />
              <span>{isVietnamese ? "Gán công trường" : "Assign Sites"}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onAssignRoleClick}
              disabled={isSelf}
              className="gap-1.5 text-xs h-9 shadow-[2px_2px_4px_var(--shadow-dark)]"
            >
              <Shield size={13} />
              <span>{isVietnamese ? "Đổi vai trò" : "Role"}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onResetPasswordClick}
              className="gap-1.5 text-xs h-9 shadow-[2px_2px_4px_var(--shadow-dark)]"
            >
              <KeyRound size={13} />
              <span>{isVietnamese ? "Cấp lại MK" : "Password"}</span>
            </Button>

            {isDeleted ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onDeleteClick("restore")}
                className="gap-1.5 text-xs h-9"
              >
                <RotateCcw size={13} />
                <span>{isVietnamese ? "Khôi phục" : "Restore"}</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={isSelf && user.isActive}
                onClick={() => onDeleteClick(user.isActive ? "deactivate" : "activate")}
                className={`gap-1.5 text-xs h-9 ${
                  user.isActive ? "text-warning border-warning/30 hover:bg-warning/10" : "text-primary"
                }`}
              >
                {user.isActive ? <Lock size={13} /> : <Unlock size={13} />}
                <span>
                  {user.isActive
                    ? isVietnamese
                      ? "Vô hiệu"
                      : "Deactivate"
                    : isVietnamese
                      ? "Kích hoạt"
                      : "Activate"}
                </span>
              </Button>
            )}

            {!isDeleted && !isSelf && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => onDeleteClick("delete")}
                className="text-xs h-9 px-2.5"
                title={isVietnamese ? "Xóa tài khoản" : "Delete user"}
              >
                <Trash2 size={13} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
