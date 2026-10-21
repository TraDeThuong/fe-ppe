"use client";

import { Cctv } from "lucide-react";

import { PageHeader } from "@/components/features/app-shell/page-header";
import { PagePanel } from "@/components/features/app-shell/page-panel";
import { useLocale } from "@/providers/locale-provider";

export default function CamerasContent() {
  const { t } = useLocale();

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Cctv}
        title={t("cameras.title")}
        description={t("cameras.description")}
        badge="Live video streams"
        badgeIcon={Cctv}
      />

      <PagePanel
        icon={Cctv}
        title="Giám sát Cameras (Cameras Grid Container)"
        description="Lưới danh sách camera và trạng thái kết nối tạm ẩn để phục vụ thiết kế layout chung."
      />
    </div>
  );
}
