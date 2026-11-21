"use client";

import { Activity, Clock, Database, ExternalLink, FileText, HardDrive, Info, Layers, Radio, Server, Shield } from "lucide-react";
import { env } from "@/config/env";
import { useLocale } from "@/providers/locale-provider";
import type { SystemHealthReport } from "@/types";

export interface SystemInfoPanelProps {
  healthReport?: SystemHealthReport;
}

export function SystemInfoPanel({ healthReport }: SystemInfoPanelProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const healthy = healthReport?.healthyCount ?? 0;
  const total = healthReport?.totalServices ?? 0;
  const latency = healthReport?.averageLatencyMs ?? 0;
  const readinessService = healthReport?.services?.find(
    (s) => s.name.toLowerCase().includes("identity") || s.endpoint.includes("health"),
  );
  const readinessVersion =
    typeof readinessService?.details?.version === "string"
      ? readinessService.details.version
      : undefined;
  const gatewayRoot = env.apiBaseUrl.replace(/\/api\/v1\/?$/, "");
  const docsUrl = `${gatewayRoot}/api/docs`;
  const securityTxtUrl = `${gatewayRoot}/.well-known/security.txt`;

  const infoItems = [
    {
      label: t("system.platform.version"),
      value: readinessVersion
        ? `v${readinessVersion}`
        : isVietnamese
          ? "Đang đồng bộ từ Gateway..."
          : "Syncing from Gateway...",
      icon: Layers,
    },
    {
      label: t("system.platform.contract"),
      value: healthReport?.overallStatus ?? "UNKNOWN",
      icon: Shield,
    },
    {
      label: t("system.platform.environment"),
      value: gatewayRoot || "Traefik Gateway",
      icon: Info,
    },
    {
      label: t("system.platform.timezone"),
      value: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Ho_Chi_Minh",
      icon: Clock,
    },
    {
      label: t("system.platform.database"),
      value:
        readinessService?.status === "HEALTHY"
          ? isVietnamese
            ? `PostgreSQL Sẵn sàng (${readinessService.latencyMs ?? "--"}ms)`
            : `PostgreSQL Healthy (${readinessService.latencyMs ?? "--"}ms)`
          : readinessService?.status ?? "CHECKING",
      icon: Database,
    },
    {
      label: t("system.platform.broker"),
      value: "Kafka / Redis EventBus",
      icon: Radio,
    },
    {
      label: t("system.platform.storage"),
      value:
        healthReport?.services?.find((s) => s.name.toLowerCase().includes("minio"))
          ?.status ?? "MinIO / R2 S3",
      icon: HardDrive,
    },
    {
      label: t("system.platform.clusterHealth"),
      value: total > 0 ? t("system.platform.clusterHealthValue", { healthy, total }) : "--",
      icon: Server,
    },
    {
      label: t("system.platform.networkLatency"),
      value: total > 0 ? t("system.platform.networkLatencyValue", { latency }) : "-- ms",
      icon: Activity,
    },
  ];

  return (
<div className="space-y-5">
  {/* =========================================================
      1. NEUMORPHIC PLATFORM HEADER & EXTERNAL DOC LINKS
  ========================================================= */}
  <section className="relative overflow-hidden rounded-[24px] border border-white/65 bg-surface p-4 sm:p-5 shadow-[8px_8px_18px_var(--shadow-dark),-8px_-8px_18px_rgba(255,255,255,0.85)] dark:border-white/[0.06] dark:bg-card dark:shadow-[8px_8px_20px_rgba(0,0,0,0.55),-3px_-3px_10px_rgba(255,255,255,0.03)]">
    {/* Specular Rim Top Highlight */}
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent"
    />

    <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3.5">
        {/* Extruded + Debossed Emblem Pod */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] border border-white/70 bg-surface text-primary shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.9)] dark:border-white/[0.06] dark:bg-card dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5)]">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary/[0.08] shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_rgba(255,255,255,0.75)] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.65)]">
            <Info className="h-4.5 w-4.5" />
          </div>
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-sm font-extrabold tracking-tight text-foreground sm:text-[15px]">
            {t("system.platform.title")}
          </h3>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {t("system.platform.subTitle")}
          </p>
        </div>
      </div>

      {/* Tactile External Links */}
      <div className="flex flex-wrap items-center gap-2.5">
        {process.env.NODE_ENV !== "production" && (
          <a
            href={docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-[13px] border border-primary/25 bg-primary/[0.08] px-3.5 text-xs font-extrabold text-primary shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.85)] transition-all duration-150 hover:bg-primary/15 active:shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_rgba(255,255,255,0.85)] dark:bg-primary/15 dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5),-2px_-2px_6px_rgba(255,255,255,0.03)]"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Swagger API Docs</span>
            <ExternalLink className="h-3 w-3 opacity-80" />
          </a>
        )}

        <a
          href={securityTxtUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center gap-1.5 rounded-[13px] border border-white/70 bg-surface px-3.5 text-xs font-extrabold text-foreground shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.85)] transition-all duration-150 hover:text-primary active:shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_rgba(255,255,255,0.85)] dark:border-white/[0.06] dark:bg-card dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45),-2px_-2px_6px_rgba(255,255,255,0.03)]"
        >
          <Shield className="h-3.5 w-3.5 text-primary" />
          <span>security.txt</span>
          <ExternalLink className="h-3 w-3 text-muted-foreground" />
        </a>
      </div>
    </div>
  </section>

  {/* =========================================================
      2. TELEMETRY & ENVIRONMENT INFO CARDS GRID
  ========================================================= */}
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {infoItems.map((item) => {
      const Icon = item.icon;

      return (
        <div
          key={item.label}
          className="group relative flex items-center gap-3.5 overflow-hidden rounded-[22px] border border-white/65 bg-surface p-4 shadow-[7px_7px_16px_var(--shadow-dark),-7px_-7px_16px_rgba(255,255,255,0.85)] transition-all duration-300 hover:-translate-y-0.5 dark:border-white/[0.06] dark:bg-card dark:shadow-[7px_7px_18px_rgba(0,0,0,0.55),-3px_-3px_8px_rgba(255,255,255,0.03)]"
        >
          {/* Extruded + Debossed Icon Pod */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] border border-white/70 bg-surface text-primary shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_rgba(255,255,255,0.9)] dark:border-white/[0.06] dark:bg-card dark:shadow-[4px_4px_10px_rgba(0,0,0,0.55)]">
            <div className="flex h-8.5 w-8.5 items-center justify-center rounded-[11px] bg-primary/[0.08] shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_rgba(255,255,255,0.75)] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.65)]">
              <Icon className="h-4.5 w-4.5" />
            </div>
          </div>

          {/* Label & Recessed Value Plate */}
          <div className="min-w-0 flex-1 space-y-1.5">
            <span className="block truncate px-0.5 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
              {item.label}
            </span>

            <div className="rounded-[11px] bg-background/65 px-2.5 py-1.5 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_rgba(255,255,255,0.8)] dark:bg-black/35 dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.7)]">
              <p
                title={String(item.value)}
                className="truncate font-mono text-xs font-extrabold text-foreground"
              >
                {item.value}
              </p>
            </div>
          </div>
        </div>
      );
    })}
  </div>
</div>
  );
}
