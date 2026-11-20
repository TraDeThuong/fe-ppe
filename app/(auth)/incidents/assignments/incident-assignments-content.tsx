"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useSite } from "@/contexts/SiteContext";
import {
  useBatchReviewIncidents,
  useCloseIncident,
  useHydratedIncidents,
  useIncidents,
  useReviewIncident,
} from "@/hooks/incidents";
import { incidentKeys } from "@/hooks/incidents/incident.query-keys";
import { useNotifications } from "@/hooks/notifications";
import { reportingKeys } from "@/hooks/reporting/reporting.query-keys";
import { useCan } from "@/hooks/use-can";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { useLocale } from "@/providers/locale-provider";
import { IncidentDispatchResultPanel } from "@/components/features/incidents/incident-dispatch-result-panel";
import {
  AdminOversightWorkspace,
  AssignmentConsoleHeader,
  AssignmentKpiSummary,
  AssignmentModals,
  ManagerDispatchWorkspace,
  OfficerTasksWorkspace,
  type AdminGroupMode,
  type AssignmentRoleView,
  type CategorizedAssignments,
  type DispatchedGroupView,
  type ManagerTabKey,
  type OfficerTabKey,
} from "@/components/features/incidents/assignments";
import {
  dispatchIncidentsWithSignal,
  resolveIncidentsWithReport,
  type DispatchIncidentsResult,
} from "@/lib/incident-actions";
import {
  isGroupIncidentResolved,
  notificationIncidentTarget,
} from "@/lib/incident-group";
import {
  groupIncidentsByCamera,
  groupIncidentsByResponsibility,
  groupIncidentsBySiteResponsibility,
  isIncidentAssignedToUser,
  resolveIncidentResponsibility,
  runInBatches,
} from "@/lib/incident-workflow";
import { incidentService } from "@/services/incident.service";
import { toast } from "@/lib/toast";
import type { IncidentItem } from "@/types";

export default function IncidentAssignmentsContent() {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { lastAlert, isConnected } = useRealtime();
  const { siteId: globalSiteId, setSiteId: setGlobalSiteId } = useSite();
  const can = useCan();

  const role = (user?.role || "").toUpperCase();
  const isAdminRole = role === "ADMIN" || role === "SUPER_ADMIN";
  const isOfficerRole = role === "SAFETY_OFFICER";
  const roleView: AssignmentRoleView = isAdminRole
    ? "ADMIN"
    : isOfficerRole
      ? "SAFETY_OFFICER"
      : "SAFETY_MANAGER";

  // Navigation & filter states
  const [adminInterventionMode, setAdminInterventionMode] = useState(false);
  const [adminGroupMode, setAdminGroupMode] =
    useState<AdminGroupMode>("responsibility");
  const [managerTab, setManagerTab] = useState<ManagerTabKey>("triage");
  const [officerTab, setOfficerTab] = useState<OfficerTabKey>("pending");
  const [siteFilter, setSiteFilter] = useState<string>(globalSiteId || "");
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if ((globalSiteId || "") !== siteFilter) {
      setSiteFilter(globalSiteId || "");
    }
  }, [globalSiteId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSiteChange = (nextSiteId: string) => {
    setSiteFilter(nextSiteId);
    setGlobalSiteId(nextSiteId || null);
    setSelectedIds(new Set());
  };

  const { sites, getSiteName, getCameraCode, getCameraName } =
    useEntityLookup();

  // Lấy tối đa 100 sự cố mới nhất theo công trường (chia sẻ React Query cache với /incidents)
  const {
    data: incidentsData,
    isLoading,
    isRefetching,
    refetch,
  } = useIncidents({
    page: 1,
    limit: 100,
    siteId: siteFilter || undefined,
    sortBy: "detectedAt",
    sortOrder: "desc",
  });

  const rawIncidents = useMemo(
    () => incidentsData?.items ?? [],
    [incidentsData?.items],
  );

  const {
    incidents,
    isHydratingAssignments,
    usersById,
    siteManagersBySiteId,
  } = useHydratedIncidents(rawIncidents, {
    includeClosed: isOfficerRole,
  });

  const canReadNotifications = can("NOTIFICATION_READ");
  const { data: notificationsData, refetch: refetchNotifications } =
    useNotifications(
      { page: 1, limit: 100, channel: "IN_APP" },
      { enabled: canReadNotifications },
    );

  // Tự động làm mới khi có SSE event (debounce 1.5s để tránh bão request khi AI phát hiện liên tiếp)
  useEffect(() => {
    if (!lastAlert) return;
    if (
      lastAlert.type === "notification:ppe_violation" ||
      lastAlert.type === "notification:new"
    ) {
      const timer = setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
        void queryClient.invalidateQueries({
          queryKey: incidentKeys.statusCountsRoot(),
        });
        if (canReadNotifications) {
          void refetchNotifications();
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [lastAlert, queryClient, refetchNotifications, canReadNotifications]);

  // Chỉ invalidate danh sách, bộ đếm & đúng các incidentId vừa thay đổi thay vì xóa sạch cache assignments của toàn bộ 100 sự cố
  const invalidateAll = (affectedIds?: readonly string[]) => {
    void queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
    void queryClient.invalidateQueries({
      queryKey: incidentKeys.statusCountsRoot(),
    });
    void queryClient.invalidateQueries({ queryKey: reportingKeys.all });
    if (affectedIds?.length) {
      for (const id of affectedIds) {
        void queryClient.invalidateQueries({
          queryKey: incidentKeys.assignments(id),
        });
        void queryClient.invalidateQueries({
          queryKey: incidentKeys.detail(id),
        });
      }
    }
    if (canReadNotifications) {
      void refetchNotifications();
    }
  };

  // Formatters & Responsibility context
  const resolveCameraLabel = (inc: IncidentItem) => {
    const code = inc.cameraCode || getCameraCode(inc.cameraId);
    const name = inc.cameraName || getCameraName(inc.cameraId);
    return name && name !== code
      ? `${code} (${name})`
      : code || inc.cameraId.slice(0, 8);
  };

  const resolveSiteLabel = (sid: string, fallback?: string) =>
    fallback || getSiteName(sid);

  const formatViolation = (type: string) => {
    switch (type) {
      case "NO_HELMET":
        return t("incidents.violation.noHelmet");
      case "NO_VEST":
        return t("incidents.violation.noVest");
      case "RESTRICTED_AREA":
        return t("incidents.violation.restrictedArea");
      case "MULTI_VIOLATION":
        return t("incidents.violation.multi");
      default:
        return type;
    }
  };

  const formatters = useMemo(
    () => ({ resolveSiteLabel, resolveCameraLabel, formatViolation }),
    [getSiteName, getCameraCode, getCameraName, t], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const responsibilityContext = useMemo(
    () => ({
      siteManagersBySiteId,
      usersById,
      resolveSiteName: resolveSiteLabel,
      resolveCameraLabel,
    }),
    [siteManagersBySiteId, usersById, getSiteName, getCameraCode, getCameraName], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Phân loại sự cố theo từng bước quy trình & trách nhiệm
  const categorized = useMemo<CategorizedAssignments>(() => {
    const pendingReview: IncidentItem[] = [];
    const unassignedConfirmed: IncidentItem[] = [];
    const assignedConfirmed: IncidentItem[] = [];
    const awaitingAcceptance: IncidentItem[] = [];
    const closedOrDismissed: IncidentItem[] = [];
    const myActiveConfirmed: IncidentItem[] = [];
    const myCompleted: IncidentItem[] = [];

    for (const inc of incidents) {
      const resp = resolveIncidentResponsibility(inc, responsibilityContext);
      if (resp.phase === "AWAITING_MANAGER_REVIEW") {
        pendingReview.push(inc);
      } else if (resp.phase === "AWAITING_MANAGER_DISPATCH") {
        unassignedConfirmed.push(inc);
      } else if (resp.phase === "OFFICER_REMEDIATING") {
        assignedConfirmed.push(inc);
      } else if (resp.phase === "AWAITING_MANAGER_ACCEPTANCE") {
        awaitingAcceptance.push(inc);
      } else {
        closedOrDismissed.push(inc);
      }

      if (user?.id) {
        const isMineActive = isIncidentAssignedToUser(inc, user.id);
        const wasMine =
          isMineActive ||
          resp.assignedOfficerId === user.id ||
          (inc.assignments ?? []).some((a) => a.assignedTo === user.id);

        if (inc.status === "CONFIRMED" && isMineActive) {
          myActiveConfirmed.push(inc);
        } else if (
          wasMine &&
          (inc.status === "RESOLVED" || inc.status === "CLOSED")
        ) {
          myCompleted.push(inc);
        }
      }
    }

    return {
      pendingReview,
      unassignedConfirmed,
      triageItems: [...pendingReview, ...unassignedConfirmed],
      assignedConfirmed,
      awaitingAcceptance,
      closedOrDismissed,
      myActiveConfirmed,
      myCompleted,
    };
  }, [incidents, responsibilityContext, user?.id]);

  // Trích xuất các Nhóm điều phối (IncidentGroupContext) từ thông báo [ĐIỀU PHỐI]
  const dispatchedGroups = useMemo<DispatchedGroupView[]>(() => {
    const rawNotifications = notificationsData?.data ?? [];
    const groupMap = new Map<string, DispatchedGroupView>();
    const incidentById = new Map(incidents.map((i) => [i.id, i]));

    for (const notif of rawNotifications) {
      const target = notificationIncidentTarget({
        incidentId: notif.incidentId,
        content: notif.content,
      });
      if (!target.group) continue;
      const grp = target.group;
      if (isOfficerRole && user?.id && grp.assignedTo !== user.id) continue;
      if (groupMap.has(grp.groupId)) continue;

      const memberIncidents = grp.incidentIds
        .map((id) => incidentById.get(id))
        .filter((item): item is IncidentItem => Boolean(item));

      const resolvedCount = memberIncidents.filter((item) =>
        isGroupIncidentResolved(item),
      ).length;

      const remainingEditableItems = memberIncidents.filter(
        (item) =>
          item.status === "CONFIRMED" &&
          (!isOfficerRole || !user?.id || isIncidentAssignedToUser(item, user.id)),
      );

      groupMap.set(grp.groupId, {
        group: grp,
        message: target.content,
        memberIncidents,
        resolvedCount,
        remainingEditableItems,
      });
    }

    return Array.from(groupMap.values());
  }, [notificationsData?.data, incidents, isOfficerRole, user?.id]);

  // Dữ liệu gom nhóm cho ADMIN & Stats
  const responsibilityGroups = useMemo(
    () => groupIncidentsByResponsibility(incidents, responsibilityContext),
    [incidents, responsibilityContext],
  );
  const siteGroups = useMemo(
    () => groupIncidentsBySiteResponsibility(incidents, responsibilityContext),
    [incidents, responsibilityContext],
  );
  const cameraGroups = useMemo(
    () => groupIncidentsByCamera(incidents, resolveCameraLabel),
    [incidents, getCameraCode, getCameraName], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const activeOfficersCount = useMemo(
    () =>
      responsibilityGroups.officerGroups.filter(
        (g) => g.activeConfirmedItems.length > 0,
      ).length,
    [responsibilityGroups.officerGroups],
  );

  // Mutations & Modals State
  const reviewMutation = useReviewIncident();
  const batchReviewMutation = useBatchReviewIncidents();
  const closeMutation = useCloseIncident();

  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(
    null,
  );
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isResolveOpen, setIsResolveOpen] = useState(false);
  const [isCloseOpen, setIsCloseOpen] = useState(false);

  const [batchDispatchItems, setBatchDispatchItems] = useState<
    IncidentItem[] | null
  >(null);
  const [dispatchResult, setDispatchResult] =
    useState<DispatchIncidentsResult | null>(null);
  const [batchResolveItems, setBatchResolveItems] = useState<
    IncidentItem[] | null
  >(null);
  const [batchRejectIds, setBatchRejectIds] = useState<string[] | null>(null);
  const [batchRejectNote, setBatchRejectNote] = useState("");
  const [batchRejectError, setBatchRejectError] = useState<string | null>(null);
  const [batchCloseItems, setBatchCloseItems] = useState<IncidentItem[] | null>(
    null,
  );
  const [batchCloseNote, setBatchCloseNote] = useState("");
  const [batchActionPending, setBatchActionPending] = useState(false);
  const [singleActionPending, setSingleActionPending] = useState(false);

  // Selection helpers
  const toggleExpand = (key: string) =>
    setExpandedKeys((prev) => ({ ...prev, [key]: !prev[key] }));

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectMany = (ids: string[]) => {
    if (ids.length === 0) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allIn = ids.every((id) => next.has(id));
      for (const id of ids) {
        if (allIn) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  };

  // Row quick actions
  const rowActions = {
    onReview: (inc: IncidentItem) => {
      setSelectedIncident(inc);
      setIsReviewOpen(true);
    },
    onDispatch: (items: IncidentItem[]) => setBatchDispatchItems(items),
    onClose: (inc: IncidentItem) => {
      setSelectedIncident(inc);
      setIsCloseOpen(true);
    },
    onResolve: (inc: IncidentItem) => {
      setSelectedIncident(inc);
      setIsResolveOpen(true);
    },
  };

  // Batch handlers
  const handleBatchConfirmOnly = async (ids: string[]) => {
    if (ids.length === 0) return;
    await batchReviewMutation.mutateAsync({ ids, action: "CONFIRM" });
    setSelectedIds(new Set());
    invalidateAll();
  };

  const handleConfirmBatchReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchRejectIds || batchRejectIds.length === 0) return;
    const trimmed = batchRejectNote.trim();
    if (trimmed.length < 3) {
      setBatchRejectError(
        isVietnamese
          ? "Vui lòng nhập lý do bác bỏ (tối thiểu 3 ký tự)."
          : "Please enter a dismissal reason (at least 3 characters).",
      );
      return;
    }
    await batchReviewMutation.mutateAsync({
      ids: batchRejectIds,
      action: "REJECT",
      resolutionNote: trimmed,
    });
    setBatchRejectIds(null);
    setBatchRejectNote("");
    setBatchRejectError(null);
    setSelectedIds(new Set());
    invalidateAll();
  };

  const handleConfirmBatchDispatch = async (payload: {
    assignedTo: string;
    note?: string;
  }) => {
    if (!batchDispatchItems || batchDispatchItems.length === 0) return;
    setBatchActionPending(true);
    try {
      const res = await dispatchIncidentsWithSignal({
        incidents: batchDispatchItems,
        groupDispatch: true,
        managerId: user?.id,
        assignedTo: payload.assignedTo,
        note: payload.note,
        managerName: user?.fullName || user?.email || undefined,
      });
      setDispatchResult(res);
      setSelectedIds(new Set());
      invalidateAll(batchDispatchItems.map((i) => i.id));
      if (res.assignedCount > 0) {
        toast.success(
          isVietnamese
            ? `Đã duyệt & giao ${res.assignedCount} sự cố cho cán bộ${res.signalSent ? " (đã gửi 1 tín hiệu điều phối)" : ""}.`
            : `Confirmed & dispatched ${res.assignedCount} incidents.`,
        );
      }
      if (res.failedCount > 0) {
        toast.error(
          isVietnamese
            ? `${res.failedCount} sự cố chưa thể phân công.`
            : `${res.failedCount} incidents failed to assign.`,
        );
      }
      setBatchDispatchItems(null);
    } finally {
      setBatchActionPending(false);
    }
  };

  const handleConfirmBatchResolve = async (payload: {
    resolutionNote: string;
    afterFixFile?: File | null;
    closeImmediately?: boolean;
  }) => {
    if (!batchResolveItems || batchResolveItems.length === 0) return;
    setBatchActionPending(true);
    try {
      const res = await resolveIncidentsWithReport({
        incidents: batchResolveItems,
        resolutionNote: payload.resolutionNote,
        afterFixFile: payload.afterFixFile,
        closeImmediately: payload.closeImmediately,
        officerName: user?.fullName || user?.email || undefined,
      });
      setSelectedIds(new Set());
      invalidateAll(batchResolveItems.map((i) => i.id));
      if (res.resolvedCount > 0) {
        toast.success(
          res.closedCount > 0
            ? isVietnamese
              ? `Đã khắc phục & đóng ${res.closedCount} sự cố.`
              : `Resolved & closed ${res.closedCount} incidents.`
            : isVietnamese
              ? `Đã báo cáo khắc phục ${res.resolvedCount} sự cố${res.reportSignalSent ? " và gửi tín hiệu tới Quản lý" : ""}.`
              : `Reported remediation for ${res.resolvedCount} incidents.`,
        );
      }
      if (res.failedCount > 0) {
        toast.error(
          isVietnamese
            ? `${res.failedCount} sự cố chưa thể cập nhật (kiểm tra tệp ảnh hoặc quyền phân công).`
            : `${res.failedCount} incidents failed to resolve.`,
        );
      }
      setBatchResolveItems(null);
    } finally {
      setBatchActionPending(false);
    }
  };

  const handleConfirmBatchClose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchCloseItems || batchCloseItems.length === 0) return;
    setBatchActionPending(true);
    try {
      const closeNote =
        batchCloseNote.trim() ||
        (isVietnamese
          ? "Nghiệm thu và đóng hồ sơ sự cố an toàn (hàng loạt)"
          : "Batch accepted and closed safety incident records");
      const { succeeded, failed } = await runInBatches(
        batchCloseItems,
        4,
        (inc) => incidentService.closeIncident(inc.id, { closeNote }),
      );
      const closedIds = batchCloseItems.map((i) => i.id);
      setBatchCloseItems(null);
      setBatchCloseNote("");
      setSelectedIds(new Set());
      invalidateAll(closedIds);
      if (succeeded.length > 0) {
        toast.success(
          isVietnamese
            ? `Đã nghiệm thu và đóng ${succeeded.length} hồ sơ sự cố.`
            : `Accepted and closed ${succeeded.length} incidents.`,
        );
      }
      if (failed.length > 0) {
        toast.error(
          isVietnamese
            ? `${failed.length} sự cố chưa thể đóng.`
            : `${failed.length} incidents failed to close.`,
        );
      }
    } finally {
      setBatchActionPending(false);
    }
  };

  const selectedSiteName = siteFilter ? getSiteName(siteFilter) : undefined;

  return (
    <div className="space-y-6">
      {dispatchResult && (
        <IncidentDispatchResultPanel
          result={dispatchResult}
          onChange={setDispatchResult}
          onRetryFailed={async (ids) => {
            const fetched = await runInBatches(ids, 4, (id) =>
              incidentService.getIncidentById(id),
            );
            const eligible = fetched.succeeded.filter(
              (inc) =>
                inc.status === "PENDING_REVIEW" || inc.status === "CONFIRMED",
            );
            if (!eligible.length) {
              throw new Error(
                isVietnamese
                  ? "Không còn hồ sơ đủ điều kiện để giao lại."
                  : "No records remain eligible for assignment.",
              );
            }
            setBatchDispatchItems(eligible);
          }}
        />
      )}

      {/* 1. Header chuẩn phong cách /cameras (NM.chassis + Layer 1 Identity/Actions) */}
      <AssignmentConsoleHeader
        roleView={roleView}
        isAdminRole={isAdminRole}
        adminInterventionMode={adminInterventionMode}
        onToggleAdminIntervention={() => {
          setAdminInterventionMode((v) => !v);
          setSelectedIds(new Set());
        }}
        isConnected={isConnected}
        isRefreshing={isRefetching || isHydratingAssignments}
        onRefresh={invalidateAll}
        totalIncidentsCount={incidents.length}
        selectedSiteName={selectedSiteName}
        categorized={categorized}
      />

      {/* 2. Stats KPI đồng bộ 4 cột soft-extruded (giống /incidents, /cameras, /sites) */}
      <AssignmentKpiSummary
        roleView={roleView}
        isAdminRole={isAdminRole}
        adminInterventionMode={adminInterventionMode}
        loading={isLoading || (isOfficerRole && isHydratingAssignments)}
        totalIncidentsCount={incidents.length}
        categorized={categorized}
        activeOfficersCount={activeOfficersCount}
        dispatchedGroupsCount={dispatchedGroups.length}
        adminGroupMode={adminGroupMode}
        onAdminGroupModeChange={setAdminGroupMode}
        managerTab={managerTab}
        onManagerTabChange={(tab) => {
          setManagerTab(tab);
          setSelectedIds(new Set());
        }}
        officerTab={officerTab}
        onOfficerTabChange={(tab) => {
          setOfficerTab(tab);
          setSelectedIds(new Set());
        }}
      />

      {/* 3. Workspace chuyên biệt theo từng phân quyền */}
      {isAdminRole && !adminInterventionMode ? (
        <AdminOversightWorkspace
          adminGroupMode={adminGroupMode}
          siteFilter={siteFilter}
          onSiteChange={handleSiteChange}
          sites={sites}
          expandedKeys={expandedKeys}
          onToggleExpand={toggleExpand}
          managerGroups={responsibilityGroups.managerGroups}
          officerGroups={responsibilityGroups.officerGroups}
          siteGroups={siteGroups}
          cameraGroups={cameraGroups}
          currentUserId={user?.id}
          responsibilityContext={responsibilityContext}
          formatters={formatters}
          rowActions={rowActions}
          onBatchDispatch={(items) => setBatchDispatchItems(items)}
          onBatchClose={(items) => {
            setBatchCloseItems(items);
            setBatchCloseNote("");
          }}
        />
      ) : isOfficerRole ? (
        <OfficerTasksWorkspace
          officerTab={officerTab}
          categorized={categorized}
          dispatchedGroups={dispatchedGroups}
          usersById={usersById}
          selectedIds={selectedIds}
          onToggleSelectOne={toggleSelectOne}
          onToggleSelectMany={toggleSelectMany}
          batchActionPending={batchActionPending}
          onBatchResolve={(items) => setBatchResolveItems(items)}
          currentUserId={user?.id}
          responsibilityContext={responsibilityContext}
          formatters={formatters}
          rowActions={rowActions}
        />
      ) : (
        <ManagerDispatchWorkspace
          managerTab={managerTab}
          categorized={categorized}
          siteFilter={siteFilter}
          onSiteChange={handleSiteChange}
          sites={sites}
          selectedIds={selectedIds}
          onToggleSelectOne={toggleSelectOne}
          onToggleSelectMany={toggleSelectMany}
          batchReviewPending={batchReviewMutation.isPending}
          batchActionPending={batchActionPending}
          onBatchConfirmOnly={(ids) => void handleBatchConfirmOnly(ids)}
          onBatchReject={(ids) => {
            setBatchRejectIds(ids);
            setBatchRejectNote("");
            setBatchRejectError(null);
          }}
          onBatchDispatch={(items) => setBatchDispatchItems(items)}
          onBatchClose={(items) => {
            setBatchCloseItems(items);
            setBatchCloseNote("");
          }}
          currentUserId={user?.id}
          responsibilityContext={responsibilityContext}
          formatters={formatters}
          rowActions={rowActions}
        />
      )}

      {/* 4. Modals & Dialogs dùng chung */}
      <AssignmentModals
        selectedIncident={selectedIncident}
        isReviewOpen={isReviewOpen}
        onReviewOpenChange={setIsReviewOpen}
        reviewLoading={reviewMutation.isPending}
        onSubmitReview={async (id, payload) => {
          await reviewMutation.mutateAsync({ id, payload });
          invalidateAll([id]);
        }}
        isAssignOpen={isAssignOpen}
        onAssignOpenChange={setIsAssignOpen}
        singleActionPending={singleActionPending}
        onSubmitAssign={async (_id, payload) => {
          if (!selectedIncident) return;
          const targetId = payload.assignedTo || payload.assignedToUserId || "";
          setSingleActionPending(true);
          try {
            await dispatchIncidentsWithSignal({
              incidents: [selectedIncident],
              assignedTo: targetId,
              note: payload.note,
              managerName: user?.fullName || user?.email || undefined,
            });
            invalidateAll([selectedIncident.id]);
          } finally {
            setSingleActionPending(false);
          }
        }}
        isResolveOpen={isResolveOpen}
        onResolveOpenChange={setIsResolveOpen}
        canClose={!isOfficerRole && can("PPE_INCIDENT_MANAGE")}
        onSubmitResolve={async (_id, payload) => {
          if (!selectedIncident) return;
          setSingleActionPending(true);
          try {
            const res = await resolveIncidentsWithReport({
              incidents: [selectedIncident],
              resolutionNote: payload.resolutionNote,
              afterFixFile: payload.afterFixFile,
              closeImmediately: payload.closeImmediately,
              officerName: user?.fullName || user?.email || undefined,
            });
            invalidateAll([selectedIncident.id]);
            if (res.failedCount > 0) {
              throw new Error(
                isVietnamese
                  ? "Không thể báo cáo khắc phục sự cố."
                  : "Unable to resolve incident.",
              );
            }
          } finally {
            setSingleActionPending(false);
          }
        }}
        isCloseOpen={isCloseOpen}
        onCloseOpenChange={setIsCloseOpen}
        closeLoading={closeMutation.isPending}
        onConfirmClose={async (id, payload) => {
          await closeMutation.mutateAsync({ id, payload });
          invalidateAll([id]);
        }}
        batchDispatchItems={batchDispatchItems}
        onClearBatchDispatch={() => setBatchDispatchItems(null)}
        batchActionPending={batchActionPending}
        onConfirmBatchDispatch={handleConfirmBatchDispatch}
        batchResolveItems={batchResolveItems}
        onClearBatchResolve={() => setBatchResolveItems(null)}
        onConfirmBatchResolve={handleConfirmBatchResolve}
        batchRejectIds={batchRejectIds}
        batchRejectNote={batchRejectNote}
        batchRejectError={batchRejectError}
        batchReviewPending={batchReviewMutation.isPending}
        onBatchRejectNoteChange={setBatchRejectNote}
        onClearBatchReject={() => {
          setBatchRejectIds(null);
          setBatchRejectNote("");
          setBatchRejectError(null);
        }}
        onSubmitBatchReject={handleConfirmBatchReject}
        batchCloseItems={batchCloseItems}
        batchCloseNote={batchCloseNote}
        onBatchCloseNoteChange={setBatchCloseNote}
        onClearBatchClose={() => {
          setBatchCloseItems(null);
          setBatchCloseNote("");
        }}
        onSubmitBatchClose={handleConfirmBatchClose}
      />
    </div>
  );
}
