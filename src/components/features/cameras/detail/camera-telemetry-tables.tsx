"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Activity,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Cpu,
  ExternalLink,
  Eye,
  HardHat,
  Layers,
  MapPin,
  Radio,
  Scan,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  User,
  Wifi,
} from "lucide-react";
import { Table, type TableFeatureSet } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useLocale } from "@/providers/locale-provider";
import type { CameraItem, IncidentItem, IncidentSeverity, IncidentStatus, ViolationType } from "@/types";
import type { AiInspectionConfig } from "./types";

export interface CameraTelemetryTablesProps {
  cameraId: string;
  camera?: CameraItem | null;
  siteName?: string;
  safetyConfig?: Partial<AiInspectionConfig>;
  activeModelName?: string;
  realIncidents: IncidentItem[];
  isIncidentsLoading: boolean;
  onViewSnapshot?: (url: string) => void;
  onOpenRoiDrawer?: () => void;
  onOpenHealthDialog?: () => void;
  onOpenAiModal?: () => void;
}

// Bảng ánh xạ nhãn vi phạm
const VT_LABEL: Record<string, { vi: string; en: string }> = {
  NO_HELMET: { vi: "Không đội mũ bảo hộ", en: "No Hard Hat" },
  no_helmet: { vi: "Không đội mũ bảo hộ", en: "No Hard Hat" },
  NO_VEST: { vi: "Không mặc áo phản quang", en: "No Safety Vest" },
  no_safety_vest: { vi: "Không mặc áo phản quang", en: "No Safety Vest" },
  RESTRICTED_AREA: { vi: "Xâm nhập vùng cấm", en: "Restricted Area Breach" },
  restricted_area: { vi: "Xâm nhập vùng cấm", en: "Restricted Area Breach" },
  MULTI_VIOLATION: { vi: "Vi phạm đa lỗi", en: "Multiple Violations" },
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

export function CameraTelemetryTables({
  cameraId,
  camera,
  siteName = "Công Trường Xây Dựng",
  safetyConfig,
  activeModelName = "YOLOv11s-PPE (best.pt)",
  realIncidents,
  isIncidentsLoading,
  onViewSnapshot,
  onOpenRoiDrawer,
  onOpenHealthDialog,
  onOpenAiModal,
}: CameraTelemetryTablesProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const [activeTab, setActiveTab] = useState<"incidents" | "rules" | "diagnostics">("incidents");

  const getViolationName = (type: string) => {
    const item = VT_LABEL[type];
    if (item) return isVietnamese ? item.vi : item.en;
    return type;
  };

  // Cột cho bảng Sự cố thực tế từ Database
  const incidentColumns = useMemo<ColumnDef<TableFeatureSet, IncidentItem, any>[]>(() => {
    return [
      {
        id: "id",
        accessorKey: "id",
        header: isVietnamese ? "Mã Sự Cố" : "Incident ID",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-foreground">
            <span className="text-primary font-bold">#{row.original.id.slice(0, 8)}</span>
          </div>
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
          const conf = row.original.confidence ?? 0.92;
          return (
            <span className="font-mono text-xs font-semibold text-foreground">
              {(conf * 100).toFixed(0)}%
            </span>
          );
        },
      },
      {
        id: "evidence",
        header: isVietnamese ? "Ảnh Bằng Chứng" : "Evidence",
        cell: ({ row }) => {
          const evidenceUrl =
            row.original.snapshotUrl ||
            row.original.evidences?.[0]?.url ||
            "/images/camera-live-evidence.jpg";

          return (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewSnapshot?.(evidenceUrl)}
              className="h-7 gap-1 text-[11px] text-primary border-primary/30 hover:bg-primary/10"
            >
              <Eye className="h-3 w-3" />
              <span>{isVietnamese ? "Xem ảnh" : "View"}</span>
            </Button>
          );
        },
      },
      {
        id: "action",
        header: isVietnamese ? "Chi Tiết" : "Action",
        cell: ({ row }) => (
          <Link
            href={`/incidents?search=${row.original.id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            title={isVietnamese ? "Mở chi tiết sự cố này" : "Open incident detail"}
          >
            <span>{isVietnamese ? "Hồ sơ" : "Detail"}</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        ),
      },
    ];
  }, [isVietnamese, locale, onViewSnapshot]);

  // Tab Options
  const tabOptions = useMemo(
    () => [
      {
        value: "incidents",
        label: isVietnamese
          ? `Lịch Sử Sự Cố DB (${realIncidents.length})`
          : `Database Incidents (${realIncidents.length})`,
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
    [realIncidents.length, isVietnamese]
  );

  return (
    <div className="rounded-[24px] border border-border/40 bg-surface p-5 shadow-[0_2px_0_rgba(255,255,255,0.85)_inset,0_-1px_0_rgba(0,0,0,0.025)_inset,8px_10px_20px_var(--shadow-dark),-8px_-8px_20px_var(--shadow-light)] space-y-4">
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
                {camera?.code || cameraId} • {camera?.name || "Camera"} • {siteName}
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
        {/* TAB 1: SỰ CỐ THỰC TẾ TỪ CƠ SỞ DỮ LIỆU */}
        {activeTab === "incidents" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {isVietnamese
                  ? "Danh sách các sự cố vi phạm được ghi nhận chính thức vào cơ sở dữ liệu từ camera này:"
                  : "Official violation incidents logged into database from this camera feed:"}
              </span>
              <Link
                href={`/incidents?cameraId=${cameraId}`}
                className="font-mono text-primary font-bold hover:underline flex items-center gap-1"
              >
                <span>{realIncidents.length} {isVietnamese ? "sự cố đã lưu" : "incidents stored"}</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>

            {realIncidents.length === 0 ? (
              <div className="rounded-2xl border border-border/30 bg-background/40 p-8 text-center space-y-2">
                <ShieldCheck className="mx-auto h-8 w-8 text-emerald-500" />
                <h4 className="font-bold text-foreground text-sm">
                  {isVietnamese
                    ? "Chưa có sự cố vi phạm nào trong cơ sở dữ liệu"
                    : "No Incidents Recorded in Database"}
                </h4>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  {isVietnamese
                    ? `Camera ${camera?.code || cameraId} chưa ghi nhận sự cố vi phạm nào hoặc các vi phạm trước đó đã được giải quyết xong.`
                    : `Camera ${camera?.code || cameraId} has no active recorded violations, or previous incidents have been resolved.`}
                </p>
              </div>
            ) : (
              <Table
                data={realIncidents}
                columns={incidentColumns}
                variant="soft"
                emptyMessage={
                  isVietnamese ? "Không có dữ liệu sự cố." : "No incidents available."
                }
              />
            )}
          </div>
        )}

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

              {/* Vùng cảnh báo ROI */}
              <div className="rounded-xl border border-border/30 bg-background/50 p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    {isVietnamese ? "Vùng cấm an toàn (ROI Polygon)" : "Restricted ROI Zone"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {camera?.config?.roiPolygon?.length
                      ? `${camera.config.roiPolygon.length} điểm toạ độ`
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
                  <Badge variant={camera?.status === "ONLINE" ? "success" : "danger"} size="sm">
                    {camera?.status || "ONLINE"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between border-b border-border/20 pb-2">
                  <span className="text-muted-foreground font-sans">{isVietnamese ? "Giao thức stream:" : "Protocol:"}</span>
                  <span className="text-foreground">{camera?.sourceType || "RTSP / HLS"}</span>
                </div>

                <div className="flex items-center justify-between border-b border-border/20 pb-2">
                  <span className="text-muted-foreground font-sans">{isVietnamese ? "Tốc độ khung hình (FPS):" : "Frame Rate:"}</span>
                  <span className="font-bold text-cyan-500">{camera?.currentFps ?? 30} FPS</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-sans">{isVietnamese ? "Độ trễ đường truyền:" : "Stream Latency:"}</span>
                  <span className="font-bold text-emerald-500">{camera?.currentLatencyMs ? `${camera.currentLatencyMs}ms` : "24.6ms (Edge AI)"}</span>
                </div>
              </div>

              <div className="rounded-xl border border-border/30 bg-background/50 p-4 space-y-3 font-mono">
                <div className="flex items-center justify-between border-b border-border/20 pb-2">
                  <span className="text-muted-foreground font-sans">{isVietnamese ? "Công trường trực thuộc:" : "Site:"}</span>
                  <span className="font-bold text-foreground font-sans">{siteName}</span>
                </div>

                <div className="flex items-center justify-between border-b border-border/20 pb-2">
                  <span className="text-muted-foreground font-sans">{isVietnamese ? "Vị trí lắp đặt:" : "Location:"}</span>
                  <span className="text-foreground font-sans">{camera?.location || "Chưa cập nhật"}</span>
                </div>

                <div className="flex items-center justify-between border-b border-border/20 pb-2">
                  <span className="text-muted-foreground font-sans">{isVietnamese ? "Phân khu giám sát:" : "Zone:"}</span>
                  <span className="text-foreground font-sans">{camera?.zoneName || "Khu vực chung"}</span>
                </div>

                <div className="flex items-center justify-between border-b border-border/20 pb-2">
                  <span className="text-muted-foreground font-sans">{isVietnamese ? "Mô hình AI suy luận:" : "AI Model:"}</span>
                  <span className="font-bold text-primary">{activeModelName}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-sans">{isVietnamese ? "Lưu trữ bằng chứng:" : "Evidence Storage:"}</span>
                  <span className="text-emerald-500 font-semibold">MinIO S3 Buckets</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
