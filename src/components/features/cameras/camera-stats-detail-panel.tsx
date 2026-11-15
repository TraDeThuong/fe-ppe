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
          title: "Chi tiết Tổng Thiết Bị Camera",
          badge: `${cameras.length} thiết bị`,
          subtitle:
            "Phân bổ theo trạng thái kết nối DB và giao thức nguồn truyền phát",
          canFilterList: false,
        };
      case "online":
        return {
          icon: <Activity className="h-4 w-4 text-emerald-500" />,
          title: "Chi tiết Camera Sẵn Sàng Kết Nối DB",
          badge: `${dbBreakdown.online}/${cameras.length} ONLINE`,
          subtitle:
            "Danh sách thiết bị đạt trạng thái ONLINE và độ trễ ping gần nhất từ Camera Service",
          canFilterList: true,
        };
      case "ai_live":
        return {
          icon: <Radio className="h-4 w-4 text-amber-500" />,
          title: "Chi tiết Phiên Đang AI Live Tracking",
          badge: `${runningSessions.length} luồng LIVE`,
          subtitle:
            "Các luồng suy luận đang chạy trực tiếp trên AI Engine (FPS, độ trễ & số người bám vết)",
          canFilterList: true,
        };
      case "violations":
        return {
          icon: <ShieldAlert className="h-4 w-4 text-danger" />,
          title: "Chi tiết Vi Phạm Đang Kích Hoạt Real-time",
          badge: `${violationSummary.activeTotal} đang mở`,
          subtitle:
            "Các camera đang phát hiện thiếu bảo hộ (Mũ / Áo / Vùng cấm) ở khung hình hiện tại",
          canFilterList: true,
        };
    }
  }, [
    activeStat,
    cameras.length,
    dbBreakdown.online,
    runningSessions.length,
    violationSummary.activeTotal,
  ]);

  return (
    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-white/60 bg-surface/95 p-3.5 sm:p-5 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)] transition-all duration-300 dark:border-white/10 dark:bg-card/95 animate-in fade-in slide-in-from-top-2">
      {/* Specular Rim Top Highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 sm:inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"
      />

      {/* Header Toolbar */}
      <div className="mb-3.5 flex items-center justify-between gap-2 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.08)]">
            {headerMeta.icon}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">
                {headerMeta.title}
              </h3>
              <Badge
                variant="outline"
                size="sm"
                className="font-mono text-[10px] sm:text-[11px] px-1.5 py-0"
              >
                {headerMeta.badge}
              </Badge>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate hidden sm:block">
              {headerMeta.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {headerMeta.canFilterList && (
            <Button
              type="button"
              variant={isFleetFilteredByThisStat ? "primary" : "outline"}
              size="sm"
              onClick={() => onToggleFleetFilter(activeStat)}
              className="h-7 sm:h-8 gap-1 text-[11px] sm:text-xs px-2.5"
            >
              <Filter className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span>
                {isFleetFilteredByThisStat
                  ? "Bỏ lọc danh sách"
                  : "Lọc danh sách dưới"}
              </span>
            </Button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng chi tiết"
            className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg border border-border/40 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground cursor-pointer"
          >
            <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>

      {/* Body per stat */}
      {activeStat === "all" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className={`space-y-3 rounded-2xl p-4 lg:col-span-5 ${NM.recessed}`}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Phân bổ Trạng thái DB &amp; Giao thức
            </p>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className={`rounded-xl p-2.5 ${NM.extruded}`}>
                <span className="text-[10px] text-muted-foreground">ONLINE</span>
                <p className="mt-0.5 font-mono text-base font-black text-emerald-500">
                  {dbBreakdown.online}
                </p>
              </div>
              <div className={`rounded-xl p-2.5 ${NM.extruded}`}>
                <span className="text-[10px] text-muted-foreground">OFFLINE</span>
                <p className="mt-0.5 font-mono text-base font-black text-muted-foreground">
                  {dbBreakdown.offline}
                </p>
              </div>
              <div className={`rounded-xl p-2.5 ${NM.extruded}`}>
                <span className="text-[10px] text-muted-foreground">BẢO TRÌ</span>
                <p className="mt-0.5 font-mono text-base font-black text-amber-500">
                  {dbBreakdown.maintenance}
                </p>
              </div>
              <div className={`rounded-xl p-2.5 ${NM.extruded}`}>
                <span className="text-[10px] text-muted-foreground">LỖI</span>
                <p className="mt-0.5 font-mono text-base font-black text-danger">
                  {dbBreakdown.error}
                </p>
              </div>
            </div>

            {dbBreakdown.sources.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {dbBreakdown.sources.map(([src, count]) => (
                  <span
                    key={src}
                    className="rounded-lg bg-primary/10 px-2.5 py-1 font-mono text-[11px] font-bold text-primary"
                  >
                    {src}: {count}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className={`space-y-2 rounded-2xl p-3 lg:col-span-7 ${NM.recessed}`}>
            <p className="px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Danh sách nhanh Thiết bị ({cameras.length})
            </p>
            {cameras.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Chưa có camera nào trong hệ thống.
              </p>
            ) : (
              <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                {cameras.map((cam) => {
                  const sess = findSessionForCamera(sessionMap, cam);
                  const isLive = sess?.status === "running";
                  return (
                    <Link
                      key={cam.id}
                      href={`/cameras/${cam.id}`}
                      className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs transition-transform hover:translate-x-0.5 ${NM.extruded}`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                          {cam.code}
                        </span>
                        <span className="truncate font-semibold text-foreground">
                          {cam.name}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 font-mono text-[10px]">
                        {isLive && (
                          <span className="rounded bg-accent/15 px-1.5 py-0.5 font-bold text-accent">
                            LIVE
                          </span>
                        )}
                        <span
                          className={
                            cam.status === "ONLINE"
                              ? "font-bold text-emerald-500"
                              : "text-muted-foreground"
                          }
                        >
                          {cam.status}
                        </span>
                        <ArrowUpRight className="size-3.5 text-primary" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeStat === "online" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className={`space-y-3 rounded-2xl p-4 lg:col-span-4 ${NM.recessed}`}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Sức khỏe Kết nối Camera DB
            </p>
            <div className="space-y-2.5 text-xs">
              <div className={`flex items-center justify-between rounded-xl p-3 ${NM.extruded}`}>
                <span className="text-muted-foreground">Tỷ lệ khả dụng</span>
                <span className="font-mono text-sm font-black text-emerald-500">
                  {cameras.length > 0
                    ? `${Math.round((onlineStats.onlineCams.length / cameras.length) * 100)}%`
                    : "0%"}
                </span>
              </div>
              <div className={`flex items-center justify-between rounded-xl p-3 ${NM.extruded}`}>
                <span className="text-muted-foreground">Độ trễ trung bình</span>
                <span className="font-mono text-sm font-black text-foreground">
                  {onlineStats.avgLatency != null
                    ? `${onlineStats.avgLatency} ms`
                    : "-- ms"}
                </span>
              </div>
              <div className={`flex items-center justify-between rounded-xl p-3 ${NM.extruded}`}>
                <span className="text-muted-foreground">Chưa sẵn sàng</span>
                <span className="font-mono text-sm font-black text-amber-500">
                  {onlineStats.offlineCams.length} thiết bị
                </span>
              </div>
            </div>
          </div>

          <div className={`space-y-2 rounded-2xl p-3 lg:col-span-8 ${NM.recessed}`}>
            <p className="px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Camera ONLINE ({onlineStats.onlineCams.length}) &amp; Cần kiểm tra ({onlineStats.offlineCams.length})
            </p>
            <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
              {onlineStats.onlineCams.map((cam) => (
                <Link
                  key={cam.id}
                  href={`/cameras/${cam.id}`}
                  className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs ${NM.extruded}`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                    <span className="font-mono text-[10px] font-bold text-primary">
                      {cam.code}
                    </span>
                    <span className="truncate font-semibold text-foreground">
                      {cam.name}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 font-mono text-[10px] text-muted-foreground">
                    <span>{cam.sourceType || "RTSP"}</span>
                    <span>
                      {cam.currentLatencyMs != null
                        ? `${cam.currentLatencyMs} ms`
                        : "--"}
                    </span>
                    <ArrowUpRight className="size-3.5 text-primary" />
                  </div>
                </Link>
              ))}
              {onlineStats.offlineCams.map((cam) => (
                <Link
                  key={cam.id}
                  href={`/cameras/${cam.id}`}
                  className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs opacity-75 ${NM.extruded}`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <WifiOff className="size-3.5 shrink-0 text-amber-500" />
                    <span className="font-mono text-[10px] font-bold text-muted-foreground">
                      {cam.code}
                    </span>
                    <span className="truncate text-foreground">{cam.name}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 font-mono text-[10px]">
                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-bold text-amber-500">
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

      {activeStat === "ai_live" && (
        <div className={`space-y-2.5 rounded-2xl p-3.5 ${NM.recessed}`}>
          {runningSessions.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              Hiện chưa có luồng camera nào đang bật AI Live Tracking trên AI Engine. Nhấn{" "}
              <strong className="text-primary">Bắt đầu AI Live</strong> ở thẻ camera hoặc mở trang chi tiết để khởi chạy.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
                    className={`flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-xs ${NM.extruded}`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
                        <span className="font-mono font-extrabold text-primary">
                          {sess.camera_id}
                        </span>
                        {matchedCam && (
                          <span className="truncate font-semibold text-foreground">
                            · {matchedCam.name}
                          </span>
                        )}
                      </div>
                      <p className="truncate font-mono text-[10px] text-muted-foreground">
                        {sess.source || "Live stream"}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 font-mono text-[11px]">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-foreground/[0.05] px-2 py-0.5 font-bold text-foreground">
                        <Users className="size-3 text-primary" />
                        {persons}
                      </span>
                      <span className="rounded-lg bg-primary/10 px-2 py-0.5 font-bold text-primary">
                        {typeof fps === "number" ? `${fps.toFixed(1)}` : "--"}
                        {typeof aiFps === "number"
                          ? `/${aiFps.toFixed(0)} ai`
                          : " fps"}
                      </span>
                      {typeof latency === "number" && (
                        <span className="hidden sm:inline text-muted-foreground">
                          {latency.toFixed(0)}ms
                        </span>
                      )}
                      {violations > 0 && (
                        <span className="rounded-lg bg-accent/15 px-2 py-0.5 font-bold text-accent">
                          {violations} VP
                        </span>
                      )}
                      {matchedCam && (
                        <ArrowUpRight className="size-3.5 text-primary" />
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

      {activeStat === "violations" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className={`space-y-3 rounded-2xl p-4 lg:col-span-5 ${NM.recessed}`}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Tổng hợp Bám vết PPE trên {runningSessions.length} luồng Live
            </p>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className={`rounded-xl p-2.5 ${NM.extruded}`}>
                <span className="text-[10px] text-muted-foreground">Người</span>
                <p className="mt-0.5 font-mono text-lg font-black text-foreground">
                  {violationSummary.totalPersons}
                </p>
              </div>
              <div className={`rounded-xl p-2.5 ${NM.extruded}`}>
                <span className="text-[10px] text-muted-foreground">Mũ BHL</span>
                <p className="mt-0.5 font-mono text-lg font-black text-primary">
                  {violationSummary.totalHelmets}
                </p>
              </div>
              <div className={`rounded-xl p-2.5 ${NM.extruded}`}>
                <span className="text-[10px] text-muted-foreground">Áo PQ</span>
                <p className="mt-0.5 font-mono text-lg font-black text-accent">
                  {violationSummary.totalVests}
                </p>
              </div>
            </div>
          </div>

          <div className={`space-y-2 rounded-2xl p-3 lg:col-span-7 ${NM.recessed}`}>
            <p className="px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Camera đang phát cảnh báo ({violationSummary.alertingSessions.length})
            </p>
            {violationSummary.alertingSessions.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span>Không có camera nào đang phát sinh vi phạm ở khung hình hiện tại.</span>
              </div>
            ) : (
              <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                {violationSummary.alertingSessions.map(
                  ({ session, camera, activeCount }) => {
                    const persons =
                      session.metrics?.counts?.person ??
                      session.metrics?.active_persons ??
                      0;
                    const fps = session.metrics?.fps;
                    const row = (
                      <div
                        className={`flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-xs ${NM.extruded}`}
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-accent/15 px-2 py-0.5 font-mono text-[10px] font-extrabold text-accent">
                              {session.camera_id}
                            </span>
                            {camera && (
                              <span className="truncate font-semibold text-foreground">
                                {camera.name}
                              </span>
                            )}
                          </div>
                          <p className="truncate font-mono text-[11px] text-muted-foreground">
                            {persons} người trong khung •{" "}
                            {typeof fps === "number" ? `${fps.toFixed(1)} FPS` : "LIVE"}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="rounded-full bg-danger/15 px-2.5 py-0.5 font-mono text-xs font-extrabold text-danger">
                            {activeCount} đang mở
                          </span>
                          {camera && (
                            <ArrowUpRight className="size-3.5 text-primary" />
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
