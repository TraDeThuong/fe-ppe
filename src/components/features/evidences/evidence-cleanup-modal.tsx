"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Clock,
  FileSpreadsheet,
  HardDriveDownload,
  Images,
  Loader2,
  ShieldAlert,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { BatchDeleteProgress } from "@/hooks/incidents";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import {
  exportEvidencesToCsv,
  formatEvidenceFileSize,
  isReferenceEvidenceItem,
  sumEvidenceBytes,
} from "@/lib/evidence-utils";
import { useLocale } from "@/providers/locale-provider";
import { incidentService } from "@/services/incident.service";
import {
  EVIDENCE_TYPE,
  type EvidenceItem,
  type EvidenceQueryParams,
  type IncidentItem,
} from "@/types";

export type CleanupPresetMode =
  | "DISMISSED_ONLY"
  | "REFERENCE_ONLY"
  | "CLOSED_INCIDENTS"
  | "OLDER_THAN_DAYS";

/** Mỗi kịch bản quét sâu tối đa 5 trang × 100 bản ghi lọc sẵn ở BE. */
const DEEP_SCAN_PAGE_SIZE = 100;
const DEEP_SCAN_MAX_PAGES = 5;

function presetServerQueries(
  preset: CleanupPresetMode,
  olderThanDays: number,
): EvidenceQueryParams[] {
  switch (preset) {
    case "DISMISSED_ONLY":
      return [{ lifecycle: "DISMISSED" }];
    case "REFERENCE_ONLY":
      return [{ evidenceType: EVIDENCE_TYPE.REFERENCE_SNAPSHOT }];
    case "CLOSED_INCIDENTS":
      // BE không cho xóa bằng chứng của sự cố CLOSED nên chỉ quét RESOLVED
      return [{ lifecycle: "RESOLVED" }];
    case "OLDER_THAN_DAYS":
      return [
        {
          toDate: new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];
    default:
      return [];
  }
}

export interface EvidenceCleanupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialEvidences: EvidenceItem[];
  incidentsMap: Map<string, IncidentItem>;
  canDelete: boolean;
  isDeleting: boolean;
  deleteProgress: BatchDeleteProgress | null;
  onDeleteItems: (targets: EvidenceItem[]) => Promise<void>;
}

const AGE_OPTIONS = [3, 7, 14, 30, 60, 90] as const;

export function EvidenceCleanupModal({
  open,
  onOpenChange,
  initialEvidences,
  incidentsMap,
  canDelete,
  isDeleting,
  deleteProgress,
  onDeleteItems,
}: EvidenceCleanupModalProps) {
  const { locale } = useLocale();
  const isVi = locale === "vi-VN";
  const { getCameraCode, getSiteCode } = useEntityLookup();

  const [preset, setPreset] = useState<CleanupPresetMode>("DISMISSED_ONLY");
  const [olderThanDays, setOlderThanDays] = useState<number>(7);
  const [protectActiveIncidents, setProtectActiveIncidents] = useState<boolean>(true);
  const [exportCsvBeforeDelete, setExportCsvBeforeDelete] = useState<boolean>(true);

  const [scannedEvidences, setScannedEvidences] = useState<EvidenceItem[]>([]);
  const [isScanningDeep, setIsScanningDeep] = useState(false);
  const [scannedPages, setScannedPages] = useState(1);

  // Khi mở modal, khởi tạo từ dữ liệu sẵn có trên trang
  useEffect(() => {
    if (open) {
      setScannedEvidences(initialEvidences);
      setScannedPages(1);
    }
  }, [open, initialEvidences]);

  // Quét sâu theo đúng kịch bản đang chọn bằng bộ lọc server-side của GET /evidences
  // (BE trả kèm tóm tắt sự cố nên không cần tải thêm /incidents).
  const handleDeepScan = async () => {
    if (isScanningDeep) return;
    setIsScanningDeep(true);
    try {
      const merged = new Map<string, EvidenceItem>();
      for (const item of scannedEvidences) merged.set(item.id, item);
      let pagesFetched = 0;
      for (const query of presetServerQueries(preset, olderThanDays)) {
        for (let page = 1; page <= DEEP_SCAN_MAX_PAGES; page += 1) {
          const res = await incidentService.getAllEvidences({
            ...query,
            page,
            limit: DEEP_SCAN_PAGE_SIZE,
            sortBy: "capturedAt",
            sortOrder: "desc",
          });
          pagesFetched += 1;
          for (const item of res.items ?? []) merged.set(item.id, item);
          const totalPages = res.meta?.totalPages ?? 1;
          if (page >= totalPages || (res.items ?? []).length < DEEP_SCAN_PAGE_SIZE) break;
        }
      }
      setScannedEvidences(Array.from(merged.values()));
      setScannedPages((prev) => prev + pagesFetched);
    } catch {
      // Giữ nguyên danh sách đã quét nếu mạng lỗi
    } finally {
      setIsScanningDeep(false);
    }
  };

  const mergedIncidentsMap = incidentsMap;

  const matchedEvidences = useMemo(() => {
    const nowMs = Date.now();
    const cutoffMs = nowMs - olderThanDays * 24 * 60 * 60 * 1000;

    return scannedEvidences.filter((ev) => {
      const inc = ev.incident ?? mergedIncidentsMap.get(ev.incidentId);
      const status = inc?.status;
      // BE từ chối xóa bằng chứng của sự cố đã CLOSED (DELETE /evidences/:id và batch-delete đều bỏ qua),
      // nên không đưa vào danh sách xóa để số tệp hiển thị khớp với số thực sự xóa được.
      if (status === "CLOSED") return false;
      // Fail-closed: nếu chưa xác minh được trạng thái sự cố (ngoài phạm vi incident đã tải),
      // coi như đang hoạt động để Khóa bảo vệ không bao giờ xóa nhầm bằng chứng sự cố chưa đóng.
      const isActiveOrUnknownIncident =
        !status || status === "PENDING_REVIEW" || status === "CONFIRMED";

      if (
        protectActiveIncidents &&
        isActiveOrUnknownIncident &&
        preset !== "DISMISSED_ONLY"
      ) {
        return false;
      }

      if (preset === "DISMISSED_ONLY") {
        return status === "DISMISSED";
      }

      if (preset === "REFERENCE_ONLY") {
        const isRef = isReferenceEvidenceItem(ev);
        if (!isRef) return false;
        if (protectActiveIncidents && isActiveOrUnknownIncident) return false;
        return true;
      }

      if (preset === "CLOSED_INCIDENTS") {
        return status === "RESOLVED";
      }

      if (preset === "OLDER_THAN_DAYS") {
        const capturedMs = Date.parse(ev.capturedAt);
        return !Number.isNaN(capturedMs) && capturedMs < cutoffMs;
      }

      return false;
    });
  }, [
    scannedEvidences,
    mergedIncidentsMap,
    protectActiveIncidents,
    preset,
    olderThanDays,
  ]);

  const totalMatchedBytes = useMemo(
    () => sumEvidenceBytes(matchedEvidences),
    [matchedEvidences],
  );

  const deletePct =
    deleteProgress && deleteProgress.total > 0
      ? Math.round((deleteProgress.done / deleteProgress.total) * 100)
      : 0;

  const handleExecute = async () => {
    if (matchedEvidences.length === 0 || isDeleting) return;

    if (exportCsvBeforeDelete) {
      exportEvidencesToCsv(
        matchedEvidences,
        {
          incidentsMap: mergedIncidentsMap,
          getCameraCode,
          getSiteCode,
        },
        `ppe-evidence-cleanup-${preset.toLowerCase()}`,
      );
    }

    await onDeleteItems(matchedEvidences);
    onOpenChange(false);
  };

  const presets: Array<{
    id: CleanupPresetMode;
    title: string;
    desc: string;
    badge: string;
    icon: typeof XCircle;
  }> = [
    {
      id: "DISMISSED_ONLY",
      title: isVi
        ? "Dọn bằng chứng Sự cố Báo nhầm (DISMISSED)"
        : "Purge Dismissed (False Positive) Evidences",
      desc: isVi
        ? "Loại bỏ các ảnh/video từ sự cố đã được xác nhận là AI nhận diện nhầm."
        : "Remove images/videos from incidents confirmed as false positives.",
      badge: isVi ? "An toàn nhất" : "Safest",
      icon: XCircle,
    },
    {
      id: "REFERENCE_ONLY",
      title: isVi
        ? "Chỉ dọn Ảnh đối chứng (REFERENCE_SNAPSHOT)"
        : "Clean Reference Snapshots Only",
      desc: isVi
        ? "Giữ nguyên ảnh vi phạm chính (SNAPSHOT), chỉ dọn ảnh nền đối chứng để giảm ~50% dung lượng."
        : "Keep primary violation snapshots and only clean reference frames (~50% space savings).",
      badge: isVi ? "-50% dữ liệu" : "-50% items",
      icon: Images,
    },
    {
      id: "CLOSED_INCIDENTS",
      title: isVi
        ? "Dọn bằng chứng Sự cố Đã xử lý (RESOLVED)"
        : "Clean Resolved (RESOLVED) Incident Evidences",
      desc: isVi
        ? "Xóa tệp của các hồ sơ sự cố đã xử lý (RESOLVED). Bằng chứng của sự cố đã đóng (CLOSED) luôn được giữ lại."
        : "Delete files belonging to resolved (RESOLVED) incidents. Evidence of CLOSED incidents is always kept.",
      badge: isVi ? "Hồ sơ cũ" : "Completed",
      icon: Archive,
    },
    {
      id: "OLDER_THAN_DAYS",
      title: isVi
        ? "Dọn theo Độ tuổi Dữ liệu (Retention Policy)"
        : "Clean by Age (Retention Policy)",
      desc: isVi
        ? "Lọc toàn bộ bằng chứng cũ hơn số ngày chỉ định để xóa và giải phóng bộ nhớ."
        : "Filter evidences older than the specified number of days.",
      badge: `> ${olderThanDays} ${isVi ? "ngày" : "days"}`,
      icon: Clock,
    },
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isDeleting) onOpenChange(next);
      }}
      size="lg"
      title={
        isVi
          ? "Trợ lý Dọn dẹp Kho Bằng Chứng"
          : "Smart Evidence Vault Cleanup"
      }
      description={
        isVi
          ? "Giảm tải dữ liệu bằng cách xóa hàng loạt các bằng chứng dư thừa."
          : "Reduce vault clutter by batch deleting redundant evidence."
      }
      icon={<Sparkles className="h-5 w-5 text-primary" />}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isScanningDeep || isDeleting}
            onClick={() => void handleDeepScan()}
            className="gap-1.5 text-xs"
          >
            {isScanningDeep ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <HardDriveDownload className="h-3.5 w-3.5 text-primary" />
            )}
            <span>
              {isScanningDeep
                ? isVi
                  ? "Đang quét sâu..."
                  : "Scanning..."
                : isVi
                  ? `Quét mở rộng toàn kho (Đã quét ${scannedEvidences.length} tệp)`
                  : `Deep Scan Vault (${scannedEvidences.length} scanned)`}
            </span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={isDeleting}
              onClick={() => onOpenChange(false)}
            >
              {isVi ? "Đóng" : "Cancel"}
            </Button>

            <Button
              type="button"
              size="sm"
              variant="danger"
              disabled={matchedEvidences.length === 0 || isDeleting}
              onClick={() => void handleExecute()}
              className="gap-1.5"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>
                    {isVi
                      ? `Đang xóa ${deleteProgress?.done ?? 0}/${deleteProgress?.total ?? matchedEvidences.length} (${deletePct}%)`
                      : `Deleting ${deletePct}%`}
                  </span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>
                    {isVi
                      ? `Xóa vĩnh viễn ${matchedEvidences.length} tệp`
                      : `Delete ${matchedEvidences.length} files`}
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Bước 1: Chọn kịch bản lọc */}
        <div className="space-y-2">
          <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
            {isVi ? "1. Chọn kịch bản lọc dữ liệu dư thừa" : "1. Select Cleanup Preset"}
          </label>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {presets.map((item) => {
              const Icon = item.icon;
              const active = preset === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPreset(item.id)}
                  className={`flex flex-col justify-between gap-2 rounded-2xl border p-3.5 text-left transition-all cursor-pointer ${
                    active
                      ? "border-primary bg-primary/8 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]"
                      : "border-border/40 bg-background hover:border-primary/40 shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${
                          active
                            ? "bg-primary text-primary-foreground"
                            : "bg-surface text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-xs font-bold text-foreground">
                        {item.title}
                      </span>
                    </div>
                    <Badge variant={active ? "primary" : "outline"} size="sm">
                      {item.badge}
                    </Badge>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {item.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tuỳ chọn số ngày khi chọn OLDER_THAN_DAYS */}
        {preset === "OLDER_THAN_DAYS" && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-background p-3 shadow-[inset_2.5px_2.5px_6px_var(--shadow-dark),inset_-2.5px_-2.5px_6px_var(--shadow-light)]">
            <span className="text-xs font-semibold text-foreground">
              {isVi ? "Chọn mốc thời gian cũ hơn:" : "Older than:"}
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {AGE_OPTIONS.map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setOlderThanDays(days)}
                  className={`cursor-pointer rounded-xl px-3 py-1 text-xs font-bold transition-all ${
                    olderThanDays === days
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-surface text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {days} {isVi ? "ngày" : "days"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Khóa bảo vệ an toàn & Xuất CSV */}
        <div className="space-y-2 rounded-2xl border border-border/40 bg-surface/70 p-3.5 text-xs">
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={protectActiveIncidents}
              onChange={(e) => setProtectActiveIncidents(e.target.checked)}
              className="h-4 w-4 rounded accent-primary cursor-pointer"
            />
            <ShieldAlert className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold text-foreground">
              {isVi
                ? "Khóa bảo vệ: Không chạm vào các sự cố đang Chờ duyệt (PENDING_REVIEW) hoặc Đang xử lý (CONFIRMED)"
                : "Safety Lock: Protect active incidents (PENDING_REVIEW & CONFIRMED)"}
            </span>
          </label>

          {canDelete && (
            <label className="flex cursor-pointer items-center gap-2.5 pt-1">
              <input
                type="checkbox"
                checked={exportCsvBeforeDelete}
                onChange={(e) => setExportCsvBeforeDelete(e.target.checked)}
                className="h-4 w-4 rounded accent-primary cursor-pointer"
              />
              <FileSpreadsheet className="h-4 w-4 shrink-0 text-primary" />
              <span className="font-medium text-foreground">
                {isVi
                  ? "Tự động tải về Bản kê CSV (kèm SHA-256 & mã sự cố) trước khi xóa"
                  : "Automatically download CSV manifest before deleting"}
              </span>
            </label>
          )}
        </div>

        {/* Kết quả Preview */}
        <div className="rounded-2xl bg-background p-4 shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-foreground">
                {isVi ? "Kết quả đối chiếu:" : "Preview Match:"}{" "}
                <span className="text-primary">
                  {matchedEvidences.length} {isVi ? "tệp bằng chứng" : "evidence files"}
                </span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                {isVi ? "Tổng dung lượng ước tính:" : "Estimated size:"}{" "}
                <strong className="font-mono text-foreground">
                  {formatEvidenceFileSize(totalMatchedBytes)}
                </strong>
                {scannedPages > 1
                  ? isVi
                    ? ` (trên tổng ${scannedEvidences.length} tệp đã quét)`
                    : ` (out of ${scannedEvidences.length} scanned)`
                  : ""}
              </p>
            </div>

            {matchedEvidences.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  exportEvidencesToCsv(
                    matchedEvidences,
                    {
                      incidentsMap: mergedIncidentsMap,
                      getCameraCode,
                      getSiteCode,
                    },
                    `ppe-evidence-manifest-${preset.toLowerCase()}`,
                  )
                }
                className="h-8 gap-1.5 text-xs"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                <span>{isVi ? "Tải bản kê CSV ngay" : "Download CSV Manifest"}</span>
              </Button>
            )}
          </div>

          {matchedEvidences.length > 0 && (
            <div className="mt-3 max-h-32 space-y-1 overflow-y-auto border-t border-border/25 pt-2 text-[11px]">
              {matchedEvidences.slice(0, 6).map((ev) => {
                const inc = ev.incident ?? mergedIncidentsMap.get(ev.incidentId);
                return (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-surface/60 px-2.5 py-1"
                  >
                    <span className="truncate font-medium text-foreground">
                      {ev.fileName}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                      {ev.evidenceType} • {inc?.status || "—"} •{" "}
                      {formatEvidenceFileSize(ev.fileSize)}
                    </span>
                  </div>
                );
              })}
              {matchedEvidences.length > 6 && (
                <p className="pt-1 text-center text-[10px] text-muted-foreground">
                  {isVi
                    ? `... và ${matchedEvidences.length - 6} tệp khác`
                    : `... and ${matchedEvidences.length - 6} more files`}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
