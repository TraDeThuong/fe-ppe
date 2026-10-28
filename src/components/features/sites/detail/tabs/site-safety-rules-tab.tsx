"use client";

import { useEffect, useState } from "react";
import {
  AlertOctagon,
  Clock,
  Eye,
  Hand,
  HardHat,
  Loader2,
  Save,
  Shield,
  ShieldAlert,
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
  const { t } = useLocale();

  const { data: config, isLoading } = useSiteSafetyConfig(site.id);
  const updateMutation = useUpdateSiteSafetyConfig();

  // Core rule switches from backend contract
  const [enableNoHelmet, setEnableNoHelmet] = useState(true);
  const [enableNoVest, setEnableNoVest] = useState(true);
  const [enableRestrictedArea, setEnableRestrictedArea] = useState(true);
  const [requireSafetyBoots, setRequireSafetyBoots] = useState(true);
  const [requireGloves, setRequireGloves] = useState(false);
  const [requireSafetyHarness, setRequireSafetyHarness] = useState(true);

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
      name: "Mũ bảo hộ lao động (Hard Hat)",
      code: "NO_HELMET",
      desc: "Bắt buộc công nhân và khách tham quan đội mũ bảo hộ khi bước vào công trường.",
      icon: <HardHat className="h-5 w-5 text-amber-500" />,
      checked: enableNoHelmet,
      onChange: setEnableNoHelmet,
      riskLevel: "CRITICAL",
    },
    {
      id: "noVest",
      name: "Áo phản quang an toàn (Safety Vest)",
      code: "NO_VEST",
      desc: "Bắt buộc mặc áo dạ quang nhận diện trong điều kiện ánh sáng yếu và khu vực xe cơ giới.",
      icon: <Shirt className="h-5 w-5 text-emerald-500" />,
      checked: enableNoVest,
      onChange: setEnableNoVest,
      riskLevel: "HIGH",
    },
    {
      id: "restrictedArea",
      name: "Kiểm soát Vùng cấm nguy hiểm (Danger Zone)",
      code: "RESTRICTED_AREA",
      desc: "Báo động khẩn cấp khi phát hiện người đi vào khu vực cẩu tháp, trạm biến áp, hố ga mở.",
      icon: <AlertOctagon className="h-5 w-5 text-rose-500" />,
      checked: enableRestrictedArea,
      onChange: setEnableRestrictedArea,
      riskLevel: "CRITICAL",
    },
    {
      id: "safetyBoots",
      name: "Giày bảo hộ mũi thép (Safety Boots)",
      code: "SAFETY_BOOTS",
      desc: "Chống đinh, chống dập ngón chân và trơn trượt tại bề mặt thi công thô.",
      icon: <Shield className="h-5 w-5 text-sky-500" />,
      checked: requireSafetyBoots,
      onChange: setRequireSafetyBoots,
      riskLevel: "MEDIUM",
    },
    {
      id: "gloves",
      name: "Găng tay cơ khí (Work Gloves)",
      code: "GLOVES",
      desc: "Bắt buộc khi tiếp xúc vật liệu sắc nhọn, hóa chất hoặc gia công cốt thép.",
      icon: <Hand className="h-5 w-5 text-amber-600" />,
      checked: requireGloves,
      onChange: setRequireGloves,
      riskLevel: "MEDIUM",
    },
    {
      id: "safetyHarness",
      name: "Dây đai an toàn trên cao (Safety Harness)",
      code: "SAFETY_HARNESS",
      desc: "Bắt buộc khi thao tác giàn giáo, sàn treo hoặc độ cao trên 2.0 mét.",
      icon: <ShieldAlert className="h-5 w-5 text-rose-500" />,
      checked: requireSafetyHarness,
      onChange: setRequireSafetyHarness,
      riskLevel: "CRITICAL",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="rounded-2xl border border-border/40 bg-surface p-4 sm:p-5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:border-black/60 dark:bg-card/90 dark:shadow-[5px_5px_14px_rgba(0,0,0,0.55)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Shield className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Tiêu chuẩn Trang bị Bảo hộ Bắt buộc (Per-Site PPE Standard)
              </h3>
              <p className="text-xs text-muted-foreground">
                Các quy tắc đã kích hoạt sẽ được mô hình AI giám sát và phát hiện vi phạm tự động qua camera.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            disabled={updateMutation.isPending || isLoading}
            className="flex items-center gap-2 self-end sm:self-auto"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{updateMutation.isPending ? "Đang lưu..." : "Lưu tiêu chuẩn"}</span>
          </Button>
        </div>
      </div>

      {/* PPE Items Switch Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ppeRules.map((rule) => {
          return (
            <div
              key={rule.id}
              className={`relative flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200 ${
                rule.checked
                  ? "border-primary/40 bg-primary/5 shadow-sm dark:bg-primary/10"
                  : "border-border/40 bg-surface text-muted-foreground dark:border-black/60 dark:bg-card/80"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-elevated shadow-sm">
                      {rule.icon}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-foreground leading-tight">
                        {rule.name}
                      </h4>
                      <span className="font-mono text-[10px] text-primary font-bold">
                        {rule.code}
                      </span>
                    </div>
                  </div>

                  {/* Switch */}
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={rule.checked}
                      onChange={(e) => rule.onChange(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-surface-elevated peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-nm-inset"></div>
                  </label>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {rule.desc}
                </p>
              </div>

              <div className="mt-4 pt-2 border-t border-border/20 flex items-center justify-between text-[10px]">
                <span className="font-semibold text-muted-foreground">Mức độ xử lý:</span>
                <span
                  className={`font-bold ${
                    rule.riskLevel === "CRITICAL"
                      ? "text-rose-500"
                      : rule.riskLevel === "HIGH"
                        ? "text-amber-500"
                        : "text-sky-500"
                  }`}
                >
                  {rule.riskLevel}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Temporal Confirmation Threshold Slider Card */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border/40 bg-surface p-4 sm:p-5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:border-black/60 dark:bg-card/90 dark:shadow-[5px_5px_14px_rgba(0,0,0,0.55)]">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-bold text-foreground">
              Ngưỡng thời gian xác nhận vi phạm
            </h4>
          </div>
          <p className="text-[11px] text-muted-foreground mb-4">
            Thời gian vi phạm liên tục tối thiểu trước khi AI kích hoạt cảnh báo chính thức.
          </p>

          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={confirmationDuration}
              onChange={(e) => setConfirmationDuration(parseInt(e.target.value, 10))}
              className="w-full accent-primary h-2 bg-surface-elevated rounded-lg appearance-none cursor-pointer"
            />
            <span className="font-mono text-xs font-bold text-primary min-w-[50px] text-right">
              {confirmationDuration} giây
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-border/40 bg-surface p-4 sm:p-5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:border-black/60 dark:bg-card/90 dark:shadow-[5px_5px_14px_rgba(0,0,0,0.55)]">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <h4 className="text-xs font-bold text-foreground">
              Độ tin cậy AI tối thiểu (Confidence Threshold)
            </h4>
          </div>
          <p className="text-[11px] text-muted-foreground mb-4">
            Mức độ tin cậy của thuật toán phát hiện đối tượng trước khi ghi nhận vi phạm.
          </p>

          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0.5"
              max="0.95"
              step="0.05"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
              className="w-full accent-accent h-2 bg-surface-elevated rounded-lg appearance-none cursor-pointer"
            />
            <span className="font-mono text-xs font-bold text-accent min-w-[50px] text-right">
              {(confidenceThreshold * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
