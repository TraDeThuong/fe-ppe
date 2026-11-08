"use client";

import { useMemo, useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import { toast } from "@/lib/toast";
import type { UserResponseDto, SiteItem, IncidentItem } from "@/types";
import type { UserDetailTabKey } from "../user-detail-tabs";

export interface UserOverviewTabProps {
  user: UserResponseDto;
  sites: SiteItem[];
  userSites: SiteItem[];
  incidents: IncidentItem[];
  stats: {
    totalIncidents: number;
    resolvedIncidents: number;
    pendingIncidents: number;
    resolutionRate: number;
    mttrHours: number;
    slaComplianceRate: number;
    performanceTier: "EXCELLENT" | "GOOD" | "AVERAGE" | "NEEDS_IMPROVEMENT" | "UNRATED";
  };
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
  const isLocked = Boolean(user.lockedUntil && new Date(user.lockedUntil) > new Date());
  const isDeleted = Boolean(user.deletedAt);
  const isActive = user.isActive && !isDeleted && !isLocked;

  // Resolve on-site role title helper
  const getSiteRoleTitle = (site: SiteItem): string => {
    if (site.contactOfficers) {
      const officers = Array.isArray(site.contactOfficers)
        ? site.contactOfficers
        : typeof site.contactOfficers === "string"
          ? JSON.parse(site.contactOfficers || "[]")
          : [];

      const matched = officers.find(
        (o: any) =>
          (user.fullName && o.name && o.name.toLowerCase().includes(user.fullName.toLowerCase())) ||
          (user.phoneNumber && Array.isArray(o.phones) && o.phones.includes(user.phoneNumber)),
      );
      if (matched?.roleTitle) return matched.roleTitle;
    }

    if (roleName === "ADMIN" || roleName === "SUPER_ADMIN") {
      return isVietnamese ? "Quản trị viên toàn quyền" : "Full System Administrator";
    }
    if (roleName === "SAFETY_MANAGER") {
      return isVietnamese ? "Chỉ huy trưởng an toàn công trường" : "Site Safety Manager";
    }
    if (roleName === "SAFETY_OFFICER") {
      return isVietnamese ? "Cán bộ giám sát an toàn PPE" : "Safety Officer";
    }
    if (roleName === "SUPERVISOR") {
      return isVietnamese ? "Giám sát viên hiện trường" : "Field Supervisor";
    }
    return isVietnamese ? "Nhân sự an toàn công trường" : "Site Safety Personnel";
  };

  // Recent 5 incidents
  const recentIncidents = useMemo(() => {
    return incidents.slice(0, 5);
  }, [incidents]);

  return (
    <div className="space-y-6">
      {/* Top 2 Columns: Bio details + Performance Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Account Identity Card (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-white/80 dark:border-white/5 bg-background dark:bg-card p-5 shadow-[6px_6px_14px_var(--shadow-dark),-5px_-5px_14px_rgba(255,255,255,0.9)] dark:shadow-[6px_6px_14px_rgba(0,0,0,0.4),-2px_-2px_6px_rgba(255,255,255,0.02)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                <User size={16} />
              </span>
              <h3 className="font-bold text-sm text-foreground">
                {isVietnamese ? "Thông tin tài khoản" : "Account Identity"}
              </h3>
            </div>
            {onEditClick && (
              <Button variant="ghost" size="sm" onClick={onEditClick} className="text-xs h-7 px-2">
                {isVietnamese ? "Chỉnh sửa" : "Edit"}
              </Button>
            )}
          </div>

          <div className="space-y-3 text-xs">
            {/* UUID */}
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-background border border-border/40 shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
              <span className="text-muted-foreground font-mono text-[11px]">ID</span>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-mono text-[11px] text-foreground truncate max-w-[190px]">
                  {user.id}
                </span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="size-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  title={isVietnamese ? "Sao chép ID" : "Copy ID"}
                >
                  {copiedId ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
                </button>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Mail size={13} className="text-primary" />
                {isVietnamese ? "Email" : "Email"}
              </span>
              <span className="font-semibold text-foreground font-mono">{user.email || "-"}</span>
            </div>

            {/* Phone */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Phone size={13} className="text-primary" />
                {isVietnamese ? "Số điện thoại" : "Phone"}
              </span>
              <span className="font-semibold text-foreground font-mono">
                {user.phoneNumber || (isVietnamese ? "Chưa cập nhật" : "Not set")}
              </span>
            </div>

            {/* Role */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Shield size={13} className="text-primary" />
                {isVietnamese ? "Vai trò RBAC" : "RBAC Role"}
              </span>
              <span className="px-2 py-0.5 rounded-lg border border-primary/30 bg-primary/10 text-primary font-mono font-bold text-[10px] uppercase">
                {roleName}
              </span>
            </div>

            {/* 2FA */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground flex items-center gap-1.5">
                {is2FA ? (
                  <ShieldCheck size={13} className="text-primary" />
                ) : (
                  <ShieldAlert size={13} className="text-muted-foreground" />
                )}
                {isVietnamese ? "Xác thực 2FA" : "2FA Security"}
              </span>
              <span
                className={`font-semibold text-[11px] ${
                  is2FA ? "text-primary" : "text-muted-foreground"
                }`}
              >
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
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Calendar size={13} className="text-primary" />
                {isVietnamese ? "Ngày tạo tài khoản" : "Created Date"}
              </span>
              <span className="font-mono text-muted-foreground">
                {user.createdAt
                  ? new Date(user.createdAt).toLocaleDateString(isVietnamese ? "vi-VN" : "en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "-"}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Work Performance & SLA Overview (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-white/80 dark:border-white/5 bg-background dark:bg-card p-5 shadow-[6px_6px_14px_var(--shadow-dark),-5px_-5px_14px_rgba(255,255,255,0.9)] dark:shadow-[6px_6px_14px_rgba(0,0,0,0.4),-2px_-2px_6px_rgba(255,255,255,0.02)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border/40 mb-4">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-accent/10 text-accent border border-accent/20">
                  <Award size={16} />
                </span>
                <div>
                  <h3 className="font-bold text-sm text-foreground">
                    {isVietnamese ? "Đánh giá quá trình làm việc" : "Work Performance Overview"}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {isVietnamese
                      ? "Chỉ số hiệu quả tiếp nhận & giải quyết vi phạm PPE"
                      : "PPE violation response & resolution efficiency"}
                  </p>
                </div>
              </div>

              <span
                className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${
                  stats.performanceTier === "EXCELLENT"
                    ? "border-primary/40 bg-primary/10 text-primary shadow-[0_0_8px_var(--primary)]"
                    : stats.performanceTier === "GOOD"
                      ? "border-accent/40 bg-accent/10 text-accent"
                      : stats.performanceTier === "UNRATED"
                        ? "border-border/60 bg-muted/40 text-muted-foreground"
                        : "border-warning/40 bg-warning/10 text-warning"
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
                      : isVietnamese
                        ? "Cần cải thiện"
                        : "Needs Improvement"}
              </span>
            </div>

            {/* 3 Metric Pills */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-xl border border-border/40 bg-background/50 shadow-[inset_1px_1px_3px_var(--shadow-dark)] text-center">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">
                  {isVietnamese ? "Tỷ lệ xử lý" : "Completion"}
                </p>
                <p className="text-lg font-bold text-foreground mt-0.5 font-mono">
                  {stats.totalIncidents === 0 ? "0%" : `${stats.resolutionRate}%`}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {stats.resolvedIncidents}/{stats.totalIncidents} {isVietnamese ? "vụ" : "cases"}
                </p>
              </div>

              <div className="p-3 rounded-xl border border-border/40 bg-background/50 shadow-[inset_1px_1px_3px_var(--shadow-dark)] text-center">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">
                  {isVietnamese ? "Thời gian TB" : "Avg MTTR"}
                </p>
                <p className="text-lg font-bold text-foreground mt-0.5 font-mono">
                  {stats.mttrHours <= 0
                    ? "—"
                    : stats.mttrHours < 1
                      ? `${Math.round(stats.mttrHours * 60)}p`
                      : `${stats.mttrHours}h`}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {stats.mttrHours <= 0
                    ? isVietnamese
                      ? "chưa có dữ liệu"
                      : "no data"
                    : isVietnamese
                      ? "trên mỗi sự cố"
                      : "per incident"}
                </p>
              </div>

              <div className="p-3 rounded-xl border border-border/40 bg-background/50 shadow-[inset_1px_1px_3px_var(--shadow-dark)] text-center">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">
                  {isVietnamese ? "Đúng hạn SLA" : "SLA Rate"}
                </p>
                <p className="text-lg font-bold text-foreground mt-0.5 font-mono text-primary">
                  {stats.slaComplianceRate <= 0 ? "—" : `${stats.slaComplianceRate}%`}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {stats.slaComplianceRate <= 0
                    ? isVietnamese
                      ? "chưa phát sinh"
                      : "no cases"
                    : isVietnamese
                      ? "đáp ứng tiêu chuẩn"
                      : "standard SLA"}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">
                  {isVietnamese ? "Tiến độ hoàn thành toàn bộ sự cố được giao" : "Total Assignment Progress"}
                </span>
                <span className="font-bold text-foreground font-mono">{stats.resolutionRate}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 rounded-full"
                  style={{ width: `${stats.resolutionRate}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-border/30 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {stats.pendingIncidents > 0
                ? isVietnamese
                  ? `Hiện còn ${stats.pendingIncidents} sự cố đang chờ xử lý!`
                  : `${stats.pendingIncidents} incidents awaiting resolution!`
                : isVietnamese
                  ? "Tất cả sự cố được giao đã hoàn tất."
                  : "All assigned incidents are resolved."}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectTab("performance")}
              className="gap-1.5 text-xs h-8"
            >
              <span>{isVietnamese ? "Xem phân tích chi tiết" : "View Analytics"}</span>
              <ArrowRight size={13} />
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom 2 Columns: Assigned Sites preview + Recent Incidents preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Assigned Sites Preview */}
        <div className="rounded-2xl border border-white/80 dark:border-white/5 bg-background dark:bg-card p-5 shadow-[6px_6px_14px_var(--shadow-dark),-5px_-5px_14px_rgba(255,255,255,0.9)] dark:shadow-[6px_6px_14px_rgba(0,0,0,0.4),-2px_-2px_6px_rgba(255,255,255,0.02)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Building2 size={16} />
              </span>
              <div>
                <h3 className="font-bold text-sm text-foreground">
                  {isVietnamese ? "Công trường phụ trách" : "Assigned Construction Sites"}
                </h3>
                <p className="text-[11px] text-muted-foreground font-mono">
                  {userSites.length} {isVietnamese ? "công trường" : "sites"}
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectTab("sites")}
              className="text-xs h-7 px-2 gap-1 text-primary hover:text-primary"
            >
              <span>{isVietnamese ? "Xem tất cả" : "View all"}</span>
              <ArrowRight size={12} />
            </Button>
          </div>

          {userSites.length === 0 ? (
            <div className="p-6 text-center rounded-xl border border-dashed border-border/60 text-muted-foreground text-xs space-y-2">
              <p>{isVietnamese ? "Chưa được phân công công trường nào." : "No assigned sites yet."}</p>
              {onAssignSitesClick && (
                <Button variant="outline" size="sm" onClick={onAssignSitesClick} className="text-xs h-7">
                  {isVietnamese ? "Phân công ngay" : "Assign Sites Now"}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {userSites.slice(0, 3).map((site) => {
                const siteRole = getSiteRoleTitle(site);
                return (
                  <div
                    key={site.id}
                    className="p-3 rounded-xl border border-border/50 bg-background shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground truncate">
                          {site.name}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border border-border/60 bg-muted/30 text-muted-foreground uppercase">
                          {site.code}
                        </span>
                      </div>
                      <p className="text-[11px] text-primary font-medium mt-0.5 truncate">
                        {siteRole}
                      </p>
                    </div>

                    <a
                      href={`/sites/${site.id}`}
                      className="size-7 inline-flex items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground hover:text-primary hover:border-primary/40 shadow-[1.5px_1.5px_3px_var(--shadow-dark),-1.5px_-1.5px_3px_var(--shadow-light)] transition-all shrink-0"
                      title={isVietnamese ? "Đến trang công trường" : "Go to site page"}
                    >
                      <ExternalLink size={13} />
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Incidents Preview */}
        <div className="rounded-2xl border border-white/80 dark:border-white/5 bg-background dark:bg-card p-5 shadow-[6px_6px_14px_var(--shadow-dark),-5px_-5px_14px_rgba(255,255,255,0.9)] dark:shadow-[6px_6px_14px_rgba(0,0,0,0.4),-2px_-2px_6px_rgba(255,255,255,0.02)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-warning/10 text-warning border border-warning/20">
                <AlertTriangle size={16} />
              </span>
              <div>
                <h3 className="font-bold text-sm text-foreground">
                  {isVietnamese ? "Sự cố PPE gần đây" : "Recent PPE Incidents"}
                </h3>
                <p className="text-[11px] text-muted-foreground font-mono">
                  {incidents.length} {isVietnamese ? "vụ việc liên quan" : "correlated cases"}
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectTab("incidents")}
              className="text-xs h-7 px-2 gap-1 text-primary hover:text-primary"
            >
              <span>{isVietnamese ? "Xem tất cả" : "View all"}</span>
              <ArrowRight size={12} />
            </Button>
          </div>

          {recentIncidents.length === 0 ? (
            <div className="p-6 text-center rounded-xl border border-dashed border-border/60 text-muted-foreground text-xs">
              {isVietnamese
                ? "Chưa ghi nhận sự cố nào liên quan đến nhân sự này."
                : "No correlated incidents recorded."}
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentIncidents.map((inc) => {
                const isResolved = inc.status === "RESOLVED" || inc.status === "CLOSED";
                return (
                  <div
                    key={inc.id}
                    className="p-3 rounded-xl border border-border/50 bg-background shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground truncate">
                          {inc.violationType}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded border font-bold uppercase ${
                            inc.severity === "CRITICAL"
                              ? "border-danger/40 bg-danger/10 text-danger"
                              : inc.severity === "HIGH"
                                ? "border-warning/40 bg-warning/10 text-warning"
                                : "border-border/60 bg-muted/40 text-muted-foreground"
                          }`}
                        >
                          {inc.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate font-mono">
                        {inc.siteName || (isVietnamese ? "Công trường liên kết" : "Linked Site")} •{" "}
                        {new Date(inc.detectedAt).toLocaleDateString(
                          isVietnamese ? "vi-VN" : "en-US",
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                          isResolved ? "text-primary" : "text-warning"
                        }`}
                      >
                        {isResolved ? (
                          <>
                            <CheckCircle2 size={13} />
                            <span>{isVietnamese ? "Đã giải quyết" : "Resolved"}</span>
                          </>
                        ) : (
                          <>
                            <Clock size={13} />
                            <span>{isVietnamese ? "Đang xử lý" : "In Progress"}</span>
                          </>
                        )}
                      </span>
                      <a
                        href={`/incidents/${inc.id}`}
                        className="size-7 inline-flex items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground hover:text-primary hover:border-primary/40 shadow-[1.5px_1.5px_3px_var(--shadow-dark),-1.5px_-1.5px_3px_var(--shadow-light)] transition-all"
                        title={isVietnamese ? "Xem sự cố" : "View incident"}
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
