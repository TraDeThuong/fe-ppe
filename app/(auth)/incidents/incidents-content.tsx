"use client";

import { ShieldAlert } from "lucide-react";

import { PageHeader } from "@/components/features/app-shell/page-header";
import { PagePanel } from "@/components/features/app-shell/page-panel";
import { useLocale } from "@/providers/locale-provider";

export default function IncidentsContent() {
  const { t } = useLocale();

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ShieldAlert}
        title={t("incidents.title")}
        description={t("incidents.description")}
        badge="Safety monitoring"
        badgeIcon={ShieldAlert}
      />

      <PagePanel
        icon={ShieldAlert}
        title="Sự cố vi phạm PPE (Incidents Grid Container)"
        description="Bảng danh sách sự cố và KPI tạm ẩn để phục vụ thiết kế lại layout chung (Sidebar, Header, Spacing)."
      />
    </div>
  );
}

/*
--- CODE GIAO DIỆN MẪU TẠM ẨN ---
// Xem chi tiết cấu trúc bảng sự cố, KPI card tại commit hoặc triển khai lại ở Milestone M3
*/
