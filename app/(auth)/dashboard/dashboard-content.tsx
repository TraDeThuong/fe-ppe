"use client";

import { LayoutDashboard } from "lucide-react";

import { PageHeader } from "@/components/features/app-shell/page-header";
import { PagePanel } from "@/components/features/app-shell/page-panel";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/providers/locale-provider";

export default function DashboardContent() {
  const { user, status } = useAuth();
  const { t } = useLocale();

  if (status !== "authenticated" || !user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
        <p>{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={LayoutDashboard}
        title={t("nav.dashboard")}
        description={`${t("dashboard.welcome")}, ${user.fullName ?? user.email}`}
        badge="Workspace overview"
        badgeIcon={LayoutDashboard}
      />

      <PagePanel
        icon={LayoutDashboard}
        title="Tổng quan (Dashboard Grid Container)"
        description=""
      />
    </div>
  );
}
