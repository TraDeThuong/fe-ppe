"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RefreshCw, ScrollText, Settings2, ShieldAlert, Wrench } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/features/app-shell/page-header";
import {
  CreateConfigModal,
  DeleteConfigDialog,
  EditConfigModal,
  FeatureFlagsTab,
  SystemConfigTable,
  SystemConfigToolbar,
  SystemHealthMatrix,
  SystemInfoPanel,
  SystemKpiSummary,
  SystemTabs,
  ToggleFlagDialog,
  type SystemStatKey,
  type SystemTabKey,
} from "@/components/features/system";
import {
  useDebounce,
  useFeatureFlags,
  useSystemConfigs,
  useSystemHealth,
  useSystemMutations,
} from "@/hooks";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/providers/locale-provider";
import { toast } from "@/lib/toast";
import type { SystemConfigItem } from "@/types";

const VALID_TABS: SystemTabKey[] = ["flags", "configs", "health", "platform"];

const STAT_TO_URL: Record<SystemStatKey, string> = {
  flags: "flags",
  configs: "configs",
  health: "health",
  latency: "latency",
};

const URL_TO_STAT: Record<string, SystemStatKey> = {
  flags: "flags",
  configs: "configs",
  health: "health",
  latency: "latency",
};

export default function SystemContent() {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Kiểm tra quyền RBAC quản trị hệ thống
  const canManage = useMemo(() => {
    return (
      user?.role === "ADMIN" ||
      Boolean(user?.permissions?.includes("SYSTEM_CONFIG_MANAGE"))
    );
  }, [user]);

  // URL state synchronization for active tab
  const tabFromUrl = searchParams.get("tab") as SystemTabKey | null;
  const activeTab = tabFromUrl && VALID_TABS.includes(tabFromUrl) ? tabFromUrl : "flags";

  const handleTabChange = (nextTab: SystemTabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextTab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // URL state synchronization for selected stat (tương tự như trang /roles)
  const statParam = searchParams.get("stat");
  const selectedStat = statParam && URL_TO_STAT[statParam] ? URL_TO_STAT[statParam] : null;

  const handleSelectStat = (stat: SystemStatKey | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (stat) {
      params.set("stat", STAT_TO_URL[stat]);
    } else {
      params.delete("stat");
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  // State tìm kiếm và lọc danh mục
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const debouncedSearch = useDebounce(search, 350);

  // State phân trang cho bảng cấu hình
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleCategoryChange = (val: string) => {
    setCategory(val);
    setPage(1);
  };

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [toggleDialogOpen, setToggleDialogOpen] = useState(false);

  const [selectedConfig, setSelectedConfig] = useState<SystemConfigItem | null>(null);
  const [pendingFlag, setPendingFlag] = useState<SystemConfigItem | null>(null);
  const [pendingTargetEnabled, setPendingTargetEnabled] = useState(false);

  // Data queries
  const { data: configsData, isLoading: isLoadingConfigs, isFetching: configsFetching, error: configsError, refetch: refetchConfigs } = useSystemConfigs({
    search: debouncedSearch || undefined,
    category: category || undefined,
    page,
    limit,

  });

  const {
    data: featureFlags = [],
    isLoading: isLoadingFlags,
    toggleFlag,
    isToggling,
  } = useFeatureFlags();

  const {
    data: healthReport,
    refetch: refetchHealth,
    isFetching: isRefreshingHealth,
  } = useSystemHealth(30000);

  const {
    createConfig,
    isCreating,
    updateConfig,
    isUpdating,
    deleteConfig,
    isDeleting,
  } = useSystemMutations();

  const totalConfigsCount = configsData?.meta?.total ?? configsData?.items?.length ?? 0;
  const activeFlagsCount = useMemo(
    () => featureFlags.filter((f) => Boolean(f.value)).length,
    [featureFlags],
  );

  // Handlers
  const handleOpenToggleDialog = (flag: SystemConfigItem, enabled: boolean) => {
    if (!canManage) {
      toast.error(
        isVietnamese
          ? "Bạn không có quyền thay đổi công tắc tính năng hệ thống."
          : "You do not have permission to toggle system feature flags."
      );
      return;
    }
    setPendingFlag(flag);
    setPendingTargetEnabled(enabled);
    setToggleDialogOpen(true);
  };

  const handleConfirmToggleFlag = async (flag: SystemConfigItem, enabled: boolean) => {
    try {
      await toggleFlag({ key: flag.key, payload: { enabled } });
      toast.success(
        isVietnamese
          ? `Tính năng ${flag.key} hiện đang ở trạng thái: ${enabled ? "BẬT" : "TẮT"}`
          : `Feature flag ${flag.key} is now: ${enabled ? "ENABLED" : "DISABLED"}`
      );
    } catch {
      toast.error(
        isVietnamese
          ? "Không thể thay đổi trạng thái lúc này. Vui lòng thử lại."
          : "Unable to change status at this moment. Please try again."
      );
    }
  };

  const handleOpenEdit = (config: SystemConfigItem) => {
    if (!canManage) return;
    setSelectedConfig(config);
    setEditModalOpen(true);
  };

  const handleOpenDelete = (config: SystemConfigItem) => {
    if (!canManage) return;
    setSelectedConfig(config);
    setDeleteModalOpen(true);
  };

  const handleSaveCreate = async (payload: Parameters<typeof createConfig>[0]) => {
    await createConfig(payload);
    toast.success(
      isVietnamese
        ? `Đã tạo biến cấu hình ${payload.key}`
        : `Created config variable ${payload.key}`
    );
  };

  const handleSaveEdit = async (
    key: string,
    payload: Parameters<typeof updateConfig>[0]["payload"],
  ) => {
    await updateConfig({ key, payload });
    toast.success(
      isVietnamese
        ? `Đã cập nhật biến cấu hình ${key}`
        : `Updated config variable ${key}`
    );
  };

  const handleConfirmDelete = async (key: string) => {
    await deleteConfig(key);
    toast.success(
      isVietnamese
        ? `Biến cấu hình ${key} đã được xóa thành công.`
        : `Config variable ${key} deleted successfully.`
    );
  };

  const breadcrumbs = useMemo(
    () => [
      { label: t("common.breadcrumb.home") || (isVietnamese ? "Trang chủ" : "Home"), href: "/dashboard" },
      { label: t("nav.system") || (isVietnamese ? "Cấu hình Hệ thống" : "System Administration") },
    ],
    [t, isVietnamese],
  );

  const headerActions = (
    <div className="flex items-center gap-2 flex-wrap">
      <Link href="/maintenance">
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5 rounded-xl text-xs h-8 hover:text-primary transition-colors"
        >
          <Wrench className="h-3.5 w-3.5 text-primary" />
          <span>{t("nav.maintenance")}</span>
        </Button>
      </Link>

      <Link href="/audit-logs?search=SYSTEM_CONFIG">
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5 rounded-xl text-xs h-8"
        >
          <ScrollText className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{t("system.auditLogsBtn")}</span>
        </Button>
      </Link>

      <Button

        variant="outline"

        size="sm"

        onClick={() => refetchHealth()}

        disabled={isRefreshingHealth}

        className="flex items-center gap-1.5 rounded-xl text-xs h-8"

      >
        <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingHealth ? "animate-spin" : ""}`} />
        <span>{t("system.refresh")}</span>
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader

        icon={Settings2}

        title={t("system.title")}

        description={t("system.description")}

        badge={canManage ? t("system.badge") : t("system.readOnlyBadge")}

        badgeIcon={Settings2}

        breadcrumbs={breadcrumbs}

        actions={headerActions}

      />

      {/* Thông báo chế độ Read-only cho Safety Manager / người dùng không có quyền Manage */}
      {!canManage && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 sm:p-4 text-amber-700 dark:text-amber-400 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.05)]">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <div className="text-xs">
            <p className="font-semibold">{t("system.readOnlyTitle")}</p>
            <p className="text-muted-foreground mt-0.5">
              {t("system.readOnlyDesc")}
            </p>
          </div>
        </div>
      )}

      {/* 2. Bento Console KPI Summary (Thiết kế chuẩn tương tự như trang /roles) */}
      <SystemKpiSummary

        totalConfigs={totalConfigsCount}

        healthReport={healthReport}

        featureFlags={featureFlags}

        configs={configsData?.items ?? []}

        loading={isLoadingConfigs || isLoadingFlags}

        selectedStat={selectedStat}

        onSelectStat={handleSelectStat}

        activeTab={activeTab}

        onSelectTab={handleTabChange}

        onRefreshHealth={() => refetchHealth()}

        isRefreshingHealth={isRefreshingHealth}

        onCreateConfig={() => setCreateModalOpen(true)}

        onToggleFlag={handleOpenToggleDialog}

        canManage={canManage}

      />

      {/* 3. Neumorphic Tabs (Thiết kế cuộn ngang thông minh cho mobile) */}
      <SystemTabs

        activeTab={activeTab}

        onTabChange={handleTabChange}

        flagsCount={featureFlags.length}

        configsCount={totalConfigsCount}

      />

      {/* Tab 1: Feature Flags */}
      {activeTab === "flags" && (
        <FeatureFlagsTab

          flags={featureFlags}

          onToggle={handleOpenToggleDialog}

          loading={isLoadingFlags}

          canManage={canManage}

        />
      )}

      {/* Tab 2: System Configs */}
      {activeTab === "configs" && (
        <div className="space-y-4">

          <SystemConfigTable

            items={configsData?.items ?? []}

            onEdit={handleOpenEdit}

            onDelete={handleOpenDelete}

            loading={isLoadingConfigs}

            page={page}

            pageSize={limit}

            totalItems={totalConfigsCount}

            onPageChange={setPage}

            onPageSizeChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}

            canManage={canManage}

            tableState={{
              fetching: configsFetching,
              error: configsError,
              onRetry: () => {
                void refetchConfigs();
              },
              toolbar: <SystemConfigToolbar

                search={search}

                onSearchChange={handleSearchChange}

                category={category}

                onCategoryChange={handleCategoryChange}

                onAddConfig={() => setCreateModalOpen(true)}

                canManage={canManage}

              />
            }}

          />
        </div>
      )}

      {/* Tab 3: Service Health */}
      {activeTab === "health" && (
        <SystemHealthMatrix
          healthReport={healthReport}
          onRefresh={() => refetchHealth()}
          isRefreshing={isRefreshingHealth}
        />
      )}

      {/* Tab 4: Platform & Build Info */}
      {activeTab === "platform" && <SystemInfoPanel healthReport={healthReport} />}

      {/* Modals & Dialogs */}
      <CreateConfigModal

        open={createModalOpen}

        onOpenChange={setCreateModalOpen}

        onSubmit={handleSaveCreate}

        loading={isCreating}

      />

      <EditConfigModal

        open={editModalOpen}

        onOpenChange={setEditModalOpen}

        config={selectedConfig}

        onSubmit={handleSaveEdit}

        loading={isUpdating}

      />

      <DeleteConfigDialog

        open={deleteModalOpen}

        onOpenChange={setDeleteModalOpen}

        config={selectedConfig}

        onConfirm={handleConfirmDelete}

        loading={isDeleting}

      />

      <ToggleFlagDialog

        open={toggleDialogOpen}

        onOpenChange={setToggleDialogOpen}

        flag={pendingFlag}

        targetEnabled={pendingTargetEnabled}

        onConfirm={handleConfirmToggleFlag}

        loading={isToggling}

      />
    </div>
  );
}
