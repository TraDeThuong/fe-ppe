"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, EyeOff, Images, Sparkles } from "lucide-react";
import { RefreshButton } from "@/components/ui/refresh-action";
import { PageHeader } from "@/components/features/app-shell/page-header";
import {
  EvidenceAuditTable,
  EvidenceBatchBar,
  EvidenceCard,
  EvidenceCleanupModal,
  EvidenceFilterBar,
  EvidencePairGroupView,
  EvidenceQuickInspectorModal,
  EvidenceVaultKpis,
  type EvidenceViewMode,
} from "@/components/features/evidences";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useSite } from "@/contexts/SiteContext";
import { useDebounce } from "@/hooks/use-debounce";
import {
  incidentKeys,
  useBatchDeleteEvidences,
  useBatchVerifyEvidences,
  useEvidenceMutations,
  useEvidenceVaultCounts,
  useEvidences,
  useVerifyEvidenceMutation,
} from "@/hooks/incidents";
import { useCan } from "@/hooks/use-can";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import {
  buildEvidenceServerFilters,
  exportEvidencesToCsv,
  formatEvidenceFileSize,
  getViolationLabel,
  sumEvidenceBytes,
  triggerEvidenceFileDownload,
  type EvidenceChecksumFilter,
  type EvidenceDatePreset,
  type EvidenceLifecycleScope,
} from "@/lib/evidence-utils";
import { resolveEvidenceUrl } from "@/lib/evidence-url";
import { throttle } from "@/lib/throttle";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
import { incidentService } from "@/services";
import type { EvidenceItem, IncidentItem } from "@/types";

const PAGE_LIMIT = 16;
/** Gom các sự kiện socket dồn dập: tối đa 1 lần làm mới dữ liệu kho mỗi 5 giây. */
const REALTIME_INVALIDATE_THROTTLE_MS = 5_000;

export default function EvidencesContent() {
  const { t, locale } = useLocale();
  const isVi = locale === "vi-VN";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const canDelete = useCan()("PPE_INCIDENT_DELETE");
  const { siteId: globalSiteId, setSiteId: setGlobalSiteId } = useSite();
  const { lastAlert } = useRealtime();
  const { getCameraCode, getSiteCode } = useEntityLookup();

  // Initialize state from URL query params
  const [viewMode, setViewMode] = useState<EvidenceViewMode>(() => {
    const v = searchParams.get("view");
    return v === "pairs" || v === "table" ? v : "grid";
  });
  const [search, setSearch] = useState(() => searchParams.get("q") || "");
  const [siteId, setSiteId] = useState(() =>
    searchParams.has("siteId") ? searchParams.get("siteId") || "" : globalSiteId || "",
  );
  const [cameraId, setCameraId] = useState(() => searchParams.get("cameraId") || "");
  const [evidenceType, setEvidenceType] = useState(() => searchParams.get("type") || "");
  const [violationType, setViolationType] = useState(
    () => searchParams.get("violation") || "",
  );
  const [checksumFilter, setChecksumFilter] = useState<EvidenceChecksumFilter>(() => {
    const c = searchParams.get("checksum");
    return c === "has_hash" || c === "missing_hash" ? c : "all";
  });
  const [datePreset, setDatePreset] = useState<EvidenceDatePreset>(() => {
    const d = searchParams.get("date");
    return d === "today" || d === "7d" || d === "30d" ? d : "all";
  });
  const [lifecycleScope, setLifecycleScope] = useState<EvidenceLifecycleScope>(() => {
    const s = searchParams.get("scope");
    return s === "active" || s === "closed" || s === "dismissed" ? s : "all";
  });
  const [sortBy, setSortBy] = useState<"capturedAt" | "createdAt">(() =>
    searchParams.get("sortBy") === "createdAt" ? "createdAt" : "capturedAt",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(() =>
    searchParams.get("sortOrder") === "asc" ? "asc" : "desc",
  );
  const [page, setPage] = useState(() => {
    const p = Number(searchParams.get("page") || "1");
    return Number.isFinite(p) && p >= 1 ? Math.floor(p) : 1;
  });
  const [pageSize, setPageSize] = useState(() => {
    const l = Number(searchParams.get("limit") || "");
    if (Number.isFinite(l) && [10, 16, 20, 50].includes(l)) return l;
    return searchParams.get("view") === "table" ? 10 : PAGE_LIMIT;
  });
  const [showAiOverlayOnCards, setShowAiOverlayOnCards] = useState(true);

  // Selection & Modal states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [inspectorIndex, setInspectorIndex] = useState<number | null>(null);
  const [inspectorCompareMode, setInspectorCompareMode] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EvidenceItem | null>(null);
  const [isBatchDeleteConfirmOpen, setIsBatchDeleteConfirmOpen] = useState(false);
  const [isCleanupOpen, setIsCleanupOpen] = useState(false);
  const [verifyingIds, setVerifyingIds] = useState<Set<string>>(() => new Set());

  const debouncedSearch = useDebounce(search, 300);

  // Sync with global SiteContext selector in Header
  useEffect(() => {
    if (!searchParams.has("siteId") && (globalSiteId || "") !== siteId) {
      setSiteId(globalSiteId || "");
      setCameraId("");
      setPage(1);
    }
  }, [globalSiteId, searchParams, siteId]);

  // Persist filter/view state to URL cleanly
  useEffect(() => {
    const params = new URLSearchParams();
    if (viewMode !== "grid") params.set("view", viewMode);
    if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
    if (siteId) params.set("siteId", siteId);
    if (cameraId) params.set("cameraId", cameraId);
    if (evidenceType) params.set("type", evidenceType);
    if (violationType) params.set("violation", violationType);
    if (checksumFilter !== "all") params.set("checksum", checksumFilter);
    if (datePreset !== "all") params.set("date", datePreset);
    if (lifecycleScope !== "all") params.set("scope", lifecycleScope);
    if (sortBy !== "capturedAt") params.set("sortBy", sortBy);
    if (sortOrder !== "desc") params.set("sortOrder", sortOrder);
    if (page > 1) params.set("page", String(page));
    if (pageSize !== PAGE_LIMIT) params.set("limit", String(pageSize));

    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();
    if (nextQuery !== currentQuery) {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }
  }, [
    viewMode,
    debouncedSearch,
    siteId,
    cameraId,
    evidenceType,
    violationType,
    checksumFilter,
    datePreset,
    lifecycleScope,
    sortBy,
    sortOrder,
    page,
    pageSize,
    pathname,
    router,
    searchParams,
  ]);

  const hasActiveFilters = Boolean(
    debouncedSearch.trim() ||
      siteId ||
      cameraId ||
      evidenceType ||
      violationType ||
      checksumFilter !== "all" ||
      datePreset !== "all" ||
      lifecycleScope !== "all",
  );

  // Toàn bộ bộ lọc + phân trang chạy server-side trên GET /evidences (không cắt 100 bản ghi rồi lọc ở FE).
  const serverFilters = useMemo(
    () =>
      buildEvidenceServerFilters({
        search: debouncedSearch,
        siteId,
        cameraId,
        evidenceType,
        violationType,
        checksumFilter,
        datePreset,
        lifecycleScope,
      }),
    [
      debouncedSearch,
      siteId,
      cameraId,
      evidenceType,
      violationType,
      checksumFilter,
      datePreset,
      lifecycleScope,
    ],
  );

  const { data, isLoading, isFetching, refetch } = useEvidences({
    ...serverFilters,
    page,
    limit: pageSize,
    sortBy,
    sortOrder,
  });

  // KPI: 1 request /evidences/summary theo cùng bộ lọc (trừ loại bằng chứng để 4 thẻ luôn đủ số theo loại).
  const summaryFilters = useMemo(() => {
    const { evidenceType: _omitType, ...rest } = serverFilters;
    return rest;
  }, [serverFilters]);

  const {
    data: vaultCounts,
    isLoading: countsLoading,
    isError: countsError,
    isFetching: countsFetching,
    refetch: refetchVaultCounts,
  } = useEvidenceVaultCounts(summaryFilters);

  // BE trả kèm tóm tắt sự cố (`evidence.incident`) cho từng bằng chứng nên không cần gọi thêm /incidents.
  const incidentsMap = useMemo(() => new Map<string, IncidentItem>(), []);

  // Realtime: throttle invalidate để bão cảnh báo không kéo theo hàng loạt request lặp lại.
  const throttledInvalidateRef = useRef<ReturnType<typeof throttle> | null>(null);
  useEffect(() => {
    const fn = throttle(() => {
      void queryClient.invalidateQueries({ queryKey: incidentKeys.evidences() });
    }, REALTIME_INVALIDATE_THROTTLE_MS);
    throttledInvalidateRef.current = fn;
    return () => {
      fn.cancel();
      throttledInvalidateRef.current = null;
    };
  }, [queryClient]);

  useEffect(() => {
    if (!lastAlert) return;
    if (
      lastAlert.type === "notification:ppe_violation" ||
      lastAlert.type === "notification:new"
    ) {
      throttledInvalidateRef.current?.();
    }
  }, [lastAlert]);

  const rawEvidences = useMemo(() => data?.items ?? [], [data?.items]);
  const meta = data?.meta;
  const paginatedEvidences = rawEvidences;

  const totalItems = meta?.total ?? rawEvidences.length;
  const totalPages = Math.max(
    1,
    meta?.totalPages ?? Math.ceil(totalItems / pageSize),
  );

  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    if (!isLoading && meta && page > totalPages) {
      setPage(totalPages);
    }
  }, [isLoading, meta, page, totalPages]);

  const mutations = useEvidenceMutations();
  const verifyMutation = useVerifyEvidenceMutation();
  const batchVerify = useBatchVerifyEvidences();
  const batchDelete = useBatchDeleteEvidences();

  const selectedItems = useMemo(
    () => rawEvidences.filter((ev) => selectedIds.has(ev.id)),
    [rawEvidences, selectedIds],
  );

  const selectedTotalBytes = useMemo(
    () => sumEvidenceBytes(selectedItems),
    [selectedItems],
  );

  const breadcrumbs = useMemo(
    () => [
      { label: t("nav.incidents"), href: "/incidents" },
      { label: t("nav.evidences") },
    ],
    [t],
  );

  // Tỷ lệ SHA-256 tính trên toàn bộ tập khớp bộ lọc (summary), không phải 16 mục của trang hiện tại.
  const vaultHashCoverage = useMemo(() => {
    if (!vaultCounts || typeof vaultCounts.withChecksumCount !== "number") return undefined;
    return { withHash: vaultCounts.withChecksumCount, total: vaultCounts.total };
  }, [vaultCounts]);

  // Handlers
  const handleSiteChange = (nextSite: string) => {
    setSiteId(nextSite);
    setCameraId("");
    setGlobalSiteId(nextSite || null);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch("");
    setSiteId("");
    setGlobalSiteId(null);
    setCameraId("");
    setEvidenceType("");
    setViolationType("");
    setChecksumFilter("all");
    setDatePreset("all");
    setLifecycleScope("all");
    setPage(1);
  };

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allVisibleSelected =
    paginatedEvidences.length > 0 &&
    paginatedEvidences.every((ev) => selectedIds.has(ev.id));

  const handleToggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const ev of paginatedEvidences) next.delete(ev.id);
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const ev of paginatedEvidences) next.add(ev.id);
        return next;
      });
    }
  };

  const handleInspect = (ev: EvidenceItem, openInCompare = false) => {
    const idx = paginatedEvidences.findIndex((item) => item.id === ev.id);
    if (idx >= 0) {
      setInspectorCompareMode(openInCompare);
      setInspectorIndex(idx);
    }
  };

  const handleVerifySingle = async (ev: EvidenceItem) => {
    setVerifyingIds((prev) => new Set(prev).add(ev.id));
    try {
      await verifyMutation.mutateAsync(ev.id);
    } finally {
      setVerifyingIds((prev) => {
        const next = new Set(prev);
        next.delete(ev.id);
        return next;
      });
    }
  };

  // Presigned DOWNLOAD URL trả Content-Disposition: attachment nên tải qua thẻ <a> ẩn
  // (không mở tab mới → không bị popup blocker chặn sau lệnh await).
  const handleDownload = async (ev: EvidenceItem): Promise<boolean> => {
    try {
      const res = await incidentService.getEvidenceDownloadUrl(ev.id, {
        action: "DOWNLOAD",
      });
      const safeUrl = resolveEvidenceUrl(res.downloadUrl) || res.downloadUrl;
      triggerEvidenceFileDownload(safeUrl, res.fileName || ev.fileName);
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("evidences.actions.downloadError"));
      return false;
    }
  };

  const handleBatchExportCsv = () => {
    const targets = selectedItems.length > 0 ? selectedItems : paginatedEvidences;
    exportEvidencesToCsv(targets, {
      incidentsMap,
      getCameraCode,
      getSiteCode,
    });
    toast.success(
      isVi
        ? `Đã xuất bản kê CSV (${targets.length} tệp bằng chứng).`
        : `Exported CSV manifest (${targets.length} evidence files).`,
    );
  };

  const handleBatchVerify = async () => {
    const ids = Array.from(selectedIds);
    await batchVerify.runBatch(ids);
  };

  const handleBatchDownload = async () => {
    const targets = selectedItems;
    if (targets.length === 0) return;
    let ok = 0;
    for (const ev of targets) {
      if (await handleDownload(ev)) ok += 1;
      // Giãn nhịp để trình duyệt xử lý từng lượt tải (Chrome sẽ hỏi quyền "tải nhiều tệp" một lần).
      await new Promise((r) => setTimeout(r, 400));
    }
    if (targets.length > 1) {
      toast.success(
        isVi
          ? `Đã gửi ${ok}/${targets.length} lượt tải xuống. Nếu trình duyệt hỏi, hãy cho phép tải nhiều tệp.`
          : `Started ${ok}/${targets.length} downloads. Allow multiple downloads if your browser asks.`,
      );
    }
  };

  const handleConfirmBatchDelete = async () => {
    const byId = new Map(rawEvidences.map((ev) => [ev.id, ev]));
    const targets = Array.from(selectedIds).map(
      (id) => byId.get(id) ?? { id },
    );
    setIsBatchDeleteConfirmOpen(false);
    await batchDelete.runBatchDelete(targets);
    setSelectedIds(new Set());
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const deletedId = deleteTarget.id;
    await mutations.deleteEvidence.mutateAsync({
      evidenceId: deletedId,
      incidentId: deleteTarget.incidentId,
    });
    setDeleteTarget(null);
    setSelectedIds((prev) => {
      if (!prev.has(deletedId)) return prev;
      const next = new Set(prev);
      next.delete(deletedId);
      return next;
    });
    if (inspectorIndex !== null) {
      setInspectorIndex(null);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        icon={Images}
        title={t("evidences.header.title")}
        description={t("evidences.header.description")}
        badge="Evidence Vault"
        breadcrumbs={breadcrumbs}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/incidents"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-xl border border-border/70 bg-background px-3 text-sm font-medium text-foreground shadow-[6px_6px_12px_var(--shadow-dark),-6px_-6px_12px_var(--shadow-light)] transition-[box-shadow,transform,color] duration-200 hover:text-primary active:translate-y-px active:shadow-[inset_4px_4px_8px_var(--shadow-dark),inset_-4px_-4px_8px_var(--shadow-light)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
              title={isVi ? "Quay lại danh sách sự cố" : "Back to Incidents"}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{isVi ? "Quay lại Sự cố" : "Back to Incidents"}</span>
            </Link>

            {canDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCleanupOpen(true)}
              className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
              title={
                isVi
                  ? "Mở Trợ lý Dọn dẹp Kho bằng chứng"
                  : "Open Smart Vault Cleanup Assistant"
              }
            >
              <Sparkles className="h-4 w-4" />
              <span>{isVi ? "Dọn dẹp" : "Cleanup"}</span>
            </Button>
            )}

            <Button
              variant={showAiOverlayOnCards ? "primary" : "outline"}
              size="sm"
              onClick={() => setShowAiOverlayOnCards((v) => !v)}
              className="gap-1.5"
              title={t("evidences.actions.toggleAiOverlay")}
            >
              {showAiOverlayOnCards ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">AI HUD</span>
            </Button>

            <RefreshButton
              variant="ghost"
              size="sm"
              isRefreshing={isFetching || countsFetching}
              onRefresh={() => Promise.all([refetch(), refetchVaultCounts()])}
              iconClassName="h-4 w-4"
            />
          </div>
        }
      />

      {/* KPI Cards */}
      <EvidenceVaultKpis
        counts={vaultCounts}
        activeType={evidenceType}
        onSelectType={(type) => {
          setEvidenceType(type);
          setPage(1);
        }}
        loading={countsLoading}
        error={countsError && !vaultCounts}
        hashCoverage={vaultHashCoverage}
      />

      {/* Filter & View Bar */}
      <EvidenceFilterBar
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        siteId={siteId}
        onSiteIdChange={handleSiteChange}
        cameraId={cameraId}
        onCameraIdChange={(v) => {
          setCameraId(v);
          setPage(1);
        }}
        evidenceType={evidenceType}
        onEvidenceTypeChange={(v) => {
          setEvidenceType(v);
          setPage(1);
        }}
        violationType={violationType}
        onViolationTypeChange={(v) => {
          setViolationType(v);
          setPage(1);
        }}
        checksumFilter={checksumFilter}
        onChecksumFilterChange={(v) => {
          setChecksumFilter(v);
          setPage(1);
        }}
        datePreset={datePreset}
        onDatePresetChange={(v) => {
          setDatePreset(v);
          setPage(1);
        }}
        lifecycleScope={lifecycleScope}
        onLifecycleScopeChange={(v) => {
          setLifecycleScope(v);
          setPage(1);
        }}
        sortBy={sortBy}
        onSortByChange={(v) => {
          setSortBy(v);
          setPage(1);
        }}
        sortOrder={sortOrder}
        onToggleSortOrder={() => {
          setSortOrder((o) => (o === "desc" ? "asc" : "desc"));
          setPage(1);
        }}
        viewMode={viewMode}
        onViewModeChange={(v) => {
          setViewMode(v);
          setPage(1);
        }}
        onResetFilters={handleResetFilters}
        visibleCount={paginatedEvidences.length}
        selectedCount={selectedIds.size}
        allVisibleSelected={allVisibleSelected}
        onToggleSelectAll={handleToggleSelectAll}
      />

      {/* Main Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="h-64 animate-pulse rounded-2xl bg-surface-elevated/50"
            />
          ))}
        </div>
      ) : paginatedEvidences.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/50 bg-background/60 p-12 text-center shadow-[inset_3px_3px_8px_var(--shadow-dark),inset_-3px_-3px_8px_var(--shadow-light)]">
          <Images className="h-10 w-10 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-foreground">
              {t("evidences.empty.title")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("evidences.empty.description")}
            </p>
          </div>
          {hasActiveFilters ? (
            <Button size="sm" variant="outline" onClick={handleResetFilters}>
              {t("evidences.filters.reset")}
            </Button>
          ) : null}
        </div>
      ) : viewMode === "pairs" ? (
        <EvidencePairGroupView
          evidences={paginatedEvidences}
          incidentsMap={incidentsMap}
          selectedIds={selectedIds}
          verifyingIds={verifyingIds}
          onToggleSelect={handleToggleSelect}
          onInspect={handleInspect}
          onVerify={handleVerifySingle}
          onDownload={handleDownload}
        />
      ) : viewMode === "table" ? (
        <EvidenceAuditTable
          evidences={paginatedEvidences}
          incidentsMap={incidentsMap}
          selectedIds={selectedIds}
          verifyingIds={verifyingIds}
          canDelete={canDelete}
          allVisibleSelected={allVisibleSelected}
          onToggleSelectAll={handleToggleSelectAll}
          onToggleSelect={handleToggleSelect}
          onInspect={(ev) => handleInspect(ev)}
          onVerify={handleVerifySingle}
          onDownload={handleDownload}
          onDelete={setDeleteTarget}
          page={currentPage}
          pageSize={pageSize}
          totalItems={totalItems}
          totalPages={totalPages}
          isFetching={isFetching}
          onPageChange={setPage}
          onPageSizeChange={(nextSize) => {
            setPageSize(nextSize);
            setPage(1);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {paginatedEvidences.map((ev) => (
            <EvidenceCard
              key={ev.id}
              evidence={ev}
              incident={ev.incident ?? incidentsMap.get(ev.incidentId)}
              selected={selectedIds.has(ev.id)}
              isVerifying={verifyingIds.has(ev.id)}
              canDelete={canDelete}
              showAiOverlay={showAiOverlayOnCards}
              onToggleSelect={handleToggleSelect}
              onInspect={(item) => handleInspect(item)}
              onVerify={handleVerifySingle}
              onDownload={handleDownload}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* Standalone Pagination Bar (for Grid & Pairs view modes; Table mode includes built-in footer pagination) */}
      {viewMode !== "table" && paginatedEvidences.length > 0 && totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-surface px-4 py-2.5 text-xs text-muted-foreground shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)]">
          <span>
            {t("evidences.pagination.summary", {
              page: currentPage,
              totalPages,
              total: totalItems,
            })}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage <= 1 || isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {t("evidences.inspector.prev")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage >= totalPages || isFetching}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              {t("evidences.inspector.next")}
            </Button>
          </div>
        </div>
      )}

      {/* Floating Batch Actions Bar */}
      <EvidenceBatchBar
        selectedCount={selectedIds.size}
        selectedTotalBytes={selectedTotalBytes}
        allVisibleSelected={allVisibleSelected}
        canDelete={canDelete}
        onSelectAllVisible={() =>
          setSelectedIds((prev) => {
            const next = new Set(prev);
            for (const ev of paginatedEvidences) next.add(ev.id);
            return next;
          })
        }
        onClearSelection={() => {
          setSelectedIds(new Set());
          batchVerify.reset();
          batchDelete.reset();
        }}
        onBatchVerify={handleBatchVerify}
        onBatchDownload={handleBatchDownload}
        onBatchExportCsv={handleBatchExportCsv}
        onBatchDelete={() => setIsBatchDeleteConfirmOpen(true)}
        isBatchVerifying={batchVerify.isRunning}
        batchProgress={batchVerify.progress}
        isBatchDeleting={batchDelete.isRunning}
        batchDeleteProgress={batchDelete.progress}
      />

      {/* Smart Vault Cleanup Modal */}
      {canDelete && (
        <EvidenceCleanupModal
          open={isCleanupOpen}
          onOpenChange={setIsCleanupOpen}
          initialEvidences={rawEvidences}
          incidentsMap={incidentsMap}
          canDelete={canDelete}
          isDeleting={batchDelete.isRunning}
          deleteProgress={batchDelete.progress}
          onDeleteItems={async (targets) => {
            await batchDelete.runBatchDelete(targets);
            setSelectedIds(new Set());
          }}
        />
      )}

      {/* Quick Forensic Inspector Modal */}
      <EvidenceQuickInspectorModal
        open={inspectorIndex !== null}
        items={paginatedEvidences}
        activeIndex={inspectorIndex ?? 0}
        initialCompare={inspectorCompareMode}
        incidentsMap={incidentsMap}
        canDelete={canDelete}
        onClose={() => setInspectorIndex(null)}
        onChangeIndex={(nextIdx) => {
          setInspectorCompareMode(false);
          setInspectorIndex(nextIdx);
        }}
        onDownload={(ev) => void handleDownload(ev)}
        onDelete={setDeleteTarget}
      />

      {/* Confirm Single Delete */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        variant="danger"
        loading={mutations.deleteEvidence.isPending}
        title={t("evidences.delete.title")}
        description={
          deleteTarget
            ? `${deleteTarget.fileName}${
                deleteTarget.incident?.violationType
                  ? ` — ${getViolationLabel(deleteTarget.incident.violationType, isVi)}`
                  : ""
              }`
            : ""
        }
        confirmText={t("common.delete")}
      />

      {/* Confirm Batch Delete */}
      <ConfirmDialog
        open={isBatchDeleteConfirmOpen}
        onClose={() => setIsBatchDeleteConfirmOpen(false)}
        onConfirm={() => void handleConfirmBatchDelete()}
        variant="danger"
        loading={batchDelete.isRunning}
        title={
          isVi
            ? `Xóa vĩnh viễn ${selectedIds.size} bằng chứng đã chọn?`
            : `Permanently delete ${selectedIds.size} selected evidences?`
        }
        description={
          isVi
            ? `Hành động này sẽ xóa vĩnh viễn ${selectedIds.size} tệp bằng chứng (${formatEvidenceFileSize(selectedTotalBytes)}) khỏi cơ sở dữ liệu và MinIO. Bằng chứng thuộc sự cố đã đóng (CLOSED) sẽ được giữ lại.`
            : `This will permanently delete ${selectedIds.size} evidence files (${formatEvidenceFileSize(selectedTotalBytes)}) from the database and MinIO. Evidence of CLOSED incidents is kept.`
        }
        confirmText={
          isVi ? `Xóa ${selectedIds.size} tệp` : `Delete ${selectedIds.size} files`
        }
      />
    </div>
  );
}
