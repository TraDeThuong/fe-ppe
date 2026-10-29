"use client";

import { useMemo, useState } from "react";
import {
  Cctv,
  Radio,
  Zap,
  AlertTriangle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { StatsCard } from "@/components/ui/stats-cards";
import { useLocale } from "@/providers/locale-provider";
import type { CameraItem, CameraStatus } from "@/types";
import {
  CameraStatsDetailPanel,
  type CameraStatKey,
} from "./camera-stats-detail-panel";

export type CameraKpiStatKey =
  | "totalCameras"
  | "onlineStreams"
  | "edgeTelemetry"
  | "signalDiagnostics";

export interface CameraKpiSummaryProps {
  /** Danh sách camera từ API */
  cameras: CameraItem[];
  /** Trạng thái đang tải dữ liệu */
  loading?: boolean;
  /** Key thống kê đang chọn từ URL */
  selectedStat?: CameraKpiStatKey | null;
  /** Hàm callback khi chọn thống kê */
  onSelectStat?: (stat: CameraKpiStatKey | null) => void;
  /** Bộ lọc trạng thái đang áp dụng trên trang */
  activeFilter?: string;
  /** Hàm callback khi lọc danh sách camera */
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
  selectedStat: propSelectedStat,
  onSelectStat,
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

  // Quản lý tab nội bộ nếu không dùng URL
  const [internalSelectedStat, setInternalSelectedStat] =
    useState<CameraKpiStatKey | null>(null);

  const activeStat =
    propSelectedStat !== undefined ? propSelectedStat : internalSelectedStat;

  const handleToggle = (key: CameraKpiStatKey) => {
    const next = activeStat === key ? null : key;
    if (onSelectStat) {
      onSelectStat(next);
    } else {
      setInternalSelectedStat(next);
    }
  };

  // Tính toán số liệu thống kê
  const { total, online, offline, avgLatency, onlineRate } = useMemo(() => {
    const tot = cameras.length;
    let onl = 0;
    let offl = 0;
    const validLatencies: number[] = [];

    for (const c of cameras) {
      if (c.status === "ONLINE") {
        onl++;
      } else if (c.status === "OFFLINE" || c.status === "ERROR") {
        offl++;
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

    return {
      total: tot,
      online: onl,
      offline: offl,
      avgLatency: calculatedAvgLatency,
      onlineRate: rate,
    };
  }, [cameras]);

  const isLatencyFast = avgLatency > 0 && avgLatency <= 60;
  const isLatencyOptimal = avgLatency <= 120;

  // Hiệu ứng chìm sâu (neumorphic sunken) đồng bộ với trang Roles và Sites:
  // - Chìm xuống dưới (translate-y-1.5)
  // - Đổ bóng âm sâu 2 lớp (deep inset shadow)
  // - Tuyệt đối KHÔNG có màu viền hay ring bao quanh
  const sunkenClass =
    "!translate-y-1.5 !shadow-[inset_6px_6px_14px_var(--shadow-dark),inset_-6px_-6px_14px_var(--shadow-light),inset_2px_2px_4px_rgba(0,0,0,0.18)] dark:!shadow-[inset_6px_6px_16px_rgba(0,0,0,0.7),inset_-4px_-4px_10px_rgba(255,255,255,0.03)] hover:!translate-y-1.5 hover:!shadow-[inset_6px_6px_14px_var(--shadow-dark),inset_-6px_-6px_14px_var(--shadow-light),inset_2px_2px_4px_rgba(0,0,0,0.18)]";

  // Map từ CameraKpiStatKey sang panel CameraStatKey
  const panelStatKey: CameraStatKey | null =
    activeStat === "totalCameras" || activeStat === "onlineStreams"
      ? "fleetPulse"
      : activeStat === "edgeTelemetry"
      ? "edgeTelemetry"
      : activeStat === "signalDiagnostics"
      ? "signalDiagnostics"
      : null;

  return (
    <section
      aria-label={
        isVietnamese ? "Thống kê Camera" : "Camera Infrastructure Statistics"
      }
      className={`space-y-4 ${className}`}
    >
      {/* 4 Thẻ KPI Bento Đối Xứng Đồng Nhất (Chuẩn phong cách Roles & Users) */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        {/* 1. Tổng số Camera */}
        <StatsCard
          title={t("cameras.kpi.total")}
          value={loading ? "..." : total}
          icon={Cctv}
          variant="soft-extruded"
          tone="primary"
          showGlow={false}
          description={
            isVietnamese
              ? "Thiết bị giám sát toàn hệ thống"
              : "Fleet-wide surveillance units"
          }
          onClick={() => handleToggle("totalCameras")}
          className={`transition-all duration-200 cursor-pointer ${
            activeStat === "totalCameras"
              ? sunkenClass
              : "hover:border-primary/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "totalCameras" ? (
                <span className="flex items-center text-primary font-bold gap-0.5">
                  {isVietnamese ? "Thu gọn" : "Collapse"}{" "}
                  <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground gap-0.5">
                  {isVietnamese ? "Xem phân bổ" : "View Details"}{" "}
                  <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />

        {/* 2. Luồng trực tuyến */}
        <StatsCard
          title={t("cameras.kpi.online")}
          value={loading ? "..." : online}
          icon={Radio}
          variant="soft-extruded"
          tone="primary"
          showGlow={false}
          progress={onlineRate}
          progressLabel={`${onlineRate}%`}
          description={
            isVietnamese
              ? `${onlineRate}% luồng phát sóng trực tiếp`
              : `${onlineRate}% live streaming`
          }
          onClick={() => handleToggle("onlineStreams")}
          className={`transition-all duration-200 cursor-pointer ${
            activeStat === "onlineStreams"
              ? sunkenClass
              : "hover:border-emerald-500/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "onlineStreams" ? (
                <span className="flex items-center text-primary font-bold gap-0.5">
                  {isVietnamese ? "Thu gọn" : "Collapse"}{" "}
                  <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-emerald-600 dark:text-emerald-400 font-bold gap-0.5">
                  {onlineRate}% {isVietnamese ? "Khả dụng" : "Ready"}{" "}
                  <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />

        {/* 3. Độ trễ AI Edge */}
        <StatsCard
          title={t("cameras.kpi.avgLatency")}
          value={loading ? "..." : `${avgLatency} ms`}
          icon={Zap}
          variant="soft-extruded"
          tone={isLatencyFast ? "primary" : isLatencyOptimal ? "info" : "warning"}
          showGlow={false}
          description={
            isLatencyFast
              ? isVietnamese
                ? "Cực nhanh (< 60ms) • AI Realtime"
                : "Ultra-fast (< 60ms)"
              : isLatencyOptimal
              ? isVietnamese
                ? "Độ trễ ổn định cho AI Edge"
                : "Optimal edge latency"
              : isVietnamese
              ? "Cần tối ưu băng thông luồng"
              : "High network latency"
          }
          onClick={() => handleToggle("edgeTelemetry")}
          className={`transition-all duration-200 cursor-pointer ${
            activeStat === "edgeTelemetry"
              ? sunkenClass
              : "hover:border-primary/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "edgeTelemetry" ? (
                <span className="flex items-center text-primary font-bold gap-0.5">
                  {isVietnamese ? "Thu gọn" : "Collapse"}{" "}
                  <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground gap-0.5">
                  {isVietnamese ? "Xem Telemetry" : "Telemetry"}{" "}
                  <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />

        {/* 4. Sức khỏe & Sự cố */}
        <StatsCard
          title={isVietnamese ? "Sức khỏe & Sự cố" : "Signal & Alerts"}
          value={loading ? "..." : offline}
          icon={offline > 0 ? AlertTriangle : ShieldCheck}
          variant="soft-extruded"
          tone={offline > 0 ? "danger" : "primary"}
          accentColor={offline > 0 ? "var(--accent)" : undefined}
          showGlow={false}
          description={
            offline > 0
              ? isVietnamese
                ? `${offline} camera mất kết nối / cần xử lý`
                : `${offline} units offline / action needed`
              : isVietnamese
              ? "100% luồng giám sát ổn định"
              : "All channels operational"
          }
          onClick={() => handleToggle("signalDiagnostics")}
          className={`transition-all duration-200 cursor-pointer ${
            activeStat === "signalDiagnostics"
              ? sunkenClass
              : "hover:border-accent/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "signalDiagnostics" ? (
                <span className="flex items-center text-accent font-bold gap-0.5">
                  {isVietnamese ? "Thu gọn" : "Collapse"}{" "}
                  <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground gap-0.5">
                  {isVietnamese ? "Chẩn đoán mạng" : "Signal Health"}{" "}
                  <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />
      </div>

      {/* Khung nội dung chi tiết mở rộng ngay dưới stats */}
      {panelStatKey && (
        <div className="pt-2 animate-in fade-in-50 slide-in-from-top-3 duration-300">
          <CameraStatsDetailPanel
            activeStat={panelStatKey}
            cameras={cameras}
            onSelectStat={(nextPanelKey) => {
              if (nextPanelKey === "fleetPulse") {
                handleToggle("totalCameras");
              } else if (nextPanelKey === "edgeTelemetry") {
                handleToggle("edgeTelemetry");
              } else if (nextPanelKey === "signalDiagnostics") {
                handleToggle("signalDiagnostics");
              }
            }}
            onClose={() => {
              if (onSelectStat) {
                onSelectStat(null);
              } else {
                setInternalSelectedStat(null);
              }
            }}
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
