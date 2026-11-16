"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  User,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Building2,
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  ArrowRight,
  Copy,
  Check,
  ExternalLink,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import { toast } from "@/lib/toast";
import { getSiteRoleDetails, type UserIncidentStats } from "../user-detail-utils";
import type { UserResponseDto, SiteItem, IncidentItem } from "@/types";
import type { UserDetailTabKey } from "../user-detail-tabs";

export interface UserOverviewTabProps {
  user: UserResponseDto;
  sites: SiteItem[];
  userSites: SiteItem[];
  incidents: IncidentItem[];
  stats: UserIncidentStats;
  onSelectTab: (tab: UserDetailTabKey) => void;
  onEditClick?: () => void;
  onAssignSitesClick?: () => void;
}

export function UserOverviewTab({
  user,
  userSites,
  incidents,
  stats,
  onSelectTab,
  onEditClick,
  onAssignSitesClick,
}: UserOverviewTabProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    toast.success(isVietnamese ? "Đã sao chép User ID" : "Copied User ID");
    setTimeout(() => setCopiedId(false), 2000);
  };

  const roleName = user.role?.name || "USER";
  const is2FA = Boolean(user.twoFactorEnabled);

  // Recent 5 incidents
  const recentIncidents = useMemo(() => {
    return incidents.slice(0, 5);
  }, [incidents]);

  return (
    <div className="space-y-6">
      {/* Top 2 Columns: Bio details + Performance Summary */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left: Account Identity Card (5 cols) */}
        <div className="flex flex-col justify-between space-y-4 rounded-[26px] bg-background p-5 sm:p-6 shadow-[10px_10px_24px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light)] lg:col-span-5">
          <div className="space-y-4">
            {/* Header không đường kẻ ngang */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-[13px] bg-background text-primary shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]">
                  <div className="flex size-7.5 items-center justify-center rounded-[9px] bg-background shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                    <User size={16} strokeWidth={2.3} />
                  </div>
                </div>
                <h3 className="text-sm font-black tracking-tight text-foreground sm:text-base">
                  {isVietnamese ? "Thông tin tài khoản" : "Account Identity"}
                </h3>
              </div>

              {onEditClick && (
                <button
                  type="button"
                  onClick={onEditClick}
                  className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-background px-3.5 text-xs font-bold text-primary shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]"
                >
                  {isVietnamese ? "Chỉnh sửa" : "Edit"}
                </button>
              )}
            </div>

            {/* Khay lõm chứa thông tin định danh */}
            <div className="space-y-3 rounded-[20px] bg-background p-3.5 text-xs shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_var(--shadow-light)]">
              {/* UUID Bar khắc chìm sâu */}
              <div className="flex items-center justify-between gap-2 rounded-[13px] bg-background px-3 py-2 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
                <span className="font-mono text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  ID
                </span>
                <div className="flex min-w-0 items-center gap-2">
                  <span className="max-w-[180px] truncate font-mono text-[11px] font-semibold text-foreground">
                    {user.id}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="inline-flex size-6.5 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-background text-muted-foreground shadow-[2.5px_2.5px_5px_var(--shadow-dark),-2.5px_-2.5px_5px_var(--shadow-light)] transition-all hover:text-primary active:shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]"
                    title={isVietnamese ? "Sao chép ID" : "Copy ID"}
                  >
                    {copiedId ? (
                      <Check size={12} className="text-primary" strokeWidth={2.5} />
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center justify-between gap-2 px-1">
                <span className="flex items-center gap-2 font-medium text-muted-foreground">
                  <Mail size={13} className="text-primary" />
                  {isVietnamese ? "Email" : "Email"}
                </span>
                <span className="truncate font-mono font-bold text-foreground">
                  {user.email || "-"}
                </span>
              </div>

              {/* Phone */}
              <div className="flex items-center justify-between gap-2 px-1">
                <span className="flex items-center gap-2 font-medium text-muted-foreground">
                  <Phone size={13} className="text-primary" />
                  {isVietnamese ? "Số điện thoại" : "Phone"}
                </span>
                <span className="font-mono font-bold text-foreground">
                  {user.phoneNumber || (isVietnamese ? "Chưa cập nhật" : "Not set")}
                </span>
              </div>

              {/* Role */}
              <div className="flex items-center justify-between gap-2 px-1">
                <span className="flex items-center gap-2 font-medium text-muted-foreground">
                  <Shield size={13} className="text-primary" />
                  {isVietnamese ? "Vai trò RBAC" : "RBAC Role"}
                </span>
                <span className="rounded-full bg-background px-2.5 py-0.5 font-mono text-[10px] font-extrabold uppercase text-primary shadow-[2.5px_2.5px_5px_var(--shadow-dark),-2.5px_-2.5px_5px_var(--shadow-light)]">
                  {roleName}
                </span>
              </div>

              {/* 2FA */}
              <div className="flex items-center justify-between gap-2 px-1">
                <span className="flex items-center gap-2 font-medium text-muted-foreground">
                  {is2FA ? (
                    <ShieldCheck size={13} className="text-primary" />
                  ) : (
                    <ShieldAlert size={13} className="text-muted-foreground" />
                  )}
                  {isVietnamese ? "Xác thực 2FA" : "2FA Security"}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full bg-background px-2.5 py-0.5 text-[11px] font-bold shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)] ${is2FA ? "text-primary" : "text-muted-foreground"
                    }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${is2FA
                        ? "bg-primary shadow-[0_0_6px_hsl(var(--primary))]"
                        : "bg-muted-foreground/50"
                      }`}
                  />
                  {is2FA
                    ? isVietnamese
                      ? "Đã kích hoạt"
                      : "Enabled"
                    : isVietnamese
                      ? "Chưa kích hoạt"
                      : "Disabled"}
                </span>
              </div>

              {/* Created At */}
              <div className="flex items-center justify-between gap-2 px-1">
                <span className="flex items-center gap-2 font-medium text-muted-foreground">
                  <Calendar size={13} className="text-primary" />
                  {isVietnamese ? "Ngày tạo tài khoản" : "Created Date"}
                </span>
                <span className="font-mono font-semibold text-muted-foreground">
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString(
                      isVietnamese ? "vi-VN" : "en-US",
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      },
                    )
                    : "-"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Work Performance & SLA Overview (7 cols) */}
        <div className="flex flex-col justify-between rounded-[26px] bg-background p-5 sm:p-6 shadow-[10px_10px_24px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light)] lg:col-span-7">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-[13px] bg-background text-primary shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]">
                  <div className="flex size-7.5 items-center justify-center rounded-[9px] bg-background shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                    <Award size={16} strokeWidth={2.3} />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight text-foreground sm:text-base">
                    {isVietnamese
                      ? "Đánh giá quá trình làm việc"
                      : "Work Performance Overview"}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {isVietnamese
                      ? "Chỉ số hiệu quả tiếp nhận & giải quyết vi phạm PPE"
                      : "PPE violation response & resolution efficiency"}
                  </p>
                </div>
              </div>

              {/* Performance Tier Badge khắc chìm */}
              <span
                className={`rounded-full bg-background px-3 py-1 text-xs font-extrabold shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] ${stats.performanceTier === "EXCELLENT"
                    ? "text-primary"
                    : stats.performanceTier === "GOOD"
                      ? "text-accent-foreground"
                      : stats.performanceTier === "UNRATED"
                        ? "text-muted-foreground"
                        : "text-warning"
                  }`}
              >
                {stats.performanceTier === "EXCELLENT"
                  ? isVietnamese
                    ? "★ Xuất sắc"
                    : "★ Excellent"
                  : stats.performanceTier === "GOOD"
                    ? isVietnamese
                      ? "Tốt"
                      : "Good"
                  : stats.performanceTier === "UNRATED"
                    ? isVietnamese
                      ? "Chưa đánh giá"
                      : "Unrated"
                    : stats.performanceTier === "AVERAGE"
                      ? isVietnamese
                        ? "Trung bình"
                        : "Average"
                      : isVietnamese
                        ? "Cần cải thiện"
                        : "Needs Improvement"}
              </span>
            </div>

            {/* 3 Metric Pods nổi khối độc lập */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-[18px] bg-background p-3.5 text-center shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {isVietnamese ? "Tỷ lệ xử lý" : "Completion"}
                </p>
                <p className="mt-1 font-mono text-lg font-black text-foreground sm:text-xl">
                  {stats.totalIncidents === 0 ? "0%" : `${stats.resolutionRate}%`}
                </p>
                <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                  {stats.resolvedIncidents}/{stats.totalIncidents}{" "}
                  {isVietnamese ? "vụ" : "cases"}
                </p>
              </div>

              <div className="rounded-[18px] bg-background p-3.5 text-center shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {isVietnamese ? "Thời gian TB" : "Avg MTTR"}
                </p>
                <p className="mt-1 font-mono text-lg font-black text-foreground sm:text-xl">
                  {stats.mttrHours <= 0
                    ? "—"
                    : stats.mttrHours < 1
                      ? `${Math.round(stats.mttrHours * 60)}p`
                      : `${stats.mttrHours}h`}
                </p>
                <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                  {stats.mttrHours <= 0
                    ? isVietnamese
                      ? "chưa có dữ liệu"
                      : "no data"
                    : isVietnamese
                      ? "trên mỗi sự cố"
                      : "per incident"}
                </p>
              </div>

              <div className="rounded-[18px] bg-background p-3.5 text-center shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {isVietnamese ? "Đúng hạn SLA" : "SLA Rate"}
                </p>
                <p className="mt-1 font-mono text-lg font-black text-primary sm:text-xl">
                  {!stats.hasSlaData ? "—" : `${stats.slaComplianceRate}%`}
                </p>
                <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                  {!stats.hasSlaData
                    ? isVietnamese
                      ? "chưa có dữ liệu"
                      : "no SLA data"
                    : isVietnamese
                      ? "đáp ứng tiêu chuẩn"
                      : "standard SLA"}
                </p>
              </div>
            </div>

            {/* Khay tiến độ tổng thể khắc chìm */}
            <div className="space-y-2 rounded-[16px] bg-background p-3.5 shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground">
                  {isVietnamese
                    ? "Tiến độ hoàn thành sự cố liên quan"
                    : "Correlated Incident Progress"}
                </span>
                <span className="font-mono font-black text-primary">
                  {stats.resolutionRate}%
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-background p-[2px] shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                <div
                  className="h-full rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.45)] transition-all duration-500"
                  style={{ width: `${stats.resolutionRate}%` }}
                />
              </div>
            </div>
          </div>

          {/* Footer không đường kẻ, nút bấm nổi vật lý */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2.5 pt-1">
            <span className="text-xs font-medium text-muted-foreground">
              {stats.totalIncidents === 0
                ? isVietnamese
                  ? "Chưa ghi nhận sự cố nào liên quan."
                  : "No correlated incidents recorded."
                : stats.pendingIncidents > 0
                  ? isVietnamese
                    ? `Hiện còn ${stats.pendingIncidents} sự cố đang chờ xử lý!`
                    : `${stats.pendingIncidents} incidents awaiting resolution!`
                  : isVietnamese
                    ? "Tất cả sự cố cần xử lý đã hoàn tất."
                    : "All actionable incidents are resolved."}
            </span>

            <button
              type="button"
              onClick={() => onSelectTab("performance")}
              className="group inline-flex h-8.5 cursor-pointer items-center gap-1.5 rounded-full bg-background px-3.5 text-xs font-bold text-primary shadow-[3.5px_3.5px_8px_var(--shadow-dark),-3.5px_-3.5px_8px_var(--shadow-light)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_10px_var(--shadow-dark),-5px_-5px_10px_var(--shadow-light)] active:translate-y-0 active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]"
            >
              <span>
                {isVietnamese ? "Xem phân tích chi tiết" : "View Analytics"}
              </span>
              <ArrowRight
                size={13}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom 2 Columns: Assigned Sites preview + Recent Incidents preview */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Assigned Sites Preview */}
        <div className="flex flex-col justify-between space-y-4 rounded-[26px] bg-background p-5 sm:p-6 shadow-[10px_10px_24px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light)]">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-[13px] bg-background text-primary shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]">
                  <div className="flex size-7.5 items-center justify-center rounded-[9px] bg-background shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                    <Building2 size={16} strokeWidth={2.3} />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight text-foreground sm:text-base">
                    {isVietnamese
                      ? "Công trường phụ trách"
                      : "Assigned Construction Sites"}
                  </h3>
                  <p className="mt-0.5 font-mono text-[11px] font-semibold text-muted-foreground">
                    {userSites.length} {isVietnamese ? "công trường" : "sites"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectTab("sites")}
                className="group inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-background px-3.5 text-xs font-bold text-primary shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]"
              >
                <span>{isVietnamese ? "Xem tất cả" : "View all"}</span>
                <ArrowRight
                  size={12}
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </button>
            </div>

            {/* Khay lõm chứa danh sách công trường */}
            <div className="rounded-[20px] bg-background p-3 shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_var(--shadow-light)]">
              {userSites.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2.5 py-6 text-center text-xs text-muted-foreground">
                  <p>
                    {isVietnamese
                      ? "Chưa được phân công công trường nào."
                      : "No assigned sites yet."}
                  </p>
                  {onAssignSitesClick && (
                    <button
                      type="button"
                      onClick={onAssignSitesClick}
                      className="inline-flex h-8 cursor-pointer items-center rounded-full bg-background px-3.5 text-xs font-bold text-primary shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)] active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]"
                    >
                      {isVietnamese ? "Phân công ngay" : "Assign Sites Now"}
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {userSites.slice(0, 3).map((site) => {
                    const { roleTitle } = getSiteRoleDetails(site, user, isVietnamese);
                    return (
                      <div
                        key={site.id}
                        className="group flex items-center justify-between gap-3 rounded-[15px] bg-background p-3 shadow-[3.5px_3.5px_8px_var(--shadow-dark),-3.5px_-3.5px_8px_var(--shadow-light)] transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[5px_5px_10px_var(--shadow-dark),-5px_-5px_10px_var(--shadow-light)]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-xs font-extrabold text-foreground">
                              {site.name}
                            </span>
                            <span className="rounded-md bg-background px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-muted-foreground shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]">
                              {site.code}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-[11px] font-semibold text-primary">
                            {roleTitle}
                          </p>
                        </div>

                        <Link
                          href={`/sites/${site.id}`}
                          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)] transition-all hover:text-primary active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]"
                          title={
                            isVietnamese
                              ? "Đến trang công trường"
                              : "Go to site page"
                          }
                        >
                          <ExternalLink size={13} />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Incidents Preview */}
        <div className="flex flex-col justify-between space-y-4 rounded-[26px] bg-background p-5 sm:p-6 shadow-[10px_10px_24px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light)]">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-[13px] bg-background text-warning shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]">
                  <div className="flex size-7.5 items-center justify-center rounded-[9px] bg-background shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                    <AlertTriangle size={16} strokeWidth={2.3} />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight text-foreground sm:text-base">
                    {isVietnamese ? "Sự cố PPE gần đây" : "Recent PPE Incidents"}
                  </h3>
                  <p className="mt-0.5 font-mono text-[11px] font-semibold text-muted-foreground">
                    {incidents.length}{" "}
                    {isVietnamese ? "vụ việc liên quan" : "correlated cases"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectTab("incidents")}
                className="group inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-background px-3.5 text-xs font-bold text-primary shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]"
              >
                <span>{isVietnamese ? "Xem tất cả" : "View all"}</span>
                <ArrowRight
                  size={12}
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </button>
            </div>

            {/* Khay lõm chứa danh sách sự cố gần đây */}
            <div className="rounded-[20px] bg-background p-3 shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_var(--shadow-light)]">
              {recentIncidents.length === 0 ? (
                <div className="py-7 text-center text-xs font-medium text-muted-foreground">
                  {isVietnamese
                    ? "Chưa ghi nhận sự cố nào liên quan đến nhân sự này."
                    : "No correlated incidents recorded."}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {recentIncidents.map((inc) => {
                    const isResolved =
                      inc.status === "RESOLVED" || inc.status === "CLOSED";
                    const isDismissed = inc.status === "DISMISSED";
                    return (
                      <div
                        key={inc.id}
                        className="group flex items-center justify-between gap-3 rounded-[15px] bg-background p-3 shadow-[3.5px_3.5px_8px_var(--shadow-dark),-3.5px_-3.5px_8px_var(--shadow-light)] transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[5px_5px_10px_var(--shadow-dark),-5px_-5px_10px_var(--shadow-light)]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-xs font-extrabold text-foreground">
                              {inc.violationType}
                            </span>
                            <span
                              className={`rounded-md bg-background px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)] ${inc.severity === "CRITICAL"
                                  ? "text-danger"
                                  : inc.severity === "HIGH"
                                    ? "text-warning"
                                    : "text-muted-foreground"
                                }`}
                            >
                              {inc.severity}
                            </span>
                          </div>
                          <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                            {inc.siteName ||
                              (isVietnamese
                                ? "Công trường liên kết"
                                : "Linked Site")}{" "}
                            •{" "}
                            {new Date(inc.detectedAt).toLocaleDateString(
                              isVietnamese ? "vi-VN" : "en-US",
                            )}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-0.5 text-[11px] font-bold shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)] ${
                              isResolved
                                ? "text-primary"
                                : isDismissed
                                  ? "text-muted-foreground"
                                  : "text-warning"
                            }`}
                          >
                            {isResolved ? (
                              <>
                                <CheckCircle2 size={12} />
                                <span>
                                  {isVietnamese ? "Đã giải quyết" : "Resolved"}
                                </span>
                              </>
                            ) : isDismissed ? (
                              <>
                                <Ban size={12} />
                                <span>
                                  {isVietnamese ? "Đã bác bỏ" : "Dismissed"}
                                </span>
                              </>
                            ) : (
                              <>
                                <Clock size={12} />
                                <span>
                                  {isVietnamese ? "Đang xử lý" : "In Progress"}
                                </span>
                              </>
                            )}
                          </span>

                          <Link
                            href={`/incidents/${inc.id}`}
                            className="inline-flex size-8 items-center justify-center rounded-full bg-background text-muted-foreground shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)] transition-all hover:text-primary active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]"
                            title={isVietnamese ? "Xem sự cố" : "View incident"}
                          >
                            <ExternalLink size={13} />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
