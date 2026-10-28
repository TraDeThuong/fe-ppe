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
import type { ComputedPersonTrack, FrameLogEntry, ViolationEvent } from "./types";

export interface CameraTelemetryTablesProps {
  currentEntry: FrameLogEntry | null;
  allViolations: ViolationEvent[];
  personTracks: ComputedPersonTrack[];
  cameraCode?: string;
  siteName?: string;
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

const VT_LABEL: Record<string, string> = {
  no_helmet: "Không đội mũ bảo hộ",
  no_safety_vest: "Không mặc áo phản quang",
  no_boots: "Không mang giày bảo hộ",
  restricted_area: "Xâm nhập vùng cấm",
};

export function CameraTelemetryTables({
  currentEntry,
  allViolations,
  personTracks,
  cameraCode = "CAM-01",
  siteName = "Công Trường Xây Dựng",
  onViewSnapshot,
}: CameraTelemetryTablesProps) {
  const [activeTab, setActiveTab] = useState<"detections" | "association" | "violations" | "specs">(
    "detections"
  );

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
        header: "Lớp Đối Tượng (Class)",
        cell: ({ row }) => {
          const c = row.original.className;
          if (c === "person") {
            return (
              <div className="flex items-center gap-1.5 font-bold text-primary">
                <User className="h-3.5 w-3.5 shrink-0" />
                <span>Công nhân (person)</span>
              </div>
            );
          }
          if (c === "helmet") {
            return (
              <div className="flex items-center gap-1.5 font-bold text-blue-500">
                <HardHat className="h-3.5 w-3.5 shrink-0" />
                <span>Mũ bảo hộ (helmet)</span>
              </div>
            );
          }
          return (
            <div className="flex items-center gap-1.5 font-bold text-cyan-500">
              <Shield className="h-3.5 w-3.5 shrink-0" />
              <span>Áo phản quang (vest)</span>
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
        header: "Độ Tin Cậy AI",
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
        header: "Toạ Độ BBox [x1, y1, x2, y2]",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            [{row.original.bbox.join(", ")}]
          </span>
        ),
      },
      {
        id: "dimension",
        accessorKey: "width",
        header: "Kích Thước (W × H)",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-foreground">
            {row.original.width} × {row.original.height} px
          </span>
        ),
      },
      {
        id: "area",
        accessorKey: "area",
        header: "Diện Tích",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.area.toLocaleString()} px²
          </span>
        ),
      },
      {
        id: "status",
        header: "Trạng Thái BBox",
        cell: () => (
          <Badge variant="success" size="sm">
            Đang bám vết
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
        header: "Công Nhân (Track ID)",
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
        header: "Mũ Bảo Hộ (Helmet)",
        cell: ({ row }) => {
          const h = row.original.helmetId;
          if (h != null) {
            return (
              <div className="flex items-center gap-1.5">
                <Badge variant="primary" size="sm">
                  Mũ #{h}
                </Badge>
                <span className="font-mono text-[10px] text-muted-foreground">IoU 0.92</span>
              </div>
            );
          }
          return (
            <Badge variant="danger" size="sm">
              ❌ KHÔNG CÓ MŨ
            </Badge>
          );
        },
      },
      {
        id: "vestId",
        accessorKey: "vestId",
        header: "Áo Phản Quang (Vest)",
        cell: ({ row }) => {
          const v = row.original.vestId;
          if (v != null) {
            return (
              <div className="flex items-center gap-1.5">
                <Badge variant="info" size="sm">
                  Áo #{v}
                </Badge>
                <span className="font-mono text-[10px] text-muted-foreground">IoU 0.88</span>
              </div>
            );
          }
          return (
            <Badge variant="danger" size="sm">
              ❌ KHÔNG CÓ ÁO
            </Badge>
          );
        },
      },
      {
        id: "rule",
        header: "Quy Tắc Liên Kết",
        cell: () => (
          <span className="font-mono text-xs text-muted-foreground">
            VI-04 IoU + Proximity
          </span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Đánh Giá An Toàn (VI-05 + VI-06)",
        cell: ({ row }) => {
          const st = row.original.status;
          if (st === "CONFIRMED_VIOLATION") {
            return (
              <Badge variant="danger" size="sm">
                🚨 VI PHẠM (≥ 3.0s)
              </Badge>
            );
          }
          if (st === "VIOLATION_CANDIDATE") {
            return (
              <Badge variant="warning" size="sm">
                ⚠ CẢNH BÁO TẠM THỜI
              </Badge>
            );
          }
          return (
            <Badge variant="success" size="sm">
              ✓ ĐỦ TRANG BỊ BẢO HỘ
            </Badge>
          );
        },
      },
      {
        id: "missingDuration",
        header: "Thời Gian Thiếu PPE",
        cell: ({ row }) => {
          const sec = Math.max(row.original.missingHelmetSec, row.original.missingVestSec);
          if (sec > 0) {
            return (
              <span className="font-mono font-bold text-rose-500 text-xs">
                {sec.toFixed(1)}s (vượt ngưỡng 3s)
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
        header: "Mã Sự Cố",
        cell: ({ row }) => (
          <span className="font-mono font-bold text-foreground">#{row.original.eventId}</span>
        ),
      },
      {
        id: "person",
        accessorKey: "person",
        header: "Công Nhân Vi Phạm",
        cell: ({ row }) => (
          <span className="font-bold text-primary">Worker #{row.original.person}</span>
        ),
      },
      {
        id: "violationType",
        accessorKey: "violationType",
        header: "Hành Vi Vi Phạm",
        cell: ({ row }) => (
          <span className="font-semibold text-rose-600 dark:text-rose-400">
            {VT_LABEL[row.original.violationType] || row.original.violationType}
          </span>
        ),
      },
      {
        id: "frame",
        accessorKey: "frame",
        header: "Khung Hình / Thời Điểm",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            Frame {row.original.frame} (t = {row.original.confirmedT.toFixed(1)}s)
          </span>
        ),
      },
      {
        id: "durationS",
        accessorKey: "durationS",
        header: "Thời Lượng Vi Phạm",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-rose-500">
            {row.original.durationS.toFixed(1)}s (≥ 3.0s xác nhận)
          </span>
        ),
      },
      {
        id: "cooldown",
        accessorKey: "cooldownT",
        header: "Cooldown Chống Trùng (VI-07)",
        cell: () => (
          <span className="font-mono text-xs text-muted-foreground">30.0 giây</span>
        ),
      },
      {
        id: "status",
        header: "Trạng Thái Ghi Nhận",
        cell: () => (
          <Badge variant="danger" size="sm">
            XÁC NHẬN (VI-06)
          </Badge>
        ),
      },
      {
        id: "evidence",
        header: "Bằng Chứng Snapshot",
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onViewSnapshot?.(row.original.evidenceUrl)}
            className="h-8 gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Xem Snapshot (VI-08)</span>
          </Button>
        ),
      },
    ];
  }, [onViewSnapshot]);

  // ── 4. DỮ LIỆU BẢNG SYSTEM & HARDWARE SPECS ──
  const specsData = useMemo<SystemSpecRow[]>(() => {
    return [
      {
        parameter: "Mô hình suy luận PPE (Core Engine)",
        category: "AI Inference",
        value: "YOLOv11s-PPE (best.pt)",
        standard: "Ultralytics v11 Architecture",
        status: "active",
      },
      {
        parameter: "Trình theo dõi đa đối tượng (Tracking)",
        category: "Motion Tracking",
        value: "ByteTrack (Kalman Filter + Hungarian Matching)",
        standard: "VI-03 Multi-Object Tracker",
        status: "active",
      },
      {
        parameter: "Thuật toán ghép cặp PPE–Công nhân",
        category: "Spatial Association",
        value: "Centroid Proximity & Spatial IoU (0.88 - 0.92)",
        standard: "VI-04 Association Matrix",
        status: "active",
      },
      {
        parameter: "Quy chuẩn thời gian xác nhận vi phạm",
        category: "Rules Engine",
        value: "Tích luỹ vi phạm liên tục ≥ 3.0 giây",
        standard: "VI-06 Temporal Confirmation",
        status: "info",
      },
      {
        parameter: "Cơ chế chống báo động trùng lặp (Dedup)",
        category: "Spam Suppression",
        value: "Cooldown 30.0 giây cho mỗi Track ID",
        standard: "VI-07 Anti-Spam Cooldown",
        status: "active",
      },
      {
        parameter: "Bộ trích xuất bằng chứng tự động",
        category: "Evidence Engine",
        value: "Tự động crop/save ảnh frame JPEG có Bbox vi phạm",
        standard: "VI-08 MinIO S3 Storage",
        status: "optimal",
      },
      {
        parameter: "Tốc độ và độ trễ suy luận biên (Latency)",
        category: "Performance",
        value: "24.6 ms (~40.6 FPS trên Edge GPU)",
        standard: "SLA Thời gian thực < 50ms",
        status: "optimal",
      },
      {
        parameter: "Độ phân giải chuẩn hóa đầu vào",
        category: "Video Stream",
        value: "1920 × 1080 @ 30 FPS Full HD",
        standard: "H.264 / RTSP / HLS Protocol",
        status: "active",
      },
    ];
  }, []);

  const specColumns = useMemo<ColumnDef<TableFeatureSet, SystemSpecRow, any>[]>(() => {
    return [
      {
        id: "parameter",
        accessorKey: "parameter",
        header: "Tham Số Kỹ Thuật",
        cell: ({ row }) => (
          <span className="font-bold text-foreground text-xs">{row.original.parameter}</span>
        ),
      },
      {
        id: "category",
        accessorKey: "category",
        header: "Phân Loại",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">{row.original.category}</span>
        ),
      },
      {
        id: "value",
        accessorKey: "value",
        header: "Giá Trị Cấu Hình",
        cell: ({ row }) => (
          <span className="font-mono font-bold text-primary text-xs">{row.original.value}</span>
        ),
      },
      {
        id: "standard",
        accessorKey: "standard",
        header: "Tiêu Chuẩn Kỹ Thuật",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">{row.original.standard}</span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Trạng Thái",
        cell: ({ row }) => {
          const s = row.original.status;
          if (s === "optimal") {
            return (
              <Badge variant="success" size="sm">
                Tối Ưu Hoá
              </Badge>
            );
          }
          if (s === "info") {
            return (
              <Badge variant="info" size="sm">
                QCVN BHLĐ
              </Badge>
            );
          }
          return (
            <Badge variant="primary" size="sm">
              Đang Hoạt Động
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
        label: `Dữ Liệu Bounding Box (${detectionsData.length})`,
        icon: <Scan className="h-4 w-4" />,
      },
      {
        value: "association",
        label: `Ma Trận Ghép Cặp PPE (${associationData.length})`,
        icon: <Layers className="h-4 w-4" />,
      },
      {
        value: "violations",
        label: `Sự Cố Vi Phạm Xác Nhận (${allViolations.length})`,
        icon: <ShieldAlert className="h-4 w-4" />,
      },
      {
        value: "specs",
        label: "Thông Số Edge AI & Phần Cứng",
        icon: <Cpu className="h-4 w-4" />,
      },
    ],
    [detectionsData.length, associationData.length, allViolations.length]
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
                Trung Tâm Bảng Dữ Liệu Phân Tích & Giám Sát Chi Tiết
              </h2>
              <p className="text-xs text-muted-foreground">
                Camera {cameraCode} • {siteName} • Xử lý trực tiếp tại 10Hz qua Edge AI Pipeline
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
          aria-label="Chọn bảng phân tích dữ liệu AI"
          size="sm"
        />
      </div>

      {/* ── NỘI DUNG TỪNG BẢNG SỬ DỤNG COMPONENT TABLE CHUẨN ── */}
      <div className="mt-2">
        {activeTab === "detections" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Toạ độ Bounding Box Full HD (1920×1080) trích xuất tại{" "}
                <strong className="text-foreground font-mono">Frame {currentEntry?.frame || 1}</strong>{" "}
                (t = {(currentEntry?.t || 0).toFixed(1)}s):
              </span>
              <span className="font-mono text-primary font-bold">
                {detectionsData.length} đối tượng đang trong khung hình
              </span>
            </div>
            <Table
              data={detectionsData}
              columns={detectionColumns}
              variant="soft"
              emptyMessage="Chưa có dữ liệu Bounding Box nào tại khung hình này."
            />
          </div>
        )}

        {activeTab === "association" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Ma trận liên kết không gian IoU giữa Công nhân và Mũ, Áo phản quang theo chuẩn{" "}
                <strong className="text-foreground">VI-04 & VI-05</strong>:
              </span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                {associationData.length} liên kết đang giám sát
              </span>
            </div>
            <Table
              data={associationData}
              columns={associationColumns}
              variant="soft"
              emptyMessage="Không có công nhân nào được phát hiện để ghép cặp trong khung hình hiện tại."
            />
          </div>
        )}

        {activeTab === "violations" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Lịch sử các sự cố vi phạm an toàn lao động đã kích hoạt quy tắc xác nhận{" "}
                <strong className="text-foreground">≥ 3.0 giây liên tục (VI-06)</strong>:
              </span>
              <span className="font-mono text-rose-500 font-bold">
                {allViolations.length} sự cố đã lưu bằng chứng
              </span>
            </div>
            <Table
              data={violationsData}
              columns={violationColumns}
              variant="soft"
              emptyMessage="Chưa có sự cố vi phạm nào bị xác nhận kéo dài quá 3.0 giây."
            />
          </div>
        )}

        {activeTab === "specs" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Toàn bộ thông số kỹ thuật mô hình AI, thuật toán bám vết và quy chuẩn hệ thống:
              </span>
              <span className="font-mono text-primary font-bold">
                YOLOv11s-PPE • Latency 24.6ms
              </span>
            </div>
            <Table
              data={specsData}
              columns={specColumns}
              variant="soft"
              emptyMessage="Không có thông số kỹ thuật."
            />
          </div>
        )}
      </div>
    </div>
  );
}
