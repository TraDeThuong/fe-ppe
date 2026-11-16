"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/providers/locale-provider";
import { useUserDetail } from "@/hooks/users";
import { useSitesCatalog } from "@/hooks/sites";
import { useCamerasCatalog } from "@/hooks/cameras";
import { incidentKeys } from "@/hooks/incidents";
import { incidentService } from "@/services/incident.service";
import { collectCatalog } from "@/lib/table-utils";
import {
  computeUserIncidentStats,
  correlateUserIncidents,
  getUserAssignedSites,
} from "./user-detail-utils";
import { UserDetailHero } from "./user-detail-hero";
import { UserDetailKpiBar } from "./user-detail-kpi-bar";
import { UserDetailTabs, type UserDetailTabKey } from "./user-detail-tabs";
import {
  UserOverviewTab,
  UserSitesTab,
  UserIncidentsTab,
  UserPerformanceTab,
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
import type { CameraItem, IncidentItem, SiteItem } from "@/types";

export interface UserDetailContentProps {
  userId: string;
}

export function UserDetailContent({ userId }: UserDetailContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  // Tab Sync with URL Search Params
  const resolveTab = (tabStr: string | null): UserDetailTabKey => {
    if (!tabStr) return "overview";
    if (tabStr === "sites") return "sites";
    if (tabStr === "incidents") return "incidents";
    if (tabStr === "performance") return "performance";
    if (tabStr === "sessions") return "sessions";
    if (tabStr === "audit") return "audit";
    return "overview";
  };

  const [activeTab, setActiveTab] = useState<UserDetailTabKey>(resolveTab(searchParams.get("tab")));

  useEffect(() => {
    setActiveTab(resolveTab(searchParams.get("tab")));
  }, [searchParams]);

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

  const { data: allSites = [], isLoading: isLoadingSites } = useSitesCatalog();
  const { data: allCameras = [] } = useCamerasCatalog();

  // Correlate user's assigned sites from both user.siteIds and site.contactOfficers[].userId
  const {
    userSites,
    explicitSiteIdSet,
    contactOfficerSiteIdSet,
    combinedSiteIdSet,
  } = useMemo(() => getUserAssignedSites(user, allSites), [user, allSites]);

  const siteIdsKey = useMemo(
    () => Array.from(combinedSiteIdSet).sort().join(","),
    [combinedSiteIdSet],
  );

  // Query incidents scoped by the user's assigned sites when available, avoiding the global 100-item truncation
  const { data: rawIncidents = [], isLoading: isLoadingIncidents } = useQuery<IncidentItem[], Error>({
    queryKey: [...incidentKeys.lists(), "user-correlated", userId, siteIdsKey],
    enabled: Boolean(user) && !isLoadingSites,
    staleTime: 15 * 1000,
    queryFn: async () => {
      const siteIds = Array.from(combinedSiteIdSet);
      if (siteIds.length > 0 && siteIds.length <= 5) {
        const pages = await Promise.all(
          siteIds.map((siteId) =>
            collectCatalog((page, limit) =>
              incidentService.getIncidents({ siteId, page, limit }),
            ),
          ),
        );
        const deduped = new Map<string, IncidentItem>();
        for (const list of pages) {
          for (const item of list) {
            deduped.set(item.id, item);
          }
        }
        return Array.from(deduped.values()).sort(
          (a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime(),
        );
      }

      if (siteIds.length > 5) {
        return collectCatalog((page, limit) =>
          incidentService.getIncidents({ page, limit }),
        );
      }

      const firstPage = await incidentService.getIncidents({ page: 1, limit: 100 });
      return firstPage.items;
    },
  });

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

  const siteMap = useMemo(() => {
    const map = new Map<string, SiteItem>();
    for (const s of allSites) map.set(s.id, s);
    return map;
  }, [allSites]);

  const cameraMap = useMemo(() => {
    const map = new Map<string, CameraItem>();
    for (const c of allCameras) map.set(c.id, c);
    return map;
  }, [allCameras]);

  // Client-Side Correlation & Enrichment of Incidents
  const userIncidents = useMemo<IncidentItem[]>(
    () => correlateUserIncidents(rawIncidents, user, combinedSiteIdSet, siteMap, cameraMap),
    [rawIncidents, user, combinedSiteIdSet, siteMap, cameraMap],
  );

  // KPI & Analytics Calculations
  const stats = useMemo(() => computeUserIncidentStats(userIncidents), [userIncidents]);

  const isLoadingMetrics = isLoadingUser || isLoadingSites || isLoadingIncidents;

  // Error / Not found state (chỉ hiện khi đã tải xong nhưng lỗi)
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

      {/* 2. Quick Executive KPI Metrics Bar */}
      <UserDetailKpiBar
        loading={isLoadingMetrics}
        assignedSitesCount={userSites.length}
        totalIncidents={stats.totalIncidents}
        resolvedIncidents={stats.resolvedIncidents}
        dismissedIncidents={stats.dismissedIncidents}
        pendingIncidents={stats.pendingIncidents}
        resolutionRate={stats.resolutionRate}
        mttrHours={stats.mttrHours}
        slaComplianceRate={stats.slaComplianceRate}
        hasSlaData={stats.hasSlaData}
        performanceTier={stats.performanceTier}
        onSelectTab={handleTabChange}
      />

      {/* 3. Navigation Tabs */}
      <UserDetailTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        sitesCount={userSites.length}
        incidentsCount={stats.totalIncidents}
        pendingIncidentsCount={stats.pendingIncidents}
        completionRate={stats.resolutionRate}
        performanceTier={stats.performanceTier}
      />

      {/* 4. Tab Content Area */}
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
                sites={allSites}
                userSites={userSites}
                incidents={userIncidents}
                stats={stats}
                onSelectTab={handleTabChange}
                onEditClick={() => setIsEditOpen(true)}
                onAssignSitesClick={() => setIsAssignSitesOpen(true)}
              />
            )}

            {activeTab === "sites" && user && (
              <UserSitesTab
                user={user}
                userSites={userSites}
                allSites={allSites}
                explicitSiteIdSet={explicitSiteIdSet}
                contactOfficerSiteIdSet={contactOfficerSiteIdSet}
                onOpenAssignSites={() => setIsAssignSitesOpen(true)}
              />
            )}

            {activeTab === "incidents" && user && (
              <UserIncidentsTab
                user={user}
                incidents={userIncidents}
                userSites={userSites}
                isLoading={isLoadingSites || isLoadingIncidents}
              />
            )}

        {activeTab === "performance" && user && (
          <UserPerformanceTab
            user={user}
            incidents={userIncidents}
            stats={stats}
          />
        )}

        {activeTab === "sessions" && user && <UserSessionsTab user={user} />}

        {activeTab === "audit" && user && <UserAuditTab user={user} />}
          </>
        )}
      </div>

      {/* 5. Modals Management */}
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
      />
    </div>
  );
}
