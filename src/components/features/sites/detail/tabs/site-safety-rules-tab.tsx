"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertOctagon,
  Camera,
  Clock,
  Cpu,
  HardHat,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  Shield,
  Shirt,
  Sparkles,
  ChevronDown,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCameras } from "@/hooks/cameras";
import {
  useInvalidateSafetyRuleCache,
  useSiteSafetyConfig,
  useSystemDefaultSafetyConfig,
  useUpdateSiteSafetyConfig,
} from "@/hooks/sites/use-site-safety-config";
import { useCan } from "@/hooks/use-can";
import { useLocale } from "@/providers/locale-provider";
import { aiMetricsService } from "@/services/ai-metrics.service";
import type {
  AiModelDto,
  SiteItem,
  UpdateSiteSafetyConfigPayload,
} from "@/types";

export interface SiteSafetyRulesTabProps {
  site: SiteItem;
}

export function SiteSafetyRulesTab({ site }: SiteSafetyRulesTabProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const can = useCan();
  const canManage = can("PPE_SAFETY_CONFIG_MANAGE");
  const canReadModels = can("PPE_MODEL_READ");
  const isSiteActive = site.status === "ACTIVE";
  const isSiteEditable = canManage && isSiteActive;

  // Site safety config + system default + models
  const { data: config, isLoading } = useSiteSafetyConfig(site.id);
  const { data: systemDefault } = useSystemDefaultSafetyConfig();
  const { data: aiModels = [] } = useQuery<AiModelDto[]>({
    queryKey: ["ai-models", "list"],
    queryFn: () => aiMetricsService.getAiModels(),
    enabled: canReadModels,
    staleTime: 60_000,
  });

  const updateMutation = useUpdateSiteSafetyConfig();
  const invalidateCacheMutation = useInvalidateSafetyRuleCache();

  // Site form state
  const [enableNoHelmet, setEnableNoHelmet] = useState(true);
  const [enableNoVest, setEnableNoVest] = useState(true);
  const [enableRestrictedArea, setEnableRestrictedArea] = useState(true);
  const [confirmationDuration, setConfirmationDuration] = useState<number>(2);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.8);
  const [cooldownDuration, setCooldownDuration] = useState<number>(30);
  const [modelVersionId, setModelVersionId] = useState<string>("");

  const sourceConfig = config || site?.safetyConfigs?.[0];

  useEffect(() => {
    if (sourceConfig) {
      setEnableNoHelmet(sourceConfig.enableNoHelmet ?? true);
      setEnableNoVest(sourceConfig.enableNoVest ?? true);
      setEnableRestrictedArea(sourceConfig.enableRestrictedArea ?? true);
      setConfirmationDuration(sourceConfig.confirmationDuration ?? 2);
      setConfidenceThreshold(Number(sourceConfig.confidenceThreshold) || 0.8);
      setCooldownDuration(sourceConfig.cooldownDuration ?? 30);
      setModelVersionId(sourceConfig.modelVersionId ?? "");
    }
  }, [sourceConfig]);

  const isDirty = useMemo(() => {
    if (!sourceConfig) return false;
    return (
      enableNoHelmet !== (sourceConfig.enableNoHelmet ?? true) ||
      enableNoVest !== (sourceConfig.enableNoVest ?? true) ||
      enableRestrictedArea !== (sourceConfig.enableRestrictedArea ?? true) ||
      confirmationDuration !== (sourceConfig.confirmationDuration ?? 2) ||
      Math.abs(confidenceThreshold - (Number(sourceConfig.confidenceThreshold) || 0.8)) > 0.001 ||
      cooldownDuration !== (sourceConfig.cooldownDuration ?? 30) ||
      modelVersionId !== (sourceConfig.modelVersionId ?? "")
    );
  }, [
    sourceConfig,
    enableNoHelmet,
    enableNoVest,
    enableRestrictedArea,
    confirmationDuration,
    confidenceThreshold,
    cooldownDuration,
    modelVersionId,
  ]);

  const modelVersions = useMemo(
    () =>
      aiModels.flatMap((m) =>
        (m.versions || []).map((v) => ({
          id: v.id,
          label: `${m.name} v${v.version} (${v.status})`,
        })),
      ),
    [aiModels],
  );

  const handleSaveSiteConfig = async () => {
    if (!isSiteEditable) return;
    const payload: UpdateSiteSafetyConfigPayload = {
      enableNoHelmet,
      enableNoVest,
      enableRestrictedArea,
      confirmationDuration,
      confidenceThreshold,
      cooldownDuration,
      modelVersionId: modelVersionId ? modelVersionId : null,
    };

    await updateMutation.mutateAsync({
      siteId: site.id,
      payload,
    });
  };

  const handleApplySystemDefault = () => {
    if (!systemDefault) return;
    setEnableNoHelmet(
      systemDefault.rules?.enableNoHelmet ?? systemDefault.enableNoHelmet ?? true,
    );
    setEnableNoVest(
      systemDefault.rules?.enableNoVest ?? systemDefault.enableNoVest ?? true,
    );
    setEnableRestrictedArea(
      systemDefault.rules?.enableRestrictedArea ??
        systemDefault.enableRestrictedArea ??
        true,
    );
    setConfirmationDuration(systemDefault.confirmationDuration ?? 2);
    setConfidenceThreshold(Number(systemDefault.confidenceThreshold) || 0.8);
    setCooldownDuration(systemDefault.cooldownDuration ?? 30);
    setModelVersionId(systemDefault.modelVersionId ?? "");
  };

  // ── Cameras inheriting this site standard ─────────────────────────────────
  const { data: camerasData } = useCameras({ siteId: site.id, limit: 100 });
  const cameras = useMemo(() => camerasData?.items ?? [], [camerasData]);

  const ppeRules = [
    {
      id: "noHelmet",
      name: isVietnamese ? "Mũ bảo hộ lao động (Hard Hat)" : "Hard Hat Protection",
      code: "NO_HELMET",
      desc: isVietnamese
        ? "Bắt buộc công nhân và khách tham quan đội mũ bảo hộ khi bước vào công trường."
        : "Mandatory hard hat wearing for all workers and visitors entering the jobsite.",
      icon: <HardHat className="h-5 w-5 text-primary" />,
      checked: enableNoHelmet,
      onChange: setEnableNoHelmet,
      riskLevel: "CRITICAL",
    },
    {
      id: "noVest",
      name: isVietnamese ? "Áo phản quang an toàn (Safety Vest)" : "High-Visibility Safety Vest",
      code: "NO_VEST",
      desc: isVietnamese
        ? "Bắt buộc mặc áo dạ quang nhận diện trong điều kiện ánh sáng yếu và khu vực xe cơ giới."
        : "Mandatory high-visibility vest in low-light conditions and heavy machinery zones.",
      icon: <Shirt className="h-5 w-5 text-accent" />,
      checked: enableNoVest,
      onChange: setEnableNoVest,
      riskLevel: "HIGH",
    },
    {
      id: "restrictedArea",
      name: isVietnamese
        ? "Kiểm soát Vùng cấm nguy hiểm (Danger Zone)"
        : "Danger & Restricted Zone Control",
      code: "RESTRICTED_AREA",
      desc: isVietnamese
        ? "Báo động khẩn cấp khi phát hiện người đi vào khu vực cẩu tháp, trạm biến áp, hố ga mở."
        : "Emergency alert when individuals enter crane radius, high-voltage transformers, or open pits.",
      icon: <AlertOctagon className="h-5 w-5 text-danger" />,
      checked: enableRestrictedArea,
      onChange: setEnableRestrictedArea,
      riskLevel: "CRITICAL",
    },
  ];

  return (
<div className="space-y-6">
  {/* =========================================================
      1. PPE STANDARDS OVERVIEW (HEADER CARD)
  ========================================================= */}
  <section className="relative overflow-hidden rounded-[26px] border border-white/60 bg-surface p-5 sm:p-6 shadow-[9px_9px_20px_var(--shadow-dark),-9px_-9px_20px_rgba(255,255,255,0.85)] dark:border-white/[0.06] dark:bg-card dark:shadow-[9px_9px_22px_rgba(0,0,0,0.55),-4px_-4px_12px_rgba(255,255,255,0.03)]">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      {/* Left: Icon + Title + Badges */}
      <div className="flex min-w-0 items-start gap-4">
        {/* Neumorphic Extruded Icon Pod */}
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border border-white/70 bg-surface text-primary shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_rgba(255,255,255,0.9)] dark:border-white/[0.07] dark:bg-card dark:shadow-[5px_5px_12px_rgba(0,0,0,0.5),-2px_-2px_6px_rgba(255,255,255,0.03)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-primary/[0.08] shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_rgba(255,255,255,0.7)] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.6)]">
            <Shield className="h-5 w-5 stroke-[2]" />
          </div>
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-[15px] font-extrabold tracking-tight text-foreground sm:text-base">
              {isVietnamese
                ? "Tiêu chuẩn Trang bị Bảo hộ Bắt buộc"
                : "Mandatory PPE Safety Standards"}
            </h3>

            {/* Inset Pill Badge */}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-background/60 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-primary shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_rgba(255,255,255,0.8)] dark:bg-black/25 dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.65)]">
              <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]" />
              Per-Site
            </span>

            {isDirty && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-600 shadow-[inset_2px_2px_4px_rgba(217,119,6,0.18),inset_-1px_-1px_3px_rgba(255,255,255,0.7)] dark:text-amber-400 dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.6)]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                {isVietnamese ? "Có thay đổi chưa lưu" : "Unsaved changes"}
              </span>
            )}
          </div>

          <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            {isVietnamese
              ? "Các quy tắc đã kích hoạt sẽ được AI giám sát và tự động phát hiện vi phạm qua camera."
              : "Enabled rules are continuously monitored by AI across connected cameras."}
          </p>
        </div>
      </div>

      {/* Right: Tactile Neumorphic Action Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        {canManage && (
          <button
            type="button"
            onClick={() => invalidateCacheMutation.mutate({ siteId: site.id })}
            disabled={invalidateCacheMutation.isPending}
            title={
              isVietnamese
                ? "Xóa cache cấu hình an toàn để AI nạp ngay lập tức"
                : "Invalidate AI rule cache"
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[14px] border border-white/70 bg-surface px-3.5 text-xs font-bold text-foreground shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.85)] transition-all duration-150 hover:text-primary active:shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_rgba(255,255,255,0.85)] disabled:opacity-50 dark:border-white/[0.06] dark:bg-card dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45),-2px_-2px_6px_rgba(255,255,255,0.03)] dark:active:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.65)]"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${invalidateCacheMutation.isPending ? "animate-spin text-primary" : ""}`}
            />
            <span className="hidden sm:inline">
              {isVietnamese ? "Đồng bộ Cache AI" : "Sync AI Cache"}
            </span>
          </button>
        )}

        {isSiteEditable && systemDefault && (
          <button
            type="button"
            onClick={handleApplySystemDefault}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[14px] border border-white/70 bg-surface px-3.5 text-xs font-bold text-foreground shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.85)] transition-all duration-150 hover:text-primary active:shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_rgba(255,255,255,0.85)] dark:border-white/[0.06] dark:bg-card dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45),-2px_-2px_6px_rgba(255,255,255,0.03)] dark:active:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.65)]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{isVietnamese ? "Mặc định hệ thống" : "System Default"}</span>
          </button>
        )}

        {canManage && (
          <button
            type="button"
            onClick={() => void handleSaveSiteConfig()}
            disabled={!isSiteEditable || updateMutation.isPending || isLoading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[14px] bg-primary px-4.5 text-xs font-extrabold text-primary-foreground shadow-[4px_4px_12px_rgba(var(--primary-rgb),0.35),-3px_-3px_8px_rgba(255,255,255,0.7)] transition-all duration-150 hover:brightness-105 active:scale-[0.98] disabled:opacity-50 dark:shadow-[4px_4px_14px_rgba(0,0,0,0.6),-2px_-2px_6px_rgba(255,255,255,0.05)]"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>
              {updateMutation.isPending
                ? isVietnamese
                  ? "Đang lưu..."
                  : "Saving..."
                : isVietnamese
                  ? "Lưu tiêu chuẩn"
                  : "Save Standards"}
            </span>
          </button>
        )}
      </div>
    </div>
  </section>

  {/* =========================================================
      2. PPE RULE CARDS (EXTRUDED CARDS + PRESSED ICON PODS)
  ========================================================= */}
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
    {ppeRules.map((rule) => {
      const isEnabled = rule.checked;
      const isCritical = rule.riskLevel === "CRITICAL";
      const isHigh = rule.riskLevel === "HIGH";

      return (
        <div
          key={rule.id}
          className={`group relative flex min-w-0 flex-col justify-between overflow-hidden rounded-[24px] p-5 transition-all duration-300 ${
            isEnabled
              ? "border border-primary/25 bg-surface shadow-[8px_8px_18px_var(--shadow-dark),-8px_-8px_18px_rgba(255,255,255,0.9)] dark:border-primary/20 dark:bg-card dark:shadow-[8px_8px_20px_rgba(0,0,0,0.55),-3px_-3px_10px_rgba(255,255,255,0.03)]"
              : "border border-white/50 bg-surface/85 shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_rgba(255,255,255,0.75)] opacity-85 hover:opacity-100 dark:border-white/[0.04] dark:bg-card/80 dark:shadow-[5px_5px_12px_rgba(0,0,0,0.45),-2px_-2px_6px_rgba(255,255,255,0.02)]"
          }`}
        >
          {/* Subtle top ambient glow when active */}
          {isEnabled && (
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/[0.08] blur-2xl" />
          )}

          <div className="relative">
            <div className="flex items-start justify-between gap-3.5">
              <div className="flex min-w-0 items-center gap-3.5">
                {/* Icon Pod: Inset (debossed) when active, Extruded when inactive */}
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] transition-all duration-300 ${
                    isEnabled
                      ? "bg-primary/[0.07] text-primary shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_rgba(255,255,255,0.85)] dark:bg-primary/[0.12] dark:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.65),inset_-1px_-1px_3px_rgba(255,255,255,0.04)]"
                      : "border border-white/60 bg-surface text-muted-foreground shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_rgba(255,255,255,0.85)] dark:border-white/[0.05] dark:bg-card dark:shadow-[4px_4px_9px_rgba(0,0,0,0.45),-2px_-2px_5px_rgba(255,255,255,0.02)]"
                  }`}
                >
                  {rule.icon}
                </div>

                <div className="min-w-0">
                  <h4 className="text-[13px] font-extrabold leading-snug text-foreground">
                    {rule.name}
                  </h4>
                  <span className="mt-1 inline-block rounded-md bg-background/60 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider text-primary/85 shadow-[inset_1px_1px_3px_var(--shadow-dark),inset_-1px_-1px_2px_rgba(255,255,255,0.7)] dark:bg-black/25 dark:shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)]">
                    {rule.code}
                  </span>
                </div>
              </div>

              {/* Tactile Neumorphic Toggle Switch */}
              <label className="relative inline-flex shrink-0 cursor-pointer items-center pt-0.5">
                <input
                  type="checkbox"
                  checked={rule.checked}
                  disabled={!isSiteEditable}
                  onChange={(e) => rule.onChange(e.target.checked)}
                  className="peer sr-only"
                />
                {/* Recessed Track */}
                <span className="relative h-[28px] w-[52px] rounded-full bg-background/80 shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_rgba(255,255,255,0.85)] transition-all duration-300 peer-checked:bg-primary/15 peer-disabled:opacity-50 dark:bg-black/40 dark:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.75),inset_-1px_-1px_3px_rgba(255,255,255,0.04)] peer-checked:dark:bg-primary/20">
                  {/* Extruded Thumb Knob */}
                  <span
                    className={`absolute left-[4px] top-[4px] flex h-[20px] w-[20px] items-center justify-center rounded-full transition-all duration-300 ${
                      isEnabled
                        ? "translate-x-[24px] bg-primary shadow-[2px_2px_6px_rgba(0,0,0,0.3),-1px_-1px_3px_rgba(255,255,255,0.4)]"
                        : "bg-surface shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_rgba(255,255,255,0.9)] dark:bg-card dark:shadow-[2px_2px_5px_rgba(0,0,0,0.6),-1px_-1px_3px_rgba(255,255,255,0.05)]"
                    }`}
                  >
                    {/* Tiny LED center dot */}
                    <span
                      className={`h-1.5 w-1.5 rounded-full transition-colors ${
                        isEnabled
                          ? "bg-white shadow-[0_0_4px_#fff]"
                          : "bg-muted-foreground/30"
                      }`}
                    />
                  </span>
                </span>
              </label>
            </div>

            <p className="mt-4 min-h-[36px] text-[11.5px] leading-[1.65] text-muted-foreground">
              {rule.desc}
            </p>
          </div>

          {/* Grooved Divider + Inset Risk Level Pill */}
          <div className="relative mt-4 flex items-center justify-between gap-3 pt-3.5 before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-border/40 before:to-transparent">
            <span className="text-[10.5px] font-semibold text-muted-foreground">
              {isVietnamese ? "Mức độ xử lý" : "Severity Level"}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9.5px] font-extrabold tracking-wider shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_rgba(255,255,255,0.75)] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.65)] ${
                isCritical
                  ? "bg-danger/10 text-danger"
                  : isHigh
                    ? "bg-accent/15 text-accent"
                    : "bg-primary/10 text-primary"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isCritical
                    ? "bg-danger shadow-[0_0_6px_var(--danger)]"
                    : isHigh
                      ? "bg-accent shadow-[0_0_6px_var(--accent)]"
                      : "bg-primary shadow-[0_0_6px_var(--primary)]"
                }`}
              />
              {rule.riskLevel}
            </span>
          </div>
        </div>
      );
    })}
  </div>

  {/* =========================================================
      3. THRESHOLD & MODEL CONTROLS (EXTRUDED CONTAINERS + INSET WELLS)
  ========================================================= */}
  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
    {/* Confirmation Duration (0.5 - 60s) */}
    <section className="flex flex-col justify-between rounded-[24px] border border-white/60 bg-surface p-5 shadow-[8px_8px_18px_var(--shadow-dark),-8px_-8px_18px_rgba(255,255,255,0.85)] dark:border-white/[0.06] dark:bg-card dark:shadow-[8px_8px_20px_rgba(0,0,0,0.55),-3px_-3px_10px_rgba(255,255,255,0.03)]">
      <div className="flex items-start gap-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] border border-white/60 bg-surface text-primary shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.85)] dark:border-white/[0.05] dark:bg-card dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45),-2px_-2px_5px_rgba(255,255,255,0.02)]">
          <Clock className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-[13px] font-extrabold text-foreground">
            {isVietnamese
              ? "Ngưỡng thời gian xác nhận vi phạm"
              : "Violation Confirmation Time"}
          </h4>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {isVietnamese
              ? "Thời gian vi phạm liên tục tối thiểu (0.5 – 60 giây) trước khi kích hoạt cảnh báo."
              : "Minimum sustained violation duration (0.5 – 60 sec) before triggering an alert."}
          </p>
        </div>
      </div>

      {/* Deep Inset Well */}
      <div className="mt-4 rounded-[18px] bg-background/60 p-4 shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_rgba(255,255,255,0.85)] dark:bg-black/30 dark:shadow-[inset_4px_4px_10px_rgba(0,0,0,0.7),inset_-2px_-2px_6px_rgba(255,255,255,0.03)]">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-bold text-muted-foreground">
            {isVietnamese ? "Thời lượng" : "Duration"}
          </span>
          {/* Extruded Digital Readout Badge */}
          <span className="rounded-xl border border-white/70 bg-surface px-3 py-1 font-mono text-xs font-black tabular-nums text-primary shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_rgba(255,255,255,0.9)] dark:border-white/[0.06] dark:bg-card dark:shadow-[3px_3px_7px_rgba(0,0,0,0.55)]">
            {confirmationDuration} {isVietnamese ? "giây" : "sec"}
          </span>
        </div>

        <input
          type="range"
          min="0.5"
          max="60"
          step="0.5"
          disabled={!isSiteEditable}
          value={confirmationDuration}
          onChange={(e) => setConfirmationDuration(parseFloat(e.target.value))}
          className="mt-3.5 h-2.5 w-full cursor-pointer appearance-none rounded-full bg-surface shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] accent-primary dark:bg-black/50 dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.8)]"
        />

        <div className="mt-2.5 flex justify-between font-mono text-[9.5px] font-semibold text-muted-foreground/75">
          <span>0.5s</span>
          <span>15s</span>
          <span>30s</span>
          <span>45s</span>
          <span>60s</span>
        </div>
      </div>
    </section>

    {/* AI Confidence Threshold (10% - 99%) */}
    <section className="flex flex-col justify-between rounded-[24px] border border-white/60 bg-surface p-5 shadow-[8px_8px_18px_var(--shadow-dark),-8px_-8px_18px_rgba(255,255,255,0.85)] dark:border-white/[0.06] dark:bg-card dark:shadow-[8px_8px_20px_rgba(0,0,0,0.55),-3px_-3px_10px_rgba(255,255,255,0.03)]">
      <div className="flex items-start gap-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] border border-white/60 bg-surface text-accent shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.85)] dark:border-white/[0.05] dark:bg-card dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45),-2px_-2px_5px_rgba(255,255,255,0.02)]">
          <Sparkles className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-[13px] font-extrabold text-foreground">
            {isVietnamese ? "Độ tin cậy AI tối thiểu" : "Minimum AI Confidence"}
          </h4>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {isVietnamese
              ? "Ngưỡng tin cậy tối thiểu (10% – 99%) để thuật toán ghi nhận vi phạm."
              : "Minimum detection confidence (10% – 99%) required to register a violation."}
          </p>
        </div>
      </div>

      {/* Deep Inset Well */}
      <div className="mt-4 rounded-[18px] bg-background/60 p-4 shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_rgba(255,255,255,0.85)] dark:bg-black/30 dark:shadow-[inset_4px_4px_10px_rgba(0,0,0,0.7),inset_-2px_-2px_6px_rgba(255,255,255,0.03)]">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-bold text-muted-foreground">
            {isVietnamese ? "Ngưỡng tin cậy" : "Confidence"}
          </span>
          {/* Extruded Digital Readout Badge */}
          <span className="rounded-xl border border-white/70 bg-surface px-3 py-1 font-mono text-xs font-black tabular-nums text-accent shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_rgba(255,255,255,0.9)] dark:border-white/[0.06] dark:bg-card dark:shadow-[3px_3px_7px_rgba(0,0,0,0.55)]">
            {(confidenceThreshold * 100).toFixed(0)}%
          </span>
        </div>

        <input
          type="range"
          min="0.1"
          max="0.99"
          step="0.05"
          disabled={!isSiteEditable}
          value={confidenceThreshold}
          onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
          className="mt-3.5 h-2.5 w-full cursor-pointer appearance-none rounded-full bg-surface shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] accent-accent dark:bg-black/50 dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.8)]"
        />

        <div className="mt-2.5 flex justify-between font-mono text-[9.5px] font-semibold text-muted-foreground/75">
          <span>10%</span>
          <span>35%</span>
          <span>60%</span>
          <span>80%</span>
          <span>99%</span>
        </div>
      </div>
    </section>

    {/* Cooldown Duration (5 - 300s) */}
    <section className="flex flex-col justify-between rounded-[24px] border border-white/60 bg-surface p-5 shadow-[8px_8px_18px_var(--shadow-dark),-8px_-8px_18px_rgba(255,255,255,0.85)] dark:border-white/[0.06] dark:bg-card dark:shadow-[8px_8px_20px_rgba(0,0,0,0.55),-3px_-3px_10px_rgba(255,255,255,0.03)]">
      <div className="flex items-start gap-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] border border-white/60 bg-surface text-primary shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.85)] dark:border-white/[0.05] dark:bg-card dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45),-2px_-2px_5px_rgba(255,255,255,0.02)]">
          <Timer className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-[13px] font-extrabold text-foreground">
            {isVietnamese
              ? "Thời gian Cooldown chống lặp cảnh báo"
              : "Alert Cooldown Duration"}
          </h4>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {isVietnamese
              ? "Khoảng nghỉ tối thiểu (5 – 300 giây) giữa hai cảnh báo trùng lặp cùng camera."
              : "Minimum interval (5 – 300 sec) between repeated alerts from the same track."}
          </p>
        </div>
      </div>

      {/* Deep Inset Well */}
      <div className="mt-4 rounded-[18px] bg-background/60 p-4 shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_rgba(255,255,255,0.85)] dark:bg-black/30 dark:shadow-[inset_4px_4px_10px_rgba(0,0,0,0.7),inset_-2px_-2px_6px_rgba(255,255,255,0.03)]">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-bold text-muted-foreground">
            Cooldown
          </span>
          {/* Extruded Digital Readout Badge */}
          <span className="rounded-xl border border-white/70 bg-surface px-3 py-1 font-mono text-xs font-black tabular-nums text-primary shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_rgba(255,255,255,0.9)] dark:border-white/[0.06] dark:bg-card dark:shadow-[3px_3px_7px_rgba(0,0,0,0.55)]">
            {cooldownDuration} {isVietnamese ? "giây" : "sec"}
          </span>
        </div>

        <input
          type="range"
          min="5"
          max="300"
          step="5"
          disabled={!isSiteEditable}
          value={cooldownDuration}
          onChange={(e) => setCooldownDuration(parseInt(e.target.value, 10))}
          className="mt-3.5 h-2.5 w-full cursor-pointer appearance-none rounded-full bg-surface shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] accent-primary dark:bg-black/50 dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.8)]"
        />

        <div className="mt-2.5 flex justify-between font-mono text-[9.5px] font-semibold text-muted-foreground/75">
          <span>5s</span>
          <span>60s</span>
          <span>120s</span>
          <span>240s</span>
          <span>300s</span>
        </div>
      </div>
    </section>

    {/* AI Model Version Selector */}
    <section className="flex flex-col justify-between rounded-[24px] border border-white/60 bg-surface p-5 shadow-[8px_8px_18px_var(--shadow-dark),-8px_-8px_18px_rgba(255,255,255,0.85)] dark:border-white/[0.06] dark:bg-card dark:shadow-[8px_8px_20px_rgba(0,0,0,0.55),-3px_-3px_10px_rgba(255,255,255,0.03)]">
      <div className="flex items-start gap-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] border border-white/60 bg-surface text-primary shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.85)] dark:border-white/[0.05] dark:bg-card dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45),-2px_-2px_5px_rgba(255,255,255,0.02)]">
          <Cpu className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-[13px] font-extrabold text-foreground">
            {isVietnamese
              ? "Phiên bản Mô hình AI Áp dụng"
              : "Assigned AI Model Version"}
          </h4>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {isVietnamese
              ? "Chọn phiên bản trọng số YOLO riêng cho công trường hoặc dùng phiên bản Active toàn hệ thống."
              : "Bind a specific AI model version to this site or inherit the global active model."}
          </p>
        </div>
      </div>

      {/* Recessed Select Slot */}
      <div className="mt-4 rounded-[18px] bg-background/60 p-3 shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_rgba(255,255,255,0.85)] dark:bg-black/30 dark:shadow-[inset_4px_4px_10px_rgba(0,0,0,0.7),inset_-2px_-2px_6px_rgba(255,255,255,0.03)]">
        <div className="relative">
          <select
            value={modelVersionId}
            disabled={!isSiteEditable}
            onChange={(e) => setModelVersionId(e.target.value)}
            aria-label={isVietnamese ? "Phiên bản mô hình AI" : "AI Model Version"}
            className="w-full cursor-pointer appearance-none rounded-[13px] border border-white/70 bg-surface py-2.5 pl-3.5 pr-9 text-xs font-bold text-foreground shadow-[3px_3px_8px_var(--shadow-dark),-3px_-3px_8px_rgba(255,255,255,0.9)] transition-all focus:border-primary/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[0.06] dark:bg-card dark:shadow-[3px_3px_8px_rgba(0,0,0,0.55)]"
          >
            <option value="">
              {isVietnamese
                ? "Mặc định hệ thống (Active Global Model)"
                : "System Default (Active Global Model)"}
            </option>
            {modelVersions.map((ver) => (
              <option key={ver.id} value={ver.id}>
                {ver.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>
    </section>
  </div>

  {/* =========================================================
      4. INHERITANCE SUMMARY: Site standard -> all cameras
  ========================================================= */}
  <section className="rounded-[24px] border border-white/60 bg-surface p-5 shadow-[8px_8px_18px_var(--shadow-dark),-8px_-8px_18px_rgba(255,255,255,0.85)] dark:border-white/[0.06] dark:bg-card dark:shadow-[8px_8px_20px_rgba(0,0,0,0.55),-3px_-3px_10px_rgba(255,255,255,0.03)]">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        {/* Extruded Camera Icon */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] border border-white/70 bg-surface text-primary shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.9)] dark:border-white/[0.06] dark:bg-card dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5),-2px_-2px_5px_rgba(255,255,255,0.03)]">
          <Camera className="h-5 w-5" />
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-extrabold text-foreground">
            {isVietnamese
              ? "Phạm vi áp dụng cho Camera"
              : "Camera Application Scope"}
          </h4>
          <p className="max-w-3xl text-[11.5px] leading-relaxed text-muted-foreground">
            {isVietnamese
              ? `Tiêu chuẩn trên tự động áp dụng cho toàn bộ ${cameras.length} camera thuộc công trường này. Nếu một camera cần cấu hình riêng (ví dụ góc quay khu vực cẩu tháp), hãy vào Camera Studio của camera đó để ghi đè — có thể khôi phục về chuẩn công trường bất cứ lúc nào.`
              : `This standard automatically applies to all ${cameras.length} cameras at this site. To customize a single camera, open its Camera Studio and override there — you can reset to the site standard anytime.`}
          </p>

          {/* Inset Inheritance Pipeline */}
          <div className="inline-flex flex-wrap items-center gap-2 rounded-2xl bg-background/60 p-2 font-mono text-[10px] font-bold shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_rgba(255,255,255,0.8)] dark:bg-black/30 dark:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.65)]">
            <span className="rounded-lg bg-surface px-2.5 py-1 text-muted-foreground shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_rgba(255,255,255,0.8)] dark:bg-card dark:shadow-[2px_2px_4px_rgba(0,0,0,0.5)]">
              {isVietnamese ? "Mặc định hệ thống" : "System Default"}
            </span>
            <span className="text-muted-foreground/60">→</span>
            <span className="rounded-lg bg-primary/15 px-2.5 py-1 text-primary shadow-[2px_2px_5px_var(--shadow-dark),-1px_-1px_3px_rgba(255,255,255,0.7)] dark:shadow-[2px_2px_5px_rgba(0,0,0,0.5)]">
              {isVietnamese ? "Chuẩn Công trường" : "Site Standard"}
            </span>
            <span className="text-muted-foreground/60">→</span>
            <span className="rounded-lg bg-amber-500/15 px-2.5 py-1 text-amber-600 shadow-[2px_2px_4px_var(--shadow-dark),-1px_-1px_3px_rgba(255,255,255,0.7)] dark:text-amber-400 dark:shadow-[2px_2px_4px_rgba(0,0,0,0.5)]">
              {isVietnamese ? "Ghi đè riêng Camera (tuỳ chọn)" : "Camera Override (optional)"}
            </span>
          </div>
        </div>
      </div>

      {/* Tactile Link Button */}
      <Link
        href={`/cameras?siteId=${site.id}`}
        className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[14px] border border-white/70 bg-surface px-4 text-xs font-extrabold text-primary shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.85)] transition-all duration-150 hover:brightness-105 active:shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_rgba(255,255,255,0.85)] dark:border-white/[0.06] dark:bg-card dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45),-2px_-2px_6px_rgba(255,255,255,0.03)] dark:active:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.65)]"
      >
        <Camera className="h-3.5 w-3.5" />
        <span>
          {isVietnamese
            ? `Xem ${cameras.length} camera`
            : `View ${cameras.length} cameras`}
        </span>
      </Link>
    </div>
  </section>
</div>
  );
}
