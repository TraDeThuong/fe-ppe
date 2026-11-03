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
  Sparkles,
  UserCheck,
  Video,
} from "lucide-react";
import { PageHeader } from "@/components/features/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import { toast } from "@/lib/toast";
import type {
  IncidentItem,
  IncidentCommentItem,
  IncidentAssignmentItem,
  IncidentStatusHistoryItem,
} from "@/types";
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
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const router = useRouter();

  const isSampleId = Boolean(id) && (id.startsWith("sample") || id.startsWith("mock") || id.startsWith("demo"));

  // Queries (chỉ fetch từ server nếu không phải sample ID)
  const { data: serverIncident, isLoading, refetch, isRefetching } = useIncidentDetail(id, !isSampleId);
  const { data: serverComments = [] } = useIncidentComments(id, !isSampleId);

  // Hồ sơ sự cố mẫu giả lập khi truy cập qua mã mô phỏng (ví dụ #sample-5491)
  const [sampleIncident, setSampleIncident] = useState<IncidentItem | null>(() => {
    if (!isSampleId) return null;
    const nowIso = new Date().toISOString();
    return {
      id,
      siteId: "01a1866d-094a-741c-8fe2-d679f1a46780",
      siteName: "Công trường Khu Nam (Mô Phỏng AI)",
      zoneId: "01a1866d-094a-741c-8fe2-d679f1a46781",
      zoneName: "Khu vực Giàn giáo & Lối ra vào công trình",
      cameraId: "01a18735-39f8-7ea2-822d-1e7765c59c73",
      cameraName: "Camera 01 - Giám sát toàn cảnh",
      cameraCode: "CAM-YOUTUBE-099999",
      violationType: "NO_HELMET",
      severity: "CRITICAL",
      status: "PENDING_REVIEW",
      detectedAt: nowIso,
      description: `AI Camera quét luồng video phát hiện công nhân vi phạm an toàn PPE (Không đội mũ bảo hộ trong vùng thi công). Đây là hồ sơ sự cố tạo từ phiên quét mô phỏng #${id}.`,
      createdAt: nowIso,
      updatedAt: nowIso,
      confidence: 0.96,
      snapshotUrl: "/images/evidence/camera-01a18735_16ee47ac_f76_red.jpg",
      evidences: [
        {
          id: `ev-${id}-1`,
          incidentId: id,
          cameraId: "01a18735-39f8-7ea2-822d-1e7765c59c73",
          evidenceType: "SNAPSHOT",
          storageKey: "evidence/camera-01a18735_16ee47ac_f76_red.jpg",
          fileName: "ai_violation_annotated_red.jpg",
          mimeType: "image/jpeg",
          fileSize: 230436,
          capturedAt: nowIso,
          createdAt: nowIso,
          url: "/images/evidence/camera-01a18735_16ee47ac_f76_red.jpg",
          metadata: {
            id: `meta-${id}-1`,
            evidenceId: `ev-${id}-1`,
            width: 1920,
            height: 1080,
            frameRate: 25,
            checksum: "sha256-16ee47acf44399281a18735redboxannotated",
            createdAt: nowIso,
          },
        },
        {
          id: `ev-${id}-2`,
          incidentId: id,
          cameraId: "01a18735-39f8-7ea2-822d-1e7765c59c73",
          evidenceType: "SNAPSHOT",
          storageKey: "evidence/camera-01a18735_16ee47ac_f76.jpg",
          fileName: "original_raw_frame.jpg",
          mimeType: "image/jpeg",
          fileSize: 230154,
          capturedAt: nowIso,
          createdAt: nowIso,
          url: "/images/evidence/camera-01a18735_16ee47ac_f76.jpg",
          metadata: {
            id: `meta-${id}-2`,
            evidenceId: `ev-${id}-2`,
            width: 1920,
            height: 1080,
            frameRate: 25,
            checksum: "sha256-76ee47acf44399281a18735originalraw",
            createdAt: nowIso,
          },
        },
        {
          id: `ev-${id}-3`,
          incidentId: id,
          cameraId: "01a18735-39f8-7ea2-822d-1e7765c59c73",
          evidenceType: "SNAPSHOT",
          storageKey: "camera-01a18735-evidence.jpg",
          fileName: "wide_angle_overview.jpg",
          mimeType: "image/jpeg",
          fileSize: 242000,
          capturedAt: nowIso,
          createdAt: nowIso,
          url: "/images/camera-01a18735-evidence.jpg",
          metadata: {
            id: `meta-${id}-3`,
            evidenceId: `ev-${id}-3`,
            width: 1920,
            height: 1080,
            frameRate: 25,
            checksum: "sha256-01a18735wideanglecontextsnapshot",
            createdAt: nowIso,
          },
        },
      ],
      statusHistory: [
        {
          id: `sh-${id}-1`,
          incidentId: id,
          oldStatus: "NONE",
          newStatus: "PENDING_REVIEW",
          changedBy: "AI-SYSTEM",
          changedByName: "Hệ thống AI YOLOv11 (Mô Phỏng)",
          changedAt: nowIso,
          reason: "Tự động phát hiện vi phạm qua luồng Camera Live / YouTube",
        },
      ],
      assignments: [],
      comments: [
        {
          id: `cm-${id}-1`,
          incidentId: id,
          userId: "system-ai",
          userName: "AI Safety Officer (Bot)",
          userRole: "AI Monitor",
          comment: `Hệ thống đã tự động ghi nhận sự cố #${id}, phát còi cảnh báo cấp độ CRITICAL và gửi thông báo Toast đến toàn bộ cán bộ an toàn.`,
          createdAt: nowIso,
        },
      ],
    };
  });

  const incident = isSampleId ? sampleIncident : serverIncident;
  const comments = isSampleId ? (sampleIncident?.comments || []) : serverComments;

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

  // Handlers hỗ trợ tương tác trên cả sự cố thật và sự cố mô phỏng
  const handleSendComment = async (comment: string) => {
    if (isSampleId) {
      const newCm: IncidentCommentItem = {
        id: `cm-${Date.now()}`,
        incidentId: id,
        userId: "current-user",
        userName: "Cán bộ An toàn (Bạn)",
        userRole: "SAFETY_OFFICER",
        comment,
        createdAt: new Date().toISOString(),
      };
      setSampleIncident((prev) => (prev ? { ...prev, comments: [newCm, ...(prev.comments || [])] } : null));
      toast.success(isVietnamese ? "Đã gửi bình luận mô phỏng!" : "Comment added!");
      return;
    }
    await addCommentMutation.mutateAsync({ incidentId: incident!.id, comment });
  };

  const handleReview = async (reviewId: string, payload: any) => {
    if (isSampleId) {
      setSampleIncident((prev) => {
        if (!prev) return null;
        const newStatus = payload.action === "CONFIRM" ? "CONFIRMED" : "DISMISSED";
        const historyItem: IncidentStatusHistoryItem = {
          id: `sh-${Date.now()}`,
          incidentId: id,
          oldStatus: prev.status,
          newStatus,
          changedBy: "user",
          changedByName: "Bạn (Cán bộ giám sát)",
          changedAt: new Date().toISOString(),
          reason: payload.note || "Đã thẩm duyệt sự cố",
        };
        return {
          ...prev,
          status: newStatus,
          statusHistory: [historyItem, ...(prev.statusHistory || [])],
        };
      });
      setIsReviewOpen(false);
      toast.success(isVietnamese ? "Đã thẩm duyệt sự cố mô phỏng thành công!" : "Incident reviewed!");
      return;
    }
    await reviewMutation.mutateAsync({ id: reviewId, payload });
  };

  const handleAssign = async (incidentId: string, payload: any) => {
    if (isSampleId) {
      setSampleIncident((prev) => {
        if (!prev) return null;
        const assignItem: IncidentAssignmentItem = {
          id: `as-${Date.now()}`,
          incidentId: id,
          assignedTo: payload.assignedTo,
          assignedToName: "Kỹ sư Giám sát Hiện trường",
          assignedAt: new Date().toISOString(),
          status: "PENDING",
          priority: payload.priority || "HIGH",
          note: payload.note,
        };
        return {
          ...prev,
          assignments: [assignItem, ...(prev.assignments || [])],
        };
      });
      setIsAssignOpen(false);
      toast.success(isVietnamese ? "Đã phân công cán bộ xử lý mô phỏng!" : "Assigned successfully!");
      return;
    }
    await assignMutation.mutateAsync({ incidentId, payload });
  };

  const handleResolve = async (resolveId: string, payload: any) => {
    if (isSampleId) {
      setSampleIncident((prev) => {
        if (!prev) return null;
        const historyItem: IncidentStatusHistoryItem = {
          id: `sh-${Date.now()}`,
          incidentId: id,
          oldStatus: prev.status,
          newStatus: "RESOLVED",
          changedBy: "user",
          changedByName: "Bạn (Cán bộ giám sát)",
          changedAt: new Date().toISOString(),
          reason: payload.resolutionNote || "Đã khắc phục hiện trường",
        };
        return {
          ...prev,
          status: "RESOLVED",
          resolvedAt: new Date().toISOString(),
          statusHistory: [historyItem, ...(prev.statusHistory || [])],
        };
      });
      setIsResolveOpen(false);
      toast.success(isVietnamese ? "Đã xác nhận khắc phục sự cố mô phỏng!" : "Resolved successfully!");
      return;
    }
    await resolveMutation.mutateAsync({ id: resolveId, payload });
  };

  const handleClose = async (closeId: string, payload?: any) => {
    if (isSampleId) {
      setSampleIncident((prev) => {
        if (!prev) return null;
        const historyItem: IncidentStatusHistoryItem = {
          id: `sh-${Date.now()}`,
          incidentId: id,
          oldStatus: prev.status,
          newStatus: "CLOSED",
          changedBy: "user",
          changedByName: "Bạn (Cán bộ giám sát)",
          changedAt: new Date().toISOString(),
          reason: payload?.closingNote || "Đã nghiệm thu và đóng hồ sơ",
        };
        return {
          ...prev,
          status: "CLOSED",
          statusHistory: [historyItem, ...(prev.statusHistory || [])],
        };
      });
      setIsCloseOpen(false);
      toast.success(isVietnamese ? "Đã nghiệm thu và đóng hồ sơ mô phỏng!" : "Incident closed!");
      return;
    }
    await closeMutation.mutateAsync({ id: closeId, payload });
  };

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
        <h3 className="text-lg font-bold text-foreground">
          {isVietnamese ? `Không tìm thấy sự cố #${id}` : `Incident #${id} not found`}
        </h3>
        <p className="text-sm text-muted-foreground">
          {isVietnamese
            ? "Sự cố có thể đã bị xóa hoặc đường dẫn không hợp lệ."
            : "This incident may have been deleted or the URL is invalid."}
        </p>
        <Button variant="ghost" onClick={() => router.push("/incidents")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          <span>{isVietnamese ? "Quay lại danh sách sự cố" : "Back to incidents list"}</span>
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

      {/* Banner thông báo nếu là sự cố mô phỏng / mẫu */}
      {isSampleId && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-3.5 text-xs text-amber-200 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              {isVietnamese
                ? "Đây là hồ sơ sự cố tạo từ phiên quét mô phỏng kiểm thử AI Camera. Toàn bộ các thao tác Thẩm duyệt, Phân công, Khắc phục và Bình luận đều có thể tương tác trực tiếp."
                : "This is a simulated incident profile from AI Camera test scan. All actions (Review, Assign, Resolve, Comments) are fully interactive."}
            </span>
          </div>
          <span className="rounded-full border border-amber-500/40 bg-amber-500/20 px-3 py-1 font-mono text-[11px] font-bold tracking-wider text-amber-300">
            MÔ PHỎNG / SIMULATION
          </span>
        </div>
      )}

      {/* Lifecycle Progress Stepper */}
      <IncidentLifecycleStepper status={incident.status} />

      {/* Main Content Layout: 2 Columns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (Evidence & Integrity): 7 Cols */}
        <div className="space-y-6 lg:col-span-7">
          <IncidentEvidenceViewer
            evidence={primaryEvidence}
            evidences={incident.evidences}
            snapshotUrl={incident.snapshotUrl}
            violationType={incident.violationType}
            confidence={incident.confidence}
            cameraId={incident.cameraId}
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
