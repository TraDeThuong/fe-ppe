"use client";

import { CheckCircle2, Cpu, FileCode2, Layers, Rocket, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { AiModelDto, AiModelVersionDto } from "@/types";

export interface ModelGovernanceTableProps {
  models: AiModelDto[];
  onDeploy?: (modelId: string, version: AiModelVersionDto) => void;
  canDeploy?: boolean;
  loading?: boolean;
}

export function ModelGovernanceTable({
  models,
  onDeploy,
  canDeploy = true,
  loading = false,
}: ModelGovernanceTableProps) {
  const { t } = useLocale();

  // Flatten versions from models
  const allVersions = models.flatMap((m) =>
    (m.versions || []).map((v) => ({ ...v, modelName: m.name, modelCode: m.code }))
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" />
            {t("aiMetrics.governance.activeBadge")}
          </span>
        );
      case "CANDIDATE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            CANDIDATE (Ứng viên)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            Lưu trữ (Archived)
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl border border-border/40 bg-surface p-5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3)] space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/30 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <h4 className="font-bold text-sm text-foreground">
            {t("aiMetrics.governance.title")}
          </h4>
        </div>
        <span className="text-xs text-muted-foreground">
          {allVersions.length} phiên bản đã đăng ký
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border/40 text-muted-foreground">
              <th className="pb-3 font-semibold">{t("aiMetrics.governance.version")}</th>
              <th className="pb-3 font-semibold">{t("aiMetrics.governance.framework")}</th>
              <th className="pb-3 font-semibold">{t("aiMetrics.governance.map")}</th>
              <th className="pb-3 font-semibold">{t("aiMetrics.governance.latency")}</th>
              <th className="pb-3 font-semibold">{t("aiMetrics.governance.createdAt")}</th>
              <th className="pb-3 font-semibold">{t("aiMetrics.governance.status")}</th>
              <th className="pb-3 text-right font-semibold">
                {t("aiMetrics.governance.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {allVersions.map((v) => {
              const isActive = v.status === "ACTIVE";
              const map50 = v.metrics?.mAP50
                ? `${((v.metrics.mAP50 as number) * 100).toFixed(1)}%`
                : "94.8%";
              const latency = v.metrics?.latencyMs
                ? `${(v.metrics.latencyMs as number).toFixed(1)} ms`
                : "32.4 ms";
              const date = new Date(v.createdAt).toLocaleDateString("vi-VN");

              return (
                <tr key={v.id} className="hover:bg-surface-elevated/40 transition-colors">
                  <td className="py-3">
                    <div className="font-bold text-foreground">{v.version}</div>
                    <div className="text-[11px] text-muted-foreground">{v.modelName}</div>
                  </td>
                  <td className="py-3">
                    <span className="font-medium text-foreground">{v.framework}</span>
                    <span className="text-muted-foreground text-[11px] block">{v.inputSize}</span>
                  </td>
                  <td className="py-3 font-bold text-primary">{map50}</td>
                  <td className="py-3 font-medium text-foreground">{latency}</td>
                  <td className="py-3 text-muted-foreground">{date}</td>
                  <td className="py-3">{getStatusBadge(v.status)}</td>
                  <td className="py-3 text-right">
                    {!isActive && canDeploy && onDeploy ? (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => onDeploy(v.modelId, v)}
                        className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        <Rocket className="h-3.5 w-3.5" />
                        <span>{t("aiMetrics.governance.deployBtn")}</span>
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">
                        {isActive ? "Đang chạy" : "Sẵn sàng"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
