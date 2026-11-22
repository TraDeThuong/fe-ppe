"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Images, RefreshCw, Sparkles } from "lucide-react";
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
  useIncidents,
  useVerifyEvidenceMutation,
} from "@/hooks/incidents";
import { useCan } from "@/hooks/use-can";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import {
  exportEvidencesToCsv,
  filterEvidencesClientSide,
  formatEvidenceFileSize,
  getViolationLabel,
  loadArchivedEvidenceIds,
  saveArchivedEvidenceIds,
  sumEvidenceBytes,
  type EvidenceChecksumFilter,
  type EvidenceDatePreset,
  type EvidenceLifecycleScope,
} from "@/lib/evidence-utils";
import { resolveEvidenceUrl } from "@/lib/evidence-url";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
import { incidentService } from "@/services";
import type { EvidenceItem, IncidentItem } from "@/types";

const PAGE_LIMIT = 16;

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
  const { getCamera, getCameraCode, getSiteCode, getSiteName } = useEntityLookup();

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
    return s === "active" || s === "closed" || s === "dismissed" || s === "archived"
      ? s
      : "all";
  });
  const [archivedIds, setArchivedIds] = useState<Set<string>>(() => new Set());
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

  // Hydrate archived IDs from localStorage on client mount
  useEffect(() => {
    setArchivedIds(loadArchivedEvidenceIds());
  }, []);

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

  const hasClientFilters = Boolean(
    debouncedSearch.trim() ||
      siteId ||
      violationType ||
      checksumFilter !== "all" ||
      datePreset !== "all" ||
      lifecycleScope !== "all",
  );

  // When client-enriched filters are active, fetch larger slice (BE max=100) for accurate filtering
  const queryLimit = hasClientFilters ? 100 : pageSize;
  const queryPage = hasClientFilters ? 1 : page;

  const { data, isLoading, isFetching, refetch } = useEvidences({
    page: queryPage,
    limit: queryLimit,
    cameraId: cameraId || undefined,
    evidenceType: evidenceType || undefined,
    sortBy,
    sortOrder,
  });

  const { data: vaultCounts, isLoading: countsLoading } = useEvidenceVaultCounts({
    cameraId: cameraId || undefined,
  });

  // Hydrate incident context (violationType, severity, status, siteId) with 1 lightweight call
  const { data: incidentsData } = useIncidents({
    page: 1,
    limit: 100,
    siteId: siteId || undefined,
    cameraId: cameraId || undefined,
    violationType: violationType || undefined,
  });

  const incidentsMap = useMemo(() => {
    const map = new Map<string, IncidentItem>();
    for (const inc of incidentsData?.items ?? []) {
      map.set(inc.id, inc);
    }
    return map;
  }, [incidentsData]);

  // Realtime invalidation on new PPE violations
  useEffect(() => {
    if (!lastAlert) return;
    if (
      lastAlert.type === "notification:ppe_violation" ||
      lastAlert.type === "notification:new"
    ) {
      void queryClient.invalidateQueries({ queryKey: incidentKeys.evidences() });
      void queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
    }
  }, [lastAlert, queryClient]);

  const rawEvidences = data?.items ?? [];
  const meta = data?.meta;

  const visibleEvidences = useMemo(() => {
    if (!hasClientFilters) {
      return archivedIds.size > 0
        ? rawEvidences.filter((ev) => !archivedIds.has(ev.id))
        : rawEvidences;
    }
    return filterEvidencesClientSide(
      rawEvidences,
      {
        search: debouncedSearch,
        siteId,
        violationType,
        checksumFilter,
        datePreset,
        lifecycleScope,
        archivedIds,
      },
      {
        incidentsMap,
        getCameraSiteId: (camId) => getCamera(camId)?.siteId,
        getCameraLabel: (camId) => getCameraCode(camId),
        getSiteLabel: (sId) =>
          sId ? `${getSiteCode(sId) || ""} ${getSiteName(sId)}` : "",
      },
    );
  }, [
    hasClientFilters,
    rawEvidences,
    debouncedSearch,
    siteId,
    violationType,
    checksumFilter,
    datePreset,
    lifecycleScope,
    archivedIds,
    incidentsMap,
    getCamera,
    getCameraCode,
    getSiteCode,
    getSiteName,
  ]);

  const totalItems = hasClientFilters
    ? visibleEvidences.length
    : (meta?.total ?? visibleEvidences.length);

  const totalPages = hasClientFilters
    ? Math.max(1, Math.ceil(totalItems / pageSize))
    : Math.max(1, meta?.totalPages ?? Math.ceil(totalItems / pageSize));

  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    if (!isLoading && page > totalPages) {
      setPage(totalPages);
    }
  }, [isLoading, page, totalPages]);

  const paginatedEvidences = useMemo(() => {
    if (!hasClientFilters) return visibleEvidences;
    const start = (currentPage - 1) * pageSize;
    return visibleEvidences.slice(start, start + pageSize);
  }, [hasClientFilters, visibleEvidences, currentPage, pageSize]);

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
      { label: t("common.breadcrumb.home"), href: "/dashboard" },
      { label: t("nav.evidences") },
    ],
    [t],
  );

  const pageHashCoverage = useMemo(() => {
    const withHash = paginatedEvidences.filter((e) => Boolean(e.metadata?.checksum)).length;
    return { withHash, total: paginatedEvidences.length };
  }, [paginatedEvidences]);

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

  const handleDownload = async (ev: EvidenceItem) => {
    try {
      const res = await incidentService.getEvidenceDownloadUrl(ev.id, {
        action: "DOWNLOAD",
      });
      const safeUrl = resolveEvidenceUrl(res.downloadUrl) || res.downloadUrl;
      window.open(safeUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("evidences.actions.downloadError"));
    }
  };

  const handleToggleArchiveSingle = (ev: EvidenceItem) => {
    const wasArchived = archivedIds.has(ev.id);
    setArchivedIds((prev) => {
      const next = new Set(prev);
      if (wasArchived) {
        next.delete(ev.id);
      } else {
        next.add(ev.id);
      }
      saveArchivedEvidenceIds(next);
      return next;
    });
    toast.success(
      wasArchived
        ? isVi
          ? `Đã khôi phục "${ev.fileName}" về Kho chính.`
          : `Restored "${ev.fileName}" to Active Vault.`
        : isVi
          ? `Đã chuyển "${ev.fileName}" vào Kho Lưu trữ.`
          : `Moved "${ev.fileName}" to Archive Vault.`,
    );
  };

  const handleArchiveItems = (ids: string[]) => {
    if (ids.length === 0) return;
    setArchivedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      saveArchivedEvidenceIds(next);
      return next;
    });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
    toast.success(
      isVi
        ? `Đã chuyển ${ids.length} tệp vào Kho Lưu trữ.`
        : `Moved ${ids.length} files to Archive Vault.`,
    );
  };

  const handleBatchArchiveToggle = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const isRestore = lifecycleScope === "archived";
    setArchivedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (isRestore) next.delete(id);
        else next.add(id);
      }
      saveArchivedEvidenceIds(next);
      return next;
    });
    setSelectedIds(new Set());
    toast.success(
      isRestore
        ? isVi
          ? `Đã khôi phục ${ids.length} tệp về Kho chính.`
          : `Restored ${ids.length} files to Active Vault.`
        : isVi
          ? `Đã chuyển ${ids.length} tệp vào Kho Lưu trữ.`
          : `Moved ${ids.length} files to Archive Vault.`,
    );
  };

  const handleBatchExportCsv = () => {
    const targets = selectedItems.length > 0 ? selectedItems : visibleEvidences;
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
    const targets = visibleEvidences.filter((ev) => selectedIds.has(ev.id));
    for (const ev of targets) {
      await handleDownload(ev);
      await new Promise((r) => setTimeout(r, 250));
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCleanupOpen(true)}
              className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
              title={
                isVi
                  ? "Mở Trợ lý Dọn dẹp & Lưu trữ Kho bằng chứng"
                  : "Open Smart Vault Cleanup & Archive Assistant"
              }
            >
              <Sparkles className="h-4 w-4" />
              <span>{isVi ? "Dọn dẹp & Lưu trữ" : "Cleanup & Archive"}</span>
            </Button>

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

            <Button
              variant="ghost"
              size="sm"
              disabled={isFetching}
              onClick={() => void refetch()}
              className="gap-1.5"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              <span>{t("common.refresh")}</span>
            </Button>
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
        pageHashCoverage={pageHashCoverage}
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
        archivedCount={archivedIds.size}
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
      ) : visibleEvidences.length === 0 ? (
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
          {hasClientFilters || evidenceType || cameraId ? (
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
          archivedIds={archivedIds}
          onToggleArchive={handleToggleArchiveSingle}
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
              isArchived={archivedIds.has(ev.id)}
              showAiOverlay={showAiOverlayOnCards}
              onToggleSelect={handleToggleSelect}
              onInspect={(item) => handleInspect(item)}
              onVerify={handleVerifySingle}
              onDownload={handleDownload}
              onToggleArchive={handleToggleArchiveSingle}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* Standalone Pagination Bar (for Grid & Pairs view modes; Table mode includes built-in footer pagination) */}
      {viewMode !== "table" && visibleEvidences.length > 0 && totalPages > 1 && (
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

      {hasClientFilters && rawEvidences.length >= 100 && (
        <p className="text-center text-[11px] text-muted-foreground">
          {t("evidences.filters.clientScopeHint", {
            shown: visibleEvidences.length,
            scanned: rawEvidences.length,
          })}
        </p>
      )}

      {/* Floating Batch Actions Bar */}
      <EvidenceBatchBar
        selectedCount={selectedIds.size}
        selectedTotalBytes={selectedTotalBytes}
        allVisibleSelected={allVisibleSelected}
        canDelete={canDelete}
        isArchiveView={lifecycleScope === "archived"}
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
        onBatchArchive={handleBatchArchiveToggle}
        onBatchDelete={() => setIsBatchDeleteConfirmOpen(true)}
        isBatchVerifying={batchVerify.isRunning}
        batchProgress={batchVerify.progress}
        isBatchDeleting={batchDelete.isRunning}
        batchDeleteProgress={batchDelete.progress}
      />

      {/* Smart Vault Cleanup & Archive Modal */}
      <EvidenceCleanupModal
        open={isCleanupOpen}
        onOpenChange={setIsCleanupOpen}
        initialEvidences={rawEvidences}
        incidentsMap={incidentsMap}
        archivedIds={archivedIds}
        canDelete={canDelete}
        isDeleting={batchDelete.isRunning}
        deleteProgress={batchDelete.progress}
        onArchiveItems={handleArchiveItems}
        onDeleteItems={async (targets) => {
          await batchDelete.runBatchDelete(targets);
          setSelectedIds(new Set());
        }}
      />

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
        onDownload={handleDownload}
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
                incidentsMap.get(deleteTarget.incidentId)?.violationType
                  ? ` — ${getViolationLabel(
                      incidentsMap.get(deleteTarget.incidentId)?.violationType,
                      isVi,
                    )}`
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
            ? `Hành động này sẽ xóa vĩnh viễn ${selectedIds.size} tệp bằng chứng (${formatEvidenceFileSize(selectedTotalBytes)}) khỏi cơ sở dữ liệu và kho lưu trữ đối tượng MinIO. Nếu bạn chỉ muốn ẩn bớt cho gọn bảng, hãy chọn nút "Lưu trữ".`
            : `This will permanently delete ${selectedIds.size} evidence files (${formatEvidenceFileSize(selectedTotalBytes)}) from the database and MinIO storage.`
        }
        confirmText={
          isVi ? `Xóa ${selectedIds.size} tệp` : `Delete ${selectedIds.size} files`
        }
      />
    </div>
  );
}
