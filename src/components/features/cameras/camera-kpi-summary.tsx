"use client";

import { useMemo, useState } from "react";
import {
  Cctv,
  Radio,
  Zap,
  AlertTriangle,
  CheckCircle2,
  WifiOff,
  Activity,
  Camera,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Typography } from "@ui/typography";
import { StatsCard, type StatsCardVariant } from "@/components/ui/stats-cards";
import { useLocale } from "@/providers/locale-provider";
import type { CameraItem, CameraStatus } from "@/types";
import {
  CameraStatsDetailPanel,
  type CameraStatKey,
} from "./camera-stats-detail-panel";

function cn(...classes: Array<string | null | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

export interface CameraKpiSummaryProps {
  /** Danh sách camera từ API */
  cameras: CameraItem[];
  /** Trạng thái đang tải dữ liệu */
  loading?: boolean;
  /** Biến thể thiết kế: bento-console | soft-extruded | deep-elevation | classic (mặc định: bento-console) */
  variant?: StatsCardVariant;
  /** Bộ lọc trạng thái đang áp dụng trên trang */
  activeFilter?: string;
  /** Hàm callback khi click vào thẻ để lọc danh sách camera */
  onFilterChange?: (status: CameraStatus | "ALL") => void;
  /** Callback lọc theo công trường */
  onFilterSite?: (siteId: string) => void;
  /** Callback kiểm tra Ping camera */
  onPing?: (camera: CameraItem) => void;
  /** Callback mở cấu hình AI ROI */
  onOpenRoi?: (camera: CameraItem) => void;
  /** Callback mở chỉnh sửa camera */
  onEditCamera?: (camera: CameraItem) => void;
  /** Callback mở modal tạo camera */
  onCreateCamera?: () => void;
  /** Callback chuyển sang xem live */
  onViewLive?: (camera: CameraItem) => void;
  className?: string;
}

export function CameraKpiSummary({
  cameras,
  loading = false,
  variant = "bento-console",
  activeFilter,
  onFilterChange,
  onFilterSite,
  onPing,
  onOpenRoi,
  onEditCamera,
  onCreateCamera,
  onViewLive,
  className = "",
}: CameraKpiSummaryProps) {
  const { locale, t } = useLocale();
  const isVietnamese = locale === "vi-VN";

  // Quản lý tab nội dung chi tiết mở rộng bên dưới
  const [activeStat, setActiveStat] = useState<CameraStatKey | null>(null);

  const handleToggle = (key: CameraStatKey) => {
    setActiveStat((prev) => (prev === key ? null : key));
  };

  // Tính toán số liệu thống kê
  const { total, online, offline, avgLatency, onlineRate, latencyScore } =
    useMemo(() => {
      const tot = cameras.length;
      let onl = 0;
      let offl = 0;
      let conn = 0;
      const validLatencies: number[] = [];

      for (const c of cameras) {
        if (c.status === "ONLINE") {
          onl++;
        } else if (c.status === "OFFLINE" || c.status === "ERROR") {
          offl++;
        } else if (c.status === "CONNECTING") {
          conn++;
        }

        if (typeof c.currentLatencyMs === "number" && c.currentLatencyMs > 0) {
          validLatencies.push(c.currentLatencyMs);
        }
      }

      const calculatedAvgLatency =
        validLatencies.length > 0
          ? Math.round(
              validLatencies.reduce((sum, val) => sum + val, 0) /
                validLatencies.length
            )
          : 0;

      const rate = tot > 0 ? Math.min(100, Math.round((onl / tot) * 100)) : 0;

      // Điểm sức khỏe mạng tính từ độ trễ (<=50ms: 100%, 100ms: ~85%, 250ms: ~30%)
      const score = validLatencies.length > 0
        ? Math.max(15, Math.min(100, Math.round(100 - (calculatedAvgLatency / 250) * 75)))
        : (tot > 0 ? 100 : 0);

      return {
        total: tot,
        online: onl,
        offline: offl,
        connecting: conn,
        avgLatency: calculatedAvgLatency,
        onlineRate: rate,
        latencyScore: score,
      };
    }, [cameras]);

  const hasWarning = offline > 0;
  const isLatencyFast = avgLatency <= 60;
  const isLatencyOptimal = avgLatency <= 120;

  // ============================================================
  // BIẾN THỂ CHÍNH: BENTO CONSOLE BẤT ĐỐI XỨNG (ASYMMETRIC CONSOLE)
  // Tham khảo kiến trúc Dòng 4 của trang Users: 5 Cột | 4 Cột | 3 Cột
  // ============================================================
  if (variant === "bento-console") {
    return (
      <section
        aria-label={
          isVietnamese
            ? "Bảng điều khiển chỉ huy Camera Bento Console"
            : "Camera Infrastructure Bento Console"
        }
        className={className}
      >
        {/* ============================================================
            1. MOBILE COMPACT 2x2 TILES (< md: Phone Screens)
            ============================================================ */}
        <div className="grid grid-cols-2 gap-2.5 md:hidden">
          {/* Tile 1: Tổng Camera -> Mở Fleet Pulse */}
          <div
            onClick={() => handleToggle("fleetPulse")}
            className={cn(
              "relative overflow-hidden rounded-2xl border bg-background p-3 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] flex flex-col justify-between transition-all duration-200 cursor-pointer active:scale-[0.98]",
              activeStat === "fleetPulse"
                ? "border-primary/50 ring-2 ring-primary/30"
                : "border-white/70 dark:border-white/10"
            )}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/20"
            />
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                {isVietnamese ? "Tổng Camera" : "Total Cameras"}
              </span>
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-background shadow-[inset_1px_1px_2px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)] text-primary border border-white/30 dark:border-white/10">
                <Cctv className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-1">
              <Typography
                variant="embossed"
                as="div"
                className="text-2xl font-black font-mono tracking-tight text-foreground"
              >
                {loading ? "..." : total}
              </Typography>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-[10px] text-muted-foreground/80 font-medium truncate">
                  {isVietnamese ? "Toàn hệ thống" : "Fleet-wide units"}
                </p>
                <span className="text-[9px] font-bold text-primary flex items-center">
                  {activeStat === "fleetPulse" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </span>
              </div>
            </div>
          </div>

          {/* Tile 2: Đang phát sóng -> Mở Fleet Pulse */}
          <div
            onClick={() => handleToggle("fleetPulse")}
            className={cn(
              "relative overflow-hidden rounded-2xl border bg-background p-3 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] flex flex-col justify-between transition-all duration-200 cursor-pointer active:scale-[0.98]",
              activeStat === "fleetPulse"
                ? "border-primary/50 ring-2 ring-primary/30"
                : "border-white/70 dark:border-white/10"
            )}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/20"
            />
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                {isVietnamese ? "Đang phát sóng" : "Active Streams"}
              </span>
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-background shadow-[inset_1px_1px_2px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)] text-primary border border-white/30 dark:border-white/10">
                <Radio className="h-3.5 w-3.5 animate-pulse" />
              </div>
            </div>
            <div className="mt-1">
              <div className="flex items-baseline gap-1.5">
                <Typography
                  variant="embossed"
                  as="div"
                  className="text-2xl font-black font-mono tracking-tight !text-primary"
                >
                  {loading ? "..." : online}
                </Typography>
                <span className="text-[10px] font-extrabold text-primary">
                  {onlineRate}%
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-background shadow-[inset_1px_1px_2px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)] flex">
                <div
                  className="h-full rounded-full bg-primary shadow-[0_0_4px_var(--primary)] transition-all duration-700"
                  style={{ width: `${onlineRate}%` }}
                />
              </div>
            </div>
          </div>

          {/* Tile 3: Độ trễ AI -> Mở Edge Telemetry */}
          <div
            onClick={() => handleToggle("edgeTelemetry")}
            className={cn(
              "relative overflow-hidden rounded-2xl border bg-background p-3 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] flex flex-col justify-between transition-all duration-200 cursor-pointer active:scale-[0.98]",
              activeStat === "edgeTelemetry"
                ? "border-primary/50 ring-2 ring-primary/30"
                : "border-white/70 dark:border-white/10"
            )}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/20"
            />
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                {isVietnamese ? "Độ trễ luồng" : "Latency"}
              </span>
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-background shadow-[inset_1px_1px_2px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)] text-primary border border-white/30 dark:border-white/10">
                <Zap className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-1">
              <div className="flex items-baseline gap-1">
                <Typography
                  variant="embossed"
                  as="div"
                  className="text-2xl font-black font-mono tracking-tight text-foreground"
                >
                  {loading ? "..." : avgLatency}
                </Typography>
                <span className="text-[10px] font-bold uppercase text-muted-foreground">
                  ms
                </span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-[10px] text-muted-foreground/80 font-medium truncate">
                  {isLatencyFast
                    ? isVietnamese
                      ? "Cực nhanh (< 60ms)"
                      : "Ultra-fast"
                    : isLatencyOptimal
                    ? isVietnamese
                      ? "Ổn định"
                      : "Optimal"
                    : isVietnamese
                    ? "Độ trễ cao"
                    : "High latency"}
                </p>
                <span className="text-[9px] font-bold text-primary flex items-center">
                  {activeStat === "edgeTelemetry" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </span>
              </div>
            </div>
          </div>

          {/* Tile 4: Mất kết nối / Sự cố -> Mở Signal Diagnostics */}
          <div
            onClick={() => handleToggle("signalDiagnostics")}
            className={cn(
              "relative overflow-hidden rounded-2xl border bg-background p-3 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] flex flex-col justify-between transition-all duration-200 cursor-pointer active:scale-[0.98]",
              activeStat === "signalDiagnostics"
                ? "border-accent/60 ring-2 ring-accent/40"
                : hasWarning
                ? "border-accent/40 bg-accent/[0.04]"
                : "border-white/70 dark:border-white/10"
            )}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/20"
            />
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                {isVietnamese ? "Mất kết nối" : "Offline"}
              </span>
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-background shadow-[inset_1px_1px_2px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)] border border-white/30 dark:border-white/10">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    hasWarning ? "bg-accent animate-ping" : "bg-primary"
                  )}
                />
              </div>
            </div>
            <div className="mt-1">
              <div className="flex items-baseline gap-1.5">
                <Typography
                  variant="embossed"
                  as="div"
                  className={cn(
                    "text-2xl font-black font-mono tracking-tight",
                    hasWarning ? "!text-accent" : "!text-foreground"
                  )}
                >
                  {loading ? "..." : offline}
                </Typography>
                <span
                  className={cn(
                    "text-[9px] font-bold px-1.5 py-0.5 rounded-md",
                    hasWarning
                      ? "bg-accent/15 text-accent"
                      : "bg-primary/10 text-primary"
                  )}
                >
                  {hasWarning
                    ? isVietnamese
                      ? "Cần xử lý"
                      : "Action"
                    : isVietnamese
                    ? "Ổn định"
                    : "Normal"}
                </span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-[10px] text-muted-foreground/80 font-medium truncate">
                  {hasWarning
                    ? isVietnamese
                      ? "Mất nguồn / Rớt mạng"
                      : "Signal outages"
                    : isVietnamese
                    ? "Tất cả thông suốt"
                    : "All clear"}
                </p>
                <span className="text-[9px] font-bold text-accent flex items-center">
                  {activeStat === "signalDiagnostics" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================
            2. DESKTOP & TABLET BENTO CONSOLE (>= md)
            Kiến trúc 3 Khối: 5 Cột (Pulse) | 4 Cột (Telemetry) | 3 Cột (Sentinel)
            ============================================================ */}
        <div className="hidden md:grid md:grid-cols-12 md:gap-4 lg:gap-5">
          {/* ------------------------------------------------------------
              KHỐI 1 (5 CỘT): TRUNG TÂM CHỈ HUY HẠ TẦNG & TỶ LỆ TRỰC TUYẾN
              ------------------------------------------------------------ */}
          <div
            onClick={() => handleToggle("fleetPulse")}
            className={cn(
              "relative group overflow-hidden rounded-[28px] border bg-background p-6 transition-all duration-300 cursor-pointer flex flex-col justify-between",
              activeStat === "fleetPulse"
                ? "border-primary/60 ring-2 ring-primary/40 shadow-[14px_16px_30px_var(--shadow-dark),-14px_-14px_30px_var(--shadow-light)]"
                : "border-white/80 shadow-[10px_10px_22px_var(--shadow-dark),-10px_-10px_22px_var(--shadow-light),inset_1px_1px_2px_rgba(255,255,255,0.9),inset_-1px_-1px_2px_var(--shadow-dark)] hover:-translate-y-1 hover:shadow-[14px_16px_30px_var(--shadow-dark),-14px_-14px_30px_var(--shadow-light)] dark:border-white/15 dark:shadow-[10px_10px_24px_rgba(0,0,0,0.5),-8px_-8px_20px_rgba(255,255,255,0.05),inset_1px_1px_2px_rgba(255,255,255,0.12)]",
              "md:col-span-12 lg:col-span-5"
            )}
          >
            {/* Top hairline highlight */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent dark:via-white/30"
            />
            {/* Ambient radial glow */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-12 -top-12 h-36 w-36 rounded-full bg-primary/10 blur-3xl"
            />

            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-4">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1.5">
                  <Cctv className="h-3.5 w-3.5 text-primary" />
                  {isVietnamese
                    ? "Hạ tầng Camera & Trực tuyến"
                    : "Surveillance Fleet & Stream Pulse"}
                </span>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-background px-2.5 py-0.5 text-[10px] font-bold text-foreground shadow-[inset_1px_1px_2px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_var(--primary)] animate-pulse" />
                    Live Stream Pulse
                  </span>

                  <span className="text-[10px] font-bold text-primary flex items-center gap-0.5">
                    {activeStat === "fleetPulse" ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </span>
                </div>
              </div>

              {/* Số liệu chính (2 cột) */}
              <div className="grid grid-cols-2 gap-4 items-center py-2">
                {/* Tổng số Camera */}
                <div className="space-y-1">
                  <span className="text-xs font-bold text-muted-foreground block">
                    {t("cameras.kpi.total")}
                  </span>
                  <Typography
                    variant="embossed"
                    as="div"
                    className="text-4xl lg:text-5xl font-black tracking-tight !text-foreground font-mono"
                  >
                    {loading ? "..." : total}
                  </Typography>
                  <p className="text-[11px] text-muted-foreground/80 font-medium">
                    {isVietnamese
                      ? "Thiết bị toàn hệ thống"
                      : "Fleet-wide surveillance units"}
                  </p>
                </div>

                {/* Đang hoạt động / Phát sóng trực tiếp */}
                <div className="space-y-1 border-l border-[var(--shadow-dark)]/20 pl-4 dark:border-white/10">
                  <span className="text-xs font-bold text-muted-foreground block">
                    {t("cameras.kpi.online")}
                  </span>
                  <Typography
                    variant="embossed"
                    as="div"
                    className="text-4xl lg:text-5xl font-black tracking-tight !text-primary font-mono"
                  >
                    {loading ? "..." : online}
                  </Typography>
                  <p className="text-[11px] text-muted-foreground/80 font-medium">
                    {isVietnamese
                      ? "Luồng RTSP/HLS trực tiếp"
                      : "Real-time live feeds"}
                  </p>
                </div>
              </div>
            </div>

            {/* Thanh đo tỷ lệ khả dụng & Trực tuyến */}
            <div className="mt-5 space-y-2 pt-3 border-t border-[var(--shadow-dark)]/20 dark:border-white/10">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-muted-foreground">
                  {isVietnamese
                    ? "Tỷ lệ khả dụng luồng video"
                    : "Stream availability uptime"}
                </span>
                <span className="font-extrabold text-foreground font-mono">
                  {isVietnamese
                    ? `${onlineRate}% trực tuyến`
                    : `${onlineRate}% streaming`}
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-background p-0.5 shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] flex gap-1">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-[var(--accent)] shadow-[0_0_8px_var(--primary)] transition-all duration-700"
                  style={{ width: `${onlineRate}%` }}
                />
                {hasWarning && (
                  <div
                    className="h-full rounded-full bg-accent/60 transition-all duration-700"
                    style={{ width: `${Math.max(5, 100 - onlineRate)}%` }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------
              KHỐI 2 (4 CỘT): ĐỒNG HỒ ĐỘ TRỄ MẠNG & TẢI XỬ LÝ BIÊN AI (CIRCULAR DIAL)
              ------------------------------------------------------------ */}
          <div
            onClick={() => handleToggle("edgeTelemetry")}
            className={cn(
              "relative group overflow-hidden rounded-[28px] border bg-background p-6 transition-all duration-300 cursor-pointer flex flex-col justify-between",
              activeStat === "edgeTelemetry"
                ? "border-primary/60 ring-2 ring-primary/40 shadow-[14px_16px_30px_var(--shadow-dark),-14px_-14px_30px_var(--shadow-light)]"
                : "border-white/80 shadow-[10px_10px_22px_var(--shadow-dark),-10px_-10px_22px_var(--shadow-light),inset_1px_1px_2px_rgba(255,255,255,0.9),inset_-1px_-1px_2px_var(--shadow-dark)] hover:-translate-y-1 hover:shadow-[14px_16px_30px_var(--shadow-dark),-14px_-14px_30px_var(--shadow-light)] dark:border-white/15 dark:shadow-[10px_10px_24px_rgba(0,0,0,0.5),-8px_-8px_20px_rgba(255,255,255,0.05),inset_1px_1px_2px_rgba(255,255,255,0.12)]",
              "md:col-span-6 lg:col-span-4"
            )}
          >
            {/* Top hairline highlight */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent dark:via-white/30"
            />
            {/* Ambient radial glow */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl"
            />

            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  {isVietnamese
                    ? "Hiệu năng & Độ trễ luồng"
                    : "Edge Latency & Telemetry"}
                </span>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    Sub-Second Edge
                  </span>
                  <span className="text-[10px] font-bold text-primary flex items-center gap-0.5">
                    {activeStat === "edgeTelemetry" ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </span>
                </div>
              </div>

              {/* Nội dung trung tâm: Circular Dial SVG kết hợp thông số */}
              <div className="flex items-center gap-5 py-2">
                {/* Đồng hồ Gauge Trắc Sinh */}
                <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-background shadow-[5px_5px_11px_var(--shadow-dark),-5px_-5px_11px_var(--shadow-light)] p-2 border border-white/50 dark:border-white/10">
                  <div className="absolute inset-2.5 rounded-full bg-background shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]" />
                  <svg
                    className="relative h-20 w-20 -rotate-90 transform"
                    viewBox="0 0 80 80"
                  >
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      stroke="currentColor"
                      strokeWidth="6"
                      fill="transparent"
                      className="text-[var(--shadow-dark)]/40 dark:text-white/5"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      stroke="url(#cameraDialGradient)"
                      strokeWidth="6"
                      fill="transparent"
                      strokeDasharray={201}
                      strokeDashoffset={201 - (201 * latencyScore) / 100}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                    <defs>
                      <linearGradient
                        id="cameraDialGradient"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        <stop offset="0%" stopColor="var(--primary)" />
                        <stop offset="100%" stopColor="var(--accent)" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-base font-black tracking-tight text-foreground font-mono leading-none">
                      {loading ? "..." : avgLatency}
                    </span>
                    <span className="text-[9px] font-extrabold uppercase text-muted-foreground tracking-wider mt-0.5">
                      ms
                    </span>
                  </div>
                </div>

                {/* Thông tin mô tả bên cạnh */}
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-foreground font-mono">
                      {loading ? "..." : `${avgLatency} ms`}
                    </span>
                    <span className="text-xs text-muted-foreground font-bold">
                      {isVietnamese ? "/ Mục tiêu < 100ms" : "/ Target < 100ms"}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground font-medium line-clamp-2">
                    {isVietnamese
                      ? "Độ trễ truyền tải RTSP về máy chủ xử lý AI thị giác thời gian thực."
                      : "Sub-second edge latency for real-time PPE AI inference pipeline."}
                  </p>
                </div>
              </div>
            </div>

            {/* Inset status pill dưới cùng */}
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-[var(--shadow-dark)]/25 bg-background/70 px-3.5 py-2.5 shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)]">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Activity className="h-4 w-4 text-primary" />
                {isVietnamese ? "Chất lượng đường truyền" : "Stream Quality"}
              </span>
              <span className="text-xs font-bold text-foreground">
                {isLatencyFast
                  ? isVietnamese
                    ? "Tốc độ: Tuyệt hảo (< 60ms)"
                    : "Rating: Excellent (< 60ms)"
                  : isLatencyOptimal
                  ? isVietnamese
                    ? "Tốc độ: Ổn định"
                    : "Rating: Optimal"
                  : isVietnamese
                  ? "Tốc độ: Cần tối ưu mạng"
                  : "Rating: High Latency"}
              </span>
            </div>
          </div>

          {/* ------------------------------------------------------------
              KHỐI 3 (3 CỘT): ĐÈN HẢI ĐĂNG SENTINEL & CHẨN ĐOÁN LỖI LUỒNG
              ------------------------------------------------------------ */}
          <div
            onClick={() => handleToggle("signalDiagnostics")}
            className={cn(
              "relative group overflow-hidden rounded-[28px] border bg-background p-6 transition-all duration-300 cursor-pointer flex flex-col justify-between",
              activeStat === "signalDiagnostics"
                ? "border-accent/60 ring-2 ring-accent/40 shadow-[14px_16px_30px_var(--shadow-dark),-14px_-14px_30px_var(--shadow-light)]"
                : "border-white/80 shadow-[10px_10px_22px_var(--shadow-dark),-10px_-10px_22px_var(--shadow-light),inset_1px_1px_2px_rgba(255,255,255,0.9),inset_-1px_-1px_2px_var(--shadow-dark)] hover:-translate-y-1 hover:shadow-[14px_16px_30px_var(--shadow-dark),-14px_-14px_30px_var(--shadow-light)] dark:border-white/15 dark:shadow-[10px_10px_24px_rgba(0,0,0,0.5),-8px_-8px_20px_rgba(255,255,255,0.05),inset_1px_1px_2px_rgba(255,255,255,0.12)]",
              "md:col-span-6 lg:col-span-3"
            )}
          >
            {/* Top hairline highlight */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent dark:via-white/30"
            />
            {/* Ambient radial glow theo trạng thái */}
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute -right-10 -bottom-10 h-32 w-32 rounded-full blur-3xl transition-colors",
                hasWarning ? "bg-accent/20" : "bg-primary/10"
              )}
            />

            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1.5">
                  <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
                  {isVietnamese ? "Chẩn đoán tín hiệu" : "Signal Diagnostics"}
                </span>

                <div className="flex items-center gap-2">
                  {/* Đèn báo hiệu Hải Đăng (Sentinel LED) */}
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] border border-white/40 dark:border-white/10">
                    <span
                      className={cn(
                        "h-3 w-3 rounded-full transition-all",
                        hasWarning
                          ? "bg-accent shadow-[0_0_10px_var(--accent)] animate-ping"
                          : "bg-primary shadow-[0_0_8px_var(--primary)]"
                      )}
                    />
                  </div>

                  <span className="text-[10px] font-bold text-accent flex items-center gap-0.5">
                    {activeStat === "signalDiagnostics" ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </span>
                </div>
              </div>

              {/* Số liệu mất kết nối */}
              <div className="py-2 space-y-1">
                <span className="text-xs font-bold text-muted-foreground block">
                  {hasWarning
                    ? isVietnamese
                      ? "Camera mất kết nối / Lỗi"
                      : "Disconnected cameras"
                    : isVietnamese
                    ? "Mất nguồn / Mất mạng"
                    : "Signal outages"}
                </span>
                <Typography
                  variant="embossed"
                  as="div"
                  className={cn(
                    "text-4xl lg:text-5xl font-black tracking-tight font-mono",
                    hasWarning ? "!text-accent" : "!text-foreground"
                  )}
                >
                  {loading ? "..." : offline}
                </Typography>
                <p className="text-xs text-muted-foreground/90 font-medium pt-1">
                  {hasWarning
                    ? isVietnamese
                      ? `Phát hiện ${offline} camera mất nguồn hoặc ngắt mạng RTSP`
                      : `${offline} cameras unreachable or signal dropped`
                    : isVietnamese
                    ? "Toàn bộ điểm quan sát hoạt động liên tục 24/7"
                    : "All surveillance channels streaming smoothly"}
                </p>
              </div>
            </div>

            {/* Inset status pill cảnh báo dưới cùng */}
            <div
              className={cn(
                "mt-4 flex items-center justify-between rounded-2xl border px-3.5 py-2.5 shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)]",
                hasWarning
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-[var(--shadow-dark)]/25 bg-background/70 text-foreground"
              )}
            >
              <span className="text-xs font-bold truncate">
                {hasWarning
                  ? isVietnamese
                    ? "Cần kiểm tra kỹ thuật"
                    : "Action required"
                  : isVietnamese
                  ? "Mạng lưới ổn định 100%"
                  : "All systems operational"}
              </span>
              {hasWarning ? (
                <AlertTriangle className="h-4 w-4 shrink-0 text-accent" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
              )}
            </div>
          </div>
        </div>

        {/* ============================================================
            3. KHUNG NỘI DUNG CHI TIẾT MỞ RỘNG (EXPANDABLE DETAIL PANEL)
            Xuất hiện ngay dưới các khối Bento Console khi người dùng click
            ============================================================ */}
        {activeStat && (
          <div className="mt-4 sm:mt-5">
            <CameraStatsDetailPanel
              activeStat={activeStat}
              cameras={cameras}
              onSelectStat={setActiveStat}
              onClose={() => setActiveStat(null)}
              onFilterSite={onFilterSite}
              onFilterStatus={onFilterChange}
              onPing={onPing}
              onOpenRoi={onOpenRoi}
              onEditCamera={onEditCamera}
              onCreateCamera={onCreateCamera}
              onViewLive={onViewLive}
            />
          </div>
        )}
      </section>
    );
  }

  // ============================================================
  // CÁC BIẾN THỂ CỔ ĐIỂN / SOFT-EXTRUDED / DEEP-ELEVATION (FALLBACK)
  // ============================================================
  return (
    <section
      aria-label={
        isVietnamese ? "Thống kê Camera" : "Camera Infrastructure Statistics"
      }
      className={`space-y-4 ${className}`}
    >
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          variant={variant}
          title={t("cameras.kpi.total")}
          value={loading ? "..." : total}
          icon={Camera}
          tone="primary"
          description={
            isVietnamese
              ? "Tổng số thiết bị trong hệ thống"
              : "Connected surveillance units"
          }
          loading={loading}
          hover
          depth="medium"
          border="subtle"
          onClick={() => handleToggle("fleetPulse")}
          className={activeStat === "fleetPulse" ? "ring-2 ring-primary/40" : ""}
        />

        <StatsCard
          variant={variant}
          title={t("cameras.kpi.online")}
          value={loading ? "..." : online}
          icon={Activity}
          tone="success"
          progress={onlineRate}
          progressLabel={`${onlineRate}%`}
          description={
            isVietnamese
              ? `${onlineRate}% luồng RTSP phát trực tiếp`
              : "Real-time RTSP streams"
          }
          loading={loading}
          hover
          depth="medium"
          border="subtle"
          onClick={() => handleToggle("fleetPulse")}
          className={activeStat === "fleetPulse" ? "ring-2 ring-primary/40" : ""}
        />

        <StatsCard
          variant={variant}
          title={t("cameras.kpi.offline")}
          value={loading ? "..." : offline}
          icon={offline > 0 ? AlertTriangle : WifiOff}
          tone={offline > 0 ? "danger" : "default"}
          accentColor={offline > 0 ? "var(--accent)" : undefined}
          description={
            offline > 0
              ? isVietnamese
                ? "Cần kiểm tra kết nối mạng"
                : "Needs inspection / network"
              : isVietnamese
                ? "Tất cả camera ổn định"
                : "All units connected"
          }
          loading={loading}
          hover
          depth="medium"
          border="subtle"
          onClick={() => handleToggle("signalDiagnostics")}
          className={activeStat === "signalDiagnostics" ? "ring-2 ring-accent/40" : ""}
        />

        <StatsCard
          variant={variant}
          title={t("cameras.kpi.avgLatency")}
          value={loading ? "..." : `${avgLatency} ms`}
          icon={Zap}
          tone="info"
          description={
            isVietnamese
              ? "Phản hồi AI thời gian thực"
              : "Sub-second edge response"
          }
          loading={loading}
          hover
          depth="medium"
          border="subtle"
          onClick={() => handleToggle("edgeTelemetry")}
          className={activeStat === "edgeTelemetry" ? "ring-2 ring-primary/40" : ""}
        />
      </div>

      {/* Khung nội dung chi tiết mở rộng cho biến thể cổ điển */}
      {activeStat && (
        <CameraStatsDetailPanel
          activeStat={activeStat}
          cameras={cameras}
          onSelectStat={setActiveStat}
          onClose={() => setActiveStat(null)}
          onFilterSite={onFilterSite}
          onFilterStatus={onFilterChange}
          onPing={onPing}
          onOpenRoi={onOpenRoi}
          onEditCamera={onEditCamera}
          onCreateCamera={onCreateCamera}
          onViewLive={onViewLive}
        />
      )}
    </section>
  );
}
