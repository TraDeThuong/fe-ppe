"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Layers,
  Send,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { useLocale } from "@/providers/locale-provider";
import { notificationIncidentTarget } from "@/lib/incident-group";
import {
  groupIncidentsByCamera,
  groupIncidentsByResponsibility,
  groupIncidentsBySiteResponsibility,
  isIncidentAssignedToUser,
  resolveIncidentResponsibility,
  type ResponsiblePersonRef,
} from "@/lib/incident-workflow";
import type { AssignmentIncidentTotals } from "@/hooks/incidents/use-assignment-incidents";
import type { IncidentItem, NotificationItemDto } from "@/types";

export interface IncidentAssignmentOverviewCardProps {
  incidents: readonly IncidentItem[];
  statusTotals?: Partial<AssignmentIncidentTotals>;
  loading?: boolean;
  userRole?: string | null;
  userId?: string | null;
  usersById?: ReadonlyMap<string, ResponsiblePersonRef>;
  siteManagersBySiteId?: ReadonlyMap<string, ResponsiblePersonRef[]>;
  notifications?: readonly Pick<NotificationItemDto, "incidentId" | "content">[];
  href?: string;
}

export function IncidentAssignmentOverviewCard({
  incidents,
  statusTotals,
  loading = false,
  userRole,
  userId,
  usersById,
  siteManagersBySiteId,
  notifications = [],
  href = "/incidents/assignments",
}: IncidentAssignmentOverviewCardProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const { getSiteName, getCameraCode, getCameraName } = useEntityLookup();

  const role = (userRole || "").toUpperCase();
  const isAdminRole = role === "ADMIN" || role === "SUPER_ADMIN";
  const isOfficerRole = role === "SAFETY_OFFICER";

  const responsibilityContext = useMemo(
    () => ({
      siteManagersBySiteId,
      usersById,
      resolveSiteName: (sid: string, fallback?: string) =>
        fallback || getSiteName(sid),
      resolveCameraLabel: (inc: IncidentItem) => {
        const code = inc.cameraCode || getCameraCode(inc.cameraId);
        const name = inc.cameraName || getCameraName(inc.cameraId);
        return name && name !== code
          ? `${code} (${name})`
          : code || inc.cameraId.slice(0, 8);
      },
    }),
    [siteManagersBySiteId, usersById, getSiteName, getCameraCode, getCameraName],
  );

  const summary = useMemo(() => {
    let pendingReviewCount = 0;
    let unassignedConfirmedCount = 0;
    let officerActiveCount = 0;
    let awaitingAcceptanceCount = 0;
    let completedCount = 0;
    let myActiveCount = 0;
    let myCompletedCount = 0;

    for (const inc of incidents) {
      const resp = resolveIncidentResponsibility(inc, responsibilityContext);
      if (resp.phase === "AWAITING_MANAGER_REVIEW") {
        pendingReviewCount++;
      } else if (resp.phase === "AWAITING_MANAGER_DISPATCH") {
        unassignedConfirmedCount++;
      } else if (resp.phase === "OFFICER_REMEDIATING") {
        officerActiveCount++;
      } else if (resp.phase === "AWAITING_MANAGER_ACCEPTANCE") {
        awaitingAcceptanceCount++;
      } else {
        completedCount++;
      }

      if (userId) {
        const isMineActive = isIncidentAssignedToUser(inc, userId);
        const wasMine =
          isMineActive ||
          resp.assignedOfficerId === userId ||
          (inc.assignments ?? []).some((a) => a.assignedTo === userId);

        if (inc.status === "CONFIRMED" && isMineActive) {
          myActiveCount++;
        } else if (
          wasMine &&
          (inc.status === "RESOLVED" || inc.status === "CLOSED")
        ) {
          myCompletedCount++;
        }
      }
    }

    const effectivePendingReviewCount = Math.max(
      statusTotals?.pendingReview ?? 0,
      pendingReviewCount,
    );
    const effectiveAwaitingAcceptanceCount = Math.max(
      statusTotals?.resolved ?? 0,
      awaitingAcceptanceCount,
    );
    const effectiveCompletedCount = Math.max(
      statusTotals?.closedOrDismissed ?? 0,
      completedCount,
    );

    const triageCount = effectivePendingReviewCount + unassignedConfirmedCount;
    const responsibilityGroups = groupIncidentsByResponsibility(
      incidents,
      responsibilityContext,
    );
    const siteGroups = groupIncidentsBySiteResponsibility(
      incidents,
      responsibilityContext,
    );
    const cameraGroups = groupIncidentsByCamera(
      incidents,
      responsibilityContext.resolveCameraLabel,
    );

    const activeOfficersCount = responsibilityGroups.officerGroups.filter(
      (g) => g.activeConfirmedItems.length > 0,
    ).length;

    // Đếm các nhóm điều phối [ĐIỀU PHỐI] gửi cho Officer (hoặc toàn bộ nếu là Manager/Admin)
    const seenGroupIds = new Set<string>();
    for (const notif of notifications) {
      const target = notificationIncidentTarget({
        incidentId: notif.incidentId,
        content: notif.content,
      });
      if (!target.group) continue;
      if (isOfficerRole && userId && target.group.assignedTo !== userId) {
        continue;
      }
      seenGroupIds.add(target.group.groupId);
    }

    const totalMyAssigned = myActiveCount + myCompletedCount;
    const myCompletionRate =
      totalMyAssigned > 0
        ? Math.round((myCompletedCount / totalMyAssigned) * 100)
        : 100;

    return {
      pendingReviewCount: effectivePendingReviewCount,
      unassignedConfirmedCount,
      triageCount,
      officerActiveCount,
      awaitingAcceptanceCount: effectiveAwaitingAcceptanceCount,
      completedCount: effectiveCompletedCount,
      openPipelineCount:
        triageCount + officerActiveCount + effectiveAwaitingAcceptanceCount,
      managerActionCount: triageCount + effectiveAwaitingAcceptanceCount,
      managerGroupsCount: responsibilityGroups.managerGroups.length,
      officerGroupsCount: responsibilityGroups.officerGroups.length,
      activeOfficersCount,
      siteGroupsCount: siteGroups.length,
      cameraGroupsCount: cameraGroups.length,
      myActiveCount,
      myCompletedCount,
      myCompletionRate,
      dispatchedGroupsCount: seenGroupIds.size,
    };
  }, [incidents, statusTotals, responsibilityContext, userId, notifications, isOfficerRole]);

  const roleHeader = isAdminRole
    ? {
      badge: isVietnamese
        ? "Điều phối & Công việc • Góc nhìn ADMIN"
        : "Dispatch & Tasks • ADMIN Oversight",
      title: isVietnamese
        ? "Giám sát Nhóm Sự cố & Trách nhiệm Giải quyết"
        : "Incident Groups & Accountability Oversight",
      subtitle: isVietnamese
        ? "Tổng hợp sự cố theo Nhân sự chịu trách nhiệm (Manager / Officer), Công trường và Cụm Camera"
        : "Aggregate incidents by responsible personnel (Manager / Officer), site, and camera cluster",
      heroLabel: isVietnamese ? "Hồ sơ đang mở" : "Open pipeline",
      heroValue: summary.openPipelineCount,
      heroToneClass: "text-primary bg-primary/10 border-primary/25",
      ctaText: isVietnamese
        ? "Mở không gian Giám sát Nhóm & Trách nhiệm"
        : "Open Groups & Accountability Workspace",
    }
    : isOfficerRole
      ? {
        badge: isVietnamese
          ? "Điều phối & Công việc • Cán bộ Hiện trường (OFFICER)"
          : "Dispatch & Tasks • Field Safety Officer",
        title: isVietnamese
          ? "Bàn Công việc Hiện trường (Việc giao cho tôi)"
          : "My Field Assignments & Remediation Board",
        subtitle: isVietnamese
          ? "Chỉ hiển thị các nhóm sự cố và công việc đã được Safety Manager thẩm duyệt và phân công cho bạn"
          : "Displays only incident groups and tasks reviewed and dispatched directly to you",
        heroLabel: isVietnamese ? "Cần tôi xử lý" : "Needs my action",
        heroValue: summary.myActiveCount,
        heroToneClass:
          summary.myActiveCount > 0
            ? "text-warning bg-warning/10 border-warning/30"
            : "text-emerald-600 bg-emerald-500/10 border-emerald-500/25",
        ctaText: isVietnamese
          ? "Mở Bàn Việc giao cho tôi & Báo cáo khắc phục"
          : "Open My Assignments & Report Remediation",
      }
      : {
        badge: isVietnamese
          ? "Điều phối & Công việc • Quản lý An toàn (MANAGER)"
          : "Dispatch & Tasks • Safety Manager",
        title: isVietnamese
          ? "Bàn Điều phối & Nghiệm thu Sự cố Hàng loạt (3 Bước)"
          : "3-Step Batch Incident Dispatch & Acceptance Board",
        subtitle: isVietnamese
          ? "Quy trình 3 bước: (1) Duyệt AI & Giao Officer hàng loạt → (2) Theo dõi hiện trường → (3) Nghiệm thu & Đóng"
          : "3-step workflow: (1) Batch Review & Dispatch → (2) Track Field Progress → (3) Accept & Close",
        heroLabel: isVietnamese ? "Cần Quản lý xử lý" : "Manager action needed",
        heroValue: summary.managerActionCount,
        heroToneClass:
          summary.managerActionCount > 0
            ? "text-warning bg-warning/10 border-warning/30"
            : "text-primary bg-primary/10 border-primary/25",
        ctaText: isVietnamese
          ? "Vào Bàn Điều phối & Nghiệm thu Hàng loạt"
          : "Open Batch Dispatch & Acceptance Board",
      };

  return (
    <Link
      href={href}
      data-testid="incident-assignment-overview-card"
      data-role-view={
        isAdminRole ? "ADMIN" : isOfficerRole ? "SAFETY_OFFICER" : "SAFETY_MANAGER"
      }
      className="group relative block overflow-hidden rounded-[26px] sm:rounded-[32px] border border-white/80 bg-background p-1.5 shadow-[10px_10px_24px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light)] transition-all duration-500 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-[14px_20px_36px_var(--shadow-dark),-12px_-12px_28px_var(--shadow-light),0_0_32px_hsl(var(--primary)/0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 dark:border-white/10"
    >
      {/* INNER BEZEL SHELL (Creates luxury double-rim machined metal look) */}
      <div className="relative overflow-hidden rounded-[22px] sm:rounded-[27px] border border-[var(--shadow-dark)]/15 bg-background/95 p-4 sm:p-6">
        {/* 1. Tactical Micro-Grid Background (Fades smoothly toward edges) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.06] [background-image:radial-gradient(hsl(var(--primary))_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_at_top_right,black_30%,transparent_75%)]"
        />

        {/* 2. Top Specular Laser Edge (Primary -> Accent) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-10 top-0 h-[2px] rounded-full bg-gradient-to-r from-transparent via-primary to-accent opacity-70 transition-all duration-500 group-hover:inset-x-4 group-hover:opacity-100"
        />

        {/* 3. Hover Light Sweep Sheen */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-full top-0 block h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition-all duration-1000 group-hover:left-[125%] group-hover:opacity-100 dark:via-white/5"
        />

        {/* 4. Ambient Plasma Orbs (Primary + Accent) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-14 -top-14 h-48 w-48 rounded-full bg-gradient-to-br from-primary/25 via-accent/20 to-transparent blur-3xl transition-transform duration-700 group-hover:scale-125"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-16 left-1/4 h-40 w-40 rounded-full bg-accent/15 blur-3xl opacity-50 transition-opacity duration-500 group-hover:opacity-90"
        />

        {/* ================= HEADER DECK: IDENTITY & TELEMETRY CORE ================= */}
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Machined Icon Pod + Role Identity */}
          <div className="flex items-start gap-4 min-w-0">
            {/* Multi-tier Neumorphic Icon Housing */}
            <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-[20px] border border-white/90 bg-background shadow-[6px_6px_12px_var(--shadow-dark),-6px_-6px_12px_var(--shadow-light)] transition-transform duration-500 group-hover:scale-105 group-hover:rotate-[2deg] dark:border-white/10">
              {/* Recessed inner socket */}
              <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-primary/5 to-accent/25 text-primary shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
                <ClipboardCheck className="h-6 w-6" strokeWidth={2.2} />
              </div>

              {/* Live Radar Beacon */}
              <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-80" />
                <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-background bg-gradient-to-tr from-primary to-accent shadow-[0_0_8px_hsl(var(--primary))]" />
              </span>
            </div>

            {/* Titles & Tactical Tags */}
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                {/* Role Badge */}
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-gradient-to-r from-primary/15 via-primary/10 to-accent/20 px-3 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-primary shadow-[0_2px_8px_hsl(var(--primary)/0.12)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-primary to-accent" />
                  {roleHeader.badge}
                </span>

                {/* Admin Quick Telemetry Pills */}
                {isAdminRole && (
                  <div className="hidden md:inline-flex items-center gap-2 rounded-full border border-white/50 bg-background px-3 py-0.5 text-[11px] font-semibold text-muted-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] dark:border-white/5">
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="h-3 w-3 text-primary" />
                      <strong className="font-mono font-extrabold text-foreground">
                        {summary.siteGroupsCount}
                      </strong>{" "}
                      {isVietnamese ? "công trường" : "sites"}
                    </span>
                    <span className="h-3 w-px bg-border" />
                    <span className="inline-flex items-center gap-1">
                      <Camera className="h-3 w-3 text-accent-foreground dark:text-accent" />
                      <strong className="font-mono font-extrabold text-foreground">
                        {summary.cameraGroupsCount}
                      </strong>{" "}
                      {isVietnamese ? "cụm camera" : "clusters"}
                    </span>
                  </div>
                )}
              </div>

              <h2 className="text-base sm:text-xl font-black tracking-tight text-foreground transition-all duration-300 group-hover:bg-gradient-to-r group-hover:from-primary group-hover:via-primary group-hover:to-accent-foreground dark:group-hover:to-accent group-hover:bg-clip-text group-hover:text-transparent">
                {roleHeader.title}
              </h2>

              <p className="text-xs sm:text-[13px] font-medium text-muted-foreground line-clamp-1">
                {roleHeader.subtitle}
              </p>
            </div>
          </div>

          {/* Right: Cockpit Telemetry Counter Well */}
          <div className="flex items-center justify-between lg:justify-end shrink-0">
            <div
              className={`relative flex items-center gap-4 rounded-[20px] border border-white/60 bg-background px-4 py-2.5 shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_var(--shadow-light)] transition-all duration-300 group-hover:border-primary/35 dark:border-white/5 ${roleHeader.heroToneClass}`}
            >
              {/* Glowing Vertical Energy Strip */}
              <div className="h-9 w-1.5 rounded-full bg-gradient-to-b from-primary via-accent to-primary shadow-[0_0_10px_hsl(var(--primary)/0.5)]" />

              <div className="text-left lg:text-right">
                <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-foreground/80">
                  {roleHeader.heroLabel}
                </span>
                <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-bold text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                  {isVietnamese ? "Sẵn sàng điều phối" : "Live dispatch ready"}
                </span>
              </div>

              {/* Extruded Digital Readout Plate */}
              <div className="relative flex h-12 min-w-[3.5rem] items-center justify-center rounded-2xl border border-white/80 bg-gradient-to-br from-background via-background to-primary/10 px-3 shadow-[4px_4px_8px_var(--shadow-dark),-4px_-4px_8px_var(--shadow-light)] dark:border-white/10">
                {loading ? (
                  <Skeleton className="h-7 w-10 rounded-lg" />
                ) : (
                  <span className="bg-gradient-to-br from-primary via-primary to-accent-foreground dark:to-accent bg-clip-text font-mono text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-transparent drop-shadow-sm">
                    <AnimatedNumber value={roleHeader.heroValue} />
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ================= RECESSED COMMAND TRAY: 3 TELEMETRY MODULES ================= */}
        {(() => {
          const pillars = isAdminRole
            ? [
              {
                key: "admin-1",
                step: "01",
                icon: AlertTriangle,
                title: isVietnamese
                  ? "Đầu vào • Manager Triage"
                  : "Intake • Manager Triage",
                value: summary.triageCount,
                desc: isVietnamese
                  ? `${summary.pendingReviewCount} chờ duyệt AI • ${summary.unassignedConfirmedCount} chưa giao Officer`
                  : `${summary.pendingReviewCount} pending review • ${summary.unassignedConfirmedCount} unassigned`,
                gradient: "from-amber-400 via-orange-500 to-amber-500",
                textColor: "text-amber-600 dark:text-amber-400",
                glowColor: "shadow-[0_0_12px_rgba(245,158,11,0.35)]",
              },
              {
                key: "admin-2",
                step: "02",
                icon: UserCheck,
                title: isVietnamese
                  ? "Hiện trường • Officer Xử lý"
                  : "Field • Officer Active",
                value: summary.officerActiveCount,
                desc: isVietnamese
                  ? `Đang giao cho ${summary.activeOfficersCount} Cán bộ an toàn xử lý`
                  : `Assigned across ${summary.activeOfficersCount} active Safety Officers`,
                gradient: "from-primary via-accent to-primary",
                textColor: "text-primary",
                glowColor: "shadow-[0_0_12px_hsl(var(--primary)/0.35)]",
              },
              {
                key: "admin-3",
                step: "03",
                icon: ClipboardCheck,
                title: isVietnamese
                  ? "Đầu ra • Chờ Nghiệm thu"
                  : "Closure • Final Acceptance",
                value: summary.awaitingAcceptanceCount,
                desc: isVietnamese
                  ? `Chờ nghiệm thu • ${summary.completedCount} sự cố đã đóng`
                  : `Awaiting closure • ${summary.completedCount} closed`,
                gradient: "from-emerald-400 via-teal-500 to-emerald-500",
                textColor: "text-emerald-600 dark:text-emerald-400",
                glowColor: "shadow-[0_0_12px_rgba(16,185,129,0.35)]",
              },
            ]
            : isOfficerRole
              ? [
                {
                  key: "officer-1",
                  step: "01",
                  icon: ShieldAlert,
                  title: isVietnamese
                    ? "Cần tôi khắc phục ngay"
                    : "Needs My Remediation",
                  value: summary.myActiveCount,
                  desc: isVietnamese
                    ? "Trạng thái CONFIRMED & phân công trực tiếp cho bạn"
                    : "CONFIRMED status actively assigned to you",
                  gradient: "from-amber-400 via-orange-500 to-amber-500",
                  textColor: "text-amber-600 dark:text-amber-400",
                  glowColor: "shadow-[0_0_12px_rgba(245,158,11,0.35)]",
                },
                {
                  key: "officer-2",
                  step: "02",
                  icon: Layers,
                  title: isVietnamese
                    ? "Đợt / Nhóm giao việc"
                    : "Dispatched Work Groups",
                  value: summary.dispatchedGroupsCount,
                  desc: isVietnamese
                    ? "Các đợt điều phối hàng loạt từ Quản lý An toàn"
                    : "Batch dispatch groups from Safety Manager",
                  gradient: "from-primary via-accent to-primary",
                  textColor: "text-primary",
                  glowColor: "shadow-[0_0_12px_hsl(var(--primary)/0.35)]",
                },
                {
                  key: "officer-3",
                  step: "03",
                  icon: CheckCircle2,
                  title: isVietnamese
                    ? "Đã báo cáo khắc phục"
                    : "Remediated by Me",
                  value: summary.myCompletedCount,
                  desc: isVietnamese
                    ? `Hiệu suất hoàn thành cá nhân: ${summary.myCompletionRate}%`
                    : `Your completion rate: ${summary.myCompletionRate}%`,
                  gradient: "from-emerald-400 via-teal-500 to-emerald-500",
                  textColor: "text-emerald-600 dark:text-emerald-400",
                  glowColor: "shadow-[0_0_12px_rgba(16,185,129,0.35)]",
                },
              ]
              : [
                {
                  key: "mgr-1",
                  step: "01",
                  icon: Send,
                  title: isVietnamese
                    ? "Bước 1 • Duyệt & Giao việc"
                    : "Step 1 • Review & Dispatch",
                  value: summary.triageCount,
                  desc: isVietnamese
                    ? `${summary.pendingReviewCount} chờ duyệt AI • ${summary.unassignedConfirmedCount} chưa giao`
                    : `${summary.pendingReviewCount} pending review • ${summary.unassignedConfirmedCount} unassigned`,
                  gradient: "from-amber-400 via-orange-500 to-amber-500",
                  textColor: "text-amber-600 dark:text-amber-400",
                  glowColor: "shadow-[0_0_12px_rgba(245,158,11,0.35)]",
                },
                {
                  key: "mgr-2",
                  step: "02",
                  icon: UserCheck,
                  title: isVietnamese
                    ? "Bước 2 • Officer Xử lý"
                    : "Step 2 • Officer Field Work",
                  value: summary.officerActiveCount,
                  desc: isVietnamese
                    ? "Theo dõi tiến độ hiện trường & đổi người phụ trách"
                    : "Track field progress & reassign officers",
                  gradient: "from-primary via-accent to-primary",
                  textColor: "text-primary",
                  glowColor: "shadow-[0_0_12px_hsl(var(--primary)/0.35)]",
                },
                {
                  key: "mgr-3",
                  step: "03",
                  icon: ShieldCheck,
                  title: isVietnamese
                    ? "Bước 3 • Nghiệm thu & Đóng"
                    : "Step 3 • Accept & Close",
                  value: summary.awaitingAcceptanceCount,
                  desc: isVietnamese
                    ? "Officer đã nộp báo cáo, chờ Quản lý xác nhận đóng"
                    : "Remediation submitted, awaiting closure",
                  gradient: "from-emerald-400 via-teal-500 to-emerald-500",
                  textColor: "text-emerald-600 dark:text-emerald-400",
                  glowColor: "shadow-[0_0_12px_rgba(16,185,129,0.35)]",
                },
              ];

          const totalVolume = Math.max(
            1,
            pillars.reduce((acc, item) => acc + (Number(item.value) || 0), 0)
          );

          return (
            <div className="relative mt-5 rounded-[22px] border border-white/40 bg-background/70 p-2.5 sm:p-3 shadow-[inset_4px_4px_10px_var(--shadow-dark),inset_-4px_-4px_10px_var(--shadow-light)] dark:border-white/5">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
                {pillars.map((pillar) => {
                  const IconComponent = pillar.icon;
                  const numericVal = Number(pillar.value) || 0;
                  const ratioPercent =
                    numericVal > 0
                      ? Math.max(12, Math.min(100, Math.round((numericVal / totalVolume) * 100)))
                      : 0;

                  return (
                    <div
                      key={pillar.key}
                      className="group/card relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/75 bg-background p-3.5 shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 dark:border-white/10"
                    >
                      {/* Top Row: Step Tag + Icon + Digital Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-background shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] ${pillar.textColor}`}
                          >
                            <IconComponent className="h-3.5 w-3.5" strokeWidth={2.3} />
                          </span>
                          <span
                            className={`truncate text-[11px] font-black uppercase tracking-wider ${pillar.textColor}`}
                          >
                            {pillar.title}
                          </span>
                        </div>

                        {/* Recessed Counter Well */}
                        <span
                          className={`shrink-0 rounded-xl bg-background px-2.5 py-0.5 font-mono text-sm font-black tabular-nums shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] ${pillar.textColor}`}
                        >
                          {loading ? "..." : pillar.value}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="mt-2.5 text-[11px] font-medium leading-relaxed text-muted-foreground line-clamp-1">
                        {pillar.desc}
                      </p>

                      {/* Debossed Micro-Progress Gauge */}
                      <div className="mt-3 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-background shadow-[inset_1px_1px_3px_var(--shadow-dark),inset_-1px_-1px_3px_var(--shadow-light)]">
                          <div
                            style={{ width: loading ? "35%" : `${ratioPercent}%` }}
                            className={`h-full rounded-full bg-gradient-to-r ${pillar.gradient} ${pillar.glowColor} transition-all duration-700`}
                          />
                        </div>
                        <span className="font-mono text-[9px] font-bold text-muted-foreground/80 tabular-nums">
                          {loading ? "--" : `${ratioPercent}%`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ================= BOTTOM CONTROL DOCK: METADATA & VIP CTA ================= */}
        <div className="relative mt-4 flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            {isAdminRole ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-background px-3 py-1 text-[10px] font-extrabold text-foreground shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)] dark:border-white/10">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  <span>
                    {summary.managerGroupsCount}{" "}
                    {isVietnamese ? "nhóm Manager" : "Manager groups"}
                  </span>
                  <span className="text-primary">•</span>
                  <span>
                    {summary.officerGroupsCount}{" "}
                    {isVietnamese ? "nhóm Officer" : "Officer groups"}
                  </span>
                </span>
                <span className="hidden md:inline font-medium text-muted-foreground/90">
                  {isVietnamese
                    ? "Chế độ gom nhóm: Nhân sự • Công trường • Cụm Camera"
                    : "Grouping modes: Personnel • Site • Camera Cluster"}
                </span>
              </>
            ) : isOfficerRole ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-background px-3 py-1 text-[10px] font-extrabold text-foreground shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)] dark:border-white/10">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>{isVietnamese ? "Tiến độ cá nhân:" : "Completion:"}</span>
                  <span className="font-mono text-primary">
                    {summary.myCompletionRate}%
                  </span>
                </span>
                <span className="hidden md:inline font-medium text-muted-foreground/90">
                  {isVietnamese
                    ? "Báo cáo khắc phục hàng loạt & không gian xử lý từng bước"
                    : "Batch remediation reporting & step-by-step workspace"}
                </span>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-background px-3 py-1 text-[10px] font-extrabold text-foreground shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)] dark:border-white/10">
                  <Camera className="h-3.5 w-3.5 text-primary" />
                  <span className="font-mono">{summary.cameraGroupsCount}</span>
                  <span>{isVietnamese ? "cụm Camera" : "Camera clusters"}</span>
                </span>
                <span className="hidden md:inline font-medium text-muted-foreground/90">
                  {isVietnamese
                    ? "Gom theo cụm Camera để duyệt, giao việc & nghiệm thu 1-click"
                    : "Grouped by Camera cluster for 1-click review, dispatch & closure"}
                </span>
              </>
            )}
          </div>

          {/* Tactile VIP CTA Pill (Extruded -> Luminous Primary-Accent Gradient on Hover) */}
          <span className="relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-primary/30 bg-background px-4 py-2 text-xs font-black tracking-wide text-primary shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)] transition-all duration-300 group-hover:border-transparent group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-accent group-hover:text-primary-foreground group-hover:shadow-[0_6px_20px_hsl(var(--primary)/0.4)]">
            <span>{roleHeader.ctaText}</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 transition-colors duration-300 group-hover:bg-white/20">
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}
