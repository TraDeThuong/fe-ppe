import type {
  AiModelVersionDto,
  AiPerformanceStatDto,
  CameraItem,
  CameraStatDto,
  DashboardKpiDto,
  HourlyRiskResponseDto,
  IncidentItem,
  StatisticsSummaryDto,
  TrendItemDto,
  ViolationTypeStatDto,
} from "@/types";
import type {
  DashboardAiTelemetrySummary,
  DashboardAnalytics,
  DashboardArchivedCameraSummary,
  DashboardCameraPartition,
  DashboardCameraPartitionRow,
  DashboardCameraStat,
  DashboardCollection,
  DashboardPage,
  DashboardPeriod,
  DashboardPreset,
  DashboardSeverity,
  DashboardTrendGroupBy,
  DashboardTrendsWindow,
} from "@/types/dashboard.types";
import {
  clusterIncidentsByPerson,
  extractComponentViolationCodes,
  projectClusterToRepresentativeIncident,
  type IncidentAggregationMode,
} from "@/lib/incident-cluster-engine";

export const DASHBOARD_TIME_ZONE = "Asia/Ho_Chi_Minh";
export const DASHBOARD_MAX_RECORDS = 5000;
const DAY_MS = 86_400_000;
const vnDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: DASHBOARD_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const vnHour = new Intl.DateTimeFormat("en-GB", {
  timeZone: DASHBOARD_TIME_ZONE,
  hour: "2-digit",
  hourCycle: "h23",
});

export function vietnamToday(now = new Date()): string {
  const parts = vnDate.formatToParts(now);
  return ["year", "month", "day"]
    .map((key) => parts.find((part) => part.type === key)!.value)
    .join("-");
}
export function addCalendarDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}
function validDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  );
}
export function dashboardPeriod(
  preset: DashboardPreset,
  today: string,
  customStart = today,
  customEnd = today,
): DashboardPeriod | null {
  const endDate = preset === "custom" ? customEnd : today;
  const startDate =
    preset === "custom"
      ? customStart
      : preset === "7d"
        ? addCalendarDays(today, -6)
        : preset === "month"
          ? `${today.slice(0, 7)}-01`
          : today;
  if (
    !validDate(startDate) ||
    !validDate(endDate) ||
    startDate > endDate ||
    endDate > today ||
    (Date.parse(endDate) - Date.parse(startDate)) / DAY_MS >= 90
  )
    return null;
  const fromDate = new Date(`${startDate}T00:00:00+07:00`).toISOString();
  const endExclusive = new Date(
    `${addCalendarDays(endDate, 1)}T00:00:00+07:00`,
  ).toISOString();
  return {
    startDate,
    endDate,
    fromDate,
    endExclusive,
    toDate: new Date(Date.parse(endExclusive) - 1).toISOString(),
  };
}

export function pageTotal<T>(
  page: DashboardPage<T>,
  expectedPage: number,
  limit: number,
): number | null {
  const meta = page.meta;
  if (
    !meta ||
    !Number.isSafeInteger(meta.total) ||
    meta.total < 0 ||
    meta.page !== expectedPage ||
    meta.limit !== limit ||
    meta.totalPages !== Math.ceil(meta.total / limit)
  )
    return null;
  return meta.total;
}

/** Bounded pagination: partial collections never become aggregate input. */
export async function collectDashboardPages<T extends { id: string }>(
  fetchPage: (page: number, limit: number) => Promise<DashboardPage<T>>,
  options: {
    signal?: AbortSignal;
    maxRecords?: number;
    accept?: (item: T) => boolean;
  } = {},
): Promise<DashboardCollection<T>> {
  const {
    signal,
    maxRecords = DASHBOARD_MAX_RECORDS,
    accept = () => true,
  } = options;
  const limit = 100;
  signal?.throwIfAborted();
  const first = await fetchPage(1, limit);
  const total = pageTotal(first, 1, limit);
  const incomplete = (
    issue: DashboardCollection<T>["issue"],
  ): DashboardCollection<T> => ({ items: [], total, complete: false, issue });
  if (total === null) return incomplete("metadata");
  if (total > maxRecords) return incomplete("limit");
  const pages = [first];
  for (let page = 2; page <= first.meta!.totalPages; page += 3) {
    signal?.throwIfAborted();
    try {
      const batch = await Promise.all(
        Array.from(
          { length: Math.min(3, first.meta!.totalPages - page + 1) },
          (_, index) => fetchPage(page + index, limit),
        ),
      );
      signal?.throwIfAborted();
      for (let index = 0; index < batch.length; index++) {
        const nextTotal = pageTotal(batch[index], page + index, limit);
        if (nextTotal === null) return incomplete("metadata");
        if (nextTotal !== total) return incomplete("changed");
      }
      pages.push(...batch);
    } catch (error) {
      signal?.throwIfAborted();
      // Authorization failures must not be disguised as a partial success.
      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
        (error.status === 401 || error.status === 403)
      )
        throw error;
      return incomplete("page-error");
    }
  }
  const items = pages.flatMap((page) => page.items);
  const unique = new Map(items.map((item) => [item.id, item]));
  if (items.some((item) => !item.id || !accept(item)))
    return incomplete("invalid-record");
  if (unique.size !== total || items.length !== total)
    return incomplete("changed");
  return { items: [...unique.values()], total, complete: true, issue: null };
}

export function incidentInPeriod(
  item: IncidentItem,
  period: DashboardPeriod,
  siteId?: string | null,
): boolean {
  const time = Date.parse(item.detectedAt);
  return (
    Number.isFinite(time) &&
    time >= Date.parse(period.fromDate) &&
    time < Date.parse(period.endExclusive) &&
    (!siteId || item.siteId === siteId)
  );
}

export function aggregateDashboard(
  incidents: readonly IncidentItem[],
  options: { mode?: IncidentAggregationMode } = {},
): DashboardAnalytics {
  const mode: IncidentAggregationMode = options.mode ?? "clustered";
  const clusters =
    mode === "clustered" ? clusterIncidentsByPerson(incidents) : null;
  const effectiveItems = clusters
    ? clusters.map(projectClusterToRepresentativeIncident)
    : incidents;

  const distribution = new Map<string, number>(
    ["NO_HELMET", "NO_VEST", "RESTRICTED_AREA", "MULTI_VIOLATION", "OTHER"].map(
      (key) => [key, 0],
    ),
  );
  const componentBreakdown = new Map<string, number>(
    ["NO_HELMET", "NO_VEST", "RESTRICTED_AREA", "OTHER"].map((key) => [key, 0]),
  );

  for (const raw of incidents) {
    const codes = extractComponentViolationCodes(raw);
    for (const code of codes) {
      if (code === "MULTI_VIOLATION") continue;
      const key = componentBreakdown.has(code) ? code : "OTHER";
      componentBreakdown.set(key, componentBreakdown.get(key)! + 1);
    }
  }

  const hours = Array<number>(24).fill(0);
  const severities = new Map<string, DashboardSeverity>(
    ["CRITICAL", "HIGH", "MEDIUM", "LOW", "OTHER"].map((key) => [
      key,
      {
        key,
        count: 0,
        pending: 0,
        confirmed: 0,
        resolved: 0,
        dismissed: 0,
        other: 0,
        mttrMinutes: null,
        resolutionSamples: 0,
      },
    ]),
  );
  const cameras = new Map<string, DashboardCameraStat>();
  const durations = new Map<string, number>();
  let reviewed = 0;
  let dismissed = 0;
  for (const item of effectiveItems) {
    const type = distribution.has(item.violationType)
      ? item.violationType
      : "OTHER";
    distribution.set(type, distribution.get(type)! + 1);
    hours[Number(vnHour.format(new Date(item.detectedAt)))]++;
    const severity = severities.get(item.severity) ?? severities.get("OTHER")!;
    severity.count++;
    if (item.status === "PENDING_REVIEW") severity.pending++;
    else if (item.status === "CONFIRMED") {
      severity.confirmed++;
      reviewed++;
    } else if (item.status === "DISMISSED") {
      severity.dismissed++;
      dismissed++;
      reviewed++;
    } else if (item.status === "RESOLVED" || item.status === "CLOSED") {
      severity.resolved++;
      reviewed++;
      const minutes =
        (Date.parse(item.resolvedAt ?? "") - Date.parse(item.detectedAt)) /
        60_000;
      if (Number.isFinite(minutes) && minutes >= 0) {
        severity.resolutionSamples++;
        durations.set(
          severity.key,
          (durations.get(severity.key) ?? 0) + minutes,
        );
      }
    } else severity.other++;
    const cameraId = item.cameraId || "OTHER";
    const camera = cameras.get(cameraId) ?? {
      cameraId,
      cameraName: item.cameraName,
      total: 0,
      pending: 0,
      resolved: 0,
      dismissed: 0,
    };
    camera.total++;
    if (item.status === "PENDING_REVIEW" || item.status === "CONFIRMED")
      camera.pending++;
    else if (item.status === "RESOLVED" || item.status === "CLOSED")
      camera.resolved++;
    else if (item.status === "DISMISSED")
      camera.dismissed++;
    cameras.set(cameraId, camera);
  }
  const rows = [...severities.values()].filter(
    (item) => item.key !== "OTHER" || item.count > 0,
  );
  rows.forEach((item) => {
    item.mttrMinutes = item.resolutionSamples
      ? durations.get(item.key)! / item.resolutionSamples
      : null;
  });
  const resolutionSamples = rows.reduce(
    (sum, row) => sum + row.resolutionSamples,
    0,
  );
  const minutes = [...durations.values()].reduce(
    (sum, value) => sum + value,
    0,
  );
  const multiViolationClusters = clusters
    ? clusters.filter((c) => c.isMultiViolation).length
    : effectiveItems.filter((item) => item.violationType === "MULTI_VIOLATION")
        .length;

  return {
    total: effectiveItems.length,
    rawTotal: incidents.length,
    multiViolationClusters,
    aggregationMode: mode,
    componentViolationBreakdown: [...componentBreakdown]
      .map(([key, count]) => ({ key, count }))
      .filter((item) => item.count > 0),
    dismissed,
    reviewed,
    dismissedRate: reviewed ? (dismissed / reviewed) * 100 : null,
    distribution: [...distribution]
      .map(([key, count]) => ({ key, count }))
      .filter((item) => item.key !== "OTHER" || item.count > 0),
    hours,
    shifts: {
      morning: hours.slice(6, 14).reduce((a, b) => a + b, 0),
      afternoon: hours.slice(14, 22).reduce((a, b) => a + b, 0),
      night: [...hours.slice(22), ...hours.slice(0, 6)].reduce(
        (a, b) => a + b,
        0,
      ),
    },
    severities: rows,
    cameras: [...cameras.values()].sort(
      (a, b) => b.total - a.total || a.cameraId.localeCompare(b.cameraId),
    ),
    mttrMinutes: resolutionSamples ? minutes / resolutionSamples : null,
    resolutionSamples,
  };
}

/**
 * Separates active catalog cameras from archived/deleted camera IDs present in historical incidents
 * so the dashboard camera card stays aligned 1-to-1 with the active camera fleet.
 */
export function partitionDashboardCameras(
  cameras: readonly CameraItem[],
  cameraStats: readonly DashboardCameraStat[],
  options: { catalogComplete?: boolean; topOnly?: boolean } = {},
): DashboardCameraPartition {
  const { catalogComplete = false, topOnly = false } = options;
  const statsMap = new Map(cameraStats.map((row) => [row.cameraId, row]));
  const cameraMap = new Map(cameras.map((camera) => [camera.id, camera]));

  const sortRows = (
    a: DashboardCameraPartitionRow,
    b: DashboardCameraPartitionRow,
  ): number => {
    const totalDiff = (b.stat?.total ?? 0) - (a.stat?.total ?? 0);
    if (totalDiff !== 0) return totalDiff;
    const pendingDiff = (b.stat?.pending ?? 0) - (a.stat?.pending ?? 0);
    if (pendingDiff !== 0) return pendingDiff;
    const aLabel = a.camera?.name ?? a.stat?.cameraName ?? a.cameraId;
    const bLabel = b.camera?.name ?? b.stat?.cameraName ?? b.cameraId;
    return aLabel.localeCompare(bLabel);
  };

  if (catalogComplete) {
    const activeRows: DashboardCameraPartitionRow[] = cameras
      .map((camera) => ({
        cameraId: camera.id,
        camera,
        stat: statsMap.get(camera.id),
        inCatalog: true,
      }))
      .sort(sortRows);

    const archivedRows = cameraStats.filter(
      (row) => !cameraMap.has(row.cameraId) && row.total > 0,
    );
    const archived: DashboardArchivedCameraSummary | null =
      archivedRows.length > 0
        ? archivedRows.reduce<DashboardArchivedCameraSummary>(
            (acc, row) => ({
              cameraCount: acc.cameraCount + 1,
              total: acc.total + row.total,
              pending: acc.pending + row.pending,
              resolved: acc.resolved + row.resolved,
              dismissed: acc.dismissed + row.dismissed,
            }),
            {
              cameraCount: 0,
              total: 0,
              pending: 0,
              resolved: 0,
              dismissed: 0,
            },
          )
        : null;

    return {
      rows: topOnly ? activeRows.slice(0, 5) : activeRows,
      archived,
    };
  }

  const fallbackIds = topOnly
    ? cameraStats.slice(0, 5).map((row) => row.cameraId)
    : [
        ...new Set([
          ...cameraStats.map((row) => row.cameraId),
          ...cameras.map((camera) => camera.id),
        ]),
      ];

  const rows: DashboardCameraPartitionRow[] = fallbackIds
    .map((cameraId) => ({
      cameraId,
      camera: cameraMap.get(cameraId),
      stat: statsMap.get(cameraId),
      inCatalog: cameraMap.has(cameraId),
    }))
    .sort(sortRows);

  return { rows, archived: null };
}

export function dashboardIncidentHref(
  siteId?: string | null,
  period?: DashboardPeriod | null,
  status?: string,
): string {
  const params = new URLSearchParams();
  if (siteId) params.set("siteId", siteId);
  else params.set("siteId", ""); // An explicit all-sites selection must not inherit an old global site.
  if (period) {
    params.set("fromDate", period.fromDate);
    params.set("toDate", period.toDate);
  }
  if (status) params.set("status", status);
  return `/incidents?${params}`;
}

function isoWeekBucketKey(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return dateStr;
  const target = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + (((4 - target.getUTCDay()) + 7) % 7));
  }
  const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  const weekYear = new Date(firstThursday).getUTCFullYear();
  return `${weekYear}-W${String(weekNum).padStart(2, "0")}`;
}

function trendBucketKeyForDay(
  dateStr: string,
  groupBy: DashboardTrendGroupBy,
): string {
  if (groupBy === "WEEK") return isoWeekBucketKey(dateStr);
  if (groupBy === "MONTH") return dateStr.slice(0, 7);
  return dateStr;
}

/**
 * Xác định cửa sổ truy vấn cho biểu đồ Xu hướng (Ngày / Tuần / Tháng) trên Dashboard.
 * Đảm bảo luôn nằm trong giới hạn <= 90 ngày của Backend (trendsFilterSchema),
 * đồng thời tự động mở rộng hợp lý khi người dùng đang để kỳ 1 ngày ("Hôm nay")
 * hoặc chuyển sang chế độ xem theo Tuần / Tháng để biểu đồ đường luôn có nhiều điểm so sánh.
 */
export function resolveDashboardTrendsWindow(
  period: DashboardPeriod | null,
  groupBy: DashboardTrendGroupBy,
): DashboardTrendsWindow | null {
  if (!period) return null;
  const endDate = period.endDate;
  const diffDays =
    (Date.parse(`${period.endDate}T00:00:00Z`) -
      Date.parse(`${period.startDate}T00:00:00Z`)) /
    DAY_MS;

  if (groupBy === "DAY") {
    if (diffDays < 1) {
      return {
        startDate: addCalendarDays(endDate, -6),
        endDate,
        groupBy,
        autoExpanded: true,
      };
    }
    return {
      startDate: period.startDate,
      endDate,
      groupBy,
      autoExpanded: false,
    };
  }

  if (groupBy === "WEEK") {
    if (diffDays < 27) {
      return {
        startDate: addCalendarDays(endDate, -55),
        endDate,
        groupBy,
        autoExpanded: true,
      };
    }
    return {
      startDate: period.startDate,
      endDate,
      groupBy,
      autoExpanded: false,
    };
  }

  // groupBy === "MONTH" (tối đa 89 ngày lùi = 90 ngày inclusive khớp giới hạn MAX_DATE_RANGE_DAYS = 90 của BE)
  if (diffDays < 60) {
    return {
      startDate: addCalendarDays(endDate, -89),
      endDate,
      groupBy,
      autoExpanded: true,
    };
  }
  return {
    startDate: period.startDate,
    endDate,
    groupBy,
    autoExpanded: false,
  };
}

/**
 * Chuẩn hóa chuỗi dữ liệu từ GET /api/v1/statistics/trends:
 * Lấp đầy các mốc Ngày / Tuần ISO / Tháng bằng 0 trong khoảng [startDate, endDate]
 * để trục hoành biểu đồ liên tục, chính xác theo thời gian thực.
 */
export function normalizeDashboardTrends(
  rawTrends: readonly TrendItemDto[],
  window: DashboardTrendsWindow | null,
): TrendItemDto[] {
  if (!window || !window.startDate || !window.endDate) {
    return [...rawTrends].sort((a, b) => a.date.localeCompare(b.date));
  }

  const buckets = new Map<string, TrendItemDto>();
  let cursor = window.startDate;
  let guard = 0;
  while (cursor <= window.endDate && guard <= 92) {
    const key = trendBucketKeyForDay(cursor, window.groupBy);
    if (!buckets.has(key)) {
      buckets.set(key, {
        date: key,
        totalIncidents: 0,
        trueViolations: 0,
        falseAlarms: 0,
        resolvedCount: 0,
      });
    }
    cursor = addCalendarDays(cursor, 1);
    guard += 1;
  }

  for (const row of rawTrends) {
    if (!row?.date) continue;
    const existing = buckets.get(row.date) ?? {
      date: row.date,
      totalIncidents: 0,
      trueViolations: 0,
      falseAlarms: 0,
      resolvedCount: 0,
    };
    existing.totalIncidents += Number(row.totalIncidents ?? 0);
    existing.trueViolations += Number(row.trueViolations ?? 0);
    existing.falseAlarms += Number(row.falseAlarms ?? 0);
    existing.resolvedCount += Number(row.resolvedCount ?? 0);
    buckets.set(row.date, existing);
  }

  return Array.from(buckets.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

/**
 * Tổng hợp FPS và Inference Latency thực tế có trọng số (theo totalFrames) từ GET /api/v1/statistics/ai-performance,
 * tự động fallback minh bạch về thông số khai báo của phiên bản model đang triển khai khi chưa có bản ghi telemetry trong kỳ.
 */
export function summarizeAiPerformanceTelemetry(
  rows: readonly AiPerformanceStatDto[] | undefined,
  activeVersion?: AiModelVersionDto | null,
  kpiActiveModel?: DashboardKpiDto["activeModel"] | null,
): DashboardAiTelemetrySummary {
  const safeRows = rows ?? [];
  const matchedRows =
    activeVersion?.id &&
    safeRows.some((r) => r.modelVersionId === activeVersion.id)
      ? safeRows.filter((r) => r.modelVersionId === activeVersion.id)
      : safeRows;

  if (matchedRows.length > 0) {
    let totalFrames = 0;
    let totalWeight = 0;
    let weightedFpsSum = 0;
    let weightedLatencySum = 0;
    let maxLatencyMs = 0;
    const uniqueDays = new Set<string>();

    for (const row of matchedRows) {
      const fps = Number(row.avgFps ?? 0);
      const latency = Number(row.avgLatencyMs ?? 0);
      const rowMaxLatency = Number(row.maxLatencyMs ?? 0);
      const frames = Number(row.totalFrames ?? 0);
      if (
        (!Number.isFinite(fps) || fps <= 0) &&
        (!Number.isFinite(latency) || latency <= 0)
      ) {
        continue;
      }
      const weight = Number.isFinite(frames) && frames > 0 ? frames : 1;
      if (Number.isFinite(frames) && frames > 0) {
        totalFrames += frames;
      }
      totalWeight += weight;
      if (Number.isFinite(fps) && fps > 0) {
        weightedFpsSum += fps * weight;
      }
      if (Number.isFinite(latency) && latency > 0) {
        weightedLatencySum += latency * weight;
      }
      if (Number.isFinite(rowMaxLatency) && rowMaxLatency > maxLatencyMs) {
        maxLatencyMs = rowMaxLatency;
      }
      if (row.statDate) {
        uniqueDays.add(String(row.statDate).slice(0, 10));
      }
    }

    if (totalWeight > 0) {
      const avgFps =
        weightedFpsSum > 0
          ? Number((weightedFpsSum / totalWeight).toFixed(1))
          : null;
      const avgLatencyMs =
        weightedLatencySum > 0
          ? Number((weightedLatencySum / totalWeight).toFixed(1))
          : null;
      if (avgFps !== null || avgLatencyMs !== null) {
        return {
          avgFps,
          avgLatencyMs,
          maxLatencyMs: maxLatencyMs > 0 ? Number(maxLatencyMs.toFixed(1)) : null,
          totalFrames,
          sampleDays: uniqueDays.size,
          source: "telemetry",
        };
      }
    }
  }

  const declaredFps =
    typeof activeVersion?.metrics?.fps === "number" &&
    Number.isFinite(activeVersion.metrics.fps) &&
    activeVersion.metrics.fps > 0
      ? Number(activeVersion.metrics.fps.toFixed(1))
      : typeof kpiActiveModel?.fps === "number" &&
          Number.isFinite(kpiActiveModel.fps) &&
          kpiActiveModel.fps > 0
        ? Number(kpiActiveModel.fps.toFixed(1))
        : null;

  const declaredLatency =
    typeof activeVersion?.metrics?.latencyMs === "number" &&
    Number.isFinite(activeVersion.metrics.latencyMs) &&
    activeVersion.metrics.latencyMs > 0
      ? Number(activeVersion.metrics.latencyMs.toFixed(1))
      : typeof kpiActiveModel?.latencyMs === "number" &&
          Number.isFinite(kpiActiveModel.latencyMs) &&
          kpiActiveModel.latencyMs > 0
        ? Number(kpiActiveModel.latencyMs.toFixed(1))
        : null;

  const declaredFrames =
    typeof activeVersion?.metrics?.totalFramesProcessed === "number" &&
    Number.isFinite(activeVersion.metrics.totalFramesProcessed)
      ? activeVersion.metrics.totalFramesProcessed
      : 0;

  if (declaredFps !== null || declaredLatency !== null) {
    return {
      avgFps: declaredFps,
      avgLatencyMs: declaredLatency,
      maxLatencyMs: null,
      totalFrames: declaredFrames,
      sampleDays: 0,
      source: "declared",
    };
  }

  return {
    avgFps: null,
    avgLatencyMs: null,
    maxLatencyMs: null,
    totalFrames: 0,
    sampleDays: 0,
    source: "none",
  };
}

function normalizeViolationKey(rawType: string): string {
  const upper = String(rawType || "").trim().toUpperCase();
  if (upper === "NO_HELMET" || upper === "NO_HARD_HAT") return "NO_HELMET";
  if (upper === "NO_VEST" || upper === "NO_SAFETY_VEST") return "NO_VEST";
  if (upper === "RESTRICTED_AREA" || upper === "RESTRICTED_ZONE") {
    return "RESTRICTED_AREA";
  }
  if (upper === "MULTI_VIOLATION") return "MULTI_VIOLATION";
  return "OTHER";
}

function allocateProportionalCounts(
  totalToSplit: number,
  weights: readonly [number, number, number],
): [number, number, number] {
  if (totalToSplit <= 0) return [0, 0, 0];
  const weightSum = weights[0] + weights[1] + weights[2];
  if (weightSum <= 0) {
    return [totalToSplit, 0, 0];
  }
  const exact = weights.map((w) => (totalToSplit * w) / weightSum);
  const floors: [number, number, number] = [
    Math.floor(exact[0]),
    Math.floor(exact[1]),
    Math.floor(exact[2]),
  ];
  let remainder = totalToSplit - (floors[0] + floors[1] + floors[2]);
  const order = [0, 1, 2].sort(
    (a, b) => exact[b] - floors[b] - (exact[a] - floors[a]),
  );
  for (let idx = 0; idx < order.length && remainder > 0; idx += 1) {
    floors[order[idx]] += 1;
    remainder -= 1;
  }
  return floors;
}

/**
 * Chuyển đổi trực tiếp kết quả từ bộ API thống kê của smart-ppe-reporting-service
 * (/statistics/summary, /statistics/by-violation, /statistics/hourly-risk, /statistics/by-camera)
 * sang cấu trúc DashboardAnalytics thống nhất cho toàn bộ thẻ KPI và biểu đồ trên /dashboard,
 * loại bỏ hoàn toàn nhu cầu tải 5.000 bản ghi sự cố thô về trình duyệt.
 */
export function buildDashboardAnalyticsFromReporting(input: {
  summary: StatisticsSummaryDto;
  violations?: readonly ViolationTypeStatDto[] | null;
  hourlyRisk?: HourlyRiskResponseDto | null;
  cameraRankings?: readonly CameraStatDto[] | null;
}): DashboardAnalytics {
  const { summary, violations, hourlyRisk, cameraRankings } = input;

  // 1. Phân loại vi phạm PPE (lọc bỏ bản ghi kỹ thuật TOTAL_AGGREGATED của aggregateDailyStats)
  const distributionMap = new Map<string, number>([
    ["NO_HELMET", 0],
    ["NO_VEST", 0],
    ["RESTRICTED_AREA", 0],
    ["MULTI_VIOLATION", 0],
    ["OTHER", 0],
  ]);

  for (const row of violations ?? []) {
    const rawCode = String(row.violationType || "").trim().toUpperCase();
    if (!rawCode || rawCode === "TOTAL_AGGREGATED") continue;
    const count = Math.max(0, Number(row.count ?? 0));
    if (count === 0 && !distributionMap.has(rawCode)) continue;
    const key = normalizeViolationKey(rawCode);
    distributionMap.set(key, (distributionMap.get(key) ?? 0) + count);
  }

  const distribution = [...distributionMap.entries()]
    .map(([key, count]) => ({ key, count }))
    .filter((item) => item.key !== "OTHER" || item.count > 0);

  const violationSum = distribution.reduce((acc, item) => acc + item.count, 0);
  const total = Math.max(Number(summary.totalIncidents ?? 0), violationSum);

  // 2. Phân bố 24 giờ & 3 ca trực (Sáng 06-14h, Chiều 14-22h, Đêm 22-06h)
  const hours = Array<number>(24).fill(0);
  for (const h of hourlyRisk?.hourly ?? []) {
    const idx = Number(h.hour);
    if (Number.isInteger(idx) && idx >= 0 && idx < 24) {
      hours[idx] = Math.max(0, Number(h.count ?? 0));
    }
  }

  const shifts = {
    morning:
      hourlyRisk?.shifts?.morning?.totalIncidents ??
      hours.slice(6, 14).reduce((a, b) => a + b, 0),
    afternoon:
      hourlyRisk?.shifts?.afternoon?.totalIncidents ??
      hours.slice(14, 22).reduce((a, b) => a + b, 0),
    night:
      hourlyRisk?.shifts?.night?.totalIncidents ??
      [...hours.slice(22), ...hours.slice(0, 6)].reduce((a, b) => a + b, 0),
  };

  // 3. Phân bố mức độ nghiêm trọng, SLA & MTTR từ summary.severityBreakdown
  const openTotal = Math.max(0, Number(summary.openIncidents ?? 0));
  const confirmedTotal = Math.max(0, Number(summary.trueViolations ?? 0));
  const resolvedTotal = Math.max(0, Number(summary.resolvedIncidents ?? 0));
  const dismissedTotal = Math.max(0, Number(summary.falseAlarms ?? 0));

  const defaultSla: Record<"CRITICAL" | "HIGH" | "MEDIUM" | "LOW", number> = {
    CRITICAL: 15,
    HIGH: 30,
    MEDIUM: 60,
    LOW: 120,
  };

  // Fallback đếm mức độ từ bảng by-violation nếu summary.severityBreakdown trống nhưng violations có số liệu
  const fallbackSevCounts: Record<"CRITICAL" | "HIGH" | "MEDIUM" | "LOW", number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };
  for (const v of violations ?? []) {
    if (String(v.violationType || "").toUpperCase() === "TOTAL_AGGREGATED") {
      continue;
    }
    const sb = v.severityBreakdown;
    if (!sb) continue;
    fallbackSevCounts.CRITICAL += Number(sb.CRITICAL ?? 0);
    fallbackSevCounts.HIGH += Number(sb.HIGH ?? 0);
    fallbackSevCounts.MEDIUM += Number(sb.MEDIUM ?? 0) + Number(sb.NORMAL ?? 0);
    fallbackSevCounts.LOW += Number(sb.LOW ?? 0);
  }

  const breakdown = summary.severityBreakdown;
  const breakdownSum = breakdown
    ? Number(breakdown.CRITICAL?.count ?? 0) +
      Number(breakdown.HIGH?.count ?? 0) +
      Number(breakdown.MEDIUM?.count ?? 0) +
      Number(breakdown.LOW?.count ?? 0)
    : 0;

  const severities: DashboardSeverity[] = (
    ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const
  ).map((key) => {
    const rawItem = breakdown?.[key];
    const count = Math.max(
      0,
      breakdownSum > 0
        ? Number(rawItem?.count ?? 0)
        : fallbackSevCounts[key],
    );
    const resolved = Math.min(
      count,
      Math.max(
        0,
        breakdownSum > 0
          ? Number(rawItem?.resolved ?? 0)
          : total > 0
            ? Math.round((count * resolvedTotal) / total)
            : 0,
      ),
    );
    const remaining = Math.max(0, count - resolved);
    const [pending, confirmed, dismissed] = allocateProportionalCounts(
      remaining,
      [openTotal, confirmedTotal, dismissedTotal],
    );
    const actualMttr = Number(rawItem?.actualMttrMinutes ?? 0);
    const mttrMinutes = actualMttr > 0 ? Number(actualMttr.toFixed(1)) : null;
    const targetSlaMinutes = Number(
      rawItem?.targetSlaMinutes ?? defaultSla[key],
    );

    return {
      key,
      count,
      pending,
      confirmed,
      resolved,
      dismissed,
      other: 0,
      mttrMinutes,
      targetSlaMinutes,
      resolutionSamples: mttrMinutes !== null ? resolved : 0,
    };
  });

  // 4. Điểm nóng Camera từ GET /api/v1/statistics/by-camera
  const cameras: DashboardCameraStat[] = (cameraRankings ?? [])
    .filter((row) => Boolean(row.cameraId))
    .map((row) => {
      const camTotal = Math.max(0, Number(row.totalViolations ?? 0));
      const camResolved = Math.min(
        camTotal,
        Math.max(0, Number(row.resolvedCount ?? 0)),
      );
      const camDismissed = Math.min(
        Math.max(0, camTotal - camResolved),
        Math.max(0, Number(row.falseAlarmCount ?? 0)),
      );
      const camPending = Math.max(0, camTotal - camResolved - camDismissed);
      return {
        cameraId: row.cameraId,
        cameraName: row.cameraName,
        total: camTotal,
        pending: camPending,
        resolved: camResolved,
        dismissed: camDismissed,
      };
    })
    .sort(
      (a, b) => b.total - a.total || a.cameraId.localeCompare(b.cameraId),
    );

  // 5. Tổng hợp tỷ lệ thẩm duyệt & MTTR toàn kỳ
  const trueViolationsTotal =
    openTotal + confirmedTotal + resolvedTotal + dismissedTotal <= total
      ? confirmedTotal + resolvedTotal
      : Math.max(confirmedTotal, resolvedTotal);
  const reviewed = trueViolationsTotal + dismissedTotal;
  const dismissedRate =
    reviewed > 0
      ? Number(((dismissedTotal / reviewed) * 100).toFixed(2))
      : typeof summary.falseAlarmRate === "number" && summary.falseAlarmRate > 0
        ? summary.falseAlarmRate
        : null;

  const summaryMttrHours = Number(summary.meanTimeToResolveHours ?? 0);
  const weightedBreakdownSamples = severities.reduce(
    (sum, s) => sum + s.resolutionSamples,
    0,
  );
  const weightedBreakdownMinutes = severities.reduce(
    (sum, s) => sum + (s.mttrMinutes ?? 0) * s.resolutionSamples,
    0,
  );
  const mttrMinutes =
    summaryMttrHours > 0
      ? Number((summaryMttrHours * 60).toFixed(1))
      : weightedBreakdownSamples > 0
        ? Number(
            (weightedBreakdownMinutes / weightedBreakdownSamples).toFixed(1),
          )
        : null;

  const resolutionSamples =
    mttrMinutes !== null
      ? Math.max(resolvedTotal, weightedBreakdownSamples)
      : 0;

  return {
    total,
    rawTotal: total,
    multiViolationClusters: distributionMap.get("MULTI_VIOLATION") ?? 0,
    aggregationMode: "raw",
    componentViolationBreakdown: distribution.filter(
      (item) => item.key !== "MULTI_VIOLATION" && item.count > 0,
    ),
    dismissed: dismissedTotal,
    reviewed,
    dismissedRate,
    distribution,
    hours,
    shifts,
    severities,
    cameras,
    mttrMinutes,
    resolutionSamples,
    openIncidents: openTotal,
    resolvedIncidents: resolvedTotal,
    trueViolations: confirmedTotal,
    falseAlarms: dismissedTotal,
    falseAlarmRate:
      dismissedRate ??
      (typeof summary.falseAlarmRate === "number" && reviewed > 0
        ? summary.falseAlarmRate
        : null),
    complianceRate:
      typeof summary.complianceRate === "number"
        ? summary.complianceRate
        : null,
    hourlyDate: hourlyRisk?.date ?? null,
  };
}
