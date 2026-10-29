"use client";

import { useEffect, useState } from "react";
import {
  AlertOctagon,
  Clock,
  HardHat,
  Loader2,
  Save,
  Shield,
  Shirt,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useSiteSafetyConfig,
  useUpdateSiteSafetyConfig,
} from "@/hooks/sites/use-site-safety-config";
import { useLocale } from "@/providers/locale-provider";
import type { SiteItem, UpdateSiteSafetyConfigPayload } from "@/types";

export interface SiteSafetyRulesTabProps {
  site: SiteItem;
}

export function SiteSafetyRulesTab({ site }: SiteSafetyRulesTabProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const { data: config, isLoading } = useSiteSafetyConfig(site.id);
  const updateMutation = useUpdateSiteSafetyConfig();

  // Core rule switches from backend contract
  const [enableNoHelmet, setEnableNoHelmet] = useState(true);
  const [enableNoVest, setEnableNoVest] = useState(true);
  const [enableRestrictedArea, setEnableRestrictedArea] = useState(true);

  // AI Sensitivity & Confirmation threshold
  const [confirmationDuration, setConfirmationDuration] = useState<number>(2);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.8);
  const [cooldownDuration, setCooldownDuration] = useState<number>(30);

  useEffect(() => {
    if (config) {
      setEnableNoHelmet(config.enableNoHelmet ?? true);
      setEnableNoVest(config.enableNoVest ?? true);
      setEnableRestrictedArea(config.enableRestrictedArea ?? true);
      setConfirmationDuration(config.confirmationDuration ?? 2);
      setConfidenceThreshold(Number(config.confidenceThreshold) || 0.8);
      setCooldownDuration(config.cooldownDuration ?? 30);
    } else if (site?.safetyConfigs?.[0]) {
      const cfg = site.safetyConfigs[0];
      setEnableNoHelmet(cfg.enableNoHelmet ?? true);
      setEnableNoVest(cfg.enableNoVest ?? true);
      setEnableRestrictedArea(cfg.enableRestrictedArea ?? true);
      setConfirmationDuration(cfg.confirmationDuration ?? 2);
      setConfidenceThreshold(Number(cfg.confidenceThreshold) || 0.8);
      setCooldownDuration(cfg.cooldownDuration ?? 30);
    }
  }, [config, site]);

  const handleSave = async () => {
    const payload: UpdateSiteSafetyConfigPayload = {
      enableNoHelmet,
      enableNoVest,
      enableRestrictedArea,
      confirmationDuration,
      confidenceThreshold,
      cooldownDuration,
    };

    await updateMutation.mutateAsync({
      siteId: site.id,
      payload,
    });
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
    <section
      className="
        relative overflow-hidden rounded-[22px] p-4 sm:p-5
        border border-border/20 bg-surface
        shadow-[7px_7px_16px_var(--shadow-dark),-6px_-6px_16px_rgba(255,255,255,0.82)]
        dark:border-transparent dark:bg-card
        dark:shadow-[7px_7px_16px_rgba(0,0,0,0.46),-2px_-2px_6px_rgba(255,255,255,0.025)]
      "
    >
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-transparent" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          <div
            className="
              flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px]
              border border-primary/15 bg-primary/[0.08] text-primary
              shadow-[5px_5px_10px_var(--shadow-dark),-5px_-5px_10px_rgba(255,255,255,0.85)]
              dark:border-transparent dark:bg-primary/[0.12]
              dark:shadow-[4px_4px_9px_rgba(0,0,0,0.4),-2px_-2px_5px_rgba(255,255,255,0.02)]
            "
          >
            <Shield className="h-5 w-5 stroke-[1.8]" />
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-extrabold tracking-tight text-foreground sm:text-[15px]">
                {isVietnamese
                  ? "Tiêu chuẩn Trang bị Bảo hộ Bắt buộc"
                  : "Mandatory PPE Safety Standards"}
              </h3>

              <span
                className="
                  inline-flex items-center gap-1.5 rounded-lg px-2 py-1
                  border border-primary/15 bg-primary/[0.07]
                  text-[9px] font-extrabold uppercase tracking-wider text-primary
                  dark:border-transparent dark:bg-primary/[0.10]
                "
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Per-Site
              </span>
            </div>

            <p className="mt-1.5 max-w-2xl text-[11px] leading-relaxed text-muted-foreground">
              {isVietnamese
                ? "Các quy tắc đã kích hoạt sẽ được AI giám sát và tự động phát hiện vi phạm qua camera."
                : "Enabled rules are continuously monitored by AI across connected cameras."}
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={handleSave}
          disabled={updateMutation.isPending || isLoading}
          className="
            flex h-10 items-center justify-center gap-2 self-stretch rounded-xl px-4
            text-xs font-bold
            shadow-[4px_4px_8px_var(--shadow-dark),-3px_-3px_7px_rgba(255,255,255,0.7)]
            transition-all duration-200
            hover:-translate-y-0.5
            active:translate-y-[1px]
            dark:shadow-[3px_3px_7px_rgba(0,0,0,0.4)]
            sm:self-auto
          "
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
            className={`
              group relative flex min-w-0 flex-col justify-between overflow-hidden
              rounded-[20px] p-4
              transition-[transform,box-shadow,background-color] duration-200
              hover:-translate-y-0.5
              ${
                isEnabled
                  ? `
                    border border-primary/20 bg-primary/[0.045]
                    shadow-[6px_6px_13px_var(--shadow-dark),-5px_-5px_13px_rgba(255,255,255,0.85)]
                    hover:shadow-[8px_8px_16px_var(--shadow-dark),-6px_-6px_15px_rgba(255,255,255,0.9)]
                    dark:border-transparent dark:bg-primary/[0.055]
                    dark:shadow-[6px_6px_13px_rgba(0,0,0,0.42),-2px_-2px_5px_rgba(255,255,255,0.02)]
                    dark:hover:border-transparent dark:hover:bg-primary/[0.07]
                    dark:hover:shadow-[8px_8px_16px_rgba(0,0,0,0.48),-2px_-2px_5px_rgba(255,255,255,0.02)]
                  `
                  : `
                    border border-border/15 bg-surface
                    shadow-[5px_5px_11px_var(--shadow-dark),-5px_-5px_11px_rgba(255,255,255,0.8)]
                    hover:shadow-[7px_7px_14px_var(--shadow-dark),-6px_-6px_13px_rgba(255,255,255,0.85)]
                    dark:border-transparent dark:bg-card
                    dark:shadow-[5px_5px_11px_rgba(0,0,0,0.4),-2px_-2px_5px_rgba(255,255,255,0.02)]
                    dark:hover:border-transparent dark:hover:bg-card
                    dark:hover:shadow-[7px_7px_14px_rgba(0,0,0,0.46),-2px_-2px_5px_rgba(255,255,255,0.02)]
                  `
              }
            `}
          >
            {/* Top highlight */}
            <div
              className={`
                pointer-events-none absolute inset-x-6 top-0 h-px
                bg-gradient-to-r from-transparent to-transparent
                ${isEnabled ? "via-primary/35" : "via-white/75"}
                dark:via-transparent
              `}
            />

            {/* Enabled accent */}
            {isEnabled && (
              <div className="pointer-events-none absolute right-0 top-0 h-20 w-20 rounded-bl-[70px] bg-primary/[0.035] dark:bg-primary/[0.04]" />
            )}

            <div className="relative">
              {/* Card header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`
                      flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]
                      transition-all duration-200
                      ${
                        isEnabled
                          ? `
                            border border-primary/15 bg-primary/[0.09] text-primary
                            shadow-[4px_4px_8px_var(--shadow-dark),-4px_-4px_8px_rgba(255,255,255,0.8)]
                            dark:border-transparent dark:bg-primary/[0.12]
                            dark:shadow-[3px_3px_7px_rgba(0,0,0,0.35),-1px_-1px_4px_rgba(255,255,255,0.02)]
                          `
                          : `
                            border border-border/15 bg-surface-elevated text-muted-foreground
                            shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_rgba(255,255,255,0.65)]
                            dark:border-transparent dark:bg-card
                            dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.28),inset_-1px_-1px_3px_rgba(255,255,255,0.015)]
                          `
                      }
                    `}
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

                {/* Neumorphic toggle */}
                <label
                  className="relative inline-flex shrink-0 cursor-pointer items-center"
                  title={
                    isVietnamese
                      ? "Bật hoặc tắt quy tắc"
                      : "Enable or disable rule"
                  }
                >
                  <input
                    type="checkbox"
                    checked={rule.checked}
                    onChange={(e) => rule.onChange(e.target.checked)}
                    className="peer sr-only"
                  />

                  <span
                    className="
                      relative h-[26px] w-[46px] rounded-full
                      border border-border/20 bg-surface-elevated
                      shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-2px_-2px_5px_rgba(255,255,255,0.75)]
                      transition-all duration-200
                      after:absolute after:left-[3px] after:top-[3px]
                      after:h-[18px] after:w-[18px] after:rounded-full
                      after:border after:border-border/20 after:bg-surface
                      after:shadow-[2px_2px_4px_var(--shadow-dark),-1px_-1px_3px_rgba(255,255,255,0.75)]
                      after:transition-all after:duration-200 after:content-['']
                      peer-checked:border-primary/20 peer-checked:bg-primary/20
                      peer-checked:after:translate-x-5
                      peer-checked:after:border-primary/20
                      peer-checked:after:bg-primary
                      peer-checked:after:shadow-[2px_2px_5px_rgba(0,0,0,0.15)]
                      peer-focus-visible:outline-none
                      peer-focus-visible:ring-2 peer-focus-visible:ring-primary/25
                      dark:border-transparent dark:bg-background/80
                      dark:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.42),inset_-1px_-1px_3px_rgba(255,255,255,0.015)]
                      dark:after:border-transparent dark:after:bg-card
                      dark:after:shadow-[2px_2px_4px_rgba(0,0,0,0.45)]
                      dark:peer-checked:border-transparent dark:peer-checked:bg-primary/25
                      dark:peer-checked:after:border-transparent
                      dark:peer-checked:after:bg-primary
                    "
                  />
                </label>
              </div>

              {/* Description */}
              <p className="mt-4 min-h-[34px] text-[11px] leading-[1.65] text-muted-foreground">
                {rule.desc}
              </p>
            </div>

            {/* Card footer */}
            <div
              className="
                relative mt-4 flex items-center justify-between gap-3
                border-t border-border/15 pt-3
                dark:border-transparent
              "
            >
              <span className="text-[10px] font-semibold text-muted-foreground">
                {isVietnamese ? "Mức độ xử lý" : "Severity Level"}
              </span>

              <span
                className={`
                  inline-flex items-center gap-1.5 rounded-lg px-2 py-1
                  text-[9px] font-extrabold tracking-wide
                  ${
                    isCritical
                      ? "bg-danger/10 text-danger border border-danger/20"
                      : isHigh
                        ? "bg-accent/15 text-accent border border-accent/25"
                        : "bg-primary/10 text-primary border border-primary/20"
                  }
                `}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isCritical
                      ? "bg-danger"
                      : isHigh
                        ? "bg-accent"
                        : "bg-primary"
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
        3. THRESHOLD CONTROLS
    ========================================================= */}
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Confirmation Duration */}
      <section
        className="
          relative overflow-hidden rounded-[22px] p-4 sm:p-5
          border border-border/20 bg-surface
          shadow-[7px_7px_15px_var(--shadow-dark),-6px_-6px_15px_rgba(255,255,255,0.82)]
          dark:border-transparent dark:bg-card
          dark:shadow-[7px_7px_15px_rgba(0,0,0,0.44),-2px_-2px_6px_rgba(255,255,255,0.02)]
        "
      >
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/85 to-transparent dark:via-transparent" />

        <div className="flex items-start gap-3">
          <div
            className="
              flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px]
              border border-primary/15 bg-primary/[0.08] text-primary
              shadow-[4px_4px_8px_var(--shadow-dark),-4px_-4px_8px_rgba(255,255,255,0.8)]
              dark:border-transparent dark:bg-primary/[0.10]
              dark:shadow-[3px_3px_7px_rgba(0,0,0,0.35),-1px_-1px_4px_rgba(255,255,255,0.02)]
            "
          >
            <Clock className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-extrabold text-foreground">
              {isVietnamese
                ? "Ngưỡng thời gian xác nhận vi phạm"
                : "Violation Confirmation Time"}
            </h4>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              {isVietnamese
                ? "Thời gian vi phạm liên tục tối thiểu trước khi AI kích hoạt cảnh báo chính thức."
                : "Minimum sustained violation duration before an official alert is triggered."}
            </p>
          </div>
        </div>

        {/* Inset slider area */}
        <div
          className="
            mt-5 rounded-[16px] p-3.5 sm:p-4
            border border-border/10 bg-background/45
            shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_rgba(255,255,255,0.75)]
            dark:border-transparent dark:bg-background/40
            dark:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.35),inset_-1px_-1px_4px_rgba(255,255,255,0.015)]
          "
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-semibold text-muted-foreground">
              {isVietnamese ? "Thời lượng" : "Duration"}
            </span>
            <span
              className="
                rounded-lg border border-primary/15 bg-primary/[0.08] px-2.5 py-1
                font-mono text-xs font-black tabular-nums text-primary
                shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_rgba(255,255,255,0.7)]
                dark:border-transparent dark:bg-primary/[0.10]
                dark:shadow-[2px_2px_4px_rgba(0,0,0,0.3)]
              "
            >
              {confirmationDuration} {isVietnamese ? "giây" : "sec"}
            </span>
          </div>

          <input
            type="range"
            min="1"
            max="5"
            step="1"
            value={confirmationDuration}
            onChange={(e) =>
              setConfirmationDuration(parseInt(e.target.value, 10))
            }
            aria-label={
              isVietnamese
                ? "Thời gian xác nhận vi phạm"
                : "Violation confirmation duration"
            }
            className="
              mt-4 h-2 w-full cursor-pointer appearance-none rounded-full
              bg-surface-elevated accent-primary
              shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-1px_-1px_3px_rgba(255,255,255,0.5)]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25
            "
          />

          <div className="mt-2 flex justify-between font-mono text-[9px] text-muted-foreground/75">
            <span>1s</span>
            <span>2s</span>
            <span>3s</span>
            <span>4s</span>
            <span>5s</span>
          </div>
        </div>
      </section>

      {/* AI Confidence Threshold */}
      <section
        className="
          relative overflow-hidden rounded-[22px] p-4 sm:p-5
          border border-border/20 bg-surface
          shadow-[7px_7px_15px_var(--shadow-dark),-6px_-6px_15px_rgba(255,255,255,0.82)]
          dark:border-transparent dark:bg-card
          dark:shadow-[7px_7px_15px_rgba(0,0,0,0.44),-2px_-2px_6px_rgba(255,255,255,0.02)]
        "
      >
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/85 to-transparent dark:via-transparent" />

        <div className="flex items-start gap-3">
          <div
            className="
              flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px]
              border border-accent/20 bg-accent/[0.10] text-accent
              shadow-[4px_4px_8px_var(--shadow-dark),-4px_-4px_8px_rgba(255,255,255,0.8)]
              dark:border-transparent dark:bg-accent/[0.12]
              dark:shadow-[3px_3px_7px_rgba(0,0,0,0.35),-1px_-1px_4px_rgba(255,255,255,0.02)]
            "
          >
            <Sparkles className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-extrabold text-foreground">
              {isVietnamese
                ? "Độ tin cậy AI tối thiểu"
                : "Minimum AI Confidence"}
            </h4>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              {isVietnamese
                ? "Ngưỡng tin cậy tối thiểu để thuật toán ghi nhận một vi phạm."
                : "Minimum detection confidence required to register a violation."}
            </p>
          </div>
        </div>

        {/* Inset slider area */}
        <div
          className="
            mt-5 rounded-[16px] p-3.5 sm:p-4
            border border-border/10 bg-background/45
            shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_rgba(255,255,255,0.75)]
            dark:border-transparent dark:bg-background/40
            dark:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.35),inset_-1px_-1px_4px_rgba(255,255,255,0.015)]
          "
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-semibold text-muted-foreground">
              {isVietnamese ? "Ngưỡng tin cậy" : "Confidence"}
            </span>
            <span
              className="
                rounded-lg border border-accent/20 bg-accent/[0.10] px-2.5 py-1
                font-mono text-xs font-black tabular-nums text-accent
                shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_rgba(255,255,255,0.7)]
                dark:border-transparent dark:bg-accent/[0.12]
                dark:shadow-[2px_2px_4px_rgba(0,0,0,0.3)]
              "
            >
              {(confidenceThreshold * 100).toFixed(0)}%
            </span>
          </div>

          <input
            type="range"
            min="0.5"
            max="0.95"
            step="0.05"
            value={confidenceThreshold}
            onChange={(e) =>
              setConfidenceThreshold(parseFloat(e.target.value))
            }
            aria-label={
              isVietnamese
                ? "Ngưỡng tin cậy AI"
                : "AI confidence threshold"
            }
            className="
              mt-4 h-2 w-full cursor-pointer appearance-none rounded-full
              bg-surface-elevated accent-accent
              shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-1px_-1px_3px_rgba(255,255,255,0.5)]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25
            "
          />

          <div className="mt-2 flex justify-between font-mono text-[9px] text-muted-foreground/75">
            <span>50%</span>
            <span>60%</span>
            <span>70%</span>
            <span>80%</span>
            <span>90%</span>
            <span>95%</span>
          </div>
        </div>
      </section>
    </div>
  </div>
);
}