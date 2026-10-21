"use client";

import { ScrollText } from "lucide-react";

import { PageHeader } from "@/components/features/app-shell/page-header";
import { PagePanel } from "@/components/features/app-shell/page-panel";
import { useLocale } from "@/providers/locale-provider";

export default function AuditLogsContent() {
  const { t } = useLocale();

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ScrollText}
        title={t("auditLogs.title")}
        description={t("auditLogs.description")}
        badge="Security audit trail"
        badgeIcon={ScrollText}
      />

      <PagePanel
        icon={ScrollText}
        title="Nhật ký Hệ thống (Audit Logs Grid Container)"
        description="Bảng timeline và chỉ số kiểm toán tạm ẩn để phục vụ thiết kế layout chung."
      />
    </div>
  );
}
