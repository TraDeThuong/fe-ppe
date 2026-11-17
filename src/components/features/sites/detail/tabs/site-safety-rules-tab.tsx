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
    <div className="space-y-5">
      {/* =========================================================
          1. PPE STANDARDS OVERVIEW
      ========================================================= */}
      <section className="relative overflow-hidden rounded-[22px] p-4 sm:p-5 border border-border/20 bg-surface shadow-[7px_7px_16px_var(--shadow-dark),-6px_-6px_16px_rgba(255,255,255,0.82)] dark:border-transparent dark:bg-card dark:shadow-[7px_7px_16px_rgba(0,0,0,0.46),-2px_-2px_6px_rgba(255,255,255,0.025)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] border border-primary/15 bg-primary/[0.08] text-primary">
              <Shield className="h-5 w-5 stroke-[1.8]" />
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-extrabold tracking-tight text-foreground sm:text-[15px]">
                  {isVietnamese
                    ? "Tiêu chuẩn Trang bị Bảo hộ Bắt buộc"
                    : "Mandatory PPE Safety Standards"}
                </h3>

                <span className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 border border-primary/15 bg-primary/[0.07] text-[9px] font-extrabold uppercase tracking-wider text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Per-Site
                </span>

                {isDirty && (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                    {isVietnamese ? "Có thay đổi chưa lưu" : "Unsaved changes"}
                  </span>
                )}
              </div>

              <p className="mt-1.5 max-w-2xl text-[11px] leading-relaxed text-muted-foreground">
                {isVietnamese
                  ? "Các quy tắc đã kích hoạt sẽ được AI giám sát và tự động phát hiện vi phạm qua camera."
                  : "Enabled rules are continuously monitored by AI across connected cameras."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canManage && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => invalidateCacheMutation.mutate({ siteId: site.id })}
                disabled={invalidateCacheMutation.isPending}
                className="h-9 gap-1.5 rounded-xl text-xs"
                title={
                  isVietnamese
                    ? "Xóa cache cấu hình an toàn để AI nạp ngay lập tức"
                    : "Invalidate AI rule cache"
                }
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${invalidateCacheMutation.isPending ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">
                  {isVietnamese ? "Đồng bộ Cache AI" : "Sync AI Cache"}
                </span>
              </Button>
            )}

            {isSiteEditable && systemDefault && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleApplySystemDefault}
                className="h-9 gap-1.5 rounded-xl text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{isVietnamese ? "Mặc định hệ thống" : "System Default"}</span>
              </Button>
            )}

            {canManage && (
              <Button
                type="button"
                variant="primary"
                onClick={() => void handleSaveSiteConfig()}
                disabled={!isSiteEditable || updateMutation.isPending || isLoading}
                className="flex h-9 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold"
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
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================
          2. PPE RULE CARDS
      ========================================================= */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
        {ppeRules.map((rule) => {
          const isEnabled = rule.checked;
          const isCritical = rule.riskLevel === "CRITICAL";
          const isHigh = rule.riskLevel === "HIGH";

          return (
            <div
              key={rule.id}
              className={`group relative flex min-w-0 flex-col justify-between overflow-hidden rounded-[20px] p-4 transition-all duration-200 ${
                isEnabled
                  ? "border border-primary/20 bg-primary/[0.045] shadow-[6px_6px_13px_var(--shadow-dark),-5px_-5px_13px_rgba(255,255,255,0.85)] dark:border-transparent dark:bg-primary/[0.055]"
                  : "border border-border/15 bg-surface shadow-[5px_5px_11px_var(--shadow-dark),-5px_-5px_11px_rgba(255,255,255,0.8)] dark:border-transparent dark:bg-card"
              }`}
            >
              <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${
                        isEnabled
                          ? "border border-primary/15 bg-primary/[0.09] text-primary"
                          : "border border-border/15 bg-surface-elevated text-muted-foreground"
                      }`}
                    >
                      {rule.icon}
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-extrabold leading-snug text-foreground">
                        {rule.name}
                      </h4>
                      <p className="mt-1 font-mono text-[10px] font-bold tracking-wide text-primary/80">
                        {rule.code}
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={rule.checked}
                      disabled={!isSiteEditable}
                      onChange={(e) => rule.onChange(e.target.checked)}
                      className="peer sr-only"
                    />
                    <span className="relative h-[26px] w-[46px] rounded-full border border-border/20 bg-surface-elevated shadow-[inset_3px_3px_6px_var(--shadow-dark)] transition-all duration-200 after:absolute after:left-[3px] after:top-[3px] after:h-[18px] after:w-[18px] after:rounded-full after:bg-surface after:shadow-sm after:transition-all after:content-[''] peer-checked:bg-primary/20 peer-checked:after:translate-x-5 peer-checked:after:bg-primary peer-disabled:opacity-50" />
                  </label>
                </div>

                <p className="mt-4 min-h-[34px] text-[11px] leading-[1.65] text-muted-foreground">
                  {rule.desc}
                </p>
              </div>

              <div className="relative mt-4 flex items-center justify-between gap-3 border-t border-border/15 pt-3">
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {isVietnamese ? "Mức độ xử lý" : "Severity Level"}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[9px] font-extrabold tracking-wide ${
                    isCritical
                      ? "bg-danger/10 text-danger border border-danger/20"
                      : isHigh
                        ? "bg-accent/15 text-accent border border-accent/25"
                        : "bg-primary/10 text-primary border border-primary/20"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isCritical ? "bg-danger" : isHigh ? "bg-accent" : "bg-primary"
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
          3. THRESHOLD & MODEL CONTROLS
      ========================================================= */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Confirmation Duration (0.5 - 60s) */}
        <section className="rounded-[22px] p-4 sm:p-5 border border-border/20 bg-surface shadow-[7px_7px_15px_var(--shadow-dark),-6px_-6px_15px_rgba(255,255,255,0.82)] dark:border-transparent dark:bg-card">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border border-primary/15 bg-primary/[0.08] text-primary">
              <Clock className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-extrabold text-foreground">
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

          <div className="mt-4 rounded-[16px] p-3.5 border border-border/10 bg-background/45 shadow-nm-inset">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-semibold text-muted-foreground">
                {isVietnamese ? "Thời lượng" : "Duration"}
              </span>
              <span className="rounded-lg border border-primary/15 bg-primary/[0.08] px-2.5 py-1 font-mono text-xs font-black tabular-nums text-primary">
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
              className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-elevated accent-primary"
            />
            <div className="mt-2 flex justify-between font-mono text-[9px] text-muted-foreground/75">
              <span>0.5s</span>
              <span>15s</span>
              <span>30s</span>
              <span>45s</span>
              <span>60s</span>
            </div>
          </div>
        </section>

        {/* AI Confidence Threshold (10% - 99%) */}
        <section className="rounded-[22px] p-4 sm:p-5 border border-border/20 bg-surface shadow-[7px_7px_15px_var(--shadow-dark),-6px_-6px_15px_rgba(255,255,255,0.82)] dark:border-transparent dark:bg-card">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border border-accent/20 bg-accent/[0.10] text-accent">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-extrabold text-foreground">
                {isVietnamese ? "Độ tin cậy AI tối thiểu" : "Minimum AI Confidence"}
              </h4>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {isVietnamese
                  ? "Ngưỡng tin cậy tối thiểu (10% – 99%) để thuật toán ghi nhận vi phạm."
                  : "Minimum detection confidence (10% – 99%) required to register a violation."}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-[16px] p-3.5 border border-border/10 bg-background/45 shadow-nm-inset">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-semibold text-muted-foreground">
                {isVietnamese ? "Ngưỡng tin cậy" : "Confidence"}
              </span>
              <span className="rounded-lg border border-accent/20 bg-accent/[0.10] px-2.5 py-1 font-mono text-xs font-black tabular-nums text-accent">
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
              className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-elevated accent-accent"
            />
            <div className="mt-2 flex justify-between font-mono text-[9px] text-muted-foreground/75">
              <span>10%</span>
              <span>35%</span>
              <span>60%</span>
              <span>80%</span>
              <span>99%</span>
            </div>
          </div>
        </section>

        {/* Cooldown Duration (5 - 300s) */}
        <section className="rounded-[22px] p-4 sm:p-5 border border-border/20 bg-surface shadow-[7px_7px_15px_var(--shadow-dark),-6px_-6px_15px_rgba(255,255,255,0.82)] dark:border-transparent dark:bg-card">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border border-primary/15 bg-primary/[0.08] text-primary">
              <Timer className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-extrabold text-foreground">
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

          <div className="mt-4 rounded-[16px] p-3.5 border border-border/10 bg-background/45 shadow-nm-inset">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-semibold text-muted-foreground">
                Cooldown
              </span>
              <span className="rounded-lg border border-primary/15 bg-primary/[0.08] px-2.5 py-1 font-mono text-xs font-black tabular-nums text-primary">
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
              className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-elevated accent-primary"
            />
            <div className="mt-2 flex justify-between font-mono text-[9px] text-muted-foreground/75">
              <span>5s</span>
              <span>60s</span>
              <span>120s</span>
              <span>240s</span>
              <span>300s</span>
            </div>
          </div>
        </section>

        {/* AI Model Version Selector */}
        <section className="rounded-[22px] p-4 sm:p-5 border border-border/20 bg-surface shadow-[7px_7px_15px_var(--shadow-dark),-6px_-6px_15px_rgba(255,255,255,0.82)] dark:border-transparent dark:bg-card">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border border-primary/15 bg-primary/[0.08] text-primary">
              <Cpu className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-extrabold text-foreground">
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

          <div className="mt-4 rounded-[16px] p-3.5 border border-border/10 bg-background/45 shadow-nm-inset">
            <select
              value={modelVersionId}
              disabled={!isSiteEditable}
              onChange={(e) => setModelVersionId(e.target.value)}
              aria-label={isVietnamese ? "Phiên bản mô hình AI" : "AI Model Version"}
              className="w-full rounded-xl border border-border/40 bg-surface px-3 py-2 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
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
          </div>
        </section>
      </div>

      {/* =========================================================
      {/* =========================================================
          4. INHERITANCE SUMMARY: Site standard -> all cameras
      ========================================================= */}
      <section className="rounded-[22px] p-4 sm:p-5 border border-border/20 bg-surface shadow-[7px_7px_15px_var(--shadow-dark),-6px_-6px_15px_rgba(255,255,255,0.82)] dark:border-transparent dark:bg-card space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Camera className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-extrabold text-foreground">
                {isVietnamese
                  ? "Phạm vi áp dụng cho Camera"
                  : "Camera Application Scope"}
              </h4>
              <p className="text-[11px] text-muted-foreground">
                {isVietnamese
                  ? `Tiêu chuẩn trên tự động áp dụng cho toàn bộ ${cameras.length} camera thuộc công trường này. Nếu một camera cần cấu hình riêng (ví dụ góc quay khu vực cẩu tháp), hãy vào Camera Studio của camera đó để ghi đè — có thể khôi phục về chuẩn công trường bất cứ lúc nào.`
                  : `This standard automatically applies to all ${cameras.length} cameras at this site. To customize a single camera, open its Camera Studio and override there — you can reset to the site standard anytime.`}
              </p>
              <p className="flex flex-wrap items-center gap-1.5 pt-1 font-mono text-[10px] font-bold text-muted-foreground">
                <span className="rounded-md bg-foreground/[0.05] px-1.5 py-0.5">
                  {isVietnamese ? "Mặc định hệ thống" : "System Default"}
                </span>
                <span>→</span>
                <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-primary">
                  {isVietnamese ? "Chuẩn Công trường" : "Site Standard"}
                </span>
                <span>→</span>
                <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-amber-600 dark:text-amber-400">
                  {isVietnamese ? "Ghi đè riêng Camera (tuỳ chọn)" : "Camera Override (optional)"}
                </span>
              </p>
            </div>
          </div>
          <Link
            href={`/cameras?siteId=${site.id}`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border/40 bg-surface-elevated px-3 py-2 text-xs font-bold text-primary hover:bg-primary/10"
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
