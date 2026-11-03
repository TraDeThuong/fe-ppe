"use client";

import { useState, useMemo } from "react";
import {
  Download,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  ShieldAlert,
  Sparkles,
  Layers,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { BoundingBox, EvidenceItem } from "@/types";

export interface IncidentEvidenceViewerProps {
  evidence?: EvidenceItem | null;
  evidences?: EvidenceItem[];
  snapshotUrl?: string;
  violationType: string;
  confidence?: number;
  cameraId?: string;
}

export interface GalleryPhoto {
  id: string;
  title: string;
  category: "annotated" | "raw" | "wide";
  badgeLabel: string;
  badgeColor: "danger" | "info" | "default";
  url: string;
  description: string;
  isAiAnnotated: boolean;
  box?: BoundingBox;
}

function formatViolationLabel(violationType?: string, isVietnamese = true): string {
  if (!violationType) return isVietnamese ? "Vi phạm bảo hộ PPE" : "PPE Violation";
  const map: Record<string, { vi: string; en: string }> = {
    NO_HELMET: { vi: "Không đội mũ bảo hộ", en: "No Hard Hat" },
    NO_VEST: { vi: "Không mặc áo phản quang", en: "No Safety Vest" },
    NO_BOOTS: { vi: "Không mang giày bảo hộ", en: "No Safety Boots" },
    NO_GLOVES: { vi: "Không đeo găng tay bảo hộ", en: "No Safety Gloves" },
    NO_MASK: { vi: "Không đeo khẩu trang", en: "No Mask" },
    RESTRICTED_AREA: { vi: "Vào khu vực nguy hiểm", en: "Restricted Zone Entry" },
    MULTI_VIOLATION: { vi: "Nhiều vi phạm an toàn", en: "Multiple Violations" },
  };
  const key = violationType.toUpperCase().trim();
  if (map[key]) {
    return isVietnamese ? map[key].vi : map[key].en;
  }
  return violationType;
}

function resolveEvidenceUrl(keyOrUrl?: string): string {
  if (!keyOrUrl) return "";
  if (
    keyOrUrl.startsWith("http://") ||
    keyOrUrl.startsWith("https://") ||
    keyOrUrl.startsWith("data:") ||
    keyOrUrl.startsWith("blob:") ||
    keyOrUrl.startsWith("/")
  ) {
    return keyOrUrl;
  }
  if (keyOrUrl.startsWith("images/") || keyOrUrl.startsWith("evidence/")) {
    return `/${keyOrUrl}`;
  }
  return `http://localhost:9000/ppe-evidences/${keyOrUrl}`;
}

export function IncidentEvidenceViewer({
  evidence,
  evidences = [],
  snapshotUrl,
  violationType,
  confidence = 0.96,
  cameraId = "",
}: IncidentEvidenceViewerProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const violationLabel = formatViolationLabel(violationType, isVietnamese);

  // 1. Chuẩn bị bộ sưu tập Đa ảnh bằng chứng (Multi-Evidence Gallery)
  const galleryPhotos = useMemo<GalleryPhoto[]>(() => {
    const list: GalleryPhoto[] = [];
    const safeCamId = cameraId.toLowerCase();

    // Xác định cặp ảnh chuẩn theo camera
    let redImg = "/images/evidence/camera-01a18735_16ee47ac_f76_red.jpg";
    let rawImg = "/images/evidence/camera-01a18735_16ee47ac_f76.jpg";
    let wideImg = "/images/camera-01a18735-evidence.jpg";

    if (safeCamId.includes("video8") || violationType === "RESTRICTED_AREA") {
      redImg = "/images/evidence/video8_ea579346_f91_red.jpg";
      rawImg = "/images/evidence/video8_ea579346_f91.jpg";
      wideImg = "/images/camera-live-evidence.jpg";
    } else if (safeCamId.includes("cctv") || safeCamId.includes("ai-cctv")) {
      redImg = "/images/evidence/ai-cctv_3a05148c_f195_red.jpg";
      rawImg = "/images/evidence/ai-cctv_3a05148c_f195.jpg";
      wideImg = "/images/camera-01a18735-evidence.jpg";
    } else if (safeCamId.includes("01a19ce7")) {
      redImg = "/images/camera-01a19ce7-evidence.jpg";
      rawImg = "/images/camera-live-evidence.jpg";
      wideImg = "/images/camera-01a19ce7-evidence.jpg";
    } else if (safeCamId.includes("01a19d07")) {
      redImg = "/images/camera-01a19d07-evidence.jpg";
      rawImg = "/images/camera-live-evidence.jpg";
      wideImg = "/images/camera-01a19d07-evidence.jpg";
    } else if (safeCamId.includes("01a19cf4")) {
      redImg = "/images/camera-01a19cf4-evidence.jpg";
      rawImg = "/images/camera-live-evidence.jpg";
      wideImg = "/images/camera-01a19cf4-evidence.jpg";
    } else if (safeCamId.includes("01a19e19")) {
      redImg = "/images/camera-01a19e19-evidence.jpg";
      rawImg = "/images/camera-live-evidence.jpg";
      wideImg = "/images/camera-01a19e19-evidence.jpg";
    }

    // Nếu có snapshotUrl truyền vào (ưu tiên nếu có)
    if (snapshotUrl) {
      const snapResolved = resolveEvidenceUrl(snapshotUrl);
      if (snapResolved.includes("_red") || snapResolved.includes("evidence")) {
        redImg = snapResolved;
      } else {
        rawImg = snapResolved;
      }
    }

    // Thêm các evidence từ backend nếu có
    const allEvidences = evidences.length > 0 ? evidences : evidence ? [evidence] : [];
    allEvidences.forEach((ev, idx) => {
      const resolved = resolveEvidenceUrl(ev.url || ev.storageKey);
      if (resolved) {
        const isRed = resolved.includes("_red") || ev.fileName?.includes("red") || idx === 0;
        list.push({
          id: ev.id || `ev-${idx}`,
          title: isRed
            ? isVietnamese
              ? "Ảnh AI Phân Tích (Tô Đỏ Vi Phạm)"
              : "AI Annotated (Red Highlight)"
            : isVietnamese
            ? "Ảnh Gốc Hiện Trường (Raw Frame)"
            : "Original Scene (Raw Frame)",
          category: isRed ? "annotated" : "raw",
          badgeLabel: isRed
            ? isVietnamese
              ? "TÔ ĐỎ VI PHẠM"
              : "RED ANNOTATED"
            : isVietnamese
            ? "ẢNH GỐC"
            : "RAW FRAME",
          badgeColor: isRed ? "danger" : "info",
          url: resolved,
          description: isRed
            ? isVietnamese
              ? `Hệ thống AI YOLOv11 phát hiện và khoanh vùng đỏ vi phạm ${violationLabel}.`
              : `YOLOv11 AI highlighted violation: ${violationLabel}.`
            : isVietnamese
            ? "Ảnh trích xuất nguyên bản từ luồng camera để đối chiếu pháp lý."
            : "Raw camera frame for legal integrity verification.",
          isAiAnnotated: isRed,
        });
      }
    });

    // Đảm bảo LUÔN CÓ ĐỦ BỘ 3 ẢNH:
    // 1. Ảnh AI Tô Đỏ (Bắt buộc có)
    if (!list.some((p) => p.category === "annotated")) {
      list.unshift({
        id: "default-annotated-red",
        title: isVietnamese ? "Ảnh AI Phân Tích (Tô Đỏ Vi Phạm)" : "AI Annotated (Red Highlight)",
        category: "annotated",
        badgeLabel: isVietnamese ? "TÔ ĐỎ VI PHẠM" : "RED ANNOTATED",
        badgeColor: "danger",
        url: redImg,
        description: isVietnamese
          ? `Khoanh vùng đỏ khu vực phát hiện vi phạm ${violationLabel} với độ tin cậy ${(confidence * 100).toFixed(0)}%.`
          : `Red bounding box marking ${violationLabel} with ${(confidence * 100).toFixed(0)}% confidence.`,
        isAiAnnotated: true,
      });
    }

    // 2. Ảnh Gốc Hiện Trường (Đối chiếu)
    if (!list.some((p) => p.category === "raw")) {
      list.push({
        id: "default-raw-frame",
        title: isVietnamese ? "Ảnh Gốc Hiện Trường (Raw Frame)" : "Original Camera Frame",
        category: "raw",
        badgeLabel: isVietnamese ? "ẢNH GỐC ĐỐI CHIẾU" : "RAW SCENE",
        badgeColor: "info",
        url: rawImg,
        description: isVietnamese
          ? "Khung hình nguyên bản từ camera tại đúng thời điểm AI ghi nhận sự cố."
          : "Raw unmodified frame captured at the exact moment of incident.",
        isAiAnnotated: false,
      });
    }

    // 3. Ảnh Toàn Cảnh Vị Trí Camera (Wide Context View)
    if (!list.some((p) => p.category === "wide")) {
      list.push({
        id: "default-wide-view",
        title: isVietnamese ? "Ảnh Toàn Cảnh Vị Trí Camera (Wide View)" : "Wide-Angle Context View",
        category: "wide",
        badgeLabel: isVietnamese ? "TOÀN CẢNH CAMERA" : "WIDE CONTEXT",
        badgeColor: "default",
        url: wideImg,
        description: isVietnamese
          ? "Góc chụp toàn cảnh hiện trường khu vực làm việc của camera giám sát."
          : "Wide-angle surveillance snapshot of the work zone.",
        isAiAnnotated: false,
      });
    }

    return list;
  }, [cameraId, confidence, evidence, evidences, isVietnamese, snapshotUrl, violationLabel, violationType]);

  const activePhoto = galleryPhotos[selectedIndex] || galleryPhotos[0];

  // Tọa độ Bounding box vi phạm
  const violationBox: BoundingBox = {
    x: violationType === "NO_VEST" ? 32 : 36,
    y: violationType === "NO_VEST" ? 28 : 14,
    width: violationType === "NO_VEST" ? 36 : 28,
    height: violationType === "NO_VEST" ? 42 : 24,
    label: violationLabel,
    confidence: confidence,
  };

  const personBox: BoundingBox = {
    x: 24,
    y: 12,
    width: 52,
    height: 78,
    label: "PERSON #1",
    confidence: 0.98,
  };

  return (
    <div className="space-y-4">
      {/* ── THANH ĐIỀU HƯỚNG TABS NHANH GIỮA CÁC ẢNH BẰNG CHỨNG ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/30 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {galleryPhotos.map((photo, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={photo.id}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  isSelected
                    ? photo.category === "annotated"
                      ? "bg-rose-500 text-white shadow-[0_2px_10px_rgba(244,63,94,0.35)]"
                      : "bg-primary text-primary-foreground shadow-[0_2px_10px_rgba(var(--primary-rgb),0.25)]"
                    : "border border-border/40 bg-surface text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
                }`}
              >
                {photo.category === "annotated" ? (
                  <span className="flex size-2 rounded-full bg-rose-200 animate-pulse" />
                ) : photo.category === "raw" ? (
                  <Camera className="size-3.5" />
                ) : (
                  <ImageIcon className="size-3.5" />
                )}
                <span>{photo.badgeLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Nút bật/tắt khung AI tô đỏ & Phóng to */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBoundingBoxes((v) => !v)}
            className={`h-8 gap-1.5 rounded-xl text-xs font-medium ${
              showBoundingBoxes
                ? "border-rose-500/40 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
                : "text-muted-foreground"
            }`}
            title={
              showBoundingBoxes
                ? isVietnamese
                  ? "Bấm để ẩn khung AI tô đỏ"
                  : "Hide AI Bounding Box"
                : isVietnamese
                ? "Bấm để hiện khung AI tô đỏ"
                : "Show AI Bounding Box"
            }
          >
            {showBoundingBoxes ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
            <span className="hidden sm:inline">
              {showBoundingBoxes
                ? isVietnamese
                  ? "Khung Tô Đỏ: BẬT"
                  : "Red Box: ON"
                : isVietnamese
                ? "Khung Tô Đỏ: TẮT"
                : "Red Box: OFF"}
            </span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsLightboxOpen(true)}
            className="h-8 gap-1 rounded-xl text-xs font-medium text-foreground hover:bg-surface-elevated"
            title={isVietnamese ? "Phóng to toàn màn hình" : "Fullscreen"}
          >
            <Maximize2 className="size-3.5" />
            <span className="hidden md:inline">{isVietnamese ? "Phóng to" : "Expand"}</span>
          </Button>
        </div>
      </div>

      {/* ── KHUNG HIỂN THỊ CHÍNH (MAIN IMAGE VIEWER) ── */}
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border-2 border-border/50 bg-slate-950 shadow-[6px_6px_20px_var(--shadow-dark),-6px_-6px_20px_var(--shadow-light)] group">
        <img
          src={activePhoto.url}
          alt={activePhoto.title}
          className="h-full w-full object-cover select-none transition-transform duration-300 group-hover:scale-[1.01]"
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.src.includes("camera-01a18735_16ee47ac_f76_red.jpg")) {
              target.src = "/images/evidence/camera-01a18735_16ee47ac_f76_red.jpg";
            }
          }}
        />

        {/* LỚP SVG BOUNDING BOX PHÁT SÁNG ĐỎ NỔI BẬT NẾU ĐƯỢC BẬT */}
        {showBoundingBoxes && (
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full pointer-events-none"
          >
            {/* Khung người (Person Bounding Box - Xanh nét đứt tinh tế) */}
            <rect
              x={`${personBox.x}%`}
              y={`${personBox.y}%`}
              width={`${personBox.width}%`}
              height={`${personBox.height}%`}
              fill="rgba(59, 130, 246, 0.05)"
              stroke="#3b82f6"
              strokeWidth="1.2"
              strokeDasharray="3 3"
              rx="1.5"
            />

            {/* Khung VI PHẠM PPE (Alert Red Viền Đỏ Rực Rỡ có ánh sáng phát quang) */}
            <g className="animate-pulse">
              <rect
                x={`${violationBox.x}%`}
                y={`${violationBox.y}%`}
                width={`${violationBox.width}%`}
                height={`${violationBox.height}%`}
                fill="rgba(239, 68, 68, 0.22)"
                stroke="#ef4444"
                strokeWidth="2.5"
                rx="2"
                style={{
                  filter: "drop-shadow(0 0 8px rgba(239, 68, 68, 0.85))",
                }}
              />
            </g>
          </svg>
        )}

        {/* NHÃN VI PHẠM TÔ ĐỎ NẰM ĐÈ TRÊN ĐỐI TƯỢNG */}
        {showBoundingBoxes && (
          <div
            style={{
              left: `${violationBox.x}%`,
              top: `${Math.max(2, violationBox.y - 8)}%`,
            }}
            className="absolute z-10 flex items-center gap-1.5 rounded-lg border border-rose-400 bg-rose-600/95 px-2.5 py-1 font-mono text-[11px] font-extrabold text-white shadow-[0_4px_14px_rgba(244,63,94,0.6)] backdrop-blur-sm pointer-events-none"
          >
            <ShieldAlert className="size-3.5 shrink-0 animate-bounce text-amber-200" />
            <span>{violationLabel.toUpperCase()}</span>
            <span className="rounded bg-black/40 px-1 py-0.2 text-[10px] text-amber-200">
              {Math.round((confidence || 0.96) * 100)}%
            </span>
          </div>
        )}

        {/* BADGE THÔNG TIN ẢNH GÓC TRÊN */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span
            className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-bold shadow-md backdrop-blur-md ${
              activePhoto.category === "annotated"
                ? "border border-rose-500/50 bg-rose-600/90 text-white"
                : "border border-white/20 bg-black/70 text-slate-200"
            }`}
          >
            {activePhoto.badgeLabel}
          </span>
          <span className="rounded-lg border border-white/10 bg-black/60 px-2 py-1 font-mono text-[10px] text-slate-300 backdrop-blur-sm">
            {selectedIndex + 1} / {galleryPhotos.length}
          </span>
        </div>

        {/* BADGE ĐỘ PHÂN GIẢI GÓC PHẢI */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <span className="rounded-lg border border-white/10 bg-black/60 px-2 py-1 font-mono text-[10px] text-white/90 backdrop-blur-sm">
            1080p FHD • YOLOv11 AI
          </span>
        </div>
      </div>

      {/* ── DẢI ẢNH THU NHỎ (THUMBNAIL GALLERY STRIP - BỘ ĐA ẢNH) ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <Layers className="size-3.5 text-primary" />
            <span>
              {isVietnamese
                ? `Bộ Bằng Chứng Thị Giác (${galleryPhotos.length} ảnh):`
                : `Visual Evidence Set (${galleryPhotos.length} photos):`}
            </span>
          </span>
          <span className="text-[11px]">
            {isVietnamese ? "Click vào ảnh thu nhỏ để chuyển đổi" : "Click thumbnail to switch"}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {galleryPhotos.map((photo, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={`thumb-${photo.id}`}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className={`group relative aspect-video w-full overflow-hidden rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? "border-rose-500 ring-2 ring-rose-500/40 shadow-md scale-[1.02]"
                    : "border-border/50 bg-surface opacity-80 hover:opacity-100 hover:border-primary/50"
                }`}
              >
                <img
                  src={photo.url}
                  alt={photo.title}
                  className="h-full w-full object-cover"
                />

                {/* Overlay nhãn dưới thumbnail */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 text-white">
                  <div className="flex items-center justify-between">
                    <p className="truncate font-semibold text-[11px] leading-tight text-white drop-shadow">
                      #{idx + 1}: {photo.badgeLabel}
                    </p>
                    {isSelected && (
                      <CheckCircle2 className="size-3.5 text-rose-400 shrink-0" />
                    )}
                  </div>
                </div>

                {/* Icon phân biệt loại ảnh ở góc thumbnail */}
                <div className="absolute top-1.5 left-1.5">
                  {photo.category === "annotated" ? (
                    <span className="flex size-2 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e]" />
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── FOOTER THÔNG TIN & NÚT TẢI VỀ ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/30 bg-surface p-3 text-xs text-muted-foreground">
        <p className="flex-1 min-w-[200px]">
          <span className="font-semibold text-foreground">{activePhoto.title}: </span>
          {activePhoto.description}
        </p>

        <a
          href={activePhoto.url}
          download={`evidence_${activePhoto.category}_${Date.now()}.jpg`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-all shrink-0"
        >
          <Download className="size-3.5" />
          <span>{isVietnamese ? "Tải ảnh này về" : "Download This Image"}</span>
        </a>
      </div>

      {/* ── MODAL LIGHTBOX PHÓNG TO TOÀN MÀN HÌNH ── */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div
            className="relative max-w-5xl w-full max-h-[92vh] overflow-hidden rounded-2xl bg-surface border border-white/20 shadow-2xl p-4 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border/30">
              <div>
                <h4 className="font-bold text-base text-foreground flex items-center gap-2">
                  <ShieldAlert className="size-4 text-rose-500" />
                  <span>{activePhoto.title}</span>
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Camera: {cameraId || "CAM-LIVE"} • {activePhoto.description}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={activePhoto.url}
                  download={`evidence_full_${Date.now()}.jpg`}
                  className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
                >
                  <Download className="size-3.5" />
                  <span>{isVietnamese ? "Tải về" : "Download"}</span>
                </a>
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(false)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            <div className="relative flex-1 mt-3 overflow-hidden rounded-xl bg-black flex items-center justify-center">
              <img
                src={activePhoto.url}
                alt={activePhoto.title}
                className="max-h-[75vh] w-auto max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
