"use client";

import { useMemo } from "react";
import { RefreshCw, Wrench } from "lucide-react";
import { PageHeader } from "@/components/features/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MaintenanceControlPanel,
  MaintenanceKpiSummary,
  MaintenancePreviewCard,
} from "@/components/features/maintenance";
import {
  useMaintenanceConfig,
  useMaintenanceMutations,
} from "@/hooks/maintenance";
import { useLocale } from "@/providers/locale-provider";

export default function MaintenanceContent() {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const {
    data: config,
    isLoading,
    refetch,
    isFetching,
  } = useMaintenanceConfig();

  const {
    enableMaintenance,
    isEnabling,
    disableMaintenance,
    isDisabling,
    updateConfig,
    isUpdating,
  } = useMaintenanceMutations();

  const isEnabled = Boolean(config?.enabled);
  const status = config?.status || "ONLINE";

  const breadcrumbs = useMemo(
    () => [
      {
        label: isVietnamese ? "Quản trị" : "Admin",
        href: "/system",
      },
      {
        label: t("maintenance.title"),
      },
    ],
    [isVietnamese, t],
  );

  return (
    <div className="space-y-6">
      {/* 1. PAGE HEADER */}
      <PageHeader
        title={t("maintenance.title")}
        description={t("maintenance.subtitle")}
        icon={Wrench}
        breadcrumbs={breadcrumbs}
        badge={
          <Badge
            variant={
              isEnabled
                ? status === "READ_ONLY"
                  ? "warning"
                  : "danger"
                : "success"
            }
            className="px-2.5 py-0.5 text-xs font-semibold"
          >
            {isEnabled
              ? status === "READ_ONLY"
                ? t("maintenance.badge.readOnly")
                : t("maintenance.badge.active")
              : t("maintenance.badge.online")}
          </Badge>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">{t("common.refresh")}</span>
          </Button>
        }
      />

      {/* 2. KPI SUMMARY METRICS */}
      <MaintenanceKpiSummary config={config} loading={isLoading} />

      {/* 3. BẢNG ĐIỀU KHIỂN TRUNG TÂM (FULL WIDTH) */}
      <div className="w-full">
        <MaintenanceControlPanel
          config={config}
          onEnable={enableMaintenance}
          onDisable={disableMaintenance}
          onUpdate={updateConfig}
          isEnabling={isEnabling}
          isDisabling={isDisabling}
          isUpdating={isUpdating}
        />
      </div>

      {/* 4. XEM TRƯỚC TRỰC TIẾP GIAO DIỆN NGƯỜI DÙNG (FULL WIDTH XUỐNG DÒNG) */}
      <div className="w-full">
        <MaintenancePreviewCard config={config} />
      </div>
    </div>
  );
}
