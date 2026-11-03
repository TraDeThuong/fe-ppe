"use client";

import { Activity, Clock, Database, HardDrive, Info, Layers, Radio, Server, Shield } from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import type { SystemHealthReport } from "@/types";

export interface SystemInfoPanelProps {
  healthReport?: SystemHealthReport;
}

export function SystemInfoPanel({ healthReport }: SystemInfoPanelProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const healthy = healthReport?.healthyCount ?? 12;
  const total = healthReport?.totalServices ?? 12;
  const latency = healthReport?.averageLatencyMs ?? 24;

  const infoItems = [
    {
      label: t("system.platform.version"),
      value: "v2.1.0 (Build 2026.10.28)",
      icon: Layers,
    },
    {
      label: t("system.platform.contract"),
      value: "2.1.0-PPE-STABLE",
      icon: Shield,
    },
    {
      label: t("system.platform.environment"),
      value: "Production (Docker Swarm / Traefik Gateway)",
      icon: Info,
    },
    {
      label: t("system.platform.timezone"),
      value: "Asia/Ho_Chi_Minh (UTC+07:00)",
      icon: Clock,
    },
    {
      label: t("system.platform.database"),
      value: "PostgreSQL 16 (HA Cluster / Port 5432)",
      icon: Database,
    },
    {
      label: t("system.platform.broker"),
      value: "Apache Kafka 3.7 (EventBus Cluster :9092)",
      icon: Radio,
    },
    {
      label: t("system.platform.storage"),
      value: "MinIO S3 Compatible Storage (:9000)",
      icon: HardDrive,
    },
    {
      label: t("system.platform.clusterHealth"),
      value: t("system.platform.clusterHealthValue", { healthy, total }),
      icon: Server,
    },
    {
      label: t("system.platform.networkLatency"),
      value: t("system.platform.networkLatencyValue", { latency }),
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/15">
          <Info className="h-4.5 w-4.5" />
        </div>
        <div>
          <h3 className="text-sm sm:text-base font-bold text-foreground">
            {t("system.platform.title")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t("system.platform.subTitle")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {infoItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-start gap-3 rounded-xl sm:rounded-2xl border border-border/40 bg-surface p-4 shadow-[3px_3px_8px_rgba(0,0,0,0.05),-3px_-3px_8px_rgba(255,255,255,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[6px_8px_16px_rgba(0,0,0,0.08),-4px_-4px_10px_rgba(255,255,255,0.85)] dark:border-black/60 dark:bg-card/90 dark:shadow-[4px_4px_12px_rgba(0,0,0,0.55)] dark:hover:border-black dark:hover:bg-card dark:hover:shadow-[0_16px_28px_rgba(0,0,0,0.95)]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/15">
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className="space-y-1 min-w-0">
                <span className="text-xs text-muted-foreground block truncate">
                  {item.label}
                </span>
                <p className="font-mono text-xs font-semibold text-foreground truncate">
                  {item.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
