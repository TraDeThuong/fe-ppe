"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  Cpu,
  Link2,
  Loader2,
  MapPin,
  RotateCcw,
  Upload,
  Wrench,
  Zap,
} from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import { Input } from "@/components/ui/form";
import {
  Select,
  type SelectOption,
} from "@/components/ui/form/selection-controls/select";
import { RefreshIconButton } from "@/components/ui/refresh-action";
import { useCameraHealthLogs, usePingCamera } from "@/hooks/cameras";
import { useCan } from "@/hooks/use-can";
import { useLocale } from "@/providers/locale-provider";
import { CameraDeviceAdvancedPanels } from "./camera-device-advanced-panels";
import type { LiveVideoItem } from "@/types/ai-test.types";
import type {
  CameraConfigItem,
  CameraItem,
  EffectiveSafetyConfigResponse,
} from "@/types";

export interface CameraDeviceDiagnosticsTabProps {
  camera: CameraItem;
  config?: CameraConfigItem | null;
  effectiveSafety?: EffectiveSafetyConfigResponse | null;
  isTabActive?: boolean;
  liveVideos: LiveVideoItem[];
  overrideSource: string;
  productionMode?: boolean;
  isUploading: boolean;
  isStarting: boolean;
  overrideHighlightTick?: number;
  diagnosticsHighlightTick?: number;
  onApplyOverrideStream: (nextSource: string) => void;
  onUploadOverrideStream: (file: File) => void;
  onClearOverride: () => void;
  onOpenRestrictedAreaModal?: () => void;
}

export const CameraDeviceDiagnosticsTab = memo(
  function CameraDeviceDiagnosticsTab({
    camera,
    config,
    effectiveSafety,
    isTabActive = true,
    liveVideos,
    overrideSource,
    productionMode = false,
    isUploading,
    isStarting,
    overrideHighlightTick = 0,
    diagnosticsHighlightTick = 0,
    onApplyOverrideStream,
    onUploadOverrideStream,
    onClearOverride,
    onOpenRestrictedAreaModal,
  }: CameraDeviceDiagnosticsTabProps) {
    const { locale } = useLocale();
    const isVietnamese = locale === "vi-VN";
    const can = useCan();
    const canReadCamera = can("PPE_CAMERA_READ");
    const canManageCamera = can("PPE_CAMERA_MANAGE");

    const [healthStatusFilter, setHealthStatusFilter] = useState<string>("");
    const [overrideExpanded, setOverrideExpanded] = useState<boolean>(
      Boolean(overrideSource),
    );
    const [draftOverride, setDraftOverride] = useState<string>(overrideSource);
    const [highlightDiagnostics, setHighlightDiagnostics] = useState(false);
    const [highlightOverride, setHighlightOverride] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const diagnosticsRef = useRef<HTMLElement | null>(null);
    const overrideRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
      setDraftOverride(overrideSource);
      if (overrideSource) {
        setOverrideExpanded(true);
      }
    }, [overrideSource]);

    useEffect(() => {
      if (overrideHighlightTick <= 0) return;
      setOverrideExpanded(true);
      setHighlightOverride(true);
      const scrollTimer = window.setTimeout(() => {
        overrideRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 60);
      const clearTimer = window.setTimeout(() => {
        setHighlightOverride(false);
      }, 1800);
      return () => {
        window.clearTimeout(scrollTimer);
        window.clearTimeout(clearTimer);
      };
    }, [overrideHighlightTick]);

    useEffect(() => {
      if (diagnosticsHighlightTick <= 0) return;
      setHighlightDiagnostics(true);
      const scrollTimer = window.setTimeout(() => {
        diagnosticsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 60);
      const clearTimer = window.setTimeout(() => {
        setHighlightDiagnostics(false);
      }, 1800);
      return () => {
        window.clearTimeout(scrollTimer);
        window.clearTimeout(clearTimer);
      };
    }, [diagnosticsHighlightTick]);

    const pingMutation = usePingCamera();
    const {
      data: healthLogs = [],
      isLoading: healthLogsLoading,
      isFetching: healthLogsFetching,
      refetch: refetchHealthLogs,
    } = useCameraHealthLogs(
      camera.id,
      Boolean(camera.id) && canReadCamera && isTabActive,
      {
        limit: 20,
        status: healthStatusFilter || undefined,
        sortOrder: "desc",
      },
    );

    const pingResult = pingMutation.data;
    const isDbOnline = camera.status === "ONLINE";

    const videoOptions = useMemo<SelectOption[]>(
      () =>
        liveVideos.map((v) => ({
          value: v.filename,
          label: v.filename,
          description: [
            v.resolution,
            typeof v.size_mb === "number" ? `${v.size_mb.toFixed(1)} MB` : null,
          ]
            .filter(Boolean)
            .join(" • "),
        })),
      [liveVideos],
    );

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          {/* Left Column (5/12): Device DB Profile + Collapsible Dev Override */}
          <div className="space-y-6 xl:col-span-5">
            {/* Card 1: Device DB Specs */}
            <section
              aria-label={
                isVietnamese
                  ? "Thông số kỹ thuật thiết bị"
                  : "Device Specifications"
              }
              className={`relative space-y-4 overflow-hidden rounded-[24px] p-4 sm:rounded-[28px] sm:p-6 ${NM.chassis}`}
            >
              <div className="flex items-center justify-between border-b border-foreground/[0.06] pb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl text-primary ${NM.recessed}`}
                  >
                    <Cpu className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-foreground">
                      {isVietnamese ? "Hồ sơ Thiết bị DB" : "Device DB Profile"}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Camera Service Configuration
                    </p>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold ${
                    isDbOnline
                      ? "bg-primary/15 text-primary"
                      : "bg-accent/15 text-accent"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isDbOnline ? "bg-primary" : "bg-accent"
                    }`}
                  />
                  {camera.status}
                </span>
              </div>

              <div className={`space-y-3 rounded-2xl p-4 text-xs ${NM.recessed}`}>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {isVietnamese
                      ? "Giao thức / Nguồn lưu DB"
                      : "DB Protocol / Stream Source"}
                  </span>
                  <p className="mt-1 flex items-center gap-1.5 break-all font-mono text-[11px] font-semibold text-foreground">
                    <Link2 className="size-3.5 shrink-0 text-primary" />
                    <span>
                      {camera.streamUrl ||
                        (isVietnamese ? "Chưa cấu hình" : "Not configured")}
                    </span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-foreground/[0.06] pt-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Source Type
                    </span>
                    <p className="mt-0.5 font-mono font-bold text-primary">
                      {camera.sourceType || "RTSP"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      DB Capture FPS
                    </span>
                    <p className="mt-0.5 font-mono font-bold text-foreground">
                      {config?.captureFps ?? 25} FPS
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      AI Processing DB
                    </span>
                    <p className="mt-0.5 font-mono font-bold text-foreground">
                      {config?.processingEnabled ?? true ? "ENABLED" : "DISABLED"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {isVietnamese ? "Độ phân giải DB" : "DB Resolution"}
                    </span>
                    <p className="mt-0.5 font-mono font-bold text-foreground">
                      {config?.resolution || "1280x720"}
                    </p>
                  </div>
                </div>

                {(camera.location || camera.description) && (
                  <div className="space-y-1 border-t border-foreground/[0.06] pt-3">
                    {camera.location && (
                      <p className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="size-3.5 shrink-0 text-accent" />
                        <span>{camera.location}</span>
                      </p>
                    )}
                    {camera.description && (
                      <p className="text-muted-foreground">{camera.description}</p>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Card 3: Collapsible Dev Source Override Accordion (requires PPE_CAMERA_MANAGE) */}
            {canManageCamera && (
              <section
                ref={overrideRef}
                aria-label={
                  isVietnamese
                    ? "Nguồn chạy thử AI Override"
                    : "AI Test Source Override"
                }
                className={`relative overflow-hidden rounded-[24px] p-4 transition-shadow duration-300 sm:rounded-[28px] sm:p-5 ${NM.chassis} ${
                  highlightOverride ? "ring-2 ring-accent/60" : ""
                }`}
              >
                <button
                  type="button"
                  aria-expanded={overrideExpanded}
                  onClick={() => setOverrideExpanded((prev) => !prev)}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl text-accent ${NM.recessed}`}
                    >
                      <Wrench className="size-4" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-extrabold text-foreground">
                          {isVietnamese
                            ? "Nguồn chạy thử AI (Override cho Dev)"
                            : "AI Test Source (Dev Override)"}
                        </h3>
                        {overrideSource && (
                          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
                            {isVietnamese ? "Đang bật" : "Active"}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {isVietnamese
                          ? "Dùng khi nguồn DB là MP4 hoặc RTSP bị mask mật khẩu `:***@`"
                          : "Use when DB source is MP4 or masked RTSP credentials `:***@`"}
                      </p>
                    </div>
                  </div>

                  <ChevronDown
                    className={`size-4 text-muted-foreground transition-transform duration-200 ${
                      overrideExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {overrideExpanded && (
                  <div className={`mt-4 space-y-3 rounded-2xl p-3.5 ${NM.recessed}`}>
                    <div className="space-y-1.5">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {isVietnamese
                          ? `Video Server (${liveVideos.length} sẵn có)`
                          : `Server Videos (${liveVideos.length} available)`}
                      </span>
                      <Select
                        size="sm"
                        options={videoOptions}
                        value={
                          liveVideos.some((v) => v.filename === draftOverride)
                            ? draftOverride
                            : ""
                        }
                        onValueChange={(val) => setDraftOverride(val)}
                        placeholder={
                          isVietnamese
                            ? "Chọn video test trên AI Server"
                            : "Select test video on AI Server"
                        }
                        emptyMessage={
                          isVietnamese
                            ? "Chưa có video sẵn trên AI Server"
                            : "No videos available on AI Server"
                        }
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {isVietnamese
                          ? "Hoặc nhập Source Override (RTSP đầy đủ / YouTube / 0)"
                          : "Or enter Source Override (Full RTSP / YouTube / 0)"}
                      </label>
                      <Input
                        size="sm"
                        value={draftOverride}
                        onChange={(e) => setDraftOverride(e.target.value)}
                        placeholder={
                          isVietnamese
                            ? "rtsp://user:pass@ip:554/... hoặc video.mp4"
                            : "rtsp://user:pass@ip:554/... or video.mp4"
                        }
                      />
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onUploadOverrideStream(file);
                        e.target.value = "";
                      }}
                    />

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isStarting || !draftOverride.trim()}
                        onClick={() => onApplyOverrideStream(draftOverride.trim())}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-extrabold text-primary-foreground shadow-sm transition hover:brightness-105 disabled:opacity-45"
                      >
                        <Zap className="size-3.5" />
                        <span>
                          {isVietnamese ? "Áp dụng & Chạy Live" : "Apply & Run Live"}
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={isUploading || isStarting || productionMode}
                        onClick={() => fileInputRef.current?.click()}
                        title={
                          productionMode
                            ? isVietnamese
                              ? "Endpoint upload video offline chỉ có ở test-ui/server.py sandbox"
                              : "Offline video upload is only available in test-ui/server.py sandbox"
                            : undefined
                        }
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-foreground hover:text-primary disabled:opacity-45 ${NM.tactileBtn}`}
                      >
                        <Upload className="size-3.5 text-accent" />
                        <span>
                          {isUploading
                            ? isVietnamese
                              ? "Đang tải..."
                              : "Uploading..."
                            : "Upload & Stream"}
                        </span>
                      </button>

                      {overrideSource && (
                        <button
                          type="button"
                          onClick={() => {
                            setDraftOverride("");
                            onClearOverride();
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-accent ${NM.tactileBtn}`}
                        >
                          <RotateCcw className="size-3.5" />
                          <span>{isVietnamese ? "Khôi phục DB" : "Restore DB"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>

          {/* Right Column (7/12): Network Diagnostics & Health Heartbeat Logs */}
          <section
            ref={diagnosticsRef}
            aria-label={
              isVietnamese
                ? "Kiểm tra kết nối & Nhật ký Ping"
                : "Network Probe & Ping Logs"
            }
            className={`relative flex flex-col justify-between space-y-4 overflow-hidden rounded-[24px] p-4 transition-shadow duration-300 sm:rounded-[28px] sm:p-6 xl:col-span-7 ${NM.chassis} ${
              highlightDiagnostics ? "ring-2 ring-primary/60" : ""
            }`}
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-foreground/[0.06] pb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl text-primary ${NM.recessed}`}
                  >
                    <Activity className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-foreground">
                      {isVietnamese
                        ? "Chẩn đoán Mạng & Health Logs"
                        : "Network Diagnostics & Health Logs"}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      {isVietnamese
                        ? "Thăm dò Ping trực tiếp & Lịch sử nhịp tim kết nối"
                        : "Direct Camera Service ping probe & heartbeat history"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={healthStatusFilter}
                    onChange={(e) => setHealthStatusFilter(e.target.value)}
                    aria-label={
                      isVietnamese ? "Lọc trạng thái Ping" : "Filter Ping status"
                    }
                    className="h-8 rounded-xl border border-border/30 bg-surface px-2 text-[11px] font-semibold text-foreground"
                  >
                    <option value="">{isVietnamese ? "Tất cả" : "All"}</option>
                    <option value="ONLINE">ONLINE</option>
                    <option value="OFFLINE">OFFLINE</option>
                    <option value="ERROR">ERROR</option>
                  </select>
                  {canManageCamera && (
                    <button
                      type="button"
                      disabled={pingMutation.isPending}
                      onClick={() => pingMutation.mutate(camera.id)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-extrabold text-primary-foreground shadow-sm transition hover:brightness-105 disabled:opacity-50"
                    >
                      {pingMutation.isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Zap className="size-3.5" />
                      )}
                      <span>{isVietnamese ? "Gửi Ping" : "Send Ping"}</span>
                    </button>
                  )}
                  <RefreshIconButton
                    onRefresh={() => refetchHealthLogs()}
                    isRefreshing={healthLogsFetching}
                    title={
                      isVietnamese ? "Làm mới nhật ký Ping" : "Refresh ping logs"
                    }
                    ariaLabel={
                      isVietnamese ? "Làm mới nhật ký Ping" : "Refresh ping logs"
                    }
                    className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-muted-foreground hover:text-primary disabled:opacity-50 ${NM.tactileBtn}`}
                    iconClassName="size-3.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5 text-center text-xs min-[400px]:grid-cols-3">
                <div className={`rounded-xl p-2.5 ${NM.recessed}`}>
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">
                    {isVietnamese ? "Độ trễ" : "Latency"}
                  </span>
                  <p className="mt-0.5 font-mono text-sm font-black text-foreground">
                    {pingResult?.latencyMs != null
                      ? `${pingResult.latencyMs} ms`
                      : camera.currentLatencyMs != null
                        ? `${camera.currentLatencyMs} ms`
                        : "-- ms"}
                  </p>
                </div>

                <div className={`rounded-xl p-2.5 ${NM.recessed}`}>
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">
                    {isVietnamese ? "Rớt gói" : "Packet Loss"}
                  </span>
                  <p className="mt-0.5 font-mono text-sm font-black text-primary">
                    {pingResult?.packetLoss != null
                      ? `${pingResult.packetLoss}%`
                      : pingResult
                        ? pingResult.success
                          ? "0%"
                          : "100%"
                        : "N/A"}
                  </p>
                </div>

                <div className={`rounded-xl p-2.5 ${NM.recessed}`}>
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">
                    {isVietnamese ? "Khung hình DB" : "DB Frame Rate"}
                  </span>
                  <p className="mt-0.5 font-mono text-sm font-black text-foreground">
                    {camera.currentFps != null ? `${camera.currentFps}` : "--"} fps
                  </p>
                </div>
              </div>

              <div
                className={`max-h-64 divide-y divide-foreground/[0.06] overflow-y-auto rounded-2xl p-2.5 text-xs ${NM.recessed}`}
              >
                {healthLogsLoading ? (
                  <p className="p-4 text-center text-muted-foreground">
                    {isVietnamese
                      ? "Đang tải nhật ký nhịp tim..."
                      : "Loading heartbeat logs..."}
                  </p>
                ) : healthLogs.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 p-4 text-muted-foreground">
                    <CheckCircle className="size-4 text-primary" />
                    <span>
                      {isVietnamese
                        ? "Chưa ghi nhận lịch sử Ping gián đoạn."
                        : "No ping interruption logs recorded."}
                    </span>
                  </div>
                ) : (
                  healthLogs.slice(0, 10).map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between gap-2 px-2.5 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {log.status === "ONLINE" ? (
                          <CheckCircle className="size-3.5 shrink-0 text-primary" />
                        ) : (
                          <AlertTriangle className="size-3.5 shrink-0 text-accent" />
                        )}
                        <span className="font-mono text-[11px] font-bold text-foreground">
                          {log.status}
                        </span>
                        {log.errorMessage && (
                          <span className="truncate text-[11px] text-muted-foreground">
                            · {log.errorMessage}
                          </span>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2 font-mono text-[10px] text-muted-foreground">
                        <span>
                          {log.latencyMs != null ? `${log.latencyMs}ms` : "-"}
                        </span>
                        {log.checkedAt && (
                          <span>
                            {new Date(log.checkedAt).toLocaleTimeString(locale)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>

        <CameraDeviceAdvancedPanels
          camera={camera}
          config={config}
          effectiveSafety={effectiveSafety}
          onOpenRestrictedAreaModal={onOpenRestrictedAreaModal}
        />
      </div>
    );
  },
);
