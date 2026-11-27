"use client";

import { useMemo, useState } from "react";
import { Wrench } from "lucide-react";
import { PageHeader } from "@/components/features/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { RefreshButton } from "@/components/ui/refresh-action";
import {
  MaintenanceControlPanel,
  MaintenancePreviewCard,
} from "@/components/features/maintenance";
import {
  useMaintenanceConfig,
  useMaintenanceMutations,
} from "@/hooks/maintenance";
import { useCan } from "@/hooks/use-can";
import { useLocale } from "@/providers/locale-provider";
import type { MaintenanceConfig } from "@/types";

export default function MaintenanceContent() {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const can = useCan();
  const canManage = can("MAINTENANCE_MANAGE");

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

  const [draftConfig, setDraftConfig] =
    useState<Partial<MaintenanceConfig> | null>(null);

  const previewConfig = useMemo<MaintenanceConfig | null | undefined>(() => {
    if (!config && !draftConfig) return config;
    return {
      ...(config ?? ({} as MaintenanceConfig)),
      ...(draftConfig ?? {}),
    };
  }, [config, draftConfig]);

  const isEnabled = Boolean(config?.enabled);
  const status = config?.status || "ONLINE";
  const isFullMaintenance = isEnabled && status === "MAINTENANCE";

  const breadcrumbs = useMemo(
    () =>
      isFullMaintenance
        ? undefined
        : [
            {
              label: isVietnamese ? "Quản trị" : "Admin",
              href: "/system",
            },
            {
              label: t("maintenance.title"),
            },
          ],
    [isFullMaintenance, isVietnamese, t],
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
          <RefreshButton
            variant="outline"
            size="sm"
            onRefresh={() => refetch()}
            isRefreshing={isFetching}
            hideLabelOnMobile
            iconClassName="h-4 w-4"
            className="gap-2"
          />
        }
      />

      {/* 2. BẢNG ĐIỀU KHIỂN & TRẠNG THÁI VẬN HÀNH */}
      <div className="w-full">
        <MaintenanceControlPanel
          config={config}
          loading={isLoading}
          canManage={canManage}
          onEnable={enableMaintenance}
          onDisable={disableMaintenance}
          onUpdate={updateConfig}
          isEnabling={isEnabling}
          isDisabling={isDisabling}
          isUpdating={isUpdating}
          onDraftChange={setDraftConfig}
        />
      </div>

      {/* 4. XEM TRƯỚC TRỰC TIẾP GIAO DIỆN NGƯỜI DÙNG (FULL WIDTH XUỐNG DÒNG) */}
      <div className="w-full">
        <MaintenancePreviewCard config={previewConfig} />
      </div>
    </div>
  );
}
