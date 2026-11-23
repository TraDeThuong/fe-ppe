"use client";

import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Layers,
  Send,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { StatsCard, type StatsCardTone } from "@/components/ui/stats-cards";
import { useLocale } from "@/providers/locale-provider";
import type { AssignmentIncidentTotals } from "@/hooks/incidents/use-assignment-incidents";
import type {
  AdminGroupMode,
  AssignmentRoleView,
  CategorizedAssignments,
  ManagerTabKey,
  OfficerTabKey,
} from "./types";

export interface AssignmentKpiSummaryProps {
  roleView: AssignmentRoleView;
  isAdminRole: boolean;
  adminInterventionMode: boolean;
  loading?: boolean;
  totalIncidentsCount: number;
  categorized: CategorizedAssignments;
  statusTotals?: Partial<AssignmentIncidentTotals>;
  activeOfficersCount: number;
  dispatchedGroupsCount: number;
  adminGroupMode: AdminGroupMode;
  onAdminGroupModeChange: (mode: AdminGroupMode) => void;
  managerTab: ManagerTabKey;
  onManagerTabChange: (tab: ManagerTabKey) => void;
  officerTab: OfficerTabKey;
  onOfficerTabChange: (tab: OfficerTabKey) => void;
}

interface KpiCardConfig {
  key: string;
  title: string;
  value: number | string;
  icon: LucideIcon;
  tone: StatsCardTone;
  description: string;
  active?: boolean;
  activeTextClass: string;
  hoverBorderClass: string;
  footerLabel: string;
  onClick?: () => void;
}

// Hiệu ứng chìm sâu (neumorphic sunken) đồng bộ với IncidentKpiSummary & CameraKpiSummary
const SUNKEN_CLASS =
  "!translate-y-1.5 !shadow-[inset_6px_6px_14px_var(--shadow-dark),inset_-6px_-6px_14px_var(--shadow-light),inset_2px_2px_4px_rgba(0,0,0,0.18)] dark:!shadow-[inset_6px_6px_16px_rgba(0,0,0,0.7),inset_-4px_-4px_10px_rgba(255,255,255,0.03)] hover:!translate-y-1.5 hover:!shadow-[inset_6px_6px_14px_var(--shadow-dark),inset_-6px_-6px_14px_var(--shadow-light),inset_2px_2px_4px_rgba(0,0,0,0.18)]";

export function AssignmentKpiSummary({
  roleView,
  isAdminRole,
  adminInterventionMode,
  loading = false,
  totalIncidentsCount,
  categorized,
  statusTotals,
  activeOfficersCount,
  dispatchedGroupsCount,
  adminGroupMode,
  onAdminGroupModeChange,
  managerTab,
  onManagerTabChange,
  officerTab,
  onOfficerTabChange,
}: AssignmentKpiSummaryProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const showAdminOversight = isAdminRole && !adminInterventionMode;
  const showOfficerView = roleView === "SAFETY_OFFICER";

  const pendingReviewCount = Math.max(
    statusTotals?.pendingReview ?? 0,
    categorized.pendingReview.length,
  );
  const unassignedConfirmedCount = categorized.unassignedConfirmed.length;
  const triageCount = pendingReviewCount + unassignedConfirmedCount;
  const assignedConfirmedCount = categorized.assignedConfirmed.length;
  const awaitingAcceptanceCount = Math.max(
    statusTotals?.resolved ?? 0,
    categorized.awaitingAcceptance.length,
  );
  const closedOrDismissedCount = Math.max(
    statusTotals?.closedOrDismissed ?? 0,
    categorized.closedOrDismissed.length,
  );
  const effectiveTotalIncidentsCount = Math.max(
    statusTotals?.total ?? 0,
    totalIncidentsCount,
  );

  const closedRate =
    effectiveTotalIncidentsCount > 0
      ? Math.round(
          (closedOrDismissedCount / effectiveTotalIncidentsCount) * 100,
        )
      : 100;

  const totalMyTasks =
    categorized.myActiveConfirmed.length + categorized.myCompleted.length;
  const myCompletionRate =
    totalMyTasks > 0
      ? Math.round((categorized.myCompleted.length / totalMyTasks) * 100)
      : 100;

  const cards: KpiCardConfig[] = showAdminOversight
    ? [
        {
          key: "admin-triage",
          title: isVietnamese
            ? "Trách nhiệm Manager (Đầu vào)"
            : "Manager Triage Backlog",
          value: triageCount,
          icon: AlertTriangle,
          tone: "warning",
          description: isVietnamese
            ? `${pendingReviewCount} chờ duyệt AI • ${unassignedConfirmedCount} chưa giao`
            : `${pendingReviewCount} pending AI • ${unassignedConfirmedCount} unassigned`,
          active: adminGroupMode === "responsibility",
          activeTextClass: "text-warning",
          hoverBorderClass: "hover:border-warning/30",
          footerLabel: isVietnamese ? "Theo Nhân sự" : "By Personnel",
          onClick: () => onAdminGroupModeChange("responsibility"),
        },
        {
          key: "admin-officer",
          title: isVietnamese
            ? "Trách nhiệm Officer (Hiện trường)"
            : "Officer Field Workload",
          value: assignedConfirmedCount,
          icon: UserCheck,
          tone: "primary",
          description: isVietnamese
            ? `Đang giao cho ${activeOfficersCount} Cán bộ an toàn`
            : `Assigned to ${activeOfficersCount} active officers`,
          active: adminGroupMode === "camera",
          activeTextClass: "text-primary",
          hoverBorderClass: "hover:border-primary/30",
          footerLabel: isVietnamese ? "Cụm Camera" : "Camera Clusters",
          onClick: () => onAdminGroupModeChange("camera"),
        },
        {
          key: "admin-acceptance",
          title: isVietnamese
            ? "Trách nhiệm Manager (Nghiệm thu)"
            : "Manager Final Acceptance",
          value: awaitingAcceptanceCount,
          icon: ClipboardCheck,
          tone: "success",
          description: isVietnamese
            ? "Officer đã khắc phục, chờ nghiệm thu đóng"
            : "Remediated by Officer, awaiting closure",
          active: adminGroupMode === "site",
          activeTextClass: "text-success",
          hoverBorderClass: "hover:border-success/30",
          footerLabel: isVietnamese ? "Theo Công trường" : "By Site",
          onClick: () => onAdminGroupModeChange("site"),
        },
        {
          key: "admin-completed",
          title: isVietnamese ? "Đã Khép Hồ Sơ" : "Closed Records",
          value: closedOrDismissedCount,
          icon: ShieldCheck,
          tone: "info",
          description: isVietnamese
            ? `${closedRate}% hoàn tất trên ${effectiveTotalIncidentsCount} sự cố`
            : `${closedRate}% closed across ${effectiveTotalIncidentsCount} records`,
          activeTextClass: "text-info",
          hoverBorderClass: "hover:border-info/30",
          footerLabel: `${closedRate}%`,
        },
      ]
    : showOfficerView
      ? [
          {
            key: "officer-pending",
            title: isVietnamese
              ? "Sự cố cần tôi khắc phục"
              : "Needs My Remediation",
            value: categorized.myActiveConfirmed.length,
            icon: ShieldAlert,
            tone: "warning",
            description: isVietnamese
              ? "Trạng thái CONFIRMED & gán trực tiếp cho bạn"
              : "CONFIRMED & actively assigned to you",
            active: officerTab === "pending",
            activeTextClass: "text-warning",
            hoverBorderClass: "hover:border-warning/30",
            footerLabel:
              officerTab === "pending"
                ? isVietnamese
                  ? "Đang xem"
                  : "Viewing"
                : isVietnamese
                  ? "Mở danh sách"
                  : "View list",
            onClick: () => onOfficerTabChange("pending"),
          },
          {
            key: "officer-groups",
            title: isVietnamese
              ? "Nhóm / Đợt giao việc"
              : "Dispatched Work Groups",
            value: dispatchedGroupsCount,
            icon: Layers,
            tone: "primary",
            description: isVietnamese
              ? "Các đợt điều phối hàng loạt từ Quản lý"
              : "Batch dispatch groups from Manager",
            activeTextClass: "text-primary",
            hoverBorderClass: "hover:border-primary/30",
            footerLabel: isVietnamese ? "Theo đợt" : "By batch",
          },
          {
            key: "officer-completed",
            title: isVietnamese
              ? "Tôi đã báo cáo khắc phục"
              : "Remediated by Me",
            value: categorized.myCompleted.length,
            icon: CheckCircle2,
            tone: "success",
            description: isVietnamese
              ? "Đang chờ Quản lý nghiệm thu hoặc đã đóng"
              : "Awaiting Manager acceptance or closed",
            active: officerTab === "completed",
            activeTextClass: "text-success",
            hoverBorderClass: "hover:border-success/30",
            footerLabel:
              officerTab === "completed"
                ? isVietnamese
                  ? "Đang xem"
                  : "Viewing"
                : isVietnamese
                  ? "Xem lịch sử"
                  : "View history",
            onClick: () => onOfficerTabChange("completed"),
          },
          {
            key: "officer-rate",
            title: isVietnamese ? "Tỷ lệ hoàn thành" : "Completion Rate",
            value: `${myCompletionRate}%`,
            icon: TrendingUp,
            tone: "info",
            description: isVietnamese
              ? `${categorized.myCompleted.length}/${totalMyTasks} việc giao cho bạn`
              : `${categorized.myCompleted.length}/${totalMyTasks} assigned tasks`,
            activeTextClass: "text-info",
            hoverBorderClass: "hover:border-info/30",
            footerLabel: isVietnamese ? "Cá nhân" : "Personal",
          },
        ]
      : [
          {
            key: "mgr-triage",
            title: isVietnamese
              ? "Bước 1 • Duyệt & Giao việc"
              : "Step 1 • Review & Dispatch",
            value: triageCount,
            icon: Send,
            tone: "warning",
            description: isVietnamese
              ? `${pendingReviewCount} chờ duyệt AI • ${unassignedConfirmedCount} chưa giao`
              : `${pendingReviewCount} pending AI • ${unassignedConfirmedCount} unassigned`,
            active: managerTab === "triage",
            activeTextClass: "text-warning",
            hoverBorderClass: "hover:border-warning/30",
            footerLabel:
              managerTab === "triage"
                ? isVietnamese
                  ? "Đang chọn"
                  : "Active"
                : isVietnamese
                  ? "Chuyển tới"
                  : "Open step",
            onClick: () => onManagerTabChange("triage"),
          },
          {
            key: "mgr-dispatched",
            title: isVietnamese
              ? "Bước 2 • Đang giao Officer"
              : "Step 2 • Field Progress",
            value: assignedConfirmedCount,
            icon: UserCheck,
            tone: "primary",
            description: isVietnamese
              ? `${activeOfficersCount} Cán bộ an toàn đang khắc phục`
              : `${activeOfficersCount} officers currently remediating`,
            active: managerTab === "dispatched",
            activeTextClass: "text-primary",
            hoverBorderClass: "hover:border-primary/30",
            footerLabel:
              managerTab === "dispatched"
                ? isVietnamese
                  ? "Đang chọn"
                  : "Active"
                : isVietnamese
                  ? "Chuyển tới"
                  : "Open step",
            onClick: () => onManagerTabChange("dispatched"),
          },
          {
            key: "mgr-acceptance",
            title: isVietnamese
              ? "Bước 3 • Chờ Nghiệm thu"
              : "Step 3 • Accept & Close",
            value: awaitingAcceptanceCount,
            icon: ClipboardCheck,
            tone: "success",
            description: isVietnamese
              ? "Officer đã báo cáo khắc phục xong"
              : "Officer submitted remediation report",
            active: managerTab === "acceptance",
            activeTextClass: "text-success",
            hoverBorderClass: "hover:border-success/30",
            footerLabel:
              managerTab === "acceptance"
                ? isVietnamese
                  ? "Đang chọn"
                  : "Active"
                : isVietnamese
                  ? "Chuyển tới"
                  : "Open step",
            onClick: () => onManagerTabChange("acceptance"),
          },
          {
            key: "mgr-closed",
            title: isVietnamese ? "Đã Khép Hồ Sơ" : "Closed Records",
            value: closedOrDismissedCount,
            icon: ShieldCheck,
            tone: "info",
            description: isVietnamese
              ? `${closedRate}% hoàn tất trên ${effectiveTotalIncidentsCount} hồ sơ`
              : `${closedRate}% completed of ${effectiveTotalIncidentsCount} records`,
            activeTextClass: "text-info",
            hoverBorderClass: "hover:border-info/30",
            footerLabel: `${closedRate}%`,
          },
        ];

  return (
    <section
      aria-label={
        isVietnamese
          ? "Tóm tắt chỉ số điều phối sự cố"
          : "Incident assignment KPI summary"
      }
      className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4"
    >
      {cards.map((card) => (
        <StatsCard
          key={card.key}
          title={card.title}
          value={card.value}
          icon={card.icon}
          variant="soft-extruded"
          tone={card.tone}
          showGlow={false}
          loading={loading}
          description={card.description}
          onClick={card.onClick}
          className={`transition-all duration-200 ${
            card.onClick ? "cursor-pointer" : ""
          } ${card.active ? SUNKEN_CLASS : card.hoverBorderClass}`}
          footer={
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold transition-colors ${
                card.active ? card.activeTextClass : "text-muted-foreground"
              }`}
            >
              {card.footerLabel}
            </span>
          }
        />
      ))}
    </section>
  );
}
