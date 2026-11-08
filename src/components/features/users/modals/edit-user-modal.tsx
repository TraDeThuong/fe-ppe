"use client";

import { useState, useEffect, useMemo } from "react";
import { Pencil, User, Phone, CheckCircle2, AlertTriangle, Building2, Shield } from "lucide-react";
import { SculptedModal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useUpdateUser } from "@/hooks/users";
import { useSitesCatalog } from "@/hooks/sites";
import { userService } from "@/services/user.service";
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
  const [assignedSiteIds, setAssignedSiteIds] = useState<string[]>([]);
  const [isAssigningSites, setIsAssigningSites] = useState(false);

  const { data: sitesCatalog, isLoading: sitesLoading } = useSitesCatalog();
  const allSites = useMemo(() => sitesCatalog ?? [], [sitesCatalog]);

  const isSelf = Boolean(currentAdmin?.id && user?.id === currentAdmin.id);
  const updateUserMutation = useUpdateUser();

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "");
      setPhoneNumber(user.phoneNumber || "");
      setIsActive(user.isActive);
      setAssignedSiteIds(user.siteIds || []);
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

      // Synchronize assigned sites if admin changed them
      const initialSites = user.siteIds || [];
      const hasChanged =
        initialSites.length !== assignedSiteIds.length ||
        assignedSiteIds.some((id) => !initialSites.includes(id));

      if (hasChanged) {
        setIsAssigningSites(true);
        try {
          await userService.assignUserSites(user.id, assignedSiteIds);
        } finally {
          setIsAssigningSites(false);
        }
      }

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
            disabled={updateUserMutation.isPending || isAssigningSites}
          >
            {updateUserMutation.isPending || isAssigningSites
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
        {/* Phân công công trường phụ trách */}
        {user?.role?.name !== "ADMIN" && (
          <div className="rounded-xl border border-border/50 bg-background p-3.5 shadow-[inset_1px_1px_2px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="font-bold text-foreground block">
                  {isVietnamese ? "Công trường phụ trách (Phân quyền truy cập)" : "Assigned Sites (Access Scope)"}
                </span>
              </div>
              <span className="text-[10px] font-semibold text-primary px-2 py-0.5 rounded-full bg-primary/10">
                {assignedSiteIds.length} {isVietnamese ? "đã chọn" : "selected"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {isVietnamese
                ? "Người dùng chỉ có thể xem danh sách và giám sát an toàn tại các công trường được chọn dưới đây:"
                : "User can only view and monitor safety at the selected sites below:"}
            </p>

            {sitesLoading ? (
              <p className="text-[11px] text-muted-foreground italic py-2">
                {isVietnamese ? "Đang tải danh sách công trường..." : "Loading sites..."}
              </p>
            ) : allSites.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic py-2">
                {isVietnamese ? "Chưa có công trường nào trong hệ thống." : "No sites found in system."}
              </p>
            ) : (
              <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 pt-1">
                {allSites.map((site) => {
                  const isChecked = assignedSiteIds.includes(site.id);
                  return (
                    <label
                      key={site.id}
                      className={`flex items-center justify-between p-2 rounded-lg border transition cursor-pointer text-xs ${
                        isChecked
                          ? "border-primary/40 bg-primary/5 text-foreground font-semibold"
                          : "border-border/30 bg-surface/40 text-muted-foreground hover:bg-surface-elevated"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="truncate font-medium text-foreground">{site.name}</div>
                        <div className="text-[10px] font-mono text-muted-foreground">{site.code}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAssignedSiteIds((prev) => [...prev, site.id]);
                          } else {
                            setAssignedSiteIds((prev) => prev.filter((id) => id !== site.id));
                          }
                        }}
                        className="size-4 rounded border-border text-primary focus:ring-primary"
                      />
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </form>
    </SculptedModal>
  );
}
