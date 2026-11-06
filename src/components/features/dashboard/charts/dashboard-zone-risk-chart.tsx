
"use client";

import React, { useMemo, useState } from "react";
import {
  Camera,
  Cctv,
  CheckCircle2,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Video,
  Wifi,
  WifiOff,
  Wrench,
  Activity,
  ArrowUpRight,
} from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import type { CameraItem, CameraStatDto, ZoneItem } from "@/types";

export interface DashboardZoneRiskChartProps {
  cameras?: CameraItem[];
  cameraRankings?: CameraStatDto[];
  zones?: ZoneItem[];
  className?: string;
  loading?: boolean;
  onSelectCamera?: (cameraId: string) => void;
}

interface RealCameraCardItem {
  id: string;
  code: string;
  name: string;
  status: "ONLINE" | "OFFLINE" | "MAINTENANCE";
  totalViolations: number;
  unresolvedViolations: number;
  riskLevel: "HIGH" | "MEDIUM" | "SAFE";
  location: string;
}

const RISK_TONES = {
  HIGH: {
    text: "text-danger",
    bg: "bg-danger/10",
    border: "border-danger/20",
    dot: "bg-danger",
    badge: "border-danger/20 bg-danger/10 text-danger",
    icon: ShieldAlert,
    labelVi: "Điểm nóng",
    labelEn: "High Risk",
  },
  MEDIUM: {
    text: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/20",
    dot: "bg-warning",
    badge: "border-warning/20 bg-warning/10 text-warning",
    icon: ShieldAlert,
    labelVi: "Cần lưu ý",
    labelEn: "Moderate",
  },
  SAFE: {
    text: "text-success",
    bg: "bg-success/10",
    border: "border-success/20",
    dot: "bg-success",
    badge: "border-success/20 bg-success/10 text-success",
    icon: ShieldCheck,
    labelVi: "An toàn",
    labelEn: "Safe",
  },
} as const;

const STATUS_CONFIG = {
  ONLINE: {
    text: "text-success",
    bg: "bg-success/10",
    dot: "bg-success",
    icon: Wifi,
    vi: "Đang hoạt động",
    en: "Online",
  },
  OFFLINE: {
    text: "text-danger",
    bg: "bg-danger/10",
    dot: "bg-danger",
    icon: WifiOff,
    vi: "Mất kết nối",
    en: "Offline",
  },
  MAINTENANCE: {
    text: "text-warning",
    bg: "bg-warning/10",
    dot: "bg-warning",
    icon: Wrench,
    vi: "Bảo trì",
    en: "Maintenance",
  },
} as const;

export function DashboardZoneRiskChart({
  cameras = [],
  cameraRankings = [],
  zones = [],
  className = "",
  loading = false,
  onSelectCamera,
}: DashboardZoneRiskChartProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const [selectedCamId, setSelectedCamId] = useState<string | null>(null);

  // Map cameras with backend rankings
  const cameraCards: RealCameraCardItem[] = useMemo(() => {
    const rankingsMap = new Map<string, CameraStatDto>();

    cameraRankings.forEach((r) => {
      rankingsMap.set(r.cameraId, r);
    });

    if (cameras.length === 0) {
      return cameraRankings.map((r, idx) => {
        const unresolved = Math.max(
          0,
          r.totalViolations - r.resolvedCount,
        );

        return {
          id: r.cameraId,
          code: `CAM-${(idx + 1).toString().padStart(2, "0")}`,
          name: r.cameraName || `Camera AI #${r.cameraId.slice(0, 6)}`,
          status: "ONLINE" as const,
          totalViolations: r.totalViolations,
          unresolvedViolations: unresolved,
          riskLevel:
            unresolved > 3
              ? ("HIGH" as const)
              : unresolved > 0
                ? ("MEDIUM" as const)
                : ("SAFE" as const),
          location: isVietnamese
            ? "Khu vực giám sát AI"
            : "AI Monitored Zone",
        };
      });
    }

    return cameras.map((c) => {
      const ranking = rankingsMap.get(c.id);
      const totalViolations = ranking?.totalViolations ?? 0;
      const resolved = ranking?.resolvedCount ?? 0;
      const unresolved = Math.max(0, totalViolations - resolved);

      let riskLevel: "HIGH" | "MEDIUM" | "SAFE" = "SAFE";

      if (unresolved >= 3 || totalViolations >= 10) {
        riskLevel = "HIGH";
      } else if (unresolved > 0 || totalViolations > 0) {
        riskLevel = "MEDIUM";
      }

      return {
        id: c.id,
        code: c.code || `CAM-${c.id.slice(0, 4).toUpperCase()}`,
        name: c.name,
        status: (c.status as any) || "ONLINE",
        totalViolations,
        unresolvedViolations: unresolved,
        riskLevel,
        location:
          c.location ||
          (isVietnamese ? "Công trường chính" : "Main Construction Site"),
      };
    });
  }, [cameras, cameraRankings, isVietnamese]);

  const activeCam = useMemo(() => {
    return (
      cameraCards.find((c) => c.id === selectedCamId) ||
      cameraCards[0] ||
      null
    );
  }, [cameraCards, selectedCamId]);

  const totalOnline = useMemo(
    () => cameraCards.filter((c) => c.status === "ONLINE").length,
    [cameraCards],
  );

  const totalOffline = cameraCards.filter(
    (c) => c.status === "OFFLINE",
  ).length;

  const totalViolations = cameraCards.reduce(
    (sum, c) => sum + c.totalViolations,
    0,
  );

  const handleSelectCamera = (id: string) => {
    setSelectedCamId(id);
    onSelectCamera?.(id);
  };

  const renderSkeleton = () => (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-[124px] animate-pulse rounded-2xl bg-background/60 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]"
        />
      ))}
    </div>
  );

  return (
    <section
      className={[
        "relative isolate flex h-full min-h-[420px] flex-col overflow-hidden",
        "rounded-[28px] border border-border/40 bg-surface p-4 sm:p-5",
        "shadow-[9px_9px_22px_var(--shadow-dark),-9px_-9px_22px_var(--shadow-light)]",
        className,
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-px rounded-[27px] border border-white/40 dark:border-white/[0.04]" />

      {/* Header */}
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-[inset_1px_1px_3px_var(--shadow-dark),inset_-1px_-1px_3px_var(--shadow-light)]">
              <Cctv size={15} />
            </div>

            <span className="text-[10px] font-black uppercase tracking-[0.17em] text-muted-foreground">
              {isVietnamese
                ? "HỆ THỐNG GIÁM SÁT CAMERA"
                : "CAMERA SURVEILLANCE SYSTEM"}
            </span>
          </div>

          <h3 className="text-base font-extrabold tracking-tight text-foreground sm:text-lg">
            {isVietnamese
              ? "Camera & Điểm nóng rủi ro"
              : "Camera & Risk Hotspots"}
          </h3>

          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {isVietnamese
              ? "Theo dõi tình trạng và vi phạm theo từng camera"
              : "Monitor camera health and violations by location"}
          </p>
        </div>

        {/* Online indicator */}
        <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-success/20 bg-success/10 px-3 py-2 shadow-[3px_3px_8px_var(--shadow-dark),-3px_-3px_8px_var(--shadow-light)]">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-success/10 text-success">
            <Video size={16} />
            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-success" />
          </div>

          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              {isVietnamese ? "Trực tuyến" : "ONLINE"}
            </p>
            <p className="text-base font-black leading-none tabular-nums text-foreground">
              {totalOnline}
              <span className="ml-0.5 text-[10px] font-semibold text-muted-foreground">
                / {cameraCards.length}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Summary metrics */}
      <div className="relative z-10 mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-background/60 p-2.5 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
          <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
            <Camera size={12} />
            <span className="text-[9px] font-semibold">
              {isVietnamese ? "Tổng camera" : "Cameras"}
            </span>
          </div>
          <p className="text-lg font-black leading-tight tabular-nums text-foreground">
            {loading ? "—" : cameraCards.length}
          </p>
        </div>

        <div className="rounded-xl bg-background/60 p-2.5 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
          <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
            <WifiOff size={12} />
            <span className="text-[9px] font-semibold">
              {isVietnamese ? "Ngoại tuyến" : "Offline"}
            </span>
          </div>
          <p className={`text-lg font-black leading-tight tabular-nums ${totalOffline > 0 ? "text-danger" : "text-foreground"}`}>
            {loading ? "—" : totalOffline}
          </p>
        </div>

        <div className="rounded-xl bg-background/60 p-2.5 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
          <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
            <ShieldAlert size={12} />
            <span className="text-[9px] font-semibold">
              {isVietnamese ? "Vi phạm" : "Violations"}
            </span>
          </div>
          <p className="text-lg font-black leading-tight tabular-nums text-foreground">
            {loading ? "—" : totalViolations}
          </p>
        </div>
      </div>

      {/* Camera grid */}
      <div className="relative z-10 my-4 flex-1">
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              {isVietnamese ? "Danh sách camera" : "Camera directory"}
            </span>
          </div>

          <span className="text-[10px] font-semibold text-muted-foreground">
            {isVietnamese
              ? `${cameraCards.length} thiết bị`
              : `${cameraCards.length} devices`}
          </span>
        </div>

        {loading ? (
          renderSkeleton()
        ) : cameraCards.length > 0 ? (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {cameraCards.slice(0, 4).map((cam) => {
              const tone = RISK_TONES[cam.riskLevel];
              const status =
                STATUS_CONFIG[cam.status] || STATUS_CONFIG.OFFLINE;
              const StatusIcon = status.icon;
              const isSelected = activeCam?.id === cam.id;

              return (
                <button
                  key={cam.id}
                  type="button"
                  onClick={() => handleSelectCamera(cam.id)}
                  aria-pressed={isSelected}
                  className={[
                    "group relative flex min-w-0 flex-col rounded-2xl p-3 text-left",
                    "border transition-all duration-200",
                    isSelected
                      ? "border-primary/40 bg-surface shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] ring-1 ring-primary/20"
                      : "border-border/30 bg-background/40 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] hover:border-border/60 hover:bg-background/60",
                  ].join(" ")}
                >
                  {/* Selected accent */}
                  {isSelected && (
                    <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-primary" />
                  )}

                  {/* Card heading */}
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone.bg} ${tone.text}`}
                      >
                        <Camera size={17} />
                      </div>

                      <div className="min-w-0">
                        <p className="font-mono text-[9px] font-bold tracking-wide text-muted-foreground">
                          {cam.code}
                        </p>
                        <h4 className="truncate text-xs font-extrabold text-foreground">
                          {cam.name}
                        </h4>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-lg border px-2 py-1 text-[9px] font-bold ${tone.badge}`}
                    >
                      {isVietnamese
                        ? tone.labelVi
                        : tone.labelEn}
                    </span>
                  </div>

                  {/* Location */}
                  <div className="mt-3 flex min-w-0 items-center gap-1.5">
                    <MapPin
                      size={12}
                      className="shrink-0 text-muted-foreground"
                    />
                    <span className="truncate text-[10px] text-muted-foreground">
                      {cam.location}
                    </span>
                  </div>

                  {/* Bottom metrics */}
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/30 pt-2.5">
                    <div
                      className={`flex min-w-0 items-center gap-1.5 ${status.text}`}
                    >
                      <StatusIcon size={12} />
                      <span className="truncate text-[9px] font-bold">
                        {isVietnamese ? status.vi : status.en}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 text-[9px]">
                      <span className="font-semibold tabular-nums text-muted-foreground">
                        {cam.totalViolations}{" "}
                        {isVietnamese ? "tổng" : "total"}
                      </span>

                      <span
                        className={`font-extrabold tabular-nums ${
                          cam.unresolvedViolations > 0
                            ? "text-warning"
                            : "text-success"
                        }`}
                      >
                        {cam.unresolvedViolations > 0
                          ? `${cam.unresolvedViolations} ${isVietnamese ? "chờ xử lý" : "open"}`
                          : isVietnamese
                            ? "0 tồn đọng"
                            : "0 pending"}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-[170px] flex-col items-center justify-center rounded-2xl bg-background/50 p-5 text-center shadow-[inset_2px_2px_6px_var(--shadow-dark),inset_-2px_-2px_6px_var(--shadow-light)]">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
              <Cctv size={23} />
            </div>
            <p className="text-xs font-bold text-foreground">
              {isVietnamese
                ? "Chưa có camera kết nối"
                : "No cameras connected"}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {isVietnamese
                ? "Các thiết bị sẽ xuất hiện tại đây khi được đăng ký"
                : "Registered devices will appear here"}
            </p>
          </div>
        )}
      </div>

      {/* Focus camera panel */}
      {activeCam && !loading ? (
        <div className="relative z-10 overflow-hidden rounded-2xl border border-primary/20 bg-surface shadow-[3px_3px_9px_var(--shadow-dark),-3px_-3px_9px_var(--shadow-light)]">
          <div className="flex items-center justify-between gap-3 p-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[inset_1px_1px_3px_var(--shadow-dark),inset_-1px_-1px_3px_var(--shadow-light)]">
                <Video size={17} />
              </div>

              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  {isVietnamese ? "Camera đang theo dõi" : "Focused camera"}
                </p>
                <p className="truncate text-xs font-extrabold text-foreground">
                  {activeCam.name}
                  <span className="ml-1.5 font-mono text-[9px] font-semibold text-muted-foreground">
                    {activeCam.code}
                  </span>
                </p>
              </div>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-lg font-black leading-none tabular-nums text-primary">
                {activeCam.totalViolations}
              </p>
              <p className="mt-1 text-[9px] font-medium text-muted-foreground">
                {isVietnamese ? "Vi phạm ghi nhận" : "Violations"}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border/30 bg-background/30 px-3 py-2">
            <div className="flex min-w-0 items-center gap-1.5 text-[10px] text-muted-foreground">
              <MapPin size={11} className="shrink-0" />
              <span className="truncate">{activeCam.location}</span>
            </div>

            <div
              className={`flex shrink-0 items-center gap-1.5 text-[9px] font-bold ${
                activeCam.status === "ONLINE"
                  ? "text-success"
                  : activeCam.status === "OFFLINE"
                    ? "text-danger"
                    : "text-warning"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  activeCam.status === "ONLINE"
                    ? "bg-success"
                    : activeCam.status === "OFFLINE"
                      ? "bg-danger"
                      : "bg-warning"
                }`}
              />
              {isVietnamese
                ? STATUS_CONFIG[activeCam.status]?.vi
                : STATUS_CONFIG[activeCam.status]?.en}
            </div>
          </div>
        </div>
      ) : null}

      {/* Footer */}
      <div className="relative z-10 mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Activity size={12} className="text-primary" />
          <span>
            {isVietnamese
              ? `${totalOnline} camera đang hoạt động`
              : `${totalOnline} cameras operational`}
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-bold text-primary">
          <CheckCircle2 size={12} />
          {isVietnamese ? "Dữ liệu đồng bộ" : "Data synchronized"}
        </div>
      </div>
    </section>
  );
}
