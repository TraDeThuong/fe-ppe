"use client";

import { Cpu } from "lucide-react";

import { PageHeader } from "@/components/features/app-shell/page-header";
import { PagePanel } from "@/components/features/app-shell/page-panel";
import { useLocale } from "@/providers/locale-provider";

export default function AiMetricsContent() {
  const { t } = useLocale();

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Cpu}
        title={t("aiMetrics.title")}
        description={t("aiMetrics.description")}
        badge="Model telemetry"
        badgeIcon={Cpu}
      />

      <PagePanel
        icon={Cpu}
        title="Hiệu năng Mô hình AI (AI Metrics Grid Container)"
        description="Chỉ số FPS, latency và ma trận camera "
      />
    </div>
  );
}
