"use client";

import { memo } from "react";
import { RotateCcw, ShieldCheck } from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import { Input, Switch } from "@/components/ui/form";
import { useLocale } from "@/providers/locale-provider";

export interface CameraLiveRulesTrayProps {
  safetySource?: string;
  canManageCamera: boolean;
  canManageSafety: boolean;
  canEditRules: boolean;
  isResettingRules: boolean;
  onResetToSiteRules?: () => void;
  confirmHelmetSec: number;
  onConfirmHelmetSecChange: (value: number) => void;
  confirmVestSec: number;
  onConfirmVestSecChange: (value: number) => void;
  confidenceThreshold: number;
  onConfidenceThresholdChange?: (value: number) => void;
  cooldownSec: number;
  onCooldownSecChange?: (value: number) => void;
  enableNoHelmet: boolean;
  onEnableNoHelmetChange: (checked: boolean) => void;
  enableNoVest: boolean;
  onEnableNoVestChange: (checked: boolean) => void;
  enableRestrictedArea: boolean;
  onEnableRestrictedAreaChange: (checked: boolean) => void;
  enableSceneCut: boolean;
  onEnableSceneCutChange: (checked: boolean) => void;
}

export const CameraLiveRulesTray = memo(function CameraLiveRulesTray({
  safetySource,
  canManageCamera,
  canManageSafety,
  canEditRules,
  isResettingRules,
  onResetToSiteRules,
  confirmHelmetSec,
  onConfirmHelmetSecChange,
  confirmVestSec,
  onConfirmVestSecChange,
  confidenceThreshold,
  onConfidenceThresholdChange,
  cooldownSec,
  onCooldownSecChange,
  enableNoHelmet,
  onEnableNoHelmetChange,
  enableNoVest,
  onEnableNoVestChange,
  enableRestrictedArea,
  onEnableRestrictedAreaChange,
  enableSceneCut,
  onEnableSceneCutChange,
}: CameraLiveRulesTrayProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  return (
    <div className={`rounded-[22px] p-4 ${NM.recessed}`}>
      <div className={`space-y-3.5 rounded-2xl p-4 ${NM.extruded}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-foreground/[0.06] pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">
              {isVietnamese
                ? "03. Luật & Ngưỡng Sustain"
                : "03. Rules & Sustain Thresholds"}
            </span>
            {safetySource && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  safetySource === "CAMERA_OVERRIDE"
                    ? "border border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    : "border border-primary/20 bg-primary/10 text-primary"
                }`}
              >
                <ShieldCheck className="size-3" />
                {safetySource === "CAMERA_OVERRIDE"
                  ? isVietnamese
                    ? "Cấu hình riêng Camera"
                    : "Camera Override"
                  : isVietnamese
                    ? "Kế thừa từ Công trường"
                    : "Inherited from Site"}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canManageSafety &&
              safetySource === "CAMERA_OVERRIDE" &&
              onResetToSiteRules && (
                <button
                  type="button"
                  disabled={isResettingRules}
                  onClick={onResetToSiteRules}
                  className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 disabled:opacity-50 ${NM.tactileBtn}`}
                >
                  <RotateCcw
                    className={`size-3 ${isResettingRules ? "animate-spin" : ""}`}
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
            <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[10px] font-bold text-accent">
              {!canEditRules
                ? isVietnamese
                  ? "Chỉ xem ngưỡng (Cần quyền Safety Config)"
                  : "Rules Read-only (Requires Safety Config)"
                : isVietnamese
                  ? "Áp dụng khi bắt đầu hoặc khởi chạy lại"
                  : "Applied on start or restart"}
            </span>
          </div>
        </div>

        {/* Sustain Timers + Confidence & Cooldown */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              key: "helmet",
              label: isVietnamese ? "Sustain Mũ (s)" : "Helmet Sustain (s)",
              ruleTag: "NO_HELMET",
              enabled: enableNoHelmet,
              value: confirmHelmetSec,
              fallback: 2.0,
              onChange: onConfirmHelmetSecChange,
            },
            {
              key: "vest",
              label: isVietnamese ? "Sustain Áo (s)" : "Vest Sustain (s)",
              ruleTag: "NO_VEST",
              enabled: enableNoVest,
              value: confirmVestSec,
              fallback: 4.0,
              onChange: onConfirmVestSecChange,
            },
          ].map((timer) => (
            <div
              key={timer.key}
              className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 transition-all ${
                timer.enabled
                  ? "border-accent/30 bg-accent/[0.06]"
                  : "border-foreground/[0.06] bg-background/60 opacity-55"
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`size-2 shrink-0 rounded-full ${
                      timer.enabled ? "bg-accent" : "bg-muted-foreground/40"
                    }`}
                  />
                  <span className="text-xs font-bold text-foreground">
                    {timer.label}
                  </span>
                </div>
                <p className="mt-0.5 pl-3.5 font-mono text-[10px] text-muted-foreground">
                  {isVietnamese ? "Áp dụng cho" : "Applies to"} {timer.ruleTag}
                </p>
              </div>

              <Input
                size="sm"
                type="number"
                min={1}
                max={30}
                step={0.5}
                disabled={!timer.enabled || !canEditRules}
                value={timer.value}
                onChange={(e) =>
                  timer.onChange(
                    Math.min(
                      30,
                      Math.max(1, Number(e.target.value) || timer.fallback),
                    ),
                  )
                }
                className="w-20 text-center font-mono font-bold text-primary"
              />
            </div>
          ))}

          {/* AI Confidence Threshold */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/[0.05] px-3.5 py-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="size-2 shrink-0 rounded-full bg-primary" />
                <span className="text-xs font-bold text-foreground">
                  {isVietnamese ? "Ngưỡng tin cậy AI" : "AI Confidence"}
                </span>
              </div>
              <p className="mt-0.5 pl-3.5 font-mono text-[10px] text-muted-foreground">
                0.10 – 0.99
              </p>
            </div>
            <Input
              size="sm"
              type="number"
              min={0.1}
              max={0.99}
              step={0.05}
              disabled={!canEditRules}
              value={confidenceThreshold}
              onChange={(e) =>
                onConfidenceThresholdChange?.(
                  Math.min(0.99, Math.max(0.1, Number(e.target.value) || 0.8)),
                )
              }
              className="w-20 text-center font-mono font-bold text-primary"
            />
          </div>

          {/* Cooldown chống lặp */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/[0.05] px-3.5 py-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="size-2 shrink-0 rounded-full bg-primary" />
                <span className="text-xs font-bold text-foreground">
                  {isVietnamese ? "Cooldown lặp (s)" : "Alert Cooldown (s)"}
                </span>
              </div>
              <p className="mt-0.5 pl-3.5 font-mono text-[10px] text-muted-foreground">
                5 – 300s
              </p>
            </div>
            <Input
              size="sm"
              type="number"
              min={5}
              max={300}
              step={5}
              disabled={!canEditRules}
              value={cooldownSec}
              onChange={(e) =>
                onCooldownSecChange?.(
                  Math.min(
                    300,
                    Math.max(5, Math.round(Number(e.target.value) || 30)),
                  ),
                )
              }
              className="w-20 text-center font-mono font-bold text-primary"
            />
          </div>
        </div>

        {/* 4 Rules Switches */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              key: "no_helmet",
              label: "NO_HELMET",
              checked: enableNoHelmet,
              onChange: onEnableNoHelmetChange,
              mono: true,
            },
            {
              key: "no_vest",
              label: "NO_VEST",
              checked: enableNoVest,
              onChange: onEnableNoVestChange,
              mono: true,
            },
            {
              key: "restricted_area",
              label: "RESTRICTED_AREA",
              checked: enableRestrictedArea,
              onChange: onEnableRestrictedAreaChange,
              mono: true,
            },
            {
              key: "scene_cut",
              label: "Scene Cut",
              checked: enableSceneCut,
              onChange: onEnableSceneCutChange,
              mono: false,
            },
          ].map((rule) => (
            <div
              key={rule.key}
              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 transition-all ${
                rule.checked
                  ? "border-primary/35 bg-primary/[0.08]"
                  : "border-foreground/[0.06] bg-background/60 opacity-65"
              }`}
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`size-2 shrink-0 rounded-full ${
                      rule.checked
                        ? "bg-primary shadow-[0_0_6px_var(--primary)]"
                        : "bg-muted-foreground/40"
                    }`}
                  />
                  <span
                    className={`truncate text-[11px] font-bold tracking-tight ${
                      rule.mono ? "font-mono" : ""
                    } ${rule.checked ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    {rule.label}
                  </span>
                </div>
                <span
                  className={`ml-3.5 inline-block rounded-md px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${
                    rule.checked
                      ? "bg-primary/15 text-primary"
                      : "bg-foreground/10 text-muted-foreground"
                  }`}
                >
                  {rule.checked
                    ? isVietnamese
                      ? "BẬT"
                      : "ON"
                    : isVietnamese
                      ? "TẮT"
                      : "OFF"}
                </span>
              </div>

              <Switch
                size="sm"
                checked={rule.checked}
                disabled={
                  rule.key === "scene_cut" ? !canManageCamera : !canEditRules
                }
                onCheckedChange={rule.onChange}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
