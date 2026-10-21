"use client";

import { Bell } from "lucide-react";

import { PageHeader } from "@/components/features/app-shell/page-header";
import { PagePanel } from "@/components/features/app-shell/page-panel";
import { useLocale } from "@/providers/locale-provider";

export default function NotificationsContent() {
  const { t } = useLocale();

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Bell}
        title={t("notifications.title")}
        description={t("notifications.description")}
        badge="Alerts & preferences"
        badgeIcon={Bell}
      />

      <PagePanel
        icon={Bell}
        title="Trung tâm Thông báo (Notifications Grid Container)"
        description="Danh sách thông báo và tab cài đặt nhận tin tạm ẩn để phục vụ thiết kế layout chung."
      />
    </div>
  );
}
