"use client";

import Link from "next/link";
import {
  ArrowUpDown,
  Building2,
  Calendar,
  ExternalLink,
  Eye,
  Lock,
  Pencil,
  Phone,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Unlock,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhoneReveal } from "@/components/ui/phone-reveal";
import { useLocale } from "@/providers/locale-provider";
import type { UserResponseDto } from "@/types";
import {
  getRoleBadgeStyle,
  getUserAccountStatus,
  getUserInitials,
} from "./user-presentation";

export type UserCardSortOption =
  | "createdAt:desc"
  | "createdAt:asc"
  | "fullName:asc"
  | "email:asc";

export interface UserCardGridProps {
  users: UserResponseDto[];
  loading?: boolean;
  fetching?: boolean;
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  sortValue: UserCardSortOption;
  onSortChange: (value: UserCardSortOption) => void;
  currentAdminId?: string;
  canUpdate?: boolean;
  canAssignRole?: boolean;
  canDelete?: boolean;
  canRestore?: boolean;
  onViewProfile: (user: UserResponseDto) => void;
  onQuickView?: (user: UserResponseDto) => void;
  onEdit: (user: UserResponseDto) => void;
  onAssignRole: (user: UserResponseDto) => void;
  onToggleActive: (user: UserResponseDto) => void;
  onRestore: (user: UserResponseDto) => void;
  onDelete: (user: UserResponseDto) => void;
  onRoleBadgeClick?: (roleName: string) => void;
}

export function UserCardGrid({
  users,
  loading = false,
  fetching = false,
  hasActiveFilters = false,
  onResetFilters,
  totalCount,
  pageIndex,
  pageSize,
  sortValue,
  onSortChange,
  currentAdminId,
  canUpdate = false,
  canAssignRole = false,
  canDelete = false,
  canRestore = false,
  onViewProfile,
  onQuickView,
  onEdit,
  onAssignRole,
  onToggleActive,
  onRestore,
  onDelete,
  onRoleBadgeClick,
}: UserCardGridProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  if (loading && users.length === 0) {
    return (
      <div
        aria-busy="true"
        data-testid="user-card-grid-loading"
        className="grid grid-cols-1 gap-4 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-3"
      >
        {[0, 1, 2, 3, 4, 5].map((idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-border/30 bg-surface p-4 shadow-nm-sm space-y-3.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-11 shrink-0 animate-pulse rounded-2xl bg-muted/40" />
                <div className="space-y-1.5">
                  <div className="h-4 w-32 animate-pulse rounded-md bg-muted/45" />
                  <div className="h-3 w-40 animate-pulse rounded-md bg-muted/30" />
                </div>
              </div>
              <div className="h-5 w-16 animate-pulse rounded-full bg-muted/35" />
            </div>
            <div className="flex gap-2">
              <div className="h-5 w-24 animate-pulse rounded-lg bg-muted/35" />
              <div className="h-5 w-20 animate-pulse rounded-lg bg-muted/25" />
            </div>
            <div className="h-16 animate-pulse rounded-xl bg-background/70 shadow-nm-inset" />
            <div className="flex items-center justify-between pt-1">
              <div className="h-8 w-28 animate-pulse rounded-xl bg-muted/35" />
              <div className="flex gap-1.5">
                <div className="size-8 animate-pulse rounded-xl bg-muted/35" />
                <div className="size-8 animate-pulse rounded-xl bg-muted/35" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div
        data-testid="user-card-grid-empty"
        className="flex flex-col items-center justify-center gap-3 px-4 py-14 text-center sm:px-6"
      >
        <div className="flex size-14 items-center justify-center rounded-2xl bg-background text-muted-foreground shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)]">
          <Users className="size-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-foreground">
            {t("users.empty.title")}
          </h3>
          <p className="max-w-sm text-xs text-muted-foreground">
            {t("users.empty.description")}
          </p>
        </div>
        {hasActiveFilters && onResetFilters && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onResetFilters}
            className="mt-1 gap-1.5 rounded-xl text-xs font-semibold"
          >
            <RotateCcw className="size-3.5" />
            <span>{t("users.filter.reset")}</span>
          </Button>
        )}
      </div>
    );
  }

  const effectiveTotal = Math.max(totalCount, users.length);
  const startIdx = pageIndex * pageSize + 1;
  const endIdx = Math.min(effectiveTotal, pageIndex * pageSize + users.length);

  return (
    <div
      data-testid="user-card-grid"
      className="space-y-3 p-4 sm:p-5"
    >
      {/* Mini Header: Phạm vi hiển thị & Sắp xếp nhanh */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span
            className={`size-1.5 rounded-full ${fetching ? "animate-ping bg-primary" : "bg-muted-foreground/60"
              }`}
          />
          <span className="font-medium">
            {isVietnamese ? (
              <>
                Đang xem{" "}
                <strong className="font-bold text-foreground tabular-nums">
                  {startIdx}–{endIdx}
                </strong>{" "}
                /{" "}
                <strong className="font-bold text-foreground tabular-nums">
                  {effectiveTotal}
                </strong>{" "}
                người dùng
              </>
            ) : (
              <>
                Showing{" "}
                <strong className="font-bold text-foreground tabular-nums">
                  {startIdx}–{endIdx}
                </strong>{" "}
                of{" "}
                <strong className="font-bold text-foreground tabular-nums">
                  {effectiveTotal}
                </strong>{" "}
                users
              </>
            )}
          </span>
        </div>

        <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
          <ArrowUpDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="hidden sm:inline">{t("users.view.sortLabel")}</span>
          <select
            aria-label={t("users.view.sortLabel")}
            value={sortValue}
            onChange={(e) => onSortChange(e.target.value as UserCardSortOption)}
            className="h-8 cursor-pointer rounded-xl border border-[var(--shadow-dark)]/25 bg-background px-2.5 text-xs font-semibold text-foreground shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)] focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-white/10"
          >
            <option value="createdAt:desc">{t("users.view.sortNewest")}</option>
            <option value="createdAt:asc">{t("users.view.sortOldest")}</option>
            <option value="fullName:asc">{t("users.view.sortNameAsc")}</option>
            <option value="email:asc">{t("users.view.sortEmailAsc")}</option>
          </select>
        </label>
      </div>

      {/* Responsive Card Grid (1 / 2 / 3 cột — tối giản, trung tính) */}
      <div
        className={`grid grid-cols-1 gap-4 transition-opacity duration-200 md:grid-cols-2 xl:grid-cols-3 ${fetching ? "opacity-75" : "opacity-100"
          }`}
      >
        {users.map((user) => {
          const roleName = user.role?.name || "USER";
          const roleStyle = getRoleBadgeStyle(roleName);
          const accountStatus = getUserAccountStatus(user);
          const isDeleted = accountStatus === "deleted";
          const isSelf = Boolean(currentAdminId && user.id === currentAdminId);
          const initials = getUserInitials(user);
          const siteCount = Array.isArray(user.siteIds) ? user.siteIds.length : 0;
          const is2FA = Boolean(user.twoFactorEnabled);
          const joinedDate = user.createdAt
            ? new Date(user.createdAt).toLocaleDateString(
              isVietnamese ? "vi-VN" : "en-US",
            )
            : "-";

          return (
            <article
              key={user.id}
              data-testid={`user-card-${user.id}`}
              onClick={() => onViewProfile(user)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onViewProfile(user);
                }
              }}
              role="button"
              tabIndex={0}
              className={[
                "group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-[22px] border border-border/50 bg-surface p-4.5",
                // Neumorphism đa tầng: Bóng nổi sâu + viền phản quang nội khối
                "shadow-[8px_8px_18px_var(--shadow-dark),-8px_-8px_18px_var(--shadow-light),inset_1px_1px_1px_var(--shadow-light)]",
                // Hiệu ứng Hover: Nâng khối, viền bắt sáng primary/accent
                "transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-primary/40",
                "hover:shadow-[12px_16px_28px_var(--shadow-dark),-10px_-10px_22px_var(--shadow-light),inset_1px_1px_2px_var(--shadow-light)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                "dark:border-white/10 dark:bg-card/95",
                isDeleted ? "opacity-70 grayscale-[0.3]" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {/* Thanh ánh sáng trang trí đỉnh thẻ (Primary -> Accent) */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-6 top-0 h-[2.5px] rounded-b-full bg-gradient-to-r from-primary/30 via-accent/60 to-primary/30 opacity-60 transition-all duration-300 group-hover:inset-x-3 group-hover:from-primary group-hover:via-accent group-hover:to-primary group-hover:opacity-100"
              />

              {/* Quầng sáng ambient cực nhẹ góc phải trên khi hover */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-gradient-to-br from-primary/10 to-accent/15 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
              />

              <div className="relative space-y-3.5">
                {/* 1. Header: Avatar Bezel 2 tầng + Tên & Email + Status Pill khắc chìm */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex min-w-0 items-center gap-3.5">
                    {/* Khung ngoài khắc chìm (Recessed Bezel) */}
                    <div className="relative shrink-0 rounded-[18px] bg-background/80 p-1 shadow-[inset_2.5px_2.5px_5px_var(--shadow-dark),inset_-2.5px_-2.5px_5px_var(--shadow-light)]">
                      <Link
                        href={`/users/${user.id}`}
                        onClick={(e) => e.stopPropagation()}
                        title={
                          isVietnamese
                            ? "Nhấp để xem hồ sơ chi tiết"
                            : "Click to view full profile"
                        }
                        className="relative flex size-11 items-center justify-center overflow-hidden rounded-[14px] border border-border/40 bg-surface font-mono text-sm font-extrabold tracking-tight text-foreground shadow-[3px_3px_6px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] transition-all duration-300 group-hover:scale-[1.04] group-hover:border-primary/40 group-hover:text-primary"
                      >
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.fullName || user.email || ""}
                            className="size-full object-cover"
                          />
                        ) : (
                          <span className="bg-gradient-to-br from-foreground via-foreground to-primary bg-clip-text text-transparent">
                            {initials}
                          </span>
                        )}
                      </Link>

                      {/* Đèn báo trạng thái gắn trực tiếp trên góc Avatar */}
                      {accountStatus === "active" && (
                        <span className="absolute -bottom-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-surface shadow-[1px_1px_2px_var(--shadow-dark)]">
                          <span className="absolute inline-flex size-2 animate-ping rounded-full bg-primary opacity-60" />
                          <span className="relative inline-flex size-2 rounded-full bg-primary" />
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <Link
                        href={`/users/${user.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="block truncate text-[14.5px] font-bold tracking-tight text-foreground transition-colors group-hover:text-primary hover:underline"
                      >
                        {user.fullName || (isVietnamese ? "Chưa đặt tên" : "Unnamed")}
                      </Link>
                      <p
                        title={user.email || undefined}
                        className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground/90"
                      >
                        {user.email || "—"}
                      </p>
                    </div>
                  </div>

                  {/* Status Pill khắc chìm Neumorphic */}
                  <div className="shrink-0">
                    {accountStatus === "deleted" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-border/30 bg-background/80 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground line-through shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]">
                        <span className="size-1.5 rounded-full bg-muted-foreground/45" />
                        {isVietnamese ? "Đã xóa" : "Deleted"}
                      </span>
                    ) : accountStatus === "locked" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-border/30 bg-background/80 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]">
                        <span className="size-1.5 rounded-full bg-muted-foreground/75" />
                        {isVietnamese ? "Tạm khóa" : "Locked"}
                      </span>
                    ) : accountStatus === "active" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-background/90 px-2.5 py-1 text-[10px] font-bold text-primary shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]">
                        <span className="size-1.5 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]" />
                        {isVietnamese ? "Hoạt động" : "Active"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-border/30 bg-background/80 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]">
                        <span className="size-1.5 rounded-full bg-muted-foreground/45" />
                        {isVietnamese ? "Vô hiệu hóa" : "Inactive"}
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Role Badge (Nút nổi) + Công trường phụ trách (Accent Pill) */}
                <div className="flex flex-wrap items-center gap-2">
                  {onRoleBadgeClick ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRoleBadgeClick(roleName);
                      }}
                      title={
                        isVietnamese
                          ? `Lọc nhanh theo vai trò ${roleName}`
                          : `Filter by role ${roleName}`
                      }
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:text-primary active:translate-y-0 active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] ${roleStyle.badgeClass}`}
                    >
                      <Shield size={11} className="shrink-0" />
                      <span>{roleName}</span>
                    </button>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] ${roleStyle.badgeClass}`}
                    >
                      <Shield size={11} className="shrink-0" />
                      <span>{roleName}</span>
                    </span>
                  )}

                  {roleName !== "ADMIN" && siteCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-accent/30 bg-accent/10 px-2.5 py-1 text-[10.5px] font-semibold text-accent-foreground shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)]">
                      <Building2 size={11} className="shrink-0 text-primary" />
                      <span>
                        {siteCount} {isVietnamese ? "công trường" : "sites"}
                      </span>
                    </span>
                  )}
                </div>

                {/* 3. Khay thông tin khắc chìm sâu (Deeply Recessed Telemetry Well) */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="relative space-y-2.5 rounded-2xl border border-border/30 bg-background/75 p-3 text-[11px] shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)] dark:border-white/[0.06]"
                >
                  {/* Dấu chấm trang trí 2 góc tạo cảm giác bảng điều khiển cơ khí */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute right-2 top-2 size-1 rounded-full bg-primary/35"
                  />

                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
                      <span className="flex size-5 items-center justify-center rounded-lg bg-surface text-primary shadow-[1.5px_1.5px_3px_var(--shadow-dark),-1.5px_-1.5px_3px_var(--shadow-light)]">
                        <Phone className="size-3 shrink-0" />
                      </span>
                      <span>{isVietnamese ? "SĐT" : "Phone"}</span>
                    </span>
                    <PhoneReveal
                      key={user.id}
                      phoneNumber={user.phoneNumber}
                      isVietnamese={isVietnamese}
                      iconSize={12}
                      buttonClassName="size-6 rounded-lg shadow-[1.5px_1.5px_3px_var(--shadow-dark),-1.5px_-1.5px_3px_var(--shadow-light)] active:shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark)]"
                      textClassName="text-[11px] font-mono font-bold tracking-wide text-foreground"
                    />
                  </div>

                  {/* Đường rãnh phân cách khắc chìm (Engraved Groove Divider) */}
                  <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-border/60 to-transparent shadow-[0_1px_0_var(--shadow-light)]" />

                  <div className="flex items-center justify-between gap-2">
                    {is2FA ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                        <ShieldCheck size={13} className="shrink-0 text-primary" />
                        <span>{t("users.2fa.enabled")}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-1 text-muted-foreground/75">
                        <ShieldAlert
                          size={13}
                          className="shrink-0 text-muted-foreground/55"
                        />
                        <span>{t("users.2fa.disabled")}</span>
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] font-medium text-muted-foreground">
                      <Calendar className="size-3 shrink-0 text-primary/70" />
                      <span>{joinedDate}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Footer Actions: Cụm phím bấm cơ học Neumorphic */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="relative mt-4 flex items-center justify-between gap-2 pt-3"
              >
                {/* Đường rãnh khắc nổi phân tách footer */}
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-border/70 to-transparent shadow-[0_1px_0_var(--shadow-light)]"
                />

                <div className="flex items-center gap-2">
                  {/* Nút chính: Kết hợp Primary & Accent */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onViewProfile(user)}
                    className="group/btn h-8 gap-1.5 rounded-xl border-primary/35 bg-gradient-to-br from-surface via-surface to-accent/20 px-3 text-[11px] font-bold text-foreground shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)] transition-all duration-200 hover:border-primary hover:from-primary hover:to-primary/90 hover:text-primary-foreground active:translate-y-0.5 active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)]"
                  >
                    <ExternalLink className="size-3 text-primary transition-colors group-hover/btn:text-primary-foreground" />
                    <span>{t("users.view.viewProfile")}</span>
                  </Button>

                  {onQuickView && (
                    <button
                      type="button"
                      onClick={() => onQuickView(user)}
                      aria-label={t("users.view.quickView")}
                      title={
                        isVietnamese
                          ? "Xem nhanh & Phiên đăng nhập"
                          : "Quick View & Sessions"
                      }
                      className="inline-flex size-8 cursor-pointer items-center justify-center rounded-xl border border-border/45 bg-surface text-muted-foreground shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-accent/15 hover:text-primary active:translate-y-0 active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]"
                    >
                      <Eye className="size-3.5" />
                    </button>
                  )}
                </div>

                {/* Cụm nút quyền hạn được đặt trong khay lõm nhẹ */}
                <div className="flex items-center gap-1.5 rounded-2xl bg-background/60 p-1 shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]">
                  {canUpdate && !isDeleted && (
                    <button
                      type="button"
                      onClick={() => onEdit(user)}
                      aria-label={
                        isVietnamese
                          ? `Chỉnh sửa ${user.fullName || user.email}`
                          : `Edit ${user.fullName || user.email}`
                      }
                      title={isVietnamese ? "Chỉnh sửa thông tin" : "Edit Profile"}
                      className="inline-flex size-7 cursor-pointer items-center justify-center rounded-xl border border-border/40 bg-surface text-muted-foreground shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] transition-all duration-150 hover:border-primary/50 hover:text-primary active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  )}

                  {canAssignRole && !isDeleted && (
                    <button
                      type="button"
                      disabled={isSelf}
                      onClick={() => onAssignRole(user)}
                      aria-label={
                        isVietnamese
                          ? `Phân vai trò cho ${user.fullName || user.email}`
                          : `Assign role to ${user.fullName || user.email}`
                      }
                      title={
                        isSelf
                          ? t("users.actions.selfDisabled")
                          : isVietnamese
                            ? "Phân vai trò RBAC"
                            : "Assign RBAC Role"
                      }
                      className="inline-flex size-7 cursor-pointer items-center justify-center rounded-xl border border-border/40 bg-surface text-muted-foreground shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] transition-all duration-150 hover:border-primary/50 hover:text-primary active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <Shield className="size-3.5" />
                    </button>
                  )}

                  {isDeleted ? (
                    canRestore && (
                      <button
                        type="button"
                        onClick={() => onRestore(user)}
                        aria-label={
                          isVietnamese
                            ? `Khôi phục ${user.fullName || user.email}`
                            : `Restore ${user.fullName || user.email}`
                        }
                        title={
                          isVietnamese ? "Khôi phục tài khoản" : "Restore Account"
                        }
                        className="inline-flex size-7 cursor-pointer items-center justify-center rounded-xl border border-primary/40 bg-surface text-primary shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] transition-all duration-150 hover:bg-primary hover:text-primary-foreground active:shadow-[inset_2px_2px_4px_var(--shadow-dark)]"
                      >
                        <RotateCcw className="size-3.5" />
                      </button>
                    )
                  ) : (
                    <>
                      {canUpdate && (
                        <button
                          type="button"
                          disabled={isSelf && user.isActive}
                          onClick={() => onToggleActive(user)}
                          aria-label={
                            user.isActive
                              ? isVietnamese
                                ? `Vô hiệu hóa ${user.fullName || user.email}`
                                : `Deactivate ${user.fullName || user.email}`
                              : isVietnamese
                                ? `Kích hoạt ${user.fullName || user.email}`
                                : `Activate ${user.fullName || user.email}`
                          }
                          title={
                            isSelf && user.isActive
                              ? t("users.actions.selfDisabled")
                              : user.isActive
                                ? isVietnamese
                                  ? "Vô hiệu hóa"
                                  : "Deactivate"
                                : isVietnamese
                                  ? "Kích hoạt"
                                  : "Activate"
                          }
                          className="inline-flex size-7 cursor-pointer items-center justify-center rounded-xl border border-border/40 bg-surface text-muted-foreground shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] transition-all duration-150 hover:border-primary/50 hover:text-primary active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          {user.isActive ? (
                            <Lock className="size-3.5" />
                          ) : (
                            <Unlock className="size-3.5" />
                          )}
                        </button>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          disabled={isSelf}
                          onClick={() => onDelete(user)}
                          aria-label={
                            isVietnamese
                              ? `Xóa ${user.fullName || user.email}`
                              : `Delete ${user.fullName || user.email}`
                          }
                          title={
                            isSelf
                              ? t("users.actions.selfDisabled")
                              : isVietnamese
                                ? "Xóa tài khoản"
                                : "Delete account"
                          }
                          className="inline-flex size-7 cursor-pointer items-center justify-center rounded-xl border border-border/40 bg-surface text-muted-foreground shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] transition-all duration-150 hover:border-danger/50 hover:text-danger active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
