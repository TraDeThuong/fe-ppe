"use client";

import { useMemo, useState } from "react";
import {
  Cctv,
  Zap,
  WifiOff,
  Radio,
  AlertTriangle,
  CheckCircle2,
  Building2,
  MapPin,
  ShieldCheck,
  Activity,
  Plus,
  X,
  ExternalLink,
  RefreshCw,
  Eye,
  Sliders,
  Copy,
  Check,
  ChevronRight,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Typography } from "@ui/typography";
import { useLocale } from "@/providers/locale-provider";
import { useSites } from "@/hooks/sites";
import type { CameraItem, CameraStatus } from "@/types";

function cn(...classes: Array<string | null | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

export type CameraStatKey = "fleetPulse" | "edgeTelemetry" | "signalDiagnostics";

export interface CameraStatsDetailPanelProps {
  /** Thống kê đang được chọn mở rộng */
  activeStat: CameraStatKey;
  /** Danh sách camera từ API */
  cameras: CameraItem[];
  /** Callback chuyển đổi giữa các tab thống kê */
  onSelectStat: (stat: CameraStatKey) => void;
  /** Callback đóng khung chi tiết */
  onClose: () => void;
  /** Callback lọc theo công trường */
  onFilterSite?: (siteId: string) => void;
  /** Callback lọc theo trạng thái */
  onFilterStatus?: (status: CameraStatus | "ALL") => void;
  /** Callback kiểm tra Ping camera */
  onPing?: (camera: CameraItem) => void;
  /** Callback mở cấu hình AI ROI */
  onOpenRoi?: (camera: CameraItem) => void;
  /** Callback mở chỉnh sửa camera */
  onEditCamera?: (camera: CameraItem) => void;
  /** Callback mở modal thêm camera mới */
  onCreateCamera?: () => void;
  /** Callback chuyển sang xem live */
  onViewLive?: (camera: CameraItem) => void;
}

export function CameraStatsDetailPanel({
  activeStat,
  cameras,
  onSelectStat,
  onClose,
  onFilterSite,
  onFilterStatus,
  onPing,
  onOpenRoi,
  onEditCamera,
  onCreateCamera,
  onViewLive,
}: CameraStatsDetailPanelProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  // Lấy danh sách công trường từ hook để map chi tiết
  const { data: sitesData } = useSites();
  const sites = sitesData?.items || [];

  // State lọc bên trong tab Telemetry
  const [telemetryFilter, setTelemetryFilter] = useState<
    "ALL" | "FAST" | "SLOW" | "HAS_ROI" | "NO_ROI"
  >("ALL");

  // State copy URL stream
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  // Tổng hợp dữ liệu số liệu
  const {
    total,
    online,
    offline,
    latencies,
    avgLatency,
    minLatency,
    maxLatency,
    hasRoiCount,
    protocolCounts,
    siteGroups,
    offlineCameras,
  } = useMemo(() => {
    const tot = cameras.length;
    let onl = 0;
    let offl = 0;
    const lats: number[] = [];
    let roiCount = 0;

    const protocols: Record<string, number> = {
      RTSP: 0,
      HLS: 0,
      WEBRTC: 0,
      OTHER: 0,
    };

    const siteMap: Record<
      string,
      {
        siteId: string;
        siteName: string;
        siteCode?: string;
        cameras: CameraItem[];
        onlineCount: number;
      }
    > = {};

    const offlCams: CameraItem[] = [];

    // Khởi tạo map từ sites
    for (const s of sites) {
      siteMap[s.id] = {
        siteId: s.id,
        siteName: s.name,
        siteCode: s.code,
        cameras: [],
        onlineCount: 0,
      };
    }

    for (const c of cameras) {
      if (c.status === "ONLINE") {
        onl++;
      } else {
        offl++;
        offlCams.push(c);
      }

      if (typeof c.currentLatencyMs === "number" && c.currentLatencyMs > 0) {
        lats.push(c.currentLatencyMs);
      }

      // Kiểm tra có config ROI hay không
      const hasCameraRoi = Boolean(
        (c.config?.roiPolygon && Array.isArray(c.config.roiPolygon) && c.config.roiPolygon.length > 0) ||
        ((c.config as any)?.roi_polygon && Array.isArray((c.config as any).roi_polygon) && (c.config as any).roi_polygon.length > 0)
      );
      if (hasCameraRoi) {
        roiCount++;
      }

      // Đếm giao thức
      const type = (c.sourceType || "").toUpperCase();
      if (type.includes("RTSP")) {
        protocols.RTSP = (protocols.RTSP || 0) + 1;
      } else if (type.includes("HLS")) {
        protocols.HLS = (protocols.HLS || 0) + 1;
      } else if (type.includes("WEBRTC")) {
        protocols.WEBRTC = (protocols.WEBRTC || 0) + 1;
      } else {
        protocols.OTHER = (protocols.OTHER || 0) + 1;
      }

      // Group theo Site
      const targetSiteId = c.siteId || "unassigned";
      if (!siteMap[targetSiteId]) {
        siteMap[targetSiteId] = {
          siteId: targetSiteId,
          siteName: c.siteName || (isVietnamese ? "Chưa gán công trường" : "Unassigned Site"),
          siteCode: "N/A",
          cameras: [],
          onlineCount: 0,
        };
      }
      siteMap[targetSiteId].cameras.push(c);
      if (c.status === "ONLINE") {
        siteMap[targetSiteId].onlineCount++;
      }
    }

    const calculatedAvgLatency =
      lats.length > 0
        ? Math.round(lats.reduce((a, b) => a + b, 0) / lats.length)
        : 0;
    const calculatedMinLatency = lats.length > 0 ? Math.min(...lats) : 0;
    const calculatedMaxLatency = lats.length > 0 ? Math.max(...lats) : 0;

    return {
      total: tot,
      online: onl,
      offline: offl,
      latencies: lats,
      avgLatency: calculatedAvgLatency,
      minLatency: calculatedMinLatency,
      maxLatency: calculatedMaxLatency,
      hasRoiCount: roiCount,
      protocolCounts: protocols,
      siteGroups: Object.values(siteMap).filter((g) => g.cameras.length > 0),
      offlineCameras: offlCams,
    };
  }, [cameras, sites, isVietnamese]);

  // Lọc camera cho tab Telemetry
  const filteredTelemetryCameras = useMemo(() => {
    return cameras.filter((c) => {
      const lat = c.currentLatencyMs || avgLatency;
      const hasRoi = Boolean(
        (c.config?.roiPolygon && Array.isArray(c.config.roiPolygon) && c.config.roiPolygon.length > 0) ||
        ((c.config as any)?.roi_polygon && Array.isArray((c.config as any).roi_polygon) && (c.config as any).roi_polygon.length > 0)
      );

      if (telemetryFilter === "FAST") return lat <= 60;
      if (telemetryFilter === "SLOW") return lat > 120;
      if (telemetryFilter === "HAS_ROI") return !!hasRoi;
      if (telemetryFilter === "NO_ROI") return !hasRoi;
      return true;
    });
  }, [cameras, telemetryFilter, avgLatency]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/80 bg-surface/95 p-4 sm:p-5 shadow-[6px_6px_16px_var(--shadow-dark),-6px_-6px_16px_var(--shadow-light)] transition-all duration-300 dark:border-white/10 dark:bg-card/95 animate-in fade-in slide-in-from-top-3">
      {/* Specular Rim Highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent"
      />

      {/* ============================================================
          HEADER TOOLBAR: ICON, TITLE, TABS SWITCHER & CLOSE BUTTON
          ============================================================ */}
      <div className="flex flex-col gap-3.5 border-b border-border/40 pb-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Icon & Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)] border border-white/40 dark:border-white/10">
            {activeStat === "fleetPulse" && <Cctv className="h-4.5 w-4.5 text-primary" />}
            {activeStat === "edgeTelemetry" && <Zap className="h-4.5 w-4.5 text-primary" />}
            {activeStat === "signalDiagnostics" && (
              <WifiOff
                className={cn(
                  "h-4.5 w-4.5",
                  offline > 0 ? "text-accent" : "text-primary"
                )}
              />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-foreground truncate">
                {activeStat === "fleetPulse" &&
                  (isVietnamese
                    ? "Hạ tầng Camera & Phân bổ Công trường"
                    : "Surveillance Fleet & Site Breakdown")}
                {activeStat === "edgeTelemetry" &&
                  (isVietnamese
                    ? "Đo lường Độ trễ & Giám sát Thị giác AI"
                    : "Transmission Latency & Edge AI Telemetry")}
                {activeStat === "signalDiagnostics" &&
                  (isVietnamese
                    ? "Chẩn đoán Tín hiệu & Ứng cứu Sự cố"
                    : "Signal Diagnostics & Incident Recovery")}
              </h3>

              <Badge
                variant={activeStat === "signalDiagnostics" && offline > 0 ? "warning" : "outline"}
                size="sm"
                className="font-mono text-[11px] px-2 py-0.5"
              >
                {activeStat === "fleetPulse" &&
                  `${total} Cameras (${online} Online)`}
                {activeStat === "edgeTelemetry" &&
                  `${avgLatency} ms Avg • ${total} Feeds`}
                {activeStat === "signalDiagnostics" &&
                  (offline > 0
                    ? `${offline} Cảnh báo gián đoạn`
                    : "100% Ổn định")}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate hidden sm:block mt-0.5">
              {activeStat === "fleetPulse" &&
                (isVietnamese
                  ? "Xem camera theo từng công trường, phân khu và phân bố giao thức luồng RTSP/HLS"
                  : "Inspect camera distribution across sites, zones, and transmission protocols")}
              {activeStat === "edgeTelemetry" &&
                (isVietnamese
                  ? "Bảng đo kiểm độ trễ phản hồi thời gian thực và trạng thái kích hoạt vùng nhận diện AI PPE (ROI)"
                  : "Real-time edge latency scoreboard and AI PPE detection zone (ROI) status")}
              {activeStat === "signalDiagnostics" &&
                (isVietnamese
                  ? "Sổ tay hướng dẫn kiểm tra cáp mạng, nguồn điện PoE và xử lý luồng camera mất kết nối"
                  : "Troubleshooting guide for offline streams, PoE power, and camera connectivity")}
            </p>
          </div>
        </div>

        {/* Right: Quick Tab Switcher & Close Button */}
        <div className="flex items-center gap-1.5 sm:gap-2 self-end sm:self-auto">
          {/* Tab Switcher Pills */}
          <div className="flex items-center rounded-xl bg-background p-1 shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)] border border-white/40 dark:border-white/10">
            <button
              onClick={() => onSelectStat("fleetPulse")}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-200 flex items-center gap-1",
                activeStat === "fleetPulse"
                  ? "bg-surface text-primary shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] dark:bg-card"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Cctv className="h-3.5 w-3.5" />
              <span className="hidden md:inline">{isVietnamese ? "Hạ tầng" : "Fleet"}</span>
            </button>

            <button
              onClick={() => onSelectStat("edgeTelemetry")}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-200 flex items-center gap-1",
                activeStat === "edgeTelemetry"
                  ? "bg-surface text-primary shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] dark:bg-card"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Zap className="h-3.5 w-3.5" />
              <span className="hidden md:inline">{isVietnamese ? "Độ trễ AI" : "Telemetry"}</span>
            </button>

            <button
              onClick={() => onSelectStat("signalDiagnostics")}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-200 flex items-center gap-1 relative",
                activeStat === "signalDiagnostics"
                  ? "bg-surface text-accent shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] dark:bg-card font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <WifiOff className="h-3.5 w-3.5" />
              <span className="hidden md:inline">{isVietnamese ? "Sự cố" : "Diagnostics"}</span>
              {offline > 0 && (
                <span className="flex h-2 w-2 rounded-full bg-accent animate-ping" />
              )}
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-background text-muted-foreground hover:text-foreground shadow-[inset_1px_1px_2px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)] border border-white/30 dark:border-white/10 transition-colors"
            title={isVietnamese ? "Đóng khung chi tiết" : "Close panel"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>


{/* ============================================================
    VIEW 1: FLEET PULSE — COMPACT DEEP 3D NEUMORPHISM
    ============================================================ */}
{activeStat === "fleetPulse" && (
  <div className="mt-4 space-y-5 animate-in fade-in duration-200">
    {/* ========================================================
        01. PROTOCOL DISTRIBUTION
        ======================================================== */}
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-extrabold tracking-tight text-foreground">
            {isVietnamese ? "Phân bổ luồng video" : "Video Stream Distribution"}
          </h4>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {isVietnamese
              ? "Tổng quan giao thức kết nối"
              : "Connection protocol overview"}
          </p>
        </div>

        <span className="shrink-0 rounded-lg bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
          {total} {isVietnamese ? "luồng" : "streams"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { key: "RTSP", label: "RTSP Stream", sub: "CCTV" },
          { key: "HLS", label: "HLS Stream", sub: "Live video" },
          { key: "WEBRTC", label: "WebRTC", sub: "Low latency" },
          {
            key: "OTHER",
            label: isVietnamese ? "Khác" : "Other",
            sub: "Webcam / Test",
          },
        ].map((protocol) => {
          const count = protocolCounts[protocol.key] || 0;
          const percentage =
            total > 0 ? Math.round((count / total) * 100) : 0;

          return (
            <div
              key={protocol.key}
              className={cn(
                "group relative isolate min-w-0 rounded-xl",
                "border border-foreground/[0.045] bg-background/90 p-3",
                "shadow-[inset_0_1.5px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(0,0,0,0.025),0_3px_0_0_var(--shadow-dark),0_6px_0_0_var(--shadow-dark),0_10px_15px_-5px_var(--shadow-dark),-4px_-4px_10px_-4px_var(--shadow-light)]",
                "transition-[transform,box-shadow] duration-300 ease-out",
                "hover:-translate-y-1",
                "hover:shadow-[inset_0_1.5px_0_rgba(255,255,255,0.98),0_3px_0_0_var(--shadow-dark),0_6px_0_0_var(--shadow-dark),0_13px_19px_-4px_var(--shadow-dark),-5px_-5px_12px_-4px_var(--shadow-light)]",
                "active:translate-y-[2px]",
                "dark:border-white/[0.07]"
              )}
            >
              {/* Neutral top bevel */}
              <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-white/90 dark:bg-white/20" />

              {/* Subtle primary reflection */}
              <div className="pointer-events-none absolute right-2 top-2 h-8 w-8 rounded-full bg-primary/[0.035] blur-xl transition-colors group-hover:bg-primary/[0.08]" />

              <div className="relative">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="truncate text-[10px] font-bold text-muted-foreground">
                    {protocol.label}
                  </span>

                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_0_3px] shadow-primary/10" />
                </div>

                <p className="mt-0.5 text-[9px] text-muted-foreground/70">
                  {protocol.sub}
                </p>

                <div className="mt-2.5 flex items-end justify-between gap-1">
                  <span className="font-mono text-xl font-black leading-none tracking-tight text-foreground tabular-nums">
                    {count}
                  </span>

                  <span className="font-mono text-[10px] font-bold text-primary">
                    {percentage}%
                  </span>
                </div>

                {/* Recessed progress track */}
                <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-background shadow-[inset_1px_1px_3px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)]">
                  <div
                    className="relative h-full rounded-full bg-primary transition-[width] duration-500"
                    style={{ width: `${percentage}%` }}
                  >
                    <span className="absolute inset-x-0 top-0 h-px bg-white/55" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>

    {/* ========================================================
        02. SITE & CAMERA DISTRIBUTION
        ======================================================== */}
    <section className="space-y-3">
      {/* Section heading */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className={cn(
              "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              "border border-foreground/[0.045] bg-background",
              "shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_2px_0_0_var(--shadow-dark),0_4px_0_0_var(--shadow-dark),0_7px_10px_-4px_var(--shadow-dark),-3px_-3px_8px_-4px_var(--shadow-light)]"
            )}
          >
            <Building2 className="h-4 w-4 text-primary" />
          </div>

          <div className="min-w-0">
            <h4 className="text-xs font-extrabold tracking-tight text-foreground">
              {isVietnamese
                ? "Công trường & Camera"
                : "Sites & Cameras"}
            </h4>

            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {isVietnamese
                ? `${siteGroups.length} khu vực phân bổ`
                : `${siteGroups.length} allocated sites`}
            </p>
          </div>
        </div>

        {onCreateCamera && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCreateCamera}
            className={cn(
              "h-8 shrink-0 gap-1.5 rounded-lg px-2.5 text-[10px] font-bold",
              "border-foreground/[0.07] bg-background text-primary",
              "shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_0_0_var(--shadow-dark),0_4px_0_0_var(--shadow-dark),0_7px_10px_-4px_var(--shadow-dark),-3px_-3px_8px_-4px_var(--shadow-light)]",
              "transition-all duration-200",
              "hover:-translate-y-0.5 hover:bg-primary/5",
              "active:translate-y-[2px] active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]"
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            {isVietnamese ? "Thêm camera" : "Add camera"}
          </Button>
        )}
      </div>

      {/* Empty state */}
      {siteGroups.length === 0 ? (
        <div
          className={cn(
            "rounded-xl border border-dashed border-foreground/15",
            "bg-background/60 px-4 py-8 text-center",
            "shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)]"
          )}
        >
          <div
            className={cn(
              "mx-auto flex h-10 w-10 items-center justify-center rounded-xl",
              "bg-background",
              "shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_0_0_var(--shadow-dark),0_4px_0_0_var(--shadow-dark),0_6px_10px_-4px_var(--shadow-dark)]"
            )}
          >
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </div>

          <p className="mt-3 text-xs font-semibold text-foreground">
            {isVietnamese
              ? "Chưa có camera được phân bổ vào công trường."
              : "No cameras assigned to any site."}
          </p>

          <p className="mt-1 text-[10px] text-muted-foreground">
            {isVietnamese
              ? "Camera sẽ xuất hiện tại đây sau khi được phân bổ."
              : "Cameras will appear here once assigned."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {siteGroups.map((group) => {
            const cameraCount = group.cameras.length;

            const uptimeRate =
              cameraCount > 0
                ? Math.round((group.onlineCount / cameraCount) * 100)
                : 0;

            return (
              <article
                key={group.siteId}
                className={cn(
                  "group relative flex min-w-0 flex-col rounded-2xl",
                  "border border-foreground/[0.045] bg-background/90 p-3",
                  "shadow-[inset_0_1.5px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(0,0,0,0.025),0_3px_0_0_var(--shadow-dark),0_6px_0_0_var(--shadow-dark),0_10px_17px_-5px_var(--shadow-dark),-4px_-4px_11px_-4px_var(--shadow-light)]",
                  "transition-[transform,box-shadow] duration-300 ease-out",
                  "hover:-translate-y-1",
                  "hover:shadow-[inset_0_1.5px_0_rgba(255,255,255,0.98),0_3px_0_0_var(--shadow-dark),0_6px_0_0_var(--shadow-dark),0_14px_21px_-4px_var(--shadow-dark),-5px_-5px_13px_-4px_var(--shadow-light)]",
                  "active:translate-y-[2px]",
                  "dark:border-white/[0.07]"
                )}
              >
                {/* Top bevel */}
                <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-white/90 dark:bg-white/20" />

                {/* Subtle light reflection */}
                <div className="pointer-events-none absolute right-0 top-0 h-20 w-20 rounded-full bg-primary/[0.035] blur-2xl transition-colors duration-300 group-hover:bg-primary/[0.07]" />

                <div className="relative">
                  {/* Site identity */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                          "border border-foreground/[0.045] bg-background",
                          "shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_0_0_var(--shadow-dark),0_4px_0_0_var(--shadow-dark),0_7px_10px_-4px_var(--shadow-dark),-3px_-3px_8px_-4px_var(--shadow-light)]"
                        )}
                      >
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-primary">
                          {group.siteCode || "SITE"}
                        </p>

                        <h5
                          className="mt-0.5 truncate text-xs font-extrabold tracking-tight text-foreground"
                          title={group.siteName}
                        >
                          {group.siteName}
                        </h5>
                      </div>
                    </div>

                    {/* Status badge */}
                    <Badge
                      variant={
                        uptimeRate === 100
                          ? "success"
                          : uptimeRate > 0
                            ? "warning"
                            : "danger"
                      }
                      size="sm"
                      className="shrink-0 text-[9px]"
                    >
                      {uptimeRate}% Online
                    </Badge>
                  </div>

                  {/* Compact inset metrics */}
                  <div
                    className={cn(
                      "mt-3 rounded-xl border border-foreground/[0.025]",
                      "bg-background/50 px-3 py-2.5",
                      "shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-muted-foreground">
                        {isVietnamese
                          ? "Camera hoạt động"
                          : "Active cameras"}
                      </span>

                      <span className="font-mono text-xs font-black tabular-nums text-foreground">
                        {group.onlineCount}
                        <span className="font-medium text-muted-foreground">
                          {" "}/ {cameraCount}
                        </span>
                      </span>
                    </div>

                    {/* Recessed track */}
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background shadow-[inset_1px_1px_3px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)]">
                      <div
                        className={cn(
                          "relative h-full rounded-full transition-[width] duration-500",
                          uptimeRate > 0 ? "bg-primary" : "bg-accent/70"
                        )}
                        style={{ width: `${uptimeRate}%` }}
                      >
                        <span className="absolute inset-x-0 top-0 h-px bg-white/60" />
                      </div>
                    </div>
                  </div>

                  {/* Camera inventory */}
                  <div className="mt-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                        {isVietnamese
                          ? "Danh sách camera"
                          : "Camera inventory"}
                      </span>

                      <span className="font-mono text-[9px] font-bold tabular-nums text-muted-foreground">
                        {String(cameraCount).padStart(2, "0")}
                      </span>
                    </div>

                    {cameraCount > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {group.cameras.map((camera) => {
                          const isOnline = camera.status === "ONLINE";

                          return (
                            <span
                              key={camera.id}
                              title={`${camera.name} (${camera.status})`}
                              className={cn(
                                "inline-flex max-w-full items-center gap-1.5 rounded-md px-2 py-1",
                                "border border-foreground/[0.045] bg-background/75",
                                "shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_0_0_var(--shadow-dark),0_3px_5px_-3px_var(--shadow-dark)]",
                                "transition-transform duration-200 hover:-translate-y-px"
                              )}
                            >
                              <span
                                className={cn(
                                  "h-1.5 w-1.5 shrink-0 rounded-full",
                                  isOnline ? "bg-primary" : "bg-accent"
                                )}
                              />

                              <span className="truncate text-[10px] font-semibold text-foreground/80">
                                {camera.code}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="rounded-lg border border-dashed border-foreground/10 px-3 py-2.5 text-center text-[10px] text-muted-foreground">
                        {isVietnamese
                          ? "Chưa có camera"
                          : "No cameras"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer action */}
                {onFilterSite && group.siteId !== "unassigned" && (
                  <button
                    onClick={() => onFilterSite(group.siteId)}
                    className={cn(
                      "relative mt-3 flex w-full items-center justify-between gap-2",
                      "border-t border-foreground/[0.07] pt-2.5",
                      "text-[10px] font-bold text-muted-foreground",
                      "transition-colors duration-200",
                      "hover:text-primary",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    )}
                  >
                    <span>
                      {isVietnamese
                        ? "Lọc công trường này"
                        : "Filter this site"}
                    </span>

                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  </div>
)}


      
{/* ============================================================
    VIEW 2: EDGE TELEMETRY
    COMPACT DEEP 3D NEUMORPHISM
    ============================================================ */}
{activeStat === "edgeTelemetry" && (
  <div className="mt-4 space-y-5 animate-in fade-in duration-200">
    {/* ========================================================
        01. LATENCY & ROI OVERVIEW
        ======================================================== */}
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-extrabold tracking-tight text-foreground">
            {isVietnamese ? "Hiệu suất xử lý tại biên" : "Edge Processing Performance"}
          </h4>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {isVietnamese
              ? "Độ trễ mạng và phạm vi phân tích AI"
              : "Network latency and AI coverage"}
          </p>
        </div>

        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[10px] font-bold text-primary">
          <Activity className="h-3 w-3" />
          {isVietnamese ? "Telemetry" : "Telemetry"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            id: "best",
            label: isVietnamese ? "Tối ưu nhất" : "Best Latency",
            value: minLatency,
            unit: "ms",
            tone: "primary",
          },
          {
            id: "average",
            label: isVietnamese ? "Độ trễ trung bình" : "Average Latency",
            value: avgLatency,
            unit: "ms",
            tone: "neutral",
          },
          {
            id: "worst",
            label: isVietnamese ? "Độ trễ cao nhất" : "Worst Latency",
            value: maxLatency,
            unit: "ms",
            tone: "accent",
          },
          {
            id: "roi",
            label: isVietnamese ? "Độ phủ vùng AI" : "AI ROI Coverage",
            value: `${hasRoiCount}/${total}`,
            unit: "ROI",
            tone: "primary",
          },
        ].map((metric) => {
          const percentage =
            metric.id === "roi" && total > 0
              ? Math.round((hasRoiCount / total) * 100)
              : null;

          return (
            <div
              key={metric.id}
              className={cn(
                "group relative isolate min-w-0 overflow-hidden rounded-xl",
                "border border-foreground/[0.045] bg-background/90 p-3",
                "shadow-[inset_0_1.5px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(0,0,0,0.025),0_3px_0_0_var(--shadow-dark),0_6px_0_0_var(--shadow-dark),0_10px_15px_-5px_var(--shadow-dark),-4px_-4px_10px_-4px_var(--shadow-light)]",
                "transition-[transform,box-shadow] duration-300 ease-out",
                "hover:-translate-y-1",
                "hover:shadow-[inset_0_1.5px_0_rgba(255,255,255,0.98),0_3px_0_0_var(--shadow-dark),0_6px_0_0_var(--shadow-dark),0_13px_19px_-4px_var(--shadow-dark),-5px_-5px_12px_-4px_var(--shadow-light)]",
                "dark:border-white/[0.07]"
              )}
            >
              {/* Neutral bevel */}
              <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-white/90 dark:bg-white/20" />

              {/* Subtle accent reflection */}
              <div
                className={cn(
                  "pointer-events-none absolute -right-4 -top-5 h-14 w-14 rounded-full blur-2xl",
                  metric.tone === "accent"
                    ? "bg-accent/[0.08]"
                    : metric.tone === "primary"
                      ? "bg-primary/[0.07]"
                      : "bg-foreground/[0.025]"
                )}
              />

              <div className="relative">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="truncate text-[10px] font-bold text-muted-foreground">
                    {metric.label}
                  </span>

                  <span
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      metric.tone === "primary"
                        ? "bg-primary"
                        : metric.tone === "accent"
                          ? "bg-accent"
                          : "bg-foreground/25"
                    )}
                  />
                </div>

                <div className="mt-2.5 flex min-w-0 items-baseline gap-1">
                  <span
                    className={cn(
                      "truncate font-mono text-xl font-black leading-none tracking-tight tabular-nums",
                      metric.tone === "primary"
                        ? "text-primary"
                        : metric.tone === "accent"
                          ? "text-accent"
                          : "text-foreground"
                    )}
                  >
                    {metric.value}
                  </span>

                  <span className="text-[9px] font-bold uppercase text-muted-foreground">
                    {metric.unit}
                  </span>
                </div>

                {metric.id === "roi" ? (
                  <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-background shadow-[inset_1px_1px_3px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)]">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-500"
                      style={{ width: `${percentage ?? 0}%` }}
                    />
                  </div>
                ) : (
                  <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-background shadow-[inset_1px_1px_3px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)]">
                    <div
                      className={cn(
                        "h-full w-1/3 rounded-full",
                        metric.tone === "primary"
                          ? "bg-primary"
                          : metric.tone === "accent"
                            ? "bg-accent"
                            : "bg-foreground/30"
                      )}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>

    {/* ========================================================
        02. TELEMETRY FILTERS
        ======================================================== */}
    <section className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            {isVietnamese ? "Bộ lọc" : "Filter"}
          </span>

          {[
            { id: "ALL", label: isVietnamese ? "Tất cả" : "All" },
            {
              id: "FAST",
              label: isVietnamese ? "< 60ms" : "< 60ms Fast",
            },
            {
              id: "SLOW",
              label: isVietnamese ? "> 120ms" : "> 120ms Slow",
            },
            {
              id: "HAS_ROI",
              label: isVietnamese ? "Có ROI" : "With ROI",
            },
            {
              id: "NO_ROI",
              label: isVietnamese ? "Chưa có ROI" : "No ROI",
            },
          ].map((tab) => {
            const isActive = telemetryFilter === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setTelemetryFilter(tab.id as any)}
                className={cn(
                  "relative rounded-lg border px-2.5 py-1.5 text-[10px]",
                  "font-semibold transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                  isActive
                    ? [
                        "border-foreground/[0.05] bg-primary/10 text-primary",
                        "shadow-[inset_0_1px_0_rgba(255,255,255,0.65),inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]",
                      ].join(" ")
                    : [
                        "border-foreground/[0.045] bg-background text-muted-foreground",
                        "shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_2px_0_0_var(--shadow-dark),0_4px_7px_-4px_var(--shadow-dark)]",
                        "hover:-translate-y-px hover:text-foreground",
                      ].join(" ")
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <span className="text-[10px] text-muted-foreground">
          {isVietnamese
            ? "Mục tiêu: < 100ms · ≥ 20 FPS"
            : "Target: < 100ms · ≥ 20 FPS"}
        </span>
      </div>
    </section>

    {/* ========================================================
        03. CAMERA TELEMETRY
        ======================================================== */}
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-extrabold text-foreground">
            {isVietnamese ? "Giám sát từng camera" : "Camera Telemetry"}
          </h4>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {isVietnamese
              ? `${filteredTelemetryCameras.length} camera phù hợp`
              : `${filteredTelemetryCameras.length} matching cameras`}
          </p>
        </div>
      </div>

      <div className="grid max-h-[380px] grid-cols-1 gap-4 overflow-y-auto overflow-x-hidden px-1 pb-2 pt-1 md:grid-cols-2">
        {filteredTelemetryCameras.length === 0 ? (
          <div
            className={cn(
              "col-span-full rounded-xl border border-dashed border-foreground/15",
              "bg-background/60 px-4 py-8 text-center",
              "shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)]"
            )}
          >
            <Activity className="mx-auto h-5 w-5 text-muted-foreground/60" />

            <p className="mt-2 text-xs font-semibold text-foreground">
              {isVietnamese
                ? "Không có camera phù hợp"
                : "No matching cameras"}
            </p>

            <p className="mt-1 text-[10px] text-muted-foreground">
              {isVietnamese
                ? "Thử thay đổi bộ lọc độ trễ hoặc vùng ROI."
                : "Try changing the latency or ROI filter."}
            </p>
          </div>
        ) : (
          filteredTelemetryCameras.map((cam) => {
            const lat = cam.currentLatencyMs || avgLatency;
            const isFast = lat <= 60;
            const isSlow = lat > 120;

            const hasRoi = Boolean(
              (cam.config?.roiPolygon && Array.isArray(cam.config.roiPolygon) && cam.config.roiPolygon.length > 0) ||
              ((cam.config as any)?.roi_polygon && Array.isArray((cam.config as any).roi_polygon) && (cam.config as any).roi_polygon.length > 0)
            );

            return (
              <article
                key={cam.id}
                className={cn(
                  "group relative flex min-w-0 flex-col rounded-2xl",
                  "border border-foreground/[0.045] bg-background/90 p-3",
                  "shadow-[inset_0_1.5px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(0,0,0,0.025),0_3px_0_0_var(--shadow-dark),0_6px_0_0_var(--shadow-dark),0_10px_17px_-5px_var(--shadow-dark),-4px_-4px_11px_-4px_var(--shadow-light)]",
                  "transition-[transform,box-shadow] duration-300 ease-out",
                  "hover:-translate-y-1",
                  "hover:shadow-[inset_0_1.5px_0_rgba(255,255,255,0.98),0_3px_0_0_var(--shadow-dark),0_6px_0_0_var(--shadow-dark),0_14px_21px_-4px_var(--shadow-dark),-5px_-5px_13px_-4px_var(--shadow-light)]",
                  "dark:border-white/[0.07]"
                )}
              >
                {/* Neutral top bevel */}
                <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-white/90 dark:bg-white/20" />

                {/* Subtle latency reflection */}
                <div
                  className={cn(
                    "pointer-events-none absolute -right-4 -top-5 h-16 w-16 rounded-full blur-2xl",
                    isFast
                      ? "bg-primary/[0.08]"
                      : isSlow
                        ? "bg-accent/[0.09]"
                        : "bg-foreground/[0.025]"
                  )}
                />

                <div className="relative">
                  {/* Camera identity + latency */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                          "border border-foreground/[0.045] bg-background",
                          "shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_0_0_var(--shadow-dark),0_4px_0_0_var(--shadow-dark),0_7px_10px_-4px_var(--shadow-dark),-3px_-3px_8px_-4px_var(--shadow-light)]"
                        )}
                      >
                        <Activity
                          className={cn(
                            "h-4 w-4",
                            isFast
                              ? "text-primary"
                              : isSlow
                                ? "text-accent"
                                : "text-muted-foreground"
                          )}
                        />
                      </div>

                      <div className="min-w-0 pt-0.5">
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          <h5
                            className="max-w-full truncate text-xs font-extrabold text-foreground"
                            title={cam.name}
                          >
                            {cam.name}
                          </h5>

                          <Badge
                            variant="outline"
                            size="sm"
                            className="font-mono text-[9px]"
                          >
                            {cam.code}
                          </Badge>
                        </div>

                        <p className="mt-1 truncate text-[10px] text-muted-foreground">
                          {cam.siteName ||
                            cam.location ||
                            (isVietnamese
                              ? "Khu vực thi công"
                              : "Construction area")}
                        </p>
                      </div>
                    </div>

                    {/* Latency raised tile */}
                    <div
                      className={cn(
                        "relative flex shrink-0 items-baseline gap-1 rounded-lg px-2 py-1.5",
                        "border border-foreground/[0.04] bg-background",
                        "shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_0_0_var(--shadow-dark),0_4px_0_0_var(--shadow-dark),0_7px_10px_-4px_var(--shadow-dark)]",
                        isFast
                          ? "text-primary"
                          : isSlow
                            ? "text-accent"
                            : "text-foreground"
                      )}
                    >
                      <span className="font-mono text-sm font-black leading-none tabular-nums">
                        {lat}
                      </span>
                      <span className="text-[9px] font-bold uppercase">
                        ms
                      </span>
                    </div>
                  </div>

                  {/* Latency indicator */}
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-background shadow-[inset_1px_1px_3px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)]">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        isFast
                          ? "bg-primary"
                          : isSlow
                            ? "bg-accent"
                            : "bg-foreground/40"
                      )}
                      style={{
                        width: `${Math.min(100, Math.max(4, (lat / 200) * 100))}%`,
                      }}
                    />
                  </div>

                  {/* Compact telemetry details */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-foreground/[0.07] pt-2.5">
                    <div className="flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5 text-primary" />

                      <span className="text-[10px] text-muted-foreground">
                        FPS:
                      </span>

                      <span className="font-mono text-[11px] font-extrabold tabular-nums text-foreground">
                        {cam.currentFps || 25}
                      </span>
                    </div>

                    {hasRoi ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {isVietnamese ? "ROI đã cấu hình" : "ROI active"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                        {isVietnamese ? "Chưa có ROI" : "No ROI zone"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {(onPing || onOpenRoi || onViewLive) && (
                  <div className="relative mt-3 flex items-center justify-end gap-2 border-t border-foreground/[0.07] pt-2.5">
                    {onPing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onPing(cam)}
                        className={cn(
                          "h-8 gap-1.5 rounded-lg px-2.5 text-[10px] font-bold",
                          "text-muted-foreground",
                          "transition-all hover:bg-primary/5 hover:text-primary"
                        )}
                      >
                        <RefreshCw className="h-3 w-3" />
                        Ping
                      </Button>
                    )}

                    {onOpenRoi && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenRoi(cam)}
                        className={cn(
                          "h-8 gap-1.5 rounded-lg px-2.5 text-[10px] font-bold",
                          "border-foreground/[0.07] bg-background text-primary",
                          "shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_0_0_var(--shadow-dark),0_4px_7px_-4px_var(--shadow-dark)]",
                          "transition-all hover:-translate-y-px hover:bg-primary/5",
                          "active:translate-y-px"
                        )}
                      >
                        <Sliders className="h-3 w-3" />
                        {isVietnamese ? "Cấu hình ROI" : "ROI"}
                      </Button>
                    )}

                    {onViewLive && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onViewLive(cam)}
                        className={cn(
                          "h-8 gap-1.5 rounded-lg px-2.5 text-[10px] font-bold",
                          "shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_2px_0_0_var(--shadow-dark),0_4px_0_0_var(--shadow-dark),0_7px_10px_-4px_var(--shadow-dark)]",
                          "transition-all hover:-translate-y-px active:translate-y-px"
                        )}
                      >
                        <Eye className="h-3 w-3" />
                        {isVietnamese ? "Xem Live" : "Live"}
                      </Button>
                    )}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  </div>
)}



      {/* ============================================================
          VIEW 3: SIGNAL DIAGNOSTICS — PREMIUM 3D NEUMORPHISM
          ============================================================ */}
      {activeStat === "signalDiagnostics" && (
        <div className="mt-5 space-y-5 animate-in fade-in duration-300">
          {/* ========================================================
              1. NETWORK HEALTH — SCULPTED STATUS BANNER
              ======================================================== */}
          <section
            className={[
              "relative isolate overflow-hidden rounded-2xl",
              "border border-foreground/[0.045] bg-background p-4 sm:p-5",
              "shadow-[inset_0_1.5px_0_rgba(255,255,255,0.9),inset_0_-1px_0_rgba(0,0,0,0.025),0_3px_0_0_var(--shadow-dark),0_6px_0_0_var(--shadow-dark),0_11px_18px_-5px_var(--shadow-dark),-5px_-5px_12px_-4px_var(--shadow-light)]",
              offline === 0
                ? "before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-r-full before:bg-primary"
                : "before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-r-full before:bg-accent",
            ].join(" ")}
          >
            {/* Soft top reflection */}
            <div
              className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent"
              aria-hidden="true"
            />

            <div className="relative flex items-start gap-3.5">
              {/* 3D icon tile */}
              <div
                className={[
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                  "border border-foreground/[0.035]",
                  "shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_0_var(--shadow-dark),0_5px_8px_-3px_var(--shadow-dark),-3px_-3px_7px_-3px_var(--shadow-light)]",
                  offline === 0
                    ? "bg-primary/[0.09] text-primary"
                    : "bg-accent/[0.13] text-accent",
                ].join(" ")}
              >
                {offline === 0 ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <AlertTriangle className="h-5 w-5" />
                )}
              </div>

              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h5 className="text-sm font-bold leading-snug text-foreground">
                    {offline === 0
                      ? isVietnamese
                        ? "Mạng lưới camera đang hoạt động ổn định 100%!"
                        : "Surveillance network is operating at 100% uptime!"
                      : isVietnamese
                        ? `Cảnh báo: Phát hiện ${offline} camera đang mất tín hiệu hoặc gặp sự cố!`
                        : `Warning: ${offline} camera feeds unreachable or disconnected!`}
                  </h5>

                  <span
                    className={[
                      "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1",
                      "text-[9px] font-bold uppercase tracking-wider",
                      "shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]",
                      offline === 0
                        ? "bg-primary/[0.09] text-primary"
                        : "bg-accent/[0.13] text-accent",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "h-1.5 w-1.5 rounded-full",
                        offline === 0
                          ? "bg-primary"
                          : "animate-pulse bg-accent",
                      ].join(" ")}
                    />
                    {offline === 0
                      ? isVietnamese
                        ? "Ổn định"
                        : "Healthy"
                      : isVietnamese
                        ? "Cần xử lý"
                        : "Attention"}
                  </span>
                </div>

                <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-muted-foreground">
                  {offline === 0
                    ? isVietnamese
                      ? "Không phát hiện camera nào bị ngắt kết nối hoặc lỗi timeout RTSP. Tất cả luồng video đang được phân tích PPE liên tục 24/7."
                      : "No disconnected feeds or RTSP timeouts detected. All streams are actively ingested by the computer vision PPE pipeline."
                    : isVietnamese
                      ? "Khu vực thi công tương ứng đang bị gián đoạn phát hiện vi phạm an toàn PPE. Cần nhân sự kỹ thuật kiểm tra cấp nguồn PoE hoặc đường truyền mạng."
                      : "The monitored construction zones may be missing PPE violations. A technician should inspect PoE power and network routing."}
                </p>
              </div>
            </div>

            {/* Bottom status rail */}
            <div className="relative mt-4 h-1 overflow-hidden rounded-full bg-background shadow-[inset_0_1px_3px_var(--shadow-dark),inset_0_-1px_1px_var(--shadow-light)]">
              <div
                className={[
                  "h-full rounded-full transition-all duration-500",
                  offline === 0 ? "w-full bg-primary" : "bg-accent",
                ].join(" ")}
                style={
                  offline === 0
                    ? undefined
                    : {
                        width: `${Math.max(8, 100 - (offline / Math.max(1, offline + (typeof total === "number" ? total - offline : 0))) * 100)}%`,
                      }
                }
              />
            </div>
          </section>

          {/* ========================================================
              2. OFFLINE CAMERA INCIDENTS
              ======================================================== */}
          {offline > 0 ? (
            <section className="space-y-4">
              {/* Section heading */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/[0.12] text-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_2px_0_var(--shadow-dark),0_4px_7px_-3px_var(--shadow-dark)]">
                    <Activity className="h-4 w-4" />
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      {isVietnamese
                        ? "Camera cần xử lý"
                        : "Cameras Requiring Attention"}
                    </h4>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {isVietnamese
                        ? `${offline} thiết bị đang cần kiểm tra kỹ thuật`
                        : `${offline} devices need technical inspection`}
                    </p>
                  </div>
                </div>

                {onFilterStatus && (
                  <button
                    type="button"
                    onClick={() => onFilterStatus("OFFLINE")}
                    className="group inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold text-accent transition-all duration-200 hover:bg-accent/[0.07] active:translate-y-px"
                  >
                    {isVietnamese
                      ? "Lọc camera lỗi"
                      : "Filter offline"}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </button>
                )}
              </div>

              {/* Incident cards */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {offlineCameras.map((cam) => (
                  <article
                    key={cam.id}
                    className={[
                      "group relative flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl",
                      "border border-foreground/[0.045] bg-background p-4",
                      "transition-[transform,box-shadow] duration-200",
                      "shadow-[inset_0_1.5px_0_rgba(255,255,255,0.92),inset_0_-1px_0_rgba(0,0,0,0.025),0_3px_0_0_var(--shadow-dark),0_6px_0_0_var(--shadow-dark),0_11px_17px_-5px_var(--shadow-dark),-4px_-4px_10px_-4px_var(--shadow-light)]",
                      "hover:-translate-y-1 hover:shadow-[inset_0_1.5px_0_rgba(255,255,255,0.95),0_4px_0_0_var(--shadow-dark),0_8px_0_0_var(--shadow-dark),0_15px_23px_-5px_var(--shadow-dark),-5px_-5px_12px_-4px_var(--shadow-light)]",
                    ].join(" ")}
                  >
                    {/* Top highlight */}
                    <div
                      className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent"
                      aria-hidden="true"
                    />

                    <div className="relative">
                      {/* Camera identity */}
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/[0.10] text-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_0_var(--shadow-dark),0_5px_8px_-3px_var(--shadow-dark),-3px_-3px_7px_-3px_var(--shadow-light)]">
                          <AlertTriangle className="h-[18px] w-[18px]" />
                        </div>

                        <div className="min-w-0 flex-1 pt-0.5">
                          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                            <h5 className="min-w-0 max-w-full truncate text-sm font-bold text-foreground">
                              {cam.name}
                            </h5>

                            <Badge
                              variant="danger"
                              size="sm"
                              className="shrink-0 font-mono text-[9px]"
                            >
                              {cam.status}
                            </Badge>
                          </div>

                          <p className="mt-1 truncate text-[11px] text-muted-foreground">
                            {cam.siteName ||
                              cam.location ||
                              (isVietnamese
                                ? "Công trường chưa xác định"
                                : "Unassigned site")}
                            {cam.zoneName ? ` · ${cam.zoneName}` : ""}
                          </p>
                        </div>

                        <Badge
                          variant="outline"
                          size="sm"
                          className="shrink-0 font-mono text-[9px]"
                        >
                          {cam.code}
                        </Badge>
                      </div>

                      {/* Stream URL — inset terminal */}
                      <div className="mt-4 rounded-xl border border-foreground/[0.035] bg-background/70 p-2.5 shadow-[inset_0_2px_5px_var(--shadow-dark),inset_0_-1px_2px_var(--shadow-light)]">
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                            {isVietnamese ? "Nguồn tín hiệu" : "Stream source"}
                          </span>

                          <span className="flex shrink-0 items-center gap-1 text-[9px] font-medium text-accent">
                            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                            {isVietnamese ? "Mất kết nối" : "Disconnected"}
                          </span>
                        </div>

                        <div className="flex min-w-0 items-center gap-2">
                          <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-muted-foreground">
                            {cam.streamUrl}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleCopy(cam.streamUrl)}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:bg-primary/[0.09] hover:text-primary active:scale-95"
                            title={
                              isVietnamese
                                ? "Sao chép URL luồng"
                                : "Copy stream URL"
                            }
                            aria-label={
                              isVietnamese ? "Sao chép URL" : "Copy URL"
                            }
                          >
                            {copiedUrl === cam.streamUrl ? (
                              <Check className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Troubleshooting checklist */}
                      <div className="mt-4">
                        <div className="mb-2 flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/[0.08] text-primary">
                            <Sliders className="h-3 w-3" />
                          </div>

                          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">
                            {isVietnamese
                              ? "Kiểm tra kỹ thuật"
                              : "Troubleshooting"}
                          </span>
                        </div>

                        <div className="space-y-2 pl-1">
                          <div className="flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent shadow-[0_0_0_2px_var(--background)]" />
                            <p className="text-[11px] leading-relaxed text-muted-foreground">
                              {isVietnamese
                                ? "Kiểm tra nguồn Switch PoE và đèn link RJ45 tại trạm."
                                : "Check the PoE switch power and RJ45 link indicators."}
                            </p>
                          </div>

                          <div className="flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent shadow-[0_0_0_2px_var(--background)]" />
                            <p className="text-[11px] leading-relaxed text-muted-foreground">
                              {isVietnamese
                                ? "Ping địa chỉ IP và kiểm tra cổng RTSP (thường là 554/8554)."
                                : "Ping the IP address and verify the RTSP port (usually 554/8554)."}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions — raised buttons */}
                    <div className="relative mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-foreground/[0.07] pt-3">
                      {onPing && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onPing(cam)}
                          className="h-8 gap-1.5 text-[11px]"
                        >
                          <RefreshCw className="h-3 w-3" />
                          {isVietnamese ? "Thử kết nối" : "Retry"}
                        </Button>
                      )}

                      {onEditCamera && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => onEditCamera(cam)}
                          className="h-8 gap-1.5 text-[11px]"
                        >
                          <Sliders className="h-3 w-3" />
                          {isVietnamese ? "Sửa cấu hình" : "Edit config"}
                        </Button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : (
            /* ======================================================
               3. PREVENTIVE MAINTENANCE — RAISED 3D TILES
               ====================================================== */
            <section className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/[0.09] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_0_var(--shadow-dark),0_4px_7px_-3px_var(--shadow-dark)]">
                  <ShieldCheck className="h-4 w-4" />
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    {isVietnamese
                      ? "Quy trình bảo trì định kỳ"
                      : "Preventive maintenance"}
                  </h4>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {isVietnamese
                      ? "Duy trì chất lượng hình ảnh và độ ổn định của hệ thống"
                      : "Maintain image quality and system reliability"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                  {
                    step: "01",
                    title: isVietnamese
                      ? "Vệ sinh mặt kính"
                      : "Clean the lens",
                    description: isVietnamese
                      ? "Lau sạch bụi xi măng và hơi nước định kỳ để AI nhận diện đồ bảo hộ rõ nét."
                      : "Remove cement dust and condensation to keep PPE detection clear.",
                    icon: Eye,
                  },
                  {
                    step: "02",
                    title: isVietnamese
                      ? "Điều chỉnh góc nhìn"
                      : "Adjust camera FOV",
                    description: isVietnamese
                      ? "Đảm bảo camera bao quát khu vực nguy hiểm, giàn giáo và đường xe cơ giới."
                      : "Cover hazardous areas, scaffolding and vehicle routes.",
                    icon: Activity,
                  },
                  {
                    step: "03",
                    title: isVietnamese
                      ? "Kiểm tra băng thông"
                      : "Verify bandwidth",
                    description: isVietnamese
                      ? "Đảm bảo đường truyền đạt tối thiểu 4 Mbps/camera để duy trì luồng video ổn định."
                      : "Provide at least 4 Mbps per camera for a stable video stream.",
                    icon: RefreshCw,
                  },
                ].map((item) => {
                  const MaintenanceIcon = item.icon;

                  return (
                    <article
                      key={item.step}
                      className={[
                        "group relative overflow-hidden rounded-2xl",
                        "border border-foreground/[0.045] bg-background/90 p-4",
                        "transition-[transform,box-shadow] duration-200",
                        "shadow-[inset_0_1.5px_0_rgba(255,255,255,0.92),inset_0_-1px_0_rgba(0,0,0,0.025),0_3px_0_0_var(--shadow-dark),0_6px_0_0_var(--shadow-dark),0_10px_16px_-5px_var(--shadow-dark),-4px_-4px_10px_-4px_var(--shadow-light)]",
                        "hover:-translate-y-1 hover:shadow-[inset_0_1.5px_0_rgba(255,255,255,0.95),0_4px_0_0_var(--shadow-dark),0_8px_0_0_var(--shadow-dark),0_14px_22px_-5px_var(--shadow-dark),-5px_-5px_12px_-4px_var(--shadow-light)]",
                      ].join(" ")}
                    >
                      {/* Neutral light edge */}
                      <div
                        className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent"
                        aria-hidden="true"
                      />

                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/[0.08] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_0_var(--shadow-dark),0_5px_8px_-3px_var(--shadow-dark),-3px_-3px_7px_-3px_var(--shadow-light)] transition-transform duration-200 group-hover:-translate-y-0.5">
                          <MaintenanceIcon className="h-[18px] w-[18px]" />
                        </div>

                        <span className="font-mono text-[10px] font-bold tracking-widest text-primary/80">
                          {item.step}
                        </span>
                      </div>

                      <h5 className="mt-4 text-xs font-bold text-foreground">
                        {item.title}
                      </h5>

                      <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>

                      <div className="mt-4 h-1 overflow-hidden rounded-full bg-background shadow-[inset_0_1px_3px_var(--shadow-dark)]">
                        <div className="h-full w-1/3 rounded-full bg-primary/70 transition-all duration-300 group-hover:w-2/3" />
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

