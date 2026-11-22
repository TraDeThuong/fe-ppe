"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  BellRing,
  Building2,
  CheckCircle2,
  CheckSquare,
  Download,
  Edit3,
  FilePlus2,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Trash2,
  UserCheck,
  Video,
} from "lucide-react";
import { PageHeader } from "@/components/features/app-shell/page-header";
import { ResourceAuditTrailCard } from "@/components/features/audit-logs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/providers/locale-provider";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { useCan } from "@/hooks/use-can";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtime } from "@/contexts/RealtimeContext";
import { incidentKeys } from "@/hooks/incidents/incident.query-keys";
import { reportingKeys } from "@/hooks/reporting/reporting.query-keys";
import { toast } from "@/lib/toast";
import { isDockerInternalMinioUrl, resolveEvidenceUrl } from "@/lib/evidence-url";
import {
  dispatchIncidentsWithSignal,
  resolveIncidentsWithReport,
} from "@/lib/incident-actions";
import { isIncidentAssignedToUser } from "@/lib/incident-workflow";
import { canResolveGroupIncident, nextGroupIncident } from "@/lib/incident-group";
import { IncidentGroupWorkspace, useIncidentGroupWorkspace } from "@/components/features/incidents/incident-group-workspace";
import { incidentService, notificationService } from "@/services";
import {
  EVIDENCE_TYPE,
  type EvidenceItem,
  type IncidentItem,
  type IncidentCommentItem,
  type IncidentAssignmentItem,
  type IncidentStatusHistoryItem,
  type NotificationSeverity,
} from "@/types";
import {
  IncidentLifecycleStepper,
  IncidentActionGuide,
  IncidentEvidenceViewer,
  IncidentMetaCard,
  IncidentAssignmentCard,
  IncidentCommentsTimeline,
  IncidentChecksumVerifier,
  ReviewIncidentModal,
  AssignIncidentModal,
  ResolveIncidentModal,
  CloseIncidentDialog,
  EditIncidentModal,
  AttachEvidenceModal,
} from "@/components/features/incidents";
import {
  useIncidentDetail,
  useIncidentComments,
  useAddIncidentComment,
  useUpdateIncident,
  useReviewIncident,
  useAssignOfficer,
  useResolveIncident,
  useCloseIncident,
  useEvidenceMutations,
} from "@/hooks";

interface IncidentDetailContentProps {
  id: string;
}

export default function IncidentDetailContent({ id }: IncidentDetailContentProps) {
  const { user } = useAuth();
  return <IncidentGroupWorkspace id={id}><IncidentDetailBody key={`${user?.id}:${id}`} id={id} /></IncidentGroupWorkspace>;
}

function IncidentDetailBody({ id }: IncidentDetailContentProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const can = useCan();
  const canRead = can("PPE_INCIDENT_READ");
  const groupWorkspace = useIncidentGroupWorkspace();
  const markSingleDirty = useCallback((dirty: boolean) => groupWorkspace?.markDirty("single", dirty), [groupWorkspace?.markDirty]);
  const { getCamera } = useEntityLookup();

  const [isHighlightCompare, setIsHighlightCompare] = useState(false);

  useEffect(() => {
    if (searchParams.get("focus") === "compare") {
      setIsHighlightCompare(true);
      const timer = setTimeout(() => {
        const viewerEl = document.getElementById("incident-evidence-viewer");
        if (viewerEl) {
          viewerEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 350);
      const pulseTimer = setTimeout(() => setIsHighlightCompare(false), 4500);
      return () => {
        clearTimeout(timer);
        clearTimeout(pulseTimer);
      };
    }
  }, [searchParams]);

  // Realtime updates từ SSE
  const { lastAlert } = useRealtime();

  // Queries lấy dữ liệu thực tế từ Backend
  // Group mode shares the verified group snapshot with the detail view. Do not issue a
  // fifth member-detail request alongside the four group readers, or display a stale assignee.
  const detailQuery = useIncidentDetail(id, canRead && !groupWorkspace, user?.id);
  const groupRow = groupWorkspace?.snapshot?.rows.find((row) => row.id === id);
  const incident = groupWorkspace ? (!groupRow?.error ? groupRow?.incident : undefined) : detailQuery.data;
  const isLoading = groupWorkspace ? !groupWorkspace.snapshot && !groupWorkspace.query.error && groupWorkspace.readable : detailQuery.isLoading;
  const isError = groupWorkspace ? !!groupRow?.error || groupWorkspace.query.isError : detailQuery.isError;
  const error = groupWorkspace ? (groupRow?.error ? new Error(groupRow.error) : groupWorkspace.query.error) : detailQuery.error;
  const isRefetching = groupWorkspace ? groupWorkspace.query.isFetching : detailQuery.isRefetching;
  const groupRefresh = groupWorkspace?.refresh;
  const refetch = useCallback(() => groupRefresh ? groupRefresh() : detailQuery.refetch(), [groupRefresh, detailQuery.refetch]);

  const { data: comments = [] } = useIncidentComments(id, canRead);

  // Tự động làm mới dữ liệu khi có cảnh báo/sự kiện liên quan đến sự cố hiện tại
  useEffect(() => {
    if (!lastAlert || !canRead || groupRefresh) return;
    const alertData = lastAlert.data as Record<string, unknown> | undefined;
    const alertIncidentId = (alertData?.incidentId as string) || (alertData?.id as string);
    if (alertIncidentId === id) {
      refetch();
    }
  }, [lastAlert, id, refetch, canRead, groupRefresh]);

  const incidentCamera = incident?.cameraId ? getCamera(incident.cameraId) : undefined;

  // Xác định ảnh bằng chứng AI chuẩn xác theo từng camera (tuyệt đối không hardcode camera tĩnh)
  const cameraDesignatedEvidence = useMemo(() => {
    const cid = (incident?.cameraId || "").toLowerCase();

    // 1. Kiểm tra cache phiên làm việc thực tế từ camera nếu có
    if (typeof window !== "undefined" && cid) {
      const liveCamEvidence = sessionStorage.getItem(`ppe_camera_evidence_${cid}`);
      if (liveCamEvidence) return liveCamEvidence;
    }

    return incidentCamera?.snapshotUrl || null;
  }, [incident?.cameraId, incidentCamera]);

  // Mutations & Permissions
  const isOfficerRole = (user?.role || "").toUpperCase() === "SAFETY_OFFICER";
  const canReview = !isOfficerRole && can("PPE_INCIDENT_REVIEW");
  const canAssign = !isOfficerRole && can("PPE_INCIDENT_MANAGE");
  const canResolve = can("PPE_INCIDENT_UPDATE");
  const canClose = !isOfficerRole && can("PPE_INCIDENT_MANAGE");
  const canUpdate = can("PPE_INCIDENT_UPDATE");
  const canDeleteEvidence = can("PPE_INCIDENT_DELETE");
  const canTriggerAlert =
    !isOfficerRole &&
    (can("PPE_INCIDENT_UPDATE") || can("PPE_INCIDENT_MANAGE") || can("NOTIFICATION_CREATE"));

  const addCommentMutation = useAddIncidentComment();
  const updateMutation = useUpdateIncident();
  const reviewMutation = useReviewIncident();
  const closeMutation = useCloseIncident();
  const evidenceMutations = useEvidenceMutations();

  // Modals
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAttachOpen, setIsAttachOpen] = useState(false);
  const [deleteEvidenceTarget, setDeleteEvidenceTarget] = useState<EvidenceItem | null>(null);
  const [isNotifying, setIsNotifying] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isResolveOpen, setIsResolveOpen] = useState(false);
  const [isCloseOpen, setIsCloseOpen] = useState(false);
  const [isActionPending, setIsActionPending] = useState(false);

  const isOfficerAssigned = incident ? isIncidentAssignedToUser(incident, user?.id) : false;
  const awaitingDispatch = isOfficerRole && !isOfficerAssigned;
  const canSelfOrAssignedResolve = canResolve && (groupWorkspace
    ? groupWorkspace.canAct && !!incident && canResolveGroupIncident(incident, user?.id || "")
    : (!isOfficerRole || isOfficerAssigned));

  const refreshDetailAndLists = () => {
    void refetch();
    void queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
    void queryClient.invalidateQueries({ queryKey: incidentKeys.statusCountsRoot() });
    void queryClient.invalidateQueries({ queryKey: reportingKeys.all });
  };

  // Handlers gọi trực tiếp API Backend qua React Query mutations
  const handleSendComment = async (comment: string) => {
    if (!incident) return;
    await addCommentMutation.mutateAsync({ incidentId: incident.id, comment });
  };

  const handleReview = async (reviewId: string, payload: any) => {
    try {
      await reviewMutation.mutateAsync({ id: reviewId, payload });
      refreshDetailAndLists();
      setIsReviewOpen(false);
    } catch (err) {
      console.error("Failed to review incident:", err);
    }
  };

  const handleAssign = async (_incidentId: string, payload: any) => {
    if (!incident) return;
    const targetId = payload.assignedTo || payload.assignedToUserId || "";
    setIsActionPending(true);
    try {
      const res = await dispatchIncidentsWithSignal({
        incidents: [incident],
        assignedTo: targetId,
        note: payload.note,
        managerName: user?.fullName || user?.email || undefined,
      });
      refreshDetailAndLists();
      if (res.assignedCount > 0) {
        toast.success(
          isVietnamese
            ? `Đã giao cán bộ xử lý${res.signalSent ? " và phát tín hiệu thông báo" : ""}.`
            : `Assigned officer${res.signalSent ? " and sent dispatch signal" : ""}.`,
        );
      }
      setIsAssignOpen(false);
    } catch (err) {
      console.error("Failed to assign incident:", err);
      throw err;
    } finally {
      setIsActionPending(false);
    }
  };

  const handleResolve = async (_resolveId: string, payload: any) => {
    if (!incident) return;
    if (groupWorkspace?.group) {
      const result = await groupWorkspace.resolveMembers([incident.id], payload);
      if (!result.succeeded.some((record) => record.id === incident.id)) {
        throw new Error(result.failed[0]?.message || (isVietnamese ? "Chưa xác minh được báo cáo khắc phục." : "Unable to verify the remediation report."));
      }
      groupWorkspace.markDirty("single", false);
      setIsResolveOpen(false);
      toast.success(isVietnamese ? "Đã lưu báo cáo khắc phục." : "Remediation report saved.");
      if (payload.advance) {
        const next = nextGroupIncident(groupWorkspace.group, incident.id, result.snapshot.rows, user?.id || "");
        if (next) groupWorkspace.navigate(next);
      }
      return;
    }
    setIsActionPending(true);
    try {
      const res = await resolveIncidentsWithReport({
        incidents: [incident],
        resolutionNote: payload.resolutionNote,
        afterFixFile: payload.afterFixFile,
        closeImmediately: payload.closeImmediately,
        officerName: user?.fullName || user?.email || undefined,
      });
      refreshDetailAndLists();
      if (res.resolvedCount > 0) {
        toast.success(
          res.closedCount > 0
            ? isVietnamese
              ? "Đã xác nhận khắc phục và đóng hồ sơ sự cố."
              : "Incident resolved and closed."
            : isVietnamese
              ? `Đã báo cáo khắc phục${res.reportSignalSent ? " và gửi tín hiệu tới Quản lý" : ""}.`
              : "Remediation report sent.",
        );
        setIsResolveOpen(false);
      } else if (res.failedCount > 0) {
        throw new Error(
          isVietnamese
            ? "Không thể xác nhận khắc phục sự cố."
            : "Unable to resolve incident.",
        );
      }
    } catch (err) {
      console.error("Failed to resolve incident:", err);
      throw err;
    } finally {
      setIsActionPending(false);
    }
  };

  const handleClose = async (closeId: string, payload?: any) => {
    try {
      await closeMutation.mutateAsync({ id: closeId, payload });
      refreshDetailAndLists();
      setIsCloseOpen(false);
    } catch (err) {
      console.error("Failed to close incident:", err);
    }
  };

  const handleTriggerAlert = async () => {
    if (!incident) return;
    setIsNotifying(true);
    try {
      await notificationService.triggerIncidentNotification({
        incidentId: incident.id,
        siteId: incident.siteId,
        cameraId: incident.cameraId,
        violationType: incident.violationType,
        severity: (incident.severity || "HIGH") as NotificationSeverity,
        channels: ["IN_APP", "EMAIL"],
        evidenceUrl:
          resolveEvidenceUrl(
            incident.evidences?.[0]?.url ||
              incident.evidences?.[0]?.storageKey ||
              incident.snapshotUrl,
          ) || undefined,
      });
      toast.success(
        isVietnamese
          ? "Đã gửi lại thông báo cảnh báo tới cán bộ phụ trách."
          : "Re-dispatched incident alert to safety officers.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to dispatch alert");
    } finally {
      setIsNotifying(false);
    }
  };

  const handleDownloadEvidence = async (ev: EvidenceItem) => {
    try {
      const res = await incidentService.getEvidenceDownloadUrl(ev.id, {
        action: "DOWNLOAD",
      });
      const targetUrl =
        isDockerInternalMinioUrl(res.downloadUrl) && ev.storageKey
          ? resolveEvidenceUrl(ev.storageKey)
          : res.downloadUrl;
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    }
  };

  if (!canRead) return <div role="alert" className="rounded-2xl border border-border/40 bg-surface p-6 text-sm text-muted-foreground">
    {isVietnamese ? "Bạn không có quyền xem hồ sơ sự cố này." : "You do not have permission to view this incident."}
  </div>;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={ShieldAlert}
          title={`${t("incidents.detailTitle")}: #${id.slice(0, 8)}`}
          description={t("incidents.detailDescription")}
          breadcrumbs={[
            { label: t("incidents.title"), href: "/incidents" },
            { label: `#${id.slice(0, 8)}` },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-24 rounded-xl" />
              <Skeleton className="h-9 w-24 rounded-xl" />
            </div>
          }
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column Skeleton */}
          <div className="space-y-6 lg:col-span-7 xl:col-span-8">
            <div className="rounded-3xl border border-border/40 bg-surface p-5 space-y-4 shadow-nm">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-36 rounded-md" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="aspect-video w-full rounded-2xl" />
            </div>
            <div className="rounded-3xl border border-border/40 bg-surface p-5 space-y-3 shadow-nm">
              <Skeleton className="h-5 w-40 rounded-md" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          </div>

          {/* Right Column Skeleton */}
          <div className="space-y-6 lg:col-span-5 xl:col-span-4">
            <div className="rounded-3xl border border-border/40 bg-surface p-5 space-y-4 shadow-nm">
              <Skeleton className="h-6 w-32 rounded-md" />
              <div className="space-y-3 pt-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between items-center py-1.5 border-b border-border/20 last:border-0">
                    <Skeleton className="h-3.5 w-24 rounded" />
                    <Skeleton className="h-4 w-32 rounded" />
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-border/40 bg-surface p-5 space-y-4 shadow-nm">
              <Skeleton className="h-5 w-36 rounded-md" />
              <Skeleton className="h-28 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !incident) {
    const errorMsg =
      error instanceof Error
        ? error.message
        : isVietnamese
        ? "Sự cố có thể đã bị xóa hoặc đường dẫn không hợp lệ."
        : "This incident may have been deleted or the URL is invalid.";

    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-2xl border border-border/40 bg-surface p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-warning" />
        <h3 className="text-lg font-bold text-foreground">
          {isVietnamese ? `Không thể tải hồ sơ sự cố #${id.slice(0, 8)}` : `Incident #${id.slice(0, 8)} not found`}
        </h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {errorMsg}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <Button variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            <span>{isVietnamese ? "Thử lại" : "Retry"}</span>
          </Button>
          <Button variant="ghost" onClick={() => router.push("/incidents")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>{isVietnamese ? "Quay lại danh sách sự cố" : "Back to incidents list"}</span>
          </Button>
        </div>
      </div>
    );
  }

  // Luôn tìm chính xác ảnh vi phạm SNAPSHOT làm bằng chứng chính để giám định mã băm
  const primaryEvidence =
    incident.evidences?.find((e) => e.evidenceType === EVIDENCE_TYPE.SNAPSHOT) ||
    incident.evidences?.[0];

  // Khôi phục ảnh snapshot từ Client-side cache (nếu vừa tạo từ phiên camera)
  const cachedEvidenceUrl =
    typeof window !== "undefined" ? sessionStorage.getItem(`ppe_incident_evidence_${id}`) : null;
  const effectiveSnapshotUrl =
    cachedEvidenceUrl ||
    (incident.snapshotUrl && !incident.snapshotUrl.includes("hqdefault.jpg") ? incident.snapshotUrl : null) ||
    cameraDesignatedEvidence;

  const hasAssignments = Boolean(incident.assignments && incident.assignments.length > 0);
  const activeAssignment =
    incident.assignments?.find((a) => a.status === "ACTIVE") || incident.assignments?.[0];
  const assignedOfficerName = activeAssignment?.assignedToName;

  const handleStepperClick = (stepKey: string) => {
    if (stepKey === "REVIEWED" && incident.status === "PENDING_REVIEW" && canReview) {
      setIsReviewOpen(true);
    } else if (stepKey === "RESOLVING" && incident.status === "CONFIRMED" && canAssign) {
      setIsAssignOpen(true);
    } else if (
      stepKey === "RESOLVED" &&
      incident.status === "CONFIRMED" &&
      canSelfOrAssignedResolve
    ) {
      setIsResolveOpen(true);
    } else if (stepKey === "CLOSED" && incident.status === "RESOLVED" && canClose) {
      setIsCloseOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        icon={ShieldAlert}
        title={`${t("incidents.detailTitle")}: #${incident.id.slice(0, 8)}`}
        description={t("incidents.detailDescription")}
        breadcrumbs={[
          { label: t("incidents.title"), href: "/incidents" },
          { label: `#${incident.id.slice(0, 8)}` },
        ]}
        badge={incident.status}
        badgeIcon={ShieldAlert}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="gap-1.5"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
              <span>{t("common.refresh")}</span>
            </Button>

            {/* Quick Action: Xem luồng Camera */}
            <Button
              variant="outline"
              onClick={() =>
                router.push(
                  incident.cameraId
                    ? `/cameras/${incident.cameraId}`
                    : `/cameras?search=${incident.cameraCode}&view=wall`
                )
              }
              className="gap-1.5"
              title={isVietnamese ? "Mở Camera AI Intelligence Studio" : "Open Camera AI Intelligence Studio"}
            >
              <Video className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline">{isVietnamese ? "Xem Camera" : "View Camera"}</span>
            </Button>

            {/* Quick Action: Mở Command Center Site */}
            {incident.siteId && (
              <Button
                variant="outline"
                onClick={() => router.push(`/sites/${incident.siteId}?tab=live-cameras`)}
                className="gap-1.5"
                title={isVietnamese ? "Mở trung tâm điều hành công trường này" : "Open site operations center"}
              >
                <Building2 className="h-4 w-4 text-primary" />
                <span className="hidden sm:inline">{isVietnamese ? "Mở Công trường" : "Open Site"}</span>
              </Button>
            )}

            {canUpdate && incident.status !== "CLOSED" && (
              <Button
                variant="outline"
                onClick={() => setIsEditOpen(true)}
                className="gap-1.5"
              >
                <Edit3 className="h-4 w-4 text-primary" />
                <span className="hidden sm:inline">{isVietnamese ? "Sửa" : "Edit"}</span>
              </Button>
            )}

            {canTriggerAlert && incident.status !== "CLOSED" && (
              <Button
                variant="outline"
                disabled={isNotifying}
                onClick={handleTriggerAlert}
                className="gap-1.5"
                title={isVietnamese ? "Gửi lại cảnh báo sự cố qua App & Email" : "Re-notify officers"}
              >
                <BellRing className="h-4 w-4 text-amber-500" />
                <span className="hidden sm:inline">{isVietnamese ? "Báo động lại" : "Re-notify"}</span>
              </Button>
            )}

            {incident.status === "PENDING_REVIEW" && canReview && (
              <Button
                variant="primary"
                onClick={() => setIsReviewOpen(true)}
                className="animate-gentle-pulse-ring gap-1.5 font-bold shadow-md"
              >
                <CheckSquare className="h-4 w-4" />
                <span>{t("incidents.actions.review")}</span>
                <span className="hidden xl:inline-block rounded bg-primary-foreground/20 px-1.5 py-0.2 text-[9px] font-extrabold uppercase tracking-wider">
                  {isVietnamese ? "Bước tiếp theo" : "Next"}
                </span>
              </Button>
            )}

            {incident.status === "CONFIRMED" && !hasAssignments && (
              <>
                {canAssign && (
                  <Button
                    variant="primary"
                    onClick={() => setIsAssignOpen(true)}
                    className="animate-gentle-pulse-ring gap-1.5 font-bold shadow-md"
                  >
                    <UserCheck className="h-4 w-4" />
                    <span>{t("incidents.actions.assign")}</span>
                    <span className="hidden xl:inline-block rounded bg-primary-foreground/20 px-1.5 py-0.2 text-[9px] font-extrabold uppercase tracking-wider">
                      {isVietnamese ? "Bước tiếp theo" : "Next"}
                    </span>
                  </Button>
                )}
                {canSelfOrAssignedResolve && (
                  <Button
                    variant="outline"
                    onClick={() => setIsResolveOpen(true)}
                    className="gap-1.5 text-emerald-600 hover:text-emerald-700"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{t("incidents.actions.resolve")}</span>
                  </Button>
                )}
              </>
            )}

            {incident.status === "CONFIRMED" && hasAssignments && (
              <>
                {canAssign && (
                  <Button
                    variant="outline"
                    onClick={() => setIsAssignOpen(true)}
                    className="gap-1.5"
                  >
                    <UserCheck className="h-4 w-4 text-primary" />
                    <span>{t("incidents.actions.assign")}</span>
                  </Button>
                )}
                {canSelfOrAssignedResolve && (
                  <Button
                    variant="primary"
                    onClick={() => setIsResolveOpen(true)}
                    className="animate-gentle-pulse-ring gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md dark:bg-emerald-600 font-bold"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{t("incidents.actions.resolve")}</span>
                    <span className="hidden xl:inline-block rounded bg-white/20 px-1.5 py-0.2 text-[9px] font-extrabold uppercase tracking-wider">
                      {isVietnamese ? "Bước tiếp theo" : "Next"}
                    </span>
                  </Button>
                )}
              </>
            )}

            {(incident.status === "RESOLVED" || incident.status === "DISMISSED") && canClose && (
              <Button
                variant="primary"
                onClick={() => setIsCloseOpen(true)}
                className="animate-gentle-pulse-ring gap-1.5 bg-slate-700 hover:bg-slate-800 text-white dark:bg-slate-800 shadow-md font-bold"
              >
                <Archive className="h-4 w-4" />
                <span>{t("incidents.actions.close")}</span>
                <span className="hidden xl:inline-block rounded bg-white/20 px-1.5 py-0.2 text-[9px] font-extrabold uppercase tracking-wider">
                  {isVietnamese ? "Bước tiếp theo" : "Next"}
                </span>
              </Button>
            )}
          </div>
        }
      />

      {/* Lifecycle Progress Stepper */}
      <IncidentLifecycleStepper
        status={incident.status}
        hasAssignments={hasAssignments}
        onStepClick={handleStepperClick}
      />

      {/* Smart Next Action Guide */}
      <IncidentActionGuide
        status={incident.status}
        hasAssignments={hasAssignments}
        assignedOfficerName={assignedOfficerName}
        awaitingDispatch={awaitingDispatch}
        onReview={canReview ? () => setIsReviewOpen(true) : undefined}
        onAssign={canAssign ? () => setIsAssignOpen(true) : undefined}
        onResolve={canSelfOrAssignedResolve ? () => setIsResolveOpen(true) : undefined}
        onClose={canClose ? () => setIsCloseOpen(true) : undefined}
      />

      {/* Main Content Layout: 2 Columns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (Evidence & Integrity): 7 Cols */}
        <div
          id="incident-evidence-viewer"
          className={`space-y-6 lg:col-span-7 rounded-2xl transition-all duration-500 ${
            isHighlightCompare
              ? "ring-4 ring-rose-500/80 shadow-[0_0_28px_rgba(244,63,94,0.4)] animate-pulse"
              : ""
          }`}
        >
          <IncidentEvidenceViewer
            evidence={primaryEvidence}
            evidences={incident.evidences}
            snapshotUrl={effectiveSnapshotUrl || undefined}
            violationType={incident.violationType}
            confidence={incident.confidence}
            cameraId={incident.cameraId}
            incidentId={incident.id}
            defaultViewMode={searchParams.get("focus") === "compare" ? "split" : "single"}
          />

          <IncidentChecksumVerifier
            evidenceId={primaryEvidence?.id}
            expectedChecksum={primaryEvidence?.metadata?.checksum}
          />

          {/* Attached Evidence Files Management */}
          <section className="rounded-2xl border border-border/30 bg-surface p-4 shadow-nm-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-extrabold text-foreground">
                  {isVietnamese
                    ? `Tệp Minh chứng Đính kèm (${incident.evidences?.length ?? 0})`
                    : `Attached Evidence Files (${incident.evidences?.length ?? 0})`}
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  {isVietnamese
                    ? "Tải bản gốc có ghi nhận EvidenceAccessLog hoặc đính kèm thêm ảnh/video clip."
                    : "Download originals with access logging or attach additional snapshots/clips."}
                </p>
              </div>
              {canUpdate && incident.status !== "CLOSED" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAttachOpen(true)}
                  className="gap-1.5"
                >
                  <FilePlus2 className="h-3.5 w-3.5 text-primary" />
                  <span>{isVietnamese ? "Đính kèm" : "Attach"}</span>
                </Button>
              )}
            </div>

            {(!incident.evidences || incident.evidences.length === 0) ? (
              <p className="rounded-xl p-4 text-center text-xs text-muted-foreground shadow-nm-inset">
                {isVietnamese ? "Chưa có tệp minh chứng nào trong DB." : "No evidence files stored yet."}
              </p>
            ) : (
              <div className="space-y-2">
                {incident.evidences.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/20 bg-background/60 px-3 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="info" className="text-[10px]">
                          {ev.evidenceType}
                        </Badge>
                        <span className="truncate font-mono font-bold text-foreground">
                          {ev.fileName}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {new Date(ev.capturedAt).toLocaleString(locale)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadEvidence(ev)}
                        title={isVietnamese ? "Tải bản gốc" : "Download original"}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      {canDeleteEvidence && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-danger hover:text-danger"
                          onClick={() => setDeleteEvidenceTarget(ev)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Column (Metadata, Assignment & Comments): 5 Cols */}
        <div className="space-y-6 lg:col-span-5">
          <IncidentMetaCard incident={incident} />

          <IncidentAssignmentCard
            assignments={incident.assignments}
            onAssign={canAssign ? () => setIsAssignOpen(true) : undefined}
            canManage={
              canAssign &&
              incident.status !== "CLOSED" &&
              incident.status !== "DISMISSED"
            }
            isNextAction={incident.status === "CONFIRMED" && !hasAssignments}
          />

          <IncidentCommentsTimeline
            comments={comments.length > 0 ? comments : incident.comments}
            onSendComment={handleSendComment}
            loading={addCommentMutation.isPending}
          />

          <ResourceAuditTrailCard
            targetType="INCIDENT"
            targetId={incident.id}
            title={isVietnamese ? "Nhật ký Tác động Sự cố" : "Incident Audit Trail"}
          />
        </div>
      </div>

      {/* Modals & Dialogs */}
      <ReviewIncidentModal
        open={isReviewOpen}
        onOpenChange={setIsReviewOpen}
        incident={incident}
        loading={reviewMutation.isPending}
        onSubmit={handleReview}
      />

      <AssignIncidentModal
        open={isAssignOpen}
        onOpenChange={setIsAssignOpen}
        incident={incident}
        loading={isActionPending}
        onSubmit={handleAssign}
      />

      <ResolveIncidentModal
        key={id}
        open={isResolveOpen}
        onOpenChange={(open) => {
          if (!open && groupWorkspace && !groupWorkspace.confirmDiscard("single")) return;
          setIsResolveOpen(open);
        }}
        incident={incident}
        loading={isActionPending || !!groupWorkspace?.busy}
        canClose={!groupWorkspace && canClose}
        groupMode={!!groupWorkspace}
        onDirtyChange={markSingleDirty}
        onSubmit={handleResolve}
      />

      <CloseIncidentDialog
        open={isCloseOpen}
        onOpenChange={setIsCloseOpen}
        incident={incident}
        loading={closeMutation.isPending}
        onConfirm={handleClose}
      />

      <EditIncidentModal
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        incident={incident}
        loading={updateMutation.isPending}
        onSubmit={async (targetId, payload) => {
          await updateMutation.mutateAsync({ id: targetId, payload });
          refreshDetailAndLists();
        }}
      />

      <AttachEvidenceModal
        open={isAttachOpen}
        onOpenChange={setIsAttachOpen}
        incidentId={incident.id}
        cameraId={incident.cameraId}
        siteId={incident.siteId}
        loading={
          evidenceMutations.uploadDirect.isPending ||
          evidenceMutations.uploadViaPresigned.isPending
        }
        onUploadDirect={async (args) => {
          const res = await evidenceMutations.uploadDirect.mutateAsync(args);
          void groupWorkspace?.refresh();
          return res;
        }}
        onUploadPresigned={async (args) => {
          const res = await evidenceMutations.uploadViaPresigned.mutateAsync(args);
          void groupWorkspace?.refresh();
          return res;
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteEvidenceTarget)}
        onClose={() => setDeleteEvidenceTarget(null)}
        onConfirm={async () => {
          if (!deleteEvidenceTarget) return;
          await evidenceMutations.deleteEvidence.mutateAsync({
            evidenceId: deleteEvidenceTarget.id,
            incidentId: incident.id,
          });
          setDeleteEvidenceTarget(null);
          void groupWorkspace?.refresh();
        }}
        variant="danger"
        loading={evidenceMutations.deleteEvidence.isPending}
        title={isVietnamese ? "Xóa tệp minh chứng?" : "Delete evidence file?"}
        description={deleteEvidenceTarget?.fileName || ""}
        confirmText={t("common.delete")}
      />
    </div>
  );
}
