/**
 * Số liệu & bộ lọc của tab Báo cáo (kho hồ sơ đã xuất) — chỉ dùng API sẵn có GET /reports/history.
 *
 * BE chỉ trả 1 trang hồ sơ kèm meta.total và chỉ lọc được 1 reportType mỗi lần, nên:
 * - Số đếm lấy từ meta.total của các request limit=1 (mỗi request chỉ trả 1 dòng).
 * - Lọc theo nhóm loại (Định kỳ / Chuyên đề & AI) gọi riêng từng loại rồi gộp ở FE.
 */
import type {
  PaginationMeta,
  ReportGenerationDto,
  ReportHistoryQueryDto,
  ReportTemplateDto,
} from "@/types";

/** Nhóm loại báo cáo cho bộ lọc nhanh (thẻ KPI "Định kỳ" / "Chuyên đề & AI"). */
export const REPORT_TYPE_GROUPS = {
  PERIODIC: ["DAILY", "WEEKLY", "MONTHLY"],
  SPECIALIZED: ["VIOLATION_SUMMARY", "AI_PERFORMANCE"],
} as const satisfies Record<string, readonly string[]>;

export type ReportTypeGroup = keyof typeof REPORT_TYPE_GROUPS;

export const REPORT_TYPES: readonly string[] = [
  ...REPORT_TYPE_GROUPS.PERIODIC,
  ...REPORT_TYPE_GROUPS.SPECIALIZED,
];

export const REPORT_STATUSES = ["PENDING", "PROCESSING", "COMPLETED", "FAILED"] as const;

/** Giới hạn `limit` của GET /reports/history (reportHistoryQuerySchema ở BE). */
export const REPORT_HISTORY_MAX_LIMIT = 100;

export function isReportTypeGroup(value: string): value is ReportTypeGroup {
  return Object.hasOwn(REPORT_TYPE_GROUPS, value);
}

/**
 * Giá trị bộ lọc loại của kho ("" | 1 loại | 1 nhóm) →
 * `reportType` gửi thẳng lên BE, hoặc `reportTypes` cần gọi riêng từng loại rồi gộp.
 */
export function resolveReportTypeFilter(value: string): {
  reportType?: string;
  reportTypes?: readonly string[];
} {
  if (!value) return {};
  return isReportTypeGroup(value)
    ? { reportTypes: REPORT_TYPE_GROUPS[value] }
    : { reportType: value };
}

export interface ReportHistoryPage {
  items: ReportGenerationDto[];
  meta?: PaginationMeta;
}

export type ReportHistoryFetcher = (params: ReportHistoryQueryDto) => Promise<ReportHistoryPage>;

/** Thiếu meta.total thì không đoán số (tránh hiện số sai) — để query báo lỗi, UI hiện "–". */
function requireTotal(page: ReportHistoryPage): number {
  const total = page.meta?.total;
  if (typeof total !== "number" || !Number.isFinite(total) || total < 0) {
    throw new Error("Report history response is missing pagination meta.total");
  }
  return total;
}

// ── Số đếm của kho ──────────────────────────────────────────────────────────

export interface ReportArchiveCounts {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
}

/**
 * Đếm hồ sơ của cơ sở: 1 tổng + 5 loại + 4 trạng thái = 10 request limit=1 chạy song song.
 * Số đếm không phụ thuộc trang đang xem hay bộ lọc loại/trạng thái của danh sách.
 */
export async function fetchReportArchiveCounts(
  fetchPage: ReportHistoryFetcher,
  scope: Pick<ReportHistoryQueryDto, "siteId"> = {},
): Promise<ReportArchiveCounts> {
  const totalOf = async (filter: Pick<ReportHistoryQueryDto, "reportType" | "status">) =>
    requireTotal(await fetchPage({ ...scope, ...filter, page: 1, limit: 1 }));

  const [total, typeTotals, statusTotals] = await Promise.all([
    totalOf({}),
    Promise.all(REPORT_TYPES.map((reportType) => totalOf({ reportType }))),
    Promise.all(REPORT_STATUSES.map((status) => totalOf({ status }))),
  ]);

  return {
    total,
    byType: Object.fromEntries(REPORT_TYPES.map((type, index) => [type, typeTotals[index]])),
    byStatus: Object.fromEntries(
      REPORT_STATUSES.map((status, index) => [status, statusTotals[index]]),
    ),
  };
}

export interface ReportArchiveStats {
  totalReports: number;
  completedCount: number;
  processingCount: number;
  failedCount: number;
  periodicCount: number;
  specializedCount: number;
  byType: Record<string, number>;
}

/** undefined khi chưa có số đếm → UI hiện "..."/"–" hoặc ẩn badge, không hiện 0 giả. */
export function toReportArchiveStats(
  counts?: ReportArchiveCounts | null,
): ReportArchiveStats | undefined {
  if (!counts) return undefined;
  const byType = Object.fromEntries(REPORT_TYPES.map((type) => [type, counts.byType[type] ?? 0]));
  const sumTypes = (types: readonly string[]) =>
    types.reduce((sum, type) => sum + (byType[type] ?? 0), 0);

  return {
    totalReports: counts.total,
    completedCount: counts.byStatus.COMPLETED ?? 0,
    processingCount: (counts.byStatus.PENDING ?? 0) + (counts.byStatus.PROCESSING ?? 0),
    failedCount: counts.byStatus.FAILED ?? 0,
    periodicCount: sumTypes(REPORT_TYPE_GROUPS.PERIODIC),
    specializedCount: sumTypes(REPORT_TYPE_GROUPS.SPECIALIZED),
    byType,
  };
}

export interface ReportTemplateCounts {
  active: number;
  total: number;
}

/** undefined khi danh sách mẫu chưa tải (header ẩn badge thay vì hiện 0). */
export function countReportTemplates(
  templates?: readonly ReportTemplateDto[],
): ReportTemplateCounts | undefined {
  if (!templates) return undefined;
  return {
    active: templates.filter((tpl) => !tpl.status || tpl.status.toUpperCase() === "ACTIVE").length,
    total: templates.length,
  };
}

// ── Lọc theo nhóm loại ──────────────────────────────────────────────────────

function compareNewestFirst(a: ReportGenerationDto, b: ReportGenerationDto): number {
  const byGenerated = (Date.parse(b.generatedAt) || 0) - (Date.parse(a.generatedAt) || 0);
  if (byGenerated !== 0) return byGenerated;
  const byCreated = (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0);
  if (byCreated !== 0) return byCreated;
  return b.id.localeCompare(a.id);
}

/** Gộp hồ sơ của nhiều loại (mới → cũ như BE) thành đúng một trang của cả nhóm. */
export function mergeReportHistoryPages(
  perType: ReadonlyArray<{ items: readonly ReportGenerationDto[]; total: number }>,
  page: number,
  pageSize: number,
): Required<ReportHistoryPage> {
  const total = perType.reduce((sum, entry) => sum + entry.total, 0);
  const merged = perType.flatMap((entry) => entry.items).sort(compareNewestFirst);
  const start = (page - 1) * pageSize;
  return {
    items: merged.slice(start, start + pageSize),
    meta: {
      page,
      limit: pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

/**
 * Lịch sử của một nhóm loại (vd Ngày + Tuần + Tháng) bằng API 1-loại-mỗi-lần:
 * trang P của cả nhóm nằm trong P×pageSize hồ sơ mới nhất của mỗi loại, nên lấy đủ
 * từng ấy hồ sơ cho từng loại (chia lô nếu vượt giới hạn 100 của BE), gộp, sắp xếp rồi cắt trang.
 */
export async function fetchReportHistoryForTypes(
  fetchPage: ReportHistoryFetcher,
  reportTypes: readonly string[],
  params: ReportHistoryQueryDto = {},
): Promise<Required<ReportHistoryPage>> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, params.limit ?? 10);
  const needed = page * pageSize;
  const chunkSize = Math.min(needed, REPORT_HISTORY_MAX_LIMIT);
  const chunkCount = Math.ceil(needed / chunkSize);

  const perType = await Promise.all(
    reportTypes.map(async (reportType) => {
      const first = await fetchPage({ ...params, reportType, page: 1, limit: chunkSize });
      const total = requireTotal(first);
      // Chỉ lấy thêm lô khi loại này thật sự còn hồ sơ (trang sâu > 100 dòng).
      const extraChunks = Math.min(chunkCount, Math.ceil(total / chunkSize)) - 1;
      const rest =
        extraChunks > 0
          ? await Promise.all(
              Array.from({ length: extraChunks }, (_, index) =>
                fetchPage({ ...params, reportType, page: index + 2, limit: chunkSize }),
              ),
            )
          : [];
      return { items: [first, ...rest].flatMap((chunk) => chunk.items), total };
    }),
  );

  return mergeReportHistoryPages(perType, page, pageSize);
}
