"use client";

import { useMemo, useState } from "react";
import { Users, UserPlus } from "lucide-react";
import { Button } from "@ui/button";

import { PageHeader } from "@/components/features/app-shell/page-header";
import { UserKpiCards, UserTable } from "@/components/features/users";
import { useAuth } from "@/contexts/AuthContext";
import { useUsers, useUserSummary } from "@/hooks/users";
import { useLocale } from "@/providers/locale-provider";

export default function UsersContent() {
  const { t } = useLocale();
  const { user } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Hook lấy số lượng thống kê người dùng tổng quan toàn hệ thống
  const { data: summaryData, isLoading: isLoadingSummary } = useUserSummary();

  // Fallback pagination query nếu summary chưa có
  const { data: usersData, isLoading: isLoadingUsers } = useUsers({
    page: 1,
    limit: 10,
  });

  const handleSelectKpiFilter = (type: "all" | "active" | "twoFactor" | "locked") => {
    if (type === "all") setStatusFilter("all");
    else if (type === "active") setStatusFilter(prev => prev === "active" ? "all" : "active");
  };

  const canCreateUser = useMemo(() => {
    return user?.role === "ADMIN" || user?.permissions?.includes("USER_CREATE");
  }, [user]);

  const breadcrumbs = useMemo(
    () => [
      { label: t("common.breadcrumb.home"), href: "/dashboard" },
      { label: t("nav.users") },
    ],
    [t],
  );

  const headerActions = canCreateUser ? (
    <Button

      variant="primary"

      size="md"

      className="gap-2 shadow-nm-sm hover:shadow-nm"

      onClick={() => setIsCreateOpen(true)}

    >
      <UserPlus className="h-4 w-4" />
      <span>{t("users.create")}</span>
    </Button>
  ) : null;

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Page Header */}
      <PageHeader

        icon={Users}

        title={t("users.title")}

        description={t("users.description")}

        badge={t("users.badge")}

        badgeIcon={Users}

        breadcrumbs={breadcrumbs}

        actions={headerActions}

      />

      {/* 2. User KPI Stats (Dòng 4: Bố cục Bento Console Bất Đối Xứng - Kết nối bộ lọc) */}
      <UserKpiCards

        stats={summaryData}

        users={usersData?.data ?? []}

        totalCount={summaryData?.total ?? usersData?.meta?.total}

        loading={isLoadingSummary || isLoadingUsers}

        onSelectFilter={handleSelectKpiFilter}

      />

      {/* 3. Neumorphic Data Table với đầy đủ tính năng & liên kết bộ lọc */}
      <UserTable

        variant="soft"

        statusFilter={statusFilter}

        onStatusFilterChange={setStatusFilter}

        isCreateOpen={isCreateOpen}

        onOpenCreateChange={setIsCreateOpen}

      />
    </div>
  );
}
