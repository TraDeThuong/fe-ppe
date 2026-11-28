import type { IncidentStatusCounts, StatisticsSummaryDto } from "@/types";

/**
 * Một định nghĩa duy nhất cho các chỉ số sự cố hiển thị ở Dashboard, Báo cáo và Công trường.
 *
 * Quy ước trạng thái (khớp reporting-service nhánh develop, `computeSummaryFromIncidentList`):
 * - pending   = PENDING_REVIEW
 * - confirmed = CONFIRMED (vi phạm thật đang chờ xử lý)
 * - resolved  = RESOLVED + CLOSED
 * - dismissed = DISMISSED (cảnh báo sai)
 *
 * Nguồn số liệu: số ĐẾM ưu tiên incident-service (`/incidents/status-counts`, `meta.total`) vì
 * chính xác; reporting-service chỉ dùng cho biểu đồ / xu hướng / MTTR (nó tự đếm lại từ tối đa
 * 1.000 bản ghi khi bảng tổng hợp trống).
 */
export interface IncidentOutcomeCounts {
  total: number;
  pending: number;
  confirmed: number;
  resolved: number;
  dismissed: number;
}

const nonNegative = (value: unknown): number => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export function outcomeCountsFromStatusCounts(counts: IncidentStatusCounts): IncidentOutcomeCounts {
  return {
    total: nonNegative(counts.total),
    pending: nonNegative(counts.pendingReview),
    confirmed: nonNegative(counts.confirmed),
    resolved: nonNegative(counts.resolved),
    dismissed: nonNegative(counts.dismissed),
  };
}

/** `trueViolations` của reporting chỉ là CONFIRMED; `resolvedIncidents` đã gồm CLOSED. */
export function outcomeCountsFromSummary(summary: StatisticsSummaryDto): IncidentOutcomeCounts {
  return {
    total: nonNegative(summary.totalIncidents),
    pending: nonNegative(summary.openIncidents),
    confirmed: nonNegative(summary.trueViolations),
    resolved: nonNegative(summary.resolvedIncidents),
    dismissed: nonNegative(summary.falseAlarms),
  };
}

/** Vi phạm thật = đã xác nhận + đã xử lý. */
export function trueViolationCount(counts: IncidentOutcomeCounts): number {
  return counts.confirmed + counts.resolved;
}

/** Số sự cố đã được người duyệt kết luận (thật hoặc sai). */
export function reviewedCount(counts: IncidentOutcomeCounts): number {
  return trueViolationCount(counts) + counts.dismissed;
}

/**
 * Tỷ lệ cảnh báo sai (0–100) = bác bỏ / (vi phạm thật + bác bỏ). Không dùng `falseAlarmRate`
 * của reporting vì mẫu số của nó bỏ qua sự cố đã xử lý.
 */
export function falseAlarmRate(counts: IncidentOutcomeCounts): number | null {
  const reviewed = reviewedCount(counts);
  return reviewed > 0 ? (counts.dismissed / reviewed) * 100 : null;
}

/** Tỷ lệ khắc phục (0–100) = đã xử lý / vi phạm thật. */
export function resolutionRate(counts: IncidentOutcomeCounts): number | null {
  const trueViolations = trueViolationCount(counts);
  return trueViolations > 0 ? (counts.resolved / trueViolations) * 100 : null;
}

export function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

interface ClosableIncident {
  status?: string | null;
  resolvedAt?: string | null;
  statusHistory?: ReadonlyArray<{ oldStatus?: string | null; newStatus?: string | null; changedAt?: string | null }> | null;
}

/**
 * Kết quả thật của một sự cố (CLOSED có thể đến từ RESOLVED hoặc DISMISSED).
 * Ưu tiên lịch sử trạng thái; thiếu lịch sử thì dựa vào `resolvedAt` (BE chỉ ghi khi xử lý xong).
 */
export function incidentOutcomeOf(
  item: ClosableIncident,
): "pending" | "confirmed" | "resolved" | "dismissed" | "unknown" {
  const status = String(item.status ?? "").toUpperCase();
  if (status === "PENDING_REVIEW") return "pending";
  if (status === "CONFIRMED") return "confirmed";
  if (status === "RESOLVED") return "resolved";
  if (status === "DISMISSED") return "dismissed";
  if (status !== "CLOSED") return "unknown";
  const closing = [...(item.statusHistory ?? [])]
    .filter((row) => row.newStatus === "CLOSED" && Number.isFinite(Date.parse(String(row.changedAt))))
    .sort((a, b) => Date.parse(String(b.changedAt)) - Date.parse(String(a.changedAt)))[0];
  if (closing) {
    if (closing.oldStatus === "RESOLVED") return "resolved";
    if (closing.oldStatus === "DISMISSED") return "dismissed";
    return "unknown";
  }
  // Danh sách thường không kèm lịch sử: BE chỉ ghi resolvedAt khi xử lý xong.
  return item.resolvedAt ? "resolved" : "dismissed";
}
