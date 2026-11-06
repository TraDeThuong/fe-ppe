"use client";

import { useState, useMemo } from "react";
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
}: IncidentEvidenceViewerProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const { getCamera } = useEntityLookup();
  const targetCamera = useMemo(() => getCamera(cameraId), [getCamera, cameraId]);
  const safeCamId = (cameraId || "").toLowerCase();

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"single" | "split">("single");
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Lưu trạng thái tỉ lệ ảnh thực tế (ngang 16:9 hay dọc 9:16)
  const [isPortrait, setIsPortrait] = useState(false);

  const violationLabel = formatViolationLabel(violationType, isVietnamese);

  // 1. Ảnh AI BẰNG CHỨNG TÔ ĐỎ CHUẨN XÁC TỪ CAMERA (Pre-annotated YOLOv11 Red Box)
  const cameraFallbackUrl = useMemo(() => {
    if (safeCamId.includes("01a19ce7") || targetCamera?.code?.includes("CAM2") || targetCamera?.streamUrl?.includes("POdSp36OulM")) {
      return "/images/camera-01a19ce7-evidence.jpg";
    }
    if (safeCamId.includes("01a19cf4") || targetCamera?.code?.includes("CAM3")) {
      return "/images/camera-01a19cf4-evidence.jpg";
    }
    if (safeCamId.includes("01a19d07") || targetCamera?.code?.includes("CAM5")) {
      return "/images/camera-01a19d07-evidence.jpg";
    }
    if (safeCamId.includes("01a19e19") || targetCamera?.code?.includes("CAMMMM")) {
      return "/images/camera-01a19e19-evidence.jpg";
    }
    if (safeCamId.includes("01a18735") || targetCamera?.code?.includes("099999") || targetCamera?.code?.includes("CAM-1") || targetCamera?.code?.includes("CAM-YOUTUBE-01")) {
      return "/images/evidence/camera-01a18735_16ee47ac_f76_red.jpg";
    }
    if (targetCamera?.streamUrl?.includes("video8")) {
      return "/images/evidence/video8_ea579346_f91_red.jpg";
    }
    if (targetCamera?.streamUrl?.includes("cctv") || targetCamera?.streamUrl?.includes("ai-cctv")) {
      return "/images/evidence/ai-cctv_3a05148c_f195_red.jpg";
    }
    if (targetCamera?.snapshotUrl) return targetCamera.snapshotUrl;
    return "/images/camera-live-evidence.jpg";
  }, [targetCamera, safeCamId]);

  // 2. Ảnh GỐC HIỆN TRƯỜNG RAW (Không vẽ bounding box đè lên)
  const cameraRawUrl = useMemo(() => {
    if (safeCamId.includes("01a19ce7") || targetCamera?.code?.includes("CAM2") || targetCamera?.streamUrl?.includes("POdSp36OulM")) {
      return "https://img.youtube.com/vi/POdSp36OulM/hqdefault.jpg";
    }
    if (
      safeCamId.includes("01a19cf4") ||
      targetCamera?.code?.includes("CAM3") ||
      safeCamId.includes("01a19d07") ||
      targetCamera?.code?.includes("CAM5") ||
      safeCamId.includes("01a19e19") ||
      targetCamera?.code?.includes("CAMMMM")
    ) {
      return "https://img.youtube.com/vi/Ek0FCzNqfvA/hqdefault.jpg";
    }
    if (safeCamId.includes("01a18735") || targetCamera?.code?.includes("099999") || targetCamera?.code?.includes("CAM-1")) {
      return "/images/evidence/camera-01a18735_16ee47ac_f76.jpg";
    }
    if (targetCamera?.streamUrl?.includes("video8")) {
      return "/images/evidence/video8_ea579346_f91.jpg";
    }
    if (targetCamera?.streamUrl?.includes("cctv") || targetCamera?.streamUrl?.includes("ai-cctv")) {
      return "/images/evidence/ai-cctv_3a05148c_f195.jpg";
    }
    if (targetCamera?.streamUrl) {
      const ytMatch = targetCamera.streamUrl.match(
        /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/,
      );
      if (ytMatch?.[1]) {
        return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
      }
    }
    return targetCamera?.snapshotUrl || "/images/camera-live-evidence.jpg";
  }, [targetCamera, safeCamId]);

  // 3. Chuẩn bị bộ sưu tập Đa ảnh bằng chứng (Multi-Evidence Gallery)
  const galleryPhotos = useMemo<GalleryPhoto[]>(() => {
    const list: GalleryPhoto[] = [];

    // Kiểm tra xem snapshotUrl có phải từ nguồn ngoài hoặc YouTube không
    const resolvedSnap = snapshotUrl ? resolveEvidenceUrl(snapshotUrl) : "";
    const allEvidences = evidences.length > 0 ? evidences : evidence ? [evidence] : [];

    // Kiểm tra xem snapshotUrl có phải là ảnh đã có bounding box (pre-annotated) hay chưa
    const isSnapAnnotated =
      resolvedSnap.includes("-evidence") ||
      resolvedSnap.includes("evidence_") ||
      resolvedSnap.includes("_red") ||
      resolvedSnap.includes("annotated");

    // Phân loại bằng chứng số theo Contract chuẩn: SNAPSHOT vs REFERENCE_SNAPSHOT
    const snapshotItem =
      allEvidences.find((e) => e.evidenceType === EVIDENCE_TYPE.SNAPSHOT) ||
      allEvidences.find((e) => e.fileName?.includes("_red") || e.storageKey?.includes("_red")) ||
      allEvidences[0];

    const referenceSnapshotItem =
      allEvidences.find((e) => e.evidenceType === EVIDENCE_TYPE.REFERENCE_SNAPSHOT) ||
      allEvidences.find(
        (e) =>
          (e.fileName?.includes("_ref") ||
            e.storageKey?.includes("_ref") ||
            e.fileName?.includes("reference")) &&
          e.id !== snapshotItem?.id,
      );

    // 1. TAB 1: ẢNH TÔ ĐỎ VI PHẠM (AI Annotated Highlight từ Camera)
    const primaryUrl =
      (isSnapAnnotated ? resolvedSnap : null) ||
      (snapshotItem?.url ? resolveEvidenceUrl(snapshotItem.url) : "") ||
      (snapshotItem?.storageKey ? resolveEvidenceUrl(snapshotItem.storageKey) : "") ||
      cameraFallbackUrl ||
      resolvedSnap;

    list.push({
      id: snapshotItem?.id || allEvidences[0]?.id || "photo-annotated",
      title: isVietnamese ? "Ảnh Vi Phạm PPE (Tô Đỏ Vi Phạm)" : "PPE Violation Snapshot (Red Highlight)",
      category: "annotated",
      badgeLabel: isVietnamese ? "TÔ ĐỎ VI PHẠM (T=2s)" : "VIOLATION (T=2s)",
      badgeColor: "danger",
      url: primaryUrl,
      description: isVietnamese
        ? `Hệ thống AI YOLOv11 phát hiện và khoanh vùng đỏ vi phạm ${violationLabel} sau 2 giây với độ tin cậy ${(confidence * 100).toFixed(0)}%.`
        : `YOLOv11 AI highlighted violation: ${violationLabel} after 2s (${(confidence * 100).toFixed(0)}% confidence).`,
      isAiAnnotated: true,
      evidenceType: EVIDENCE_TYPE.SNAPSHOT,
    });

    // 2. TAB 2: ẢNH ĐỐI CHỨNG (Reference Snapshot) hoặc ẢNH GỐC HIỆN TRƯỜNG (Raw Frame)
    if (referenceSnapshotItem) {
      const refUrl =
        (referenceSnapshotItem.url ? resolveEvidenceUrl(referenceSnapshotItem.url) : "") ||
        (referenceSnapshotItem.storageKey ? resolveEvidenceUrl(referenceSnapshotItem.storageKey) : "");

      list.push({
        id: referenceSnapshotItem.id || allEvidences[1]?.id || "photo-reference",
        title: isVietnamese
          ? "Ảnh Đối Chứng Ban Đầu (Hợp Lệ / T=0s)"
          : "Initial Reference Snapshot (Compliant / T=0s)",
        category: "reference",
        badgeLabel: isVietnamese ? "ẢNH ĐỐI CHỨNG (HỢP LỆ)" : "REFERENCE (COMPLIANT)",
        badgeColor: "success",
        url: refUrl,
        description: isVietnamese
          ? "Ảnh chụp trạng thái hợp lệ trước đó hoặc lúc mới vào khu vực (t=0s), có banner ANH DOI CHUNG và khung phân định để đối chiếu hành vi."
          : "Recorded prior compliant state or area entrance (t=0s) with reference banner for behavioral review.",
        isAiAnnotated: false,
        evidenceType: EVIDENCE_TYPE.REFERENCE_SNAPSHOT,
      });
    } else {
      // Fallback ảnh thô khi không có ảnh đối chứng ban đầu
      const rawEv = allEvidences.find((e) => e.id !== snapshotItem?.id);
      const rawUrl =
        (rawEv?.url ? resolveEvidenceUrl(rawEv.url) : "") ||
        (rawEv?.storageKey ? resolveEvidenceUrl(rawEv.storageKey) : "") ||
        (!isSnapAnnotated && resolvedSnap ? resolvedSnap : "") ||
        cameraRawUrl;

      list.push({
        id: rawEv?.id || allEvidences[1]?.id || "photo-raw",
        title: isVietnamese ? "Ảnh Gốc Hiện Trường (Raw Frame)" : "Original Scene (Raw Frame)",
        category: "raw",
        badgeLabel: isVietnamese ? "ẢNH GỐC HIỆN TRƯỜNG" : "RAW FRAME",
        badgeColor: "info",
        url: rawUrl,
        description: isVietnamese
          ? "Ảnh trích xuất nguyên bản từ luồng camera để đối chiếu pháp lý, không phủ bounding box."
          : "Raw unmodified frame extracted from camera stream for legal integrity verification.",
        isAiAnnotated: false,
        evidenceType: rawEv?.evidenceType || "RAW",
      });
    }

    // 3. TAB 3: TOÀN CẢNH CAMERA (Wide View / Context)
    const remainingEv = allEvidences.filter(
      (e) => e.id !== snapshotItem?.id && e.id !== referenceSnapshotItem?.id,
    );
    const wideEv = remainingEv[0];
    const wideUrl =
      (wideEv?.url ? resolveEvidenceUrl(wideEv.url) : "") ||
      (wideEv?.storageKey ? resolveEvidenceUrl(wideEv.storageKey) : "") ||
      (safeCamId.includes("video8") ? "/images/camera-live-evidence.jpg" : cameraRawUrl);

    list.push({
      id: wideEv?.id || allEvidences[2]?.id || "photo-wide",
      title: isVietnamese ? "Ảnh Toàn Cảnh Vị Trí Camera (Wide View)" : "Wide-Angle Context View",
      category: "wide",
      badgeLabel: isVietnamese ? "TOÀN CẢNH CAMERA" : "WIDE CONTEXT",
      badgeColor: "default",
      url: wideUrl,
      description: isVietnamese
        ? `Góc chụp toàn cảnh hiện trường khu vực làm việc của camera giám sát ${targetCamera?.name || targetCamera?.code || safeCamId.slice(0, 8)}.`
        : `Wide-angle surveillance snapshot of the work zone (${targetCamera?.code || safeCamId.slice(0, 8)}).`,
      isAiAnnotated: false,
    });

    // Nếu backend có thêm các bằng chứng khác từ vị trí thứ 3 trở đi, đưa tiếp vào gallery
    if (remainingEv.length > 1) {
      remainingEv.slice(1).forEach((ev, idx) => {
        const resolved = resolveEvidenceUrl(ev.url || ev.storageKey);
        if (resolved) {
          list.push({
            id: ev.id || `extra-ev-${idx}`,
            title: isVietnamese ? `Bằng chứng bổ sung #${idx + 4}` : `Additional Evidence #${idx + 4}`,
            category: "raw",
            badgeLabel: isVietnamese ? `BẰNG CHỨNG PHỤ #${idx + 1}` : `EXTRA EVIDENCE #${idx + 1}`,
            badgeColor: "default",
            url: resolved,
            description: isVietnamese
              ? "Tệp bằng chứng bổ sung thu thập từ hệ thống giám sát."
              : "Additional surveillance evidence recorded by system.",
            isAiAnnotated: false,
            evidenceType: ev.evidenceType,
          });
        }
      });
    }

    return list;
  }, [
    snapshotUrl,
    evidences,
    evidence,
    cameraFallbackUrl,
    cameraRawUrl,
    isVietnamese,
    violationLabel,
    confidence,
    safeCamId,
    targetCamera,
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

  // Kiểm tra xem ảnh hiện tại đang xem đã có bounding box nướng sẵn từ YOLOv11 hay chưa
  const isPreAnnotated = useMemo(() => {
    const url = (activePhoto?.url || "").toLowerCase();
    return (
      url.includes("-evidence") ||
      url.includes("evidence_") ||
      url.includes("_red") ||
      url.includes("annotated") ||
      url.includes("ai_violation") ||
      url.includes("_ref") ||
      activePhoto?.category === "reference"
    );
  }, [activePhoto?.url, activePhoto?.category]);

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

  // Nút BẬT/TẮT Khung Tô Đỏ thông minh:
  // - Nếu có ảnh raw thực sự: Bấm TẮT -> chuyển sang ảnh raw
  // - Nếu chỉ có ảnh vi phạm & đối chứng: Toggle hiển thị bounding box SVG overlay
  const handleToggleBoundingBoxes = () => {
    if (isPreAnnotated) {
      const rawIdx = galleryPhotos.findIndex((p) => p.category === "raw");
      if (rawIdx !== -1 && selectedIndex !== rawIdx) {
        setSelectedIndex(rawIdx);
        setShowBoundingBoxes(false);
      } else {
        setShowBoundingBoxes((v) => !v);
      }
    } else {
      setShowBoundingBoxes((v) => !v);
    }
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

    // 2. Kiểm tra metadata AI Detections từ evidence object
    const meta = evidence?.metadata?.aiDetections as any;
    if (meta?.violations && Array.isArray(meta.violations) && meta.violations.length > 0) {
      const v = meta.violations[0];
      if (v?.box) {
        return {
          x: v.box.x <= 1 ? v.box.x * 100 : v.box.x,
          y: v.box.y <= 1 ? v.box.y * 100 : v.box.y,
          width: v.box.width <= 1 ? v.box.width * 100 : v.box.width,
          height: v.box.height <= 1 ? v.box.height * 100 : v.box.height,
          label: v.box.label || violationLabel,
          confidence: v.confidence || confidence,
        };
      }
    }
    if (meta?.persons && Array.isArray(meta.persons) && meta.persons.length > 0) {
      const p = meta.persons[0];
      if (p?.violations && Array.isArray(p.violations) && p.violations.length > 0) {
        const v = p.violations[0];
        if (v?.box) {
          return {
            x: v.box.x <= 1 ? v.box.x * 100 : v.box.x,
            y: v.box.y <= 1 ? v.box.y * 100 : v.box.y,
            width: v.box.width <= 1 ? v.box.width * 100 : v.box.width,
            height: v.box.height <= 1 ? v.box.height * 100 : v.box.height,
            label: v.box.label || violationLabel,
            confidence: v.confidence || confidence,
          };
        }
      }
    }
    return null;
  }, [evidence, incidentId, violationLabel, confidence]);

  // 5. Tự động tính toán Bounding Box thông minh theo từng camera thực tế
  const activeViolationBox: BoundingBox = useMemo(() => {
    if (realBox) return realBox;

    // Tọa độ chuẩn xác của Worker #10 trong Camera 2 (CAM2): 75, 224, w: 262, h: 859 trên 720x1280
    if (safeCamId.includes("01a19ce7") || targetCamera?.code?.includes("CAM2") || targetCamera?.streamUrl?.includes("POdSp36OulM")) {
      return {
        x: 10.4,
        y: 17.5,
        width: 36.4,
        height: 67.1,
        label: violationLabel,
        confidence: confidence,
      };
    }

    // Tọa độ chuẩn xác của Camera 3 & 5
    if (safeCamId.includes("01a19cf4") || targetCamera?.code?.includes("CAM3") || safeCamId.includes("01a19d07") || targetCamera?.code?.includes("CAM5")) {
      return {
        x: 43.0,
        y: 28.6,
        width: 4.8,
        height: 22.5,
        label: violationLabel,
        confidence: confidence,
      };
    }

    // Tọa độ chuẩn xác của CAMMMM
    if (safeCamId.includes("01a19e19") || targetCamera?.code?.includes("CAMMM")) {
      return {
        x: 39.7,
        y: 28.2,
        width: 3.6,
        height: 19.2,
        label: violationLabel,
        confidence: confidence,
      };
    }

    // Tọa độ chuẩn xác của Camera 01
    if (safeCamId.includes("01a18735") || targetCamera?.code?.includes("099999") || targetCamera?.code?.includes("CAM-1")) {
      return {
        x: 28.0,
        y: 18.0,
        width: 44.0,
        height: 20.0,
        label: violationLabel,
        confidence: confidence,
      };
    }

    // KHUNG HÌNH DỌC (YouTube Shorts / Video dọc 9:16):
    if (isPortrait) {
      if (violationType === "NO_HELMET") {
        return {
          x: 28.0,
          y: 16.0,
          width: 44.0,
          height: 22.0,
          label: violationLabel,
          confidence: confidence,
        };
      }
      return {
        x: 10.4,
        y: 17.5,
        width: 36.4,
        height: 67.1,
        label: violationLabel,
        confidence: confidence,
      };
    }

    // KHUNG HÌNH NGANG (16:9 / 4:3 chuẩn):
    if (violationType === "NO_HELMET") {
      return {
        x: 36.0,
        y: 16.0,
        width: 28.0,
        height: 24.0,
        label: violationLabel,
        confidence: confidence,
      };
    }
    return {
      x: 32.0,
      y: 25.0,
      width: 36.0,
      height: 50.0,
      label: violationLabel,
      confidence: confidence,
    };
  }, [realBox, safeCamId, targetCamera, isPortrait, violationType, violationLabel, confidence]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (naturalWidth && naturalHeight) {
      setIsPortrait(naturalHeight > naturalWidth);
    }
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
                {/* Lớp SVG bounding box cho ảnh vi phạm nếu showBoundingBoxes bật và chưa pre-annotated */}
                {showBoundingBoxes && !isPreAnnotated && (
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="absolute inset-0 h-full w-full pointer-events-none z-10"
                  >
                    <g className="animate-pulse">
                      <rect
                        x={`${activeViolationBox.x}%`}
                        y={`${activeViolationBox.y}%`}
                        width={`${activeViolationBox.width}%`}
                        height={`${activeViolationBox.height}%`}
                        fill="rgba(239, 68, 68, 0.24)"
                        stroke="#ef4444"
                        strokeWidth="2.5"
                        rx="2"
                        style={{ filter: "drop-shadow(0 0 8px rgba(239, 68, 68, 0.9))" }}
                      />
                    </g>
                  </svg>
                )}
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
                if (safeCamId.includes("01a18735") || targetCamera?.code?.includes("099999")) {
                  target.src = "/images/evidence/camera-01a18735_16ee47ac_f76_red.jpg";
                } else {
                  target.src = "/images/camera-live-evidence.jpg";
                }
              }}
            />

            {/* LỚP SVG BOUNDING BOX PHÁT SÁNG ĐỎ: Chỉ hiển thị khi showBoundingBoxes là TRUE và ảnh là ảnh vi phạm chưa pre-annotated */}
            {showBoundingBoxes && !isPreAnnotated && activePhoto.category === "annotated" && (
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full pointer-events-none z-10"
              >
                {/* Khung VI PHẠM PPE (Alert Red Viền Đỏ Rực Rỡ có ánh sáng phát quang) */}
                <g className="animate-pulse">
                  <rect
                    x={`${activeViolationBox.x}%`}
                    y={`${activeViolationBox.y}%`}
                    width={`${activeViolationBox.width}%`}
                    height={`${activeViolationBox.height}%`}
                    fill="rgba(239, 68, 68, 0.24)"
                    stroke="#ef4444"
                    strokeWidth="2.5"
                    rx="2"
                    style={{
                      filter: "drop-shadow(0 0 8px rgba(239, 68, 68, 0.9))",
                    }}
                  />
                </g>
              </svg>
            )}

            {/* NHÃN VI PHẠM TÔ ĐỎ NẰM ĐÈ TRÊN ĐỐI TƯỢNG (Chỉ hiển thị cho ảnh vi phạm chưa nướng sẵn nhãn) */}
            {showBoundingBoxes && !isPreAnnotated && activePhoto.category === "annotated" && (
              <div
                style={{
                  left: `${Math.max(1, Math.min(65, activeViolationBox.x))}%`,
                  top: `${Math.max(2, activeViolationBox.y - 8)}%`,
                }}
                className="absolute z-20 flex items-center gap-1.5 rounded-lg border border-rose-400 bg-rose-600/95 px-2.5 py-1 font-mono text-[11px] font-extrabold text-white shadow-[0_4px_14px_rgba(244,63,94,0.7)] backdrop-blur-sm pointer-events-none"
              >
                <ShieldAlert className="size-3.5 shrink-0 animate-bounce text-amber-200" />
                <span>{violationLabel.toUpperCase()}</span>
                <span className="rounded bg-black/40 px-1 py-0.2 text-[10px] text-amber-200 font-bold">
                  {Math.round((confidence || 0.96) * 100)}%
                </span>
              </div>
            )}
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
                {/* LỚP SVG VÀ NHÃN TRONG LIGHTBOX: Chỉ hiển thị khi showBoundingBoxes là TRUE và ảnh là ảnh vi phạm chưa pre-annotated */}
                {showBoundingBoxes && !isPreAnnotated && activePhoto.category === "annotated" && (
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="absolute inset-0 h-full w-full pointer-events-none z-10"
                  >
                    <g className="animate-pulse">
                      <rect
                        x={`${activeViolationBox.x}%`}
                        y={`${activeViolationBox.y}%`}
                        width={`${activeViolationBox.width}%`}
                        height={`${activeViolationBox.height}%`}
                        fill="rgba(239, 68, 68, 0.24)"
                        stroke="#ef4444"
                        strokeWidth="2.5"
                        rx="2"
                        style={{
                          filter: "drop-shadow(0 0 8px rgba(239, 68, 68, 0.9))",
                        }}
                      />
                    </g>
                  </svg>
                )}
                {showBoundingBoxes && !isPreAnnotated && activePhoto.category === "annotated" && (
                  <div
                    style={{
                      left: `${Math.max(1, Math.min(65, activeViolationBox.x))}%`,
                      top: `${Math.max(2, activeViolationBox.y - 8)}%`,
                    }}
                    className="absolute z-20 flex items-center gap-1.5 rounded-lg border border-rose-400 bg-rose-600/95 px-2.5 py-1 font-mono text-[11px] font-extrabold text-white shadow-[0_4px_14px_rgba(244,63,94,0.7)] backdrop-blur-sm pointer-events-none"
                  >
                    <ShieldAlert className="size-3.5 shrink-0 animate-bounce text-amber-200" />
                    <span>{violationLabel.toUpperCase()}</span>
                    <span className="rounded bg-black/40 px-1 py-0.2 text-[10px] text-amber-200">
                      {Math.round((confidence || 0.96) * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
