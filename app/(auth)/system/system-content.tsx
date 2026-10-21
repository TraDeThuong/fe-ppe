"use client";

import { Settings2 } from "lucide-react";

import { PageHeader } from "@/components/features/app-shell/page-header";
import { PagePanel } from "@/components/features/app-shell/page-panel";
import { useLocale } from "@/providers/locale-provider";

export default function SystemContent() {
  const { t } = useLocale();

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Settings2}
        title={t("system.title")}
        description={t("system.description")}
        badge="System administration"
        badgeIcon={Settings2}
      />

      <PagePanel
        icon={Settings2}
        title="Cấu hình Hệ thống (System Admin Grid Container)"
        description="Các tab cấu hình, API keys, Webhooks và Cron jobs tạm ẩn để phục vụ thiết kế layout chung."
      />
    </div>
  );
}
