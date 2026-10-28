"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RefreshCw, ScrollText, Settings2, ShieldAlert } from "lucide-react";
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

export default function SystemContent() {
  const { t } = useLocale();
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

  // State tìm kiếm và lọc danh mục
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const debouncedSearch = useDebounce(search, 300);

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
  const { data: configsData, isLoading: isLoadingConfigs } = useSystemConfigs({
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
      toast.error("Bạn không có quyền thay đổi công tắc tính năng hệ thống.");
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
        `Tính năng ${flag.key} hiện đang ở trạng thái: ${enabled ? "BẬT" : "TẮT"}`,
      );
    } catch {
      toast.error("Không thể thay đổi trạng thái lúc này. Vui lòng thử lại.");
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
    toast.success(`Đã tạo biến cấu hình ${payload.key}`);
  };

  const handleSaveEdit = async (
    key: string,
    payload: Parameters<typeof updateConfig>[0]["payload"],
  ) => {
    await updateConfig({ key, payload });
    toast.success(`Đã cập nhật biến cấu hình ${key}`);
  };

  const handleConfirmDelete = async (key: string) => {
    await deleteConfig(key);
    toast.success(`Biến cấu hình ${key} đã được xóa thành công.`);
  };

  const breadcrumbs = useMemo(
    () => [
      { label: t("common.breadcrumb.home") || "Trang chủ", href: "/dashboard" },
      { label: t("nav.system") || "Cấu hình Hệ thống" },
    ],
    [t],
  );

  const headerActions = (
    <div className="flex items-center gap-2.5">
      <Link href="/audit-logs?search=SYSTEM_CONFIG">
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5 rounded-xl text-xs"
        >
          <ScrollText className="h-4 w-4 text-muted-foreground" />
          <span>Nhật ký Cấu hình</span>
        </Button>
      </Link>

      <Button
        variant="outline"
        size="sm"
        onClick={() => refetchHealth()}
        disabled={isRefreshingHealth}
        className="flex items-center gap-1.5 rounded-xl text-xs"
      >
        <RefreshCw className={`h-4 w-4 ${isRefreshingHealth ? "animate-spin" : ""}`} />
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
        badge={canManage ? t("system.badge") : "Chỉ xem (Read-only)"}
        badgeIcon={Settings2}
        breadcrumbs={breadcrumbs}
        actions={headerActions}
      />

      {/* Thông báo chế độ Read-only cho Safety Manager / người dùng không có quyền Manage */}
      {!canManage && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-700 dark:text-amber-400 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.05)]">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <div className="text-xs">
            <p className="font-semibold">Chế độ Chỉ xem (Read-only Mode)</p>
            <p className="text-muted-foreground mt-0.5">
              Bạn có quyền xem thông số hệ thống nhưng không thể thay đổi giá trị cấu hình hoặc gạt công tắc tính năng. Liên hệ Quản trị viên (ADMIN) nếu cần cấp quyền.
            </p>
          </div>
        </div>
      )}

      {/* 2. Bento Console KPI Summary */}
      <SystemKpiSummary
        totalConfigs={totalConfigsCount}
        healthReport={healthReport}
        activeFlagsCount={activeFlagsCount}
        loading={isLoadingConfigs || isLoadingFlags}
        activeTab={activeTab}
        onSelectTab={handleTabChange}
      />

      {/* 3. Neumorphic Tabs */}
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
          <SystemConfigToolbar
            search={search}
            onSearchChange={handleSearchChange}
            category={category}
            onCategoryChange={handleCategoryChange}
            onAddConfig={() => setCreateModalOpen(true)}
            canManage={canManage}
          />

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
