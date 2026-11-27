"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/providers/locale-provider";
import { useCan } from "@/hooks/use-can";
import { useUserDetail } from "@/hooks/users";
import { useSitesCatalog } from "@/hooks/sites";
import { getUserAssignedSites } from "./user-detail-utils";
import { UserDetailHero } from "./user-detail-hero";
import { UserDetailTabs, type UserDetailTabKey } from "./user-detail-tabs";
import {
  UserOverviewTab,
  UserSitesTab,
  UserSessionsTab,
  UserAuditTab,
} from "./tabs";
import {
  EditUserModal,
  AssignUserRoleModal,
  AssignUserSitesModal,
  AdminResetPasswordModal,
  ConfirmUserDeleteModal,
} from "../modals";

export interface UserDetailContentProps {
  userId: string;
}

export function UserDetailContent({ userId }: UserDetailContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const can = useCan();
  const canUpdate = can("USER_UPDATE");
  const canReadSites = can("PPE_SITE_READ");
  const canReadIncidents = can("PPE_INCIDENT_READ");
  const canReadAudit = can("AUDIT_LOG_READ");

  // Tab Sync with URL Search Params (guarded by RBAC visibility)
  const resolveTab = (tabStr: string | null): UserDetailTabKey => {
    if (tabStr === "sites" && canReadSites) return "sites";
    if (tabStr === "sessions") return "sessions";
    if (tabStr === "audit" && canReadAudit) return "audit";
    return "overview";
  };

  const [activeTab, setActiveTab] = useState<UserDetailTabKey>(
    resolveTab(searchParams.get("tab")),
  );

  useEffect(() => {
    setActiveTab(resolveTab(searchParams.get("tab")));
  }, [searchParams, canReadSites, canReadAudit]);

  const handleTabChange = (tab: UserDetailTabKey) => {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("tab", tab);
    router.replace(`?${newParams.toString()}`, { scroll: false });
  };

  // Queries
  const {
    data: user,
    isLoading: isLoadingUser,
    isError: isUserError,
    error: userError,
    refetch: refetchUser,
  } = useUserDetail(userId);

  const { data: allSites = [] } = useSitesCatalog({
    enabled: Boolean(user) && canReadSites,
  });

  // Correlate user's assigned sites from both user.siteIds and site.contactOfficers[].userId
  const {
    userSites,
    explicitSiteIdSet,
    contactOfficerSiteIdSet,
  } = useMemo(() => getUserAssignedSites(user, allSites), [user, allSites]);

  // Modals state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAssignRoleOpen, setIsAssignRoleOpen] = useState(false);
  const [isAssignSitesOpen, setIsAssignSitesOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [deleteModalState, setDeleteModalState] = useState<{
    open: boolean;
    mode: "delete" | "restore" | "activate" | "deactivate";
  }>({
    open: false,
    mode: "delete",
  });

  // Error / Not found state
  if (!isLoadingUser && (isUserError || !user)) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-3xl border border-border/40 bg-surface p-8 text-center">
        <AlertTriangle className="size-12 text-warning" />
        <h3 className="text-lg font-bold text-foreground">
          {isVietnamese
            ? `Không tìm thấy người dùng #${userId.slice(0, 8)}`
            : `User #${userId.slice(0, 8)} not found`}
        </h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {userError instanceof Error
            ? userError.message
            : isVietnamese
              ? "Tài khoản có thể đã bị xóa vĩnh viễn hoặc đường dẫn không hợp lệ."
              : "User account may have been permanently deleted or invalid ID."}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <Button variant="outline" onClick={() => refetchUser()} className="gap-2">
            <RefreshCw className="size-4" />
            <span>{isVietnamese ? "Thử lại" : "Retry"}</span>
          </Button>
          <Button variant="ghost" onClick={() => router.push("/users")} className="gap-2">
            <ArrowLeft className="size-4" />
            <span>{isVietnamese ? "Về danh sách người dùng" : "Back to users list"}</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header & Hero Profile */}
      <UserDetailHero
        user={user}
        loading={isLoadingUser}
        onEditClick={() => setIsEditOpen(true)}
        onAssignRoleClick={() => setIsAssignRoleOpen(true)}
        onAssignSitesClick={() => setIsAssignSitesOpen(true)}
        onResetPasswordClick={() => setIsResetPasswordOpen(true)}
        onDeleteClick={(mode) => setDeleteModalState({ open: true, mode })}
      />

      {/* 2. Navigation Tabs (filtered by RBAC permissions) */}
      <UserDetailTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        sitesCount={canReadSites ? userSites.length : (user?.siteIds?.length ?? 0)}
        canReadSites={canReadSites}
        canReadAudit={canReadAudit}
      />

      {/* 3. Tab Content Area */}
      <div className="min-h-[400px]">
        {isLoadingUser ? (
          <div className="space-y-4 rounded-3xl border border-white/80 bg-background p-6 shadow-nm dark:border-white/5 dark:bg-card">
            <div className="flex items-center justify-between border-b border-[var(--shadow-dark)]/10 pb-4">
              <Skeleton className="h-6 w-48 rounded-lg" />
              <Skeleton className="h-8 w-24 rounded-xl" />
            </div>
            <Skeleton className="h-32 w-full rounded-2xl" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
            </div>
          </div>
        ) : (
          <>
            {activeTab === "overview" && user && (
              <UserOverviewTab
                user={user}
                userSites={userSites}
                canReadSites={canReadSites}
                canReadIncidents={canReadIncidents}
                onSelectTab={handleTabChange}
                onEditClick={canUpdate && !user.deletedAt ? () => setIsEditOpen(true) : undefined}
                onAssignSitesClick={
                  canUpdate && !user.deletedAt ? () => setIsAssignSitesOpen(true) : undefined
                }
              />
            )}

            {activeTab === "sites" && canReadSites && user && (
              <UserSitesTab
                user={user}
                userSites={userSites}
                allSites={allSites}
                explicitSiteIdSet={explicitSiteIdSet}
                contactOfficerSiteIdSet={contactOfficerSiteIdSet}
                onOpenAssignSites={
                  canUpdate && !user.deletedAt ? () => setIsAssignSitesOpen(true) : undefined
                }
              />
            )}

            {activeTab === "sessions" && user && <UserSessionsTab user={user} />}

            {activeTab === "audit" && canReadAudit && user && <UserAuditTab user={user} />}
          </>
        )}
      </div>

      {/* 4. Modals Management */}
      <EditUserModal
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        user={user ?? null}
      />

      <AssignUserRoleModal
        open={isAssignRoleOpen}
        onOpenChange={setIsAssignRoleOpen}
        user={user ?? null}
      />

      <AssignUserSitesModal
        open={isAssignSitesOpen}
        onOpenChange={setIsAssignSitesOpen}
        user={user ?? null}
      />

      <AdminResetPasswordModal
        open={isResetPasswordOpen}
        onOpenChange={setIsResetPasswordOpen}
        user={user ?? null}
      />

      <ConfirmUserDeleteModal
        open={deleteModalState.open}
        onClose={() => setDeleteModalState((prev) => ({ ...prev, open: false }))}
        user={user ?? null}
        mode={deleteModalState.mode}
        onSuccess={(completedMode) => {
          if (completedMode === "delete") {
            router.replace("/users");
          }
        }}
      />
    </div>
  );
}
