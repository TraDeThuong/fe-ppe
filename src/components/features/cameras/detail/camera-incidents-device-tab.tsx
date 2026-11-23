"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle,
  ChevronDown,
  Clock,
  Cpu,
  Database,
  ImageOff,
  Layers,
  Link2,
  Loader2,
  MapPin,
  RefreshCw,
  RotateCcw,
  Upload,
  Wrench,
  Zap,
} from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import { formatViolationLabel } from "@/components/features/ai-test/ai-test-utils";
import { getIncidentEvidenceUrl } from "@/components/features/incidents/incident-table";
import { clusterIncidentsByPerson } from "@/lib/incident-cluster-engine";
import { Input } from "@/components/ui/form";
import {
  Select,
  type SelectOption,
} from "@/components/ui/form/selection-controls/select";
import { useCameraHealthLogs, usePingCamera } from "@/hooks/cameras";
import { useLocale } from "@/providers/locale-provider";
import { getDbIncidentSnapshotUrl } from "../camera-live-helpers";
import { CameraDeviceAdvancedPanels } from "./camera-device-advanced-panels";
import { RefreshButton, RefreshIconButton } from "@/components/ui/refresh-action";
import type { LiveVideoItem } from "@/types/ai-test.types";
import type { CameraConfigItem, CameraItem, IncidentItem } from "@/types";

export interface CameraIncidentsDeviceTabProps {
  camera: CameraItem;
  config?: CameraConfigItem | null;
  incidents: IncidentItem[];
  incidentsLoading: boolean;
  incidentsFetching?: boolean;
  onRefreshIncidents: () => void;
  liveVideos: LiveVideoItem[];
  overrideSource: string;
  productionMode?: boolean;
  isUploading: boolean;
  isStarting: boolean;
  overrideHighlightTick?: number;
  onApplyOverrideStream: (nextSource: string) => void;
  onUploadOverrideStream: (file: File) => void;
  onClearOverride: () => void;
  onOpenRestrictedAreaModal?: () => void;
}


export const CameraIncidentsDeviceTab = memo(function CameraIncidentsDeviceTab({
  camera,
  config,
  incidents,
  incidentsLoading,
  incidentsFetching,
  onRefreshIncidents,
  liveVideos,
  overrideSource,
  productionMode = false,
  isUploading,
  isStarting,
  overrideHighlightTick = 0,
  onApplyOverrideStream,
  onUploadOverrideStream,
  onClearOverride,
  onOpenRestrictedAreaModal,
}: CameraIncidentsDeviceTabProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const statusOptions = useMemo<SelectOption[]>(
    () => [
      { value: "ALL", label: isVietnamese ? "Tất cả trạng thái" : "All Statuses" },
      {
        value: "PENDING_REVIEW",
        label: isVietnamese ? "Chờ duyệt (PENDING)" : "Pending Review",
      },
      {
        value: "CONFIRMED",
        label: isVietnamese ? "Đã xác nhận (CONFIRMED)" : "Confirmed",
      },
      {
        value: "RESOLVED",
        label: isVietnamese ? "Đã xử lý (RESOLVED)" : "Resolved",
      },
      {
        value: "DISMISSED",
        label: isVietnamese ? "Bỏ qua (DISMISSED)" : "Dismissed",
      },
    ],
    [isVietnamese],
  );

  const severityOptions = useMemo<SelectOption[]>(
    () => [
      { value: "ALL", label: isVietnamese ? "Tất cả mức độ" : "All Severities" },
      { value: "CRITICAL", label: "CRITICAL" },
      { value: "HIGH", label: "HIGH" },
      { value: "MEDIUM", label: "MEDIUM" },
      { value: "LOW", label: "LOW" },
    ],
    [isVietnamese],
  );

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [groupByPerson, setGroupByPerson] = useState<boolean>(true);
  const [healthStatusFilter, setHealthStatusFilter] = useState<string>("");
  const [overrideExpanded, setOverrideExpanded] = useState<boolean>(
    Boolean(overrideSource),
  );
  const [draftOverride, setDraftOverride] = useState<string>(overrideSource);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDraftOverride(overrideSource);
    if (overrideSource) {
      setOverrideExpanded(true);
    }
  }, [overrideSource]);

  useEffect(() => {
    if (overrideHighlightTick > 0) {
      setOverrideExpanded(true);
    }
  }, [overrideHighlightTick]);

  const pingMutation = usePingCamera();
  const {
    data: healthLogs = [],
    isLoading: healthLogsLoading,
    isFetching: healthLogsFetching,
    refetch: refetchHealthLogs,
  } = useCameraHealthLogs(camera.id, Boolean(camera.id), {
    limit: 20,
    status: healthStatusFilter || undefined,
    sortOrder: "desc",
  });
  const isReloadingIncidents = incidentsFetching ?? incidentsLoading;

  const pingResult = pingMutation.data;
  const isDbOnline = camera.status === "ONLINE";

  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (statusFilter !== "ALL" && inc.status !== statusFilter) return false;
      if (severityFilter !== "ALL" && inc.severity !== severityFilter) {
        return false;
      }
      return true;
    });
  }, [incidents, statusFilter, severityFilter]);

  const displayedClusters = useMemo(() => {
    if (!groupByPerson) {
      return filteredIncidents.map((inc) => ({
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
        matchMethod: "SINGLE" as const,
        matchReasons: [],
        bestSpatialIoUPct: null,
      }));
    }
    return clusterIncidentsByPerson(filteredIncidents);
  }, [filteredIncidents, groupByPerson]);

  const videoOptions = useMemo<SelectOption[]>(
    () =>
      liveVideos.map((v) => ({
        value: v.filename,
        label: v.filename,
        description: [
          v.resolution,
          typeof v.size_mb === "number" ? `${v.size_mb.toFixed(1)} MB` : null,
        ]
          .filter(Boolean)
          .join(" • "),
      })),
    [liveVideos],
  );

  const hasFilters = statusFilter !== "ALL" || severityFilter !== "ALL";

  return (
    <div className="space-y-6">
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      {/* Left: Incidents DB Table (7/12) */}
      <section
        aria-label={
          isVietnamese
            ? "Lịch sử sự cố Camera trong hệ thống"
            : "Camera Incident DB History"
        }
        className={`relative overflow-hidden rounded-[24px] p-4 sm:rounded-[28px] sm:p-6 xl:col-span-7 ${NM.chassis}`}
      >
        <div className="pointer-events-none absolute inset-x-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl text-accent ${NM.recessed}`}
            >
              <Database className="size-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight text-foreground">
                  {isVietnamese
                    ? "Sự cố đã lưu trong Incident DB"
                    : "Stored Incident DB Records"}
                </h2>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-bold text-primary">
                  {displayedClusters.length}
                  {groupByPerson && filteredIncidents.length > displayedClusters.length
                    ? isVietnamese
                      ? ` vụ (${filteredIncidents.length} lỗi)`
                      : ` cases (${filteredIncidents.length} raw)`
                    : hasFilters
                      ? `/${incidents.length}`
                      : ""}
                </span>
                <button
                  type="button"
                  onClick={() => setGroupByPerson((prev) => !prev)}
                  className={`inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold transition ${
                    groupByPerson
                      ? "bg-warning/15 text-warning"
                      : "bg-foreground/[0.06] text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Layers className="size-2.5" />
                  <span>
                    {groupByPerson
                      ? isVietnamese
                        ? "Đang gom đa sự cố"
                        : "Clustered"
                      : isVietnamese
                        ? "Bản ghi gốc"
                        : "Raw"}
                  </span>
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {isVietnamese
                  ? "Dữ liệu thật từ Incident Service lọc theo camera"
                  : "Live records from Incident Service filtered by camera"}{" "}
                <span className="font-mono font-bold text-primary">
                  {camera.code}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <RefreshButton
              variant="ghost"
              size="sm"
              onRefresh={onRefreshIncidents}
              isRefreshing={isReloadingIncidents}
              label={isVietnamese ? "Tải lại" : "Reload"}
              iconClassName="size-3.5"
              className={`h-8 rounded-xl px-3 text-xs font-bold text-foreground ${NM.tactileBtn}`}
            />

            <Link
              href={`/incidents?cameraId=${encodeURIComponent(camera.id)}`}
              className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold text-primary ${NM.tactileBtn}`}
            >
              <span>{isVietnamese ? "Xem tất cả" : "View all"}</span>
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* Quick Status / Severity Filter Tray */}
        <div className={`mb-4 grid grid-cols-1 gap-3 rounded-2xl p-3 sm:grid-cols-12 ${NM.recessed}`}>
          <div className="sm:col-span-5">
            <Select
              size="sm"
              options={statusOptions}
              value={statusFilter}
              onValueChange={setStatusFilter}
              placeholder={isVietnamese ? "Lọc theo trạng thái" : "Filter by status"}
            />
          </div>
          <div className="sm:col-span-5">
            <Select
              size="sm"
              options={severityOptions}
              value={severityFilter}
              onValueChange={setSeverityFilter}
              placeholder={isVietnamese ? "Lọc theo mức độ" : "Filter by severity"}
            />
          </div>
          <div className="flex items-center justify-end sm:col-span-2">
            {hasFilters ? (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("ALL");
                  setSeverityFilter("ALL");
                }}
                className={`inline-flex h-9 w-full items-center justify-center gap-1 rounded-xl px-2.5 text-xs font-bold text-accent ${NM.tactileBtn}`}
              >
                <RotateCcw className="size-3.5" />
                <span>{isVietnamese ? "Xóa lọc" : "Clear"}</span>
              </button>
            ) : (
              <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                {isVietnamese ? "Mới nhất" : "Latest"}
              </span>
            )}
          </div>
        </div>

        {filteredIncidents.length === 0 ? (
          <div
            className={`rounded-2xl px-6 py-12 text-center text-xs text-muted-foreground ${NM.recessed}`}
          >
            {incidentsLoading
              ? isVietnamese
                ? "Đang tải danh sách sự cố..."
                : "Loading incidents..."
              : hasFilters
                ? isVietnamese
                  ? "Không có sự cố nào khớp bộ lọc trạng thái / mức độ đang chọn."
                  : "No incidents match the selected status or severity filter."
                : isVietnamese
                  ? "Chưa có sự cố nào được lưu trong Incident DB cho camera này."
                  : "No incidents recorded in Incident DB for this camera yet."}
          </div>
        ) : (
          <div className={`max-h-[580px] space-y-2.5 overflow-y-auto rounded-2xl p-3 ${NM.recessed}`}>
            {displayedClusters.map((cluster) => {
              const inc = cluster.primary;
              const isHigh =
                cluster.effectiveSeverity === "CRITICAL" ||
                cluster.effectiveSeverity === "HIGH";
              const thumbUrl =
                getIncidentEvidenceUrl(inc) || getDbIncidentSnapshotUrl(inc);

              return (
                <Link
                  key={cluster.clusterId}
                  href={`/incidents/${inc.id}`}
                  className={`relative flex items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-xs transition-transform hover:translate-x-0.5 ${NM.extruded}`}
                >
                  <span
                    className={`absolute inset-y-2 left-1.5 w-1 rounded-full ${
                      isHigh ? "bg-accent" : "bg-primary"
                    }`}
                  />

                  <div className="flex min-w-0 flex-1 items-center gap-3 pl-2">
                    {/* MinIO Evidence Thumbnail */}
                    <div
                      className={`relative flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg ${NM.recessed}`}
                    >
                      {thumbUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={thumbUrl}
                          alt={`Evidence ${cluster.effectiveViolationType}`}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageOff className="size-4 text-muted-foreground/45" />
                      )}
                      {cluster.rawCount > 1 && (
                        <span className="absolute bottom-0.5 right-0.5 rounded bg-black/75 px-1 font-mono text-[9px] font-black text-white">
                          ×{cluster.rawCount}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded-lg px-2 py-0.5 font-mono text-[10px] font-extrabold ${
                            isHigh
                              ? "bg-accent/15 text-accent"
                              : "bg-primary/15 text-primary"
                          }`}
                        >
                          {formatViolationLabel(cluster.effectiveViolationType, locale)}
                        </span>

                        {cluster.rawCount > 1 && (
                          <span className="rounded-md bg-warning/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-warning">
                            {cluster.violationCodes
                              .map((c) => formatViolationLabel(c, locale))
                              .join(" + ")}
                          </span>
                        )}

                        <span className="rounded-md bg-foreground/[0.05] px-2 py-0.5 font-mono text-[10px] font-bold text-foreground">
                          {cluster.effectiveSeverity}
                        </span>

                        <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                          {cluster.effectiveStatus}
                        </span>
                      </div>

                      {inc.description && (
                        <p className="truncate text-[11px] text-muted-foreground">
                          {inc.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                    <Clock className="size-3" />
                    <span className="hidden sm:inline">
                      {new Date(cluster.latestDetectedAt || inc.createdAt).toLocaleString(
                        locale,
                      )}
                    </span>
                    <ArrowUpRight className="size-3.5 text-primary" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Right: Device Specs + Embedded Ping & Health Logs + Collapsible Override (5/12) */}
      <div className="space-y-6 xl:col-span-5">
        {/* Card 1: Device DB Specs */}
        <section
          aria-label={isVietnamese ? "Thông số kỹ thuật thiết bị" : "Device Specifications"}
          className={`relative space-y-4 overflow-hidden rounded-[24px] p-4 sm:rounded-[28px] sm:p-6 ${NM.chassis}`}
        >
          <div className="flex items-center justify-between border-b border-foreground/[0.06] pb-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-primary ${NM.recessed}`}
              >
                <Cpu className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground">
                  {isVietnamese ? "Hồ sơ Thiết bị DB" : "Device DB Profile"}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Camera Service Configuration
                </p>
              </div>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold ${
                isDbOnline
                  ? "bg-primary/15 text-primary"
                  : "bg-accent/15 text-accent"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isDbOnline ? "bg-primary" : "bg-accent"
                }`}
              />
              {camera.status}
            </span>
          </div>

          <div className={`space-y-3 rounded-2xl p-4 text-xs ${NM.recessed}`}>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {isVietnamese ? "Giao thức / Nguồn lưu DB" : "DB Protocol / Stream Source"}
              </span>
              <p className="mt-1 flex items-center gap-1.5 break-all font-mono text-[11px] font-semibold text-foreground">
                <Link2 className="size-3.5 shrink-0 text-primary" />
                <span>
                  {camera.streamUrl ||
                    (isVietnamese ? "Chưa cấu hình" : "Not configured")}
                </span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-foreground/[0.06] pt-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Source Type
                </span>
                <p className="mt-0.5 font-mono font-bold text-primary">
                  {camera.sourceType || "RTSP"}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  DB Capture FPS
                </span>
                <p className="mt-0.5 font-mono font-bold text-foreground">
                  {config?.captureFps ?? 25} FPS
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  AI Processing DB
                </span>
                <p className="mt-0.5 font-mono font-bold text-foreground">
                  {config?.processingEnabled ?? true ? "ENABLED" : "DISABLED"}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {isVietnamese ? "Độ phân giải DB" : "DB Resolution"}
                </span>
                <p className="mt-0.5 font-mono font-bold text-foreground">
                  {config?.resolution || "1280x720"}
                </p>
              </div>
            </div>

            {(camera.location || camera.description) && (
              <div className="space-y-1 border-t border-foreground/[0.06] pt-3">
                {camera.location && (
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0 text-accent" />
                    <span>{camera.location}</span>
                  </p>
                )}
                {camera.description && (
                  <p className="text-muted-foreground">{camera.description}</p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Card 2: Embedded Ping Probe & Health Heartbeat Logs */}
        <section
          aria-label={
            isVietnamese
              ? "Kiểm tra kết nối & Nhật ký Ping"
              : "Network Probe & Ping Logs"
          }
          className={`relative space-y-4 overflow-hidden rounded-[24px] p-4 sm:rounded-[28px] sm:p-6 ${NM.chassis}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-foreground/[0.06] pb-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-primary ${NM.recessed}`}
              >
                <Activity className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground">
                  {isVietnamese
                    ? "Chẩn đoán Mạng & Health Logs"
                    : "Network Diagnostics & Health Logs"}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  {isVietnamese
                    ? "Ping Camera Service trực tiếp (không cần popup)"
                    : "Direct Camera Service ping probe"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={healthStatusFilter}
                onChange={(e) => setHealthStatusFilter(e.target.value)}
                aria-label={isVietnamese ? "Lọc trạng thái Ping" : "Filter Ping status"}
                className="h-8 rounded-xl border border-border/30 bg-surface px-2 text-[11px] font-semibold text-foreground"
              >
                <option value="">{isVietnamese ? "Tất cả" : "All"}</option>
                <option value="ONLINE">ONLINE</option>
                <option value="OFFLINE">OFFLINE</option>
                <option value="ERROR">ERROR</option>
              </select>
              <button
                type="button"
                disabled={pingMutation.isPending}
                onClick={() => pingMutation.mutate(camera.id)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-extrabold text-primary-foreground shadow-sm transition hover:brightness-105 disabled:opacity-50"
              >
                {pingMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Zap className="size-3.5" />
                )}
                <span>{isVietnamese ? "Gửi Ping" : "Send Ping"}</span>
              </button>
              <RefreshIconButton
                onRefresh={() => refetchHealthLogs()}
                isRefreshing={healthLogsFetching}
                title={isVietnamese ? "Làm mới nhật ký Ping" : "Refresh ping logs"}
                ariaLabel={isVietnamese ? "Làm mới nhật ký Ping" : "Refresh ping logs"}
                className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-muted-foreground hover:text-primary disabled:opacity-50 ${NM.tactileBtn}`}
                iconClassName="size-3.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 min-[400px]:grid-cols-3 gap-2.5 text-center text-xs">
            <div className={`rounded-xl p-2.5 ${NM.recessed}`}>
              <span className="text-[10px] font-bold uppercase text-muted-foreground">
                {isVietnamese ? "Độ trễ" : "Latency"}
              </span>
              <p className="mt-0.5 font-mono text-sm font-black text-foreground">
                {pingResult?.latencyMs != null
                  ? `${pingResult.latencyMs} ms`
                  : camera.currentLatencyMs != null
                    ? `${camera.currentLatencyMs} ms`
                    : "-- ms"}
              </p>
            </div>

            <div className={`rounded-xl p-2.5 ${NM.recessed}`}>
              <span className="text-[10px] font-bold uppercase text-muted-foreground">
                {isVietnamese ? "Rớt gói" : "Packet Loss"}
              </span>
              <p className="mt-0.5 font-mono text-sm font-black text-primary">
                {pingResult?.packetLoss != null
                  ? `${pingResult.packetLoss}%`
                  : pingResult
                    ? pingResult.success
                      ? "0%"
                      : "100%"
                    : "N/A"}
              </p>
            </div>

            <div className={`rounded-xl p-2.5 ${NM.recessed}`}>
              <span className="text-[10px] font-bold uppercase text-muted-foreground">
                {isVietnamese ? "Khung hình DB" : "DB Frame Rate"}
              </span>
              <p className="mt-0.5 font-mono text-sm font-black text-foreground">
                {camera.currentFps != null ? `${camera.currentFps}` : "--"} fps
              </p>
            </div>
          </div>

          <div className={`max-h-48 divide-y divide-foreground/[0.06] overflow-y-auto rounded-2xl p-2 text-xs ${NM.recessed}`}>
            {healthLogsLoading ? (
              <p className="p-3 text-center text-muted-foreground">
                {isVietnamese
                  ? "Đang tải nhật ký nhịp tim..."
                  : "Loading heartbeat logs..."}
              </p>
            ) : healthLogs.length === 0 ? (
              <div className="flex items-center justify-center gap-2 p-3 text-muted-foreground">
                <CheckCircle className="size-4 text-primary" />
                <span>
                  {isVietnamese
                    ? "Chưa ghi nhận lịch sử Ping gián đoạn."
                    : "No ping interruption logs recorded."}
                </span>
              </div>
            ) : (
              healthLogs.slice(0, 6).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between gap-2 px-2 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {log.status === "ONLINE" ? (
                      <CheckCircle className="size-3.5 shrink-0 text-primary" />
                    ) : (
                      <AlertTriangle className="size-3.5 shrink-0 text-accent" />
                    )}
                    <span className="font-mono text-[11px] font-bold text-foreground">
                      {log.status}
                    </span>
                    {log.errorMessage && (
                      <span className="truncate text-[11px] text-muted-foreground">
                        · {log.errorMessage}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2 font-mono text-[10px] text-muted-foreground">
                    <span>{log.latencyMs != null ? `${log.latencyMs}ms` : "-"}</span>
                    {log.checkedAt && (
                      <span>
                        {new Date(log.checkedAt).toLocaleTimeString(locale)}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Card 3: Collapsible Dev Source Override Accordion */}
        <section
          aria-label={isVietnamese ? "Nguồn chạy thử AI Override" : "AI Test Source Override"}
          className={`relative overflow-hidden rounded-[24px] p-4 sm:rounded-[28px] sm:p-5 ${NM.chassis}`}
        >
          <button
            type="button"
            aria-expanded={overrideExpanded}
            onClick={() => setOverrideExpanded((prev) => !prev)}
            className="flex w-full cursor-pointer items-center justify-between gap-3 text-left"
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-accent ${NM.recessed}`}
              >
                <Wrench className="size-4" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-extrabold text-foreground">
                    {isVietnamese
                      ? "Nguồn chạy thử AI (Override cho Dev)"
                      : "AI Test Source (Dev Override)"}
                  </h3>
                  {overrideSource && (
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
                      {isVietnamese ? "Đang bật" : "Active"}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {isVietnamese
                    ? "Dùng khi nguồn DB là MP4 hoặc RTSP bị mask mật khẩu `:***@`"
                    : "Use when DB source is MP4 or masked RTSP credentials `:***@`"}
                </p>
              </div>
            </div>

            <ChevronDown
              className={`size-4 text-muted-foreground transition-transform duration-200 ${
                overrideExpanded ? "rotate-180" : ""
              }`}
            />
          </button>

          {overrideExpanded && (
            <div className={`mt-4 space-y-3 rounded-2xl p-3.5 ${NM.recessed}`}>
              <div className="space-y-1.5">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {isVietnamese
                    ? `Video Server (${liveVideos.length} sẵn có)`
                    : `Server Videos (${liveVideos.length} available)`}
                </span>
                <Select
                  size="sm"
                  options={videoOptions}
                  value={
                    liveVideos.some((v) => v.filename === draftOverride)
                      ? draftOverride
                      : ""
                  }
                  onValueChange={(val) => setDraftOverride(val)}
                  placeholder={
                    isVietnamese
                      ? "Chọn video test trên AI Server"
                      : "Select test video on AI Server"
                  }
                  emptyMessage={
                    isVietnamese
                      ? "Chưa có video sẵn trên AI Server"
                      : "No videos available on AI Server"
                  }
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {isVietnamese
                    ? "Hoặc nhập Source Override (RTSP đầy đủ / YouTube / 0)"
                    : "Or enter Source Override (Full RTSP / YouTube / 0)"}
                </label>
                <Input
                  size="sm"
                  value={draftOverride}
                  onChange={(e) => setDraftOverride(e.target.value)}
                  placeholder={
                    isVietnamese
                      ? "rtsp://user:pass@ip:554/... hoặc video.mp4"
                      : "rtsp://user:pass@ip:554/... or video.mp4"
                  }
                />
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUploadOverrideStream(file);
                  e.target.value = "";
                }}
              />

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={isStarting || !draftOverride.trim()}
                  onClick={() => onApplyOverrideStream(draftOverride.trim())}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-extrabold text-primary-foreground shadow-sm transition hover:brightness-105 disabled:opacity-45"
                >
                  <Zap className="size-3.5" />
                  <span>
                    {isVietnamese ? "Áp dụng & Chạy Live" : "Apply & Run Live"}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isUploading || isStarting || productionMode}
                  onClick={() => fileInputRef.current?.click()}
                  title={
                    productionMode
                      ? isVietnamese
                        ? "Endpoint upload video offline chỉ có ở test-ui/server.py sandbox"
                        : "Offline video upload is only available in test-ui/server.py sandbox"
                      : undefined
                  }
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-foreground hover:text-primary disabled:opacity-45 ${NM.tactileBtn}`}
                >
                  <Upload className="size-3.5 text-accent" />
                  <span>
                    {isUploading
                      ? isVietnamese
                        ? "Đang tải..."
                        : "Uploading..."
                      : "Upload & Stream"}
                  </span>
                </button>

                {overrideSource && (
                  <button
                    type="button"
                    onClick={() => {
                      setDraftOverride("");
                      onClearOverride();
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-accent ${NM.tactileBtn}`}
                  >
                    <RotateCcw className="size-3.5" />
                    <span>{isVietnamese ? "Khôi phục DB" : "Restore DB"}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>

    <CameraDeviceAdvancedPanels
      camera={camera}
      config={config}
      onOpenRestrictedAreaModal={onOpenRestrictedAreaModal}
    />
  </div>
  );
});
