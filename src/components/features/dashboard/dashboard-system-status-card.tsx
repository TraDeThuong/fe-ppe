"use client";

import React from "react";
import Link from "next/link";
import { Server, Activity, ArrowRight, AlertTriangle, ShieldAlert, CheckCircle2, XCircle } from "lucide-react";
import { useSystemHealth } from "@/hooks/system/use-system-health";
import { useMaintenanceStatus } from "@/hooks/maintenance";
import { useLocale } from "@/providers/locale-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";

export interface DashboardSystemStatusCardProps {
  className?: string;
  maxDisplayServices?: number;
}

export function DashboardSystemStatusCard({
  className = "",
  maxDisplayServices = 6,
}: DashboardSystemStatusCardProps) {
  const { t } = useLocale();
  const { data: health, isLoading, isError, refetch } = useSystemHealth(30000);
  const { data: maintenance } = useMaintenanceStatus();

  const isMaintenanceActive = Boolean(maintenance?.enabled);
  const services = health?.services ?? [];
  const displayServices = services.slice(0, maxDisplayServices);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "HEALTHY":
        return {
          label: t("dashboard.systemCard.healthy"),
          dotClass: "bg-primary",
          textClass: "text-foreground",
          borderClass: "border-border/50 bg-background/80 dark:bg-white/[0.05] dark:border-white/[0.1]",
        };
      case "DEGRADED":
        return {
          label: t("dashboard.systemCard.degraded"),
          dotClass: "bg-muted-foreground",
          textClass: "text-foreground",
          borderClass: "border-border/50 bg-background/80 dark:bg-white/[0.05] dark:border-white/[0.1]",
        };
      default:
        return {
          label: t("dashboard.systemCard.down"),
          dotClass: "bg-danger",
          textClass: "text-danger-foreground bg-danger",
          borderClass: "border-danger/30",
        };
    }
  };

  const overall = getStatusBadge(health?.overallStatus);

  return (
    <div
      className={`flex flex-col justify-between rounded-2xl border border-border/40 bg-surface/90 p-5 shadow-[4px_6px_16px_rgba(0,0,0,0.03),-3px_-3px_10px_rgba(255,255,255,0.6)] dark:border-white/[0.08] dark:bg-card/40 dark:shadow-[0_8px_24px_rgba(0,0,0,0.25)] ${className}`}
    >
      <div>
        {/* Card Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border/40 pb-4 dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 dark:bg-primary/20">
              <Server className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {t("dashboard.systemCard.title")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("dashboard.systemCard.subtitle")}
              </p>
            </div>
          </div>

          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border ${overall.borderClass} ${overall.textClass}`}
          >
            <span className={`size-2 rounded-full animate-pulse ${overall.dotClass}`} />
            <span>{overall.label}</span>
          </div>
        </div>

        {/* Maintenance Mode Alert Banner if active */}
        {isMaintenanceActive && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
            <ShieldAlert className="size-4 shrink-0" />
            <span>
              <strong>Bảo trì hệ thống đang bật:</strong>{" "}
              {maintenance?.message || "Hệ thống đang trong quá trình bảo trì định kỳ."}
            </span>
          </div>
        )}

        {/* Services Health Grid */}
        <div className="mt-4 space-y-2.5">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-border/30 bg-background/50 p-2.5"
                >
                  <div className="flex items-center gap-2">
                    <Skeleton className="size-2 rounded-full" />
                    <Skeleton className="h-3.5 w-24 rounded-md" />
                  </div>
                  <Skeleton className="h-3 w-12 rounded-md" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="flex h-36 flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="size-6 text-amber-500" />
              <p>{t("dashboard.data.error")}</p>
              <Button size="sm" variant="outline" onClick={() => void refetch()}>
                {t("dashboard.data.retry")}
              </Button>
            </div>
          ) : displayServices.length === 0 ? (
            <div className="flex h-36 items-center justify-center text-xs text-muted-foreground">
              {t("dashboard.kpi.noData")}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {displayServices.map((svc) => {
                const isHealthy = svc.status === "HEALTHY";
                const isDegraded = svc.status === "DEGRADED";
                return (
                  <div
                    key={svc.serviceCode}
                    className="flex items-center justify-between rounded-xl border border-border/30 bg-background/50 px-3 py-2 text-xs transition-colors hover:bg-background/80 dark:border-white/[0.06] dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`size-1.5 shrink-0 rounded-full ${
                          isHealthy
                            ? "bg-primary"
                            : isDegraded
                              ? "bg-muted-foreground"
                              : "bg-danger"
                        }`}
                      />
                      <span className="truncate font-medium text-foreground">
                        {svc.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] text-muted-foreground">
                      {typeof svc.latencyMs === "number" ? (
                        <span>{svc.latencyMs}ms</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Card Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3 text-xs dark:border-white/[0.08]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Activity className="size-3.5" />
          <span>
            {health
              ? `${health.healthyCount}/${health.totalServices} dịch vụ sẵn sàng · TB ${Math.round(
                  health.averageLatencyMs,
                )}ms`
              : "--"}
          </span>
        </div>

        <Link
          href="/system"
          className="group inline-flex items-center gap-1 font-semibold text-primary hover:underline dark:text-primary-foreground"
        >
          <span>{t("dashboard.systemCard.viewDetails")}</span>
          <ArrowRight className="size-3 transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
