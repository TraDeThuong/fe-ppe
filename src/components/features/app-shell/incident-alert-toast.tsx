"use client";

import { useState } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  X,
  ArrowRight,
  Camera,
  MapPin,
  Clock,
} from "lucide-react";
import { useLocale } from "@/providers/locale-provider";

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
  detectedAt?: string;
  [key: string]: unknown;
}

export interface IncidentAlertToastProps {
  visible: boolean;
  data: IncidentAlertPayload;
  onClose: () => void;
  onOpenIncident: (incidentId: string) => void;
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
}: IncidentAlertToastProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const [imgError, setImgError] = useState(false);

  const incidentId = data.incidentId;
  const violationLabel = formatViolationLabel(data.violationType, isVietnamese);
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

  const handleClickCard = () => {
    if (incidentId) {
      onOpenIncident(incidentId);
    } else {
      onClose();
    }
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      onClick={handleClickCard}
      className={`group pointer-events-auto relative flex w-full max-w-[420px] cursor-pointer flex-col overflow-hidden rounded-2xl border-2 border-rose-500/50 bg-background/95 p-4 backdrop-blur-md transition-all duration-300 hover:border-rose-500 hover:bg-background ${
        visible
          ? "animate-in fade-in slide-in-from-top-3"
          : "animate-out fade-out slide-out-to-top-2"
      } shadow-[6px_6px_22px_var(--shadow-dark),-6px_-6px_22px_var(--shadow-light),0_0_24px_rgba(244,63,94,0.32)]`}
    >
      {/* Thanh tiến trình đếm ngược 10s */}
      <div className="absolute inset-x-0 top-0 h-1 bg-rose-500/20">
        <div
          className="h-full bg-gradient-to-r from-rose-500 to-amber-500"
          style={{
            animation: "ppeToastCountdown 10s linear forwards",
          }}
        />
      </div>

      {/* Header bar: Icon, Tiêu đề cảnh báo, Badge mức độ, Nút đóng */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex size-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-rose-500" />
          </span>

          <div className="flex items-center gap-1.5 truncate">
            <ShieldAlert className="size-4 shrink-0 text-rose-500" />
            <span className="text-xs font-black tracking-wider uppercase text-rose-600 dark:text-rose-400">
              {isVietnamese ? "Cảnh báo vi phạm an toàn" : "Safety Violation Alert"}
            </span>
          </div>

          <span className="shrink-0 rounded-md border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
            {data.severity || "CRITICAL"}
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

      {/* Main Content: Title, metadata chips, snapshot */}
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
            {(data.cameraCode || data.cameraId) && (
              <span className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-muted/20 px-2 py-0.5 text-[10px] font-mono text-foreground shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
                <Camera className="size-3 text-rose-500" />
                <span>{data.cameraCode || data.cameraId}</span>
              </span>
            )}
            {(data.siteName || data.siteId) && (
              <span className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-muted/20 px-2 py-0.5 text-[10px] text-muted-foreground shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
                <MapPin className="size-3 text-primary" />
                <span className="max-w-[140px] truncate">{data.siteName || data.siteId}</span>
              </span>
            )}
          </div>
        </div>

        {/* Thumbnail ảnh bằng chứng vi phạm nếu có */}
        {data.evidenceUrl && !imgError && (
          <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-rose-500/30 bg-muted shadow-[inset_1px_1px_3px_var(--shadow-dark)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.evidenceUrl}
              alt="Bằng chứng vi phạm"
              onError={() => setImgError(true)}
              className="size-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
          </div>
        )}
      </div>

      {/* Footer bar: Nút mở chi tiết sự cố */}
      <div className="mt-3 flex items-center justify-between border-t border-border/20 pt-2.5">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
          <Clock className="size-3" />
          <span>{isVietnamese ? "Vừa phát hiện" : "Just now"}</span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (incidentId) {
              onOpenIncident(incidentId);
            } else {
              onClose();
            }
          }}
          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] transition-all hover:bg-rose-500/20 active:shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
        >
          <span>{isVietnamese ? "Xem chi tiết sự cố" : "View Incident"}</span>
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
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
  );
}
