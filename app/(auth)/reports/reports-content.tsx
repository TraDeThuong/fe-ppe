"use client";

import { BarChart3 } from "lucide-react";

import { PageHeader } from "@/components/features/app-shell/page-header";
import { PagePanel } from "@/components/features/app-shell/page-panel";
import { useLocale } from "@/providers/locale-provider";

export default function ReportsContent() {
  const { t } = useLocale();

  return (
    <div className="space-y-5">
      <PageHeader
        icon={BarChart3}
        title={t("reports.title")}
        description={t("reports.description")}
        badge="Analytics & exports"
        badgeIcon={BarChart3}
      />

      <PagePanel
        icon={BarChart3}
        title="Báo cáo & Thống kê (Reports Grid Container)"
        description="Form xuất báo cáo và lịch sử file tạm ẩn ."
      />
    </div>
  );
}
