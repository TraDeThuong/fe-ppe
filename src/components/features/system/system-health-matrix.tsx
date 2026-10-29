"use client";

import { Activity, CheckCircle2, Clock, RefreshCw, Server, XCircle } from "lucide-react";
import type { SystemHealthReport } from "@/types";
import { useLocale } from "@/providers/locale-provider";
import { Button } from "@/components/ui/button";

export interface SystemHealthMatrixProps {
  healthReport?: SystemHealthReport;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function SystemHealthMatrix({
  healthReport,
  onRefresh,
  isRefreshing = false,
}: SystemHealthMatrixProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const services = healthReport?.services ?? [];

  const getStatusBadge = (status: "HEALTHY" | "DEGRADED" | "DOWN") => {
    switch (status) {
      case "HEALTHY":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success shadow-[0_0_8px_rgba(34,197,94,0.2)]">
            <CheckCircle2 className="h-3 w-3" />
            {t("system.health.statusHealthy")}
          </span>
        );
      case "DEGRADED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-0.5 text-xs font-semibold text-warning">
            <Clock className="h-3 w-3" />
            {t("system.health.statusDegraded")}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/30 bg-danger/10 px-2.5 py-0.5 text-xs font-semibold text-danger">
            <XCircle className="h-3 w-3" />
            {t("system.health.statusDown")}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            {t("system.health.title")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t("system.health.description")}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 rounded-xl"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>{t("system.refresh")}</span>
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border/40 bg-surface shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border/40 bg-surface-elevated/40 text-xs font-semibold uppercase text-muted-foreground">
            <tr>
              <th className="px-5 py-3.5">{t("system.health.tableService")}</th>
              <th className="px-5 py-3.5">{isVietnamese ? "Phân loại" : "Category"}</th>
              <th className="px-5 py-3.5">{t("system.health.tableCode")}</th>
              <th className="px-5 py-3.5">{t("system.health.tablePort")}</th>
              <th className="px-5 py-3.5">{t("system.health.tableStatus")}</th>
              <th className="px-5 py-3.5">{t("system.health.tableLatency")}</th>
              <th className="px-5 py-3.5">{t("system.health.tableUptime")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {services.map((svc) => (
              <tr
                key={svc.serviceCode}
                className="transition-colors duration-150 hover:bg-surface-elevated/30"
              >
                <td className="px-5 py-4 font-medium text-foreground">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        svc.status === "HEALTHY"
                          ? "bg-success animate-pulse"
                          : svc.status === "DEGRADED"
                          ? "bg-warning"
                          : "bg-danger"
                      }`}
                    />
                    <span>{svc.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                      svc.type === "INFRASTRUCTURE"
                        ? "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400"
                        : "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    }`}
                  >
                    {svc.type === "INFRASTRUCTURE" ? "Hạ tầng" : "Dịch vụ"}
                  </span>
                </td>
                <td className="px-5 py-4 font-mono text-xs text-primary">{svc.serviceCode}</td>
                <td className="px-5 py-4 font-mono text-xs text-muted-foreground">:{svc.port}</td>
                <td className="px-5 py-4">{getStatusBadge(svc.status)}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5 font-mono text-xs">
                    <Activity
                      className={`h-3.5 w-3.5 ${
                        svc.latencyMs < 100
                          ? "text-success"
                          : svc.latencyMs < 300
                          ? "text-warning"
                          : "text-danger"
                      }`}
                    />
                    <span>{svc.latencyMs} ms</span>
                  </div>
                </td>
                <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                  {svc.uptime ?? "14d 6h"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
