"use client";

import { useId, useMemo, useState } from "react";
import {
  ArrowDownUp,
  BarChart3,
  CheckCircle2,
  Filter,
  Info,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import type { PerClassMetric } from "@/types";

// ============================================================================
// 1. CHUẨN MOCK DATA THEO TẬP NHẬN DIỆN YOLO / RT-DETR PPE THỰC TẾ
// ============================================================================

export const DEFAULT_PER_CLASS_MOCK_METRICS: PerClassMetric[] = [
  {
    className: "PERSON",
    precision: 0.914,
    recall: 0.928,
    f1Score: 0.921,
    sampleCount: 3120,
  },
  {
    className: "HARD_HAT",
    precision: 0.887,
    recall: 0.895,
    f1Score: 0.891,
    sampleCount: 2650,
  },
  {
    className: "SAFETY_VEST",
    precision: 0.872,
    recall: 0.886,
    f1Score: 0.879,
    sampleCount: 2340,
  },
  {
    className: "NO_HELMET",
    precision: 0.846,
    recall: 0.864,
    f1Score: 0.855,
    sampleCount: 680,
  },
  {
    className: "NO_VEST",
    precision: 0.828,
    recall: 0.852,
    f1Score: 0.840,
    sampleCount: 510,
  },
];

export const EXTENDED_PER_CLASS_MOCK_METRICS: PerClassMetric[] = [
  ...DEFAULT_PER_CLASS_MOCK_METRICS,
  {
    className: "BOOTS",
    precision: 0.854,
    recall: 0.838,
    f1Score: 0.846,
    sampleCount: 1820,
  },
  {
    className: "NO_BOOTS",
    precision: 0.785,
    recall: 0.792,
    f1Score: 0.788,
    sampleCount: 290,
  },
  {
    className: "GLOVES",
    precision: 0.812,
    recall: 0.805,
    f1Score: 0.808,
    sampleCount: 1450,
  },
  {
    className: "GOGGLES",
    precision: 0.798,
    recall: 0.782,
    f1Score: 0.790,
    sampleCount: 940,
  },
];

// ============================================================================
// 2. DICTIONARY PHÂN LOẠI & DỊCH THUẬT PHÂN LỚP ĐỐI TƯỢNG BẢO HỘ
// ============================================================================

export interface ClassDefinition {
  code: string;
  labelVi: string;
  labelEn: string;
  category: "person" | "headwear" | "bodywear" | "footwear" | "handwear" | "eyewear" | "harness" | "other";
  isViolation: boolean;
}

const CLASS_REGISTRY: Record<string, ClassDefinition> = {
  PERSON: {
    code: "PERSON",
    labelVi: "Người lao động",
    labelEn: "Worker / Person",
    category: "person",
    isViolation: false,
  },
  HARD_HAT: {
    code: "HARD_HAT",
    labelVi: "Mũ bảo hộ",
    labelEn: "Safety Helmet",
    category: "headwear",
    isViolation: false,
  },
  NO_HELMET: {
    code: "NO_HELMET",
    labelVi: "Không đội mũ",
    labelEn: "No Helmet",
    category: "headwear",
    isViolation: true,
  },
  SAFETY_VEST: {
    code: "SAFETY_VEST",
    labelVi: "Áo phản quang",
    labelEn: "Safety Vest",
    category: "bodywear",
    isViolation: false,
  },
  NO_VEST: {
    code: "NO_VEST",
    labelVi: "Không mặc áo",
    labelEn: "No Vest",
    category: "bodywear",
    isViolation: true,
  },
  BOOTS: {
    code: "BOOTS",
    labelVi: "Giày bảo hộ",
    labelEn: "Safety Boots",
    category: "footwear",
    isViolation: false,
  },
  SAFETY_BOOTS: {
    code: "SAFETY_BOOTS",
    labelVi: "Giày bảo hộ",
    labelEn: "Safety Boots",
    category: "footwear",
    isViolation: false,
  },
  NO_BOOTS: {
    code: "NO_BOOTS",
    labelVi: "Không mang giày",
    labelEn: "No Boots",
    category: "footwear",
    isViolation: true,
  },
  GLOVES: {
    code: "GLOVES",
    labelVi: "Găng tay bảo hộ",
    labelEn: "Safety Gloves",
    category: "handwear",
    isViolation: false,
  },
  NO_GLOVES: {
    code: "NO_GLOVES",
    labelVi: "Không đeo găng",
    labelEn: "No Gloves",
    category: "handwear",
    isViolation: true,
  },
  GOGGLES: {
    code: "GOGGLES",
    labelVi: "Kính bảo hộ",
    labelEn: "Safety Goggles",
    category: "eyewear",
    isViolation: false,
  },
  NO_GOGGLES: {
    code: "NO_GOGGLES",
    labelVi: "Không đeo kính",
    labelEn: "No Goggles",
    category: "eyewear",
    isViolation: true,
  },
  HARNESS: {
    code: "HARNESS",
    labelVi: "Dây đai an toàn",
    labelEn: "Safety Harness",
    category: "harness",
    isViolation: false,
  },
  NO_HARNESS: {
    code: "NO_HARNESS",
    labelVi: "Không đeo dây đai",
    labelEn: "No Harness",
    category: "harness",
    isViolation: true,
  },
};

export function getClassDefinition(name: string): ClassDefinition {
  const normalized = name.toUpperCase().trim();
  if (CLASS_REGISTRY[normalized]) {
    return CLASS_REGISTRY[normalized];
  }
  const isViol =
    normalized.startsWith("NO_") ||
    normalized.startsWith("WITHOUT_") ||
    normalized.includes("VIOLATION");
  return {
    code: normalized,
    labelVi: normalized.replace(/_/g, " "),
    labelEn: normalized.replace(/_/g, " "),
    category: "other",
    isViolation: isViol,
  };
}

// ============================================================================
// 3. TYPES & PROPS
// ============================================================================

export type MetricFilterTab = "all" | "compliant" | "violation";
export type MetricSortOption = "f1_desc" | "f1_asc" | "samples_desc" | "name_asc";

export interface PerClassMetricsCardProps {
  /** Danh sách chỉ số đánh giá theo từng phân lớp đối tượng */
  metrics?: PerClassMetric[];
  /** Trạng thái đang tải dữ liệu telemetry */
  loading?: boolean;
  /** Tùy chọn class CSS thêm ngoài */
  className?: string;
  /** Tự động sử dụng bộ mock data chuẩn khi mảng metrics trống hoặc undefined (mặc định: false) */
  useMockFallback?: boolean;
  /** Phân lớp đang được chọn để highlight hoặc liên kết với Confusion Matrix */
  selectedClass?: string | null;
  /** Callback khi người dùng nhấp chọn hoặc hủy chọn một phân lớp */
  onSelectClass?: (className: string | null) => void;
}

// ============================================================================
// 4. MAIN COMPONENT
// ============================================================================

export function PerClassMetricsCard({
  metrics,
  loading = false,
  className = "",
  useMockFallback = false,
  selectedClass = null,
  onSelectClass,
}: PerClassMetricsCardProps) {
  const { t, locale } = useLocale();
  const isVi = locale === "vi-VN";
  const searchInputId = useId();

  // Local state điều khiển tìm kiếm, lọc và phân loại
  const [filterTab, setFilterTab] = useState<MetricFilterTab>("all");
  const [sortBy, setSortBy] = useState<MetricSortOption>("f1_desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [showMockData, setShowMockData] = useState(false);

  // Quyết định nguồn dữ liệu hiển thị (ưu tiên props, nếu trống có thể dùng mock)
  const isEffectiveMock =
    showMockData ||
    (useMockFallback && (!metrics || metrics.length === 0));

  const rawList: PerClassMetric[] = useMemo(() => {
    if (metrics && metrics.length > 0 && !showMockData) {
      return metrics;
    }
    if (isEffectiveMock) {
      return DEFAULT_PER_CLASS_MOCK_METRICS;
    }
    return [];
  }, [metrics, showMockData, isEffectiveMock]);

  // Tính toán Macro Averages & Tổng mẫu của toàn bộ lớp đối tượng
  const macroStats = useMemo(() => {
    if (rawList.length === 0) {
      return { avgPrecision: 0, avgRecall: 0, avgF1: 0, totalSamples: 0 };
    }
    const totalSamples = rawList.reduce((sum, item) => sum + (item.sampleCount || 0), 0);
    const sumPrecision = rawList.reduce((sum, item) => sum + (item.precision || 0), 0);
    const sumRecall = rawList.reduce((sum, item) => sum + (item.recall || 0), 0);
    const sumF1 = rawList.reduce((sum, item) => sum + (item.f1Score || 0), 0);

    return {
      avgPrecision: sumPrecision / rawList.length,
      avgRecall: sumRecall / rawList.length,
      avgF1: sumF1 / rawList.length,
      totalSamples,
    };
  }, [rawList]);

  // Lọc và sắp xếp danh sách phân lớp
  const processedList = useMemo(() => {
    let list = [...rawList];

    // 1. Lọc theo Tab (Tất cả / Tuân thủ / Vi phạm)
    if (filterTab === "compliant") {
      list = list.filter((item) => !getClassDefinition(item.className).isViolation);
    } else if (filterTab === "violation") {
      list = list.filter((item) => getClassDefinition(item.className).isViolation);
    }

    // 2. Tìm kiếm theo tên
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter((item) => {
        const meta = getClassDefinition(item.className);
        return (
          item.className.toLowerCase().includes(query) ||
          meta.labelVi.toLowerCase().includes(query) ||
          meta.labelEn.toLowerCase().includes(query)
        );
      });
    }

    // 3. Sắp xếp
    list.sort((a, b) => {
      switch (sortBy) {
        case "f1_desc":
          return b.f1Score - a.f1Score;
        case "f1_asc":
          return a.f1Score - b.f1Score;
        case "samples_desc":
          return b.sampleCount - a.sampleCount;
        case "name_asc":
          return a.className.localeCompare(b.className);
        default:
          return 0;
      }
    });

    return list;
  }, [rawList, filterTab, searchQuery, sortBy]);

  const clampPercent = (value: number) =>
    Math.min(100, Math.max(0, Number.isFinite(value) ? value * 100 : 0));

  const getTierInfo = (f1: number) => {
    if (f1 >= 0.88) {
      return {
        label: isVi ? "Tối ưu" : "Optimal",
        colorClass: "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
        fillColor: "bg-emerald-500",
      };
    }
    if (f1 >= 0.8) {
      return {
        label: isVi ? "Tốt" : "Good",
        colorClass: "text-primary border-primary/30 bg-primary/10",
        fillColor: "bg-primary",
      };
    }
    if (f1 >= 0.7) {
      return {
        label: isVi ? "Khá" : "Fair",
        colorClass: "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10",
        fillColor: "bg-amber-500",
      };
    }
    return {
      label: isVi ? "Cần cải thiện" : "Needs Retrain",
      colorClass: "text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/10",
      fillColor: "bg-rose-500",
    };
  };

  const shellShadow =
    "shadow-[0_2px_0_rgba(255,255,255,0.82)_inset,0_-2px_0_rgba(0,0,0,0.025)_inset,8px_10px_18px_var(--shadow-dark),-8px_-8px_18px_var(--shadow-light)]";

  // ============================================================================
  // SKELETON LOADING STATE
  // ============================================================================
  if (loading) {
    return (
      <section
        className={`relative flex flex-col justify-between overflow-hidden rounded-[26px] border border-border/40 bg-surface p-4 sm:p-5 h-[590px] ${shellShadow} ${className}`}
        aria-busy="true"
        aria-label="Loading per class metrics"
      >
        <div className="flex animate-pulse items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-muted/70" />
            <div className="space-y-2">
              <div className="h-4 w-44 rounded-full bg-muted/70" />
              <div className="h-3 w-28 rounded-full bg-muted/50" />
            </div>
          </div>
          <div className="h-8 w-24 rounded-xl bg-muted/40" />
        </div>

        <div className="my-3.5 h-px bg-border/40 shrink-0" />

        <div className="flex-1 min-h-0 space-y-3.5 overflow-hidden">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-[110px] animate-pulse rounded-2xl bg-muted/40 shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)]"
            />
          ))}
        </div>

        <div className="mt-3.5 h-7 rounded-xl bg-muted/30 shrink-0 border-t border-border/30 pt-2" />
      </section>
    );
  }

  // ============================================================================
  // MAIN COMPONENT RENDER
  // ============================================================================
  return (
    <section
      className={`relative isolate flex flex-col justify-between overflow-hidden rounded-[26px] border border-border/40 bg-surface p-4 sm:p-5 h-[590px] ${shellShadow} ${className}`}
    >
      {/* Phản xạ ánh sáng trên mép khối Neumorphic */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-white/90 dark:bg-white/15"
      />

      {/* HEADER SECTION */}
      <header className="shrink-0 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative shrink-0">
              <div className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-border/50 bg-surface text-primary shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,4px_5px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)] dark:shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,4px_5px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]">
                <BarChart3 className="h-[21px] w-[21px] stroke-[2.2]" />
              </div>
              <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-surface bg-primary shadow-[0_1px_3px_var(--shadow-dark)]" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="truncate text-sm font-extrabold tracking-[-0.025em] text-foreground sm:text-[15px]">
                  {t("aiMetrics.perClass.title")}
                </h4>
                {isEffectiveMock && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary"
                    title={isVi ? "Đang sử dụng dữ liệu mẫu kiểm thử" : "Using standard evaluation mock dataset"}
                  >
                    <Sparkles className="h-2.5 w-2.5" />
                    Mock
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                YOLO / RT-DETR PPE TELEMETRY
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* Badge tổng số phân lớp */}
            <div className="flex items-center gap-1.5 rounded-xl border border-border/40 bg-surface px-2.5 py-1.5 text-xs font-bold text-foreground shadow-[2px_3px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)]">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="tabular-nums">{rawList.length}</span>
              <span className="text-[11px] font-medium text-muted-foreground">
                {t("aiMetrics.perClass.class")}
              </span>
            </div>

            {/* Nút toggle mock data khi backend chưa có telemetry */}
            {(!metrics || metrics.length === 0) && (
              <button
                type="button"
                onClick={() => setShowMockData((prev) => !prev)}
                className={`flex h-8 items-center gap-1.5 rounded-xl border px-2.5 text-[11px] font-bold transition-all ${
                  showMockData
                    ? "border-primary/50 bg-primary/15 text-primary shadow-[inset_2px_2px_4px_var(--shadow-dark)]"
                    : "border-border/40 bg-surface text-muted-foreground hover:text-foreground shadow-[2px_3px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)]"
                }`}
                title={showMockData ? "Tắt dữ liệu mẫu" : "Bật dữ liệu mẫu"}
              >
                <Sparkles className="h-3 w-3" />
                <span className="hidden sm:inline">
                  {showMockData ? (isVi ? "Dữ liệu thật" : "Live data") : (isVi ? "Nạp Mock" : "Load Mock")}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* SUMMARY KPI STRIP (Macro Averages) */}
        {rawList.length > 0 && (
          <div className="grid grid-cols-4 gap-2 rounded-xl border border-border/30 bg-background/40 p-2 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
            <div className="text-center">
              <p className="text-[10px] font-semibold text-muted-foreground">Macro F1</p>
              <p className="text-xs font-black text-foreground tabular-nums sm:text-sm">
                {(macroStats.avgF1 * 100).toFixed(1)}%
              </p>
            </div>
            <div className="text-center border-l border-border/30">
              <p className="text-[10px] font-semibold text-muted-foreground">Precision</p>
              <p className="text-xs font-black text-foreground tabular-nums sm:text-sm">
                {(macroStats.avgPrecision * 100).toFixed(1)}%
              </p>
            </div>
            <div className="text-center border-l border-border/30">
              <p className="text-[10px] font-semibold text-muted-foreground">Recall</p>
              <p className="text-xs font-black text-foreground tabular-nums sm:text-sm">
                {(macroStats.avgRecall * 100).toFixed(1)}%
              </p>
            </div>
            <div className="text-center border-l border-border/30">
              <p className="text-[10px] font-semibold text-muted-foreground">{isVi ? "Tổng mẫu" : "Samples"}</p>
              <p className="text-xs font-black text-foreground tabular-nums sm:text-sm">
                {macroStats.totalSamples.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* SEARCH & FILTER CONTROLS */}
        {rawList.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 rounded-xl border border-border/35 bg-surface/80 p-0.5 shadow-[inset_1px_1px_3px_var(--shadow-dark)]">
              {(
                [
                  { key: "all", label: isVi ? "Tất cả" : "All" },
                  { key: "compliant", label: isVi ? "Tuân thủ" : "Compliant" },
                  { key: "violation", label: isVi ? "Vi phạm" : "Violations" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilterTab(tab.key)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                    filterTab === tab.key
                      ? "bg-surface text-primary border border-border/40 shadow-[1px_2px_4px_var(--shadow-dark),-1px_-1px_3px_var(--shadow-light)]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input & Sort dropdown */}
            <div className="flex items-center gap-1.5 flex-1 max-w-[210px] sm:max-w-[240px]">
              <div className="relative flex-1">
                <label htmlFor={searchInputId} className="sr-only">
                  {isVi ? "Tìm kiếm phân lớp đối tượng" : "Search classes"}
                </label>
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
                <input
                  id={searchInputId}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isVi ? "Tìm lớp..." : "Search class..."}
                  className="w-full rounded-xl border border-border/40 bg-surface py-1 pl-7 pr-6 text-xs text-foreground placeholder:text-muted-foreground/60 shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-1px_-1px_3px_var(--shadow-light)] focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label={isVi ? "Xóa tìm kiếm" : "Clear search"}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Sort Selector */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as MetricSortOption)}
                  className="appearance-none rounded-xl border border-border/40 bg-surface py-1 pl-2 pr-6 text-[11px] font-bold text-muted-foreground hover:text-foreground shadow-[2px_2px_4px_var(--shadow-dark),-1px_-1px_3px_var(--shadow-light)] focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
                  title={isVi ? "Sắp xếp danh sách" : "Sort metrics"}
                >
                  <option value="f1_desc">F1: Cao ↓</option>
                  <option value="f1_asc">F1: Thấp ↑</option>
                  <option value="samples_desc">Mẫu ↓</option>
                  <option value="name_asc">A-Z</option>
                </select>
                <ArrowDownUp className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground/70" />
              </div>
            </div>
          </div>
        )}
      </header>

      {/* DIVIDER */}
      <div className="my-2.5 h-px bg-border/60 shadow-[0_1px_0_rgba(255,255,255,0.65)] dark:shadow-none shrink-0" />

      {/* BODY CONTENT: EMPTY STATE OR SCROLLABLE LIST */}
      {rawList.length === 0 ? (
        <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-3.5 rounded-2xl border border-border/30 bg-surface/50 p-6 text-center shadow-[inset_3px_3px_8px_var(--shadow-dark),inset_-3px_-3px_8px_var(--shadow-light)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/40 bg-surface shadow-[3px_4px_8px_var(--shadow-dark),-3px_-3px_8px_var(--shadow-light)]">
            <BarChart3 className="h-6 w-6 text-muted-foreground/60" />
          </div>
          <div className="space-y-1 max-w-[280px]">
            <p className="text-sm font-bold text-foreground">
              {t("aiMetrics.perClass.noData")}
            </p>
            <p className="text-xs text-muted-foreground">
              {isVi
                ? "Chưa có lượt suy luận nào được ghi nhận cho mô hình hiện tại."
                : "No telemetry records found for current model version."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowMockData(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3.5 py-1.5 text-xs font-bold text-primary transition-all hover:bg-primary/20 shadow-[2px_3px_6px_var(--shadow-dark),-2px_-2px_6px_var(--shadow-light)]"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {isVi ? "Tải dữ liệu mẫu kiểm thử" : "Load standard mock dataset"}
          </button>
        </div>
      ) : processedList.length === 0 ? (
        <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-2 rounded-2xl border border-border/30 bg-surface/50 p-6 text-center shadow-[inset_3px_3px_8px_var(--shadow-dark),inset_-3px_-3px_8px_var(--shadow-light)]">
          <Filter className="h-6 w-6 text-muted-foreground/60" />
          <p className="text-sm font-bold text-foreground">
            {isVi ? "Không tìm thấy phân lớp phù hợp" : "No matching classes found"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isVi ? "Thử thay đổi từ khóa hoặc bộ lọc." : "Try adjusting your search query or tab filter."}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setFilterTab("all");
            }}
            className="mt-1 text-xs font-bold text-primary hover:underline"
          >
            {isVi ? "Đặt lại bộ lọc" : "Reset filters"}
          </button>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1.5 -mr-1 [scrollbar-width:thin] [scrollbar-color:var(--shadow-dark)_transparent]">
          {processedList.map((item, index) => {
            const meta = getClassDefinition(item.className);
            const isSelected = selectedClass === item.className;
            const tier = getTierInfo(item.f1Score);
            const percentPrecision = clampPercent(item.precision);
            const percentRecall = clampPercent(item.recall);
            const percentF1 = clampPercent(item.f1Score);
            const sampleRatio =
              macroStats.totalSamples > 0
                ? ((item.sampleCount / macroStats.totalSamples) * 100).toFixed(1)
                : "0.0";

            return (
              <article
                key={item.className}
                onClick={() => onSelectClass?.(isSelected ? null : item.className)}
                className={`group relative rounded-[20px] border bg-surface p-3 transition-[transform,box-shadow,border-color] duration-250 ${
                  onSelectClass ? "cursor-pointer" : ""
                } ${
                  isSelected
                    ? "border-primary/70 ring-2 ring-primary/25 shadow-[0_3px_0_rgba(255,255,255,0.9)_inset,0_8px_20px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)] -translate-y-0.5"
                    : "border-border/40 hover:-translate-y-[2px] hover:shadow-[0_3px_0_rgba(255,255,255,0.8)_inset,0_10px_20px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)]"
                }`}
                style={{
                  boxShadow: isSelected
                    ? undefined
                    : "0 1px 0 rgba(255,255,255,0.8) inset, 0 -1px 0 rgba(0,0,0,0.025) inset, 4px 5px 11px var(--shadow-dark), -4px -4px 11px var(--shadow-light)",
                }}
              >
                {/* Viền sáng nổi phản quang trên đỉnh thẻ */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-4 top-0 h-px bg-white/90 dark:bg-white/15"
                />

                {/* Dòng tiêu đề phân lớp đối tượng */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    {/* Icon đại diện (Tuân thủ vs Vi phạm) */}
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/40 bg-surface shadow-[2px_3px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] ${
                        meta.isViolation
                          ? "text-rose-500 dark:text-rose-400 bg-rose-500/5"
                          : "text-emerald-500 dark:text-emerald-400 bg-emerald-500/5"
                      }`}
                    >
                      {meta.isViolation ? (
                        <ShieldAlert className="h-[18px] w-[18px] stroke-[2.2]" />
                      ) : (
                        <ShieldCheck className="h-[18px] w-[18px] stroke-[2.2]" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h5 className="truncate text-xs font-black text-foreground sm:text-[13px]">
                          {isVi ? meta.labelVi : meta.labelEn}
                        </h5>
                        {meta.isViolation ? (
                          <span className="rounded-md border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                            {isVi ? "Vi phạm" : "Violation"}
                          </span>
                        ) : (
                          <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            {isVi ? "Tuân thủ" : "Compliant"}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
                        {item.className.replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>

                  {/* Cột thống kê mẫu & Tier đánh giá */}
                  <div className="shrink-0 text-right space-y-0.5">
                    <span
                      className={`inline-block rounded-lg border px-2 py-0.5 text-[10px] font-bold ${tier.colorClass}`}
                    >
                      {tier.label}
                    </span>
                    <p className="text-[11px] font-extrabold tabular-nums text-foreground">
                      {item.sampleCount.toLocaleString()}{" "}
                      <span className="text-[10px] font-medium text-muted-foreground">
                        ({sampleRatio}%)
                      </span>
                    </p>
                  </div>
                </div>

                {/* BẢNG 3 CHỈ SỐ: PRECISION / RECALL / F1-SCORE */}
                <div className="mt-3 rounded-[14px] border border-border/25 bg-background/40 p-2.5 sm:p-3 shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)]">
                  <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                    {/* 1. Precision */}
                    <div className="min-w-0">
                      <div className="mb-1 flex items-baseline justify-between gap-1">
                        <span className="truncate text-[10px] font-semibold text-muted-foreground">
                          {t("aiMetrics.perClass.precision")}
                        </span>
                        <span className="text-[13px] font-extrabold leading-none tracking-tight text-foreground tabular-nums sm:text-[14px]">
                          {percentPrecision.toFixed(1)}
                          <span className="ml-0.5 text-[9px] font-bold text-muted-foreground">%</span>
                        </span>
                      </div>
                      <div className="relative h-[6px] overflow-hidden rounded-full border border-border/20 bg-background/80 shadow-[inset_2px_2px_4px_var(--shadow-dark)]">
                        <div
                          className="relative h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
                          style={{ width: `${percentPrecision}%` }}
                        >
                          {percentPrecision > 10 && (
                            <span className="absolute inset-x-1 top-[1px] h-px rounded-full bg-white/60" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 2. Recall */}
                    <div className="min-w-0 border-l border-border/25 pl-2.5 sm:pl-3">
                      <div className="mb-1 flex items-baseline justify-between gap-1">
                        <span className="truncate text-[10px] font-semibold text-muted-foreground">
                          {t("aiMetrics.perClass.recall")}
                        </span>
                        <span className="text-[13px] font-extrabold leading-none tracking-tight text-foreground tabular-nums sm:text-[14px]">
                          {percentRecall.toFixed(1)}
                          <span className="ml-0.5 text-[9px] font-bold text-muted-foreground">%</span>
                        </span>
                      </div>
                      <div className="relative h-[6px] overflow-hidden rounded-full border border-border/20 bg-background/80 shadow-[inset_2px_2px_4px_var(--shadow-dark)]">
                        <div
                          className="relative h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
                          style={{ width: `${percentRecall}%` }}
                        >
                          {percentRecall > 10 && (
                            <span className="absolute inset-x-1 top-[1px] h-px rounded-full bg-white/60" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 3. F1-Score */}
                    <div className="min-w-0 border-l border-border/25 pl-2.5 sm:pl-3">
                      <div className="mb-1 flex items-baseline justify-between gap-1">
                        <span className="truncate text-[10px] font-bold text-foreground">
                          {t("aiMetrics.perClass.f1")}
                        </span>
                        <span className="text-[13px] font-black leading-none tracking-tight text-foreground tabular-nums sm:text-[14px]">
                          {percentF1.toFixed(1)}
                          <span className="ml-0.5 text-[9px] font-bold text-muted-foreground">%</span>
                        </span>
                      </div>
                      <div className="relative h-[6px] overflow-hidden rounded-full border border-border/20 bg-background/80 shadow-[inset_2px_2px_4px_var(--shadow-dark)]">
                        <div
                          className={`relative h-full rounded-full ${tier.fillColor} transition-[width] duration-700 ease-out`}
                          style={{ width: `${percentF1}%` }}
                        >
                          {percentF1 > 10 && (
                            <span className="absolute inset-x-1 top-[1px] h-px rounded-full bg-white/60" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Thứ hạng nhỏ ở góc thẻ */}
                <span className="pointer-events-none absolute right-3 top-2.5 text-[9px] font-extrabold tabular-nums text-muted-foreground/35">
                  {(index + 1).toString().padStart(2, "0")}
                </span>
              </article>
            );
          })}
        </div>
      )}

      {/* FOOTER SECTION */}
      {rawList.length > 0 && (
        <footer className="mt-3 flex items-center justify-between gap-3 px-1 pt-2 border-t border-border/30 shrink-0">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_0_3px_var(--shadow-light)]" />
            <span className="text-[10px] font-medium text-muted-foreground">
              {isVi
                ? `Hiển thị ${processedList.length}/${rawList.length} phân lớp đối tượng`
                : `Showing ${processedList.length}/${rawList.length} evaluation classes`}
            </span>
          </div>

          <span className="rounded-lg border border-border/30 bg-surface px-2 py-0.5 text-[9px] font-black tracking-widest text-muted-foreground uppercase shadow-[2px_2px_4px_var(--shadow-dark),-1px_-1px_3px_var(--shadow-light)]">
            AI REPORTING
          </span>
        </footer>
      )}
    </section>
  );
}
