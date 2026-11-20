"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Camera,
  CheckCircle2,
  Filter,
  Radio,
  ShieldAlert,
  Users,
  WifiOff,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NM } from "@/components/features/ai-test/nm-styles";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { useLocale } from "@/providers/locale-provider";
import { findSessionForCamera, toSafeLiveCameraId } from "./camera-live-helpers";
import type { LiveSessionInfo } from "@/types/ai-test.types";
import type { CameraItem } from "@/types";

export type CameraKpiFilterKey = "all" | "online" | "ai_live" | "violations";

export interface CameraStatsDetailPanelProps {
  activeStat: CameraKpiFilterKey;
  cameras: CameraItem[];
  sessions: LiveSessionInfo[];
  isFleetFilteredByThisStat: boolean;
  onToggleFleetFilter: (key: CameraKpiFilterKey) => void;
  onClose: () => void;
}

export function CameraStatsDetailPanel({
  activeStat,
  cameras,
  sessions,
  isFleetFilteredByThisStat,
  onToggleFleetFilter,
  onClose,
}: CameraStatsDetailPanelProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const sessionMap = useMemo(() => {
    const map = new Map<string, LiveSessionInfo>();
    for (const s of sessions) {
      map.set(s.camera_id, s);
    }
    return map;
  }, [sessions]);

  const cameraByLiveId = useMemo(() => {
    const map = new Map<string, CameraItem>();
    for (const cam of cameras) {
      map.set(toSafeLiveCameraId(cam), cam);
      map.set(cam.code, cam);
      map.set(cam.id, cam);
    }
    return map;
  }, [cameras]);

  const runningSessions = useMemo(
    () => sessions.filter((s) => s.status === "running"),
    [sessions],
  );

  const dbBreakdown = useMemo(() => {
    let online = 0;
    let offline = 0;
    let maintenance = 0;
    let error = 0;
    const bySource = new Map<string, number>();

    for (const cam of cameras) {
      if (cam.status === "ONLINE") online += 1;
      else if (cam.status === "MAINTENANCE") maintenance += 1;
      else if (cam.status === "ERROR") error += 1;
      else offline += 1;

      const src = (cam.sourceType || "RTSP").toUpperCase();
      bySource.set(src, (bySource.get(src) ?? 0) + 1);
    }

    return {
      online,
      offline,
      maintenance,
      error,
      sources: Array.from(bySource.entries()).sort((a, b) => b[1] - a[1]),
    };
  }, [cameras]);

  const onlineStats = useMemo(() => {
    const onlineCams = cameras.filter((c) => c.status === "ONLINE");
    const offlineCams = cameras.filter((c) => c.status !== "ONLINE");
    const latencies = onlineCams
      .map((c) => c.currentLatencyMs)
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    const avgLatency =
      latencies.length > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : null;

    return { onlineCams, offlineCams, avgLatency };
  }, [cameras]);

  const violationSummary = useMemo(() => {
    let activeTotal = 0;
    let totalPersons = 0;
    let totalHelmets = 0;
    let totalVests = 0;
    const alertingSessions: {
      session: LiveSessionInfo;
      camera?: CameraItem;
      activeCount: number;
    }[] = [];

    for (const s of runningSessions) {
      const activeCount = s.metrics?.active_violations ?? 0;
      activeTotal += activeCount;
      totalPersons +=
        s.metrics?.counts?.person ?? s.metrics?.active_persons ?? 0;
      totalHelmets += s.metrics?.counts?.helmet ?? 0;
      totalVests += s.metrics?.counts?.safety_vest ?? 0;

      if (activeCount > 0) {
        alertingSessions.push({
          session: s,
          camera: cameraByLiveId.get(s.camera_id),
          activeCount,
        });
      }
    }

    return {
      activeTotal,
      totalPersons,
      totalHelmets,
      totalVests,
      alertingSessions,
    };
  }, [cameraByLiveId, runningSessions]);

  const headerMeta = useMemo(() => {
    switch (activeStat) {
      case "all":
        return {
          icon: <Camera className="h-4 w-4 text-primary" />,
          title: isVietnamese
            ? "Chi tiết Tổng Thiết Bị Camera"
            : "Total Camera Devices Details",
          badge: isVietnamese
            ? `${cameras.length} thiết bị`
            : `${cameras.length} devices`,
          subtitle: isVietnamese
            ? "Phân bổ theo trạng thái kết nối DB và giao thức nguồn truyền phát"
            : "Distribution by DB connection status and streaming source protocol",
          canFilterList: false,
        };
      case "online":
        return {
          icon: <Activity className="h-4 w-4 text-emerald-500" />,
          title: isVietnamese
            ? "Chi tiết Camera Sẵn Sàng Kết Nối DB"
            : "DB Connected Cameras Details",
          badge: `${dbBreakdown.online}/${cameras.length} ONLINE`,
          subtitle: isVietnamese
            ? "Danh sách thiết bị đạt trạng thái ONLINE và độ trễ ping gần nhất từ Camera Service"
            : "ONLINE devices and latest ping latency from Camera Service",
          canFilterList: true,
        };
      case "ai_live":
        return {
          icon: <Radio className="h-4 w-4 text-amber-500" />,
          title: isVietnamese
            ? "Chi tiết Phiên Đang AI Live Tracking"
            : "Active AI Live Tracking Sessions",
          badge: isVietnamese
            ? `${runningSessions.length} luồng LIVE`
            : `${runningSessions.length} LIVE streams`,
          subtitle: isVietnamese
            ? "Các luồng suy luận đang chạy trực tiếp trên AI Engine (FPS, độ trễ & số người bám vết)"
            : "Active inference streams running on AI Engine (FPS, latency & tracked persons)",
          canFilterList: true,
        };
      case "violations":
        return {
          icon: <ShieldAlert className="h-4 w-4 text-danger" />,
          title: isVietnamese
            ? "Chi tiết Vi Phạm Đang Kích Hoạt Real-time"
            : "Active Real-Time Violations",
          badge: isVietnamese
            ? `${violationSummary.activeTotal} đang mở`
            : `${violationSummary.activeTotal} active`,
          subtitle: isVietnamese
            ? "Các camera đang phát hiện thiếu bảo hộ (Mũ / Áo / Vùng cấm) ở khung hình hiện tại"
            : "Cameras currently detecting PPE violations (Helmet / Vest / Restricted Area)",
          canFilterList: true,
        };
    }
  }, [
    activeStat,
    cameras.length,
    dbBreakdown.online,
    isVietnamese,
    runningSessions.length,
    violationSummary.activeTotal,
  ]);

  return (
<div className="relative overflow-hidden rounded-[26px] border border-white/70 bg-surface p-4 sm:p-6 shadow-[9px_9px_20px_var(--shadow-dark),-9px_-9px_20px_rgba(255,255,255,0.88)] transition-all duration-300 dark:border-white/[0.06] dark:bg-card dark:shadow-[9px_9px_22px_rgba(0,0,0,0.58),-4px_-4px_12px_rgba(255,255,255,0.03)] animate-in fade-in slide-in-from-top-2">
  {/* Specular Rim Top Highlight */}
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent"
  />

  {/* =========================================================
      1. HEADER TOOLBAR
  ========================================================= */}
  <div className="relative mb-5 flex flex-wrap items-center justify-between gap-3 pb-4 before:absolute before:inset-x-0 before:bottom-0 before:h-[1px] before:bg-gradient-to-r before:from-primary/35 before:via-border/45 before:to-transparent">
    <div className="flex min-w-0 items-center gap-3.5">
      {/* Extruded + Debossed Emblem Pod */}
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] border border-white/70 bg-surface text-primary shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.9)] dark:border-white/[0.06] dark:bg-card dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5)]">
        <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary/[0.08] shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_rgba(255,255,255,0.75)] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.65)]">
          {headerMeta.icon}
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-extrabold tracking-tight text-foreground sm:text-[15px]">
            {headerMeta.title}
          </h3>
          {/* Recessed Telemetry Badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-background/65 px-2.5 py-0.5 font-mono text-[10.5px] font-extrabold text-primary shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] dark:bg-black/30 dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.65)]">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_5px_var(--primary)]" />
            {headerMeta.badge}
          </span>
        </div>
        <p className="mt-0.5 hidden truncate text-xs text-muted-foreground sm:block">
          {headerMeta.subtitle}
        </p>
      </div>
    </div>

    {/* Action Controls */}
    <div className="flex shrink-0 items-center gap-2.5">
      {headerMeta.canFilterList && (
        <button
          type="button"
          onClick={() => onToggleFleetFilter(activeStat)}
          className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-[13px] px-3.5 text-xs font-extrabold transition-all duration-150 ${
            isFleetFilteredByThisStat
              ? "bg-primary text-primary-foreground shadow-[4px_4px_12px_rgba(var(--primary-rgb),0.35),-3px_-3px_8px_rgba(255,255,255,0.7)] hover:brightness-105 active:scale-[0.98]"
              : "border border-white/70 bg-surface text-foreground shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.85)] hover:text-primary active:shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_rgba(255,255,255,0.85)] dark:border-white/[0.06] dark:bg-card dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45)]"
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          <span>
            {isFleetFilteredByThisStat
              ? isVietnamese
                ? "Bỏ lọc danh sách"
                : "Clear list filter"
              : isVietnamese
                ? "Lọc danh sách dưới"
                : "Filter list below"}
          </span>
        </button>
      )}

      <button
        type="button"
        onClick={onClose}
        aria-label={isVietnamese ? "Đóng bảng chi tiết" : "Close details panel"}
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[13px] border border-white/70 bg-surface text-muted-foreground shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.85)] transition-all duration-150 hover:text-danger active:shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_rgba(255,255,255,0.85)] dark:border-white/[0.06] dark:bg-card dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45)]"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  </div>

  {/* =========================================================
      2. BODY PER STAT
  ========================================================= */}

  {/* ── TAB: ALL CAMERAS ────────────────────────────────────── */}
  {activeStat === "all" && (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      {/* Left Breakdown Well */}
      <div
        className={`flex flex-col justify-between space-y-4 rounded-[20px] p-4 lg:col-span-5 ${NM.recessed}`}
      >
        <div className="space-y-3">
          <p className="px-0.5 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
            {isVietnamese
              ? "Phân bổ Trạng thái DB & Giao thức"
              : "DB Status & Protocol Breakdown"}
          </p>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div
              className={`relative overflow-hidden rounded-[16px] border border-white/60 p-3 dark:border-white/[0.05] ${NM.extruded}`}
            >
              <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold tracking-wider text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.7)]" />
                ONLINE
              </span>
              <p className="mt-1 font-mono text-xl font-black tabular-nums text-emerald-500">
                <AnimatedNumber value={dbBreakdown.online} />
              </p>
            </div>

            <div
              className={`relative overflow-hidden rounded-[16px] border border-white/60 p-3 dark:border-white/[0.05] ${NM.extruded}`}
            >
              <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold tracking-wider text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                OFFLINE
              </span>
              <p className="mt-1 font-mono text-xl font-black tabular-nums text-muted-foreground">
                <AnimatedNumber value={dbBreakdown.offline} />
              </p>
            </div>

            <div
              className={`relative overflow-hidden rounded-[16px] border border-white/60 p-3 dark:border-white/[0.05] ${NM.extruded}`}
            >
              <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold tracking-wider text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.7)]" />
                {isVietnamese ? "BẢO TRÌ" : "MAINTENANCE"}
              </span>
              <p className="mt-1 font-mono text-xl font-black tabular-nums text-amber-500">
                <AnimatedNumber value={dbBreakdown.maintenance} />
              </p>
            </div>

            <div
              className={`relative overflow-hidden rounded-[16px] border border-white/60 p-3 dark:border-white/[0.05] ${NM.extruded}`}
            >
              <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold tracking-wider text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-danger shadow-[0_0_5px_var(--danger)]" />
                {isVietnamese ? "LỖI" : "ERROR"}
              </span>
              <p className="mt-1 font-mono text-xl font-black tabular-nums text-danger">
                <AnimatedNumber value={dbBreakdown.error} />
              </p>
            </div>
          </div>
        </div>

        {dbBreakdown.sources.length > 0 && (
          <div className="space-y-1.5 border-t border-border/25 pt-3">
            <span className="px-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
              {isVietnamese ? "Giao thức luồng" : "Stream protocols"}
            </span>
            <div className="flex flex-wrap gap-2">
              {dbBreakdown.sources.map(([src, count]) => (
                <span
                  key={src}
                  className="rounded-xl border border-white/60 bg-surface px-2.5 py-1 font-mono text-[11px] font-extrabold text-primary shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_rgba(255,255,255,0.85)] dark:border-white/[0.05] dark:bg-card dark:shadow-[2px_2px_5px_rgba(0,0,0,0.5)]"
                >
                  {src}: <strong className="text-foreground">{count}</strong>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Quick Device List */}
      <div className={`space-y-3 rounded-[20px] p-4 lg:col-span-7 ${NM.recessed}`}>
        <div className="flex items-center justify-between px-1">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
            {isVietnamese
              ? `Danh sách nhanh Thiết bị (${cameras.length})`
              : `Quick Device List (${cameras.length})`}
          </p>
        </div>

        {cameras.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-xs font-medium text-muted-foreground">
            {isVietnamese
              ? "Chưa có camera nào trong hệ thống."
              : "No cameras registered yet."}
          </div>
        ) : (
          <div className="max-h-60 space-y-2.5 overflow-y-auto p-0.5 pr-1.5">
            {cameras.map((cam) => {
              const sess = findSessionForCamera(sessionMap, cam);
              const isLive = sess?.status === "running";
              return (
                <Link
                  key={cam.id}
                  href={`/cameras/${cam.id}`}
                  className={`group flex items-center justify-between gap-3 rounded-[15px] border border-white/60 px-3.5 py-2.5 text-xs transition-all duration-200 hover:-translate-y-0.5 dark:border-white/[0.05] ${NM.extruded}`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="rounded-lg bg-primary/[0.08] px-2 py-0.5 font-mono text-[10px] font-extrabold text-primary shadow-[inset_1px_1px_2px_var(--shadow-dark)] dark:bg-primary/15">
                      {cam.code}
                    </span>
                    <span className="truncate font-bold text-foreground transition-colors group-hover:text-primary">
                      {cam.name}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 font-mono text-[10px]">
                    {isLive && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 font-extrabold text-accent">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                        LIVE
                      </span>
                    )}
                    <span
                      className={`rounded-md px-1.5 py-0.5 font-extrabold ${
                        cam.status === "ONLINE"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-background/60 text-muted-foreground dark:bg-black/30"
                      }`}
                    >
                      {cam.status}
                    </span>
                    <ArrowUpRight className="size-3.5 text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  )}

  {/* ── TAB: ONLINE CAMERAS ─────────────────────────────────── */}
  {activeStat === "online" && (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      {/* Left Health Summary */}
      <div className={`space-y-3 rounded-[20px] p-4 lg:col-span-4 ${NM.recessed}`}>
        <p className="px-0.5 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
          {isVietnamese
            ? "Sức khỏe Kết nối Camera DB"
            : "Camera DB Connection Health"}
        </p>

        <div className="space-y-2.5 text-xs">
          <div
            className={`flex items-center justify-between rounded-[15px] border border-white/60 p-3.5 dark:border-white/[0.05] ${NM.extruded}`}
          >
            <span className="font-semibold text-muted-foreground">
              {isVietnamese ? "Tỷ lệ khả dụng" : "Availability rate"}
            </span>
            <span className="rounded-lg bg-emerald-500/10 px-2.5 py-0.5 font-mono text-sm font-black text-emerald-500">
              {cameras.length > 0
                ? `${Math.round((onlineStats.onlineCams.length / cameras.length) * 100)}%`
                : "0%"}
            </span>
          </div>

          <div
            className={`flex items-center justify-between rounded-[15px] border border-white/60 p-3.5 dark:border-white/[0.05] ${NM.extruded}`}
          >
            <span className="font-semibold text-muted-foreground">
              {isVietnamese ? "Độ trễ trung bình" : "Average latency"}
            </span>
            <span className="rounded-lg bg-background/60 px-2.5 py-0.5 font-mono text-sm font-black text-foreground shadow-[inset_1px_1px_3px_var(--shadow-dark)] dark:bg-black/30">
              {onlineStats.avgLatency != null
                ? `${onlineStats.avgLatency} ms`
                : "-- ms"}
            </span>
          </div>

          <div
            className={`flex items-center justify-between rounded-[15px] border border-white/60 p-3.5 dark:border-white/[0.05] ${NM.extruded}`}
          >
            <span className="font-semibold text-muted-foreground">
              {isVietnamese ? "Chưa sẵn sàng" : "Not ready"}
            </span>
            <span className="rounded-lg bg-amber-500/10 px-2.5 py-0.5 font-mono text-sm font-black text-amber-500">
              {onlineStats.offlineCams.length}{" "}
              <span className="font-sans text-[11px] font-bold">
                {isVietnamese ? "thiết bị" : "devices"}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Right Online & Attention List */}
      <div className={`space-y-3 rounded-[20px] p-4 lg:col-span-8 ${NM.recessed}`}>
        <p className="px-1 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
          {isVietnamese
            ? `Camera ONLINE (${onlineStats.onlineCams.length}) & Cần kiểm tra (${onlineStats.offlineCams.length})`
            : `ONLINE (${onlineStats.onlineCams.length}) & Attention Needed (${onlineStats.offlineCams.length})`}
        </p>

        <div className="max-h-60 space-y-2.5 overflow-y-auto p-0.5 pr-1.5">
          {onlineStats.onlineCams.map((cam) => (
            <Link
              key={cam.id}
              href={`/cameras/${cam.id}`}
              className={`group flex items-center justify-between gap-3 rounded-[15px] border border-white/60 px-3.5 py-2.5 text-xs transition-all duration-200 hover:-translate-y-0.5 dark:border-white/[0.05] ${NM.extruded}`}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-extrabold text-primary">
                  {cam.code}
                </span>
                <span className="truncate font-bold text-foreground transition-colors group-hover:text-primary">
                  {cam.name}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-2.5 font-mono text-[10px] text-muted-foreground">
                <span className="rounded bg-background/60 px-1.5 py-0.5 font-bold dark:bg-black/30">
                  {cam.sourceType || "RTSP"}
                </span>
                <span className="font-bold text-foreground">
                  {cam.currentLatencyMs != null
                    ? `${cam.currentLatencyMs} ms`
                    : "--"}
                </span>
                <ArrowUpRight className="size-3.5 text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </Link>
          ))}

          {onlineStats.offlineCams.map((cam) => (
            <Link
              key={cam.id}
              href={`/cameras/${cam.id}`}
              className={`group flex items-center justify-between gap-3 rounded-[15px] border border-white/50 px-3.5 py-2.5 text-xs opacity-80 transition-all duration-200 hover:opacity-100 dark:border-white/[0.04] ${NM.extruded}`}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <WifiOff className="size-4 shrink-0 text-amber-500" />
                <span className="rounded-md bg-background/70 px-2 py-0.5 font-mono text-[10px] font-bold text-muted-foreground dark:bg-black/35">
                  {cam.code}
                </span>
                <span className="truncate font-medium text-foreground">
                  {cam.name}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-2 font-mono text-[10px]">
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-extrabold text-amber-500">
                  {cam.status}
                </span>
                <ArrowUpRight className="size-3.5 text-primary" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )}

  {/* ── TAB: AI LIVE STREAMS ────────────────────────────────── */}
  {activeStat === "ai_live" && (
    <div className={`space-y-3 rounded-[20px] p-4 ${NM.recessed}`}>
      {runningSessions.length === 0 ? (
        <div className="py-8 text-center text-xs leading-relaxed text-muted-foreground">
          {isVietnamese ? (
            <>
              Hiện chưa có luồng camera nào đang bật AI Live Tracking trên AI Engine. Nhấn{" "}
              <strong className="font-extrabold text-primary">Bắt đầu AI Live</strong> ở thẻ camera hoặc mở trang chi tiết để khởi chạy.
            </>
          ) : (
            <>
              No camera streams are currently running AI Live Tracking. Click{" "}
              <strong className="font-extrabold text-primary">Start AI Live</strong> on any camera card or open Camera Studio.
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          {runningSessions.map((sess) => {
            const matchedCam = cameraByLiveId.get(sess.camera_id);
            const persons =
              sess.metrics?.counts?.person ??
              sess.metrics?.active_persons ??
              0;
            const fps = sess.metrics?.fps;
            const aiFps = sess.metrics?.ai_fps_actual;
            const latency = sess.metrics?.inference_latency_ms;
            const violations = sess.metrics?.active_violations ?? 0;

            const content = (
              <div
                className={`group flex items-center justify-between gap-3 rounded-[16px] border border-white/60 px-4 py-3 text-xs transition-all duration-200 hover:-translate-y-0.5 dark:border-white/[0.05] ${NM.extruded}`}
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-accent shadow-[0_0_6px_var(--accent)]" />
                    <span className="font-mono font-extrabold text-primary">
                      {sess.camera_id}
                    </span>
                    {matchedCam && (
                      <span className="truncate font-bold text-foreground transition-colors group-hover:text-primary">
                        · {matchedCam.name}
                      </span>
                    )}
                  </div>
                  <p className="truncate font-mono text-[10px] text-muted-foreground">
                    {sess.source || "Live stream"}
                  </p>
                </div>

                {/* Recessed Telemetry Strip */}
                <div className="flex shrink-0 items-center gap-1.5 rounded-xl bg-background/60 p-1.5 font-mono text-[10.5px] shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark)] dark:bg-black/30">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-surface px-2 py-0.5 font-extrabold text-foreground shadow-sm dark:bg-card">
                    <Users className="size-3 text-primary" />
                    {persons}
                  </span>
                  <span className="rounded-lg bg-primary/10 px-2 py-0.5 font-extrabold text-primary">
                    {typeof fps === "number" ? `${fps.toFixed(1)}` : "--"}
                    {typeof aiFps === "number"
                      ? `/${aiFps.toFixed(0)} ai`
                      : " fps"}
                  </span>
                  {typeof latency === "number" && (
                    <span className="hidden px-1 font-semibold text-muted-foreground sm:inline">
                      {latency.toFixed(0)}ms
                    </span>
                  )}
                  {violations > 0 && (
                    <span className="rounded-lg bg-accent/15 px-2 py-0.5 font-extrabold text-accent">
                      {violations} VP
                    </span>
                  )}
                  {matchedCam && (
                    <ArrowUpRight className="ml-0.5 size-3.5 text-primary" />
                  )}
                </div>
              </div>
            );

            return matchedCam ? (
              <Link key={sess.camera_id} href={`/cameras/${matchedCam.id}`}>
                {content}
              </Link>
            ) : (
              <div key={sess.camera_id}>{content}</div>
            );
          })}
        </div>
      )}
    </div>
  )}

  {/* ── TAB: ACTIVE VIOLATIONS ──────────────────────────────── */}
  {activeStat === "violations" && (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      {/* Left PPE Tracking Summary */}
      <div className={`space-y-3.5 rounded-[20px] p-4 lg:col-span-5 ${NM.recessed}`}>
        <p className="px-0.5 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
          {isVietnamese
            ? `Tổng hợp Bám vết PPE trên ${runningSessions.length} luồng Live`
            : `PPE Tracking Summary across ${runningSessions.length} Live streams`}
        </p>

        <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
          <div
            className={`rounded-[16px] border border-white/60 p-3 dark:border-white/[0.05] ${NM.extruded}`}
          >
            <span className="text-[10px] font-bold text-muted-foreground">
              {isVietnamese ? "Người" : "Persons"}
            </span>
            <p className="mt-1 font-mono text-xl font-black tabular-nums text-foreground">
              <AnimatedNumber value={violationSummary.totalPersons} />
            </p>
          </div>

          <div
            className={`rounded-[16px] border border-white/60 p-3 dark:border-white/[0.05] ${NM.extruded}`}
          >
            <span className="text-[10px] font-bold text-muted-foreground">
              {isVietnamese ? "Mũ BHL" : "Helmets"}
            </span>
            <p className="mt-1 font-mono text-xl font-black tabular-nums text-primary">
              <AnimatedNumber value={violationSummary.totalHelmets} />
            </p>
          </div>

          <div
            className={`rounded-[16px] border border-white/60 p-3 dark:border-white/[0.05] ${NM.extruded}`}
          >
            <span className="text-[10px] font-bold text-muted-foreground">
              {isVietnamese ? "Áo PQ" : "Vests"}
            </span>
            <p className="mt-1 font-mono text-xl font-black tabular-nums text-accent">
              <AnimatedNumber value={violationSummary.totalVests} />
            </p>
          </div>
        </div>
      </div>

      {/* Right Alerting Cameras */}
      <div className={`space-y-3 rounded-[20px] p-4 lg:col-span-7 ${NM.recessed}`}>
        <p className="px-1 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
          {isVietnamese
            ? `Camera đang phát cảnh báo (${violationSummary.alertingSessions.length})`
            : `Cameras with Active Alerts (${violationSummary.alertingSessions.length})`}
        </p>

        {violationSummary.alertingSessions.length === 0 ? (
          <div className="flex h-36 items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
            <CheckCircle2 className="size-4 text-emerald-500" />
            <span>
              {isVietnamese
                ? "Không có camera nào đang phát sinh vi phạm ở khung hình hiện tại."
                : "No cameras are reporting active violations in the current frame."}
            </span>
          </div>
        ) : (
          <div className="max-h-60 space-y-2.5 overflow-y-auto p-0.5 pr-1.5">
            {violationSummary.alertingSessions.map(
              ({ session, camera, activeCount }) => {
                const persons =
                  session.metrics?.counts?.person ??
                  session.metrics?.active_persons ??
                  0;
                const fps = session.metrics?.fps;
                const row = (
                  <div
                    className={`group flex items-center justify-between gap-3 rounded-[16px] border border-white/60 px-4 py-3 text-xs transition-all duration-200 hover:-translate-y-0.5 dark:border-white/[0.05] ${NM.extruded}`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-accent/15 px-2 py-0.5 font-mono text-[10px] font-extrabold text-accent">
                          {session.camera_id}
                        </span>
                        {camera && (
                          <span className="truncate font-bold text-foreground transition-colors group-hover:text-primary">
                            {camera.name}
                          </span>
                        )}
                      </div>
                      <p className="truncate font-mono text-[10.5px] text-muted-foreground">
                        {persons} {isVietnamese ? "người trong khung" : "in frame"} •{" "}
                        {typeof fps === "number" ? `${fps.toFixed(1)} FPS` : "LIVE"}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2.5">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-danger/10 px-3 py-1 font-mono text-xs font-extrabold text-danger shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark)] dark:shadow-[inset_1.5px_1.5px_4px_rgba(0,0,0,0.65)]">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-danger" />
                        {activeCount} {isVietnamese ? "đang mở" : "active"}
                      </span>
                      {camera && (
                        <ArrowUpRight className="size-3.5 text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      )}
                    </div>
                  </div>
                );

                return camera ? (
                  <Link key={session.camera_id} href={`/cameras/${camera.id}`}>
                    {row}
                  </Link>
                ) : (
                  <div key={session.camera_id}>{row}</div>
                );
              },
            )}
          </div>
        )}
      </div>
    </div>
  )}
</div>
  );
}
