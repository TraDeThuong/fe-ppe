import type {
  IncidentQueryParams,
  IncidentSeverity,
  IncidentStatusCounts,
  PaginationMeta,
  ViolationType,
} from "@/types";

/**
 * Bộ lọc của trang danh sách sự cố mà các con số đếm phải khớp theo.
 *
 * `GET /incidents/status-counts` (nhánh develop) chỉ nhận site / camera / khoảng ngày và
 * lặng lẽ bỏ qua mọi tham số khác. Vì vậy khi có thêm tìm kiếm, mức độ, loại vi phạm hay
 * người được giao, FE đếm bằng `meta.total` của `GET /incidents?limit=1` — endpoint danh
 * sách hỗ trợ đủ các bộ lọc này.
 */
export type IncidentCountFilters = Pick<
  IncidentQueryParams,
  | "siteId"
  | "cameraId"
  | "cameraIds"
  | "fromDate"
  | "toDate"
  | "search"
  | "severity"
  | "violationType"
  | "assignedTo"
  | "assignedToMe"
>;

/** Các tham số `/incidents/status-counts` thực sự áp dụng. */
export type StatusCountsSupportedFilters = Pick<
  IncidentQueryParams,
  "siteId" | "cameraId" | "cameraIds" | "fromDate" | "toDate"
>;

export type IncidentPageFetcher = (
  params: IncidentQueryParams,
) => Promise<{ items: unknown[]; meta?: PaginationMeta }>;

export const INCIDENT_COUNT_STATUSES = [
  "PENDING_REVIEW",
  "CONFIRMED",
  "RESOLVED",
  "CLOSED",
  "DISMISSED",
] as const;

export const INCIDENT_COUNT_SEVERITIES: readonly IncidentSeverity[] = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
];

export const INCIDENT_COUNT_VIOLATION_TYPES: readonly ViolationType[] = [
  "NO_HELMET",
  "NO_VEST",
  "RESTRICTED_AREA",
  "MULTI_VIOLATION",
];

/**
 * Sự cố ở các trạng thái này vẫn thuộc về người từng được giao sau khi phân công đã kết
 * thúc (BE chuyển phân công sang COMPLETED), nên phải đọc mọi phân công thay vì chỉ ACTIVE.
 */
const ASSIGNEE_HISTORY_STATUSES = new Set<string>(["RESOLVED", "CLOSED"]);

export function hasAssigneeFilter(filters: IncidentCountFilters): boolean {
  return Boolean(filters.assignedTo || filters.assignedToMe);
}

export function hasExtendedCountFilters(filters: IncidentCountFilters): boolean {
  return Boolean(
    filters.search?.trim() ||
      filters.severity ||
      filters.violationType ||
      hasAssigneeFilter(filters),
  );
}

/**
 * Khi lọc theo người được giao: hàng chờ (chờ duyệt / đã xác nhận / đã bác bỏ) chỉ tính
 * phân công đang hiệu lực; còn đã xử lý, đã đóng và "Tất cả" tính mọi phân công từng có.
 * Nhờ vậy mỗi con số luôn bằng tổng của đúng danh sách mở ra khi bấm vào nó.
 */
export function includeAllAssignmentsFor(
  filters: IncidentCountFilters,
  status?: string | null,
): boolean {
  return hasAssigneeFilter(filters) && (!status || ASSIGNEE_HISTORY_STATUSES.has(status));
}

export function pickStatusCountsFilters(
  filters: IncidentCountFilters,
): StatusCountsSupportedFilters {
  const picked: StatusCountsSupportedFilters = {};
  if (filters.siteId) picked.siteId = filters.siteId;
  if (filters.cameraId) picked.cameraId = filters.cameraId;
  if (filters.cameraIds !== undefined) picked.cameraIds = filters.cameraIds;
  if (filters.fromDate) picked.fromDate = filters.fromDate;
  if (filters.toDate) picked.toDate = filters.toDate;
  return picked;
}

function scopedParams(
  filters: IncidentCountFilters,
  status?: string,
): IncidentQueryParams {
  const search = filters.search?.trim();
  return {
    ...filters,
    search: search || undefined,
    ...(status ? { status } : {}),
    ...(includeAllAssignmentsFor(filters, status) ? { includeAllAssignments: true } : {}),
  };
}

/** Đếm chính xác một tập sự cố bằng `meta.total` của một trang `limit=1`. */
export async function countIncidents(
  fetchPage: IncidentPageFetcher,
  params: IncidentQueryParams,
): Promise<number> {
  const page = await fetchPage({ ...params, page: 1, limit: 1 });
  const total = page.meta?.total;
  if (typeof total !== "number" || !Number.isSafeInteger(total) || total < 0) {
    throw new Error("Invalid incident count metadata");
  }
  return total;
}

/**
 * Bộ đếm trạng thái khớp đủ bộ lọc của danh sách (7 request nhỏ chạy song song).
 * `resolved` gồm cả CLOSED, giống quy ước của `/incidents/status-counts`.
 */
export async function fetchFilteredStatusCounts(
  fetchPage: IncidentPageFetcher,
  filters: IncidentCountFilters,
): Promise<IncidentStatusCounts> {
  const criticalExcluded = Boolean(filters.severity && filters.severity !== "CRITICAL");
  const [total, pendingReview, confirmed, resolvedOnly, closed, dismissed, critical] =
    await Promise.all([
      countIncidents(fetchPage, scopedParams(filters)),
      ...INCIDENT_COUNT_STATUSES.map((status) =>
        countIncidents(fetchPage, scopedParams(filters, status)),
      ),
      criticalExcluded
        ? Promise.resolve(0)
        : countIncidents(fetchPage, { ...scopedParams(filters), severity: "CRITICAL" }),
    ]);
  return withDerivedCounts({
    total,
    pendingReview,
    confirmed,
    critical,
    resolved: resolvedOnly + closed,
    closed,
    dismissed,
  });
}

/**
 * Bổ sung các chỉ số suy ra được từ bộ đếm gốc. `remediated` tính mọi sự cố đã xử lý
 * (kể cả đã đóng); `falseAlarms` là số sự cố bị bác bỏ đang chờ đóng.
 */
export function withDerivedCounts(counts: IncidentStatusCounts): IncidentStatusCounts {
  return {
    ...counts,
    remediated: counts.remediated ?? counts.resolved,
    falseAlarms: counts.falseAlarms ?? counts.dismissed,
  };
}

export interface IncidentBreakdown {
  bySeverity: Partial<Record<IncidentSeverity, number>>;
  byViolationType: Partial<Record<ViolationType, number>>;
}

/**
 * Phân bố theo mức độ và loại vi phạm trong đúng phạm vi "Tất cả" của bộ lọc hiện tại
 * (8 request nhỏ). Một chiều đã bị lọc cố định thì các giá trị khác bằng 0, không cần gọi.
 */
export async function fetchIncidentBreakdown(
  fetchPage: IncidentPageFetcher,
  filters: IncidentCountFilters,
): Promise<IncidentBreakdown> {
  const base = scopedParams(filters);
  const [severityCounts, violationCounts] = await Promise.all([
    Promise.all(
      INCIDENT_COUNT_SEVERITIES.map((severity) =>
        filters.severity && filters.severity !== severity
          ? Promise.resolve(0)
          : countIncidents(fetchPage, { ...base, severity }),
      ),
    ),
    Promise.all(
      INCIDENT_COUNT_VIOLATION_TYPES.map((violationType) =>
        filters.violationType && filters.violationType !== violationType
          ? Promise.resolve(0)
          : countIncidents(fetchPage, { ...base, violationType }),
      ),
    ),
  ]);
  return {
    bySeverity: Object.fromEntries(
      INCIDENT_COUNT_SEVERITIES.map((severity, i) => [severity, severityCounts[i]]),
    ),
    byViolationType: Object.fromEntries(
      INCIDENT_COUNT_VIOLATION_TYPES.map((type, i) => [type, violationCounts[i]]),
    ),
  };
}

export interface SeverityStatusCounts {
  total: number;
  pending: number;
  confirmed: number;
  resolved: number;
  dismissed: number;
}

export type SeverityStatusMatrix = Record<IncidentSeverity, SeverityStatusCounts>;

/**
 * Số sự cố theo từng mức độ × trạng thái (16 request nhỏ: tổng + 3 hàng chờ cho mỗi mức độ).
 * `resolved` = phần còn lại (RESOLVED + CLOSED) vì năm trạng thái phủ kín tập sự cố.
 */
export async function fetchSeverityStatusMatrix(
  fetchPage: IncidentPageFetcher,
  filters: IncidentCountFilters,
): Promise<SeverityStatusMatrix> {
  const rows = await Promise.all(
    INCIDENT_COUNT_SEVERITIES.map(async (severity) => {
      const base = { ...scopedParams(filters), severity };
      const [total, pending, confirmed, dismissed] = await Promise.all([
        countIncidents(fetchPage, base),
        countIncidents(fetchPage, { ...base, status: "PENDING_REVIEW" }),
        countIncidents(fetchPage, { ...base, status: "CONFIRMED" }),
        countIncidents(fetchPage, { ...base, status: "DISMISSED" }),
      ]);
      const resolved = Math.max(0, total - pending - confirmed - dismissed);
      return [severity, { total, pending, confirmed, resolved, dismissed }] as const;
    }),
  );
  return Object.fromEntries(rows) as SeverityStatusMatrix;
}
