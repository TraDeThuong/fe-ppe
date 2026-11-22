"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Award,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserCog,
  Users,
} from "lucide-react";
import { AnimatedNumber, useAnimatedProgress } from "@/components/ui/animated-number";
import { useLocale } from "@/providers/locale-provider";
import type {
  AdminPerformanceItem,
  ManagerPerformanceItem,
  PersonnelPerformanceItem,
  PersonnelRoleBucket,
  RoleSegmentedPersonnelSummary,
} from "@/lib/report-analytics-data";

export type OfficerSortKey = "workload" | "completion" | "sla";
export type ManagerSortKey = "totalActions" | "reviewed" | "closed";
export type AdminSortKey = "totalActions" | "reviewAndClose" | "directResolve";
export type PersonnelSortOrder = "desc" | "asc";
export type PersonnelFilterMode = "all" | "active" | "idle";

export interface ReportPersonnelPerformanceCardProps {
  summary: RoleSegmentedPersonnelSummary;
  loading?: boolean;
  hydrating?: boolean;
  canViewUsers?: boolean;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatRoleLabel(role: string, isVietnamese: boolean): string {
  const upper = role.toUpperCase();
  if (upper === "SAFETY_OFFICER") return isVietnamese ? "Cán bộ an toàn" : "Safety Officer";
  if (upper === "SAFETY_MANAGER" || upper === "MANAGER") {
    return isVietnamese ? "Quản lý an toàn" : "Safety Manager";
  }
  if (upper === "ADMIN" || upper === "SUPER_ADMIN") return "Admin";
  if (upper === "VIEWER") return isVietnamese ? "Giám sát viên" : "Viewer";
  if (upper === "UNASSIGNED") return isVietnamese ? "Chưa phân công" : "Unassigned";
  return role;
}

function formatHoursLabel(hours: number, isVietnamese: boolean): string {
  if (!hours || hours <= 0) return "—";
  if (hours < 1) {
    return `${Math.max(1, Math.round(hours * 60))} ${isVietnamese ? "phút" : "m"}`;
  }
  return `${hours.toFixed(1)} ${isVietnamese ? "giờ" : "h"}`;
}

/**
 * Row 2 Right (7 cols): Role-Segmented Personnel Violation Performance
 * (Safety Officers vs Safety Managers vs Admins).
 */
export function ReportPersonnelPerformanceCard({
  summary,
  loading = false,
  hydrating = false,
  canViewUsers = false,
}: ReportPersonnelPerformanceCardProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const [roleTab, setRoleTab] = useState<PersonnelRoleBucket>("officer");
  const [officerSort, setOfficerSort] = useState<OfficerSortKey>("workload");
  const [managerSort, setManagerSort] = useState<ManagerSortKey>("totalActions");
  const [adminSort, setAdminSort] = useState<AdminSortKey>("totalActions");
  const [sortOrder, setSortOrder] = useState<PersonnelSortOrder>("desc");
  const [filterMode, setFilterMode] = useState<PersonnelFilterMode>("all");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  const barScale = useAnimatedProgress(100, {
    enabled:
      !loading &&
      (summary.officer.items.length > 0 ||
        summary.manager.items.length > 0 ||
        summary.admin.items.length > 0),
  });

  const handleRoleTabChange = (nextTab: PersonnelRoleBucket) => {
    setRoleTab(nextTab);
    setFilterMode("all");
    setSortOrder("desc");
    setSelectedPersonId(null);
  };

  const handleSortClick = (key: string) => {
    if (roleTab === "officer") {
      if (officerSort === key) setSortOrder((p) => (p === "desc" ? "asc" : "desc"));
      else {
        setOfficerSort(key as OfficerSortKey);
        setSortOrder("desc");
      }
    } else if (roleTab === "manager") {
      if (managerSort === key) setSortOrder((p) => (p === "desc" ? "asc" : "desc"));
      else {
        setManagerSort(key as ManagerSortKey);
        setSortOrder("desc");
      }
    } else {
      if (adminSort === key) setSortOrder((p) => (p === "desc" ? "asc" : "desc"));
      else {
        setAdminSort(key as AdminSortKey);
        setSortOrder("desc");
      }
    }
  };

  // ── Sorted & Filtered Lists per Role Tab ───────────────────────────────────
  const officerItems = useMemo<PersonnelPerformanceItem[]>(() => {
    const filtered = summary.officer.items.filter((item) => {
      if (filterMode === "active") return item.totalAssigned > 0;
      if (filterMode === "idle") return !item.isUnassignedBucket && item.totalAssigned === 0;
      return true;
    });
    const dir = sortOrder === "desc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (a.isUnassignedBucket !== b.isUnassignedBucket) {
        return a.isUnassignedBucket ? 1 : -1;
      }
      if (officerSort === "completion") {
        if (sortOrder === "desc" && (a.totalAssigned > 0) !== (b.totalAssigned > 0)) {
          return a.totalAssigned > 0 ? -1 : 1;
        }
        if (b.completionRate !== a.completionRate) return (b.completionRate - a.completionRate) * dir;
        if (b.totalAssigned !== a.totalAssigned) return (b.totalAssigned - a.totalAssigned) * dir;
        return a.name.localeCompare(b.name);
      }
      if (officerSort === "sla") {
        if (sortOrder === "desc" && (a.slaMeasuredCount > 0) !== (b.slaMeasuredCount > 0)) {
          return a.slaMeasuredCount > 0 ? -1 : 1;
        }
        if (b.slaComplianceRate !== a.slaComplianceRate) {
          return (b.slaComplianceRate - a.slaComplianceRate) * dir;
        }
        if (b.resolvedTotal !== a.resolvedTotal) return (b.resolvedTotal - a.resolvedTotal) * dir;
        return a.name.localeCompare(b.name);
      }
      if (b.totalAssigned !== a.totalAssigned) return (b.totalAssigned - a.totalAssigned) * dir;
      if (b.resolvedTotal !== a.resolvedTotal) return (b.resolvedTotal - a.resolvedTotal) * dir;
      return a.name.localeCompare(b.name);
    });
  }, [summary.officer.items, filterMode, officerSort, sortOrder]);

  const managerItems = useMemo<ManagerPerformanceItem[]>(() => {
    const filtered = summary.manager.items.filter((item) => {
      if (filterMode === "active") return item.totalActions > 0;
      if (filterMode === "idle") return item.totalActions === 0;
      return true;
    });
    const dir = sortOrder === "desc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (managerSort === "reviewed") {
        if (b.reviewedTotal !== a.reviewedTotal) return (b.reviewedTotal - a.reviewedTotal) * dir;
      } else if (managerSort === "closed") {
        if (b.closedAcceptanceCount !== a.closedAcceptanceCount) {
          return (b.closedAcceptanceCount - a.closedAcceptanceCount) * dir;
        }
      }
      if (b.totalActions !== a.totalActions) return (b.totalActions - a.totalActions) * dir;
      return a.name.localeCompare(b.name);
    });
  }, [summary.manager.items, filterMode, managerSort, sortOrder]);

  const adminItems = useMemo<AdminPerformanceItem[]>(() => {
    const filtered = summary.admin.items.filter((item) => {
      if (filterMode === "active") return item.totalActions > 0;
      if (filterMode === "idle") return item.totalActions === 0;
      return true;
    });
    const dir = sortOrder === "desc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (adminSort === "reviewAndClose") {
        if (b.reviewAndCloseCount !== a.reviewAndCloseCount) {
          return (b.reviewAndCloseCount - a.reviewAndCloseCount) * dir;
        }
      } else if (adminSort === "directResolve") {
        if (b.directResolveCount !== a.directResolveCount) {
          return (b.directResolveCount - a.directResolveCount) * dir;
        }
      }
      if (b.totalActions !== a.totalActions) return (b.totalActions - a.totalActions) * dir;
      return a.name.localeCompare(b.name);
    });
  }, [summary.admin.items, filterMode, adminSort, sortOrder]);

  const maxOfficerWorkload = useMemo(
    () => Math.max(1, ...summary.officer.items.map((item) => item.totalAssigned)),
    [summary.officer.items],
  );
  const maxManagerActions = useMemo(
    () => Math.max(1, ...summary.manager.items.map((item) => item.totalActions)),
    [summary.manager.items],
  );
  const maxAdminActions = useMemo(
    () => Math.max(1, ...summary.admin.items.map((item) => item.totalActions)),
    [summary.admin.items],
  );

  // ── UI Metadata per Role Tab ───────────────────────────────────────────────
  const roleTabs: Array<{
    key: PersonnelRoleBucket;
    label: string;
    count: number;
    icon: typeof Users;
  }> = [
    {
      key: "officer",
      label: isVietnamese ? "Cán bộ xử lý" : "Officers",
      count: summary.officer.staffCount,
      icon: ShieldCheck,
    },
    {
      key: "manager",
      label: isVietnamese ? "Quản lý điều hành" : "Managers",
      count: summary.manager.staffCount,
      icon: ClipboardCheck,
    },
    {
      key: "admin",
      label: isVietnamese ? "Quản trị" : "Admins",
      count: summary.admin.staffCount,
      icon: UserCog,
    },
  ];

  const activeSortKey =
    roleTab === "officer" ? officerSort : roleTab === "manager" ? managerSort : adminSort;

  const sortOptions =
    roleTab === "officer"
      ? [
          { key: "workload", label: isVietnamese ? "Tổng việc" : "Workload" },
          { key: "completion", label: isVietnamese ? "Hoàn tất" : "Completion" },
          { key: "sla", label: isVietnamese ? "Đạt SLA" : "SLA" },
        ]
      : roleTab === "manager"
        ? [
            { key: "totalActions", label: isVietnamese ? "Tổng điều hành" : "Total" },
            { key: "reviewed", label: isVietnamese ? "Thẩm duyệt" : "Reviewed" },
            { key: "closed", label: isVietnamese ? "Nghiệm thu" : "Closed" },
          ]
        : [
            { key: "totalActions", label: isVietnamese ? "Tổng can thiệp" : "Total" },
            { key: "reviewAndClose", label: isVietnamese ? "Duyệt / Đóng" : "Review/Close" },
            { key: "directResolve", label: isVietnamese ? "Xử lý trực tiếp" : "Direct Fix" },
          ];

  const currentSummaryMeta =
    roleTab === "officer"
      ? summary.officer
      : roleTab === "manager"
        ? summary.manager
        : summary.admin;

  const filterOptions: Array<{ key: PersonnelFilterMode; label: string; count: number }> = [
    {
      key: "all",
      label: isVietnamese ? "Tất cả" : "All",
      count: currentSummaryMeta.staffCount,
    },
    {
      key: "active",
      label: isVietnamese
        ? roleTab === "officer"
          ? "Có xử lý"
          : "Có hoạt động"
        : "Active",
      count: currentSummaryMeta.activeHandlersCount,
    },
    {
      key: "idle",
      label: isVietnamese ? "Chưa có việc" : "0 tasks",
      count: currentSummaryMeta.idleStaffCount,
    },
  ];

  const activeSortDescription = useMemo(() => {
    const found = sortOptions.find((o) => o.key === activeSortKey);
    const dirLabel =
      sortOrder === "desc"
        ? isVietnamese
          ? "Nhiều / Cao → Ít / Thấp"
          : "High → Low"
        : isVietnamese
          ? "Ít / Thấp → Nhiều / Cao"
          : "Low → High";
    return `${found?.label ?? ""}: ${dirLabel}`;
  }, [sortOptions, activeSortKey, sortOrder, isVietnamese]);

  if (loading) {
    return (
      <div className="flex h-full min-h-[460px] w-full flex-col justify-between rounded-[24px] bg-surface p-5 shadow-[inset_4px_4px_10px_var(--shadow-dark),inset_-4px_-4px_10px_var(--shadow-light)]">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-2">
              <div className="h-5 w-52 rounded-lg bg-muted" />
              <div className="h-3 w-64 rounded-lg bg-muted/70" />
            </div>
            <div className="h-9 w-40 rounded-xl bg-muted" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="h-16 rounded-2xl bg-muted/60" />
            <div className="h-16 rounded-2xl bg-muted/60" />
            <div className="h-16 rounded-2xl bg-muted/60" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-muted/50" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="
        relative flex h-full w-full flex-col justify-between overflow-hidden
        rounded-[24px] sm:rounded-[30px]
        border border-white/80 bg-background p-1.5
        shadow-[10px_10px_24px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light)]
        dark:border-white/10
      "
    >
      <div className="relative flex flex-1 flex-col justify-between overflow-hidden rounded-[20px] sm:rounded-[25px] border border-[var(--shadow-dark)]/15 bg-background/95 p-4 sm:p-5">
        {/* Micro-grid & ambient orbs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.055] [background-image:radial-gradient(hsl(var(--primary))_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_at_top_right,black_30%,transparent_80%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-10 top-0 h-[2px] rounded-full bg-gradient-to-r from-transparent via-primary to-accent opacity-80"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-accent/12 blur-3xl"
        />

        {/* HEADER */}
        <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 shrink-0 border-b border-[var(--shadow-dark)]/20 pb-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-background shadow-[5px_5px_10px_var(--shadow-dark),-5px_-5px_10px_var(--shadow-light)] dark:border-white/10">
              <div className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 via-primary/5 to-accent/25 text-primary shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]">
                <Users size={18} strokeWidth={2.3} />
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm sm:text-base font-black tracking-tight text-foreground">
                  {t("reports.charts.personnelTitle")}
                </h3>
                {hydrating && (
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    {isVietnamese ? "Đang đồng bộ..." : "Syncing..."}
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">
                {roleTab === "officer"
                  ? isVietnamese
                    ? "Công việc thực thi hiện trường: tiếp nhận phân công, khắc phục & đạt SLA"
                    : "Field remediation: assigned incidents, completion & SLA adherence"
                  : roleTab === "manager"
                    ? isVietnamese
                      ? "Công việc điều hành: thẩm duyệt (xác nhận/bác bỏ), nghiệm thu đóng & tồn site"
                      : "Governance actions: triage review, closure acceptance & site backlog"
                    : isVietnamese
                      ? "Can thiệp trực tiếp của Quản trị viên & vai trò khác"
                      : "Administrative & other-role interventions"}
              </p>
            </div>
          </div>

          {/* Sort Controls */}
          <div className="relative z-20 flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label={isVietnamese ? "Sắp xếp nhân sự" : "Sort personnel"}
              className="flex items-center gap-1 rounded-2xl border border-black/[0.04] bg-background/80 p-1 shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)] dark:border-white/5"
            >
              {sortOptions.map((opt) => {
                const isActive = activeSortKey === opt.key;
                const SortIcon = sortOrder === "desc" ? ArrowDown : ArrowUp;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => handleSortClick(opt.key)}
                    title={
                      isVietnamese
                        ? "Bấm để sắp xếp, bấm lại để đảo chiều Nhiều ↔ Ít"
                        : "Click to sort, click again to toggle High ↔ Low"
                    }
                    className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer select-none ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-[2px_2px_6px_var(--shadow-dark)]"
                        : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isActive && <SortIcon className="h-3 w-3 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ROLE TABS BAR */}
        <div
          role="tablist"
          aria-label={isVietnamese ? "Phân tách theo vai trò" : "Role segmentation"}
          className="relative z-20 mt-3 flex overflow-x-auto no-scrollbar sm:grid sm:grid-cols-3 gap-1.5 rounded-2xl border border-black/[0.04] bg-background/80 p-1 shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)] dark:border-white/5 shrink-0"
        >
          {roleTabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = roleTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => handleRoleTabChange(tab.key)}
                className={`flex shrink-0 whitespace-nowrap items-center justify-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-extrabold transition-all cursor-pointer select-none ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-[2px_2px_7px_var(--shadow-dark)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{tab.label}</span>
                <span
                  className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] leading-none ${
                    isSelected
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ROLE-SPECIFIC SUMMARY METRIC STRIP */}
        {roleTab === "officer" && (
          <div className="relative z-10 mt-3 grid grid-cols-1 min-[420px]:grid-cols-3 gap-2.5 shrink-0">
            <div className="rounded-2xl border border-white/50 bg-background/80 px-3 py-2 shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)] dark:border-white/5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <Users className="h-3 w-3 text-primary" />
                <span className="truncate">
                  {isVietnamese ? "Officer có việc" : "Active Officers"}
                </span>
              </div>
              <p className="mt-0.5 font-mono text-base font-black tabular-nums text-foreground">
                {summary.officer.activeHandlersCount}
                <span className="ml-1 text-xs font-semibold text-muted-foreground">
                  /{summary.officer.staffCount}
                </span>
              </p>
            </div>

            <div className="rounded-2xl border border-white/50 bg-background/80 px-3 py-2 shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)] dark:border-white/5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <UserCheck className="h-3 w-3 text-primary" />
                <span className="truncate">{isVietnamese ? "Đã giao Officer" : "Assigned"}</span>
              </div>
              <div className="mt-0.5 flex items-baseline justify-between gap-1">
                <span className="font-mono text-base font-black tabular-nums text-foreground">
                  {summary.officer.assignedIncidentsCount}
                  <span className="ml-0.5 text-xs font-semibold text-muted-foreground">
                    /{summary.officer.totalTrackedIncidents}
                  </span>
                </span>
                {summary.officer.unassignedConfirmedCount > 0 && (
                  <span className="hidden sm:inline-flex rounded-md bg-accent/15 px-1.5 py-0.5 font-mono text-[9px] font-black text-accent">
                    +{summary.officer.unassignedConfirmedCount}
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/50 bg-background/80 px-3 py-2 shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)] dark:border-white/5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <Award className="h-3 w-3 text-accent" />
                <span className="truncate">{isVietnamese ? "Hoàn tất / SLA" : "Done / SLA"}</span>
              </div>
              <p className="mt-0.5 font-mono text-sm sm:text-base font-black tabular-nums text-primary">
                <AnimatedNumber value={summary.officer.avgCompletionRate} suffix="%" />
                <span className="mx-1 text-muted-foreground/50">•</span>
                <span className="text-foreground">{summary.officer.avgSlaComplianceRate}%</span>
              </p>
            </div>
          </div>
        )}

        {roleTab === "manager" && (
          <div className="relative z-10 mt-3 grid grid-cols-1 min-[420px]:grid-cols-3 gap-2.5 shrink-0">
            <div className="rounded-2xl border border-white/50 bg-background/80 px-3 py-2 shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)] dark:border-white/5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <ClipboardCheck className="h-3 w-3 text-primary" />
                <span className="truncate">
                  {isVietnamese ? "Manager hoạt động" : "Active Managers"}
                </span>
              </div>
              <p className="mt-0.5 font-mono text-base font-black tabular-nums text-foreground">
                {summary.manager.activeHandlersCount}
                <span className="ml-1 text-xs font-semibold text-muted-foreground">
                  /{summary.manager.staffCount}
                </span>
              </p>
            </div>

            <div className="rounded-2xl border border-white/50 bg-background/80 px-3 py-2 shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)] dark:border-white/5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <ShieldAlert className="h-3 w-3 text-primary" />
                <span className="truncate">
                  {isVietnamese ? "Duyệt / Nghiệm thu" : "Review / Close"}
                </span>
              </div>
              <p className="mt-0.5 font-mono text-base font-black tabular-nums text-primary">
                {summary.manager.totalReviewActions}
                <span className="mx-1 text-muted-foreground/50">/</span>
                <span className="text-foreground">{summary.manager.totalClosedActions}</span>
              </p>
            </div>

            <div className="rounded-2xl border border-white/50 bg-background/80 px-3 py-2 shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)] dark:border-white/5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <Clock className="h-3 w-3 text-accent" />
                <span className="truncate">
                  {isVietnamese ? "Tốc độ duyệt TB" : "Avg Review Time"}
                </span>
              </div>
              <p className="mt-0.5 font-mono text-base font-black tabular-nums text-foreground">
                {formatHoursLabel(summary.manager.avgReviewHours, isVietnamese)}
              </p>
            </div>
          </div>
        )}

        {roleTab === "admin" && (
          <div className="relative z-10 mt-3 grid grid-cols-1 min-[420px]:grid-cols-3 gap-2.5 shrink-0">
            <div className="rounded-2xl border border-white/50 bg-background/80 px-3 py-2 shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)] dark:border-white/5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <UserCog className="h-3 w-3 text-primary" />
                <span className="truncate">{isVietnamese ? "Nhân sự Admin" : "Admins"}</span>
              </div>
              <p className="mt-0.5 font-mono text-base font-black tabular-nums text-foreground">
                {summary.admin.staffCount}
              </p>
            </div>

            <div className="rounded-2xl border border-white/50 bg-background/80 px-3 py-2 shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)] dark:border-white/5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 text-primary" />
                <span className="truncate">{isVietnamese ? "Có can thiệp" : "Intervened"}</span>
              </div>
              <p className="mt-0.5 font-mono text-base font-black tabular-nums text-primary">
                {summary.admin.activeHandlersCount}
              </p>
            </div>

            <div className="rounded-2xl border border-white/50 bg-background/80 px-3 py-2 shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)] dark:border-white/5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <Award className="h-3 w-3 text-accent" />
                <span className="truncate">{isVietnamese ? "Tổng lượt" : "Total Actions"}</span>
              </div>
              <p className="mt-0.5 font-mono text-base font-black tabular-nums text-foreground">
                {summary.admin.totalActions}
              </p>
            </div>
          </div>
        )}

        {/* FILTER PILLS + SORT INDICATOR */}
        <div className="relative z-20 mt-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {filterOptions.map((opt) => {
              const isSelected = filterMode === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setFilterMode(opt.key)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[10px] font-bold transition-all cursor-pointer select-none ${
                    isSelected
                      ? "bg-primary/15 text-primary border border-primary/35 shadow-[inset_1.5px_1.5px_4px_var(--shadow-dark)]"
                      : "bg-background/80 text-muted-foreground border border-white/40 hover:text-foreground dark:border-white/5"
                  }`}
                >
                  <span>{opt.label}</span>
                  <span className="font-mono text-[9px] opacity-80">({opt.count})</span>
                </button>
              );
            })}
          </div>

          <span className="font-mono text-[10px] font-bold text-primary/90">
            {activeSortDescription}
          </span>
        </div>

        {/* LEGEND */}
        <div className="relative z-10 mt-2 flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] font-semibold text-muted-foreground shrink-0">
          {roleTab === "officer" ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
                  {isVietnamese ? "Đã đóng (Closed)" : "Closed"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-primary/55" />
                  {isVietnamese ? "Chờ nghiệm thu (Resolved)" : "Awaiting Acceptance"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-accent" />
                  {isVietnamese ? "Đang xử lý (Confirmed)" : "In Remediation"}
                </span>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground/80">
                SLA: Crit ≤15m • High ≤30m • Med ≤60m
              </span>
            </>
          ) : roleTab === "manager" ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
                  {isVietnamese ? "Xác nhận vi phạm" : "Confirmed"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-primary/55" />
                  {isVietnamese ? "Nghiệm thu đóng" : "Closed"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-accent" />
                  {isVietnamese ? "Bác bỏ báo sai" : "Dismissed"}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground/80">
                {isVietnamese
                  ? "Nguồn: lịch sử duyệt & đóng + tồn theo site"
                  : "Via review/close history & site backlog"}
              </span>
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
                {isVietnamese ? "Duyệt / Nghiệm thu đóng" : "Review / Close"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-accent" />
                {isVietnamese ? "Khắc phục trực tiếp" : "Direct Remediation"}
              </span>
            </div>
          )}
        </div>

        {/* ROWS PER ROLE TAB */}
        <div className="relative z-10 mt-2.5 flex-1">
          {roleTab === "officer" &&
            (officerItems.length > 0 ? (
              <div className="max-h-[265px] space-y-2.5 overflow-y-auto pr-1">
                {officerItems.map((person, index) => {
                  const isSelected = selectedPersonId === person.userId;
                  const displayName = person.isUnassignedBucket
                    ? isVietnamese
                      ? "Chưa phân công Officer"
                      : "Unassigned Violations"
                    : person.name;
                  const hasWork = person.totalAssigned > 0;
                  const barWidthFactor =
                    ((person.totalAssigned / maxOfficerWorkload) * barScale) / 100;
                  const closedPct = hasWork
                    ? (person.closedCount / person.totalAssigned) * 100 * barWidthFactor
                    : 0;
                  const resolvedPct = hasWork
                    ? (person.awaitingAcceptanceCount / person.totalAssigned) * 100 * barWidthFactor
                    : 0;
                  const activePct = hasWork
                    ? (person.activeCount / person.totalAssigned) * 100 * barWidthFactor
                    : 0;

                  return (
                    <div
                      key={person.userId}
                      onClick={() =>
                        setSelectedPersonId(isSelected ? null : person.userId)
                      }
                      className={`rounded-2xl border p-3 transition-all cursor-pointer ${
                        isSelected
                          ? "border-primary/45 bg-background shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)]"
                          : person.isUnassignedBucket
                            ? "border-accent/35 bg-background/90 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] hover:border-accent/60"
                            : "border-white/60 bg-background/90 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] hover:border-primary/30 dark:border-white/5"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-mono text-[11px] font-black ${
                              person.isUnassignedBucket
                                ? "bg-accent/15 text-accent"
                                : index === 0 && hasWork && sortOrder === "desc"
                                  ? "bg-primary text-primary-foreground shadow-[2px_2px_5px_var(--shadow-dark)]"
                                  : "bg-background text-primary shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]"
                            }`}
                          >
                            {person.isUnassignedBucket ? (
                              <AlertCircle className="h-4 w-4" />
                            ) : (
                              getInitials(displayName)
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="truncate text-xs font-extrabold text-foreground">
                                {displayName}
                              </p>
                              <span
                                className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                                  person.isUnassignedBucket
                                    ? "bg-accent/15 text-accent"
                                    : "bg-primary/10 text-primary"
                                }`}
                              >
                                {formatRoleLabel(person.role, isVietnamese)}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                              {person.siteNames.length > 0
                                ? person.siteNames.join(" • ")
                                : person.email || (isVietnamese ? "Toàn hệ thống" : "System-wide")}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-3 text-right tabular-nums">
                          <div>
                            <p className="font-mono text-xs font-black text-foreground">
                              {hasWork
                                ? `${person.resolvedTotal}/${person.totalAssigned}`
                                : isVietnamese
                                  ? "0 vụ"
                                  : "0"}
                            </p>
                            <p className="text-[9px] font-semibold text-muted-foreground">
                              {hasWork
                                ? `${person.completionRate}% ${isVietnamese ? "xong" : "done"}`
                                : isVietnamese
                                  ? "Chưa xử lý"
                                  : "No tasks"}
                            </p>
                          </div>

                          <div className="hidden sm:block">
                            <p className="flex items-center justify-end gap-1 font-mono text-xs font-bold text-foreground">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              {formatHoursLabel(person.avgMttrHours, isVietnamese)}
                            </p>
                            <p className="text-[9px] font-semibold text-muted-foreground">
                              MTTR
                            </p>
                          </div>

                          <div
                            className={`rounded-xl px-2 py-1 text-center ${
                              person.slaMeasuredCount === 0
                                ? "bg-muted/60 text-muted-foreground"
                                : person.slaComplianceRate >= 80
                                  ? "bg-primary/12 text-primary"
                                  : "bg-accent/15 text-accent"
                            }`}
                          >
                            <p className="font-mono text-[11px] font-black leading-none">
                              {person.slaMeasuredCount > 0 ? `${person.slaComplianceRate}%` : "—"}
                            </p>
                            <p className="mt-0.5 text-[8px] font-extrabold uppercase tracking-wider">
                              SLA
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-2.5 flex h-2.5 w-full overflow-hidden rounded-full bg-background shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                        {closedPct > 0 && (
                          <div
                            className="h-full bg-primary transition-all duration-500"
                            style={{ width: `${closedPct}%` }}
                          />
                        )}
                        {resolvedPct > 0 && (
                          <div
                            className="h-full bg-primary/55 transition-all duration-500"
                            style={{ width: `${resolvedPct}%` }}
                          />
                        )}
                        {activePct > 0 && (
                          <div
                            className={`h-full transition-all duration-500 ${
                              person.isUnassignedBucket ? "bg-accent/70" : "bg-accent"
                            }`}
                            style={{ width: `${activePct}%` }}
                          />
                        )}
                      </div>

                      {isSelected && (
                        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-2 text-[10px]">
                          <div className="flex flex-wrap items-center gap-3 font-semibold text-muted-foreground tabular-nums">
                            <span>
                              {isVietnamese ? "Tổng giao:" : "Assigned:"}{" "}
                              <strong className="text-foreground">{person.totalAssigned}</strong>
                            </span>
                            <span>
                              {isVietnamese ? "Đã đóng:" : "Closed:"}{" "}
                              <strong className="text-foreground">{person.closedCount}</strong>
                            </span>
                            <span>
                              {isVietnamese ? "Chờ nghiệm thu:" : "Resolved:"}{" "}
                              <strong className="text-foreground">
                                {person.awaitingAcceptanceCount}
                              </strong>
                            </span>
                            <span>
                              {isVietnamese ? "Đang xử lý:" : "Active:"}{" "}
                              <strong className="text-accent">{person.activeCount}</strong>
                            </span>
                            <span>
                              {isVietnamese ? "Đạt SLA:" : "SLA Met:"}{" "}
                              <strong className="text-foreground">
                                {person.slaMetCount}/{person.slaMeasuredCount}
                              </strong>
                            </span>
                          </div>

                          {person.isUnassignedBucket ? (
                            <Link
                              href="/incidents/assignments"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 font-bold text-accent hover:underline"
                            >
                              <span>
                                {isVietnamese ? "Mở bảng điều phối" : "Open dispatch"}
                              </span>
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          ) : (
                            canViewUsers && (
                              <Link
                                href={`/users/${person.userId}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                              >
                                <span>
                                  {isVietnamese ? "Xem hồ sơ nhân sự" : "View profile"}
                                </span>
                                <ArrowRight className="h-3 w-3" />
                              </Link>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyRoleState roleTab="officer" filterMode={filterMode} isVietnamese={isVietnamese} />
            ))}

          {roleTab === "manager" &&
            (managerItems.length > 0 ? (
              <div className="max-h-[265px] space-y-2.5 overflow-y-auto pr-1">
                {managerItems.map((mgr, index) => {
                  const isSelected = selectedPersonId === mgr.userId;
                  const hasWork = mgr.totalActions > 0;
                  const barWidthFactor =
                    ((mgr.totalActions / maxManagerActions) * barScale) / 100;
                  const confirmedPct = hasWork
                    ? (mgr.confirmedReviewCount / mgr.totalActions) * 100 * barWidthFactor
                    : 0;
                  const closedPct = hasWork
                    ? ((mgr.closedAcceptanceCount + mgr.directResolveCount) / mgr.totalActions) *
                      100 *
                      barWidthFactor
                    : 0;
                  const dismissedPct = hasWork
                    ? (mgr.dismissedReviewCount / mgr.totalActions) * 100 * barWidthFactor
                    : 0;

                  return (
                    <div
                      key={mgr.userId}
                      onClick={() => setSelectedPersonId(isSelected ? null : mgr.userId)}
                      className={`rounded-2xl border p-3 transition-all cursor-pointer ${
                        isSelected
                          ? "border-primary/45 bg-background shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)]"
                          : "border-white/60 bg-background/90 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] hover:border-primary/30 dark:border-white/5"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-mono text-[11px] font-black ${
                              index === 0 && hasWork && sortOrder === "desc"
                                ? "bg-primary text-primary-foreground shadow-[2px_2px_5px_var(--shadow-dark)]"
                                : "bg-background text-primary shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]"
                            }`}
                          >
                            {getInitials(mgr.name)}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="truncate text-xs font-extrabold text-foreground">
                                {mgr.name}
                              </p>
                              <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                                {formatRoleLabel(mgr.role, isVietnamese)}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                              {mgr.siteNames.length > 0
                                ? mgr.siteNames.join(" • ")
                                : mgr.email || (isVietnamese ? "Toàn hệ thống" : "System-wide")}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-3 text-right tabular-nums">
                          <div>
                            <p className="font-mono text-xs font-black text-foreground">
                              {hasWork
                                ? `${mgr.totalActions} ${isVietnamese ? "lượt" : "acts"}`
                                : isVietnamese
                                  ? "0 lượt"
                                  : "0"}
                            </p>
                            <p className="text-[9px] font-semibold text-muted-foreground">
                              {isVietnamese
                                ? `${mgr.reviewedTotal} duyệt • ${mgr.closedAcceptanceCount} đóng`
                                : `${mgr.reviewedTotal} rev • ${mgr.closedAcceptanceCount} cls`}
                            </p>
                          </div>

                          <div className="hidden sm:block">
                            <p className="flex items-center justify-end gap-1 font-mono text-xs font-bold text-foreground">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              {formatHoursLabel(mgr.avgReviewHours, isVietnamese)}
                            </p>
                            <p className="text-[9px] font-semibold text-muted-foreground">
                              {isVietnamese ? "Duyệt TB" : "Review"}
                            </p>
                          </div>

                          <div
                            className={`rounded-xl px-2 py-1 text-center ${
                              mgr.siteBacklogCount > 0
                                ? "bg-accent/15 text-accent"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            <p className="font-mono text-[11px] font-black leading-none">
                              {mgr.siteBacklogCount}
                            </p>
                            <p className="mt-0.5 text-[8px] font-extrabold uppercase tracking-wider">
                              {isVietnamese ? "Tồn site" : "Backlog"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-2.5 flex h-2.5 w-full overflow-hidden rounded-full bg-background shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                        {confirmedPct > 0 && (
                          <div
                            className="h-full bg-primary transition-all duration-500"
                            style={{ width: `${confirmedPct}%` }}
                          />
                        )}
                        {closedPct > 0 && (
                          <div
                            className="h-full bg-primary/55 transition-all duration-500"
                            style={{ width: `${closedPct}%` }}
                          />
                        )}
                        {dismissedPct > 0 && (
                          <div
                            className="h-full bg-accent transition-all duration-500"
                            style={{ width: `${dismissedPct}%` }}
                          />
                        )}
                      </div>

                      {isSelected && (
                        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-2 text-[10px]">
                          <div className="flex flex-wrap items-center gap-3 font-semibold text-muted-foreground tabular-nums">
                            <span>
                              {isVietnamese ? "Xác nhận:" : "Confirmed:"}{" "}
                              <strong className="text-foreground">{mgr.confirmedReviewCount}</strong>
                            </span>
                            <span>
                              {isVietnamese ? "Bác bỏ:" : "Dismissed:"}{" "}
                              <strong className="text-accent">{mgr.dismissedReviewCount}</strong>
                            </span>
                            <span>
                              {isVietnamese ? "Nghiệm thu đóng:" : "Closed:"}{" "}
                              <strong className="text-foreground">
                                {mgr.closedAcceptanceCount}
                              </strong>
                            </span>
                            <span>
                              {isVietnamese ? "Tồn tại site:" : "Site backlog:"}{" "}
                              <strong className="text-foreground">{mgr.siteBacklogCount}</strong>
                            </span>
                          </div>

                          {canViewUsers && (
                            <Link
                              href={`/users/${mgr.userId}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                            >
                              <span>
                                {isVietnamese ? "Xem hồ sơ quản lý" : "View profile"}
                              </span>
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyRoleState roleTab="manager" filterMode={filterMode} isVietnamese={isVietnamese} />
            ))}

          {roleTab === "admin" &&
            (adminItems.length > 0 ? (
              <div className="max-h-[265px] space-y-2.5 overflow-y-auto pr-1">
                {adminItems.map((adm, index) => {
                  const isSelected = selectedPersonId === adm.userId;
                  const hasWork = adm.totalActions > 0;
                  const barWidthFactor =
                    ((adm.totalActions / maxAdminActions) * barScale) / 100;
                  const revClosePct = hasWork
                    ? (adm.reviewAndCloseCount / adm.totalActions) * 100 * barWidthFactor
                    : 0;
                  const directPct = hasWork
                    ? (adm.directResolveCount / adm.totalActions) * 100 * barWidthFactor
                    : 0;

                  return (
                    <div
                      key={adm.userId}
                      onClick={() => setSelectedPersonId(isSelected ? null : adm.userId)}
                      className={`rounded-2xl border p-3 transition-all cursor-pointer ${
                        isSelected
                          ? "border-primary/45 bg-background shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)]"
                          : "border-white/60 bg-background/90 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] hover:border-primary/30 dark:border-white/5"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-mono text-[11px] font-black ${
                              index === 0 && hasWork && sortOrder === "desc"
                                ? "bg-primary text-primary-foreground shadow-[2px_2px_5px_var(--shadow-dark)]"
                                : "bg-background text-primary shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]"
                            }`}
                          >
                            {getInitials(adm.name)}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="truncate text-xs font-extrabold text-foreground">
                                {adm.name}
                              </p>
                              <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                                {formatRoleLabel(adm.role, isVietnamese)}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                              {adm.siteNames.length > 0
                                ? adm.siteNames.join(" • ")
                                : adm.email || (isVietnamese ? "Toàn hệ thống" : "System-wide")}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-3 text-right tabular-nums">
                          <div>
                            <p className="font-mono text-xs font-black text-foreground">
                              {hasWork
                                ? `${adm.totalActions} ${isVietnamese ? "lượt" : "acts"}`
                                : isVietnamese
                                  ? "0 lượt"
                                  : "0"}
                            </p>
                            <p className="text-[9px] font-semibold text-muted-foreground">
                              {isVietnamese
                                ? `${adm.reviewAndCloseCount} duyệt/đóng • ${adm.directResolveCount} xử lý`
                                : `${adm.reviewAndCloseCount} gov • ${adm.directResolveCount} fix`}
                            </p>
                          </div>

                          <div className="hidden sm:block">
                            <p className="flex items-center justify-end gap-1 font-mono text-xs font-bold text-foreground">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              {formatHoursLabel(adm.avgResponseHours, isVietnamese)}
                            </p>
                            <p className="text-[9px] font-semibold text-muted-foreground">
                              {isVietnamese ? "Phản hồi" : "Response"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-2.5 flex h-2.5 w-full overflow-hidden rounded-full bg-background shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                        {revClosePct > 0 && (
                          <div
                            className="h-full bg-primary transition-all duration-500"
                            style={{ width: `${revClosePct}%` }}
                          />
                        )}
                        {directPct > 0 && (
                          <div
                            className="h-full bg-accent transition-all duration-500"
                            style={{ width: `${directPct}%` }}
                          />
                        )}
                      </div>

                      {isSelected && canViewUsers && (
                        <div className="mt-2.5 flex justify-end border-t border-border/40 pt-2 text-[10px]">
                          <Link
                            href={`/users/${adm.userId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                          >
                            <span>
                              {isVietnamese ? "Xem hồ sơ nhân sự" : "View profile"}
                            </span>
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyRoleState roleTab="admin" filterMode={filterMode} isVietnamese={isVietnamese} />
            ))}
        </div>
      </div>
    </div>
  );
}

function EmptyRoleState({
  roleTab,
  filterMode,
  isVietnamese,
}: {
  roleTab: PersonnelRoleBucket;
  filterMode: PersonnelFilterMode;
  isVietnamese: boolean;
}) {
  const roleLabel =
    roleTab === "officer"
      ? isVietnamese
        ? "Cán bộ an toàn"
        : "Safety Officers"
      : roleTab === "manager"
        ? isVietnamese
          ? "Quản lý an toàn"
          : "Safety Managers"
        : isVietnamese
          ? "Quản trị viên"
          : "Admins";

  return (
    <div className="flex h-full min-h-[210px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 py-8 text-center">
      <ShieldCheck className="h-8 w-8 text-primary/50" />
      <p className="text-xs font-bold text-foreground">
        {filterMode === "active"
          ? isVietnamese
            ? `Chưa có ${roleLabel} nào phát sinh lượt xử lý trong kỳ này`
            : `No active ${roleLabel} in this period`
          : filterMode === "idle"
            ? isVietnamese
              ? `Tất cả ${roleLabel} đều đã có hoạt động trong kỳ này`
              : `All ${roleLabel} have recorded activity`
            : isVietnamese
              ? `Không có tài khoản ${roleLabel} trong phạm vi đã chọn`
              : `No ${roleLabel} found in the selected scope`}
      </p>
    </div>
  );
}
