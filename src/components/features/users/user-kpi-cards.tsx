"use client";

import { useMemo } from "react";
import { Users, UserCheck, ShieldCheck, UserX } from "lucide-react";
import {
  StatsCard,
  BentoConsoleStats,
  type StatsCardVariant,
} from "@ui/stats-cards";
import { useLocale } from "@/providers/locale-provider";
import type { UserResponseDto } from "@/types";

export interface UserKpiStatsData {
  total: number;
  active: number;
  twoFactor: number;
  locked: number;
}

export type UserKpiStats = UserKpiStatsData;

export interface UserKpiCardsProps {
  /** Danh sách người dùng để tự động tính toán số liệu (nếu không truyền stats cụ thể) */
  users?: UserResponseDto[];
  /** Tổng số lượng người dùng từ backend pagination meta */
  totalCount?: number;
  /** Hoặc truyền trực tiếp đối tượng stats đã tính toán */
  stats?: UserKpiStatsData;
  /** Biến thể thiết kế: classic | soft-extruded | deep-elevation | bento-console (mặc định: bento-console) */
  variant?: StatsCardVariant;
  /** Trạng thái đang tải dữ liệu */
  loading?: boolean;
  className?: string;
}

export function UserKpiCards({
  users = [],
  totalCount,
  stats: externalStats,
  variant = "bento-console",
  loading = false,
  className = "",
}: UserKpiCardsProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const computedStats = useMemo<UserKpiStatsData>(() => {
    if (externalStats) return externalStats;

    const now = new Date();
    let active = 0;
    let twoFactor = 0;
    let locked = 0;

    for (const u of users) {
      if (u.twoFactorEnabled) {
        twoFactor++;
      }

      const isLockedOut = u.lockedUntil ? new Date(u.lockedUntil) > now : false;
      const isDeactivated = !u.isActive || !!u.deletedAt;

      if (isLockedOut || isDeactivated) {
        locked++;
      } else {
        active++;
      }
    }

    return {
      total: totalCount ?? users.length,
      active,
      twoFactor,
      locked,
    };
  }, [users, totalCount, externalStats]);

  const twoFactorRate = useMemo(() => {
    if (!computedStats.total || computedStats.total <= 0) return 0;
    return Math.min(100, Math.round((computedStats.twoFactor / computedStats.total) * 100));
  }, [computedStats.total, computedStats.twoFactor]);

  const activeRate = useMemo(() => {
    if (!computedStats.total || computedStats.total <= 0) return 0;
    return Math.min(100, Math.round((computedStats.active / computedStats.total) * 100));
  }, [computedStats.total, computedStats.active]);

  // Nếu chọn Dòng 4: Bố cục Bento Console Bất Đối Xứng (Kiến trúc đặc biệt — Không đại trà)
  if (variant === "bento-console") {
    return (
      <section
        aria-label={isVietnamese ? "Thống kê người dùng Bento Console" : "User directory Bento Console statistics"}
        className={className}
      >
        <BentoConsoleStats
          scale={{
            title: isVietnamese ? "Quy mô nhân sự & Trạng thái hoạt động" : "Directory scale & Active status",
            badgeText: "Directory Pulse",
            totalValue: computedStats.total,
            totalLabel: t("users.stats.total"),
            totalSub: isVietnamese ? "Tài khoản toàn công ty" : "Total enterprise accounts",
            activeValue: computedStats.active,
            activeLabel: t("users.stats.active"),
            activeSub: isVietnamese ? "Sẵn sàng đăng nhập" : "Ready to access",
            activeRate,
            availabilityLabel: isVietnamese ? "Tỷ lệ khả dụng hệ thống" : "System availability rate",
            availabilityText: isVietnamese ? `${activeRate}% sẵn sàng` : `${activeRate}% ready`,
          }}
          security={{
            title: isVietnamese ? "Bảo mật xác thực hai bước" : "Two-factor authentication",
            badgeText: isVietnamese ? "Bảo mật 2FA" : "2FA Security",
            percent: twoFactorRate,
            currentValue: computedStats.twoFactor,
            totalValue: computedStats.total,
            totalStaffLabel: isVietnamese
              ? `/ ${computedStats.total} nhân viên`
              : `/ ${computedStats.total} staff`,
            description: isVietnamese
              ? "Tài khoản kích hoạt mã bảo vệ Google Authenticator."
              : "Accounts protected by Google Authenticator TOTP.",
            statusLabel: isVietnamese ? "Độ phủ an ninh" : "Security coverage",
            statusText:
              twoFactorRate >= 60
                ? isVietnamese
                  ? "Mức độ: Rất tốt"
                  : "Rating: Excellent"
                : isVietnamese
                ? "Mức độ: Cần tăng cường"
                : "Rating: Needs improvement",
          }}
          sentinel={{
            title: isVietnamese ? "An ninh & Truy cập" : "Security & Access",
            count: computedStats.locked,
            label:
              computedStats.locked > 0
                ? isVietnamese
                  ? "Tài khoản bị khóa"
                  : "Locked accounts"
                : isVietnamese
                ? "Tạm khóa / Ngưng"
                : "Locked / Inactive",
            description:
              computedStats.locked > 0
                ? isVietnamese
                  ? "Nhập sai mật khẩu hoặc bị vô hiệu hóa"
                  : "Failed logins or deactivated"
                : isVietnamese
                ? "Không có xung đột truy cập trái phép"
                : "No active access breaches",
            statusText:
              computedStats.locked > 0
                ? isVietnamese
                  ? "Cần quản trị xử lý"
                  : "Action required"
                : isVietnamese
                ? "Hệ thống an toàn"
                : "All clear",
            isWarning: computedStats.locked > 0,
          }}
          loading={loading}
        />
      </section>
    );
  }

  // Dòng 1 (classic), Dòng 2 (soft-extruded), Dòng 3 (deep-elevation)
  return (
    <section
      aria-label={isVietnamese ? "Thống kê người dùng" : "User directory statistics"}
      className={`grid grid-cols-2 gap-2.5 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4 ${className}`}
    >
      {/* 1. Tổng người dùng */}
      <StatsCard
        variant={variant}
        title={t("users.stats.total")}
        value={computedStats.total}
        icon={Users}
        tone="primary"
        description={
          isVietnamese
            ? "Tài khoản nhân sự trong hệ thống"
            : "Total accounts in directory"
        }
        loading={loading}
        hover
        depth="medium"
        border="subtle"
      />

      {/* 2. Đang hoạt động */}
      <StatsCard
        variant={variant}
        title={t("users.stats.active")}
        value={computedStats.active}
        icon={UserCheck}
        tone="primary"
        description={
          isVietnamese
            ? "Sẵn sàng hoạt động & đăng nhập"
            : "Active & verified accounts"
        }
        loading={loading}
        hover
        depth="medium"
        border="subtle"
      />

      {/* 3. Đã kích hoạt bảo mật 2FA */}
      <StatsCard
        variant={variant}
        title={t("users.stats.twoFactor")}
        value={computedStats.twoFactor}
        icon={ShieldCheck}
        accentColor="var(--accent)"
        progress={twoFactorRate}
        progressLabel={`${twoFactorRate}%`}
        description={
          isVietnamese
            ? `${twoFactorRate}% tài khoản đã bật TOTP`
            : `${twoFactorRate}% protected with 2FA`
        }
        loading={loading}
        hover
        depth="medium"
        border="subtle"
      />

      {/* 4. Tài khoản bị khóa / vô hiệu hóa */}
      <StatsCard
        variant={variant}
        title={t("users.stats.locked")}
        value={computedStats.locked}
        icon={UserX}
        accentColor={computedStats.locked > 0 ? "var(--accent)" : undefined}
        description={
          computedStats.locked > 0
            ? isVietnamese
              ? "Cần quản trị viên kiểm tra"
              : "Requires admin attention"
            : isVietnamese
              ? "Tất cả tài khoản bình thường"
              : "All accounts in good standing"
        }
        loading={loading}
        hover
        depth="medium"
        border="subtle"
      />
    </section>
  );
}

/** Alias cho phép gọi <UserKpiStats /> */
export const UserKpiStats = UserKpiCards;
