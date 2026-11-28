"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useSite } from "@/contexts/SiteContext";
import {
  useAssignmentIncidents,
  useBatchReviewIncidents,
  useCloseIncident,
  useHydratedIncidents,
  useReviewIncident,
} from "@/hooks/incidents";
import { incidentKeys } from "@/hooks/incidents/incident.query-keys";
import { useIncidentStatusCounts } from "@/hooks/incidents/use-incident-status-counts";
import {
  mergeLoadedIncidents,
  useGroupLoadMore,
  type LoadMoreTab,
} from "@/hooks/incidents/use-group-load-more";
import type { IncidentWorkGroup } from "@/lib/incident-assignment-groups";
import type { AssignmentIncidentTotals } from "@/hooks/incidents/use-assignment-incidents";
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
  closeIncidentsBatch,
  dispatchIncidentsWithSignal,
  resolveIncidentsWithReport,
  type DispatchIncidentsResult,
} from "@/lib/incident-actions";
import { deriveDispatchBatches } from "@/lib/incident-dispatch-batches";
import { isGroupIncidentResolved } from "@/lib/incident-group";
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
  // Quyền thao tác lấy từ permission, không suy ra từ tên role: role lạ chỉ có PPE_INCIDENT_READ
  // vẫn xem được bàn điều phối nhưng không thấy nút Duyệt / Giao / Bác bỏ / Đóng.
  const canReview = can("PPE_INCIDENT_REVIEW");
  const canManage = can("PPE_INCIDENT_MANAGE");
  const canUpdate = can("PPE_INCIDENT_UPDATE");

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

  // Chỉ tải các trạng thái mà màn hình đang cần:
  // - Officer: lọc ở server `assignedToMe` (CONFIRMED đang giao, RESOLVED/CLOSED đã từng giao cho mình).
  // - Quản lý: Chờ duyệt + Đã xác nhận luôn cần cho KPI; Đã khắc phục chỉ khi mở bước Đang giao/Nghiệm thu.
  // - Admin: giám sát toàn cục nên tải đủ.
  // KPI tổng dùng `/incidents/status-counts` (1 request) nên không cần tải hết danh sách để đếm.
  const statusCountsQuery = useIncidentStatusCounts(
    { siteId: siteFilter || undefined },
    {
      enabled: !isOfficerRole,
      // SSE online → hook tự invalidate khi có sự kiện; chỉ poll khi mất SSE.
      refetchInterval: isConnected ? false : 30 * 1000,
    },
  );
  const statusCounts = statusCountsQuery.data;
  // BE hỗ trợ lọc "đã xác nhận, chưa giao / đã giao" (hợp đồng mục 3) khi status-counts trả 2 số này.
  const splitConfirmed =
    typeof statusCounts?.confirmedUnassigned === "number" &&
    typeof statusCounts?.confirmedAssigned === "number";

  const bucketPlan = isOfficerRole
    ? { pendingReview: false, confirmed: true, resolved: true, closed: true, dismissed: false }
    : isAdminRole
      ? undefined
      : splitConfirmed
        ? {
            // Mỗi bước chỉ tải đúng phần của nó ở server
            pendingReview: managerTab === "triage",
            confirmed: false,
            confirmedUnassigned: managerTab === "triage",
            confirmedAssigned: managerTab === "dispatched",
            resolved: managerTab === "acceptance",
            closed: false,
            dismissed: false,
          }
        : {
            pendingReview: true,
            confirmed: true,
            resolved: managerTab !== "triage",
            closed: false,
            dismissed: false,
          };
  const {
    items: bucketIncidents,
    totals: bucketTotals,
    isLoading,
    isRefetching,
  } = useAssignmentIncidents({
    siteId: siteFilter || undefined,
    includeAssignments: true,
    includeClosedAssignments: isOfficerRole,
    assignedToMe: isOfficerRole,
    buckets: bucketPlan,
  });

  const assignmentTotals = useMemo<AssignmentIncidentTotals>(() => {
    if (isOfficerRole || !statusCounts) return bucketTotals;
    const closed = statusCounts.closed ?? 0;
    const dismissed = statusCounts.dismissed ?? 0;
    return {
      pendingReview: statusCounts.pendingReview ?? 0,
      confirmed: statusCounts.confirmed ?? 0,
      ...(splitConfirmed
        ? {
            confirmedUnassigned: statusCounts.confirmedUnassigned,
            confirmedAssigned: statusCounts.confirmedAssigned,
          }
        : {}),
      resolved: statusCounts.resolved ?? 0,
      closed,
      dismissed,
      closedOrDismissed: closed + dismissed,
      total: statusCounts.total ?? 0,
    };
  }, [isOfficerRole, statusCounts, bucketTotals, splitConfirmed]);

  // "Tải thêm" theo từng nhóm (U9): hồ sơ tải thêm được gộp vào danh sách, dữ liệu từ danh sách chính ưu tiên.
  const groupLoader = useGroupLoadMore({
    siteId: siteFilter || undefined,
    isOfficer: isOfficerRole,
    splitConfirmed,
  });
  const rawIncidents = useMemo(
    () => mergeLoadedIncidents(bucketIncidents, groupLoader.extraIncidents),
    [bucketIncidents, groupLoader.extraIncidents],
  );

  // Danh sách đã kèm `assignments` (includeAssignments) nên không gọi N+1 GET /:id/assignments.
  const {
    incidents,
    isHydratingAssignments,
    usersById,
    siteManagersBySiteId,
  } = useHydratedIncidents(rawIncidents, {
    includeClosed: isOfficerRole,
    fetchMissingAssignments: false,
    userSiteId: siteFilter || undefined,
  });

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
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [lastAlert, queryClient]);

  // Chỉ invalidate danh sách, bộ đếm & đúng các incidentId vừa thay đổi; khi người dùng bấm Làm mới toàn trang (không truyền affectedIds) thì làm mới thêm cache phân công
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
    } else {
      void queryClient.invalidateQueries({
        queryKey: [...incidentKeys.all, "assignments"],
      });
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

  // Đợt giao việc dựng từ dữ liệu phân công (cùng cán bộ, cùng lần giao) — không đọc text thông báo,
  // nên không mất đợt khi thông báo trôi hoặc người dùng thiếu quyền NOTIFICATION_READ.
  const dispatchedGroups = useMemo<DispatchedGroupView[]>(() => {
    const incidentById = new Map(incidents.map((i) => [i.id, i]));
    const batches = deriveDispatchBatches(incidents, {
      assignedTo: isOfficerRole ? user?.id : undefined,
    });

    return batches.map((grp) => {
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

      return {
        group: grp,
        // Chỉ đạo khi BE lưu `note` theo đợt (hợp đồng mục 4); chưa có thì để trống.
        message: grp.note ?? "",
        memberIncidents,
        resolvedCount,
        remainingEditableItems,
      };
    });
  }, [incidents, isOfficerRole, user?.id]);

  // "Tải thêm" (U9): bước nào còn hồ sơ trên server chưa tải về thì nhóm trong bước đó có nút tải thêm.
  const bucketIncidentIds = useMemo(
    () => new Set(bucketIncidents.map((inc) => inc.id)),
    [bucketIncidents],
  );
  const loadedByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const inc of rawIncidents) counts[inc.status] = (counts[inc.status] ?? 0) + 1;
    return counts;
  }, [rawIncidents]);
  const tabHasMore = (tab: LoadMoreTab): boolean => {
    const loaded = (status: string) => loadedByStatus[status] ?? 0;
    switch (tab) {
      case "triage":
        return (
          loaded("PENDING_REVIEW") < assignmentTotals.pendingReview ||
          (typeof assignmentTotals.confirmedUnassigned === "number"
            ? categorized.unassignedConfirmed.length < assignmentTotals.confirmedUnassigned
            : loaded("CONFIRMED") < assignmentTotals.confirmed)
        );
      case "dispatched":
        return typeof assignmentTotals.confirmedAssigned === "number"
          ? categorized.assignedConfirmed.length < assignmentTotals.confirmedAssigned
          : loaded("CONFIRMED") < assignmentTotals.confirmed;
      case "acceptance":
        return loaded("RESOLVED") < assignmentTotals.resolved;
      case "pending":
        return loaded("CONFIRMED") < bucketTotals.confirmed;
      case "completed":
        return loaded("RESOLVED") + loaded("CLOSED") < bucketTotals.resolved + bucketTotals.closed;
    }
  };
  const groupLoadMore = (tab: LoadMoreTab) => ({
    canLoad: (group: IncidentWorkGroup) => tabHasMore(tab) && !groupLoader.stateOf(tab, group).done,
    isLoading: (group: IncidentWorkGroup) => groupLoader.stateOf(tab, group).loading,
    onLoad: (group: IncidentWorkGroup) => {
      groupLoader.loadMore(tab, group, bucketIncidentIds).catch((error: unknown) => {
        toast.error(
          error instanceof Error && error.message
            ? error.message
            : isVietnamese
              ? "Không tải thêm được hồ sơ."
              : "Unable to load more records.",
        );
      });
    },
  });

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

  const officerWorkloadById = useMemo(() => {
    const map = new Map<string, { activeCount: number; resolvedCount: number }>();
    for (const grp of responsibilityGroups.officerGroups) {
      map.set(grp.officerId, {
        activeCount: grp.activeConfirmedItems.length,
        resolvedCount: grp.resolvedItems.length,
      });
    }
    return map;
  }, [responsibilityGroups.officerGroups]);

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
  // Chặn thêm ở handler (phòng khi nút bị render nhầm): BE cũng từ chối nếu thiếu quyền.
  const canDispatchItems = (items: readonly IncidentItem[]) =>
    canManage &&
    (canReview || items.every((i) => i.status !== "PENDING_REVIEW"));
  const openBatchDispatch = (items: IncidentItem[]) => {
    if (canDispatchItems(items)) setBatchDispatchItems(items);
  };
  const openBatchClose = (items: IncidentItem[]) => {
    if (!canManage) return;
    setBatchCloseItems(items);
    setBatchCloseNote("");
  };
  const openBatchResolve = (items: IncidentItem[]) => {
    if (canUpdate) setBatchResolveItems(items);
  };

  const rowActions = {
    onReview: (inc: IncidentItem) => {
      if (!canReview) return;
      setSelectedIncident(inc);
      setIsReviewOpen(true);
    },
    onDispatch: (items: IncidentItem[]) => openBatchDispatch(items),
    onClose: (inc: IncidentItem) => {
      if (!canManage) return;
      setSelectedIncident(inc);
      setIsCloseOpen(true);
    },
    onResolve: (inc: IncidentItem) => {
      if (!canUpdate) return;
      setSelectedIncident(inc);
      setIsResolveOpen(true);
    },
  };

  // Batch handlers
  const handleBatchConfirmOnly = async (ids: string[]) => {
    if (ids.length === 0 || !canReview) return;
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
            ? `${res.failedCount} sự cố chưa thể cập nhật${res.firstError ? `: ${res.firstError}` : " (kiểm tra tệp ảnh hoặc quyền phân công)."}`
            : `${res.failedCount} incidents failed to resolve.`,
        );
      }
      if (res.closeFailedCount > 0) {
        toast.error(
          isVietnamese
            ? `${res.closeFailedCount} sự cố đã khắc phục nhưng chưa đóng được hồ sơ.`
            : `${res.closeFailedCount} incidents were resolved but could not be closed.`,
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
      // 1 request POST /incidents/batch-close (tối đa 100 id/lần); BE cũ chưa có endpoint → gọi từng sự cố.
      const res = await closeIncidentsBatch(
        batchCloseItems.map((inc) => inc.id),
        closeNote,
      );
      const closedIds = batchCloseItems.map((i) => i.id);
      setBatchCloseItems(null);
      setBatchCloseNote("");
      setSelectedIds(new Set());
      invalidateAll(closedIds);
      if (res.closedIds.length > 0) {
        toast.success(
          isVietnamese
            ? `Đã nghiệm thu và đóng ${res.closedIds.length} hồ sơ sự cố.`
            : `Accepted and closed ${res.closedIds.length} incidents.`,
        );
      }
      if (res.failedIds.length > 0) {
        toast.error(
          isVietnamese
            ? `${res.failedIds.length} sự cố chưa thể đóng${res.firstError ? `: ${res.firstError}` : "."}`
            : `${res.failedIds.length} incidents failed to close.`,
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
            openBatchDispatch(eligible);
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
        onRefresh={() => invalidateAll()}
        totalIncidentsCount={assignmentTotals.total || incidents.length}
        selectedSiteName={selectedSiteName}
        categorized={categorized}
        statusTotals={assignmentTotals}
        readOnly={isOfficerRole ? !canUpdate : !canReview && !canManage}
      />

      {/* 2. Stats KPI đồng bộ 4 cột soft-extruded (giống /incidents, /cameras, /sites) */}
      <AssignmentKpiSummary
        roleView={roleView}
        isAdminRole={isAdminRole}
        adminInterventionMode={adminInterventionMode}
        loading={isLoading || (isOfficerRole && isHydratingAssignments)}
        totalIncidentsCount={assignmentTotals.total || incidents.length}
        categorized={categorized}
        statusTotals={assignmentTotals}
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
          onAdminGroupModeChange={setAdminGroupMode}
          siteFilter={siteFilter}
          onSiteChange={handleSiteChange}
          sites={sites}
          incidents={incidents}
          dispatchedGroups={dispatchedGroups}
          usersById={usersById}
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
          onBatchDispatch={openBatchDispatch}
          onBatchClose={openBatchClose}
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
          onBatchResolve={openBatchResolve}
          currentUserId={user?.id}
          responsibilityContext={responsibilityContext}
          formatters={formatters}
          rowActions={rowActions}
          loadMore={groupLoadMore(officerTab)}
        />
      ) : (
        <ManagerDispatchWorkspace
          managerTab={managerTab}
          categorized={categorized}
          dispatchedGroups={dispatchedGroups}
          usersById={usersById}
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
            if (!canReview) return;
            setBatchRejectIds(ids);
            setBatchRejectNote("");
            setBatchRejectError(null);
          }}
          onBatchDispatch={openBatchDispatch}
          onBatchClose={openBatchClose}
          currentUserId={user?.id}
          responsibilityContext={responsibilityContext}
          formatters={formatters}
          rowActions={rowActions}
          loadMore={groupLoadMore(managerTab)}
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
            const res = await dispatchIncidentsWithSignal({
              incidents: [selectedIncident],
              assignedTo: targetId,
              note: payload.note,
              managerName: user?.fullName || user?.email || undefined,
            });
            invalidateAll([selectedIncident.id]);
            if (res.failedCount > 0 || res.assignedCount === 0) {
              const reason =
                res.failedItems[0]?.message ||
                (isVietnamese
                  ? "Không thể phân công sự cố cho cán bộ đã chọn."
                  : "Unable to dispatch incident to the selected officer.");
              toast.error(reason);
              throw new Error(reason);
            }
          } finally {
            setSingleActionPending(false);
          }
        }}
        isResolveOpen={isResolveOpen}
        onResolveOpenChange={setIsResolveOpen}
        canClose={!isOfficerRole && canManage}
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
                res.firstError ||
                  (isVietnamese
                    ? "Không thể báo cáo khắc phục sự cố."
                    : "Unable to resolve incident."),
              );
            }
            if (res.closeFailedCount > 0) {
              toast.error(
                isVietnamese
                  ? "Đã khắc phục nhưng chưa đóng được hồ sơ (kiểm tra quyền hoặc trạng thái)."
                  : "Resolved, but the record could not be closed.",
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
        officerWorkloadById={officerWorkloadById}
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
