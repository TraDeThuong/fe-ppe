"use client";

import { ShieldAlert } from "lucide-react";

import { PageHeader } from "@/components/features/app-shell/page-header";
import { PagePanel } from "@/components/features/app-shell/page-panel";
import { useLocale } from "@/providers/locale-provider";

interface IncidentDetailContentProps {
  id: string;
}

export default function IncidentDetailContent({ id }: IncidentDetailContentProps) {
  const { t } = useLocale();

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ShieldAlert}
        title={`${t("incidents.detailTitle")}: ${id}`}
        description={t("incidents.detailDescription")}
        breadcrumbs={[
          { label: t("incidents.title"), href: "/incidents" },
          { label: id },
        ]}
        badge={`Incident ${id}`}
        badgeIcon={ShieldAlert}
      />

      <PagePanel
        icon={ShieldAlert}
        title={`Chi tiết sự cố: ${id} (Detail Grid Container)`}
        description="Khung hình ảnh snapshot và thông tin chi tiết tạm ẩn để phục vụ thiết kế layout chung."
      />
    </div>
  );
}
