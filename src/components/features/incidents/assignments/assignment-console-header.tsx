"use client";

import React from "react";
import Link from "next/link";
import {
  Building2,
  ClipboardCheck,
  Radio,
  ShieldAlert,
  UserCheck,
} from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import { ConsoleRefreshButton } from "@/components/ui/refresh-action";
import type { AssignmentIncidentTotals } from "@/hooks/incidents/use-assignment-incidents";
import { useLocale } from "@/providers/locale-provider";
import type {
  AssignmentRoleView,
  CategorizedAssignments,
} from "./types";

export interface AssignmentConsoleHeaderProps {
  roleView: AssignmentRoleView;
  isAdminRole: boolean;
  adminInterventionMode: boolean;
  onToggleAdminIntervention: () => void;
  isConnected: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  totalIncidentsCount: number;
  selectedSiteName?: string;
  categorized: CategorizedAssignments;
  statusTotals?: Partial<AssignmentIncidentTotals>;
  /** Không có quyền PPE_INCIDENT_REVIEW lẫn PPE_INCIDENT_MANAGE: hiện nhãn "Chế độ chỉ xem". */
  readOnly?: boolean;
}

export function AssignmentConsoleHeader({
  roleView,
  isAdminRole,
  adminInterventionMode,
  onToggleAdminIntervention,
  isConnected,
  isRefreshing,
  onRefresh,
  totalIncidentsCount,
  selectedSiteName,
  categorized,
  statusTotals,
  readOnly = false,
}: AssignmentConsoleHeaderProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const showAdminOversight = isAdminRole && !adminInterventionMode;
  const showOfficerView = roleView === "SAFETY_OFFICER";

  const title = showAdminOversight
    ? isVietnamese
      ? "Trung Tâm Giám Sát & Trách Nhiệm Sự Cố"
      : "Incident Accountability Oversight Center"
    : showOfficerView
      ? isVietnamese
        ? "Bàn Công Việc Hiện Trường Của Tôi"
        : "My Field Assignments Console"
      : isVietnamese
        ? "Trung Tâm Điều Phối & Nghiệm Thu Sự Cố"
        : "Incident Dispatch & Acceptance Console";

  const roleBadge = isAdminRole
    ? adminInterventionMode
      ? isVietnamese
        ? "ADMIN • Chế độ Điều phối"
        : "ADMIN • Dispatch Mode"
      : isVietnamese
        ? "Góc nhìn ADMIN"
        : "ADMIN Oversight"
    : showOfficerView
      ? isVietnamese
        ? "Cán bộ Hiện trường"
        : "Field Officer"
      : isVietnamese
        ? "Quản lý An toàn"
        : "Safety Manager";

  const pendingReviewCount = Math.max(
    statusTotals?.pendingReview ?? 0,
    categorized.pendingReview.length,
  );
  const triageCount =
    pendingReviewCount +
    Math.max(statusTotals?.confirmedUnassigned ?? 0, categorized.unassignedConfirmed.length);
  const awaitingAcceptanceCount = Math.max(
    statusTotals?.resolved ?? 0,
    categorized.awaitingAcceptance.length,
  );
  const effectiveTotalIncidentsCount = Math.max(
    statusTotals?.total ?? 0,
    totalIncidentsCount,
  );

  const urgentCount = showOfficerView
    ? categorized.myActiveConfirmed.length
    : triageCount + awaitingAcceptanceCount;

  const urgentLabel = showOfficerView
    ? isVietnamese
      ? `${urgentCount} việc cần khắc phục`
      : `${urgentCount} pending tasks`
    : isVietnamese
      ? `${urgentCount} hồ sơ cần xử lý`
      : `${urgentCount} actionable`;

  return (
    <section
      aria-label={
        isVietnamese
          ? "Tiêu đề trung tâm điều phối sự cố"
          : "Incident Dispatch Console Header"
      }
      className={`relative overflow-hidden rounded-[24px] p-4 sm:rounded-[30px] sm:p-6 lg:p-7 transition-all duration-300 ${NM.chassis}`}
    >
      {/* Top specular accent rim (giống CameraFleetHeader) */}
      <div className="pointer-events-none absolute inset-x-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="relative">
        {/* Layer 1: Identity & Right Action Modules */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div
              className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${NM.extruded}`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-md">
                <ClipboardCheck className="size-5" />
              </div>
              <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-background shadow-sm">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isConnected
                      ? "bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
                      : "bg-accent/60"
                  }`}
                />
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                  {title}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                  {roleBadge}
                </span>
                {readOnly && (
                  <span
                    data-testid="assignment-readonly-badge"
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    {isVietnamese ? "Chế độ chỉ xem" : "View only"}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>
                  {isVietnamese ? "Phạm vi điều phối" : "Dispatch Scope"}
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 font-mono text-xs font-semibold ${
                    isConnected ? "text-primary" : "text-accent"
                  } ${NM.recessed}`}
                >
                  <Radio className="size-3 text-accent" />
                  {isConnected ? "Realtime" : "Polling (30s)"}
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 font-mono text-xs font-semibold ${
                    urgentCount > 0 ? "text-accent" : "text-muted-foreground"
                  } ${NM.recessed}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      urgentCount > 0
                        ? "animate-pulse bg-accent"
                        : "bg-muted-foreground/40"
                    }`}
                  />
                  {urgentLabel}
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 font-mono text-xs font-semibold text-foreground ${NM.recessed}`}
                >
                  <Building2 className="size-3 text-primary" />
                  {selectedSiteName ||
                    (isVietnamese ? "Tất cả công trường" : "All Sites")}{" "}
                  ({effectiveTotalIncidentsCount})
                </span>
              </div>
            </div>
          </div>

          {/* Right cluster: Admin Mode Toggle + Back to /incidents + Refresh (chuẩn CameraFleetHeader) */}
          <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
            {isAdminRole && (
              <button
                type="button"
                onClick={onToggleAdminIntervention}
                className={`inline-flex h-11 sm:h-14 shrink-0 items-center gap-2 rounded-2xl px-4 text-xs font-bold uppercase tracking-wider transition-all ${
                  adminInterventionMode
                    ? "bg-primary text-primary-foreground shadow-[6px_6px_14px_rgba(0,0,0,0.16),-4px_-4px_10px_rgba(255,255,255,0.7)]"
                    : `text-primary ${NM.tactileBtn}`
                }`}
              >
                <UserCheck className="size-4" />
                <span>
                  {adminInterventionMode
                    ? isVietnamese
                      ? "Giám sát Nhóm"
                      : "Group View"
                    : isVietnamese
                      ? "Điều phối 3 Bước"
                      : "3-Step Dispatch"}
                </span>
              </button>
            )}

            <Link
              href="/incidents"
              className={`group inline-flex shrink-0 items-center gap-2.5 rounded-2xl px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs font-bold uppercase tracking-wider text-foreground ${NM.tactileBtn}`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${NM.recessed}`}
              >
                <ShieldAlert className="size-4 text-primary transition-transform duration-300 group-hover:scale-110" />
              </span>
              <span className="text-left leading-tight">
                <span className="block">
                  {isVietnamese ? "Danh sách Sự cố" : "Incident List"}
                </span>
                <span className="mt-0.5 block text-[10px] font-medium normal-case tracking-normal text-muted-foreground">
                  {isVietnamese ? "Quay lại trang Sự cố" : "Back to Incidents"}
                </span>
              </span>
            </Link>

            <ConsoleRefreshButton
              onRefresh={onRefresh}
              isRefreshing={isRefreshing}
              subtitle={isVietnamese ? "Dữ liệu" : "Status"}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
