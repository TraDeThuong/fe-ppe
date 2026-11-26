"use client";

import { memo, useMemo, useState } from "react";
import {
  AlertOctagon,
  ChevronDown,
  Link2,
  Play,
  RotateCcw,
  Save,
  ShieldCheck,
  Sliders,
  Square,
  Wrench,
} from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import { Input } from "@/components/ui/form";
import {
  Select,
  type SelectOption,
} from "@/components/ui/form/selection-controls/select";
import { useLocale } from "@/providers/locale-provider";
import { CameraLiveRulesTray } from "./camera-live-rules-tray";
import type { LiveActiveConfig, ModelInfo } from "@/types/ai-test.types";

export interface CameraLiveControlDeckProps {
  liveCameraId: string;
  sourceTypeLabel: string;
  activeSource: string;
  isUsingOverride: boolean;
  isRunning: boolean;
  canStart: boolean;
  models: ModelInfo[];
  sourceNote?: string | null;
  selectedModel: string;
  onModelChange: (value: string) => void;
  targetFps: number;
  onTargetFpsChange: (value: number) => void;
  aiFps: number;
  onAiFpsChange: (value: number) => void;
  confirmHelmetSec: number;
  onConfirmHelmetSecChange: (value: number) => void;
  confirmVestSec: number;
  onConfirmVestSecChange: (value: number) => void;
  confidenceThreshold?: number;
  onConfidenceThresholdChange?: (value: number) => void;
  cooldownSec?: number;
  onCooldownSecChange?: (value: number) => void;
  activeAiConfig?: LiveActiveConfig | null;
  enableNoHelmet: boolean;
  onEnableNoHelmetChange: (checked: boolean) => void;
  enableNoVest: boolean;
  onEnableNoVestChange: (checked: boolean) => void;
  enableRestrictedArea: boolean;
  onEnableRestrictedAreaChange: (checked: boolean) => void;
  enableSceneCut: boolean;
  onEnableSceneCutChange: (checked: boolean) => void;
  isStarting: boolean;
  isStopping: boolean;
  isSavingDb: boolean;
  canManageCamera: boolean;
  canManageSafety?: boolean;
  canPlotRoi?: boolean;
  onStartStream: () => void;
  onStopStream: () => void;
  onSaveToDb: () => void;
  onOpenDeviceTab?: () => void;
  roiPointsCount?: number;
  onOpenRestrictedAreaModal?: () => void;
  safetySource?: string;
  onResetToSiteRules?: () => void;
  isResettingRules?: boolean;
}

export const CameraLiveControlDeck = memo(function CameraLiveControlDeck({
  liveCameraId,
  sourceTypeLabel,
  activeSource,
  isUsingOverride,
  isRunning,
  canStart,
  models,
  sourceNote,
  selectedModel,
  onModelChange,
  targetFps,
  onTargetFpsChange,
  aiFps,
  onAiFpsChange,
  confirmHelmetSec,
  onConfirmHelmetSecChange,
  confirmVestSec,
  onConfirmVestSecChange,
  confidenceThreshold = 0.8,
  onConfidenceThresholdChange,
  cooldownSec = 30,
  onCooldownSecChange,
  activeAiConfig,
  enableNoHelmet,
  onEnableNoHelmetChange,
  enableNoVest,
  onEnableNoVestChange,
  enableRestrictedArea,
  onEnableRestrictedAreaChange,
  enableSceneCut,
  onEnableSceneCutChange,
  isStarting,
  isStopping,
  isSavingDb,
  canManageCamera,
  canManageSafety = false,
  canPlotRoi = false,
  onStartStream,
  onStopStream,
  onSaveToDb,
  onOpenDeviceTab,
  roiPointsCount = 0,
  onOpenRestrictedAreaModal,
  safetySource,
  onResetToSiteRules,
  isResettingRules = false,
}: CameraLiveControlDeckProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const [isExpanded, setIsExpanded] = useState(false);
  const canSaveDb = canManageCamera || canManageSafety;
  const canEditRules = canManageSafety;

  const modelOptions = useMemo<SelectOption[]>(
    () =>
      models.map((m) => ({
        value: m.path,
        label: m.name,
        description:
          typeof m.size_mb === "number"
            ? `${m.path} (${m.size_mb.toFixed(1)} MB)`
            : m.path,
      })),
    [models],
  );

  const activeModelName =
    models.find((m) => m.path === selectedModel)?.name ??
    (selectedModel || "best");

  const enabledRulesCount = [
    enableNoHelmet,
    enableNoVest,
    enableRestrictedArea,
    enableSceneCut,
  ].filter(Boolean).length;

  return (
    <section
      aria-label={isVietnamese ? "Cấu hình AI" : "AI Configuration"}
      className={`relative overflow-hidden rounded-[24px] sm:rounded-[28px] transition-all duration-300 ${NM.chassis} ${
        isExpanded ? "p-4 sm:p-6 lg:p-7" : "px-4 py-3.5 sm:px-6 sm:py-4"
      }`}
    >
      <div className="pointer-events-none absolute inset-x-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="relative space-y-5">
        {/* Layer 1: Collapsible Summary Header & Tactile Action Bay */}
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <button
            type="button"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((prev) => !prev)}
            className="group flex flex-1 cursor-pointer items-start gap-3.5 rounded-2xl p-1 text-left transition-colors hover:bg-foreground/[0.02]"
          >
            <div
              className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${NM.extruded}`}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Sliders className="size-4" />
              </div>
              <span
                className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${
                  isRunning
                    ? "bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
                    : "bg-muted-foreground/40"
                }`}
              />
            </div>

            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight text-foreground sm:text-lg">
                  {isVietnamese ? "Cấu hình AI" : "AI Configuration"}
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    isRunning
                      ? "bg-primary/15 text-primary"
                      : "bg-accent/15 text-accent"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isRunning ? "animate-pulse bg-primary" : "bg-accent"
                    }`}
                  />
                  {isRunning ? "Tracking Active" : "Standby"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.05] px-2 py-0.5 text-[10px] font-semibold text-muted-foreground group-hover:text-primary">
                  {isExpanded
                    ? isVietnamese
                      ? "Thu gọn"
                      : "Collapse"
                    : isVietnamese
                      ? "Nhấn để chỉnh chi tiết"
                      : "Click to configure"}
                  <ChevronDown
                    className={`size-3 transition-transform duration-200 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="rounded-lg bg-primary/10 px-2 py-0.5 font-mono font-bold text-primary">
                  {liveCameraId}
                </span>
                <span
                  className={`rounded-lg px-2 py-0.5 font-mono font-bold ${
                    isUsingOverride
                      ? "bg-accent/15 text-accent"
                      : "bg-foreground/[0.05] text-muted-foreground"
                  }`}
                >
                  {isUsingOverride ? "Override" : sourceTypeLabel}
                </span>
                <span className="rounded-lg bg-foreground/[0.04] px-2 py-0.5 font-mono font-semibold text-foreground">
                  {activeModelName}
                </span>
                <span className="rounded-lg bg-accent/15 px-2 py-0.5 font-mono font-semibold text-accent">
                  {targetFps}/{aiFps} FPS • {confirmHelmetSec}s/{confirmVestSec}s
                </span>
                <span className="rounded-lg bg-primary/10 px-2 py-0.5 font-mono font-semibold text-primary">
                  Conf {confidenceThreshold.toFixed(2)} • Cooldown {cooldownSec}s
                </span>
                <span className="rounded-lg bg-primary/10 px-2 py-0.5 font-mono font-semibold text-primary">
                  {enabledRulesCount}/4 Rules
                </span>
                {activeAiConfig && isRunning && (
                  <span
                    title={
                      isVietnamese
                        ? "Thông số thực tế đang chạy trong AI Engine"
                        : "Live parameters currently active inside AI Engine"
                    }
                    className="rounded-lg bg-emerald-500/12 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400"
                  >
                    AI:{" "}
                    {Number(
                      activeAiConfig.confidence_threshold ?? confidenceThreshold,
                    ).toFixed(2)}{" "}
                    / {activeAiConfig.confirmation_duration_s ?? confirmHelmetSec}s·
                    {activeAiConfig.confirmation_duration_vest_s ?? confirmVestSec}s /{" "}
                    {activeAiConfig.cooldown_s ?? cooldownSec}s
                  </span>
                )}
                {safetySource && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 font-mono text-[10px] font-bold ${
                      safetySource === "CAMERA_OVERRIDE"
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    <ShieldCheck className="size-3" />
                    {safetySource === "CAMERA_OVERRIDE"
                      ? isVietnamese
                        ? "Cấu hình riêng Camera"
                        : "Camera Override"
                      : isVietnamese
                        ? "Kế thừa từ Site"
                        : "Site Inherited"}
                  </span>
                )}
              </div>
            </div>
          </button>

          {/* Recessed Action Switch Bay */}
          <div
            className={`flex flex-wrap items-center gap-2 self-start rounded-2xl p-2 xl:self-center ${NM.recessed}`}
          >
            {canManageCamera && (
              <>
                <button
                  type="button"
                  disabled={isStarting || !canStart}
                  onClick={onStartStream}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-extrabold text-primary-foreground shadow-[4px_4px_10px_rgba(0,0,0,0.16)] transition hover:brightness-105 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45"
                >
                  <Play className="size-3.5 fill-current" />
                  <span>
                    {isStarting
                      ? isVietnamese
                        ? "Đang khởi tạo..."
                        : "Starting..."
                      : isRunning
                        ? isVietnamese
                          ? "Khởi chạy lại"
                          : "Restart"
                        : isVietnamese
                          ? "Bắt đầu Tracking"
                          : "Start Tracking"}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={!isRunning || isStopping}
                  onClick={onStopStream}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-accent disabled:pointer-events-none disabled:opacity-40 ${NM.tactileBtn}`}
                >
                  <Square className="size-3.5 fill-current" />
                  <span>{isVietnamese ? "Dừng Tracking" : "Stop Tracking"}</span>
                </button>
              </>
            )}

            {canSaveDb && (
              <button
                type="button"
                disabled={isSavingDb}
                onClick={onSaveToDb}
                title={
                  canManageCamera && canManageSafety
                    ? isVietnamese
                      ? "Lưu cấu hình FPS & Quy tắc an toàn riêng cho Camera này vào Database"
                      : "Save FPS & Camera-specific Safety Rule overrides to Database"
                    : canManageSafety
                      ? isVietnamese
                        ? "Lưu quy tắc an toàn riêng cho Camera này vào Database"
                        : "Save Camera-specific Safety Rule overrides to Database"
                      : isVietnamese
                        ? "Lưu cấu hình FPS xử lý của Camera vào Database"
                        : "Save Camera capture FPS config to Database"
                }
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-foreground hover:text-primary disabled:pointer-events-none disabled:opacity-40 ${NM.tactileBtn}`}
              >
                <Save className="size-3.5 text-primary" />
                <span>
                  {isSavingDb
                    ? isVietnamese
                      ? "Đang lưu..."
                      : "Saving..."
                    : isVietnamese
                      ? "Lưu DB"
                      : "Save DB"}
                </span>
              </button>
            )}

            {canManageSafety &&
              safetySource === "CAMERA_OVERRIDE" &&
              onResetToSiteRules && (
                <button
                  type="button"
                  disabled={isResettingRules}
                  onClick={onResetToSiteRules}
                  title={
                    isVietnamese
                      ? "Xoá cấu hình riêng của camera này để khôi phục kế thừa quy tắc an toàn từ công trường"
                      : "Reset camera overrides and restore inherited site safety rules"
                  }
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 disabled:pointer-events-none disabled:opacity-40 ${NM.tactileBtn}`}
                >
                  <RotateCcw
                    className={`size-3.5 ${isResettingRules ? "animate-spin" : ""}`}
                  />
                  <span>
                    {isResettingRules
                      ? isVietnamese
                        ? "Đang đặt lại..."
                        : "Resetting..."
                      : isVietnamese
                        ? "Khôi phục theo Site"
                        : "Reset to Site"}
                  </span>
                </button>
              )}

            {canPlotRoi && onOpenRestrictedAreaModal && (
              <button
                type="button"
                onClick={onOpenRestrictedAreaModal}
                title={
                  isVietnamese
                    ? "Thiết lập và vẽ đa giác Vùng cấm nguy hiểm (ROI) theo góc nhìn của Camera này"
                    : "Plot Restricted Area (ROI) danger polygon on this camera's perspective"
                }
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-danger hover:text-danger ${NM.tactileBtn}`}
              >
                <AlertOctagon className="size-3.5 text-danger" />
                <span>
                  {isVietnamese ? "Vẽ Vùng cấm (ROI)" : "Plot ROI Area"}
                </span>
                <span className="rounded-md bg-danger/15 px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-danger">
                  {roiPointsCount >= 3
                    ? `${roiPointsCount} pts`
                    : isVietnamese
                      ? "Chưa vẽ"
                      : "None"}
                </span>
              </button>
            )}

            {!canManageCamera && !canManageSafety && (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-foreground/[0.05] px-3 py-1.5 text-[11px] font-bold text-muted-foreground">
                <ShieldCheck className="size-3.5 text-primary" />
                <span>{isVietnamese ? "Chỉ xem (Read-only)" : "Read-only"}</span>
              </span>
            )}

            <button
              type="button"
              aria-expanded={isExpanded}
              onClick={() => setIsExpanded((prev) => !prev)}
              title={
                isExpanded
                  ? isVietnamese
                    ? "Thu gọn"
                    : "Collapse"
                  : isVietnamese
                    ? "Mở rộng cấu hình"
                    : "Expand configuration"
              }
              aria-label={
                isExpanded
                  ? isVietnamese
                    ? "Thu gọn"
                    : "Collapse"
                  : isVietnamese
                    ? "Mở rộng cấu hình"
                    : "Expand configuration"
              }
              className={`inline-flex h-8 w-8 items-center justify-center rounded-xl text-primary ${NM.tactileBtn}`}
            >
              <ChevronDown
                className={`size-4 transition-transform duration-200 ${
                  isExpanded ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {/* Expanded Config Modules (2 Balanced Modules + Hot Config Bay) */}
        {isExpanded && (
          <>
            {sourceNote && (
              <div
                className={`flex flex-wrap items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium text-accent ${NM.recessed}`}
              >
                <span>{sourceNote}</span>
                {canManageCamera && onOpenDeviceTab && (
                  <button
                    type="button"
                    onClick={onOpenDeviceTab}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold text-primary ${NM.tactileBtn}`}
                  >
                    <Wrench className="size-3" />
                    <span>
                      {isVietnamese
                        ? "Gắn Override ở Tab 03"
                        : "Set Override in Tab 03"}
                    </span>
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              {/* Module 1 (6/12): Read-only Camera Source & Model AI (.pt) */}
              <div className={`space-y-3.5 rounded-2xl p-4 lg:col-span-6 ${NM.extruded}`}>
                <div className="flex items-center justify-between border-b border-foreground/[0.06] pb-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">
                    {isVietnamese
                      ? "01. Nguồn Camera Cố Định & Model AI"
                      : "01. Bound Camera Source & AI Model"}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      isUsingOverride
                        ? "bg-accent/15 text-accent"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {isUsingOverride
                      ? isVietnamese
                        ? "Nguồn Override (Dev)"
                        : "Override Source (Dev)"
                      : sourceTypeLabel}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <span className="block text-[11px] font-semibold text-muted-foreground">
                      {isVietnamese
                        ? `Luồng gắn với ${liveCameraId} (Chỉ đọc)`
                        : `Bound stream for ${liveCameraId} (Read-only)`}
                    </span>
                    <div
                      title={
                        activeSource ||
                        (isVietnamese
                          ? "Chưa có luồng khả dụng"
                          : "No available stream")
                      }
                      className={`flex min-h-[38px] items-center gap-2 rounded-xl px-3 py-1.5 font-mono text-[11px] text-foreground ${NM.recessed}`}
                    >
                      <Link2 className="size-3.5 shrink-0 text-primary" />
                      <span className="truncate">
                        {activeSource ||
                          (isVietnamese
                            ? "Chưa gắn nguồn AI khả dụng"
                            : "No runnable AI source attached")}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-muted-foreground">
                      Model AI (.pt)
                    </label>
                    <Select
                      size="sm"
                      options={modelOptions}
                      value={selectedModel}
                      disabled={!canManageCamera}
                      onValueChange={onModelChange}
                      placeholder={isVietnamese ? "Chọn model" : "Select model"}
                    />
                  </div>
                </div>
              </div>

              {/* Module 2 (6/12): Frame Rate Clock */}
              <div className={`space-y-3.5 rounded-2xl p-4 lg:col-span-6 ${NM.extruded}`}>
                <div className="flex items-center justify-between border-b border-foreground/[0.06] pb-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">
                    {isVietnamese ? "02. Xung Nhịp FPS" : "02. Frame Rate Clock"}
                  </span>
                  <span className="font-mono text-[10px] font-bold text-muted-foreground">
                    1–30 Hz
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-muted-foreground">
                      Target FPS
                    </label>
                    <Input
                      size="sm"
                      type="number"
                      min={1}
                      max={30}
                      step={1}
                      disabled={!canManageCamera}
                      value={targetFps}
                      onChange={(e) =>
                        onTargetFpsChange(
                          Math.min(30, Math.max(1, Number(e.target.value) || 25)),
                        )
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-muted-foreground">
                      AI FPS
                    </label>
                    <Input
                      size="sm"
                      type="number"
                      min={1}
                      max={30}
                      step={1}
                      disabled={!canManageCamera}
                      value={aiFps}
                      onChange={(e) =>
                        onAiFpsChange(
                          Math.min(30, Math.max(1, Number(e.target.value) || 15)),
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <CameraLiveRulesTray
              safetySource={safetySource}
              canManageCamera={canManageCamera}
              canManageSafety={canManageSafety}
              canEditRules={canEditRules}
              isResettingRules={isResettingRules}
              onResetToSiteRules={onResetToSiteRules}
              confirmHelmetSec={confirmHelmetSec}
              onConfirmHelmetSecChange={onConfirmHelmetSecChange}
              confirmVestSec={confirmVestSec}
              onConfirmVestSecChange={onConfirmVestSecChange}
              confidenceThreshold={confidenceThreshold}
              onConfidenceThresholdChange={onConfidenceThresholdChange}
              cooldownSec={cooldownSec}
              onCooldownSecChange={onCooldownSecChange}
              enableNoHelmet={enableNoHelmet}
              onEnableNoHelmetChange={onEnableNoHelmetChange}
              enableNoVest={enableNoVest}
              onEnableNoVestChange={onEnableNoVestChange}
              enableRestrictedArea={enableRestrictedArea}
              onEnableRestrictedAreaChange={onEnableRestrictedAreaChange}
              enableSceneCut={enableSceneCut}
              onEnableSceneCutChange={onEnableSceneCutChange}
            />
          </>
        )}
      </div>
    </section>
  );
});
