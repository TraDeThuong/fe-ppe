"use client";

import { Activity, Clock, Database, HardDrive, Info, Layers, Radio, Server, Shield } from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import type { SystemHealthReport } from "@/types";

export interface SystemInfoPanelProps {
  healthReport?: SystemHealthReport;
}

export function SystemInfoPanel({ healthReport }: SystemInfoPanelProps) {
  const { t } = useLocale();

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
      label: "Trạng thái Cụm Dịch vụ",
      value: `${healthReport?.healthyCount ?? 12}/${healthReport?.totalServices ?? 12} Nodes Khỏe mạnh`,
      icon: Server,
    },
    {
      label: "Độ trễ Mạng Trung bình",
      value: `${healthReport?.averageLatencyMs ?? 24} ms RTT`,
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Info className="h-5 w-5 text-primary" />
          {t("system.platform.title")}
        </h3>
        <p className="text-xs text-muted-foreground">
          Thông số hạ tầng máy chủ, chuẩn giao thức microservices và nhịp tim cluster.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {infoItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-start gap-3 rounded-2xl border border-border/40 bg-surface p-4 shadow-[3px_3px_8px_rgba(0,0,0,0.05),-3px_-3px_8px_rgba(255,255,255,0.7)] dark:shadow-[3px_3px_8px_rgba(0,0,0,0.3)]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <p className="font-mono text-xs font-semibold text-foreground">{item.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
