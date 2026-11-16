"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Film,
  Images,
  Layers,
  LayoutGrid,
  Radio,
  RotateCcw,
  Search,
  ShieldAlert,
  User,
  Users,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/form";
import {
  Select,
  type SelectOption,
} from "@/components/ui/form/selection-controls/select";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "@/components/ui/segmented-control";
import { useLocale } from "@/providers/locale-provider";
import {
  filterEvidenceItems,
  groupEvidenceByTrack,
  isBeforeAfterPair,
  normalizeViolationType,
  queryEvidenceItems,
  sortEvidenceItems,
  type EvidencePairFilter,
  type EvidenceSortOrder,
  type EvidenceSourceFilter,
} from "./ai-test-utils";
import { EvidencePairCard } from "./evidence-pair-card";
import type { EvidenceItem, ViolationFilterType } from "@/types/ai-test.types";

type GalleryViewMode = "grid" | "grouped";

const PAGE_SIZE = 12;

const NM = {
  chassis:
    "bg-background " +
    "shadow-[14px_14px_28px_rgba(0,0,0,0.12),-14px_-14px_28px_rgba(255,255,255,0.75),inset_1px_1px_2px_rgba(255,255,255,0.6)] " +
    "dark:shadow-[14px_14px_28px_rgba(0,0,0,0.55),-10px_-10px_24px_rgba(255,255,255,0.04),inset_1px_1px_1px_rgba(255,255,255,0.07)] " +
    "border border-white/40 dark:border-white/[0.06]",
  extruded:
    "bg-background " +
    "shadow-[6px_6px_12px_rgba(0,0,0,0.09),-6px_-6px_12px_rgba(255,255,255,0.75),inset_1px_1px_1px_rgba(255,255,255,0.5)] " +
    "dark:shadow-[6px_6px_12px_rgba(0,0,0,0.45),-5px_-5px_10px_rgba(255,255,255,0.03)] " +
    "border border-white/40 dark:border-white/[0.05]",
  recessed:
    "bg-background/80 " +
    "shadow-[inset_5px_5px_10px_rgba(0,0,0,0.11),inset_-5px_-5px_10px_rgba(255,255,255,0.7)] " +
    "dark:shadow-[inset_5px_5px_10px_rgba(0,0,0,0.55),inset_-4px_-4px_8px_rgba(255,255,255,0.03)] " +
    "border border-black/[0.04] dark:border-white/[0.03]",
  tactileBtn:
    "bg-background " +
    "shadow-[5px_5px_10px_rgba(0,0,0,0.1),-5px_-5px_10px_rgba(255,255,255,0.8)] " +
    "dark:shadow-[5px_5px_10px_rgba(0,0,0,0.48),-4px_-4px_8px_rgba(255,255,255,0.03)] " +
    "active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.14)] " +
    "border border-white/50 dark:border-white/[0.06] transition-all cursor-pointer",
};

export interface EvidenceGalleryPanelProps {
  items: EvidenceItem[];
  onInspectEvidence: (items: EvidenceItem[], index: number) => void;
  onSeekToJobTime: (timeSec: number) => void;
  hideSourceFilter?: boolean;
  emptyDescription?: string;
}

export function EvidenceGalleryPanel({
  items,
  onInspectEvidence,
  onSeekToJobTime,
  hideSourceFilter = false,
  emptyDescription,
}: EvidenceGalleryPanelProps) {
  const { t } = useLocale();
  const [sourceFilter, setSourceFilter] = useState<EvidenceSourceFilter>("all");
  const [violationFilter, setViolationFilter] =
    useState<ViolationFilterType>("ALL");
  const [pairFilter, setPairFilter] = useState<EvidencePairFilter>("all");
  const [trackFilter, setTrackFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<EvidenceSortOrder>("newest");
  const [viewMode, setViewMode] = useState<GalleryViewMode>("grid");
  const [page, setPage] = useState<number>(1);
  const [showAll, setShowAll] = useState<boolean>(false);

  const sourceScoped = useMemo(() => {
    if (sourceFilter === "all") return items;
    return items.filter((item) => item.source === sourceFilter);
  }, [items, sourceFilter]);

  const counts = useMemo(() => {
    let pairCount = 0;
    let jobCount = 0;
    let liveCount = 0;
    const trackSet = new Set<string>();

    for (const item of items) {
      if (item.source === "job") jobCount += 1;
      else liveCount += 1;
    }

    for (const item of sourceScoped) {
      if (isBeforeAfterPair(item)) pairCount += 1;
      trackSet.add(item.trackId);
    }

    return {
      totalAll: items.length,
      job: jobCount,
      live: liveCount,
      scopedTotal: sourceScoped.length,
      noHelmet: filterEvidenceItems(sourceScoped, "NO_HELMET").length,
      noVest: filterEvidenceItems(sourceScoped, "NO_VEST").length,
      restricted: filterEvidenceItems(sourceScoped, "RESTRICTED_AREA").length,
      pair: pairCount,
      single: sourceScoped.length - pairCount,
      uniqueTracks: trackSet.size,
    };
  }, [items, sourceScoped]);

  const trackOptions = useMemo<SelectOption[]>(() => {
    const byTrack = new Map<string, number>();
    for (const item of sourceScoped) {
      byTrack.set(item.trackId, (byTrack.get(item.trackId) ?? 0) + 1);
    }
    const sortedTracks = Array.from(byTrack.entries()).sort(([a], [b]) => {
      const na = Number(a);
      const nb = Number(b);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
    return [
      {
        value: "all",
        label: t("aiTest.gallery.filters.allTracks", { count: sortedTracks.length }),
      },
      ...sortedTracks.map(([tid, count]) => ({
        value: tid,
        label: t("aiTest.gallery.filters.trackItem", { id: tid, count }),
      })),
    ];
  }, [sourceScoped, t]);

  const sortOptions = useMemo<SelectOption[]>(
    () => [
      { value: "newest", label: t("aiTest.gallery.sort.newest") },
      { value: "time_asc", label: t("aiTest.gallery.sort.timeAsc") },
      { value: "track_asc", label: t("aiTest.gallery.sort.trackAsc") },
      { value: "type_asc", label: t("aiTest.gallery.sort.typeAsc") },
    ],
    [t],
  );

  const effectiveTrackFilter = useMemo(() => {
    if (trackFilter === "all") return "all";
    return sourceScoped.some((i) => i.trackId === trackFilter)
      ? trackFilter
      : "all";
  }, [sourceScoped, trackFilter]);

  const filteredAndSorted = useMemo(() => {
    const filtered = queryEvidenceItems(items, {
      source: sourceFilter,
      violation: violationFilter,
      pairMode: pairFilter,
      trackId: effectiveTrackFilter,
      search: searchQuery,
    });
    return sortEvidenceItems(filtered, sortOrder);
  }, [
    items,
    sourceFilter,
    violationFilter,
    pairFilter,
    effectiveTrackFilter,
    searchQuery,
    sortOrder,
  ]);

  // Map id -> true index in `filteredAndSorted` so Lightbox Prev/Next works in both Grid and Grouped view
  const indexById = useMemo(() => {
    const map = new Map<string, number>();
    filteredAndSorted.forEach((item, idx) => map.set(item.id, idx));
    return map;
  }, [filteredAndSorted]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAndSorted.length / PAGE_SIZE),
  );
  const safePage = Math.min(page, totalPages);

  const visibleItems = useMemo(() => {
    if (showAll || filteredAndSorted.length <= PAGE_SIZE) {
      return filteredAndSorted;
    }
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredAndSorted.slice(start, start + PAGE_SIZE);
  }, [filteredAndSorted, safePage, showAll]);

  const groupedByTrack = useMemo(
    () => groupEvidenceByTrack(filteredAndSorted),
    [filteredAndSorted],
  );

  const filteredStats = useMemo(() => {
    const pairs = filteredAndSorted.filter(isBeforeAfterPair).length;
    const tracks = new Set(
      filteredAndSorted.map((i) => `${i.source}::${i.sourceId}::${i.trackId}`),
    ).size;
    return {
      total: filteredAndSorted.length,
      pairs,
      singles: filteredAndSorted.length - pairs,
      tracks,
    };
  }, [filteredAndSorted]);

  const hasActiveFilters =
    sourceFilter !== "all" ||
    violationFilter !== "ALL" ||
    pairFilter !== "all" ||
    effectiveTrackFilter !== "all" ||
    searchQuery.trim() !== "" ||
    sortOrder !== "newest";

  const resetAllFilters = () => {
    setSourceFilter("all");
    setViolationFilter("ALL");
    setPairFilter("all");
    setTrackFilter("all");
    setSearchQuery("");
    setSortOrder("newest");
    setPage(1);
  };

  const sourceOptions: SegmentedControlOption<EvidenceSourceFilter>[] = [
    { value: "all", label: t("aiTest.gallery.filters.sourceAll"), badge: String(counts.totalAll) },
    {
      value: "live",
      label: t("aiTest.gallery.filters.sourceLive"),
      icon: <Radio className="size-3.5 text-accent" />,
      badge: String(counts.live),
    },
    {
      value: "job",
      label: t("aiTest.gallery.filters.sourceJob"),
      icon: <Film className="size-3.5 text-primary" />,
      badge: String(counts.job),
    },
  ];

  const violationOptions: SegmentedControlOption<ViolationFilterType>[] = [
    { value: "ALL", label: t("aiTest.gallery.filters.violationAll"), badge: String(counts.scopedTotal) },
    { value: "NO_HELMET", label: t("aiTest.gallery.filters.violationNoHelmet"), badge: String(counts.noHelmet) },
    { value: "NO_VEST", label: t("aiTest.gallery.filters.violationNoVest"), badge: String(counts.noVest) },
    {
      value: "RESTRICTED_AREA",
      label: t("aiTest.gallery.filters.violationRestricted"),
      badge: String(counts.restricted),
    },
  ];

  const pairOptions: SegmentedControlOption<EvidencePairFilter>[] = [
    { value: "all", label: t("aiTest.gallery.filters.formatAll"), badge: String(counts.scopedTotal) },
    { value: "pair", label: t("aiTest.gallery.filters.formatPair"), badge: String(counts.pair) },
    { value: "single", label: t("aiTest.gallery.filters.formatSingle"), badge: String(counts.single) },
  ];

  const viewOptions: SegmentedControlOption<GalleryViewMode>[] = [
    {
      value: "grid",
      label: t("aiTest.gallery.viewGrid"),
      icon: <LayoutGrid className="size-3.5" />,
    },
    {
      value: "grouped",
      label: t("aiTest.gallery.viewGrouped"),
      icon: <Layers className="size-3.5" />,
      badge: String(groupedByTrack.length),
    },
  ];

  return (
    <section
      aria-label={t("aiTest.gallery.ariaLabel")}
      className={`rounded-[30px] p-5 sm:p-7 space-y-6 ${NM.chassis}`}
    >
      {/* =================================================================
          TẦNG 1: TIÊU ĐỀ & DẢI THỐNG KÊ NHANH (4 SUMMARY PODS)
         ================================================================= */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3.5">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${NM.extruded}`}
          >
            <Images className="size-5 text-primary" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-extrabold tracking-tight text-foreground">
                {t("aiTest.gallery.title")}
              </h2>
              <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                {t("aiTest.gallery.badge")}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {hideSourceFilter
                ? t("aiTest.gallery.descCamera")
                : t("aiTest.gallery.descDefault")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-accent ${NM.tactileBtn}`}
            >
              <RotateCcw className="size-3.5" />
              {t("aiTest.gallery.resetFilters")}
            </button>
          )}
          <SegmentedControl<GalleryViewMode>
            aria-label={t("aiTest.gallery.viewModeAriaLabel")}
            options={viewOptions}
            value={viewMode}
            onValueChange={setViewMode}
            size="sm"
          />
        </div>
      </div>

      {/* 4 Ô Thống Kê Nhanh */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <div className={`flex items-center gap-3 rounded-2xl p-3.5 ${NM.extruded}`}>
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${NM.recessed}`}
          >
            <Images className="size-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("aiTest.gallery.stats.matchedResults")}
            </p>
            <p className="font-mono text-lg font-extrabold text-foreground">
              {filteredStats.total}
              <span className="ml-1 text-xs font-medium text-muted-foreground">
                / {counts.totalAll}
              </span>
            </p>
          </div>
        </div>

        <div className={`flex items-center gap-3 rounded-2xl p-3.5 ${NM.extruded}`}>
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${NM.recessed}`}
          >
            <Layers className="size-4 text-accent" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("aiTest.gallery.stats.beforeAfterPairs")}
            </p>
            <p className="font-mono text-lg font-extrabold text-foreground">
              {filteredStats.pairs}
              <span className="ml-1.5 text-[11px] font-medium text-muted-foreground">
                {t("aiTest.gallery.stats.singlesSuffix", { count: filteredStats.singles })}
              </span>
            </p>
          </div>
        </div>

        <div className={`flex items-center gap-3 rounded-2xl p-3.5 ${NM.extruded}`}>
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${NM.recessed}`}
          >
            <Users className="size-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("aiTest.gallery.stats.personGroups")}
            </p>
            <p className="font-mono text-lg font-extrabold text-foreground">
              {filteredStats.tracks}
              <span className="ml-1.5 text-[11px] font-medium text-muted-foreground">
                {t("aiTest.gallery.stats.tracksUnit")}
              </span>
            </p>
          </div>
        </div>

        <div className={`flex items-center gap-3 rounded-2xl p-3.5 ${NM.extruded}`}>
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${NM.recessed}`}
          >
            <ShieldAlert className="size-4 text-accent" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {hideSourceFilter
                ? t("aiTest.gallery.stats.violationBreakdown")
                : t("aiTest.gallery.stats.sourceBreakdown")}
            </p>
            {hideSourceFilter ? (
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 font-mono text-xs font-bold">
                <span className="rounded-md bg-accent/15 px-1.5 py-0.5 text-accent">
                  {t("aiTest.gallery.stats.helmetTag", { count: counts.noHelmet })}
                </span>
                <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-primary">
                  {t("aiTest.gallery.stats.vestTag", { count: counts.noVest })}
                </span>
              </div>
            ) : (
              <div className="mt-0.5 flex items-center gap-2 font-mono text-xs font-bold">
                <span className="rounded-md bg-accent/15 px-1.5 py-0.5 text-accent">
                  {t("aiTest.gallery.stats.liveTag", { count: counts.live })}
                </span>
                <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-primary">
                  {t("aiTest.gallery.stats.jobTag", { count: counts.job })}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =================================================================
          TẦNG 2: KHAY LỌC & SẮP XẾP TÁCH BẠCH (2 HÀNG RÕ RÀNG)
         ================================================================= */}
      <div className={`rounded-2xl p-4 space-y-4 ${NM.recessed}`}>
        {/* Hàng 1: Bộ lọc Nguồn + Loại Vi Phạm + Kiểu Ảnh */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          {!hideSourceFilter && (
            <div className="space-y-1.5 xl:col-span-4">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("aiTest.gallery.filters.source")}
              </span>
              <SegmentedControl<EvidenceSourceFilter>
                aria-label={t("aiTest.gallery.filters.sourceAriaLabel")}
                options={sourceOptions}
                value={sourceFilter}
                onValueChange={(next) => {
                  setSourceFilter(next);
                  setPage(1);
                }}
                size="sm"
                fullWidth
              />
            </div>
          )}

          <div
            className={`space-y-1.5 ${
              hideSourceFilter ? "xl:col-span-7" : "xl:col-span-5"
            }`}
          >
            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("aiTest.gallery.filters.violation", { step: hideSourceFilter ? 1 : 2 })}
            </span>
            <SegmentedControl<ViolationFilterType>
              aria-label={t("aiTest.gallery.filters.violationAriaLabel")}
              options={violationOptions}
              value={violationFilter}
              onValueChange={(next) => {
                setViolationFilter(next);
                setPage(1);
              }}
              size="sm"
              fullWidth
            />
          </div>

          <div
            className={`space-y-1.5 ${
              hideSourceFilter ? "xl:col-span-5" : "xl:col-span-3"
            }`}
          >
            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("aiTest.gallery.filters.format", { step: hideSourceFilter ? 2 : 3 })}
            </span>
            <SegmentedControl<EvidencePairFilter>
              aria-label={t("aiTest.gallery.filters.formatAriaLabel")}
              options={pairOptions}
              value={pairFilter}
              onValueChange={(next) => {
                setPairFilter(next);
                setPage(1);
              }}
              size="sm"
              fullWidth
            />
          </div>
        </div>

        {/* Đường kẻ ngăn cách nhẹ */}
        <div className="h-[1px] bg-black/[0.06] dark:bg-white/[0.06]" />

        {/* Hàng 2: Tìm nhanh + Lọc Track + Sắp xếp */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="space-y-1.5 md:col-span-5">
            <label
              htmlFor="evidence-search-input"
              className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
            >
              {t("aiTest.gallery.filters.searchLabel")}
            </label>
            <Input
              id="evidence-search-input"
              size="sm"
              iconStyle="flat"
              prefix={<Search className="size-3.5 text-muted-foreground" />}
              suffix={
                searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setPage(1);
                    }}
                    aria-label={t("aiTest.gallery.filters.clearSearch")}
                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="size-3.5" />
                  </button>
                ) : undefined
              }
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder={t("aiTest.gallery.filters.searchPlaceholder")}
            />
          </div>

          <div className="space-y-1.5 md:col-span-3">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("aiTest.gallery.filters.trackLabel")}
            </span>
            <Select
              size="sm"
              options={trackOptions}
              value={effectiveTrackFilter}
              onValueChange={(next) => {
                setTrackFilter(next);
                setPage(1);
              }}
              placeholder={t("aiTest.gallery.filters.trackPlaceholder")}
            />
          </div>

          <div className="space-y-1.5 md:col-span-4">
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <ArrowUpDown className="size-3 text-primary" />
              {t("aiTest.gallery.filters.sortLabel")}
            </span>
            <Select
              size="sm"
              options={sortOptions}
              value={sortOrder}
              onValueChange={(next) => {
                setSortOrder(next as EvidenceSortOrder);
                setPage(1);
              }}
              placeholder={t("aiTest.gallery.filters.sortPlaceholder")}
            />
          </div>
        </div>
      </div>

      {/* =================================================================
          TẦNG 3: DANH SÁCH BẰNG CHỨNG (LƯỚI THẺ HOẶC GOM THEO TRACK)
         ================================================================= */}
      {filteredAndSorted.length === 0 ? (
        <div className={`rounded-2xl px-6 py-14 text-center ${NM.recessed}`}>
          <Images className="mx-auto size-11 text-muted-foreground/45" />
          <p className="mt-3 text-sm font-bold text-foreground">
            {counts.totalAll === 0
              ? t("aiTest.gallery.empty.noItemsTitle")
              : t("aiTest.gallery.empty.noMatchTitle")}
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            {counts.totalAll === 0
              ? emptyDescription ?? t("aiTest.gallery.empty.defaultDesc")
              : t("aiTest.gallery.empty.filteredDesc")}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className={`mt-4 inline-flex h-9 items-center gap-1.5 rounded-xl px-4 text-xs font-bold text-primary ${NM.tactileBtn}`}
            >
              <RotateCcw className="size-3.5" />
              {t("aiTest.gallery.resetAllFilters")}
            </button>
          )}
        </div>
      ) : viewMode === "grouped" ? (
        <div className="space-y-5">
          {groupedByTrack.map((group) => (
            <div
              key={group.key}
              className={`rounded-2xl p-4 space-y-3.5 ${NM.extruded}`}
            >
              {/* Header của nhóm Track */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] pb-3 dark:border-white/[0.06]">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 font-mono text-xs font-extrabold text-foreground ${NM.recessed}`}
                  >
                    <User className="size-3.5 text-primary" />
                    Track #{group.trackId}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 font-mono text-[10px] font-bold ${
                      group.source === "live"
                        ? "bg-accent/15 text-accent"
                        : "bg-primary/15 text-primary"
                    }`}
                  >
                    {group.source === "live" ? (
                      <Radio className="size-3" />
                    ) : (
                      <Film className="size-3" />
                    )}
                    {group.source === "live" ? "LIVE" : "JOB"} · {group.sourceId}
                  </span>

                  {group.violationTypes.map((vType) => {
                    const norm = normalizeViolationType(vType);
                    const isAccent =
                      norm === "NO_HELMET" || norm === "RESTRICTED_AREA";
                    return (
                      <span
                        key={vType}
                        className={`rounded-lg px-2 py-0.5 font-mono text-[10px] font-bold ${
                          isAccent
                            ? "bg-accent/10 text-accent"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {norm}
                      </span>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 font-mono text-[11px] font-semibold text-muted-foreground">
                  <span>{t("aiTest.gallery.group.evidenceCount", { count: group.items.length })}</span>
                  {group.pairCount > 0 && (
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-primary">
                      {t("aiTest.gallery.group.pairCount", { count: group.pairCount })}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {group.items.map((item) => {
                  const globalIdx = indexById.get(item.id) ?? 0;
                  return (
                    <EvidencePairCard
                      key={item.id}
                      item={item}
                      onInspect={() =>
                        onInspectEvidence(filteredAndSorted, globalIdx)
                      }
                      onSeekToTime={
                        item.source === "job" ? onSeekToJobTime : undefined
                      }
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleItems.map((item) => {
              const globalIdx = indexById.get(item.id) ?? 0;
              return (
                <EvidencePairCard
                  key={item.id}
                  item={item}
                  onInspect={() =>
                    onInspectEvidence(filteredAndSorted, globalIdx)
                  }
                  onSeekToTime={
                    item.source === "job" ? onSeekToJobTime : undefined
                  }
                />
              );
            })}
          </div>

          {/* Thanh phân trang gọn khi > 12 bằng chứng */}
          {filteredAndSorted.length > PAGE_SIZE && (
            <div
              className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 ${NM.recessed}`}
            >
              <span className="text-xs font-medium text-muted-foreground">
                {t("aiTest.gallery.pagination.showing", {
                  range: showAll
                    ? `1–${filteredAndSorted.length}`
                    : `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(
                        safePage * PAGE_SIZE,
                        filteredAndSorted.length,
                      )}`,
                  total: filteredAndSorted.length,
                })}
              </span>

              <div className="flex items-center gap-2">
                {!showAll && totalPages > 1 && (
                  <>
                    <button
                      type="button"
                      disabled={safePage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className={`inline-flex h-8 items-center gap-1 rounded-xl px-2.5 text-xs font-semibold text-foreground disabled:opacity-40 ${NM.tactileBtn}`}
                    >
                      <ChevronLeft className="size-3.5" />
                      {t("aiTest.common.prev")}
                    </button>
                    <span className="px-2 font-mono text-xs font-bold text-foreground">
                      {safePage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={safePage >= totalPages}
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      className={`inline-flex h-8 items-center gap-1 rounded-xl px-2.5 text-xs font-semibold text-foreground disabled:opacity-40 ${NM.tactileBtn}`}
                    >
                      {t("aiTest.common.next")}
                      <ChevronRight className="size-3.5" />
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowAll((v) => !v);
                    setPage(1);
                  }}
                  className={`inline-flex h-8 items-center rounded-xl px-3 text-xs font-semibold text-primary ${NM.tactileBtn}`}
                >
                  {showAll
                    ? t("aiTest.gallery.pagination.collapse", { pageSize: PAGE_SIZE })
                    : t("aiTest.gallery.pagination.showAll")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
