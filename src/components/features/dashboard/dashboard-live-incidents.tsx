"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  Layers,
  Loader2,
  Radio,
  Wrench,
  X,
  XCircle,
} from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import { Button } from "@/components/ui/button";
import { IncidentSeverityBadge } from "@/components/features/incidents/incident-severity-badge";
import { IncidentStatusBadge } from "@/components/features/incidents/incident-status-badge";
import { useLocale } from "@/providers/locale-provider";
import { resolveEvidenceUrl } from "@/lib/evidence-url";
import {
  clusterIncidentsByPerson,
  type IncidentAggregationMode,
  type IncidentCluster,
} from "@/lib/incident-cluster-engine";
import type {
  IncidentItem,
  IncidentSeverity,
  IncidentStatus,
} from "@/types";

export type UnresolvedIncidentFilter = "ALL" | "PENDING_REVIEW" | "CONFIRMED";

export interface DashboardLiveIncidentsProps {
  incidents: IncidentItem[];
  totalPendingCount?: number | null;
  totalConfirmedCount?: number | null;
  groupingMode?: IncidentAggregationMode;
  loading?: boolean;
  error?: boolean;
  viewAllHref?: string;
  highlightedId?: string | null;
  onReview?: (incident: IncidentItem) => void;
  onResolve?: (incident: IncidentItem) => void;
  onBatchReview?: (
    ids: string[],
    action: "CONFIRM" | "REJECT",
    resolutionNote?: string,
  ) => Promise<void>;
  batchReviewPending?: boolean;
  isRealtimeConnected?: boolean;
  canReview?: boolean;
  canResolve?: boolean;
  dateRangeLabel?: string | null;
}

const VIOLATION_LABELS: Record<string, { vi: string; en: string }> = {
  NO_HELMET: { vi: "Không đội mũ", en: "No Helmet" },
  NO_VEST: { vi: "Không áo phản quang", en: "No Safety Vest" },
  RESTRICTED_AREA: { vi: "Xâm nhập vùng cấm", en: "Restricted Area" },
  MULTI_VIOLATION: { vi: "Vi phạm phức hợp", en: "Multi Violation" },
};

const SEVERITY_PRIORITY: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

const VN_TIME_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const VN_DATE_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
});

function formatExactVnTimestamp(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (!Number.isFinite(d.getTime())) return dateStr;
    return `${VN_TIME_FORMATTER.format(d)} - ${VN_DATE_FORMATTER.format(d)}`;
  } catch {
    return dateStr;
  }
}

function formatIncidentTimeLabel(
  dateStr: string,
  isVietnamese: boolean,
): { display: string; exact: string } {
  const exact = formatExactVnTimestamp(dateStr);
  try {
    const time = new Date(dateStr).getTime();
    if (!Number.isFinite(time)) return { display: dateStr, exact: dateStr };

    const diffMs = Math.max(0, Date.now() - time);
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);

    if (diffSec < 60) {
      return {
        display: isVietnamese ? `Vừa xong · ${exact}` : `Just now · ${exact}`,
        exact,
      };
    }
    if (diffMin < 60) {
      return {
        display: isVietnamese
          ? `${diffMin} phút trước · ${exact}`
          : `${diffMin}m ago · ${exact}`,
        exact,
      };
    }
    if (diffHours < 24) {
      return {
        display: isVietnamese
          ? `${diffHours} giờ trước · ${exact}`
          : `${diffHours}h ago · ${exact}`,
        exact,
      };
    }
    return { display: exact, exact };
  } catch {
    return { display: dateStr, exact: dateStr };
  }
}

function resolveCameraLabel(inc: IncidentItem): string {
  if (inc.cameraName && inc.cameraName.trim()) return inc.cameraName.trim();
  if (inc.cameraCode && inc.cameraCode.trim()) return inc.cameraCode.trim();
  if (inc.cameraId && inc.cameraId.trim()) {
    return `Camera #${inc.cameraId.slice(0, 6)}`;
  }
  return "Camera";
}

export function DashboardLiveIncidents({
  incidents,
  totalPendingCount,
  totalConfirmedCount,
  groupingMode = "clustered",
  loading = false,
  error = false,
  viewAllHref = "/incidents",
  highlightedId,
  onReview,
  onResolve,
  onBatchReview,
  batchReviewPending = false,
  isRealtimeConnected = false,
  canReview = true,
  canResolve = false,
  dateRangeLabel,
}: DashboardLiveIncidentsProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const [statusFilter, setStatusFilter] =
    useState<UnresolvedIncidentFilter>("ALL");
  const [expandedClusters, setExpandedClusters] = useState<Record<string, boolean>>({});

  // Keep only unresolved incidents (PENDING_REVIEW + CONFIRMED), sorted by severity & newest first
  const unresolvedIncidents = useMemo(() => {
    return incidents
      .filter(
        (inc) =>
          inc.status === "PENDING_REVIEW" || inc.status === "CONFIRMED",
      )
      .sort((a, b) => {
        const sevA = SEVERITY_PRIORITY[a.severity] ?? 9;
        const sevB = SEVERITY_PRIORITY[b.severity] ?? 9;
        if (sevA !== sevB) return sevA - sevB;
        return Date.parse(b.detectedAt) - Date.parse(a.detectedAt);
      });
  }, [incidents]);

  const unresolvedClusters = useMemo<IncidentCluster[]>(() => {
    if (groupingMode === "raw") {
      return unresolvedIncidents.map((inc) => ({
        clusterId: inc.id,
        primary: inc,
        items: [inc],
        signals: [],
        rawCount: 1,
        incidentIds: [inc.id],
        isMultiViolation: inc.violationType === "MULTI_VIOLATION",
        effectiveViolationType: inc.violationType,
        violationCodes: [inc.violationType],
        effectiveSeverity: inc.severity,
        effectiveStatus: inc.status,
        earliestDetectedAt: inc.detectedAt,
        latestDetectedAt: inc.detectedAt,
        effectiveResolvedAt: inc.resolvedAt ?? null,
        personTrackId: null,
        cameraId: inc.cameraId,
        matchMethod: "SINGLE",
        matchReasons: [],
        bestSpatialIoUPct: null,
      }));
    }
    return clusterIncidentsByPerson(unresolvedIncidents).sort((a, b) => {
      const sevA = SEVERITY_PRIORITY[a.effectiveSeverity] ?? 9;
      const sevB = SEVERITY_PRIORITY[b.effectiveSeverity] ?? 9;
      if (sevA !== sevB) return sevA - sevB;
      return Date.parse(b.latestDetectedAt) - Date.parse(a.latestDetectedAt);
    });
  }, [unresolvedIncidents, groupingMode]);

  const pendingClusters = useMemo(
    () =>
      unresolvedClusters.filter(
        (cl) => cl.effectiveStatus === "PENDING_REVIEW",
      ),
    [unresolvedClusters],
  );
  const confirmedClusters = useMemo(
    () =>
      unresolvedClusters.filter((cl) => cl.effectiveStatus === "CONFIRMED"),
    [unresolvedClusters],
  );

  const visibleClusters = useMemo(() => {
    if (statusFilter === "PENDING_REVIEW") return pendingClusters;
    if (statusFilter === "CONFIRMED") return confirmedClusters;
    return unresolvedClusters;
  }, [statusFilter, pendingClusters, confirmedClusters, unresolvedClusters]);

  const rawPendingItemsCount = useMemo(
    () => unresolvedIncidents.filter((inc) => inc.status === "PENDING_REVIEW").length,
    [unresolvedIncidents],
  );
  const rawConfirmedItemsCount = useMemo(
    () => unresolvedIncidents.filter((inc) => inc.status === "CONFIRMED").length,
    [unresolvedIncidents],
  );

  const pendingCountDisplay =
    groupingMode === "clustered"
      ? pendingClusters.length
      : (totalPendingCount ?? rawPendingItemsCount);
  const confirmedCountDisplay =
    groupingMode === "clustered"
      ? confirmedClusters.length
      : (totalConfirmedCount ?? rawConfirmedItemsCount);
  const totalUnresolvedDisplay = pendingCountDisplay + confirmedCountDisplay;

  const pendingIds = useMemo(
    () =>
      visibleClusters.flatMap((cl) =>
        cl.items
          .filter((inc) => inc.status === "PENDING_REVIEW")
          .map((inc) => inc.id),
      ),
    [visibleClusters],
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [batchError, setBatchError] = useState<string | null>(null);

  const activeSelectedIds = useMemo(() => {
    const pendingSet = new Set(pendingIds);
    return selectedIds.filter((id) => pendingSet.has(id));
  }, [selectedIds, pendingIds]);

  const batchEnabled = Boolean(canReview && onBatchReview && pendingIds.length > 0);
  const allPendingSelected =
    pendingIds.length > 0 && activeSelectedIds.length === pendingIds.length;

  const toggleSelectMany = (ids: string[]) => {
    setBatchError(null);
    setSelectedIds((prev) => {
      const allIn = ids.every((id) => prev.includes(id));
      if (allIn) {
        const drop = new Set(ids);
        return prev.filter((item) => !drop.has(item));
      }
      return Array.from(new Set([...prev, ...ids]));
    });
  };

  const toggleSelectAllPending = () => {
    setBatchError(null);
    if (allPendingSelected) {
      setSelectedIds([]);
      setRejectMode(false);
    } else {
      setSelectedIds(pendingIds);
    }
  };

  const handleBatchConfirm = async () => {
    if (!onBatchReview || activeSelectedIds.length === 0) return;
    setBatchError(null);
    try {
      await onBatchReview(activeSelectedIds, "CONFIRM");
      setSelectedIds([]);
      setRejectMode(false);
      setRejectNote("");
    } catch (err: unknown) {
      setBatchError(
        err instanceof Error
          ? err.message
          : isVietnamese
            ? "Không thể duyệt hàng loạt sự cố."
            : "Failed to batch review incidents.",
      );
    }
  };

  const handleBatchRejectSubmit = async () => {
    if (!onBatchReview || activeSelectedIds.length === 0) return;
    const trimmed = rejectNote.trim();
    if (trimmed.length < 3) {
      setBatchError(
        isVietnamese
          ? "Vui lòng nhập lý do bác bỏ (tối thiểu 3 ký tự)."
          : "Please enter a dismissal reason (at least 3 characters).",
      );
      return;
    }
    setBatchError(null);
    try {
      await onBatchReview(activeSelectedIds, "REJECT", trimmed);
      setSelectedIds([]);
      setRejectMode(false);
      setRejectNote("");
    } catch (err: unknown) {
      setBatchError(
        err instanceof Error
          ? err.message
          : isVietnamese
            ? "Không thể bác bỏ hàng loạt sự cố."
            : "Failed to batch dismiss incidents.",
      );
    }
  };

  const filterTabs: {
    key: UnresolvedIncidentFilter;
    label: string;
    count: number;
  }[] = [
    {
      key: "ALL",
      label: t("dashboard.liveIncidents.filterAll"),
      count: totalUnresolvedDisplay,
    },
    {
      key: "PENDING_REVIEW",
      label: t("dashboard.liveIncidents.filterPending"),
      count: pendingCountDisplay,
    },
    {
      key: "CONFIRMED",
      label: t("dashboard.liveIncidents.filterConfirmed"),
      count: confirmedCountDisplay,
    },
  ];

  return (
<div
  className={[
    "relative isolate flex h-full w-full flex-col justify-between overflow-hidden transition-all duration-300",
    // Sử dụng đồng nhất màu nền gốc (bg-background) để tạo hiệu ứng đúc nguyên khối
    "rounded-[24px] sm:rounded-[28px] p-4 sm:p-5",
    "bg-background",
    "shadow-[10px_10px_24px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light)]",
  ].join(" ")}
>
  <div className="relative flex min-h-0 flex-1 flex-col">
    {/* Header & Bộ lọc gọn gàng */}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {/* Icon Box 2 tầng đúc từ màu nền */}
        <div className="flex size-10 shrink-0 items-center justify-center rounded-[13px] bg-background text-danger shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]">
          <div className="flex size-7.5 items-center justify-center rounded-[9px] bg-background shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
            <Radio className="size-4 animate-pulse" strokeWidth={2.4} />
          </div>
        </div>

        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-black tracking-tight text-foreground sm:text-base">
            <span className="truncate">{t("dashboard.liveIncidents.title")}</span>
            {totalUnresolvedDisplay > 0 && (
              <span className="inline-flex items-center rounded-full bg-background px-2.5 py-0.5 font-mono text-xs font-extrabold text-danger shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                {totalUnresolvedDisplay}
              </span>
            )}
          </h3>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {t("dashboard.liveIncidents.subtitle")}
          </p>
        </div>
      </div>

      {/* Cụm Nút thao tác Header */}
      <div className="flex items-center gap-2.5">
        {batchEnabled && (
          <button
            type="button"
            onClick={toggleSelectAllPending}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-background px-3 py-1.5 text-[11px] font-bold text-foreground shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] transition-all duration-200 hover:-translate-y-0.5 hover:text-primary active:translate-y-0 active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]"
          >
            <span
              className={`flex size-3.5 items-center justify-center rounded-[5px] transition-all ${
                allPendingSelected
                  ? "bg-primary text-primary-foreground shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
                  : "bg-background shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]"
              }`}
            >
              {allPendingSelected && <Check className="size-2.5" strokeWidth={3} />}
            </span>
            <span>
              {allPendingSelected
                ? isVietnamese
                  ? "Bỏ chọn"
                  : "Deselect"
                : isVietnamese
                  ? `Chọn chờ duyệt (${pendingIds.length})`
                  : `Select pending (${pendingIds.length})`}
            </span>
          </button>
        )}

        <Link
          href={viewAllHref}
          className="group inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1.5 text-[11px] font-bold text-primary shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)] active:translate-y-0 active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]"
        >
          <span>{t("dashboard.liveIncidents.viewAll")}</span>
          <ArrowRight
            className="size-3 transition-transform duration-200 group-hover:translate-x-0.5"
            strokeWidth={2.4}
          />
        </Link>
      </div>
    </div>

    {/* Thanh Trạng thái khẩn & Filter Tabs nằm ngang */}
    {!loading && !error && totalUnresolvedDisplay > 0 && (
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2.5">
        {/* Filter Tabs: Khay trượt lõm + Nút tab nổi đồng màu nền */}
        <div
          role="tablist"
          aria-label={t("dashboard.liveIncidents.title")}
          className={`inline-flex flex-wrap items-center gap-1 rounded-[15px] bg-background p-1 shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)] ${NM.recessed}`}
        >
          {filterTabs.map((tab) => {
            const active = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setStatusFilter(tab.key)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-[11px] px-3 py-1 text-[11px] font-bold transition-all duration-200 ${
                  active
                    ? `bg-background text-primary shadow-[2.5px_2.5px_5px_var(--shadow-dark),-2.5px_-2.5px_5px_var(--shadow-light)] ${NM.extruded}`
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 font-mono text-[10px] font-extrabold ${
                    active
                      ? "bg-primary/12 text-primary"
                      : "bg-accent text-accent-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Urgent Action Pill: Dập nổi nhẹ trên nền */}
        <div className="flex items-center gap-2 rounded-full bg-background px-3 py-1.5 text-[11px] shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)]">
          <AlertTriangle className="size-3.5 shrink-0 text-danger" />
          <span className="font-semibold text-danger">
            {t("dashboard.liveIncidents.urgentBanner")}:{" "}
            <strong className="font-black">{totalUnresolvedDisplay}</strong>
          </span>
          {unresolvedIncidents.length > unresolvedClusters.length &&
            groupingMode === "clustered" && (
              <span className="font-mono text-[10px] text-muted-foreground">
                ({unresolvedIncidents.length} {isVietnamese ? "lỗi gốc" : "raw"})
              </span>
            )}
        </div>
      </div>
    )}

    {/* Batch Review Toolbar: Dùng màu Primary & Accent thay cho xanh lá */}
    {batchEnabled && activeSelectedIds.length > 0 && (
      <div className="mt-3 space-y-2.5 rounded-[16px] bg-background p-3 shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
            <span className="text-xs font-extrabold text-foreground">
              {isVietnamese
                ? `Đã chọn ${activeSelectedIds.length} sự cố chờ duyệt`
                : `${activeSelectedIds.length} pending selected`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              disabled={batchReviewPending}
              onClick={() => void handleBatchConfirm()}
              className="h-8 rounded-xl px-3 text-xs font-bold shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)]"
            >
              {batchReviewPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              <span>
                {isVietnamese
                  ? `Xác nhận (${activeSelectedIds.length})`
                  : `Confirm (${activeSelectedIds.length})`}
              </span>
            </Button>

            <Button
              size="sm"
              variant="ghost"
              disabled={batchReviewPending}
              onClick={() => {
                setBatchError(null);
                setRejectMode((prev) => !prev);
              }}
              className="h-8 rounded-xl bg-background px-3 text-xs font-bold text-foreground shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] hover:text-danger active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]"
            >
              <XCircle className="h-3.5 w-3.5 text-danger" />
              <span>
                {isVietnamese
                  ? `Báo nhầm (${activeSelectedIds.length})`
                  : `Dismiss (${activeSelectedIds.length})`}
              </span>
            </Button>
          </div>
        </div>

        {rejectMode && (
          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center">
            <input
              type="text"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder={
                isVietnamese
                  ? "Nhập lý do bác bỏ (tối thiểu 3 ký tự)..."
                  : "Enter dismissal reason (min 3 chars)..."
              }
              className="flex-1 rounded-xl bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/70 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="danger"
                disabled={batchReviewPending}
                onClick={() => void handleBatchRejectSubmit()}
                className="h-8 rounded-xl px-3 text-xs font-bold"
              >
                {isVietnamese ? "Gửi bác bỏ" : "Submit"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={batchReviewPending}
                onClick={() => {
                  setRejectMode(false);
                  setBatchError(null);
                }}
                className="h-8 w-8 rounded-xl bg-background p-0 shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)]"
                aria-label={t("common.cancel")}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {batchError && (
          <p className="text-[11px] font-semibold text-danger">{batchError}</p>
        )}
      </div>
    )}

    {/* KHAY LÕM CHỨA DANH SÁCH SỰ CỐ: Đồng màu bg-background */}
    <div className="mt-3.5 flex-1 rounded-[18px] bg-background p-2.5 sm:p-3 shadow-[inset_4px_4px_10px_var(--shadow-dark),inset_-4px_-4px_10px_var(--shadow-light)]">
      <div className="max-h-[420px] space-y-2.5 overflow-y-auto pr-1">
        {loading ? (
          <div className="space-y-2.5 py-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 w-full animate-pulse rounded-[14px] bg-background shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)]"
              />
            ))}
          </div>
        ) : error ? (
          <p className="py-12 text-center text-xs font-medium text-muted-foreground">
            {t("dashboard.data.error")}
          </p>
        ) : visibleClusters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-2.5 flex size-12 items-center justify-center rounded-[15px] bg-background text-primary shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]">
              <CheckCircle2 className="size-6" strokeWidth={2.2} />
            </div>
            <p className="text-sm font-extrabold text-foreground">
              {t("dashboard.liveIncidents.empty")}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isVietnamese
                ? "Tất cả vi phạm đã được thẩm duyệt và xử lý."
                : "All violations have been reviewed and resolved."}
            </p>
          </div>
        ) : (
          visibleClusters.map((cluster) => {
            const inc = cluster.primary;
            const clusterPendingIds = cluster.items
              .filter((m) => m.status === "PENDING_REVIEW")
              .map((m) => m.id);
            const isHighlighted = cluster.incidentIds.includes(highlightedId ?? "");
            const isPending = clusterPendingIds.length > 0;
            const isConfirmed =
              !isPending && cluster.effectiveStatus === "CONFIRMED";
            const isSelected =
              clusterPendingIds.length > 0 &&
              clusterPendingIds.every((id) => activeSelectedIds.includes(id));
            const isExpanded = Boolean(expandedClusters[cluster.clusterId]);
            const violationLabel =
              VIOLATION_LABELS[cluster.effectiveViolationType]?.[
                isVietnamese ? "vi" : "en"
              ] || cluster.effectiveViolationType;
            const cameraLabel = resolveCameraLabel(inc);
            const timeLabel = formatIncidentTimeLabel(
              cluster.latestDetectedAt,
              isVietnamese,
            );

            return (
              /* Từng thẻ sự cố (hoặc cụm đa sự cố): Nổi mượt trên khay lõm bằng chính màu nền bg-background */
              <div
                key={cluster.clusterId}
                className={[
                  "group relative flex flex-col gap-2.5 rounded-[15px] p-3 transition-all duration-200",
                  "bg-background",
                  isHighlighted
                    ? "animate-pulse shadow-[0_0_16px_rgba(239,68,68,0.28)]"
                    : isSelected
                      ? "ring-1 ring-primary/40 shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]"
                      : "shadow-[3.5px_3.5px_8px_var(--shadow-dark),-3.5px_-3.5px_8px_var(--shadow-light)] hover:-translate-y-[1px] hover:shadow-[5px_5px_11px_var(--shadow-dark),-5px_-5px_11px_var(--shadow-light)]",
                ].join(" ")}
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                {/* Left: Checkbox, Recessed Snapshot Screen & Metadata */}
                <div className="flex min-w-0 items-center gap-3">
                  {batchEnabled && isPending && (
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={isSelected}
                      aria-label={
                        isVietnamese
                          ? `Chọn sự cố ${violationLabel} tại ${cameraLabel}`
                          : `Select ${violationLabel} at ${cameraLabel}`
                      }
                      onClick={() => toggleSelectMany(clusterPendingIds)}
                      className={`flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-[7px] transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
                          : "bg-background shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]"
                      }`}
                    >
                      {isSelected && <Check className="size-3.5" strokeWidth={3} />}
                    </button>
                  )}

                  {/* Khung ảnh Snapshot lõm vào bề mặt nền */}
                  {(() => {
                    const thumbRaw =
                      inc.snapshotUrl ||
                      inc.evidences?.find((e) => e.evidenceType === "SNAPSHOT")?.url ||
                      inc.evidences?.find((e) => e.evidenceType === "SNAPSHOT")?.storageKey ||
                      inc.evidences?.[0]?.url ||
                      inc.evidences?.[0]?.storageKey;
                    const thumbSrc = thumbRaw ? resolveEvidenceUrl(thumbRaw) : "";
                    return (
                      <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-background shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
                        {thumbSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumbSrc}
                            alt="Violation Snapshot"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <Camera className="size-5 text-muted-foreground/70" />
                        )}
                        {cluster.rawCount > 1 && (
                          <span className="absolute bottom-0.5 right-0.5 rounded-md bg-black/75 px-1 font-mono text-[9px] font-black text-white">
                            ×{cluster.rawCount}
                          </span>
                        )}
                        {isHighlighted && (
                          <span className="absolute right-1 top-1 flex size-2">
                            <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger opacity-75" />
                            <span className="relative inline-flex size-2 rounded-full bg-danger" />
                          </span>
                        )}
                      </div>
                    );
                  })()}

                  {/* Metadata */}
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="max-w-[160px] truncate font-mono text-xs font-extrabold text-foreground sm:max-w-none">
                        {violationLabel}
                      </span>
                      {cluster.rawCount > 1 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 font-mono text-[10px] font-extrabold text-warning">
                          <Layers className="size-2.5" />
                          {cluster.rawCount} {isVietnamese ? "lỗi" : "alerts"}
                        </span>
                      )}
                      <IncidentSeverityBadge
                        severity={cluster.effectiveSeverity as IncidentSeverity}
                      />
                      <IncidentStatusBadge
                        status={cluster.effectiveStatus as IncidentStatus}
                      />
                    </div>

                    {cluster.isMultiViolation && cluster.violationCodes.length > 1 && (
                      <div className="flex flex-wrap items-center gap-1">
                        {cluster.violationCodes.map((code) => (
                          <span
                            key={code}
                            className="rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-bold text-foreground/85 shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
                          >
                            {VIOLATION_LABELS[code]?.[isVietnamese ? "vi" : "en"] || code}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                      <span className="max-w-[180px] truncate font-semibold text-foreground/85 sm:max-w-[240px]">
                        {cameraLabel}
                      </span>
                      {cluster.personTrackId !== null && (
                        <>
                          <span className="opacity-50">•</span>
                          <span className="font-mono text-[10px] font-bold text-primary">
                            Track #{cluster.personTrackId}
                          </span>
                        </>
                      )}
                      {inc.zoneName && (
                        <>
                          <span className="opacity-50">•</span>
                          <span className="max-w-[140px] truncate">
                            {inc.zoneName}
                          </span>
                        </>
                      )}
                      <span className="opacity-50">•</span>
                      <span
                        className="flex items-center gap-1 tabular-nums"
                        title={timeLabel.exact}
                      >
                        <Clock className="size-3 shrink-0" />
                        <span>{timeLabel.display}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Action Buttons (Dùng Primary & Accent) */}
                <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
                  {cluster.rawCount > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      type="button"
                      onClick={() =>
                        setExpandedClusters((prev) => ({
                          ...prev,
                          [cluster.clusterId]: !prev[cluster.clusterId],
                        }))
                      }
                      className="h-8 gap-1 rounded-xl bg-background px-2 text-[11px] font-bold text-muted-foreground shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] hover:text-primary"
                    >
                      {isExpanded ? (
                        <ChevronUp className="size-3.5" />
                      ) : (
                        <ChevronDown className="size-3.5" />
                      )}
                      <span>{cluster.rawCount}</span>
                    </Button>
                  )}

                  {canReview && isPending && (
                    clusterPendingIds.length > 1 && onBatchReview ? (
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={batchReviewPending}
                        onClick={() =>
                          void onBatchReview(clusterPendingIds, "CONFIRM")
                        }
                        className="h-8 rounded-xl px-3 text-xs font-bold shadow-[2.5px_2.5px_5px_var(--shadow-dark),-2.5px_-2.5px_5px_var(--shadow-light)] transition-transform active:scale-95"
                      >
                        {isVietnamese
                          ? `Duyệt cụm (${clusterPendingIds.length})`
                          : `Confirm (${clusterPendingIds.length})`}
                      </Button>
                    ) : onReview ? (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => onReview(inc)}
                        className="h-8 rounded-xl px-3 text-xs font-bold shadow-[2.5px_2.5px_5px_var(--shadow-dark),-2.5px_-2.5px_5px_var(--shadow-light)] transition-transform active:scale-95"
                      >
                        {t("dashboard.liveIncidents.quickReview")}
                      </Button>
                    ) : null
                  )}

                  {canResolve && isConfirmed && onResolve && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onResolve(inc)}
                      className="h-8 gap-1 rounded-xl bg-accent px-3 text-xs font-bold text-accent-foreground shadow-[2.5px_2.5px_5px_var(--shadow-dark),-2.5px_-2.5px_5px_var(--shadow-light)] transition-transform hover:bg-accent/80 active:scale-95"
                    >
                      <Wrench className="size-3 text-primary" />
                      <span>{t("dashboard.liveIncidents.resolveNow")}</span>
                    </Button>
                  )}

                  <Link href={`/incidents/${inc.id}`}>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="size-8 rounded-xl bg-background p-0 shadow-[2.5px_2.5px_5px_var(--shadow-dark),-2.5px_-2.5px_5px_var(--shadow-light)] transition-all hover:text-primary active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]"
                      title={
                        isVietnamese ? "Xem chi tiết sự cố" : "View Details"
                      }
                    >
                      <Eye className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
                    </Button>
                  </Link>
                </div>
                </div>

                {cluster.rawCount > 1 && isExpanded && (
                  <div className="space-y-1.5 rounded-xl bg-surface/60 p-2.5 shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      {isVietnamese
                        ? `Các bản ghi lỗi thành phần (${cluster.rawCount})`
                        : `Component violation records (${cluster.rawCount})`}
                    </p>
                    {cluster.items.map((child) => (
                      <div
                        key={child.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-background/80 px-2.5 py-1.5 text-[11px]"
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono font-bold text-foreground">
                            {VIOLATION_LABELS[child.violationType]?.[
                              isVietnamese ? "vi" : "en"
                            ] || child.violationType}
                          </span>
                          <IncidentStatusBadge
                            status={child.status as IncidentStatus}
                          />
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {formatExactVnTimestamp(child.detectedAt)}
                          </span>
                        </div>
                        <Link
                          href={`/incidents/${child.id}`}
                          className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                        >
                          <span>#{child.id.slice(0, 6)}</span>
                          <Eye className="size-3" />
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  </div>

  {/* Footer: Đồng màu nền, sử dụng Primary & Accent */}
  <div className="relative mt-3.5 flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
    <div className="flex flex-wrap items-center gap-2">
      <span>
        {isVietnamese
          ? "Nguồn: sự cố chờ duyệt & chờ khắc phục · đồng bộ mỗi 15 giây"
          : "Source: pending & confirmed incidents · synced every 15s"}
      </span>
      <span
        title={
          isVietnamese
            ? "Nhận cảnh báo vi phạm PPE tức thì qua luồng SSE thời gian thực"
            : "Receiving live PPE violation alerts via SSE stream"
        }
        className={`inline-flex items-center gap-1.5 rounded-full bg-background px-2.5 py-0.5 text-[10px] font-bold shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] ${
          isRealtimeConnected ? "text-primary" : "text-muted-foreground"
        }`}
      >
        <span
          className={`size-1.5 rounded-full ${
            isRealtimeConnected
              ? "bg-primary shadow-[0_0_6px_hsl(var(--primary))]"
              : "bg-muted-foreground/50"
          }`}
        />
        {isRealtimeConnected ? "SSE Live" : "Polling"}
      </span>
    </div>

    <span className="rounded-full bg-accent px-2.5 py-0.5 font-mono text-[11px] font-bold text-accent-foreground shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]">
      {dateRangeLabel || (isVietnamese ? "Mọi ngày" : "All dates")}
    </span>
  </div>
</div>
  );
}
