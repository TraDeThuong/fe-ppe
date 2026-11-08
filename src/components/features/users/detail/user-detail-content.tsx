"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/providers/locale-provider";
import { useUserDetail } from "@/hooks/users";
import { useSitesCatalog } from "@/hooks/sites";
import { useIncidents } from "@/hooks/incidents";
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
import type { IncidentItem, SiteItem, UserResponseDto } from "@/types";

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
    const t = searchParams.get("tab");
    if (t) {
      setActiveTab(resolveTab(t));
    }
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

  // Incidents query: get recent incidents across system to correlate on client
  const { data: rawIncidentsData, isLoading: isLoadingIncidents } = useIncidents({
    limit: 100,
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

  // Correlate user's assigned sites
  const userSites = useMemo(() => {
    if (!user?.siteIds || user.siteIds.length === 0) return [];
    const siteIdSet = new Set(user.siteIds);
    return allSites.filter((s) => siteIdSet.has(s.id));
  }, [user?.siteIds, allSites]);

  // Client-Side Correlation & Filtering of Incidents
  // Matches incidents where:
  // 1. User is explicitly assigned in assignments (assignedTo === userId)
  // 2. OR incident occurred at a site where this user is assigned
  const userIncidents = useMemo<IncidentItem[]>(() => {
    const allInc = rawIncidentsData?.items || [];
    if (!user) return [];

    const userSiteIdsSet = new Set(user.siteIds || []);

    const matched = allInc.filter((inc) => {
      // 1. Direct assignment match
      const hasDirectAssignment = inc.assignments?.some(
        (a) => a.assignedTo === user.id || a.assignedToEmail === user.email,
      );
      if (hasDirectAssignment) return true;

      // 2. Site responsibility match
      if (userSiteIdsSet.has(inc.siteId)) return true;

      return false;
    });

    return matched;
  }, [rawIncidentsData?.items, user]);

  // KPI & Analytics Calculations
  const stats = useMemo(() => {
    const total = userIncidents.length;
    const resolved = userIncidents.filter(
      (i) => i.status === "RESOLVED" || i.status === "CLOSED",
    ).length;
    const pending = total - resolved;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    // MTTR in hours
    let totalResolveDurationHours = 0;
    let resolvedWithDurationCount = 0;
    let slaComplianceCount = 0;

    userIncidents.forEach((inc) => {
      if ((inc.status === "RESOLVED" || inc.status === "CLOSED") && inc.resolvedAt) {
        const start = new Date(inc.detectedAt).getTime();
        const end = new Date(inc.resolvedAt).getTime();
        const diffHours = (end - start) / (1000 * 60 * 60);

        if (diffHours >= 0 && diffHours < 720) {
          totalResolveDurationHours += diffHours;
          resolvedWithDurationCount += 1;

          // Benchmark: Critical < 2h, Others < 24h
          const maxAllowed = inc.severity === "CRITICAL" ? 2 : 24;
          if (diffHours <= maxAllowed) {
            slaComplianceCount += 1;
          }
        }
      }
    });

    const avgMttr =
      resolvedWithDurationCount > 0
        ? Math.round((totalResolveDurationHours / resolvedWithDurationCount) * 10) / 10
        : 0;

    const slaRate =
      resolvedWithDurationCount > 0
        ? Math.round((slaComplianceCount / resolvedWithDurationCount) * 100)
        : 0;

    let tier: "EXCELLENT" | "GOOD" | "AVERAGE" | "NEEDS_IMPROVEMENT" | "UNRATED" = "UNRATED";
    if (total === 0) {
      tier = "UNRATED";
    } else if (resolutionRate >= 90 && (slaRate >= 85 || resolvedWithDurationCount === 0)) {
      tier = "EXCELLENT";
    } else if (resolutionRate >= 75) {
      tier = "GOOD";
    } else {
      tier = "NEEDS_IMPROVEMENT";
    }

    return {
      totalIncidents: total,
      resolvedIncidents: resolved,
      pendingIncidents: pending,
      resolutionRate,
      mttrHours: avgMttr,
      slaComplianceRate: slaRate,
      performanceTier: tier,
    };
  }, [userIncidents]);

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
        loading={isLoadingUser}
        assignedSitesCount={userSites.length}
        totalIncidents={stats.totalIncidents}
        resolvedIncidents={stats.resolvedIncidents}
        pendingIncidents={stats.pendingIncidents}
        resolutionRate={stats.resolutionRate}
        mttrHours={stats.mttrHours}
        slaComplianceRate={stats.slaComplianceRate}
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
                onOpenAssignSites={() => setIsAssignSitesOpen(true)}
              />
            )}

            {activeTab === "incidents" && user && (
              <UserIncidentsTab
                user={user}
                incidents={userIncidents}
            userSites={userSites}
            isLoading={isLoadingIncidents}
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
