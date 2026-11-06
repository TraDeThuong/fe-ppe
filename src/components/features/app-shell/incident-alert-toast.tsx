"use client";

import { useState, useMemo } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  X,
  ArrowRight,
  Camera,
  MapPin,
  Clock,
  Layers,
  Maximize2,
  ExternalLink,
} from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { resolveEvidenceUrl } from "@/lib/evidence-url";

export interface IncidentAlertPayload {
  incidentId?: string;
  siteId?: string;
  cameraId?: string;
  cameraCode?: string;
  siteName?: string;
  violationType?: string;
  severity?: string;
  title?: string;
  content?: string;
  evidenceUrl?: string;
  referenceEvidenceUrl?: string;
  detectedAt?: string;
  [key: string]: unknown;
}

export interface IncidentAlertToastProps {
  visible: boolean;
  data: IncidentAlertPayload;
  onClose: () => void;
  onOpenIncident: (incidentId: string) => void;
  onOpenCompare?: (incidentId: string) => void;
}

/**
 * Bản dịch nhãn vi phạm PPE thông dụng sang tiếng Việt hiển thị thân thiện
 */
function formatViolationLabel(violationType?: string, isVietnamese = true): string {
  if (!violationType) return isVietnamese ? "Vi phạm bảo hộ PPE" : "PPE Violation";
  const map: Record<string, { vi: string; en: string }> = {
    NO_HELMET: { vi: "Không đội mũ bảo hộ", en: "No Hard Hat" },
    NO_VEST: { vi: "Không mặc áo phản quang", en: "No Safety Vest" },
    NO_BOOTS: { vi: "Không mang giày bảo hộ", en: "No Safety Boots" },
    NO_GLOVES: { vi: "Không đeo găng tay bảo hộ", en: "No Safety Gloves" },
    NO_MASK: { vi: "Không đeo khẩu trang", en: "No Mask" },
    RESTRICTED_ZONE: { vi: "Vào khu vực cấm", en: "Restricted Zone Entry" },
    RESTRICTED_AREA: { vi: "Vào khu vực nguy hiểm", en: "Restricted Zone Entry" },
  };
  const key = violationType.toUpperCase().trim();
  if (map[key]) {
    return isVietnamese ? map[key].vi : map[key].en;
  }
  return violationType;
}

export function IncidentAlertToast({
  visible,
  data,
  onClose,
  onOpenIncident,
  onOpenCompare,
}: IncidentAlertToastProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const [imgError, setImgError] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const { getCameraCode, getSiteName } = useEntityLookup();

  const incidentId = data.incidentId;
  const violationLabel = formatViolationLabel(data.violationType, isVietnamese);
  const severity = (data.severity || "CRITICAL").toUpperCase();

  const title =
    data.title ||
    (isVietnamese
      ? `Phát hiện ${violationLabel}`
      : `${violationLabel} Detected`);
  const content =
    data.content ||
    (isVietnamese
      ? "Hệ thống AI camera vừa phát hiện sự cố vi phạm an toàn lao động tại hiện trường."
      : "AI camera system detected a workplace safety compliance violation.");

  // Regex nhận diện UUID thô để ưu tiên phân giải tên thân thiện
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  // Phân giải mã camera ngắn thân thiện (VD: CAM2) thay vì để chuỗi UUID thô
  const rawCam = data.cameraCode || data.cameraId;
  const displayCamera = useMemo(() => {
    if (data.cameraCode && !UUID_REGEX.test(data.cameraCode)) {
      return data.cameraCode;
    }
    if (data.cameraId) {
      return getCameraCode(data.cameraId);
    }
    if (rawCam && UUID_REGEX.test(rawCam)) {
      return getCameraCode(rawCam);
    }
    return rawCam;
  }, [data.cameraCode, data.cameraId, rawCam, getCameraCode]);

  // Phân giải tên công trường thân thiện (VD: Landmark) thay vì để chuỗi UUID thô
  const rawSite = data.siteName || data.siteId;
  const displaySite = useMemo(() => {
    if (data.siteName && !UUID_REGEX.test(data.siteName)) {
      return data.siteName;
    }
    if (data.siteId) {
      return getSiteName(data.siteId, isVietnamese ? "Công trường xây dựng" : "Construction Site");
    }
    if (rawSite && UUID_REGEX.test(rawSite)) {
      return getSiteName(rawSite, isVietnamese ? "Công trường xây dựng" : "Construction Site");
    }
    return rawSite;
  }, [data.siteName, data.siteId, rawSite, getSiteName, isVietnamese]);

  // Chuẩn hóa và fallback ảnh bằng chứng từ sessionStorage nếu payload SSE chưa kịp có evidenceUrl
  const resolvedEvidenceUrl = useMemo(() => {
    let raw = data.evidenceUrl;
    if (!raw && typeof window !== "undefined" && incidentId) {
      try {
        raw = sessionStorage.getItem(`ppe_incident_evidence_${incidentId}`) || undefined;
      } catch {
        raw = undefined;
      }
    }
    return raw ? resolveEvidenceUrl(raw) : null;
  }, [data.evidenceUrl, incidentId]);

  const handleClickCard = () => {
    if (incidentId) {
      onOpenIncident(incidentId);
    } else {
      onClose();
    }
  };

  const handleOpenCompareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (incidentId) {
      if (onOpenCompare) {
        onOpenCompare(incidentId);
      } else {
        onOpenIncident(incidentId);
      }
    } else {
      onClose();
    }
  };

  const handleOpenDetailClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (incidentId) {
      onOpenIncident(incidentId);
    } else {
      onClose();
    }
  };

  const isCritical = severity === "CRITICAL";

  return (
    <>
      <div
        role="alert"
        aria-live="assertive"
        onClick={handleClickCard}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className={`group pointer-events-auto relative flex w-full max-w-[440px] cursor-pointer flex-col overflow-hidden rounded-2xl border-2 bg-background/95 p-4 backdrop-blur-md transition-all duration-300 ${
          isCritical
            ? "border-rose-500/60 hover:border-rose-500 shadow-[6px_6px_22px_var(--shadow-dark),-6px_-6px_22px_var(--shadow-light),0_0_24px_rgba(244,63,94,0.32)]"
            : "border-amber-500/60 hover:border-amber-500 shadow-[6px_6px_22px_var(--shadow-dark),-6px_-6px_22px_var(--shadow-light),0_0_24px_rgba(245,158,11,0.28)]"
        } ${
          visible
            ? "animate-in fade-in slide-in-from-top-3"
            : "animate-out fade-out slide-out-to-top-2"
        }`}
      >
        {/* Thanh tiến trình đếm ngược 10s (Tự dừng khi hover) */}
        <div className="absolute inset-x-0 top-0 h-1 bg-border/20">
          <div
            className={`h-full ${
              isCritical
                ? "bg-gradient-to-r from-rose-500 via-rose-400 to-amber-500"
                : "bg-gradient-to-r from-amber-500 to-yellow-400"
            }`}
            style={{
              animation: "ppeToastCountdown 10s linear forwards",
              animationPlayState: isPaused ? "paused" : "running",
            }}
          />
        </div>

        {/* Header bar: Icon, Tiêu đề cảnh báo, Badge mức độ, Nút đóng */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex size-2.5 shrink-0">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                  isCritical ? "bg-rose-500" : "bg-amber-500"
                }`}
              />
              <span
                className={`relative inline-flex size-2.5 rounded-full ${
                  isCritical ? "bg-rose-500" : "bg-amber-500"
                }`}
              />
            </span>

            <div className="flex items-center gap-1.5 truncate">
              {isCritical ? (
                <ShieldAlert className="size-4 shrink-0 text-rose-500" />
              ) : (
                <AlertTriangle className="size-4 shrink-0 text-amber-500" />
              )}
              <span
                className={`text-xs font-black tracking-wider uppercase ${
                  isCritical
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {isVietnamese ? "Cảnh báo vi phạm an toàn" : "Safety Violation Alert"}
              </span>
            </div>

            <span
              className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${
                isCritical
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
              }`}
            >
              {severity}
            </span>
          </div>

          <button
            type="button"
            aria-label={isVietnamese ? "Đóng thông báo" : "Close notification"}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/40 bg-muted/30 text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-600 active:scale-95"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Main Content: Title, metadata chips, snapshot thumbnail */}
        <div className="mt-2.5 flex items-start gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs sm:text-sm font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
              {title}
            </p>
            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
              {content}
            </p>

            {/* Chips: Camera & Vị trí công trường */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {displayCamera && (
                <span className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-muted/20 px-2 py-0.5 text-[10px] font-mono text-foreground shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
                  <Camera className="size-3 text-rose-500" />
                  <span>{displayCamera}</span>
                </span>
              )}
              {displaySite && (
                <span className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-muted/20 px-2 py-0.5 text-[10px] text-muted-foreground shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
                  <MapPin className="size-3 text-primary" />
                  <span className="max-w-[140px] truncate">{displaySite}</span>
                </span>
              )}
            </div>
          </div>

          {/* Thumbnail ảnh bằng chứng vi phạm kèm nút zoom xem nhanh */}
          {resolvedEvidenceUrl && !imgError && (
            <div
              title={isVietnamese ? "Bấm để phóng to ảnh vi phạm" : "Click to enlarge"}
              onClick={(e) => {
                e.stopPropagation();
                setShowLightbox(true);
              }}
              className="group/thumb relative size-16 sm:size-18 shrink-0 overflow-hidden rounded-xl border border-rose-500/40 bg-muted/50 shadow-[inset_1px_1px_3px_var(--shadow-dark)] cursor-zoom-in transition-transform hover:scale-105"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolvedEvidenceUrl}
                alt="Bằng chứng vi phạm"
                onError={() => setImgError(true)}
                className="size-full object-cover transition-transform duration-300 group-hover/thumb:scale-110"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                <Maximize2 className="size-4 text-white drop-shadow" />
              </div>
            </div>
          )}
        </div>

        {/* Footer bar: Nút mở đối chiếu bằng chứng & Nút mở chi tiết sự cố */}
        <div className="mt-3 flex items-center justify-between border-t border-border/20 pt-2.5">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
            <Clock className="size-3" />
            <span>{isVietnamese ? "Vừa phát hiện" : "Just now"}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Nút 1: Đối chiếu bằng chứng (Quick Link tới Evidence Comparator) */}
            <button
              type="button"
              onClick={handleOpenCompareClick}
              className="inline-flex items-center gap-1 rounded-xl border border-border/50 bg-muted/30 px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted/70 hover:border-primary/40 active:scale-95 transition-all shadow-sm"
              title={isVietnamese ? "Mở màn hình đối chiếu bằng chứng" : "Compare evidence frames"}
            >
              <Layers className="size-3.5 text-primary" />
              <span>{isVietnamese ? "Đối chiếu" : "Compare"}</span>
            </button>

            {/* Nút 2: Xem chi tiết sự cố */}
            <button
              type="button"
              onClick={handleOpenDetailClick}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-bold transition-all active:scale-95 ${
                isCritical
                  ? "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] hover:bg-rose-500/20"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] hover:bg-amber-500/20"
              }`}
            >
              <span>{isVietnamese ? "Xem sự cố" : "Details"}</span>
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>

        <style jsx>{`
          @keyframes ppeToastCountdown {
            from {
              width: 100%;
            }
            to {
              width: 0%;
            }
          }
        `}</style>
      </div>

      {/* Lightbox Preview Modal xem ảnh vi phạm nhanh ngay tại chỗ */}
      {showLightbox && resolvedEvidenceUrl && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowLightbox(false)}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex flex-col max-w-3xl w-full rounded-2xl border border-border/40 bg-background/95 p-4 shadow-2xl overflow-hidden"
          >
            {/* Header modal */}
            <div className="flex items-center justify-between pb-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-5 text-rose-500" />
                <h3 className="text-sm font-bold text-foreground">
                  {title}
                </h3>
                {displayCamera && (
                  <span className="rounded-md border border-border/40 bg-muted/40 px-2 py-0.5 text-xs font-mono">
                    {displayCamera}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowLightbox(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Body: Ảnh to */}
            <div className="my-4 flex items-center justify-center max-h-[70vh] overflow-hidden rounded-xl bg-black/40 border border-border/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolvedEvidenceUrl}
                alt="Bằng chứng vi phạm"
                className="max-h-[65vh] w-auto object-contain rounded-lg"
              />
            </div>

            {/* Footer modal */}
            <div className="flex items-center justify-between pt-2 border-t border-border/30 text-xs">
              <div className="text-muted-foreground">
                {displaySite && <span>Vị trí: <strong>{displaySite}</strong></span>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    setShowLightbox(false);
                    handleOpenCompareClick(e);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border/40 bg-muted/40 px-3 py-1.5 font-medium text-foreground hover:bg-muted transition-all"
                >
                  <Layers className="size-4 text-primary" />
                  <span>{isVietnamese ? "Mở màn hình đối chiếu" : "Open Comparator"}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    setShowLightbox(false);
                    handleOpenDetailClick(e);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 font-bold text-primary-foreground hover:bg-primary/90 transition-all"
                >
                  <span>{isVietnamese ? "Chi tiết hồ sơ sự cố" : "View Incident Dossier"}</span>
                  <ExternalLink className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
