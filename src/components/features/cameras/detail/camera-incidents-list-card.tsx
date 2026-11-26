"use client";

import { memo, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  Expand,
  ImageOff,
  Images,
  Layers,
  LayoutGrid,
  List,
  Radio,
  RotateCcw,
} from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import { formatViolationLabel } from "@/components/features/ai-test/ai-test-utils";
import { getIncidentEvidenceUrl } from "@/components/features/incidents/incident-table";
import {
  Select,
  type SelectOption,
} from "@/components/ui/form/selection-controls/select";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "@/components/ui/segmented-control";
import { RefreshButton } from "@/components/ui/refresh-action";
import { useCan } from "@/hooks/use-can";
import { clusterIncidentsByPerson } from "@/lib/incident-cluster-engine";
import { useLocale } from "@/providers/locale-provider";
import { incidentService } from "@/services/incident.service";
import { extractIncidentEvidencePair } from "../camera-live-helpers";
import { CameraEvidenceGridCard } from "./camera-evidence-grid-card";
import type { EvidenceItem as AiEvidenceItem } from "@/types/ai-test.types";
import type { CameraItem } from "@/types";

export type CameraIncidentsViewMode = "list" | "grid";

export interface CameraIncidentsListCardProps {
  camera: CameraItem;
  isTabActive?: boolean;
  liveEvidences?: AiEvidenceItem[];
  onInspectEvidence?: (items: AiEvidenceItem[], index: number) => void;
}

const PAGE_SIZE = 12;

export const CameraIncidentsListCard = memo(function CameraIncidentsListCard({
  camera,
  isTabActive = true,
  liveEvidences = [],
  onInspectEvidence,
}: CameraIncidentsListCardProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const canReadIncidents = useCan()("PPE_INCIDENT_READ");

  const violationOptions = useMemo<SelectOption[]>(
    () => [
      { value: "ALL", label: isVietnamese ? "Tất cả loại vi phạm" : "All Violations" },
      { value: "NO_HELMET", label: isVietnamese ? "Không mũ (NO_HELMET)" : "No Helmet" },
      { value: "NO_VEST", label: isVietnamese ? "Không áo (NO_VEST)" : "No Safety Vest" },
      {
        value: "RESTRICTED_AREA",
        label: isVietnamese ? "Vùng cấm (RESTRICTED)" : "Restricted Area",
      },
      {
        value: "MULTI_VIOLATION",
        label: isVietnamese ? "Đa vi phạm (MULTI)" : "Multi-Violation",
      },
    ],
    [isVietnamese],
  );

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
        value: "CLOSED",
        label: isVietnamese ? "Đã đóng (CLOSED)" : "Closed",
      },
      {
        value: "DISMISSED",
        label: isVietnamese ? "Báo giả (DISMISSED)" : "Dismissed",
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

  const viewOptions = useMemo<SegmentedControlOption<CameraIncidentsViewMode>[]>(
    () => [
      {
        value: "list",
        label: isVietnamese ? "Danh sách" : "List",
        icon: <List className="size-3.5" />,
      },
      {
        value: "grid",
        label: isVietnamese ? "Lưới Before/After" : "B/A Grid",
        icon: <LayoutGrid className="size-3.5" />,
      },
    ],
    [isVietnamese],
  );

  const [page, setPage] = useState<number>(1);
  const [violationFilter, setViolationFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [groupByPerson, setGroupByPerson] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<CameraIncidentsViewMode>("list");

  useEffect(() => {
    setPage(1);
  }, [camera.id, violationFilter, statusFilter, severityFilter]);

  const {
    data: incidentsPage,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [
      "camera-detail-incidents",
      camera.id,
      "paginated",
      {
        page,
        limit: PAGE_SIZE,
        violationType: violationFilter,
        status: statusFilter,
        severity: severityFilter,
      },
    ],
    queryFn: ({ signal }) =>
      incidentService.getIncidents(
        {
          cameraId: camera.id,
          page,
          limit: PAGE_SIZE,
          violationType:
            violationFilter !== "ALL" ? violationFilter : undefined,
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          severity: severityFilter !== "ALL" ? severityFilter : undefined,
          sortOrder: "desc",
        },
        { signal },
      ),
    enabled: Boolean(camera.id) && canReadIncidents && isTabActive,
    placeholderData: (prev) => prev,
    staleTime: 15_000,
  });

  const incidents = useMemo(
    () => incidentsPage?.items ?? [],
    [incidentsPage?.items],
  );
  const totalCount = incidentsPage?.meta?.total ?? incidents.length;
  const totalPages = Math.max(
    1,
    incidentsPage?.meta?.totalPages ?? Math.ceil(totalCount / PAGE_SIZE),
  );

  const displayedClusters = useMemo(() => {
    if (!groupByPerson) {
      return incidents.map((inc) => ({
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
        personTrackId: inc.trackId ?? null,
        cameraId: inc.cameraId,
        matchMethod: "SINGLE" as const,
        matchReasons: [],
        bestSpatialIoUPct: null,
      }));
    }
    return clusterIncidentsByPerson(incidents);
  }, [incidents, groupByPerson]);

  // Extract Before/After pairs & Lightbox index map for current page
  const clusterEntries = useMemo(
    () =>
      displayedClusters.map((cluster) => ({
        cluster,
        pair: extractIncidentEvidencePair(cluster.primary, camera.code),
      })),
    [camera.code, displayedClusters],
  );

  const { pageLightboxItems, lightboxIndexByClusterId, dbUrlSet } = useMemo(() => {
    const items: AiEvidenceItem[] = [];
    const indexMap = new Map<string, number>();
    const urls = new Set<string>();
    for (const entry of clusterEntries) {
      if (entry.pair.afterUrl) urls.add(entry.pair.afterUrl);
      if (entry.pair.primaryUrl) urls.add(entry.pair.primaryUrl);
      if (entry.pair.lightboxItem) {
        indexMap.set(entry.cluster.clusterId, items.length);
        items.push(entry.pair.lightboxItem);
      }
    }
    return {
      pageLightboxItems: items,
      lightboxIndexByClusterId: indexMap,
      dbUrlSet: urls,
    };
  }, [clusterEntries]);

  // Ephemeral RAM evidences from active Live session not yet matched on current DB page
  const liveOnlyEvidences = useMemo(
    () =>
      liveEvidences.filter((ev) => {
        const key = ev.afterUrl || ev.primaryUrl;
        return key && !dbUrlSet.has(key);
      }),
    [dbUrlSet, liveEvidences],
  );

  const hasFilters =
    violationFilter !== "ALL" ||
    statusFilter !== "ALL" ||
    severityFilter !== "ALL";

  return (
    <section
      aria-label={
        isVietnamese
          ? "Sự cố và Bằng chứng Camera"
          : "Camera Incidents & Evidence"
      }
      className={`relative flex flex-col justify-between space-y-4 overflow-hidden rounded-[24px] p-4 sm:rounded-[28px] sm:p-6 ${NM.chassis}`}
    >
      <div className="pointer-events-none absolute inset-x-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="space-y-4">
        {/* Header Bar: Title + Clustering Pill + View Mode Switcher + Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl text-accent ${NM.recessed}`}
            >
              <Images className="size-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight text-foreground">
                  {isVietnamese
                    ? "Sự Cố & Bằng Chứng Before / After"
                    : "Incidents & Before / After Evidence"}
                </h2>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-bold text-primary">
                  {totalCount} {isVietnamese ? "sự cố DB" : "DB records"}
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
                  ? "Phân trang từ Incident Service & đối chiếu ảnh Trước / Sau cho"
                  : "Server-paginated incidents & Before / After snapshots for"}{" "}
                <span className="font-mono font-bold text-primary">
                  {camera.code}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl<CameraIncidentsViewMode>
              aria-label={
                isVietnamese
                  ? "Chế độ hiển thị sự cố và bằng chứng"
                  : "Incidents and evidence view mode"
              }
              options={viewOptions}
              value={viewMode}
              onValueChange={setViewMode}
              size="sm"
            />

            <RefreshButton
              variant="ghost"
              size="sm"
              onRefresh={() => void refetch()}
              isRefreshing={isFetching}
              label={isVietnamese ? "Tải lại" : "Reload"}
              iconClassName="size-3.5"
              className={`h-8 rounded-xl px-3 text-xs font-bold text-foreground ${NM.tactileBtn}`}
            />

            <Link
              href={`/incidents?cameraId=${encodeURIComponent(camera.id)}`}
              className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold text-primary ${NM.tactileBtn}`}
            >
              <span>{isVietnamese ? "Mở Quản lý Sự cố" : "All Incidents"}</span>
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* Ephemeral RAM Live Buffer Strip (auto-hidden when empty) */}
        {liveOnlyEvidences.length > 0 && (
          <div className={`space-y-2.5 rounded-2xl p-3.5 ${NM.recessed}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs">
                <Radio className="size-3.5 animate-pulse text-accent" />
                <span className="font-extrabold text-foreground">
                  {isVietnamese
                    ? "Bằng chứng Phiên Live hiện tại (RAM)"
                    : "Current Live Session Buffer (RAM)"}
                </span>
                <span className="rounded-full bg-accent/15 px-2 py-0.5 font-mono text-[10px] font-bold text-accent">
                  {liveOnlyEvidences.length}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {isVietnamese
                  ? "Nhấn vào ảnh để phóng to Before / After ngay lập tức"
                  : "Click any frame to inspect Before / After in Lightbox"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
              {liveOnlyEvidences.slice(0, 6).map((ev, idx) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => onInspectEvidence?.(liveOnlyEvidences, idx)}
                  className={`group relative overflow-hidden rounded-xl p-1.5 text-left transition hover:-translate-y-0.5 ${NM.extruded}`}
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-black/15">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ev.afterUrl || ev.primaryUrl}
                      alt={ev.type}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                    {ev.beforeUrl && ev.afterUrl && (
                      <span className="absolute left-1 top-1 rounded bg-accent px-1 py-0.5 font-mono text-[9px] font-black text-accent-foreground">
                        B/A
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-1 font-mono text-[10px]">
                    <span className="truncate font-bold text-foreground">
                      {formatViolationLabel(ev.type, locale)}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      #{ev.trackId}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Server-backed 3-Axis Filter Tray (Violation Type + Status + Severity) */}
        <div
          className={`grid grid-cols-1 gap-3 rounded-2xl p-3 sm:grid-cols-2 lg:grid-cols-12 ${NM.recessed}`}
        >
          <div className="lg:col-span-4">
            <Select
              size="sm"
              options={violationOptions}
              value={violationFilter}
              onValueChange={setViolationFilter}
              placeholder={
                isVietnamese ? "Loại vi phạm" : "Filter by violation"
              }
            />
          </div>
          <div className="lg:col-span-3">
            <Select
              size="sm"
              options={statusOptions}
              value={statusFilter}
              onValueChange={setStatusFilter}
              placeholder={isVietnamese ? "Trạng thái" : "Filter by status"}
            />
          </div>
          <div className="lg:col-span-3">
            <Select
              size="sm"
              options={severityOptions}
              value={severityFilter}
              onValueChange={setSeverityFilter}
              placeholder={isVietnamese ? "Mức độ" : "Filter by severity"}
            />
          </div>
          <div className="flex items-center justify-end lg:col-span-2">
            {hasFilters ? (
              <button
                type="button"
                onClick={() => {
                  setViolationFilter("ALL");
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

        {/* Main Content Area: Empty State vs List View vs Before/After Grid View */}
        {incidents.length === 0 ? (
          <div
            className={`rounded-2xl px-6 py-12 text-center text-xs text-muted-foreground ${NM.recessed}`}
          >
            {isLoading
              ? isVietnamese
                ? "Đang tải danh sách sự cố và bằng chứng..."
                : "Loading incidents and evidence..."
              : hasFilters
                ? isVietnamese
                  ? "Không có sự cố nào khớp bộ lọc đang chọn."
                  : "No incidents match the selected filters."
                : isVietnamese
                  ? "Chưa có sự cố nào được lưu trong Incident DB cho camera này."
                  : "No incidents recorded in Incident DB for this camera yet."}
          </div>
        ) : viewMode === "grid" ? (
          <div
            className={`grid max-h-[680px] grid-cols-1 gap-3.5 overflow-y-auto rounded-2xl p-3 md:grid-cols-2 xl:grid-cols-3 ${NM.recessed}`}
          >
            {clusterEntries.map(({ cluster, pair }) => {
              const lbIdx = lightboxIndexByClusterId.get(cluster.clusterId);
              return (
                <CameraEvidenceGridCard
                  key={cluster.clusterId}
                  cluster={cluster}
                  pair={pair}
                  onInspectLightbox={
                    onInspectEvidence && lbIdx !== undefined
                      ? () => onInspectEvidence(pageLightboxItems, lbIdx)
                      : undefined
                  }
                />
              );
            })}
          </div>
        ) : (
          <div
            className={`grid max-h-[620px] grid-cols-1 gap-2.5 overflow-y-auto rounded-2xl p-3 xl:grid-cols-2 ${NM.recessed}`}
          >
            {clusterEntries.map(({ cluster, pair }) => {
              const inc = cluster.primary;
              const isHigh =
                cluster.effectiveSeverity === "CRITICAL" ||
                cluster.effectiveSeverity === "HIGH";
              const thumbUrl =
                getIncidentEvidenceUrl(inc) || pair.primaryUrl;
              const lbIdx = lightboxIndexByClusterId.get(cluster.clusterId);
              const canZoom = Boolean(
                onInspectEvidence && lbIdx !== undefined,
              );

              return (
                <article
                  key={cluster.clusterId}
                  className={`relative flex items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-xs transition-transform hover:translate-x-0.5 ${NM.extruded}`}
                >
                  <span
                    className={`absolute inset-y-2 left-1.5 w-1 rounded-full ${
                      isHigh ? "bg-accent" : "bg-primary"
                    }`}
                  />

                  <div className="flex min-w-0 flex-1 items-center gap-3 pl-2">
                    {/* Interactive Before/After or Single Thumbnail (opens Lightbox directly) */}
                    <button
                      type="button"
                      disabled={!canZoom}
                      onClick={() => {
                        if (onInspectEvidence && lbIdx !== undefined) {
                          onInspectEvidence(pageLightboxItems, lbIdx);
                        }
                      }}
                      title={
                        canZoom
                          ? isVietnamese
                            ? "Nhấn để phóng to so sánh ảnh Before / After"
                            : "Click to zoom Before / After evidence"
                          : undefined
                      }
                      className={`group/thumb relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg ${
                        pair.isPair ? "h-12 w-24" : "h-12 w-16"
                      } ${NM.recessed} ${canZoom ? "cursor-pointer" : "cursor-default"}`}
                    >
                      {pair.isPair && pair.beforeUrl && pair.afterUrl ? (
                        <div className="grid h-full w-full grid-cols-2 gap-0.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={pair.beforeUrl}
                            alt={`Before ${inc.id}`}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={pair.afterUrl}
                            alt={`After ${inc.id}`}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : thumbUrl ? (
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

                      {pair.isPair && (
                        <span className="pointer-events-none absolute left-0.5 top-0.5 rounded bg-accent/90 px-1 font-mono text-[8px] font-black text-accent-foreground">
                          B/A
                        </span>
                      )}

                      {cluster.rawCount > 1 && (
                        <span className="pointer-events-none absolute bottom-0.5 right-0.5 rounded bg-black/75 px-1 font-mono text-[9px] font-black text-white">
                          ×{cluster.rawCount}
                        </span>
                      )}

                      {canZoom && (
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover/thumb:opacity-100">
                          <Expand className="size-3.5" />
                        </span>
                      )}
                    </button>

                    <Link
                      href={`/incidents/${inc.id}`}
                      className="min-w-0 flex-1 space-y-1"
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded-lg px-2 py-0.5 font-mono text-[10px] font-extrabold ${
                            isHigh
                              ? "bg-accent/15 text-accent"
                              : "bg-primary/15 text-primary"
                          }`}
                        >
                          {formatViolationLabel(
                            cluster.effectiveViolationType,
                            locale,
                          )}
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
                    </Link>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                    {canZoom && (
                      <button
                        type="button"
                        onClick={() => {
                          if (onInspectEvidence && lbIdx !== undefined) {
                            onInspectEvidence(pageLightboxItems, lbIdx);
                          }
                        }}
                        title={
                          isVietnamese
                            ? "Phóng to ảnh bằng chứng"
                            : "Zoom evidence image"
                        }
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-foreground hover:text-primary ${NM.tactileBtn}`}
                      >
                        <Expand className="size-3" />
                      </button>
                    )}

                    <Link
                      href={`/incidents/${inc.id}`}
                      className="inline-flex items-center gap-1.5 hover:text-foreground"
                    >
                      <Clock className="size-3" />
                      <span className="hidden sm:inline">
                        {new Date(
                          cluster.latestDetectedAt || inc.createdAt,
                        ).toLocaleString(locale)}
                      </span>
                      <ArrowUpRight className="size-3.5 text-primary" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination Bar */}
      {totalCount > 0 && (
        <div
          className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl px-3.5 py-2.5 text-xs ${NM.recessed}`}
        >
          <span className="font-mono text-[11px] font-semibold text-muted-foreground">
            {isVietnamese ? (
              <>
                Trang <strong className="text-foreground">{page}</strong> /{" "}
                {totalPages} ({totalCount} sự cố
                {groupByPerson && incidents.length > displayedClusters.length
                  ? ` · gom ${displayedClusters.length} vụ trang này`
                  : ""}
                )
              </>
            ) : (
              <>
                Page <strong className="text-foreground">{page}</strong> of{" "}
                {totalPages} ({totalCount} records)
              </>
            )}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={`inline-flex h-8 items-center gap-1 rounded-xl px-2.5 text-xs font-bold text-foreground disabled:pointer-events-none disabled:opacity-40 ${NM.tactileBtn}`}
            >
              <ChevronLeft className="size-3.5" />
              <span>{isVietnamese ? "Trước" : "Prev"}</span>
            </button>
            <button
              type="button"
              disabled={page >= totalPages || isFetching}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className={`inline-flex h-8 items-center gap-1 rounded-xl px-2.5 text-xs font-bold text-foreground disabled:pointer-events-none disabled:opacity-40 ${NM.tactileBtn}`}
            >
              <span>{isVietnamese ? "Sau" : "Next"}</span>
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
});
