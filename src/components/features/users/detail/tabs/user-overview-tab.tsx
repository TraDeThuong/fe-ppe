"use client";

import { useState } from "react";
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
  ArrowRight,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { PhoneReveal } from "@/components/ui/phone-reveal";
import { useLocale } from "@/providers/locale-provider";
import { ResourceAuditTrailCard } from "@/components/features/audit-logs";
import { toast } from "@/lib/toast";
import { getSiteRoleDetails } from "../user-detail-utils";
import type { UserResponseDto, SiteItem } from "@/types";
import type { UserDetailTabKey } from "../user-detail-tabs";

export interface UserOverviewTabProps {
  user: UserResponseDto;
  userSites: SiteItem[];
  canReadSites?: boolean;
  canReadIncidents?: boolean;
  onSelectTab: (tab: UserDetailTabKey) => void;
  onEditClick?: () => void;
  onAssignSitesClick?: () => void;
}

export function UserOverviewTab({
  user,
  userSites,
  canReadSites = true,
  canReadIncidents = false,
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
  const assignedSiteCount = canReadSites
    ? userSites.length
    : (user.siteIds?.length ?? 0);

  return (
    <div className="space-y-6">
      {/* Top 2 Columns: Account Identity + Assigned Sites */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left: Account Identity Card (5 cols) */}
        <div className="flex flex-col justify-between space-y-4 rounded-[26px] bg-background p-5 sm:p-6 shadow-[10px_10px_24px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light)] lg:col-span-5">
          <div className="space-y-4">
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

            <div className="space-y-3 rounded-[20px] bg-background p-3.5 text-xs shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_var(--shadow-light)]">
              {/* UUID Bar */}
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
                <PhoneReveal
                  key={user.id}
                  phoneNumber={user.phoneNumber}
                  isVietnamese={isVietnamese}
                  emptyText={
                    <span className="font-mono font-bold text-foreground">
                      {isVietnamese ? "Chưa cập nhật" : "Not set"}
                    </span>
                  }
                  textClassName="font-mono font-bold text-foreground"
                />
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
                  className={`inline-flex items-center gap-1.5 rounded-full bg-background px-2.5 py-0.5 text-[11px] font-bold shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)] ${
                    is2FA ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      is2FA
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

        {/* Right: Assigned Construction Sites Preview (7 cols) */}
        <div className="flex flex-col justify-between space-y-4 rounded-[26px] bg-background p-5 sm:p-6 shadow-[10px_10px_24px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light)] lg:col-span-7">
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
                    {assignedSiteCount} {isVietnamese ? "công trường" : "sites"}
                  </p>
                </div>
              </div>

              {canReadSites && (
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
              )}
            </div>

            <div className="rounded-[20px] bg-background p-3 shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_var(--shadow-light)]">
              {!canReadSites ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  {isVietnamese
                    ? `Tài khoản được gán ${assignedSiteCount} công trường trong phạm vi truy cập.`
                    : `Account has ${assignedSiteCount} assigned site(s) in its access scope.`}
                </div>
              ) : userSites.length === 0 ? (
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
                  {userSites.slice(0, 4).map((site) => {
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
      </div>

      {/* Lightweight PPE Incidents Deep-Link Card (no cross-service full scan) */}
      {canReadIncidents && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[26px] bg-background p-5 sm:p-6 shadow-[10px_10px_24px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light)]">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[13px] bg-background text-warning shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]">
              <div className="flex size-7.5 items-center justify-center rounded-[9px] bg-background shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                <AlertTriangle size={16} strokeWidth={2.3} />
              </div>
            </div>
            <div className="min-w-0 space-y-1">
              <h3 className="text-sm font-black tracking-tight text-foreground sm:text-base">
                {isVietnamese
                  ? "Tra cứu Sự cố PPE tại Công trường phụ trách"
                  : "PPE Incidents at Assigned Sites"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isVietnamese
                  ? "Dữ liệu sự cố và phân công xử lý được quản lý tập trung tại Trung tâm Sự cố (Incident Service)."
                  : "Incident records and dispatches are managed centrally in the Incident Console."}
              </p>
              {canReadSites && userSites.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {userSites.slice(0, 4).map((site) => (
                    <Link
                      key={site.id}
                      href={`/incidents?siteId=${site.id}`}
                      className="inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-0.5 font-mono text-[10px] font-bold text-primary shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] hover:underline"
                    >
                      <span>{site.code}</span>
                      <ExternalLink size={10} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Link
            href={
              canReadSites && userSites.length === 1
                ? `/incidents?siteId=${userSites[0].id}`
                : "/incidents"
            }
            className="group inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-background px-4 text-xs font-bold text-primary shadow-[3.5px_3.5px_8px_var(--shadow-dark),-3.5px_-3.5px_8px_var(--shadow-light)] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]"
          >
            <span>{isVietnamese ? "Mở Trung tâm Sự cố" : "Open Incident Console"}</span>
            <ArrowRight
              size={13}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      )}

      <ResourceAuditTrailCard
        targetType="USER"
        targetId={user.id}
        title={isVietnamese ? "Nhật ký Tác động Tài khoản" : "User Audit Trail"}
      />
    </div>
  );
}
