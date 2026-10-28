"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertOctagon,
  AlertTriangle,
  Archive,
  ArrowLeft,
  Building2,
  CheckCircle2,
  CheckSquare,
  Clock,
  Loader2,
  RefreshCw,
  ShieldAlert,
  UserCheck,
  Video,
} from "lucide-react";
import { PageHeader } from "@/components/features/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import {
  IncidentLifecycleStepper,
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
  const { t } = useLocale();
  const router = useRouter();

  // Queries
  const { data: incident, isLoading, refetch, isRefetching } = useIncidentDetail(id);
  const { data: comments = [] } = useIncidentComments(id);

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

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-2xl border border-border/40 bg-surface p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-warning" />
        <h3 className="text-lg font-bold text-foreground">Không tìm thấy sự cố #{id}</h3>
        <p className="text-sm text-muted-foreground">
          Sự cố có thể đã bị xóa hoặc đường dẫn không hợp lệ.
        </p>
        <Button variant="ghost" onClick={() => router.push("/incidents")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại danh sách sự cố</span>
        </Button>
      </div>
    );
  }

  const primaryEvidence = incident.evidences?.[0];

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
              title="Mở Camera AI Intelligence Studio"
            >
              <Video className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline">Xem Camera</span>
            </Button>

            {/* Quick Action: Mở Command Center Site */}
            {incident.siteId && (
              <Button
                variant="outline"
                onClick={() => router.push(`/sites/${incident.siteId}?tab=live-cameras`)}
                className="gap-1.5"
                title="Mở trung tâm điều hành công trường này"
              >
                <Building2 className="h-4 w-4 text-primary" />
                <span className="hidden sm:inline">Mở Công trường</span>
              </Button>
            )}

            {incident.status === "PENDING_REVIEW" && (
              <Button
                variant="primary"
                onClick={() => setIsReviewOpen(true)}
                className="gap-1.5"
              >
                <CheckSquare className="h-4 w-4" />
                <span>{t("incidents.actions.review")}</span>
              </Button>
            )}

            {(incident.status === "CONFIRMED" || incident.status === "PENDING_REVIEW") && (
              <Button
                variant="outline"
                onClick={() => setIsAssignOpen(true)}
                className="gap-1.5"
              >
                <UserCheck className="h-4 w-4 text-primary" />
                <span>{t("incidents.actions.assign")}</span>
              </Button>
            )}

            {incident.status === "CONFIRMED" && (
              <Button
                variant="primary"
                onClick={() => setIsResolveOpen(true)}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{t("incidents.actions.resolve")}</span>
              </Button>
            )}

            {incident.status === "RESOLVED" && (
              <Button
                variant="primary"
                onClick={() => setIsCloseOpen(true)}
                className="gap-1.5 bg-slate-700 hover:bg-slate-800 text-white dark:bg-slate-800"
              >
                <Archive className="h-4 w-4" />
                <span>{t("incidents.actions.close")}</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Lifecycle Progress Stepper */}
      <IncidentLifecycleStepper status={incident.status} />

      {/* Main Content Layout: 2 Columns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (Evidence & Integrity): 7 Cols */}
        <div className="space-y-6 lg:col-span-7">
          <IncidentEvidenceViewer
            evidence={primaryEvidence}
            snapshotUrl={incident.snapshotUrl}
            violationType={incident.violationType}
            confidence={incident.confidence}
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
          />

          <IncidentCommentsTimeline
            comments={comments.length > 0 ? comments : incident.comments}
            onSendComment={async (comment) => {
              await addCommentMutation.mutateAsync({
                incidentId: incident.id,
                comment,
              });
            }}
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
        onSubmit={async (id, payload) => {
          await reviewMutation.mutateAsync({ id, payload });
        }}
      />

      <AssignIncidentModal
        open={isAssignOpen}
        onOpenChange={setIsAssignOpen}
        incident={incident}
        loading={assignMutation.isPending}
        onSubmit={async (incidentId, payload) => {
          await assignMutation.mutateAsync({ incidentId, payload });
        }}
      />

      <ResolveIncidentModal
        open={isResolveOpen}
        onOpenChange={setIsResolveOpen}
        incident={incident}
        loading={resolveMutation.isPending}
        onSubmit={async (id, payload) => {
          await resolveMutation.mutateAsync({ id, payload });
        }}
      />

      <CloseIncidentDialog
        open={isCloseOpen}
        onOpenChange={setIsCloseOpen}
        incident={incident}
        loading={closeMutation.isPending}
        onConfirm={async (id, payload) => {
          await closeMutation.mutateAsync({ id, payload });
        }}
      />
    </div>
  );
}
