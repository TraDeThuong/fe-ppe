"use client";

import { useMemo, useState } from "react";
import { Settings2 } from "lucide-react";

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
  type SystemTabKey,
} from "@/components/features/system";
import {
  useDebounce,
  useFeatureFlags,
  useSystemConfigs,
  useSystemHealth,
  useSystemMutations,
} from "@/hooks";
import { useLocale } from "@/providers/locale-provider";
import { toast } from "@/lib/toast";
import type { SystemConfigItem } from "@/types";

export default function SystemContent() {
  const { t } = useLocale();

  const [activeTab, setActiveTab] = useState<SystemTabKey>("flags");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<SystemConfigItem | null>(null);

  // Data queries
  const { data: configsData, isLoading: isLoadingConfigs } = useSystemConfigs({
    search: debouncedSearch || undefined,
    category: category || undefined,
    limit: 50,
  });

  const {
    data: featureFlags = [],
    isLoading: isLoadingFlags,
    toggleFlag,
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
  const handleToggleFlag = async (flag: SystemConfigItem, enabled: boolean) => {
    try {
      await toggleFlag({ key: flag.key, payload: { enabled } });
      toast.success(`Tính năng ${flag.key} hiện đang ở trạng thái: ${enabled ? "BẬT" : "TẮT"}`);
    } catch {
      toast.error("Không thể thay đổi trạng thái lúc này. Vui lòng thử lại.");
    }
  };

  const handleOpenEdit = (config: SystemConfigItem) => {
    setSelectedConfig(config);
    setEditModalOpen(true);
  };

  const handleOpenDelete = (config: SystemConfigItem) => {
    setSelectedConfig(config);
    setDeleteModalOpen(true);
  };

  const handleSaveCreate = async (payload: Parameters<typeof createConfig>[0]) => {
    await createConfig(payload);
    toast.success(`Đã tạo biến cấu hình ${payload.key}`);
  };

  const handleSaveEdit = async (key: string, payload: Parameters<typeof updateConfig>[0]["payload"]) => {
    await updateConfig({ key, payload });
    toast.success(`Đã cập nhật biến cấu hình ${key}`);
  };

  const handleConfirmDelete = async (key: string) => {
    await deleteConfig(key);
    toast.success(`Biến cấu hình ${key} đã được xóa thành công.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Settings2}
        title={t("system.title")}
        description={t("system.description")}
        badge={t("system.badge")}
        badgeIcon={Settings2}
      />

      <SystemKpiSummary
        totalConfigs={totalConfigsCount}
        healthReport={healthReport}
        activeFlagsCount={activeFlagsCount}
        loading={isLoadingConfigs || isLoadingFlags}
      />

      <SystemTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        flagsCount={featureFlags.length}
        configsCount={totalConfigsCount}
      />

      {/* Tab 1: Feature Flags */}
      {activeTab === "flags" && (
        <FeatureFlagsTab
          flags={featureFlags}
          onToggle={handleToggleFlag}
          loading={isLoadingFlags}
        />
      )}

      {/* Tab 2: System Configs */}
      {activeTab === "configs" && (
        <div className="space-y-4">
          <SystemConfigToolbar
            search={search}
            onSearchChange={setSearch}
            category={category}
            onCategoryChange={setCategory}
            onAddConfig={() => setCreateModalOpen(true)}
          />

          <SystemConfigTable
            items={configsData?.items ?? []}
            onEdit={handleOpenEdit}
            onDelete={handleOpenDelete}
            loading={isLoadingConfigs}
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
      {activeTab === "platform" && <SystemInfoPanel />}

      {/* Modals */}
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
    </div>
  );
}
