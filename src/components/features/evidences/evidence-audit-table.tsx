"use client";

import Link from "next/link";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Film,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IncidentSeverityBadge } from "@/components/features/incidents/incident-severity-badge";
import { IncidentStatusBadge } from "@/components/features/incidents/incident-status-badge";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { useEvidenceViewUrl } from "@/hooks/incidents/use-evidences";
import {
  formatEvidenceFileSize,
  formatMediaDuration,
  getViolationLabel,
  isVideoEvidenceItem,
} from "@/lib/evidence-utils";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
import type { EvidenceItem, IncidentItem } from "@/types";
import { EvidenceIntegrityPill } from "./evidence-status-pill";

export interface EvidenceAuditTableProps {
  evidences: EvidenceItem[];
  incidentsMap: Map<string, IncidentItem>;
  selectedIds: Set<string>;
  verifyingIds: Set<string>;
  canDelete: boolean;
  allVisibleSelected: boolean;
  onToggleSelectAll: () => void;
  onToggleSelect: (id: string) => void;
  onInspect: (evidence: EvidenceItem) => void;
  onVerify: (evidence: EvidenceItem) => void;
  onDownload: (evidence: EvidenceItem) => void;
  onDelete: (evidence: EvidenceItem) => void;
  page?: number;
  pageSize?: number;
  totalItems?: number;
  totalPages?: number;
  isFetching?: boolean;
  pageSizeOptions?: number[];
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

function buildPageNumbers(currentPage: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }
  const pages: (number | "ellipsis")[] = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) {
    pages.push("ellipsis");
  }
  for (let p = start; p <= end; p += 1) {
    pages.push(p);
  }
  if (end < totalPages - 1) {
    pages.push("ellipsis");
  }
  pages.push(totalPages);
  return pages;
}

export function EvidenceAuditTable({
  evidences,
  incidentsMap,
  selectedIds,
  verifyingIds,
  canDelete,
  allVisibleSelected,
  onToggleSelectAll,
  onToggleSelect,
  onInspect,
  onVerify,
  onDownload,
  onDelete,
  page = 1,
  pageSize = 10,
  totalItems,
  totalPages,
  isFetching = false,
  pageSizeOptions = [10, 16, 20, 50],
  onPageChange,
  onPageSizeChange,
}: EvidenceAuditTableProps) {
  const { t, locale } = useLocale();
  const isVi = locale === "vi-VN";
  const { getCamera, getCameraCode, getSiteCode } = useEntityLookup();

  const effectiveTotalItems = totalItems ?? evidences.length;
  const effectiveTotalPages = Math.max(
    1,
    totalPages ?? Math.ceil(effectiveTotalItems / Math.max(1, pageSize)),
  );
  const currentPage = Math.min(Math.max(1, page), effectiveTotalPages);
  const startRow =
    effectiveTotalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRow =
    effectiveTotalItems === 0
      ? 0
      : Math.min((currentPage - 1) * pageSize + evidences.length, effectiveTotalItems);
  const canPrev = currentPage > 1;
  const canNext = currentPage < effectiveTotalPages;
  const pageItems = buildPageNumbers(currentPage, effectiveTotalPages);

  const navBtnClass = [
    "inline-flex size-8 sm:size-9 cursor-pointer items-center justify-center",
    "rounded-xl border border-white/60 dark:border-white/10",
    "bg-background text-foreground",
    "shadow-[2.5px_2.5px_5px_var(--shadow-dark),-2.5px_-2.5px_5px_var(--shadow-light)]",
    "transition-[transform,color,box-shadow] duration-200 hover:-translate-y-0.5 hover:text-primary motion-reduce:transform-none",
    "active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] active:translate-y-0",
    "disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:translate-y-0 disabled:shadow-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
  ].join(" ");

  const handleCopyHash = (hash: string) => {
    void navigator.clipboard?.writeText(hash);
    toast.success(t("evidences.actions.hashCopied"));
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/40 bg-surface shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)] dark:border-white/[0.06]">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-border/35 bg-background/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="w-10 px-3 py-3">
                <button
                  type="button"
                  onClick={onToggleSelectAll}
                  aria-label={t("evidences.batch.selectPage")}
                  className={`flex h-5 w-5 cursor-pointer items-center justify-center rounded border transition-colors ${
                    allVisibleSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-transparent hover:border-primary/60"
                  }`}
                >
                  <Check className="h-3 w-3 stroke-[3]" />
                </button>
              </th>
              <th className="px-3 py-3">{t("evidences.table.preview")}</th>
              <th className="px-3 py-3">{t("evidences.table.file")}</th>
              <th className="px-3 py-3">{t("evidences.table.type")}</th>
              <th className="px-3 py-3">{t("evidences.table.incident")}</th>
              <th className="px-3 py-3">{t("evidences.table.cameraSite")}</th>
              <th className="px-3 py-3">{t("evidences.table.capturedAt")}</th>
              <th className="px-3 py-3">{t("evidences.table.integrity")}</th>
              <th className="px-3 py-3 text-right">{t("evidences.table.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {evidences.map((ev) => {
              const selected = selectedIds.has(ev.id);
              const isVideo = isVideoEvidenceItem(ev);
              const inc = ev.incident ?? incidentsMap.get(ev.incidentId);
              const cam = getCamera(ev.cameraId);
              const siteCode = getSiteCode(inc?.siteId ?? cam?.siteId);
              const dimText =
                ev.metadata?.width && ev.metadata?.height
                  ? `${ev.metadata.width}×${ev.metadata.height}`
                  : isVideo && ev.metadata?.durationSeconds
                    ? formatMediaDuration(ev.metadata.durationSeconds)
                    : null;

              return (
                <tr
                  key={ev.id}
                  onClick={() => onInspect(ev)}
                  className={`cursor-pointer transition-colors ${
                    selected ? "bg-primary/8" : "hover:bg-background/60"
                  }`}
                >
                  <td
                    className="px-3 py-2.5"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => onToggleSelect(ev.id)}
                      aria-label={t("evidences.batch.toggleItem")}
                      className={`flex h-5 w-5 cursor-pointer items-center justify-center rounded border transition-colors ${
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-transparent hover:border-primary/60"
                      }`}
                    >
                      <Check className="h-3 w-3 stroke-[3]" />
                    </button>
                  </td>

                  <td className="px-3 py-2.5">
                    <EvidenceTableThumb evidence={ev} isVideo={isVideo} />
                  </td>

                  <td className="max-w-[220px] px-3 py-2.5">
                    <p className="truncate font-semibold text-foreground" title={ev.fileName}>
                      {ev.fileName}
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {formatEvidenceFileSize(ev.fileSize)}
                      {dimText ? ` • ${dimText}` : ""}
                    </p>
                  </td>

                  <td className="px-3 py-2.5">
                    <Badge
                      variant={
                        ev.evidenceType === "SNAPSHOT"
                          ? "danger"
                          : ev.evidenceType === "REFERENCE_SNAPSHOT"
                            ? "info"
                            : "warning"
                      }
                      size="sm"
                    >
                      {ev.evidenceType === "REFERENCE_SNAPSHOT"
                        ? "REFERENCE"
                        : ev.evidenceType === "VIDEO_CLIP"
                          ? "VIDEO"
                          : "SNAPSHOT"}
                    </Badge>
                  </td>

                  <td className="px-3 py-2.5">
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {inc?.violationType ? (
                          <span className="font-semibold text-foreground">
                            {getViolationLabel(inc.violationType, isVi)}
                          </span>
                        ) : (
                          <span className="font-mono text-[11px] text-muted-foreground">
                            #{ev.incidentId.slice(0, 8)}
                          </span>
                        )}
                        {inc?.severity && <IncidentSeverityBadge severity={inc.severity} />}
                        {inc?.status && <IncidentStatusBadge status={inc.status} />}
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {ev.incidentId.slice(0, 12)}…
                      </span>
                    </div>
                  </td>

                  <td className="px-3 py-2.5">
                    <p className="font-mono font-semibold text-foreground">
                      {getCameraCode(ev.cameraId)}
                    </p>
                    {siteCode && (
                      <p className="text-[10px] text-muted-foreground">{siteCode}</p>
                    )}
                  </td>

                  <td className="whitespace-nowrap px-3 py-2.5 text-[11px] text-muted-foreground">
                    {new Date(ev.capturedAt).toLocaleString(locale)}
                  </td>

                  <td
                    className="px-3 py-2.5"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <div className="flex flex-col items-start gap-1">
                      <EvidenceIntegrityPill
                        evidenceId={ev.id}
                        expectedChecksum={ev.metadata?.checksum}
                        isVerifying={verifyingIds.has(ev.id)}
                        onVerify={() => onVerify(ev)}
                      />
                      {ev.metadata?.checksum && (
                        <button
                          type="button"
                          onClick={() => handleCopyHash(ev.metadata!.checksum!)}
                          className="inline-flex cursor-pointer items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-foreground"
                        >
                          <span>{ev.metadata.checksum.slice(0, 14)}…</span>
                          <Copy className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  </td>

                  <td
                    className="px-3 py-2.5 text-right"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <div className="inline-flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onInspect(ev)}
                        title={t("evidences.actions.quickInspect")}
                        className="h-7 px-2"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={verifyingIds.has(ev.id)}
                        onClick={() => onVerify(ev)}
                        title={t("evidences.actions.verifySha")}
                        className="h-7 px-2"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDownload(ev)}
                        title={t("evidences.actions.downloadOriginal")}
                        className="h-7 px-2"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Link href={`/incidents/${ev.incidentId}`}>
                        <Button
                          size="sm"
                          variant="ghost"
                          title={t("evidences.actions.openIncident")}
                          className="h-7 px-2"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      {canDelete && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDelete(ev)}
                          title={t("common.delete")}
                          className="h-7 px-2 text-danger hover:text-danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Neumorphic Table Pagination Footer */}
      <div className="flex min-w-0 flex-col gap-3.5 border-t border-border/30 bg-background/50 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 sm:justify-start">
          <p
            className="text-[11px] font-medium text-muted-foreground sm:text-xs"
            aria-live="polite"
          >
            {effectiveTotalItems === 0 ? (
              isVi ? "Không có bản ghi" : "No records found"
            ) : isVi ? (
              <>
                Hiển thị{" "}
                <strong className="font-bold tabular-nums text-foreground">
                  {startRow}–{endRow}
                </strong>{" "}
                trong{" "}
                <strong className="font-bold tabular-nums text-foreground">
                  {effectiveTotalItems}
                </strong>{" "}
                bằng chứng
              </>
            ) : (
              <>
                Showing{" "}
                <strong className="font-bold tabular-nums text-foreground">
                  {startRow}–{endRow}
                </strong>{" "}
                of{" "}
                <strong className="font-bold tabular-nums text-foreground">
                  {effectiveTotalItems}
                </strong>{" "}
                evidences
              </>
            )}
          </p>

          {onPageSizeChange && (
            <label className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground sm:text-xs">
              <span>{isVi ? "Số dòng" : "Page size"}</span>
              <select
                value={pageSize}
                disabled={isFetching}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                aria-label={isVi ? "Số dòng mỗi trang" : "Rows per page"}
                className="h-8 cursor-pointer rounded-xl border border-[var(--shadow-dark)]/25 bg-background px-2.5 text-[11px] font-bold text-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] outline-none focus-visible:ring-2 focus-visible:ring-accent sm:h-9 sm:px-3 sm:text-xs dark:border-white/10"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size} {isVi ? "/ trang" : "/ page"}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="flex items-center justify-between gap-2.5 sm:justify-end">
          <span className="whitespace-nowrap rounded-xl border border-border/40 bg-background px-2.5 py-1 text-[11px] font-black tabular-nums text-primary shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)] sm:px-3 sm:py-1.5 sm:text-xs">
            {isVi
              ? `Trang ${currentPage} / ${effectiveTotalPages}`
              : `Page ${currentPage} of ${effectiveTotalPages}`}
          </span>

          {onPageChange && (
            <div className="flex items-center gap-1 sm:gap-1.5">
              <button
                type="button"
                className={navBtnClass}
                onClick={() => onPageChange(1)}
                disabled={isFetching || !canPrev}
                aria-label={isVi ? "Trang đầu" : "First page"}
                title={isVi ? "Trang đầu" : "First page"}
              >
                <ChevronsLeft size={14} />
              </button>

              <button
                type="button"
                className={navBtnClass}
                onClick={() => onPageChange(currentPage - 1)}
                disabled={isFetching || !canPrev}
                aria-label={isVi ? "Trang trước" : "Previous page"}
                title={isVi ? "Trang trước" : "Previous page"}
              >
                <ChevronLeft size={14} />
              </button>

              {effectiveTotalPages > 1 && (
                <div className="hidden items-center gap-1 sm:flex">
                  {pageItems.map((item, idx) =>
                    item === "ellipsis" ? (
                      <span
                        key={`ellipsis-${idx}`}
                        className="px-1.5 text-xs font-bold text-muted-foreground"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        disabled={isFetching}
                        onClick={() => onPageChange(item)}
                        className={`inline-flex size-8 sm:size-9 cursor-pointer items-center justify-center rounded-xl text-xs font-extrabold tabular-nums transition-all duration-200 ${
                          item === currentPage
                            ? "bg-primary text-primary-foreground shadow-[2.5px_2.5px_5px_var(--shadow-dark),-2.5px_-2.5px_5px_var(--shadow-light)]"
                            : "border border-white/60 dark:border-white/10 bg-background text-foreground shadow-[2.5px_2.5px_5px_var(--shadow-dark),-2.5px_-2.5px_5px_var(--shadow-light)] hover:-translate-y-0.5 hover:text-primary active:translate-y-0 active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]"
                        }`}
                      >
                        {item}
                      </button>
                    ),
                  )}
                </div>
              )}

              <button
                type="button"
                className={navBtnClass}
                onClick={() => onPageChange(currentPage + 1)}
                disabled={isFetching || !canNext}
                aria-label={isVi ? "Trang tiếp theo" : "Next page"}
                title={isVi ? "Trang tiếp theo" : "Next page"}
              >
                <ChevronRight size={14} />
              </button>

              <button
                type="button"
                className={navBtnClass}
                onClick={() => onPageChange(effectiveTotalPages)}
                disabled={isFetching || !canNext}
                aria-label={isVi ? "Trang cuối" : "Last page"}
                title={isVi ? "Trang cuối" : "Last page"}
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Ô thumbnail tách riêng để mỗi dòng gọi được hook presigned VIEW URL (video không cần ảnh). */
function EvidenceTableThumb({
  evidence,
  isVideo,
}: {
  evidence: EvidenceItem;
  isVideo: boolean;
}) {
  const { url } = useEvidenceViewUrl(evidence, !isVideo);
  return (
    <div className="h-11 w-16 overflow-hidden rounded-lg bg-slate-950">
      {!isVideo && url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={evidence.fileName}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-slate-400">
          <Film className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
