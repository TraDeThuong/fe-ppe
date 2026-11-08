"use client";
import { Table } from "@/components/ui/table";

import { memo, useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Activity, Cpu, ExternalLink, Eye, Scan, ShieldAlert, Sliders } from "lucide-react";
import { type TableProps, type TableFeatureSet } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useLocale } from "@/providers/locale-provider";
import { incidentService } from "@/services/incident.service";
import type { CameraItem, IncidentItem } from "@/types";
import type { AiInspectionConfig, ViolationEvent } from "./types";

export interface CameraTelemetryTablesProps {
  cameraId: string;
  camera?: CameraItem | null;
  siteName?: string;
  zoneName?: string;
  safetyConfig?: Partial<AiInspectionConfig>;
  activeModelName?: string;
  realIncidents: IncidentItem[];
  incidentsTableState?: Partial<TableProps<IncidentItem>>;
  totalIncidents?: number;
  isIncidentsLoading: boolean;
  fps?: number;
  resolution?: string;
  streamType?: string;
  liveViolations?: ViolationEvent[];
  onSeekToFrame?: (frame: number) => void;
  onViewSnapshot?: (url: string) => void;
  onOpenRoiDrawer?: () => void;
  onOpenHealthDialog?: () => void;
  onOpenAiModal?: () => void;
  onResetSessionLog?: () => void;
}

// Bảng ánh xạ nhãn vi phạm chuẩn hóa
const VT_LABEL: Record<string, { vi: string; en: string }> = {
  NO_HELMET: { vi: "Không đội mũ bảo hộ", en: "No Hard Hat" },
  no_helmet: { vi: "Không đội mũ bảo hộ", en: "No Hard Hat" },
  NO_VEST: { vi: "Không mặc áo phản quang", en: "No Safety Vest" },
  no_safety_vest: { vi: "Không mặc áo phản quang", en: "No Safety Vest" },
  RESTRICTED_AREA: { vi: "Xâm nhập vùng cấm", en: "Restricted Area Breach" },
  restricted_area: { vi: "Xâm nhập vùng cấm", en: "Restricted Area Breach" },
  UNAUTHORIZED_ENTRY: { vi: "Xâm nhập trái phép", en: "Unauthorized Entry" },
  MULTI_VIOLATION: { vi: "Vi phạm đa lỗi", en: "Multiple Violations" },
  NO_PPE: { vi: "Không trang bị bảo hộ", en: "Missing PPE" },
  no_ppe: { vi: "Không trang bị bảo hộ", en: "Missing PPE" },
};

function formatDate(dateInput?: string | Date | null, loc: string = "vi-VN"): string {
  if (!dateInput) return "—";
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat(loc, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",

    }).format(d);
  } catch {
    return "—";
  }
}

function EvidenceButtonCell({
  incident,
  cameraId,
  isVietnamese,
  onViewSnapshot,
}: {
  incident: IncidentItem;
  cameraId: string;
  isVietnamese: boolean;
  onViewSnapshot?: (url: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const ev = incident.evidences?.[0];

  const handleClick = async () => {
    // 1. Snapshot URL hoặc Evidence URL đã ký sẵn
    if (incident.snapshotUrl) {
      onViewSnapshot?.(incident.snapshotUrl);
      return;
    }
    if (ev?.url) {
      onViewSnapshot?.(ev.url);
      return;
    }

    // 2. Tự động ánh xạ từ storageKey trên MinIO
    if (ev?.storageKey) {
      const minioEndpoint = "http://localhost:9000";
      const directUrl = `${minioEndpoint}/ppe-evidences/${ev.storageKey}`;
      onViewSnapshot?.(directUrl);
      return;
    }

    // 3. Nếu có evidence ID, gọi API lấy presigned download URL
    if (ev?.id) {
      try {
        setLoading(true);
        const res = await incidentService.getEvidenceDownloadUrl(ev.id);
        if (res?.downloadUrl) {
          onViewSnapshot?.(res.downloadUrl);
          return;
        }
      } catch (err) {
        console.warn("Không thể tải presigned URL cho evidence:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const hasEvidence = Boolean(
    incident.snapshotUrl ||
    ev?.url ||
    ev?.storageKey ||
    ev?.id
  );

  if (!hasEvidence) {
    return <span className="text-muted-foreground text-xs italic">—</span>;
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleClick}
      disabled={loading}
      className="h-7 gap-1 text-[11px] text-primary border-primary/30 hover:bg-primary/10"
    >
      <Eye className="h-3 w-3" />
      <span>{loading ? "..." : isVietnamese ? "Xem ảnh" : "View"}</span>
    </Button>
  );
}

export function CameraTelemetryTablesComponent({
  cameraId,
  camera,
  siteName = "Công Trường Xây Dựng",
  zoneName = "Khu vực chung",
  safetyConfig,
  activeModelName = "YOLOv11s-PPE (best.pt)",
  realIncidents,
  incidentsTableState,
  totalIncidents,
  isIncidentsLoading,
  fps = 25,
  resolution,
  streamType,
  liveViolations = [],
  onSeekToFrame,
  onViewSnapshot,
  onOpenRoiDrawer,
  onOpenHealthDialog,
  onOpenAiModal,
  onResetSessionLog,
}: CameraTelemetryTablesProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const isSandbox = cameraId === "ai-sandbox";
  const [activeTab, setActiveTab] = useState<"incidents" | "rules" | "diagnostics">("incidents");
  const [incidentSubTab, setIncidentSubTab] = useState<"db" | "live">(isSandbox ? "live" : "db");

  const effectiveTotalIncidents = totalIncidents ?? realIncidents.length;

  const getViolationName = (type: string) => {
    const item = VT_LABEL[type];
    if (item) return isVietnamese ? item.vi : item.en;
    return type.replace(/_/g, " ").toUpperCase();
  };

  // Cột cho bảng Sự cố thực tế từ Database
  const incidentColumns = useMemo<ColumnDef<TableFeatureSet, IncidentItem, any>[]>(() => {
    return [
      {
        id: "id",
        accessorKey: "id",
        header: isVietnamese ? "Mã Sự Cố" : "Incident ID",
        cell: ({ row }) => (
          <Link
            href={`/incidents/${row.original.id}`}
            className="flex items-center gap-1.5 font-mono text-xs font-bold text-primary hover:underline"
            title={isVietnamese ? "Mở hồ sơ sự cố" : "Open incident profile"}
          >
            <span>#{row.original.id.slice(0, 8)}</span>
          </Link>
        ),

      },
      {
        id: "violationType",
        accessorKey: "violationType",
        header: isVietnamese ? "Loại Vi Phạm" : "Violation Type",
        cell: ({ row }) => {
          const type = row.original.violationType;
          return (
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-rose-500 shrink-0" />
              <span className="font-semibold text-rose-600 dark:text-rose-400 text-xs">
                {getViolationName(type)}
              </span>
            </div>
          );
        },

      },
      {
        id: "severity",
        accessorKey: "severity",
        header: isVietnamese ? "Mức Độ" : "Severity",
        cell: ({ row }) => {
          const sev = (row.original.severity || "MEDIUM").toUpperCase();
          const variant =
            sev === "CRITICAL" || sev === "HIGH"
              ? "danger"
              : sev === "MEDIUM"
                ? "warning"
                : "info";
          return (
            <Badge variant={variant} size="sm">
              {sev}
            </Badge>
          );
        },

      },
      {
        id: "status",
        accessorKey: "status",
        header: isVietnamese ? "Trạng Thái" : "Status",
        cell: ({ row }) => {
          const st = row.original.status || "PENDING_REVIEW";
          let label = st;
          let variant: "danger" | "warning" | "success" | "default" = "warning";

          if (st === "PENDING_REVIEW") {
            label = isVietnamese ? "Chờ xử lý" : "Pending";
            variant = "warning";
          } else if (st === "CONFIRMED") {
            label = isVietnamese ? "Đã xác nhận" : "Confirmed";
            variant = "danger";
          } else if (st === "RESOLVED") {
            label = isVietnamese ? "Đã khắc phục" : "Resolved";
            variant = "success";
          } else if (st === "CLOSED") {
            label = isVietnamese ? "Đã đóng" : "Closed";
            variant = "default";
          } else if (st === "DISMISSED") {
            label = isVietnamese ? "Bỏ qua" : "Dismissed";
            variant = "default";
          }

          return (
            <Badge variant={variant} size="sm">
              {label}
            </Badge>
          );
        },

      },
      {
        id: "detectedAt",
        accessorKey: "detectedAt",
        header: isVietnamese ? "Thời Điểm Phát Hiện" : "Detected At",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {formatDate(row.original.detectedAt, locale)}
          </span>
        ),

      },
      {
        id: "confidence",
        accessorKey: "confidence",
        header: isVietnamese ? "Độ Tin Cậy" : "Confidence",
        cell: ({ row }) => {
          const conf = row.original.confidence;
          if (conf != null) {
            return (
              <span className="font-mono text-xs font-semibold text-foreground">
                {(conf * 100).toFixed(0)}%
              </span>
            );
          }
          const thresholdPercent = Math.round((safetyConfig?.confidenceThreshold ?? 0.8) * 100);
          return (
            <span
              className="font-mono text-xs text-muted-foreground"
              title={isVietnamese ? `Đã vượt ngưỡng tối thiểu ${thresholdPercent}% khi ghi nhận` : `Exceeded ${thresholdPercent}% min threshold`}
            >
              ≥ {thresholdPercent}%
            </span>
          );
        },

      },
      {
        id: "evidence",
        header: isVietnamese ? "Ảnh Bằng Chứng" : "Evidence",
        cell: ({ row }) => (
          <EvidenceButtonCell
            incident={row.original}
            cameraId={cameraId}
            isVietnamese={isVietnamese}
            onViewSnapshot={onViewSnapshot}
          />
        ),

      },
      {
        id: "action",
        header: isVietnamese ? "Chi Tiết" : "Action",
        cell: ({ row }) => (
          <Link
            href={`/incidents/${row.original.id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            title={isVietnamese ? "Mở chi tiết sự cố này" : "Open incident detail"}
          >
            <span>{isVietnamese ? "Hồ sơ" : "Detail"}</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        ),

      },
    ];
  }, [isVietnamese, locale, safetyConfig?.confidenceThreshold, onViewSnapshot]);

  // Tab Options - Tiêu đề ổn định, không gắn chuỗi số đếm động làm co dãn nút Tab
  const tabOptions = useMemo(
    () => [
      {
        value: "incidents",
        label: isVietnamese ? "Lịch Sử Sự Cố & Vi Phạm" : "Incidents & Violations",
        icon: <ShieldAlert className="h-4 w-4" />,

      },
      {
        value: "rules",
        label: isVietnamese ? "Quy Tắc An Toàn & Vùng ROI" : "Safety Rules & ROI",
        icon: <Sliders className="h-4 w-4" />,

      },
      {
        value: "diagnostics",
        label: isVietnamese ? "Thông Số Kỹ Thuật & Luồng" : "Stream & Specs",
        icon: <Cpu className="h-4 w-4" />,

      },
    ],
    [isVietnamese]
  );

  // Trạng thái kết nối chuẩn xác
  const cameraStatusVariant: "success" | "warning" | "danger" | "default" = useMemo(() => {
    if (!camera) return "default";
    switch (camera.status) {
      case "ONLINE":
        return "success";
      case "CONNECTING":
        return "warning";
      case "MAINTENANCE":
        return "default";
      case "ERROR":
      case "OFFLINE":
      default:
        return "danger";
    }
  }, [camera]);

  const hasRoiPolygon = Array.isArray(camera?.config?.roiPolygon) && camera.config.roiPolygon.length >= 3;

  return (
    <div className="rounded-[24px] border border-border/40 bg-surface p-5 shadow-[0_-1px_0_rgba(0,0,0,0.025)_inset,8px_10px_20px_var(--shadow-dark),-8px_-8px_20px_var(--shadow-light)] space-y-4">
      {/* ── HEADER PHÂN VÙNG DỮ LIỆU BẢNG ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/30 pb-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[inset_1px_1px_3px_var(--shadow-dark)]">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-foreground">
                {isVietnamese
                  ? "Trung Tâm Dữ Liệu & Chẩn Đoán Chi Tiết"
                  : "Camera Diagnostics & Incidents History"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {camera?.code || cameraId} • {camera?.name || "Camera"} • {siteName} • {zoneName}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenHealthDialog && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenHealthDialog}
              className="gap-1.5 text-xs h-8 rounded-xl border-border/40"
              title={isVietnamese ? "Kiểm tra độ trễ mạng và ping camera" : "Ping camera health"}
            >
              <Activity className="h-3.5 w-3.5 text-emerald-500" />
              <span>{isVietnamese ? "Ping Kiểm Tra" : "Ping Health"}</span>
            </Button>
          )}

          {onOpenRoiDrawer && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenRoiDrawer}
              className="gap-1.5 text-xs h-8 rounded-xl border-border/40"
              title={isVietnamese ? "Vẽ vùng cảnh báo an toàn ROI trên camera" : "Configure ROI Zone"}
            >
              <Scan className="h-3.5 w-3.5 text-primary" />
              <span>{isVietnamese ? "Vùng ROI" : "ROI Zone"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── SEGMENTED CONTROL CHỌN TAB ── */}
      <div className="overflow-x-auto pb-1">
        <SegmentedControl
          options={tabOptions}
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as any)}
          aria-label={isVietnamese ? "Chọn tab thông tin" : "Select info tab"}
          size="sm"
        />
      </div>

      {/* ── NỘI DUNG TỪNG TAB ── */}
      <div className="pt-1">
        {/* TAB 1: SỰ CỐ THỰC TẾ & VI PHẠM TRỰC TIẾP */}
        <Table
          surface="embedded"
          data={realIncidents}
          features={{
            sorting: false,
            globalFilter: false,
            rowSelection: false
          }}
          getRowId={incident => incident.id}
          {...incidentsTableState}
          columns={incidentColumns}
          variant="soft"
          hideTopHighlight
          loading={isIncidentsLoading}
          emptyMessage={
            isVietnamese ? "Không có dữ liệu sự cố." : "No incidents available."
          }
        />

        {/* TAB 2: CẤU HÌNH QUY TẮC AN TOÀN & VÙNG ROI */}
        {activeTab === "rules" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {isVietnamese
                  ? "Cấu hình quy chuẩn an toàn lao động và cửa sổ thời gian đang áp dụng cho camera này:"
                  : "PPE safety standards & temporal rules applied to this camera feed:"}
              </span>
              {onOpenAiModal && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onOpenAiModal}
                  className="h-7 text-xs text-primary border-primary/30"
                >
                  <Cpu className="h-3 w-3" />
                  <span>{isVietnamese ? "Tinh chỉnh tham số AI" : "Tune Parameters"}</span>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Ngưỡng tin cậy */}
              <div className="rounded-xl border border-border/30 bg-background/50 p-3 space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium block">
                  {isVietnamese ? "Ngưỡng tin cậy AI (Confidence Min)" : "Confidence Threshold"}
                </span>
                <span className="text-base font-extrabold font-mono text-foreground block">
                  {Math.round((safetyConfig?.confidenceThreshold ?? 0.8) * 100)}%
                </span>
                <p className="text-[10px] text-muted-foreground">
                  {isVietnamese
                    ? "Chỉ ghi nhận khi xác suất nhận diện vượt ngưỡng này"
                    : "Only records if inference confidence exceeds this threshold"}
                </p>
              </div>

              {/* Thời gian xác nhận */}
              <div className="rounded-xl border border-border/30 bg-background/50 p-3 space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium block">
                  {isVietnamese ? "Thời gian xác nhận (Confirmation Window)" : "Confirmation Duration"}
                </span>
                <span className="text-base font-extrabold font-mono text-rose-500 block">
                  ≥ {(safetyConfig?.confirmationDuration ?? 3.0).toFixed(1)}s (VI-06)
                </span>
                <p className="text-[10px] text-muted-foreground">
                  {isVietnamese
                    ? "Công nhân phải thiếu PPE liên tục qua ngưỡng này mới kích hoạt vi phạm"
                    : "Sustained violation temporal accumulation rule"}
                </p>
              </div>

              {/* Cooldown chống spam */}
              <div className="rounded-xl border border-border/30 bg-background/50 p-3 space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium block">
                  {isVietnamese ? "Chống báo động lặp (Anti-Spam Cooldown)" : "Cooldown Duration"}
                </span>
                <span className="text-base font-extrabold font-mono text-foreground block">
                  {safetyConfig?.cooldownDuration ?? 30}s (VI-07)
                </span>
                <p className="text-[10px] text-muted-foreground">
                  {isVietnamese
                    ? "Không gửi cảnh báo trùng lặp cho cùng một đối tượng trong thời gian cooldown"
                    : "Suppresses repetitive alerts for the same person"}
                </p>
              </div>

              {/* Luật kiểm tra Mũ */}
              <div className="rounded-xl border border-border/30 bg-background/50 p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    {isVietnamese ? "Kiểm tra Mũ bảo hộ" : "Hard Hat Detection"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {isVietnamese ? "QCVN 06:2012/BLĐTBXH" : "Safety Standard"}
                  </span>
                </div>
                <Badge variant={safetyConfig?.enableNoHelmet !== false ? "success" : "default"}>
                  {safetyConfig?.enableNoHelmet !== false ? "BẬT (ACTIVE)" : "TẮT (OFF)"}
                </Badge>
              </div>

              {/* Luật kiểm tra Áo */}
              <div className="rounded-xl border border-border/30 bg-background/50 p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    {isVietnamese ? "Kiểm tra Áo phản quang" : "Safety Vest Detection"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {isVietnamese ? "Trang bị phản quang công trường" : "High-visibility vest rule"}
                  </span>
                </div>
                <Badge variant={safetyConfig?.enableNoVest !== false ? "success" : "default"}>
                  {safetyConfig?.enableNoVest !== false ? "BẬT (ACTIVE)" : "TẮT (OFF)"}
                </Badge>
              </div>

              {/* Luật kiểm tra Xâm nhập Vùng cấm */}
              <div className="rounded-xl border border-border/30 bg-background/50 p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    {isVietnamese ? "Giám sát Vùng cấm (Restricted Area)" : "Restricted Zone Rule"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {isVietnamese ? "Cảnh báo xâm nhập đa giác" : "Zone perimeter breach"}
                  </span>
                </div>
                <Badge variant={safetyConfig?.enableRestrictedArea !== false ? "success" : "default"}>
                  {safetyConfig?.enableRestrictedArea !== false ? "BẬT (ACTIVE)" : "TẮT (OFF)"}
                </Badge>
              </div>

              {/* Vùng cảnh báo ROI */}
              <div className="rounded-xl border border-border/30 bg-background/50 p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    {isVietnamese ? "Vùng cấm an toàn (ROI Polygon)" : "Restricted ROI Zone"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {hasRoiPolygon
                      ? `${camera!.config!.roiPolygon!.length} điểm toạ độ`
                      : isVietnamese
                        ? "Chưa cấu hình đa giác"
                        : "No polygon defined"}
                  </span>
                </div>
                {onOpenRoiDrawer && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onOpenRoiDrawer}
                    className="h-7 text-xs text-primary border-primary/30"
                  >
                    <Scan className="h-3 w-3" />
                    <span>{isVietnamese ? "Vẽ vùng" : "Configure"}</span>
                  </Button>
                )}
              </div>

              {/* Tốc độ xử lý khung hình AI */}
              <div className="rounded-xl border border-border/30 bg-background/50 p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    {isVietnamese ? "Tốc độ trích xuất AI" : "AI Inference Rate"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {isVietnamese ? "Khung hình phân tích mỗi giây" : "Processing rate"}
                  </span>
                </div>
                <span className="font-mono text-xs font-bold text-primary">
                  {camera?.config?.captureFps ?? safetyConfig?.processFps ?? fps ?? 25} FPS
                </span>
              </div>

              {/* Độ nhạy phát hiện chuyển động */}
              <div className="rounded-xl border border-border/30 bg-background/50 p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    {isVietnamese ? "Độ nhạy chuyển động" : "Motion Sensitivity"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {isVietnamese ? "Ngưỡng phát hiện biến động" : "Motion trigger threshold"}
                  </span>
                </div>
                <span className="font-mono text-xs font-bold text-foreground">
                  {camera?.config?.motionSensitivity ?? 75}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: THÔNG SỐ KỸ THUẬT & CHẨN ĐOÁN LUỒNG */}
        {activeTab === "diagnostics" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {isVietnamese
                  ? "Thông số kỹ thuật phần cứng, giao thức kết nối và tình trạng vận hành thực tế:"
                  : "Hardware specs, connection protocol, and operational telemetry:"}
              </span>
              {onOpenHealthDialog && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onOpenHealthDialog}
                  className="h-7 text-xs text-emerald-500 border-emerald-500/30"
                >
                  <Activity className="h-3 w-3" />
                  <span>{isVietnamese ? "Chạy kiểm tra Ping" : "Run Ping"}</span>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-border/30 bg-background/50 p-4 space-y-3 font-mono">
                <div className="flex items-center justify-between border-b border-border/20 pb-2">
                  <span className="text-muted-foreground font-sans">{isVietnamese ? "Mã Camera:" : "Camera Code:"}</span>
                  <span className="font-bold text-foreground">{camera?.code || cameraId}</span>
                </div>

                <div className="flex items-center justify-between border-b border-border/20 pb-2">
                  <span className="text-muted-foreground font-sans">{isVietnamese ? "Trạng thái kết nối:" : "Status:"}</span>
                  {!camera ? (
                    <span className="text-muted-foreground text-xs italic">
                      {isVietnamese ? "Đang nạp..." : "Loading..."}
                    </span>
                  ) : (
                    <Badge variant={cameraStatusVariant} size="sm">
                      {camera.status}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between border-b border-border/20 pb-2">
                  <span className="text-muted-foreground font-sans">{isVietnamese ? "Giao thức stream:" : "Protocol:"}</span>
                  <span className="text-foreground">
                    {camera?.sourceType || "RTSP"}
                    {streamType && (
                      <span className="text-[10px] text-muted-foreground ml-1.5 font-sans">
                        (Phát: {streamType === "youtube_video" || streamType === "youtube_shorts" ? "YouTube Embed" : streamType === "webcam" ? "Webcam Live" : streamType === "html5_video" ? "HTML5 Native Video" : "RTSP / HLS"})
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-border/20 pb-2">
                  <span className="text-muted-foreground font-sans">{isVietnamese ? "Tốc độ khung hình (FPS):" : "Frame Rate:"}</span>
                  <span className="font-bold text-cyan-500">{fps.toFixed(1)} FPS</span>
                </div>

                <div className="flex items-center justify-between border-b border-border/20 pb-2">
                  <span className="text-muted-foreground font-sans">{isVietnamese ? "Độ phân giải luồng:" : "Stream Resolution:"}</span>
                  <span className="font-bold text-foreground">
                    {resolution || camera?.streams?.[0]?.resolution || camera?.config?.resolution || "1920 × 1080"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-sans">{isVietnamese ? "Độ trễ đường truyền:" : "Stream Latency:"}</span>
                  <span className="font-bold text-emerald-500">
                    {camera?.currentLatencyMs != null
                      ? `${camera.currentLatencyMs}ms`
                      : isVietnamese
                        ? "— (Nhấn Ping Kiểm Tra)"
                        : "— (Run Ping to Test)"}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-border/30 bg-background/50 p-4 space-y-3 font-mono">
                <div className="flex items-center justify-between border-b border-border/20 pb-2">
                  <span className="text-muted-foreground font-sans">{isVietnamese ? "Công trường trực thuộc:" : "Site:"}</span>
                  <span className="font-bold text-foreground font-sans">{siteName}</span>
                </div>

                <div className="flex items-center justify-between border-b border-border/20 pb-2">
                  <span className="text-muted-foreground font-sans">{isVietnamese ? "Phân khu giám sát:" : "Zone:"}</span>
                  <span className="text-foreground font-sans">{zoneName}</span>
                </div>

                <div className="flex items-center justify-between border-b border-border/20 pb-2">
                  <span className="text-muted-foreground font-sans">{isVietnamese ? "Vị trí lắp đặt:" : "Location:"}</span>
                  <span className="text-foreground font-sans">{camera?.location || (isVietnamese ? "Chưa cập nhật" : "Not specified")}</span>
                </div>

                <div className="flex items-center justify-between border-b border-border/20 pb-2">
                  <span className="text-muted-foreground font-sans">{isVietnamese ? "Mô hình AI suy luận:" : "AI Model:"}</span>
                  <span className="font-bold text-primary">{activeModelName}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-sans">{isVietnamese ? "Lưu trữ bằng chứng:" : "Evidence Storage:"}</span>
                  <span className="text-emerald-500 font-semibold">MinIO S3 Buckets / Local Cache</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const CameraTelemetryTables = memo(CameraTelemetryTablesComponent);
