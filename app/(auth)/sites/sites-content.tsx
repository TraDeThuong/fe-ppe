"use client";

import { Building2 } from "lucide-react";

import { PageHeader } from "@/components/features/app-shell/page-header";
import { PagePanel } from "@/components/features/app-shell/page-panel";
import { useLocale } from "@/providers/locale-provider";

export default function SitesContent() {
  const { t } = useLocale();

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Building2}
        title={t("sites.title")}
        description={t("sites.description")}
        badge="Safety zones"
        badgeIcon={Building2}
      />

      <PagePanel
        icon={Building2}
        title="Công trường & Phân khu (Sites Grid Container)"
        description="Danh sách site, zones và vùng cấm tạm ẩn để phục vụ thiết kế layout chung."
      />
    </div>
  );
}
