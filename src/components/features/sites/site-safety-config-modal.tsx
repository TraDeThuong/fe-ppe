"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertOctagon,
  Cpu,
  HardHat,
  Loader2,
  Save,
  Shield,
  Shirt,
  Timer,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useSiteSafetyConfig, useUpdateSiteSafetyConfig } from "@/hooks/sites";
import { useCan } from "@/hooks/use-can";
import { useLocale } from "@/providers/locale-provider";
import { aiMetricsService } from "@/services/ai-metrics.service";
import type { AiModelDto, SiteItem, UpdateSiteSafetyConfigPayload } from "@/types";

export interface SiteSafetyConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site: SiteItem | null;
}

export function SiteSafetyConfigModal({
  open,
  onOpenChange,
  site,
}: SiteSafetyConfigModalProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const can = useCan();
  const canManage = can("PPE_SAFETY_CONFIG_MANAGE");
  const canReadSafety = can("PPE_SAFETY_CONFIG_READ") || canManage;
  const canReadModels = can("PPE_MODEL_READ");
  const isSiteActive = site?.status === "ACTIVE";

  const { data: config, isLoading: configLoading } = useSiteSafetyConfig(
    site?.id || "",
    open && Boolean(site?.id) && canReadSafety,
  );
  const { data: aiModels = [] } = useQuery<AiModelDto[]>({
    queryKey: ["ai-models", "list"],
    queryFn: () => aiMetricsService.getAiModels(),
    enabled: open && canReadModels,
    staleTime: 60_000,
  });

  const updateConfig = useUpdateSiteSafetyConfig();

  const [enableNoHelmet, setEnableNoHelmet] = useState(true);
  const [enableNoVest, setEnableNoVest] = useState(true);
  const [enableRestrictedArea, setEnableRestrictedArea] = useState(true);
  const [confirmationDuration, setConfirmationDuration] = useState(2);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.8);
  const [cooldownDuration, setCooldownDuration] = useState(30);
  const [modelVersionId, setModelVersionId] = useState<string>("");

  useEffect(() => {
    const src = config || site?.safetyConfigs?.[0];
    if (src) {
      setEnableNoHelmet(src.enableNoHelmet ?? true);
      setEnableNoVest(src.enableNoVest ?? true);
      setEnableRestrictedArea(src.enableRestrictedArea ?? true);
      setConfirmationDuration(src.confirmationDuration ?? 2);
      setConfidenceThreshold(Number(src.confidenceThreshold) || 0.8);
      setCooldownDuration(src.cooldownDuration ?? 30);
      setModelVersionId(src.modelVersionId ?? "");
    }
  }, [config, site]);

  const modelVersions = aiModels.flatMap((model) =>
    (model.versions || []).map((ver) => ({
      id: ver.id,
      label: `${model.name} v${ver.version} (${ver.status})`,
    })),
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!site || !canManage || !isSiteActive) return;

    const payload: UpdateSiteSafetyConfigPayload = {
      enableNoHelmet,
      enableNoVest,
      enableRestrictedArea,
      confirmationDuration,
      confidenceThreshold,
      cooldownDuration,
      modelVersionId: modelVersionId ? modelVersionId : null,
    };

    await updateConfig.mutateAsync({
      siteId: site.id,
      payload,
    });

    onOpenChange(false);
  };

  const disabled = !canManage || !isSiteActive || configLoading || updateConfig.isPending;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("sites.safetyConfig.title")}
      description={t("sites.safetyConfig.desc")}
      icon={<Shield className="h-5 w-5 text-primary" />}
      size="md"
    >
      <form onSubmit={handleSave} className="space-y-5">
        {/* Site Header Banner */}
        <div className="flex items-center justify-between rounded-xl border border-border/40 bg-surface/60 p-3">
          <span className="font-mono text-xs font-bold text-primary">
            {site?.code}
          </span>
          <span className="text-xs font-semibold text-foreground">
            {site?.name}
          </span>
        </div>

        {!isSiteActive && site && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            {isVietnamese
              ? `Công trường đang ở trạng thái ${site.status}. Chỉ công trường ACTIVE mới được chỉnh sửa quy tắc.`
              : `Site status is ${site.status}. Only ACTIVE sites can update safety rules.`}
          </div>
        )}

        {/* Mandatory PPE Toggles */}
        <div className="space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("sites.safetyConfig.mandatoryPpe")}
          </label>

          <div className="space-y-2">
            {/* Hard Hat */}
            <div className="flex items-center justify-between rounded-xl border border-border/30 bg-surface/40 p-3 shadow-nm-inset">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <HardHat className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-bold text-foreground">{t("sites.safetyConfig.hardHatTitle")}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("sites.safetyConfig.hardHatDesc")}
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={enableNoHelmet}
                disabled={disabled}
                onChange={(e) => setEnableNoHelmet(e.target.checked)}
                className="h-4 w-4 rounded border-border/40 text-primary focus:ring-primary"
              />
            </div>

            {/* Safety Vest */}
            <div className="flex items-center justify-between rounded-xl border border-border/30 bg-surface/40 p-3 shadow-nm-inset">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 text-accent">
                  <Shirt className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-bold text-foreground">{t("sites.safetyConfig.vestTitle")}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("sites.safetyConfig.vestDesc")}
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={enableNoVest}
                disabled={disabled}
                onChange={(e) => setEnableNoVest(e.target.checked)}
                className="h-4 w-4 rounded border-border/40 text-primary focus:ring-primary"
              />
            </div>

            {/* Restricted Area Alert */}
            <div className="flex items-center justify-between rounded-xl border border-border/30 bg-surface/40 p-3 shadow-nm-inset">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <AlertOctagon className="h-4 w-4 text-accent" />
                </span>
                <div>
                  <p className="text-xs font-bold text-foreground">{t("sites.safetyConfig.restrictedTitle")}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("sites.safetyConfig.restrictedDesc")}
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={enableRestrictedArea}
                disabled={disabled}
                onChange={(e) => setEnableRestrictedArea(e.target.checked)}
                className="h-4 w-4 rounded border-border/40 text-primary focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Temporal Confirmation, AI Confidence & Cooldown */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-2xl border border-border/40 bg-surface/40 p-4">
          {/* Confirmation Duration */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground">
                {t("sites.safetyConfig.confirmViolation")}
              </label>
              <span className="font-mono text-xs font-bold text-primary">
                {confirmationDuration}s
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={60}
              step={0.5}
              value={confirmationDuration}
              disabled={disabled}
              onChange={(e) => setConfirmationDuration(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <p className="text-[10px] text-muted-foreground">
              {t("sites.safetyConfig.confirmViolationHelp")}
            </p>
          </div>

          {/* AI Confidence Threshold */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground">
                {t("sites.safetyConfig.aiConfidence")}
              </label>
              <span className="font-mono text-xs font-bold text-primary">
                {Math.round(confidenceThreshold * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.1}
              max={0.99}
              step={0.05}
              value={confidenceThreshold}
              disabled={disabled}
              onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <p className="text-[10px] text-muted-foreground">
              {t("sites.safetyConfig.aiConfidenceHelp")}
            </p>
          </div>

          {/* Cooldown Duration */}
          <div className="space-y-1.5 sm:col-span-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Timer className="h-3.5 w-3.5 text-primary" />
                <span>{isVietnamese ? "Thời gian Cooldown chống lặp cảnh báo" : "Alert Cooldown Duration"}</span>
              </label>
              <span className="font-mono text-xs font-bold text-primary">
                {cooldownDuration}s
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={300}
              step={5}
              value={cooldownDuration}
              disabled={disabled}
              onChange={(e) => setCooldownDuration(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          {/* Model Version Selector */}
          {modelVersions.length > 0 && (
            <div className="space-y-1.5 sm:col-span-2">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Cpu className="h-3.5 w-3.5 text-primary" />
                <span>{isVietnamese ? "Phiên bản mô hình AI áp dụng" : "AI Model Version"}</span>
              </label>
              <select
                value={modelVersionId}
                disabled={disabled}
                onChange={(e) => setModelVersionId(e.target.value)}
                className="w-full rounded-xl border border-border/40 bg-surface px-3 py-2 text-xs text-foreground shadow-nm-inset focus:border-primary focus:outline-none"
              >
                <option value="">
                  {isVietnamese ? "Mặc định theo hệ thống (Active Global)" : "System Default (Active Global)"}
                </option>
                {modelVersions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={updateConfig.isPending}
          >
            {t("common.cancel")}
          </Button>

          {canManage && (
            <Button
              type="submit"
              variant="primary"
              disabled={disabled}
              className="flex items-center gap-2"
            >
              {updateConfig.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{t("sites.safetyConfig.save")}</span>
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
