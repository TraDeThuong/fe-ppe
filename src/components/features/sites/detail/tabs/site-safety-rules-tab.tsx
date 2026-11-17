"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertOctagon,
  Camera,
  Clock,
  Cpu,
  HardHat,
  Layers,
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
  useCameraSafetyConfig,
  useDeleteCameraSafetyConfig,
  useEffectiveSafetyConfig,
  useInvalidateSafetyRuleCache,
  useSiteSafetyConfig,
  useSystemDefaultSafetyConfig,
  useUpdateCameraSafetyConfig,
  useUpdateSiteSafetyConfig,
} from "@/hooks/sites/use-site-safety-config";
import { useCan } from "@/hooks/use-can";
import { useLocale } from "@/providers/locale-provider";
import { aiMetricsService } from "@/services/ai-metrics.service";
import type {
  AiModelDto,
  SiteItem,
  UpdateCameraSafetyConfigPayload,
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

  // ── Per-Camera Safety Rule Override & Effective Resolution ──────────────────
  const { data: camerasData } = useCameras({ siteId: site.id, limit: 100 });
  const cameras = useMemo(() => camerasData?.items ?? [], [camerasData]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");

  useEffect(() => {
    if (cameras.length > 0 && !cameras.some((c) => c.id === selectedCameraId)) {
      setSelectedCameraId(cameras[0].id);
    }
  }, [cameras, selectedCameraId]);

  const { data: cameraOverride } = useCameraSafetyConfig(
    selectedCameraId,
    Boolean(selectedCameraId),
  );
  const { data: effectiveConfig, isFetching: effectiveFetching } =
    useEffectiveSafetyConfig(
      { siteId: site.id, cameraId: selectedCameraId || undefined },
      Boolean(site.id),
    );
  const updateCameraMutation = useUpdateCameraSafetyConfig();
  const deleteCameraMutation = useDeleteCameraSafetyConfig();

  // Camera override form states (null = inherit from site)
  const [camConf, setCamConf] = useState<string>("");
  const [camConfirm, setCamConfirm] = useState<string>("");
  const [camCooldown, setCamCooldown] = useState<string>("");
  const [camHelmet, setCamHelmet] = useState<"INHERIT" | "ON" | "OFF">("INHERIT");
  const [camVest, setCamVest] = useState<"INHERIT" | "ON" | "OFF">("INHERIT");
  const [camRestricted, setCamRestricted] = useState<"INHERIT" | "ON" | "OFF">("INHERIT");

  useEffect(() => {
    if (!cameraOverride) {
      setCamConf("");
      setCamConfirm("");
      setCamCooldown("");
      setCamHelmet("INHERIT");
      setCamVest("INHERIT");
      setCamRestricted("INHERIT");
      return;
    }
    setCamConf(
      cameraOverride.confidenceThreshold != null
        ? String(cameraOverride.confidenceThreshold)
        : "",
    );
    setCamConfirm(
      cameraOverride.confirmationDuration != null
        ? String(cameraOverride.confirmationDuration)
        : "",
    );
    setCamCooldown(
      cameraOverride.cooldownDuration != null
        ? String(cameraOverride.cooldownDuration)
        : "",
    );
    setCamHelmet(
      cameraOverride.enableNoHelmet === null || cameraOverride.enableNoHelmet === undefined
        ? "INHERIT"
        : cameraOverride.enableNoHelmet
          ? "ON"
          : "OFF",
    );
    setCamVest(
      cameraOverride.enableNoVest === null || cameraOverride.enableNoVest === undefined
        ? "INHERIT"
        : cameraOverride.enableNoVest
          ? "ON"
          : "OFF",
    );
    setCamRestricted(
      cameraOverride.enableRestrictedArea === null ||
        cameraOverride.enableRestrictedArea === undefined
        ? "INHERIT"
        : cameraOverride.enableRestrictedArea
          ? "ON"
          : "OFF",
    );
  }, [cameraOverride, selectedCameraId]);

  const handleSaveCameraOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCameraId || !canManage) return;

    const payload: UpdateCameraSafetyConfigPayload = {
      confidenceThreshold: camConf !== "" ? Number(camConf) : null,
      confirmationDuration: camConfirm !== "" ? Number(camConfirm) : null,
      cooldownDuration: camCooldown !== "" ? Math.round(Number(camCooldown)) : null,
      enableNoHelmet:
        camHelmet === "INHERIT" ? null : camHelmet === "ON",
      enableNoVest: camVest === "INHERIT" ? null : camVest === "ON",
      enableRestrictedArea:
        camRestricted === "INHERIT" ? null : camRestricted === "ON",
    };

    await updateCameraMutation.mutateAsync({
      cameraId: selectedCameraId,
      payload,
    });
  };

  const handleResetCameraOverride = async () => {
    if (!selectedCameraId || !canManage) return;
    await deleteCameraMutation.mutateAsync(selectedCameraId);
  };

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
          4. PER-CAMERA OVERRIDES & EFFECTIVE RESOLUTION INSPECTOR
      ========================================================= */}
      <section className="rounded-[22px] p-4 sm:p-5 border border-border/20 bg-surface shadow-[7px_7px_15px_var(--shadow-dark),-6px_-6px_15px_rgba(255,255,255,0.82)] dark:border-transparent dark:bg-card space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/20 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-foreground">
                {isVietnamese
                  ? "Ghi đè Quy tắc Theo Camera & Kiểm tra Cấu hình Hiệu lực"
                  : "Per-Camera Rule Overrides & Effective Config Resolution"}
              </h4>
              <p className="text-[11px] text-muted-foreground">
                {isVietnamese
                  ? "Phân tầng kế thừa: Camera Override → Cấu hình Công trường → Mặc định Hệ thống."
                  : "Inheritance hierarchy: Camera Override → Site Level → System Default."}
              </p>
            </div>
          </div>

          {cameras.length > 0 && (
            <select
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              aria-label={isVietnamese ? "Chọn camera" : "Select camera"}
              className="rounded-xl border border-border/40 bg-surface-elevated px-3 py-2 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
            >
              {cameras.map((cam) => (
                <option key={cam.id} value={cam.id}>
                  {cam.code} — {cam.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {cameras.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            {isVietnamese
              ? "Công trường chưa có camera nào để cấu hình ghi đè."
              : "No cameras registered at this site yet."}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Effective Config Preview */}
            <div className="rounded-2xl border border-border/30 bg-background/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  {isVietnamese ? "Cấu hình Hiệu lực (Effective)" : "Effective Resolved Config"}
                </span>
                {effectiveConfig?.source && (
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                    {effectiveConfig.source}
                  </span>
                )}
              </div>

              {effectiveFetching && !effectiveConfig ? (
                <div className="h-24 animate-pulse rounded-xl bg-surface-elevated/40" />
              ) : effectiveConfig ? (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-surface p-2.5 border border-border/20">
                    <span className="text-[10px] text-muted-foreground">Confidence</span>
                    <p className="font-mono font-bold text-foreground">
                      {Math.round((effectiveConfig.confidenceThreshold ?? 0.8) * 100)}%
                    </p>
                  </div>
                  <div className="rounded-xl bg-surface p-2.5 border border-border/20">
                    <span className="text-[10px] text-muted-foreground">Confirm / Cooldown</span>
                    <p className="font-mono font-bold text-foreground">
                      {effectiveConfig.confirmationDuration}s / {effectiveConfig.cooldownDuration}s
                    </p>
                  </div>
                  <div className="rounded-xl bg-surface p-2.5 border border-border/20">
                    <span className="text-[10px] text-muted-foreground">Rules Active</span>
                    <p className="font-mono font-semibold text-[11px] text-primary">
                      {[
                        effectiveConfig.rules?.enableNoHelmet && "HELMET",
                        effectiveConfig.rules?.enableNoVest && "VEST",
                        effectiveConfig.rules?.enableRestrictedArea && "ZONE",
                      ]
                        .filter(Boolean)
                        .join(" · ") || "NONE"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-surface p-2.5 border border-border/20">
                    <span className="text-[10px] text-muted-foreground">
                      {isVietnamese ? "Vùng cấm / FPS" : "Danger Zones / FPS"}
                    </span>
                    <p className="font-mono font-bold text-foreground">
                      {effectiveConfig.restrictedAreas?.length ?? 0} zones ·{" "}
                      {effectiveConfig.captureFps ?? "--"} FPS
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Per-Camera Override Editor */}
            <form
              onSubmit={handleSaveCameraOverride}
              className="rounded-2xl border border-border/30 bg-background/50 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  {isVietnamese ? "Ghi đè riêng cho Camera" : "Camera Override Values"}
                </span>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => void handleResetCameraOverride()}
                    disabled={deleteCameraMutation.isPending}
                    className="text-[11px] font-semibold text-danger hover:underline disabled:opacity-50"
                  >
                    {isVietnamese ? "Xóa ghi đè (Kế thừa Site)" : "Reset to Site"}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                <div>
                  <label className="text-[10px] text-muted-foreground">
                    Confidence (0.1–0.99)
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    max="0.99"
                    step="0.05"
                    placeholder="Inherit"
                    disabled={!canManage}
                    value={camConf}
                    onChange={(e) => setCamConf(e.target.value)}
                    className="mt-1 h-8 w-full rounded-lg border border-border/40 bg-surface px-2 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">
                    Confirm (s)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    step="0.5"
                    placeholder="Inherit"
                    disabled={!canManage}
                    value={camConfirm}
                    onChange={(e) => setCamConfirm(e.target.value)}
                    className="mt-1 h-8 w-full rounded-lg border border-border/40 bg-surface px-2 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">
                    Cooldown (s)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    step="5"
                    placeholder="Inherit"
                    disabled={!canManage}
                    value={camCooldown}
                    onChange={(e) => setCamCooldown(e.target.value)}
                    className="mt-1 h-8 w-full rounded-lg border border-border/40 bg-surface px-2 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                <div>
                  <label className="text-[10px] text-muted-foreground">NO_HELMET</label>
                  <select
                    value={camHelmet}
                    disabled={!canManage}
                    onChange={(e) => setCamHelmet(e.target.value as any)}
                    className="mt-1 h-8 w-full rounded-lg border border-border/40 bg-surface px-2 text-xs"
                  >
                    <option value="INHERIT">Inherit</option>
                    <option value="ON">ON</option>
                    <option value="OFF">OFF</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">NO_VEST</label>
                  <select
                    value={camVest}
                    disabled={!canManage}
                    onChange={(e) => setCamVest(e.target.value as any)}
                    className="mt-1 h-8 w-full rounded-lg border border-border/40 bg-surface px-2 text-xs"
                  >
                    <option value="INHERIT">Inherit</option>
                    <option value="ON">ON</option>
                    <option value="OFF">OFF</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">RESTRICTED</label>
                  <select
                    value={camRestricted}
                    disabled={!canManage}
                    onChange={(e) => setCamRestricted(e.target.value as any)}
                    className="mt-1 h-8 w-full rounded-lg border border-border/40 bg-surface px-2 text-xs"
                  >
                    <option value="INHERIT">Inherit</option>
                    <option value="ON">ON</option>
                    <option value="OFF">OFF</option>
                  </select>
                </div>
              </div>

              {canManage && (
                <div className="flex justify-end pt-1">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={updateCameraMutation.isPending}
                    className="h-8 gap-1.5 rounded-xl text-xs"
                  >
                    {updateCameraMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    <span>
                      {isVietnamese ? "Lưu ghi đè Camera" : "Save Camera Override"}
                    </span>
                  </Button>
                </div>
              )}
            </form>
          </div>
        )}
      </section>
    </div>
  );
}
