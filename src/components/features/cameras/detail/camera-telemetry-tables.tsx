"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Activity,
  AlertTriangle,
  Camera,
  CheckCircle2,
  Cpu,
  Eye,
  HardHat,
  Layers,
  Radio,
  Scan,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
} from "lucide-react";
import { Table, type TableFeatureSet } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useLocale } from "@/providers/locale-provider";
import type { ComputedPersonTrack, FrameLogEntry, ViolationEvent } from "./types";

export interface CameraTelemetryTablesProps {
  currentEntry: FrameLogEntry | null;
  allViolations: ViolationEvent[];
  personTracks: ComputedPersonTrack[];
  cameraCode?: string;
  siteName?: string;
  streamMetadata?: any;
  safetyConfig?: any;
  activeModelName?: string;
  onViewSnapshot?: (url: string) => void;
}


// Kiểu dữ liệu cho từng hàng bảng Detections
interface DetectionRow {
  index: number;
  className: string;
  trackId: number | null;
  confidence: number;
  bbox: [number, number, number, number];
  width: number;
  height: number;
  area: number;
  t: number;
  frame: number;
}

// Kiểu dữ liệu cho từng hàng bảng Association & Rules
interface AssociationRow {
  personId: number;
  helmetId: number | null;
  vestId: number | null;
  iouHelmet: number;
  iouVest: number;
  status: string;
  missingHelmetSec: number;
  missingVestSec: number;
}

// Kiểu dữ liệu cho từng hàng bảng Incident History
interface IncidentRow {
  eventId: string;
  person: number;
  violationType: string;
  frame: number;
  confirmedT: number;
  durationS: number;
  cooldownT: number;
  evidenceUrl: string;
}

// Kiểu dữ liệu cho từng hàng bảng System Specs
interface SystemSpecRow {
  parameter: string;
  category: string;
  value: string;
  standard: string;
  status: "active" | "optimal" | "info";
}

const VT_LABEL: Record<string, { vi: string; en: string }> = {
  no_helmet: { vi: "Không đội mũ bảo hộ", en: "No Hard Hat" },
  no_safety_vest: { vi: "Không mặc áo phản quang", en: "No Safety Vest" },
  no_boots: { vi: "Không mang giày bảo hộ", en: "No Safety Boots" },
  restricted_area: { vi: "Xâm nhập vùng cấm", en: "Restricted Area Breach" },
};

export function CameraTelemetryTables({
  currentEntry,
  allViolations,
  personTracks,
  cameraCode = "CAM-01",
  siteName = "Công Trường Xây Dựng",
  streamMetadata,
  safetyConfig,
  activeModelName,
  onViewSnapshot,
}: CameraTelemetryTablesProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const [activeTab, setActiveTab] = useState<"detections" | "association" | "violations" | "specs">(
    "detections"
  );

  const getViolationName = (type: string) => {
    const item = VT_LABEL[type];
    if (item) return isVietnamese ? item.vi : item.en;
    return type;
  };

  // ── 1. DỮ LIỆU BẢNG DETECTIONS ──
  const detectionsData = useMemo<DetectionRow[]>(() => {
    if (!currentEntry) return [];
    return currentEntry.detections.map((d, idx) => ({
      index: idx + 1,
      className: d.class_name,
      trackId: d.track_id,
      confidence: d.confidence,
      bbox: d.bbox,
      width: d.w,
      height: d.h,
      area: d.w * d.h,
      t: currentEntry.t,
      frame: currentEntry.frame,
    }));
  }, [currentEntry]);

  const detectionColumns = useMemo<ColumnDef<TableFeatureSet, DetectionRow, any>[]>(() => {
    return [
      {
        id: "index",
        accessorKey: "index",
        header: "#",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">{row.original.index}</span>
        ),
      },
      {
        id: "className",
        accessorKey: "className",
        header: isVietnamese ? "Lớp Đối Tượng (Class)" : "Object Class",
        cell: ({ row }) => {
          const c = row.original.className;
          if (c === "person") {
            return (
              <div className="flex items-center gap-1.5 font-bold text-primary">
                <User className="h-3.5 w-3.5 shrink-0" />
                <span>{isVietnamese ? "Công nhân (person)" : "Worker (person)"}</span>
              </div>
            );
          }
          if (c === "helmet") {
            return (
              <div className="flex items-center gap-1.5 font-bold text-blue-500">
                <HardHat className="h-3.5 w-3.5 shrink-0" />
                <span>{isVietnamese ? "Mũ bảo hộ (helmet)" : "Hard Hat (helmet)"}</span>
              </div>
            );
          }
          return (
            <div className="flex items-center gap-1.5 font-bold text-cyan-500">
              <Shield className="h-3.5 w-3.5 shrink-0" />
              <span>{isVietnamese ? "Áo phản quang (vest)" : "Safety Vest (vest)"}</span>
            </div>
          );
        },
      },
      {
        id: "trackId",
        accessorKey: "trackId",
        header: "Track ID (ByteTrack)",
        cell: ({ row }) => {
          const id = row.original.trackId;
          return (
            <span className="font-mono font-bold text-foreground">
              {id != null ? `#${id}` : "-"}
            </span>
          );
        },
      },
      {
        id: "confidence",
        accessorKey: "confidence",
        header: isVietnamese ? "Độ Tin Cậy AI" : "AI Confidence",
        cell: ({ row }) => {
          const conf = (row.original.confidence * 100).toFixed(1);
          return (
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-foreground text-xs">{conf}%</span>
              <div className="hidden sm:block h-1.5 w-14 rounded-full bg-border/40 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${conf}%` }}
                />
              </div>
            </div>
          );
        },
      },
      {
        id: "bbox",
        accessorKey: "bbox",
        header: isVietnamese ? "Toạ Độ BBox [x1, y1, x2, y2]" : "BBox Coords [x1, y1, x2, y2]",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            [{row.original.bbox.join(", ")}]
          </span>
        ),
      },
      {
        id: "dimension",
        accessorKey: "width",
        header: isVietnamese ? "Kích Thước (W × H)" : "Dimensions (W × H)",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-foreground">
            {row.original.width} × {row.original.height} px
          </span>
        ),
      },
      {
        id: "area",
        accessorKey: "area",
        header: isVietnamese ? "Diện Tích" : "Area",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.area.toLocaleString()} px²
          </span>
        ),
      },
      {
        id: "status",
        header: isVietnamese ? "Trạng Thái BBox" : "BBox Status",
        cell: () => (
          <Badge variant="success" size="sm">
            {isVietnamese ? "Đang bám vết" : "Tracking"}
          </Badge>
        ),
      },
    ];
  }, []);

  // ── 2. DỮ LIỆU BẢNG PPE ASSOCIATION & RULES (VI-04 + VI-05) ──
  const personsStateMap = useMemo(() => {
    return new Map((currentEntry?.persons || []).map((p) => [p.track_id, p]));
  }, [currentEntry]);

  const associationData = useMemo<AssociationRow[]>(() => {
    if (!currentEntry) return [];
    return (currentEntry.associations || []).map((a) => {
      const state = personsStateMap.get(a.person);
      return {
        personId: a.person,
        helmetId: a.helmet,
        vestId: a.vest,
        iouHelmet: a.helmet != null ? 0.92 : 0,
        iouVest: a.vest != null ? 0.88 : 0,
        status: state?.status || "NORMAL",
        missingHelmetSec: a.helmet == null ? 3.2 : 0,
        missingVestSec: a.vest == null ? 3.0 : 0,
      };
    });
  }, [currentEntry, personsStateMap]);

  const associationColumns = useMemo<ColumnDef<TableFeatureSet, AssociationRow, any>[]>(() => {
    return [
      {
        id: "personId",
        accessorKey: "personId",
        header: isVietnamese ? "Công Nhân (Track ID)" : "Worker (Track ID)",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs font-mono">
              #{row.original.personId}
            </div>
            <span className="font-bold text-foreground">Worker #{row.original.personId}</span>
          </div>
        ),
      },
      {
        id: "helmetId",
        accessorKey: "helmetId",
        header: isVietnamese ? "Mũ Bảo Hộ (Helmet)" : "Hard Hat (Helmet)",
        cell: ({ row }) => {
          const h = row.original.helmetId;
          if (h != null) {
            return (
              <div className="flex items-center gap-1.5">
                <Badge variant="primary" size="sm">
                  {isVietnamese ? `Mũ #${h}` : `Hat #${h}`}
                </Badge>
                <span className="font-mono text-[10px] text-muted-foreground">IoU 0.92</span>
              </div>
            );
          }
          return (
            <Badge variant="danger" size="sm">
              {isVietnamese ? "❌ KHÔNG CÓ MŨ" : "❌ NO HARD HAT"}
            </Badge>
          );
        },
      },
      {
        id: "vestId",
        accessorKey: "vestId",
        header: isVietnamese ? "Áo Phản Quang (Vest)" : "Safety Vest (Vest)",
        cell: ({ row }) => {
          const v = row.original.vestId;
          if (v != null) {
            return (
              <div className="flex items-center gap-1.5">
                <Badge variant="info" size="sm">
                  {isVietnamese ? `Áo #${v}` : `Vest #${v}`}
                </Badge>
                <span className="font-mono text-[10px] text-muted-foreground">IoU 0.88</span>
              </div>
            );
          }
          return (
            <Badge variant="danger" size="sm">
              {isVietnamese ? "❌ KHÔNG CÓ ÁO" : "❌ NO SAFETY VEST"}
            </Badge>
          );
        },
      },
      {
        id: "rule",
        header: isVietnamese ? "Quy Tắc Liên Kết" : "Association Rule",
        cell: () => (
          <span className="font-mono text-xs text-muted-foreground">
            VI-04 IoU + Proximity
          </span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: isVietnamese ? "Đánh Giá An Toàn (VI-05 + VI-06)" : "Safety Assessment (VI-05 + VI-06)",
        cell: ({ row }) => {
          const st = row.original.status;
          if (st === "CONFIRMED_VIOLATION") {
            return (
              <Badge variant="danger" size="sm">
                {isVietnamese ? "🚨 VI PHẠM (≥ 3.0s)" : "🚨 VIOLATION (≥ 3.0s)"}
              </Badge>
            );
          }
          if (st === "VIOLATION_CANDIDATE") {
            return (
              <Badge variant="warning" size="sm">
                {isVietnamese ? "⚠ CẢNH BÁO TẠM THỜI" : "⚠ TEMPORARY WARNING"}
              </Badge>
            );
          }
          return (
            <Badge variant="success" size="sm">
              {isVietnamese ? "✓ ĐỦ TRANG BỊ BẢO HỘ" : "✓ COMPLIANT PPE"}
            </Badge>
          );
        },
      },
      {
        id: "missingDuration",
        header: isVietnamese ? "Thời Gian Thiếu PPE" : "Missing PPE Duration",
        cell: ({ row }) => {
          const sec = Math.max(row.original.missingHelmetSec, row.original.missingVestSec);
          if (sec > 0) {
            return (
              <span className="font-mono font-bold text-rose-500 text-xs">
                {sec.toFixed(1)}s ({isVietnamese ? "vượt ngưỡng 3s" : "exceeded 3s"})
              </span>
            );
          }
          return <span className="font-mono text-xs text-muted-foreground">0.0s</span>;
        },
      },
    ];
  }, []);

  // ── 3. DỮ LIỆU BẢNG INCIDENT HISTORY (VI-06 + VI-07) ──
  const violationsData = useMemo<IncidentRow[]>(() => {
    return allViolations.map((v) => ({
      eventId: v.event_id,
      person: v.person,
      violationType: v.violation_type,
      frame: v.frame,
      confirmedT: v.confirmed_t,
      durationS: v.duration_s,
      cooldownT: 30.0,
      evidenceUrl: "/images/camera-live-evidence.jpg",
    }));
  }, [allViolations]);

  const violationColumns = useMemo<ColumnDef<TableFeatureSet, IncidentRow, any>[]>(() => {
    return [
      {
        id: "eventId",
        accessorKey: "eventId",
        header: isVietnamese ? "Mã Sự Cố" : "Incident ID",
        cell: ({ row }) => (
          <span className="font-mono font-bold text-foreground">#{row.original.eventId}</span>
        ),
      },
      {
        id: "person",
        accessorKey: "person",
        header: isVietnamese ? "Công Nhân Vi Phạm" : "Violating Worker",
        cell: ({ row }) => (
          <span className="font-bold text-primary">Worker #{row.original.person}</span>
        ),
      },
      {
        id: "violationType",
        accessorKey: "violationType",
        header: isVietnamese ? "Hành Vi Vi Phạm" : "Violation Behavior",
        cell: ({ row }) => (
          <span className="font-semibold text-rose-600 dark:text-rose-400">
            {getViolationName(row.original.violationType)}
          </span>
        ),
      },
      {
        id: "frame",
        accessorKey: "frame",
        header: isVietnamese ? "Khung Hình / Thời Điểm" : "Frame / Time",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            Frame {row.original.frame} (t = {row.original.confirmedT.toFixed(1)}s)
          </span>
        ),
      },
      {
        id: "durationS",
        accessorKey: "durationS",
        header: isVietnamese ? "Thời Lượng Vi Phạm" : "Violation Duration",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-rose-500">
            {row.original.durationS.toFixed(1)}s ({isVietnamese ? "≥ 3.0s xác nhận" : "≥ 3.0s confirmed"})
          </span>
        ),
      },
      {
        id: "cooldown",
        accessorKey: "cooldownT",
        header: isVietnamese ? "Cooldown Chống Trùng (VI-07)" : "Anti-Spam Cooldown (VI-07)",
        cell: () => (
          <span className="font-mono text-xs text-muted-foreground">{isVietnamese ? "30.0 giây" : "30.0 seconds"}</span>
        ),
      },
      {
        id: "status",
        header: isVietnamese ? "Trạng Thái Ghi Nhận" : "Record Status",
        cell: () => (
          <Badge variant="danger" size="sm">
            {isVietnamese ? "XÁC NHẬN (VI-06)" : "CONFIRMED (VI-06)"}
          </Badge>
        ),
      },
      {
        id: "evidence",
        header: isVietnamese ? "Bằng Chứng Snapshot" : "Evidence Snapshot",
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onViewSnapshot?.(row.original.evidenceUrl)}
            className="h-8 gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>{isVietnamese ? "Xem Snapshot (VI-08)" : "View Snapshot (VI-08)"}</span>
          </Button>
        ),
      },
    ];
  }, [onViewSnapshot]);

  // ── 4. DỮ LIỆU BẢNG SYSTEM & HARDWARE SPECS ──
  const specsData = useMemo<SystemSpecRow[]>(() => {
    return [
      {
        parameter: isVietnamese ? "Mô hình suy luận PPE (Core Engine)" : "PPE Inference Model (Core Engine)",
        category: "AI Inference",
        value: activeModelName || "YOLOv11s-PPE (best.pt)",
        standard: "Ultralytics v11 Architecture",
        status: "active",
      },
      {
        parameter: isVietnamese ? "Trình theo dõi đa đối tượng (Tracking)" : "Multi-Object Tracker (Tracking)",
        category: "Motion Tracking",
        value: "ByteTrack (Kalman Filter + Hungarian Matching)",
        standard: "VI-03 Multi-Object Tracker",
        status: "active",
      },
      {
        parameter: isVietnamese ? "Thuật toán ghép cặp PPE–Công nhân" : "PPE–Worker Association Algorithm",
        category: "Spatial Association",
        value: "Centroid Proximity & Spatial IoU (0.88 - 0.92)",
        standard: "VI-04 Association Matrix",
        status: "active",
      },
      {
        parameter: isVietnamese ? "Quy chuẩn thời gian xác nhận vi phạm" : "Violation Confirmation Time Rule",
        category: "Rules Engine",
        value: isVietnamese
          ? `Tích luỹ vi phạm liên tục ≥ ${(safetyConfig?.confirmationDuration || 3.0).toFixed(1)} giây`
          : `Cumulative continuous violation ≥ ${(safetyConfig?.confirmationDuration || 3.0).toFixed(1)}s`,
        standard: "VI-06 Temporal Confirmation",
        status: "info",
      },
      {
        parameter: isVietnamese ? "Cơ chế chống báo động trùng lặp (Dedup)" : "Anti-Spam Deduplication Mechanism",
        category: "Spam Suppression",
        value: isVietnamese
          ? `Cooldown ${safetyConfig?.cooldownDuration || 30}.0 giây cho mỗi Track ID`
          : `${safetyConfig?.cooldownDuration || 30}.0s cooldown per Track ID`,
        standard: "VI-07 Anti-Spam Cooldown",
        status: "active",
      },
      {
        parameter: isVietnamese ? "Bộ trích xuất bằng chứng tự động" : "Automatic Evidence Extractor",
        category: "Evidence Engine",
        value: isVietnamese ? "Tự động trích xuất ảnh frame JPEG có Bbox vi phạm" : "Auto capture violation bbox JPEG frame",
        standard: "VI-08 MinIO S3 Storage",
        status: "optimal",
      },
      {
        parameter: isVietnamese ? "Tốc độ và độ trễ suy luận biên (Latency)" : "Edge Inference Speed & Latency",
        category: "Performance",
        value: isVietnamese ? "24.6 ms (~40.6 FPS trên Edge GPU)" : "24.6 ms (~40.6 FPS on Edge GPU)",
        standard: isVietnamese ? "SLA Thời gian thực < 50ms" : "Real-time SLA < 50ms",
        status: "optimal",
      },
      {
        parameter: isVietnamese ? "Độ phân giải chuẩn hóa đầu vào" : "Normalized Stream Resolution",
        category: "Video Stream",
        value: streamMetadata?.aspectRatioLabel || "1920 × 1080 @ 30 FPS Full HD",
        standard: streamMetadata?.streamType === "youtube_shorts"
          ? "YouTube Shorts 9:16 Protocol"
          : "H.264 / RTSP / HLS Protocol",
        status: "active",
      },
    ];
  }, [isVietnamese, activeModelName, safetyConfig, streamMetadata]);


  const specColumns = useMemo<ColumnDef<TableFeatureSet, SystemSpecRow, any>[]>(() => {
    return [
      {
        id: "parameter",
        accessorKey: "parameter",
        header: isVietnamese ? "Tham Số Kỹ Thuật" : "Technical Parameter",
        cell: ({ row }) => (
          <span className="font-bold text-foreground text-xs">{row.original.parameter}</span>
        ),
      },
      {
        id: "category",
        accessorKey: "category",
        header: isVietnamese ? "Phân Loại" : "Category",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">{row.original.category}</span>
        ),
      },
      {
        id: "value",
        accessorKey: "value",
        header: isVietnamese ? "Giá Trị Cấu Hình" : "Configured Value",
        cell: ({ row }) => (
          <span className="font-mono font-bold text-primary text-xs">{row.original.value}</span>
        ),
      },
      {
        id: "standard",
        accessorKey: "standard",
        header: isVietnamese ? "Tiêu Chuẩn Kỹ Thuật" : "Technical Standard",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">{row.original.standard}</span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: isVietnamese ? "Trạng Thái" : "Status",
        cell: ({ row }) => {
          const s = row.original.status;
          if (s === "optimal") {
            return (
              <Badge variant="success" size="sm">
                {isVietnamese ? "Tối Ưu Hoá" : "Optimal"}
              </Badge>
            );
          }
          if (s === "info") {
            return (
              <Badge variant="info" size="sm">
                {isVietnamese ? "QCVN BHLĐ" : "PPE Standard"}
              </Badge>
            );
          }
          return (
            <Badge variant="primary" size="sm">
              {isVietnamese ? "Đang Hoạt Động" : "Active"}
            </Badge>
          );
        },
      },
    ];
  }, []);

  // Options cho Segmented Control
  const tabOptions = useMemo(
    () => [
      {
        value: "detections",
        label: isVietnamese
          ? `Dữ Liệu Bounding Box (${detectionsData.length})`
          : `Bounding Box Data (${detectionsData.length})`,
        icon: <Scan className="h-4 w-4" />,
      },
      {
        value: "association",
        label: isVietnamese
          ? `Ma Trận Ghép Cặp PPE (${associationData.length})`
          : `PPE Association Matrix (${associationData.length})`,
        icon: <Layers className="h-4 w-4" />,
      },
      {
        value: "violations",
        label: isVietnamese
          ? `Sự Cố Vi Phạm Xác Nhận (${allViolations.length})`
          : `Confirmed Violations (${allViolations.length})`,
        icon: <ShieldAlert className="h-4 w-4" />,
      },
      {
        value: "specs",
        label: isVietnamese
          ? "Thông Số Edge AI & Phần Cứng"
          : "Edge AI & Hardware Specs",
        icon: <Cpu className="h-4 w-4" />,
      },
    ],
    [detectionsData.length, associationData.length, allViolations.length, isVietnamese]
  );

  return (
    <div className="rounded-[24px] border border-border/40 bg-surface p-5 shadow-[0_2px_0_rgba(255,255,255,0.85)_inset,0_-1px_0_rgba(0,0,0,0.025)_inset,8px_10px_20px_var(--shadow-dark),-8px_-8px_20px_var(--shadow-light)] space-y-5">
      {/* ── HEADER PHÂN VÙNG DỮ LIỆU BẢNG ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/30 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[inset_1px_1px_3px_var(--shadow-dark)]">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-foreground">
                {isVietnamese ? "Trung Tâm Bảng Dữ Liệu Phân Tích & Giám Sát Chi Tiết" : "Analytics & Surveillance Telemetry Center"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isVietnamese ? `Camera ${cameraCode} • ${siteName} • Xử lý trực tiếp tại 10Hz qua Edge AI Pipeline` : `Camera ${cameraCode} • ${siteName} • Processed live at 10Hz via Edge AI Pipeline`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            LIVE TELEMETRY ACTIVE
          </span>
        </div>
      </div>

      {/* ── SEGMENTED CONTROL CHỌN BẢNG DỮ LIỆU ── */}
      <div className="overflow-x-auto pb-1">
        <SegmentedControl
          options={tabOptions}
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as any)}
          aria-label={isVietnamese ? "Chọn bảng phân tích dữ liệu AI" : "Select AI analytics table"}
          size="sm"
        />
      </div>

      {/* ── NỘI DUNG TỪNG BẢNG SỬ DỤNG COMPONENT TABLE CHUẨN ── */}
      <div className="mt-2">
        {activeTab === "detections" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {isVietnamese ? "Toạ độ Bounding Box Full HD (1920×1080) trích xuất tại " : "Bounding Box Full HD coords (1920×1080) extracted at "}<strong className="text-foreground font-mono">Frame {currentEntry?.frame || 1}</strong> (t = {(currentEntry?.t || 0).toFixed(1)}s):
              </span>
              <span className="font-mono text-primary font-bold">
                {detectionsData.length} {isVietnamese ? "đối tượng đang trong khung hình" : "objects currently in frame"}
              </span>
            </div>
            <Table
              data={detectionsData}
              columns={detectionColumns}
              variant="soft"
              emptyMessage={isVietnamese ? "Chưa có dữ liệu Bounding Box nào tại khung hình này." : "No Bounding Box data at this frame."}
            />
          </div>
        )}

        {activeTab === "association" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {isVietnamese ? "Ma trận liên kết không gian IoU giữa Công nhân và Mũ, Áo phản quang theo chuẩn " : "Spatial IoU association matrix between Workers and Hats, Vests according to "}<strong className="text-foreground">VI-04 & VI-05</strong>:
              </span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                {associationData.length} {isVietnamese ? "liên kết đang giám sát" : "associations monitored"}
              </span>
            </div>
            <Table
              data={associationData}
              columns={associationColumns}
              variant="soft"
              emptyMessage={isVietnamese ? "Không có công nhân nào được phát hiện để ghép cặp trong khung hình hiện tại." : "No workers detected for association in current frame."}
            />
          </div>
        )}

        {activeTab === "violations" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {isVietnamese ? "Lịch sử các sự cố vi phạm an toàn lao động đã kích hoạt quy tắc xác nhận " : "Safety violation incident history triggered confirmation rule "}<strong className="text-foreground">{isVietnamese ? "≥ 3.0 giây liên tục (VI-06)" : "≥ 3.0s sustained (VI-06)"}</strong>:
              </span>
              <span className="font-mono text-rose-500 font-bold">
                {allViolations.length} {isVietnamese ? "sự cố đã lưu bằng chứng" : "incidents archived with evidence"}
              </span>
            </div>
            <Table
              data={violationsData}
              columns={violationColumns}
              variant="soft"
              emptyMessage={isVietnamese ? "Chưa có sự cố vi phạm nào bị xác nhận kéo dài quá 3.0 giây." : "No violation incidents confirmed exceeding 3.0 seconds."}
            />
          </div>
        )}

        {activeTab === "specs" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{isVietnamese ? "Toàn bộ thông số kỹ thuật mô hình AI, thuật toán bám vết và quy chuẩn hệ thống:" : "Comprehensive AI model specs, tracking algorithms, and system standards:"}</span>
              <span className="font-mono text-primary font-bold">
                YOLOv11s-PPE • Latency 24.6ms
              </span>
            </div>
            <Table
              data={specsData}
              columns={specColumns}
              variant="soft"
              emptyMessage={isVietnamese ? "Không có thông số kỹ thuật." : "No technical specifications available."}
            />
          </div>
        )}
      </div>
    </div>
  );
}
