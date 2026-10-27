"use client";

import { ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/features/app-shell/page-header";
import { PagePanel } from "@/components/features/app-shell/page-panel";
import { useLocale } from "@/providers/locale-provider";

export default function RolesContent() {
  const { t } = useLocale();

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ShieldCheck}
        title={t("roles.title")}
        description={t("roles.description")}
        badge="RBAC security"
        badgeIcon={ShieldCheck}
      />

      <PagePanel
        icon={ShieldCheck}
        title="Vai trò & Phân quyền (Roles Grid Container)"
        description="Thẻ danh mục vai trò và ma trận quyền hạn"
      />
    </div>
  );
}
