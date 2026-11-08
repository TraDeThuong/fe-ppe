"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  Building2,
  CheckCircle2,
  CheckSquare,
  Loader2,
  RefreshCw,
  ShieldAlert,
  UserCheck,
  Video,
} from "lucide-react";
import { PageHeader } from "@/components/features/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { useRealtime } from "@/contexts/RealtimeContext";
import { toast } from "@/lib/toast";
import {
  EVIDENCE_TYPE,
  type IncidentItem,
  type IncidentCommentItem,
  type IncidentAssignmentItem,
  type IncidentStatusHistoryItem,
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
} from "@/components/features/incidents";
import {
  useIncidentDetail,
  useIncidentComments,
  useAddIncidentComment,
  useReviewIncident,
  useAssignOfficer,
  useResolveIncident,
  useCloseIncident,
} from "@/hooks";

interface IncidentDetailContentProps {
  id: string;
}

export default function IncidentDetailContent({ id }: IncidentDetailContentProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const {
    data: incident,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useIncidentDetail(id);

  const { data: comments = [] } = useIncidentComments(id);

  // Tự động làm mới dữ liệu khi có cảnh báo/sự kiện liên quan đến sự cố hiện tại
  useEffect(() => {
    if (!lastAlert) return;
    const alertData = lastAlert.data as Record<string, unknown> | undefined;
    const alertIncidentId = (alertData?.incidentId as string) || (alertData?.id as string);
    if (alertIncidentId === id) {
      refetch();
    }
  }, [lastAlert, id, refetch]);

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

  // Mutations
  const addCommentMutation = useAddIncidentComment();
  const reviewMutation = useReviewIncident();
  const assignMutation = useAssignOfficer();
  const resolveMutation = useResolveIncident();
  const closeMutation = useCloseIncident();

  // Modals
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isResolveOpen, setIsResolveOpen] = useState(false);
  const [isCloseOpen, setIsCloseOpen] = useState(false);

  // Handlers gọi trực tiếp API Backend qua React Query mutations
  const handleSendComment = async (comment: string) => {
    if (!incident) return;
    await addCommentMutation.mutateAsync({ incidentId: incident.id, comment });
  };

  const handleReview = async (reviewId: string, payload: any) => {
    try {
      await reviewMutation.mutateAsync({ id: reviewId, payload });
      setIsReviewOpen(false);
    } catch (err) {
      console.error("Failed to review incident:", err);
    }
  };

  const handleAssign = async (incidentId: string, payload: any) => {
    try {
      await assignMutation.mutateAsync({ incidentId, payload });
      setIsAssignOpen(false);
    } catch (err) {
      console.error("Failed to assign incident:", err);
    }
  };

  const handleResolve = async (resolveId: string, payload: any) => {
    try {
      await resolveMutation.mutateAsync({ id: resolveId, payload });
      setIsResolveOpen(false);
    } catch (err) {
      console.error("Failed to resolve incident:", err);
    }
  };

  const handleClose = async (closeId: string, payload?: any) => {
    try {
      await closeMutation.mutateAsync({ id: closeId, payload });
      setIsCloseOpen(false);
    } catch (err) {
      console.error("Failed to close incident:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
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
    if (stepKey === "REVIEWED" && incident.status === "PENDING_REVIEW") {
      setIsReviewOpen(true);
    } else if (stepKey === "RESOLVING" && incident.status === "CONFIRMED") {
      setIsAssignOpen(true);
    } else if (stepKey === "RESOLVED" && incident.status === "CONFIRMED") {
      setIsResolveOpen(true);
    } else if (stepKey === "CLOSED" && incident.status === "RESOLVED") {
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

            {incident.status === "PENDING_REVIEW" && (
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
                <Button
                  variant="outline"
                  onClick={() => setIsResolveOpen(true)}
                  className="gap-1.5 text-emerald-600 hover:text-emerald-700"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{t("incidents.actions.resolve")}</span>
                </Button>
              </>
            )}

            {incident.status === "CONFIRMED" && hasAssignments && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsAssignOpen(true)}
                  className="gap-1.5"
                >
                  <UserCheck className="h-4 w-4 text-primary" />
                  <span>{t("incidents.actions.assign")}</span>
                </Button>
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
              </>
            )}

            {incident.status === "RESOLVED" && (
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
        onReview={() => setIsReviewOpen(true)}
        onAssign={() => setIsAssignOpen(true)}
        onResolve={() => setIsResolveOpen(true)}
        onClose={() => setIsCloseOpen(true)}
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
        </div>

        {/* Right Column (Metadata, Assignment & Comments): 5 Cols */}
        <div className="space-y-6 lg:col-span-5">
          <IncidentMetaCard incident={incident} />

          <IncidentAssignmentCard
            assignments={incident.assignments}
            onAssign={() => setIsAssignOpen(true)}
            canManage={incident.status !== "CLOSED"}
            isNextAction={incident.status === "CONFIRMED" && !hasAssignments}
          />

          <IncidentCommentsTimeline
            comments={comments.length > 0 ? comments : incident.comments}
            onSendComment={handleSendComment}
            loading={addCommentMutation.isPending}
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
        loading={assignMutation.isPending}
        onSubmit={handleAssign}
      />

      <ResolveIncidentModal
        open={isResolveOpen}
        onOpenChange={setIsResolveOpen}
        incident={incident}
        loading={resolveMutation.isPending}
        onSubmit={handleResolve}
      />

      <CloseIncidentDialog
        open={isCloseOpen}
        onOpenChange={setIsCloseOpen}
        incident={incident}
        loading={closeMutation.isPending}
        onConfirm={handleClose}
      />
    </div>
  );
}
