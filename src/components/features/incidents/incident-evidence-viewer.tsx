"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Download,
  Eye,
  EyeOff,
  Maximize2,
  ShieldAlert,
  ShieldCheck,
  Layers,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  Columns,
  ArrowLeftRight,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { EVIDENCE_TYPE, type BoundingBox, type EvidenceItem, type EvidenceType } from "@/types";
import { resolveEvidenceUrl } from "@/lib/evidence-url";

export interface IncidentEvidenceViewerProps {
  evidence?: EvidenceItem | null;
  evidences?: EvidenceItem[];
  snapshotUrl?: string;
  violationType: string;
  confidence?: number;
  cameraId?: string;
  incidentId?: string;
  defaultViewMode?: "single" | "split";
}

export interface GalleryPhoto {
  id: string;
  title: string;
  category: "annotated" | "reference" | "raw" | "wide";
  badgeLabel: string;
  badgeColor: "danger" | "success" | "info" | "default";
  url: string;
  description: string;
  isAiAnnotated: boolean;
  box?: BoundingBox;
  evidenceType?: EvidenceType | string;
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

export function IncidentEvidenceViewer({
  evidence,
  evidences = [],
  snapshotUrl,
  violationType,
  confidence = 0.96,
  cameraId = "",
  incidentId = "",
  defaultViewMode = "single",
}: IncidentEvidenceViewerProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const { getCamera } = useEntityLookup();
  const targetCamera = useMemo(() => getCamera(cameraId), [getCamera, cameraId]);
  const safeCamId = (cameraId || "").toLowerCase();

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"single" | "split">(defaultViewMode);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Lưu trạng thái tỉ lệ ảnh thực tế (ngang 16:9 hay dọc 9:16)
  const [isPortrait, setIsPortrait] = useState(false);

  const violationLabel = formatViolationLabel(violationType, isVietnamese);

  // 1. Ảnh AI BẰNG CHỨNG TÔ ĐỎ CHUẨN XÁC TỪ CAMERA
  const cameraFallbackUrl = useMemo(() => {
    // Ưu tiên ảnh chụp vi phạm thực tế từ session camera hiện hành
    if (typeof window !== "undefined") {
      if (incidentId) {
        const cachedIncidentImg = sessionStorage.getItem(`ppe_incident_evidence_${incidentId}`);
        if (cachedIncidentImg) return resolveEvidenceUrl(cachedIncidentImg);
      }
      if (safeCamId) {
        const cachedCamImg = sessionStorage.getItem(`ppe_camera_evidence_${safeCamId}`);
        if (cachedCamImg) return resolveEvidenceUrl(cachedCamImg);
      }
    }

    if (targetCamera?.snapshotUrl) return targetCamera.snapshotUrl;
    return "";
  }, [targetCamera, safeCamId, incidentId]);

  // 2. Ảnh GỐC HIỆN TRƯỜNG RAW (Không vẽ bounding box đè lên)
  const cameraRawUrl = useMemo(() => {
    if (targetCamera?.snapshotUrl) return targetCamera.snapshotUrl;
    return "";
  }, [targetCamera]);

  // 2b. Ảnh ĐỐI CHỨNG (Reference Snapshot) khôi phục từ phiên Camera vừa tạo nếu có
  const cameraRefFallbackUrl = useMemo(() => {
    if (typeof window !== "undefined") {
      if (incidentId) {
        const cachedRef = sessionStorage.getItem(`ppe_incident_ref_evidence_${incidentId}`);
        if (cachedRef) return resolveEvidenceUrl(cachedRef);
      }
      if (safeCamId) {
        const cachedCamRef = sessionStorage.getItem(`ppe_camera_ref_evidence_${safeCamId}`);
        if (cachedCamRef) return resolveEvidenceUrl(cachedCamRef);
      }
    }
    return "";
  }, [incidentId, safeCamId]);

  // 3. Chuẩn bị danh sách ảnh bằng chứng (Vi phạm SNAPSHOT + Đối chứng REFERENCE_SNAPSHOT + Ảnh gốc RAW)
  const galleryPhotos = useMemo<GalleryPhoto[]>(() => {
    const list: GalleryPhoto[] = [];

    // Kiểm tra xem snapshotUrl có phải từ nguồn ngoài hoặc MinIO/Client không
    const resolvedSnap = snapshotUrl ? resolveEvidenceUrl(snapshotUrl) : "";
    const allEvidences = evidences.length > 0 ? evidences : evidence ? [evidence] : [];

    const isReferenceEvidenceItem = (ev: EvidenceItem) => {
      const evUrlLower = (ev.url || ev.storageKey || "").toLowerCase();
      const fileNameLower = (ev.fileName || "").toLowerCase();
      return (
        ev.evidenceType === EVIDENCE_TYPE.REFERENCE_SNAPSHOT ||
        ev.evidenceType === "REFERENCE" ||
        evUrlLower.includes("reference_snapshot") ||
        evUrlLower.includes("_ref") ||
        fileNameLower.includes("reference") ||
        fileNameLower.includes("_ref")
      );
    };

    // Kiểm tra xem snapshotUrl có phải là ảnh đã có bounding box (pre-annotated) hay chưa
    const isSnapAnnotated =
      resolvedSnap.includes("-evidence") ||
      resolvedSnap.includes("evidence_") ||
      resolvedSnap.includes("_red") ||
      resolvedSnap.includes("annotated");

    // Phân loại bằng chứng số: SNAPSHOT ưu tiên (loại trừ bản ghi REFERENCE_SNAPSHOT)
    const snapshotItem =
      allEvidences.find((e) => e.evidenceType === EVIDENCE_TYPE.SNAPSHOT) ||
      allEvidences.find((e) => e.fileName?.includes("_red") || e.storageKey?.includes("_red")) ||
      allEvidences.find((e) => !isReferenceEvidenceItem(e)) ||
      allEvidences[0];

    const primaryUrl =
      (isSnapAnnotated ? resolvedSnap : null) ||
      (snapshotItem?.url ? resolveEvidenceUrl(snapshotItem.url) : "") ||
      (snapshotItem?.storageKey ? resolveEvidenceUrl(snapshotItem.storageKey) : "") ||
      resolvedSnap ||
      cameraFallbackUrl;

    list.push({
      id: snapshotItem?.id || allEvidences[0]?.id || "photo-annotated",
      title: isVietnamese ? "Ảnh Vi Phạm PPE (Tô Đỏ Vi Phạm)" : "PPE Violation Snapshot (Red Highlight)",
      category: "annotated",
      badgeLabel: isVietnamese ? "TÔ ĐỎ VI PHẠM (AI)" : "VIOLATION (AI)",
      badgeColor: "danger",
      url: primaryUrl,
      description: isVietnamese
        ? `Ảnh chụp vi phạm ${violationLabel} từ camera giám sát đã được hệ thống AI YOLOv11 phát hiện và khoanh vùng đỏ với độ tin cậy ${(confidence * 100).toFixed(0)}%.`
        : `Surveillance camera violation snapshot: ${violationLabel} detected and highlighted by YOLOv11 AI (${(confidence * 100).toFixed(0)}% confidence).`,
      isAiAnnotated: true,
      evidenceType: EVIDENCE_TYPE.SNAPSHOT,
    });

    // 2. Bổ sung Ảnh Đối Chứng Hợp Lệ (REFERENCE_SNAPSHOT từ Backend hoặc sessionStorage)
    const refEvidenceItem = allEvidences.find((e) => isReferenceEvidenceItem(e));
    const resolvedRefUrl =
      (refEvidenceItem?.url ? resolveEvidenceUrl(refEvidenceItem.url) : "") ||
      (refEvidenceItem?.storageKey ? resolveEvidenceUrl(refEvidenceItem.storageKey) : "") ||
      cameraRefFallbackUrl;

    if (resolvedRefUrl && resolvedRefUrl !== primaryUrl) {
      list.push({
        id: refEvidenceItem?.id || "photo-reference",
        title: isVietnamese ? "Ảnh Đối Chứng Hợp Lệ" : "Reference Snapshot",
        category: "reference",
        badgeLabel: isVietnamese ? "ĐỐI CHỨNG" : "REFERENCE",
        badgeColor: "success",
        url: resolvedRefUrl,
        description: isVietnamese
          ? "Ảnh đối chứng thời điểm công nhân tuân thủ bảo hộ hoặc lúc mới bước vào vùng camera (T=0s)."
          : "Reference baseline snapshot when worker was compliant or at T=0s.",
        isAiAnnotated: false,
        evidenceType: EVIDENCE_TYPE.REFERENCE_SNAPSHOT,
      });
    }

    // 3. Bổ sung ảnh hiện trường gốc RAW (không vẽ bounding box) để phục vụ đối chiếu dự phòng
    if (cameraRawUrl && cameraRawUrl !== primaryUrl && cameraRawUrl !== resolvedRefUrl) {
      list.push({
        id: "photo-raw",
        title: isVietnamese ? "Ảnh Hiện Trường Gốc (Raw)" : "Raw Scene Photo",
        category: "raw",
        badgeLabel: isVietnamese ? "ẢNH GỐC" : "RAW FRAME",
        badgeColor: "default",
        url: cameraRawUrl,
        description: isVietnamese
          ? "Ảnh chụp khung hình gốc từ camera an ninh trước khi hệ thống AI xử lý lớp nhận diện và bám vết."
          : "Original unannotated camera frame prior to AI bounding box processing.",
        isAiAnnotated: false,
        evidenceType: "RAW_FRAME",
      });
    }

    // 4. Bổ sung các ảnh bằng chứng khác trong hồ sơ nếu có
    for (const ev of allEvidences) {
      const evUrl = ev.url ? resolveEvidenceUrl(ev.url) : ev.storageKey ? resolveEvidenceUrl(ev.storageKey) : "";
      if (
        evUrl &&
        evUrl !== primaryUrl &&
        evUrl !== resolvedRefUrl &&
        evUrl !== cameraRawUrl &&
        !list.some((item) => item.url === evUrl)
      ) {
        const isRef = isReferenceEvidenceItem(ev);
        list.push({
          id: ev.id,
          title: isRef
            ? isVietnamese ? "Ảnh Đối Chứng Hợp Lệ" : "Reference Snapshot"
            : isVietnamese ? "Ảnh Bằng Chứng Bổ Sung" : "Additional Evidence",
          category: isRef ? "reference" : "annotated",
          badgeLabel: isRef
            ? isVietnamese ? "ĐỐI CHỨNG" : "REFERENCE"
            : isVietnamese ? "BỔ SUNG" : "ADDITIONAL",
          badgeColor: isRef ? "success" : "info",
          url: evUrl,
          description: isRef
            ? isVietnamese ? "Ảnh đối chứng thời điểm công nhân tuân thủ bảo hộ hoặc lúc mới bước vào vùng camera." : "Reference baseline."
            : isVietnamese ? "Ảnh bằng chứng bổ sung từ hệ thống." : "Additional evidence photo.",
          isAiAnnotated: !isRef,
          evidenceType: ev.evidenceType,
        });
      }
    }

    return list;
  }, [
    snapshotUrl,
    evidences,
    evidence,
    cameraFallbackUrl,
    cameraRefFallbackUrl,
    cameraRawUrl,
    isVietnamese,
    violationLabel,
    confidence,
  ]);

  const activePhoto = galleryPhotos[selectedIndex] || galleryPhotos[0];

  // Hai ảnh chính dùng cho Chế độ So Sánh Song Song 2 Cột
  const violationPhoto = useMemo(
    () => galleryPhotos.find((p) => p.category === "annotated") || galleryPhotos[0],
    [galleryPhotos],
  );
  const referencePhoto = useMemo(
    () =>
      galleryPhotos.find((p) => p.category === "reference") ||
      galleryPhotos.find((p) => p.category === "raw") ||
      galleryPhotos[1],
    [galleryPhotos],
  );
  const canCompare = Boolean(
    galleryPhotos.length >= 2 &&
      violationPhoto &&
      referencePhoto &&
      violationPhoto.url !== referencePhoto.url,
  );

  useEffect(() => {
    if (defaultViewMode === "split" && canCompare) {
      setViewMode("split");
    }
  }, [defaultViewMode, canCompare]);

  // Kiểm tra xem ảnh hiện tại đang xem đã có bounding box nướng sẵn từ YOLOv11 hay chưa
  const isPreAnnotated = useMemo(() => {
    const url = (activePhoto?.url || "").toLowerCase();
    const title = (activePhoto?.title || "").toLowerCase();
    return (
      url.includes("-evidence") ||
      url.includes("evidence_") ||
      url.includes("_red") ||
      url.includes("annotated") ||
      url.includes("ai_violation") ||
      url.includes("/api/jobs/live/evidence/") ||
      url.includes("_ref") ||
      url.startsWith("data:image/") ||
      title.includes("tô đỏ") ||
      title.includes("annotated") ||
      activePhoto?.category === "reference"
    );
  }, [activePhoto?.url, activePhoto?.title, activePhoto?.category]);

  // Xử lý chuyển đổi qua lại giữa các tab ảnh
  const handleSelectPhoto = (idx: number) => {
    setSelectedIndex(idx);
    setViewMode("single");
    const photo = galleryPhotos[idx];
    if (photo) {
      if (photo.category === "annotated") {
        setShowBoundingBoxes(true);
      } else {
        setShowBoundingBoxes(false);
      }
    }
  };

  // Nút BẬT/TẮT Khung Tô Đỏ: Toggle hiển thị bounding box SVG HUD overlay
  const handleToggleBoundingBoxes = () => {
    setShowBoundingBoxes((v) => !v);
  };

  // 4. Tìm tọa độ Bounding box thực tế từ sessionStorage hoặc metadata AI
  const realBox = useMemo<BoundingBox | null>(() => {
    // 1. Kiểm tra sessionStorage nếu có box lưu từ Camera Intelligence
    if (typeof window !== "undefined" && incidentId) {
      try {
        const stored = sessionStorage.getItem(`ppe_incident_box_${incidentId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed.x === "number") {
            return {
              x: parsed.x,
              y: parsed.y,
              width: parsed.width,
              height: parsed.height,
              label: parsed.label || violationLabel,
              confidence: parsed.confidence || confidence,
            };
          }
        }
      } catch {}
    }

    // 2. Kiểm tra metadata AI Detections từ evidence object hoặc danh sách evidences
    const targetEvidence =
      evidence ||
      evidences?.find((e) => (e.metadata as any)?.aiDetections?.violations?.[0]?.box) ||
      evidences?.find((e) => (e.metadata as any)?.aiDetections?.box) ||
      evidences?.[0];

    const meta = targetEvidence?.metadata?.aiDetections as any;
    const metaBox =
      meta?.box ||
      meta?.violation?.box ||
      (Array.isArray(meta?.violations) && meta.violations[0]?.box) ||
      (Array.isArray(meta?.persons) && meta.persons[0]?.violations?.[0]?.box) ||
      null;

    if (metaBox && typeof metaBox.x === "number") {
      return {
        x: metaBox.x <= 1 ? metaBox.x * 100 : metaBox.x,
        y: metaBox.y <= 1 ? metaBox.y * 100 : metaBox.y,
        width: metaBox.width <= 1 ? metaBox.width * 100 : metaBox.width,
        height: metaBox.height <= 1 ? metaBox.height * 100 : metaBox.height,
        label: metaBox.label || violationLabel,
        confidence: metaBox.confidence || confidence,
      };
    }
    return null;
  }, [evidence, evidences, incidentId, violationLabel, confidence]);

  // 5. Tọa độ Bounding Box thực tế từ metadata AI Detections (hoàn toàn không dùng tọa độ giả lập)
  const activeViolationBox: BoundingBox | null = useMemo(() => {
    return realBox;
  }, [realBox]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (naturalWidth && naturalHeight) {
      setIsPortrait(naturalHeight > naturalWidth);
    }
  };

  // Lớp phủ Bounding Box AI HUD Công nghệ cao & Đẳng cấp cho bằng chứng vi phạm
  const renderAiInspectionBoundingBox = (isCompact = false) => {
    if (!activeViolationBox) return null;
    const bx = activeViolationBox.x;
    const by = activeViolationBox.y;
    const bw = activeViolationBox.width;
    const bh = activeViolationBox.height;

    // Chiều dài L-bracket thước ngắm 4 góc theo % khung hình
    const cornerX = Math.min(bw * 0.25, 4.5);
    const cornerY = Math.min(bh * 0.25, 4.5);

    // Tính toán vị trí nhãn để không bao giờ bị cắt ngoài mép trên hoặc tràn mép phải
    const isNearTop = by < 8;
    const badgeTop = isNearTop ? `calc(${by}% + 6px)` : `calc(${by}% - 32px)`;
    const badgeLeft = `${Math.max(1, Math.min(65, bx))}%`;

    return (
      <>
        {/* Lớp SVG đồ họa HUD Bounding Box */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full pointer-events-none z-20"
        >
          <defs>
            <filter id="incident-hud-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="0.8" floodColor="#f43f5e" floodOpacity="0.9" />
            </filter>
            <linearGradient id="incident-box-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* 1. Thân Bounding Box gradient tinh tế */}
          <rect
            x={`${bx}%`}
            y={`${by}%`}
            width={`${bw}%`}
            height={`${bh}%`}
            fill="url(#incident-box-grad)"
            stroke="#f43f5e"
            strokeWidth="0.4"
            strokeOpacity="0.6"
            strokeDasharray="2 1.5"
            rx="0.6"
          />

          {/* 2. Thước ngắm HUD 4 góc (L-Brackets) phát sáng Neon sắc nét */}
          <g filter="url(#incident-hud-glow)">
            {/* Góc trên - trái */}
            <path
              d={`M ${bx} ${by + cornerY} L ${bx} ${by} L ${bx + cornerX} ${by}`}
              fill="none"
              stroke="#f43f5e"
              strokeWidth="0.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Góc trên - phải */}
            <path
              d={`M ${bx + bw - cornerX} ${by} L ${bx + bw} ${by} L ${bx + bw} ${by + cornerY}`}
              fill="none"
              stroke="#f43f5e"
              strokeWidth="0.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Góc dưới - trái */}
            <path
              d={`M ${bx} ${by + bh - cornerY} L ${bx} ${by + bh} L ${bx + cornerX} ${by + bh}`}
              fill="none"
              stroke="#f43f5e"
              strokeWidth="0.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Góc dưới - phải */}
            <path
              d={`M ${bx + bw - cornerX} ${by + bh} L ${bx + bw} ${by + bh} L ${bx + bw} ${by + bh - cornerY}`}
              fill="none"
              stroke="#f43f5e"
              strokeWidth="0.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>

          {/* 3. Tia quét Laser AI & Hồng tâm định vị vi phạm */}
          <line
            x1={`${bx + 0.5}%`}
            y1={`${by + bh * 0.28}%`}
            x2={`${bx + bw - 0.5}%`}
            y2={`${by + bh * 0.28}%`}
            stroke="#f43f5e"
            strokeWidth="0.35"
            strokeDasharray="1.2 1"
            opacity="0.8"
            className="animate-pulse"
          />
          <g opacity="0.65">
            <line
              x1={`${bx + bw / 2 - 1.2}%`}
              y1={`${by + bh / 2}%`}
              x2={`${bx + bw / 2 + 1.2}%`}
              y2={`${by + bh / 2}%`}
              stroke="#f43f5e"
              strokeWidth="0.3"
            />
            <line
              x1={`${bx + bw / 2}%`}
              y1={`${by + bh / 2 - 1.2}%`}
              x2={`${bx + bw / 2}%`}
              y2={`${by + bh / 2 + 1.2}%`}
              stroke="#f43f5e"
              strokeWidth="0.3"
            />
          </g>
        </svg>

        {/* 4. Thẻ nhãn AI HUD thông minh (Glassmorphic Cyber Card) */}
        <div
          style={{
            left: badgeLeft,
            top: badgeTop,
          }}
          className={`absolute z-30 flex items-center gap-1.5 sm:gap-2 rounded-lg border border-rose-500/80 bg-neutral-950/92 ${
            isCompact ? "px-2 py-0.5" : "px-2.5 py-1"
          } text-white shadow-[0_0_16px_rgba(244,63,94,0.45)] backdrop-blur-md pointer-events-none select-none transition-all`}
        >
          {/* Đèn LED radar nhấp nháy phát hiện mục tiêu */}
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
          </span>

          {/* Nhãn vi phạm chính */}
          <span className="font-mono text-[10px] sm:text-[11px] font-extrabold tracking-wide text-rose-200">
            {violationLabel.toUpperCase()}
          </span>

          {/* Chip độ tin cậy AI (%) */}
          <span className="rounded bg-rose-500/20 px-1.5 py-0.5 font-mono text-[9px] sm:text-[10px] font-bold text-rose-300 border border-rose-500/30">
            {Math.round((confidence || 0.96) * 100)}%
          </span>
        </div>
      </>
    );
  };

  return (
    <div className="space-y-4">
      {/* ── THANH ĐIỀU HƯỚNG TABS NHANH GIỮA CÁC ẢNH BẰNG CHỨNG ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/30 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {galleryPhotos.map((photo, idx) => {
            const isSelected = idx === selectedIndex && viewMode === "single";
            return (
              <button
                key={photo.id}
                type="button"
                onClick={() => handleSelectPhoto(idx)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  isSelected
                    ? photo.category === "annotated"
                      ? "bg-rose-500 text-white shadow-[0_2px_10px_rgba(244,63,94,0.35)]"
                      : photo.category === "reference"
                      ? "bg-emerald-600 text-white shadow-[0_2px_10px_rgba(16,185,129,0.35)]"
                      : "bg-primary text-primary-foreground shadow-[0_2px_10px_rgba(var(--primary-rgb),0.25)]"
                    : "border border-border/40 bg-surface text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
                }`}
              >
                {photo.category === "annotated" ? (
                  <span className="flex size-2 rounded-full bg-rose-200 animate-pulse" />
                ) : photo.category === "reference" ? (
                  <ShieldCheck className="size-3.5 text-emerald-200" />
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

        {/* Nút thao tác: So Sánh 2 Cột, Bật/tắt khung AI tô đỏ & Phóng to */}
        <div className="flex items-center gap-1.5">
          {canCompare && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode((m) => (m === "split" ? "single" : "split"))}
              className={`h-8 gap-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === "split"
                  ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-elevated"
              }`}
              title={
                viewMode === "split"
                  ? isVietnamese
                    ? "Đóng chế độ so sánh 2 cột"
                    : "Exit Side-by-Side Comparison"
                  : isVietnamese
                  ? "Mở chế độ so sánh 2 cột: Đối chứng vs Vi phạm"
                  : "Open Side-by-Side Comparison"
              }
            >
              <Columns className="size-3.5 text-emerald-500" />
              <span>
                {viewMode === "split"
                  ? isVietnamese
                    ? "Đóng So Sánh"
                    : "Close Compare"
                  : isVietnamese
                  ? "So Sánh 2 Cột"
                  : "Compare (2 Cols)"}
              </span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleBoundingBoxes}
            className={`h-8 gap-1.5 rounded-xl text-xs font-medium transition-all ${
              showBoundingBoxes
                ? "border-rose-500/50 bg-rose-500/15 text-rose-500 font-semibold hover:bg-rose-500/25 shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-elevated"
            }`}
            title={
              showBoundingBoxes
                ? isVietnamese
                  ? "Bấm để ẩn khung AI tô đỏ (chuyển sang ảnh gốc)"
                  : "Hide AI Bounding Box (Switch to raw frame)"
                : isVietnamese
                ? "Bấm để hiện khung AI tô đỏ"
                : "Show AI Bounding Box"
            }
          >
            {showBoundingBoxes ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
            <span>
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

      {/* ── NỘI DUNG CHÍNH: CHẾ ĐỘ SO SÁNH 2 CỘT HOẶC XEM ĐƠN LẺ ── */}
      {viewMode === "split" ? (
        /* ── CHẾ ĐỘ SO SÁNH SONG SONG 2 CỘT (SIDE-BY-SIDE COMPARISON: ĐỐI CHỨNG VS VI PHẠM) ── */
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CỘT 1: ẢNH ĐỐI CHỨNG BAN ĐẦU (BEFORE / COMPLIANT / T=0s) */}
            <div className="overflow-hidden rounded-2xl border-2 border-emerald-500/40 bg-neutral-950 flex flex-col shadow-md">
              <div className="flex items-center justify-between border-b border-emerald-500/30 bg-emerald-950/40 px-3.5 py-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 rounded-lg border border-emerald-400/50 bg-emerald-600 px-2.5 py-0.5 font-mono text-[11px] font-bold text-white shadow-sm">
                    <ShieldCheck className="size-3.5" />
                    <span>{isVietnamese ? "1. ẢNH ĐỐI CHỨNG" : "1. REFERENCE"}</span>
                  </span>
                  <span className="text-xs font-semibold text-emerald-300">
                    {isVietnamese ? "Trạng thái hợp lệ (Before / T=0s)" : "Compliant / Baseline"}
                  </span>
                </div>
              </div>

              <div className="relative aspect-video w-full overflow-hidden bg-neutral-950 flex items-center justify-center group select-none">
                <div
                  className="absolute inset-0 bg-cover bg-center blur-xl opacity-25 scale-110 pointer-events-none"
                  style={{ backgroundImage: `url(${referencePhoto?.url})` }}
                  aria-hidden="true"
                />
                <div className="absolute inset-0 bg-black/30 pointer-events-none" aria-hidden="true" />
                <img
                  src={referencePhoto?.url}
                  alt={referencePhoto?.title || "Ảnh Đối Chứng"}
                  className="relative z-10 max-h-full max-w-full object-contain select-none"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src.includes("maxresdefault.jpg")) {
                      target.src = target.src.replace("maxresdefault.jpg", "hqdefault.jpg");
                    }
                  }}
                />
              </div>

              <div className="p-3 text-xs bg-surface/50 border-t border-border/30 text-muted-foreground">
                <p className="line-clamp-2">
                  <span className="font-semibold text-emerald-500">
                    {isVietnamese ? "Mục đích đối chứng: " : "Reference Purpose: "}
                  </span>
                  {referencePhoto?.description ||
                    (isVietnamese
                      ? "Ghi nhận trạng thái công nhân tuân thủ bảo hộ hoặc thời điểm mới bước vào khu vực để đối chứng."
                      : "Baseline compliant snapshot of worker.")}
                </p>
              </div>
            </div>

            {/* CỘT 2: ẢNH VI PHẠM (AFTER / CONFIRMED VIOLATION) */}
            <div className="overflow-hidden rounded-2xl border-2 border-rose-500/50 bg-neutral-950 flex flex-col shadow-md">
              <div className="flex items-center justify-between border-b border-rose-500/30 bg-rose-950/40 px-3.5 py-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 rounded-lg border border-rose-400/50 bg-rose-600 px-2.5 py-0.5 font-mono text-[11px] font-bold text-white shadow-sm">
                    <ShieldAlert className="size-3.5" />
                    <span>{isVietnamese ? "2. ẢNH VI PHẠM" : "2. VIOLATION"}</span>
                  </span>
                  <span className="text-xs font-semibold text-rose-300">
                    {violationLabel} (T=2s)
                  </span>
                </div>
                <span className="rounded bg-black/60 px-2 py-0.5 font-mono text-[10px] text-amber-300">
                  {Math.round((confidence || 0.96) * 100)}% AI
                </span>
              </div>

              <div className="relative aspect-video w-full overflow-hidden bg-neutral-950 flex items-center justify-center group select-none">
                <div
                  className="absolute inset-0 bg-cover bg-center blur-xl opacity-25 scale-110 pointer-events-none"
                  style={{ backgroundImage: `url(${violationPhoto?.url})` }}
                  aria-hidden="true"
                />
                <div className="absolute inset-0 bg-black/30 pointer-events-none" aria-hidden="true" />
                <div className="relative z-10 max-h-full max-w-full inline-flex items-center justify-center">
                  <img
                    src={violationPhoto?.url}
                    alt={violationPhoto?.title || "Ảnh Vi Phạm"}
                    className="relative z-10 max-h-full max-w-full object-contain select-none"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src.includes("maxresdefault.jpg")) {
                        target.src = target.src.replace("maxresdefault.jpg", "hqdefault.jpg");
                      }
                    }}
                  />
                  {/* Lớp SVG Bounding Box AI HUD: chỉ vẽ khi showBoundingBoxes bật, có box thực tế VÀ ảnh chưa nướng sẵn box */}
                  {showBoundingBoxes && !isPreAnnotated && activeViolationBox && renderAiInspectionBoundingBox(true)}
                </div>
              </div>

              <div className="p-3 text-xs bg-surface/50 border-t border-border/30 text-muted-foreground">
                <p className="line-clamp-2">
                  <span className="font-semibold text-rose-500">
                    {isVietnamese ? "Xác nhận vi phạm: " : "Violation Confirmation: "}
                  </span>
                  {violationPhoto?.description ||
                    (isVietnamese
                      ? "Hệ thống AI YOLOv11 xác nhận vi phạm sau 2 giây liên tục."
                      : "Confirmed violation snapshot.")}
                </p>
              </div>
            </div>
          </div>

          {/* Banner giải thích nghiệp vụ đối chiếu */}
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-900 dark:text-emerald-200">
            <ArrowLeftRight className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>
              {isVietnamese
                ? "So sánh trực quan: Bảng đối chiếu song song giữa trạng thái đối chứng ban đầu và thời điểm phát hiện vi phạm giúp Cán bộ An toàn thẩm định chính xác tính khách quan trước khi phê duyệt."
                : "Side-by-side comparison: Compare reference compliant baseline with violation confirmation for fair and accurate safety appraisal."}
            </span>
          </div>
        </div>
      ) : (
        /* ── KHUNG HIỂN THỊ CHÍNH ĐƠN LẺ (MAIN IMAGE VIEWER) ── */
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border-2 border-border/50 bg-neutral-950 flex items-center justify-center shadow-[6px_6px_20px_var(--shadow-dark),-6px_-6px_20px_var(--shadow-light)] group select-none">
          {/* Nền mờ nghệ thuật (Ambient Backdrop Blur) giúp hiển thị video dọc 9:16 mượt mà */}
          <div
            className="absolute inset-0 bg-cover bg-center blur-2xl opacity-25 scale-110 pointer-events-none transition-all duration-500"
            style={{ backgroundImage: `url(${activePhoto.url})` }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-black/40 pointer-events-none" aria-hidden="true" />

          {/* KHUNG ÔM KHÍT ẢNH THỰC TẾ (Inner Wrapper theo đúng tỉ lệ ảnh) */}
          <div className="relative z-10 max-h-full max-w-full inline-flex items-center justify-center">
            <img
              src={activePhoto.url}
              alt={activePhoto.title}
              onLoad={handleImageLoad}
              className="block max-h-[340px] sm:max-h-[420px] md:max-h-[480px] lg:max-h-[520px] w-auto max-w-full object-contain select-none transition-transform duration-300 group-hover:scale-[1.005]"
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src.includes("maxresdefault.jpg")) {
                  target.src = target.src.replace("maxresdefault.jpg", "hqdefault.jpg");
                  return;
                }
                const resolvedSnap = snapshotUrl ? resolveEvidenceUrl(snapshotUrl) : "";
                if (resolvedSnap && target.src !== resolvedSnap) {
                  target.src = resolvedSnap;
                  return;
                }
                if (cameraFallbackUrl && target.src !== cameraFallbackUrl) {
                  target.src = cameraFallbackUrl;
                  return;
                }
              }}
            />

            {/* Lớp HUD Bounding Box AI Công nghệ cao: Hiển thị khi showBoundingBoxes là TRUE, ảnh là ảnh vi phạm, có box thực tế và chưa có box nướng sẵn */}
            {showBoundingBoxes && !isPreAnnotated && activePhoto.category === "annotated" && activeViolationBox && renderAiInspectionBoundingBox(false)}
          </div>

          {/* BADGE THÔNG TIN ẢNH GÓC TRÊN BÊN TRÁI */}
          <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
            <span
              className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-bold shadow-md backdrop-blur-md ${
                activePhoto.category === "annotated"
                  ? "border border-rose-500/50 bg-rose-600/90 text-white"
                  : activePhoto.category === "reference"
                  ? "border border-emerald-500/50 bg-emerald-700/90 text-white"
                  : "border border-white/20 bg-black/70 text-slate-200"
              }`}
            >
              {activePhoto.badgeLabel}
            </span>
            {galleryPhotos.length > 1 && (
              <span className="rounded-lg border border-white/10 bg-black/60 px-2 py-1 font-mono text-[10px] text-slate-300 backdrop-blur-sm">
                {selectedIndex + 1} / {galleryPhotos.length}
              </span>
            )}
            {isPortrait && (
              <span className="hidden sm:inline-flex rounded-lg border border-primary/30 bg-black/70 px-2 py-1 font-mono text-[10px] text-primary backdrop-blur-sm">
                9:16 Dọc (Vertical Fit)
              </span>
            )}
          </div>

          {/* BADGE ĐỘ PHÂN GIẢI GÓC PHẢI */}
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
            <span className="rounded-lg border border-white/10 bg-black/60 px-2 py-1 font-mono text-[10px] text-white/90 backdrop-blur-sm">
              FHD 1080p • YOLOv11 AI
            </span>
          </div>
        </div>
      )}

      {/* ── DẢI ẢNH THU NHỎ (THUMBNAIL GALLERY STRIP - BỘ ĐA ẢNH) ── */}
      {galleryPhotos.length > 1 && (
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

          <div className={`grid gap-3 ${galleryPhotos.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
            {galleryPhotos.map((photo, idx) => {
              const isSelected = idx === selectedIndex && viewMode === "single";
              return (
                <button
                  key={`thumb-${photo.id}`}
                  type="button"
                  onClick={() => handleSelectPhoto(idx)}
                  className={`group relative aspect-video w-full overflow-hidden rounded-xl border-2 transition-all text-left bg-neutral-950 flex items-center justify-center ${
                    isSelected
                      ? photo.category === "reference"
                        ? "border-emerald-500 ring-2 ring-emerald-500/40 shadow-md scale-[1.02]"
                        : "border-rose-500 ring-2 ring-rose-500/40 shadow-md scale-[1.02]"
                      : "border-border/50 bg-surface opacity-80 hover:opacity-100 hover:border-primary/50"
                  }`}
                >
                  {/* Ambient backdrop blur cho thumbnail */}
                  <div
                    className="absolute inset-0 bg-cover bg-center blur-md opacity-25 scale-110 pointer-events-none"
                    style={{ backgroundImage: `url(${photo.url})` }}
                  />
                  <img
                    src={photo.url}
                    alt={photo.title}
                    className="relative z-10 max-h-full max-w-full object-contain"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src.includes("maxresdefault.jpg")) {
                        target.src = target.src.replace("maxresdefault.jpg", "hqdefault.jpg");
                        return;
                      }
                      if (cameraFallbackUrl && target.src !== cameraFallbackUrl) {
                        target.src = cameraFallbackUrl;
                      }
                    }}
                  />

                  {/* Overlay nhãn dưới thumbnail */}
                  <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 text-white">
                    <div className="flex items-center justify-between">
                      <p className="truncate font-semibold text-[11px] leading-tight text-white drop-shadow">
                        #{idx + 1}: {photo.badgeLabel}
                      </p>
                      {isSelected && (
                        <CheckCircle2
                          className={`size-3.5 shrink-0 ${
                            photo.category === "reference" ? "text-emerald-400" : "text-rose-400"
                          }`}
                        />
                      )}
                    </div>
                  </div>

                  {/* Icon phân biệt loại ảnh ở góc thumbnail */}
                  <div className="absolute top-1.5 left-1.5 z-20">
                    {photo.category === "annotated" ? (
                      <span className="flex size-2 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e]" />
                    ) : photo.category === "reference" ? (
                      <span className="flex size-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

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
                  {activePhoto.category === "reference" ? (
                    <ShieldCheck className="size-4 text-emerald-500" />
                  ) : activePhoto.category === "raw" ? (
                    <Camera className="size-4 text-sky-500" />
                  ) : (
                    <ShieldAlert className="size-4 text-rose-500" />
                  )}
                  <span>{activePhoto.title}</span>
                  <span
                    className={`ml-2 rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                      activePhoto.category === "reference"
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : activePhoto.category === "annotated"
                        ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                        : "bg-surface-elevated text-muted-foreground border border-border/40"
                    }`}
                  >
                    {activePhoto.badgeLabel}
                  </span>
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

            <div className="relative flex-1 mt-3 overflow-hidden rounded-xl bg-black flex items-center justify-center min-h-[380px]">
              <div
                className="absolute inset-0 bg-cover bg-center blur-2xl opacity-20 scale-110 pointer-events-none"
                style={{ backgroundImage: `url(${activePhoto.url})` }}
              />
              <div className="relative z-10 max-h-full max-w-full inline-flex items-center justify-center">
                <img
                  src={activePhoto.url}
                  alt={activePhoto.title}
                  className="block max-h-[75vh] w-auto max-w-full object-contain select-none"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src.includes("maxresdefault.jpg")) {
                      target.src = target.src.replace("maxresdefault.jpg", "hqdefault.jpg");
                      return;
                    }
                    if (cameraFallbackUrl && target.src !== cameraFallbackUrl) {
                      target.src = cameraFallbackUrl;
                    }
                  }}
                />
                {/* Lớp HUD Bounding Box AI Công nghệ cao trong Lightbox */}
                {showBoundingBoxes && !isPreAnnotated && activePhoto.category === "annotated" && renderAiInspectionBoundingBox(false)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
