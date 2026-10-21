"use client";

import { Users } from "lucide-react";

import { PageHeader } from "@/components/features/app-shell/page-header";
import { PagePanel } from "@/components/features/app-shell/page-panel";
import { useLocale } from "@/providers/locale-provider";

export default function UsersContent() {
  const { t } = useLocale();

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Users}
        title={t("users.title")}
        description={t("users.description")}
        badge="Directory & roles"
        badgeIcon={Users}
      />

      <PagePanel
        icon={Users}
        title="Quản lý Người dùng (Users Grid Container)"
        description="Bảng danh sách người dùng và gán vai trò tạm ẩn để phục vụ thiết kế layout chung."
      />
    </div>
  );
}
