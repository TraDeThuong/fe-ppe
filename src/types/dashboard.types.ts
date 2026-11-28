import type { CameraItem, IncidentItem, PaginationMeta } from "@/types";

export type DashboardPreset = "today" | "7d" | "month" | "custom";
export type DashboardTrendGroupBy = "DAY" | "WEEK" | "MONTH";

export interface DashboardTrendsWindow {
  startDate: string;
  endDate: string;
  groupBy: DashboardTrendGroupBy;
  /** True khi tự động mở rộng khoảng lùi (vd: preset Hôm nay mở rộng thành 7 ngày cho biểu đồ đường) */
  autoExpanded: boolean;
}

export interface DashboardAiTelemetrySummary {
  avgFps: number | null;
  avgLatencyMs: number | null;
  maxLatencyMs: number | null;
  totalFrames: number;
  sampleDays: number;
  source: "telemetry" | "declared" | "none";
}

export interface DashboardPeriod {
  startDate: string;
  endDate: string;
  fromDate: string;
  toDate: string;
  endExclusive: string;
}
export type DashboardIssue =
  | "limit"
  | "metadata"
  | "changed"
  | "page-error"
  | "invalid-record";
export interface DashboardPage<T> {
  items: T[];
  meta?: PaginationMeta;
}
export interface DashboardCollection<T> {
  items: T[];
  total: number | null;
  complete: boolean;
  issue: DashboardIssue | null;
}
export interface DashboardCount {
  total: number | null;
}
export interface DashboardGroup {
  key: string;
  count: number;
}
export interface DashboardSeverity extends DashboardGroup {
  pending: number;
  confirmed: number;
  resolved: number;
  dismissed: number;
  other: number;
  mttrMinutes: number | null;
  targetSlaMinutes?: number | null;
  resolutionSamples: number;
}
export interface DashboardCameraStat {
  cameraId: string;
  cameraName?: string;
  total: number;
  pending: number;
  resolved: number;
  dismissed: number;
}
export interface DashboardCameraPartitionRow {
  cameraId: string;
  camera?: CameraItem;
  stat?: DashboardCameraStat;
  inCatalog: boolean;
}
export interface DashboardArchivedCameraSummary {
  cameraCount: number;
  total: number;
  pending: number;
  resolved: number;
  dismissed: number;
}
export interface DashboardCameraPartition {
  rows: DashboardCameraPartitionRow[];
  archived: DashboardArchivedCameraSummary | null;
}
export interface DashboardAnalytics {
  total: number;
  /** Tổng số bản ghi lỗi gốc trong DB trước khi gom cụm đa sự cố */
  rawTotal: number;
  /** Số cụm đa vi phạm (>= 2 loại lỗi PPE trên cùng 1 người) */
  multiViolationClusters: number;
  /** Chế độ tổng hợp đang dùng */
  aggregationMode: "clustered" | "raw";
  /** Phân rã tổng số lần xuất hiện của từng lỗi thành phần (kể cả trong cụm đa vi phạm) */
  componentViolationBreakdown: DashboardGroup[];
  dismissed: number;
  reviewed: number;
  dismissedRate: number | null;
  distribution: DashboardGroup[];
  hours: number[];
  shifts: { morning: number; afternoon: number; night: number };
  severities: DashboardSeverity[];
  cameras: DashboardCameraStat[];
  mttrMinutes: number | null;
  resolutionSamples: number;
  /** Các trường bổ sung trực tiếp từ GET /api/v1/statistics/summary phục vụ chuẩn D08 */
  openIncidents?: number;
  resolvedIncidents?: number;
  trueViolations?: number;
  falseAlarms?: number;
  falseAlarmRate?: number | null;
  complianceRate?: number | null;
  hourlyDate?: string | null;
  /**
   * Số sự cố reporting-service dùng để vẽ biểu đồ. Nhỏ hơn `total` nghĩa là biểu đồ chỉ tính
   * trên phần bản ghi BE gom được (tối đa 1.000), còn các thẻ đếm vẫn chính xác.
   */
  chartSampleTotal?: number;
  /** "counts": cột trạng thái theo mức độ là số đếm thật; "unavailable": chưa có / không có quyền. */
  severitySplitSource?: "counts" | "unavailable";
}
export type DashboardIncidentCollection = DashboardCollection<IncidentItem>;
