"use client";

import { useMemo, useState } from "react";
import { Users, UserPlus } from "lucide-react";
import { Button } from "@ui/button";

import { PageHeader } from "@/components/features/app-shell/page-header";
import { UserKpiCards, UserTable, CreateUserModal } from "@/components/features/users";
import { useAuth } from "@/contexts/AuthContext";
import { useUsers } from "@/hooks/users";
import { useLocale } from "@/providers/locale-provider";

export default function UsersContent() {
  const { t } = useLocale();
  const { user } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Hook lấy số lượng thống kê người dùng cho Bento Console
  const { data: usersData, isLoading: isLoadingKpi } = useUsers({
    page: 1,
    limit: 50,
  });

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

      {/* 2. User KPI Stats (Dòng 4: Bố cục Bento Console Bất Đối Xứng) */}
      <UserKpiCards
        users={usersData?.data ?? []}
        totalCount={usersData?.meta?.total}
        loading={isLoadingKpi}
      />

      {/* 3. Neumorphic Data Table với đầy đủ tính năng */}
      <UserTable variant="soft" />

      {/* Modal Thêm Người Dùng kích hoạt từ Header Action */}
      <CreateUserModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />
    </div>
  );
}
