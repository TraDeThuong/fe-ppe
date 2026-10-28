"use client";

import { useEffect, useState } from "react";
import { AlertOctagon, HardHat, Loader2, Save, Shield, Shirt } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useSiteSafetyConfig, useUpdateSiteSafetyConfig } from "@/hooks/sites";
import { useLocale } from "@/providers/locale-provider";
import type { SiteItem, UpdateSiteSafetyConfigPayload } from "@/types";

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
  const { t } = useLocale();

  const { data: config, isLoading: configLoading } = useSiteSafetyConfig(
    site?.id || "",
    open && Boolean(site?.id),
  );
  const updateConfig = useUpdateSiteSafetyConfig();

  const [enableNoHelmet, setEnableNoHelmet] = useState(true);
  const [enableNoVest, setEnableNoVest] = useState(true);
  const [enableRestrictedArea, setEnableRestrictedArea] = useState(true);
  const [confirmationDuration, setConfirmationDuration] = useState(2);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.8);

  useEffect(() => {
    if (config) {
      setEnableNoHelmet(config.enableNoHelmet ?? true);
      setEnableNoVest(config.enableNoVest ?? true);
      setEnableRestrictedArea(config.enableRestrictedArea ?? true);
      setConfirmationDuration(config.confirmationDuration ?? 2);
      setConfidenceThreshold(Number(config.confidenceThreshold) || 0.8);
    } else if (site?.safetyConfigs?.[0]) {
      const cfg = site.safetyConfigs[0];
      setEnableNoHelmet(cfg.enableNoHelmet ?? true);
      setEnableNoVest(cfg.enableNoVest ?? true);
      setEnableRestrictedArea(cfg.enableRestrictedArea ?? true);
      setConfirmationDuration(cfg.confirmationDuration ?? 2);
      setConfidenceThreshold(Number(cfg.confidenceThreshold) || 0.8);
    }
  }, [config, site]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!site) return;

    const payload: UpdateSiteSafetyConfigPayload = {
      enableNoHelmet,
      enableNoVest,
      enableRestrictedArea,
      confirmationDuration,
      confidenceThreshold,
    };

    await updateConfig.mutateAsync({
      siteId: site.id,
      payload,
    });

    onOpenChange(false);
  };

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
                onChange={(e) => setEnableRestrictedArea(e.target.checked)}
                className="h-4 w-4 rounded border-border/40 text-primary focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Temporal Confirmation & AI Confidence */}
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
              min={1}
              max={5}
              step={0.5}
              value={confirmationDuration}
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
              min={0.5}
              max={0.95}
              step={0.05}
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <p className="text-[10px] text-muted-foreground">
              {t("sites.safetyConfig.aiConfidenceHelp")}
            </p>
          </div>
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

          <Button
            type="submit"
            variant="primary"
            disabled={updateConfig.isPending}
            className="flex items-center gap-2"
          >
            {updateConfig.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{t("sites.safetyConfig.save")}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
