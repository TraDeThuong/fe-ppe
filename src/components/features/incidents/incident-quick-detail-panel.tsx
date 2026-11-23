"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  BellRing,
  Building2,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  CheckSquare,
  Clock,
  Columns2,
  Edit3,
  ExternalLink,
  FileCheck2,
  Image as ImageIcon,
  MapPin,
  Maximize2,
  RefreshCw,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserPlus,
  Video,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { IncidentSeverityBadge } from "./incident-severity-badge";
import { RefreshIconButton } from "@/components/ui/refresh-action";
import { IncidentStatusBadge } from "./incident-status-badge";
import { useAuth } from "@/contexts/AuthContext";
import { useCan } from "@/hooks/use-can";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { useIncidentDetail } from "@/hooks/incidents/use-incident-detail";
import { isDockerInternalMinioUrl, resolveEvidenceUrl } from "@/lib/evidence-url";
import { isIncidentAssignedToUser } from "@/lib/incident-workflow";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
import { incidentService, notificationService } from "@/services";
import {
  EVIDENCE_TYPE,
  type EvidenceItem,
  type IncidentItem,
  type NotificationSeverity,
} from "@/types";

export interface IncidentQuickDetailPanelProps {
  incident: IncidentItem | null;
  onReview?: (incident: IncidentItem) => void;
  onAssign?: (incident: IncidentItem) => void;
  onResolve?: (incident: IncidentItem) => void;
  onCloseIncident?: (incident: IncidentItem) => void;
  onEdit?: (incident: IncidentItem) => void;
  onDelete?: (incident: IncidentItem) => void;
  onCloseDrawer?: () => void;
  className?: string;
}

function isReferenceEvidenceItem(ev: EvidenceItem): boolean {
  const evUrlLower = (ev.url || ev.storageKey || "").toLowerCase();
  const fileNameLower = (ev.fileName || "").toLowerCase();
  return (
    ev.evidenceType === EVIDENCE_TYPE.REFERENCE_SNAPSHOT ||
    ev.evidenceType === "REFERENCE" ||
    evUrlLower.includes("reference_snapshot") ||
    evUrlLower.includes("_ref") ||
    fileNameLower.includes("reference") ||
    fileNameLower.includes("_ref")
  );
}

export function IncidentQuickDetailPanel({
  incident,
  onReview,
  onAssign,
  onResolve,
  onCloseIncident,
  onEdit,
  onDelete,
  onCloseDrawer,
  className = "",
}: IncidentQuickDetailPanelProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const { user } = useAuth();
  const can = useCan();
  const canRead = can("PPE_INCIDENT_READ");
  const { getSiteName, getZoneName, getCameraCode, getCameraName, getCamera } =
    useEntityLookup();

  const [evidenceTab, setEvidenceTab] = useState<"violation" | "compare">("violation");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [signedSnapshotUrl, setSignedSnapshotUrl] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);

  const incidentId = incident?.id ?? "";

  // Hydrate full detail in background (cached 30s) while rendering initial list item immediately
  const detailQuery = useIncidentDetail(
    incidentId,
    Boolean(incidentId) && canRead,
    user?.id,
  );

  // Reset local viewer state when switching to a different incident
  useEffect(() => {
    setEvidenceTab("violation");
    setLightboxOpen(false);
    setSignedSnapshotUrl(null);
    setImgError(false);
  }, [incidentId]);

  const current = useMemo<IncidentItem | null>(() => {
    if (!incident) return null;
    const detail = detailQuery.data;
    if (!detail || detail.id !== incident.id) return incident;

    const hydratedAssignees = new Map(
      (incident.assignments ?? []).map((a) => [a.id, a]),
    );
    const mergedAssignments = (
      detail.assignments?.length ? detail.assignments : incident.assignments ?? []
    ).map((a) => {
      const fallback = hydratedAssignees.get(a.id);
      return {
        ...a,
        assignedToName: a.assignedToName || fallback?.assignedToName,
        assignedToEmail: a.assignedToEmail || fallback?.assignedToEmail,
      };
    });

    return {
      ...incident,
      ...detail,
      siteName: detail.siteName || incident.siteName,
      zoneName: detail.zoneName || incident.zoneName,
      cameraCode: detail.cameraCode || incident.cameraCode,
      cameraName: detail.cameraName || incident.cameraName,
      assignments: mergedAssignments,
    };
  }, [incident, detailQuery.data]);

  const targetCamera = useMemo(
    () => (current?.cameraId ? getCamera(current.cameraId) : undefined),
    [current?.cameraId, getCamera],
  );

  const { primaryEvidence, primaryEvidenceUrl, referenceEvidenceUrl } = useMemo(() => {
    if (!current) {
      return {
        primaryEvidence: null as EvidenceItem | null,
        primaryEvidenceUrl: "",
        referenceEvidenceUrl: "",
      };
    }

    const evidences = current.evidences ?? [];
    const snap =
      evidences.find((e) => e.evidenceType === EVIDENCE_TYPE.SNAPSHOT) ||
      evidences.find((e) => !isReferenceEvidenceItem(e)) ||
      evidences[0] ||
      null;
    const ref = evidences.find((e) => isReferenceEvidenceItem(e)) || null;

    let cachedIncidentImg = "";
    let cachedRefImg = "";
    if (typeof window !== "undefined") {
      cachedIncidentImg =
        sessionStorage.getItem(`ppe_incident_evidence_${current.id}`) ||
        (current.cameraId
          ? sessionStorage.getItem(`ppe_camera_evidence_${current.cameraId.toLowerCase()}`) || ""
          : "");
      cachedRefImg =
        sessionStorage.getItem(`ppe_incident_ref_evidence_${current.id}`) ||
        (current.cameraId
          ? sessionStorage.getItem(`ppe_camera_ref_evidence_${current.cameraId.toLowerCase()}`) || ""
          : "");
    }

    const resolvedPrimary =
      (cachedIncidentImg ? resolveEvidenceUrl(cachedIncidentImg) : "") ||
      (snap?.url ? resolveEvidenceUrl(snap.url) : "") ||
      (snap?.storageKey ? resolveEvidenceUrl(snap.storageKey) : "") ||
      (current.snapshotUrl ? resolveEvidenceUrl(current.snapshotUrl) : "") ||
      (targetCamera?.snapshotUrl ? resolveEvidenceUrl(targetCamera.snapshotUrl) : "");

    const resolvedRef =
      (ref?.url ? resolveEvidenceUrl(ref.url) : "") ||
      (ref?.storageKey ? resolveEvidenceUrl(ref.storageKey) : "") ||
      (cachedRefImg ? resolveEvidenceUrl(cachedRefImg) : "");

    return {
      primaryEvidence: snap,
      primaryEvidenceUrl: resolvedPrimary,
      referenceEvidenceUrl: resolvedRef && resolvedRef !== resolvedPrimary ? resolvedRef : "",
    };
  }, [current, targetCamera]);

  const effectivePrimaryUrl = signedSnapshotUrl || primaryEvidenceUrl;

  const handleImageError = async () => {
    if (!signedSnapshotUrl && primaryEvidence?.id) {
      try {
        const res = await incidentService.getEvidenceDownloadUrl(primaryEvidence.id, {
          action: "VIEW",
        });
        const nextUrl =
          isDockerInternalMinioUrl(res.downloadUrl) && primaryEvidence.storageKey
            ? resolveEvidenceUrl(primaryEvidence.storageKey)
            : res.downloadUrl;
        if (nextUrl && nextUrl !== primaryEvidenceUrl) {
          setSignedSnapshotUrl(nextUrl);
          return;
        }
      } catch {
        // Fallback below
      }
    }
    setImgError(true);
  };

  // Empty placeholder when no incident is selected
  if (!current) {
    return (
      <section
        aria-label={isVietnamese ? "Chi tiết nhanh sự cố" : "Incident quick detail"}
        className={`flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-3xl border border-border/35 bg-surface/90 p-8 text-center shadow-[6px_6px_16px_var(--shadow-dark),-6px_-6px_16px_var(--shadow-light)] ${className}`}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-nm-inset">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <div className="max-w-xs space-y-1">
          <h3 className="text-sm font-extrabold text-foreground">
            {isVietnamese
              ? "Chọn một sự cố để xem nhanh"
              : "Select an incident to inspect"}
          </h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {isVietnamese
              ? "Click vào bất kỳ thẻ sự cố nào ở cột bên trái để xem ảnh bằng chứng và thao tác xử lý ngay tại đây."
              : "Click any incident card on the left column to review evidence and take quick actions right here."}
          </p>
        </div>
      </section>
    );
  }

  // Permissions & Role Logic (aligned 100% with /incidents/[id])
  const isOfficerRole = (user?.role || "").toUpperCase() === "SAFETY_OFFICER";
  const canReview = !isOfficerRole && Boolean(onReview) && can("PPE_INCIDENT_REVIEW");
  const canAssign = !isOfficerRole && Boolean(onAssign) && can("PPE_INCIDENT_MANAGE");
  const canResolve = Boolean(onResolve) && can("PPE_INCIDENT_UPDATE");
  const canClose = !isOfficerRole && Boolean(onCloseIncident) && can("PPE_INCIDENT_MANAGE");
  const canEdit =
    Boolean(onEdit) && can("PPE_INCIDENT_UPDATE") && current.status !== "CLOSED";
  const canDelete = Boolean(onDelete) && can("PPE_INCIDENT_DELETE");
  const canTriggerAlert =
    !isOfficerRole &&
    current.status !== "CLOSED" &&
    (can("PPE_INCIDENT_UPDATE") ||
      can("PPE_INCIDENT_MANAGE") ||
      can("NOTIFICATION_CREATE"));

  const hasAssignments = Boolean(current.assignments && current.assignments.length > 0);
  const activeAssignment =
    current.assignments?.find((a) => a.status === "ACTIVE") || current.assignments?.[0];
  const isOfficerAssigned = isIncidentAssignedToUser(current, user?.id);
  const awaitingDispatch = isOfficerRole && !isOfficerAssigned;
  const canSelfOrAssignedResolve =
    canResolve && (!isOfficerRole || isOfficerAssigned);

  const siteName = current.siteName || getSiteName(current.siteId);
  const zoneName =
    current.zoneName || getZoneName(current.siteId, current.zoneId) || "—";
  const cameraCode = current.cameraCode || getCameraCode(current.cameraId);
  const cameraName = current.cameraName || getCameraName(current.cameraId);
  const detectedDate = new Date(current.detectedAt).toLocaleString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

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

  // Compact 5-step lifecycle calculation
  const isDismissed = current.status === "DISMISSED";
  const steps = [
    { key: "DETECTED", label: isVietnamese ? "AI" : "AI" },
    { key: "REVIEWED", label: isVietnamese ? "Duyệt" : "Review" },
    { key: "RESOLVING", label: isVietnamese ? "Giao" : "Assign" },
    { key: "RESOLVED", label: isVietnamese ? "Khắc phục" : "Resolve" },
    { key: "CLOSED", label: isVietnamese ? "Đóng" : "Close" },
  ];

  let currentWeight = 1;
  if (current.status === "PENDING_REVIEW") currentWeight = 1;
  else if (current.status === "CONFIRMED") currentWeight = hasAssignments ? 3 : 2;
  else if (current.status === "RESOLVED") currentWeight = 4;
  else if (current.status === "CLOSED") currentWeight = 5;

  const handleStepClick = (stepKey: string) => {
    if (stepKey === "REVIEWED" && current.status === "PENDING_REVIEW" && canReview) {
      onReview?.(current);
    } else if (stepKey === "RESOLVING" && current.status === "CONFIRMED" && canAssign) {
      onAssign?.(current);
    } else if (
      stepKey === "RESOLVED" &&
      current.status === "CONFIRMED" &&
      canSelfOrAssignedResolve
    ) {
      onResolve?.(current);
    } else if (stepKey === "CLOSED" && current.status === "RESOLVED" && canClose) {
      onCloseIncident?.(current);
    }
  };

  const handleTriggerAlert = async () => {
    setIsNotifying(true);
    try {
      await notificationService.triggerIncidentNotification({
        incidentId: current.id,
        siteId: current.siteId,
        cameraId: current.cameraId,
        violationType: current.violationType,
        severity: (current.severity || "HIGH") as NotificationSeverity,
        channels: ["IN_APP", "EMAIL"],
        evidenceUrl: effectivePrimaryUrl || undefined,
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

  const evidenceCount = current.evidences?.length ?? current._count?.evidences ?? 0;
  const deadlineLabel = activeAssignment?.deadline
    ? new Date(activeAssignment.deadline).toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    })
    : isVietnamese
      ? "Trong ca trực"
      : "Current shift";

  return (
    <section
      aria-label={
        isVietnamese
          ? `Chi tiết nhanh sự cố #${current.id.slice(0, 8)}`
          : `Quick detail for incident #${current.id.slice(0, 8)}`
      }
      className={`flex flex-col gap-3.5 ${className}`}
    >
      {/* ── 1. UNIFIED COMMAND HEADER & WORKFLOW RAIL ───────────────────────── */}
      <div className="space-y-3 rounded-2xl border border-white/40 bg-surface p-4 shadow-nm-sm dark:border-white/[0.06]">
        {/* Top Row: Identity + Tactile Action Keys */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-border/30 bg-background/85 px-2.5 py-0.5 font-mono text-xs font-black tracking-wider text-primary shadow-nm-inset">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary shadow-[0_0_6px_rgba(var(--primary),0.8)]" />
                #{current.id.slice(0, 8)}
              </span>
              <IncidentSeverityBadge severity={current.severity} />
              <IncidentStatusBadge status={current.status} />
            </div>

            <h3 className="text-base font-black tracking-tight text-foreground sm:text-lg">
              {formatViolation(current.violationType)}
            </h3>
          </div>

          {/* Physical Neumorphic Keys */}
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            <RefreshIconButton
              onRefresh={() => {
                setImgError(false);
                setSignedSnapshotUrl(null);
                return detailQuery.refetch();
              }}
              isRefreshing={detailQuery.isFetching}
              title={isVietnamese ? "Làm mới chi tiết sự cố" : "Refresh incident detail"}
              ariaLabel={isVietnamese ? "Làm mới" : "Refresh"}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-white/40 bg-surface text-muted-foreground shadow-nm-sm hover:text-primary active:scale-95 active:shadow-nm-inset disabled:opacity-50 dark:border-white/[0.06]"
              iconClassName="h-3.5 w-3.5"
            />

            {canTriggerAlert && (
              <button
                type="button"
                onClick={() => void handleTriggerAlert()}
                disabled={isNotifying}
                title={isVietnamese ? "Gửi lại cảnh báo sự cố" : "Re-notify officers"}
                aria-label={isVietnamese ? "Báo động lại" : "Re-notify"}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/40 bg-surface text-amber-500 shadow-nm-sm transition-all duration-150 hover:bg-amber-500/10 active:scale-95 active:shadow-nm-inset disabled:opacity-50 dark:border-white/[0.06]"
              >
                <BellRing className={`h-3.5 w-3.5 ${isNotifying ? "animate-pulse" : ""}`} />
              </button>
            )}

            {canEdit && (
              <button
                type="button"
                onClick={() => onEdit?.(current)}
                title={isVietnamese ? "Chỉnh sửa sự cố" : "Edit incident"}
                aria-label={isVietnamese ? "Sửa" : "Edit"}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/40 bg-surface text-muted-foreground shadow-nm-sm transition-all duration-150 hover:text-primary active:scale-95 active:shadow-nm-inset dark:border-white/[0.06]"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>
            )}

            {canDelete && (
              <button
                type="button"
                onClick={() => onDelete?.(current)}
                title={t("incidents.actions.delete")}
                aria-label={t("incidents.actions.delete")}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/40 bg-surface text-muted-foreground shadow-nm-sm transition-all duration-150 hover:text-danger active:scale-95 active:shadow-nm-inset dark:border-white/[0.06]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}

            <Link
              href={`/incidents/${current.id}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 text-xs font-extrabold text-primary shadow-nm-sm transition-all duration-150 hover:bg-primary hover:text-primary-foreground active:scale-95 active:shadow-nm-inset"
              title={
                isVietnamese
                  ? "Mở trang chi tiết đầy đủ (/incidents/[id])"
                  : "Open full incident detail page"
              }
            >
              <span>{isVietnamese ? "Mở đầy đủ" : "Full View"}</span>
              <ExternalLink className="h-3 w-3" />
            </Link>

            {onCloseDrawer && (
              <button
                type="button"
                onClick={onCloseDrawer}
                aria-label={isVietnamese ? "Đóng cửa sổ chi tiết" : "Close detail panel"}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/40 bg-surface text-muted-foreground shadow-nm-sm transition-all duration-150 hover:text-foreground active:scale-95 active:shadow-nm-inset dark:border-white/[0.06]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Bottom Row: Compact Recessed Stepper + Primary CTA */}
        <div className="flex flex-col gap-2.5 rounded-xl border border-border/25 bg-background/60 p-2.5 shadow-nm-inset sm:flex-row sm:items-center sm:justify-between">
          {/* 5-Step Progress Track */}
          <div className="flex flex-1 items-center justify-between gap-1 px-1">
            {steps.map((step, idx) => {
              const state = isDismissed
                ? idx === 0
                  ? "completed"
                  : idx === 1
                    ? "dismissed"
                    : "inactive"
                : idx < currentWeight
                  ? "completed"
                  : idx === currentWeight
                    ? "current"
                    : "inactive";

              const isStepActionable =
                state === "current" &&
                ((step.key === "REVIEWED" && canReview) ||
                  (step.key === "RESOLVING" && canAssign) ||
                  (step.key === "RESOLVED" && canSelfOrAssignedResolve) ||
                  (step.key === "CLOSED" && canClose));

              return (
                <div key={step.key} className="flex flex-1 items-center">
                  <button
                    type="button"
                    disabled={!isStepActionable}
                    onClick={() => handleStepClick(step.key)}
                    className={`flex min-w-0 flex-1 flex-col items-center gap-1 ${isStepActionable ? "group cursor-pointer" : "cursor-default"
                      }`}
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black transition-all duration-200 ${state === "completed"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : state === "current"
                            ? "border-2 border-primary bg-surface text-primary shadow-nm-sm ring-4 ring-primary/15 group-hover:scale-110"
                            : state === "dismissed"
                              ? "bg-muted text-muted-foreground"
                              : "border border-border/50 bg-background/80 text-muted-foreground/70"
                        }`}
                    >
                      {state === "completed" ? (
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      ) : state === "dismissed" ? (
                        <XCircle className="h-2.5 w-2.5" />
                      ) : (
                        idx + 1
                      )}
                    </span>
                    <span
                      className={`truncate text-[10px] tracking-tight ${state === "current"
                          ? "font-extrabold text-primary"
                          : state === "completed"
                            ? "font-bold text-foreground"
                            : "font-medium text-muted-foreground"
                        }`}
                    >
                      {step.label}
                    </span>
                  </button>
                  {idx < steps.length - 1 && (
                    <div
                      className={`-mt-3.5 h-0.5 w-2.5 shrink-0 rounded-full transition-colors sm:w-4 ${!isDismissed && idx < currentWeight
                          ? "bg-primary shadow-[0_0_6px_rgba(var(--primary),0.45)]"
                          : "bg-border/50"
                        }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Inline Contextual CTA */}
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border/25 pt-2 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0">
            {current.status === "PENDING_REVIEW" && (
              <>
                {canReview ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    onClick={() => onReview?.(current)}
                    className="h-8 gap-1.5 rounded-xl px-3 font-extrabold shadow-nm-sm transition-transform active:scale-95"
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                    <span>{t("incidents.actions.review")}</span>
                  </Button>
                ) : (
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {isVietnamese ? "Chờ Quản lý duyệt" : "Awaiting review"}
                  </span>
                )}
              </>
            )}

            {current.status === "CONFIRMED" && !hasAssignments && (
              <>
                {canAssign && (
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    onClick={() => onAssign?.(current)}
                    className="h-8 gap-1.5 rounded-xl px-3 font-extrabold shadow-nm-sm transition-transform active:scale-95"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>{t("incidents.actions.assign")}</span>
                  </Button>
                )}
                {canSelfOrAssignedResolve && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onResolve?.(current)}
                    className="h-8 gap-1.5 rounded-xl px-3 font-bold text-emerald-600 shadow-nm-sm transition-transform hover:text-emerald-700 active:scale-95"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{t("incidents.actions.resolve")}</span>
                  </Button>
                )}
                {awaitingDispatch && (
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {isVietnamese ? "Chờ phân công" : "Awaiting dispatch"}
                  </span>
                )}
              </>
            )}

            {current.status === "CONFIRMED" && hasAssignments && (
              <>
                {canSelfOrAssignedResolve && (
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    onClick={() => onResolve?.(current)}
                    className="h-8 gap-1.5 rounded-xl bg-emerald-600 px-3 font-extrabold text-white shadow-nm-sm transition-transform hover:bg-emerald-700 active:scale-95 dark:bg-emerald-600"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{t("incidents.actions.resolve")}</span>
                  </Button>
                )}
                {canAssign && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onAssign?.(current)}
                    className="h-8 gap-1.5 rounded-xl px-2.5 font-bold shadow-nm-sm transition-transform active:scale-95"
                  >
                    <UserPlus className="h-3.5 w-3.5 text-primary" />
                    <span>{isVietnamese ? "Đổi người" : "Reassign"}</span>
                  </Button>
                )}
                {awaitingDispatch && !canAssign && (
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {isVietnamese ? "Đã giao cán bộ khác" : "Assigned to other"}
                  </span>
                )}
              </>
            )}

            {(current.status === "RESOLVED" || current.status === "DISMISSED") && (
              <>
                {canClose ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    onClick={() => onCloseIncident?.(current)}
                    className="h-8 gap-1.5 rounded-xl bg-slate-700 px-3 font-extrabold text-white shadow-nm-sm transition-transform hover:bg-slate-800 active:scale-95 dark:bg-slate-800"
                  >
                    <Archive className="h-3.5 w-3.5" />
                    <span>{t("incidents.actions.close")}</span>
                  </Button>
                ) : (
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {current.status === "RESOLVED"
                      ? isVietnamese
                        ? "Chờ nghiệm thu đóng"
                        : "Awaiting closure"
                      : isVietnamese
                        ? "Đã bác bỏ"
                        : "Dismissed"}
                  </span>
                )}
              </>
            )}

            {current.status === "CLOSED" && (
              <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/15 px-2.5 py-1 text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                <FileCheck2 className="h-3.5 w-3.5" />
                <span>{isVietnamese ? "Đã đóng hồ sơ" : "Closed"}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. ASYMMETRIC HERO BENTO: EXPANDED AI MONITOR (8/12) + SPEC RAIL (4/12) ── */}
      <div className="grid grid-cols-1 items-stretch gap-3.5 lg:grid-cols-12">
        {/* CỘT TRÁI (8/12): MÀN HÌNH BẰNG CHỨNG AI CỠ LỚN */}
        <div className="flex flex-col gap-3 lg:col-span-8">
          <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/40 bg-surface p-2.5 shadow-nm-sm dark:border-white/[0.06]">
            {/* Monitor Header */}
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-background/85 text-primary shadow-nm-inset">
                  <ImageIcon className="h-3.5 w-3.5" />
                </span>
                <span className="font-extrabold tracking-tight text-foreground">
                  {isVietnamese ? "Bằng chứng AI" : "AI Evidence"}
                </span>
                {typeof current.confidence === "number" && (
                  <span className="rounded-lg border border-danger/25 bg-danger/10 px-2 py-0.5 font-mono text-[10px] font-black text-danger">
                    AI {(current.confidence * 100).toFixed(0)}%
                  </span>
                )}
                {evidenceCount > 0 && (
                  <span className="rounded-lg border border-border/30 bg-background/85 px-2 py-0.5 font-mono text-[10px] font-bold text-muted-foreground shadow-nm-inset">
                    {evidenceCount} {isVietnamese ? "tệp" : "files"}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {referenceEvidenceUrl && (
                  <div className="inline-flex items-center rounded-xl border border-border/30 bg-background/85 p-0.5 text-[10px] shadow-nm-inset">
                    <button
                      type="button"
                      onClick={() => setEvidenceTab("violation")}
                      className={`rounded-lg px-2.5 py-0.5 font-extrabold transition-all ${evidenceTab === "violation"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      {isVietnamese ? "Vi phạm" : "Violation"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEvidenceTab("compare")}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 font-extrabold transition-all ${evidenceTab === "compare"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      <Columns2 className="h-3 w-3" />
                      <span>{isVietnamese ? "Đối chứng" : "Compare"}</span>
                    </button>
                  </div>
                )}

                {effectivePrimaryUrl && !imgError && (
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    title={isVietnamese ? "Phóng to toàn màn hình" : "Zoom fullscreen"}
                    aria-label={isVietnamese ? "Phóng to ảnh" : "Zoom image"}
                    className="inline-flex h-7 items-center gap-1 rounded-xl border border-white/40 bg-surface px-2 text-[10px] font-bold text-muted-foreground shadow-nm-sm transition-all hover:text-primary active:scale-95 active:shadow-nm-inset dark:border-white/[0.06]"
                  >
                    <Maximize2 className="h-3 w-3" />
                    <span className="hidden sm:inline">
                      {isVietnamese ? "Phóng to" : "Zoom"}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Expanded Tactical Screen (16:10 taller viewport) */}
            <div className="group/screen relative flex-1 overflow-hidden rounded-xl border border-border/40 bg-[#070b14] shadow-nm-inset">
              {/* HUD Corner Brackets */}
              <span className="pointer-events-none absolute left-2.5 top-2.5 z-10 h-3.5 w-3.5 border-l-2 border-t-2 border-primary/75" />
              <span className="pointer-events-none absolute right-2.5 top-2.5 z-10 h-3.5 w-3.5 border-r-2 border-t-2 border-primary/75" />
              <span className="pointer-events-none absolute bottom-2.5 left-2.5 z-10 h-3.5 w-3.5 border-b-2 border-l-2 border-primary/75" />
              <span className="pointer-events-none absolute bottom-2.5 right-2.5 z-10 h-3.5 w-3.5 border-b-2 border-r-2 border-primary/75" />

              {evidenceTab === "compare" && referenceEvidenceUrl ? (
                <div className="grid h-full min-h-[260px] grid-cols-2 gap-1.5 p-1.5 sm:min-h-[320px]">
                  <div className="relative overflow-hidden rounded-lg bg-slate-900">
                    <span className="absolute left-2 top-2 z-10 rounded-md bg-danger/90 px-1.5 py-0.5 font-mono text-[9px] font-black tracking-wider text-white shadow">
                      {isVietnamese ? "VI PHẠM" : "VIOLATION"}
                    </span>
                    <img
                      src={effectivePrimaryUrl}
                      alt="Violation"
                      className="h-full w-full object-contain"
                      onError={() => void handleImageError()}
                    />
                  </div>
                  <div className="relative overflow-hidden rounded-lg bg-slate-900">
                    <span className="absolute left-2 top-2 z-10 rounded-md bg-emerald-600/90 px-1.5 py-0.5 font-mono text-[9px] font-black tracking-wider text-white shadow">
                      {isVietnamese ? "ĐỐI CHỨNG" : "REFERENCE"}
                    </span>
                    <img
                      src={referenceEvidenceUrl}
                      alt="Reference"
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>
              ) : (
                <div className="relative flex aspect-[16/10] w-full items-center justify-center">
                  {/* Live Camera Watermark */}
                  <span className="pointer-events-none absolute bottom-3 left-4 z-10 rounded-md bg-black/65 px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest text-slate-200 backdrop-blur-xs">
                    CAM • {cameraCode}
                  </span>

                  {effectivePrimaryUrl && !imgError ? (
                    <img
                      src={effectivePrimaryUrl}
                      alt={`Evidence #${current.id.slice(0, 8)}`}
                      onClick={() => setLightboxOpen(true)}
                      className="h-full w-full cursor-zoom-in object-contain transition-transform duration-300 group-hover/screen:scale-[1.015]"
                      onError={() => void handleImageError()}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-12 text-slate-400">
                      <Camera className="h-8 w-8 opacity-50" />
                      <span className="text-xs">
                        {isVietnamese ? "Chưa có ảnh bằng chứng" : "No evidence snapshot available"}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Recessed Notes / Description Well */}
          {current.description && (
            <div className="rounded-2xl border border-border/30 bg-background/70 p-3.5 text-xs shadow-nm-inset">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/80" />
                <span>{isVietnamese ? "Mô tả / Ghi chú" : "Description / Notes"}</span>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap leading-relaxed text-foreground">
                {current.description}
              </p>
            </div>
          )}
        </div>

        {/* CỘT PHẢI (4/12): TACTICAL SPEC RAIL & PHÂN CÔNG HIỆN TRƯỜNG */}
        <div className="flex flex-col justify-between gap-3.5 lg:col-span-4">
          {/* Unified Recessed Telemetry Block */}
          <div className="divide-y divide-border/25 rounded-2xl border border-border/30 bg-background/70 px-3.5 py-1 shadow-nm-inset">
            {/* 1. Site */}
            <div className="py-2.5">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                <span>{isVietnamese ? "Công trường" : "Site"}</span>
              </div>
              <div className="mt-1 text-xs font-extrabold text-foreground">
                {current.siteId ? (
                  <Link
                    href={`/sites/${current.siteId}`}
                    className="inline-flex max-w-full items-center gap-1 hover:text-primary hover:underline"
                  >
                    <span className="truncate">{siteName}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                  </Link>
                ) : (
                  <span className="truncate">{siteName}</span>
                )}
              </div>
            </div>

            {/* 2. Zone */}
            <div className="py-2.5">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-info" />
                <span>{isVietnamese ? "Phân khu" : "Zone"}</span>
              </div>
              <p className="mt-1 truncate text-xs font-extrabold text-foreground">{zoneName}</p>
            </div>

            {/* 3. Camera */}
            <div className="py-2.5">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                <Video className="h-3.5 w-3.5 text-primary" />
                <span>{isVietnamese ? "Camera" : "Camera"}</span>
              </div>
              <div className="mt-1 text-xs font-extrabold">
                <Link
                  href={
                    current.cameraId
                      ? `/cameras/${current.cameraId}`
                      : `/cameras?search=${encodeURIComponent(cameraCode)}&view=wall`
                  }
                  className="inline-flex max-w-full items-center gap-1 font-mono text-primary hover:underline"
                >
                  <span className="truncate">{cameraCode}</span>
                  <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                </Link>
                {cameraName && cameraName !== cameraCode && (
                  <p className="mt-0.5 truncate font-sans text-[10px] font-medium text-muted-foreground">
                    {cameraName}
                  </p>
                )}
              </div>
            </div>

            {/* 4. Detected At */}
            <div className="py-2.5">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                <span>{isVietnamese ? "Phát hiện lúc" : "Detected At"}</span>
              </div>
              <p className="mt-1 font-mono text-[11px] font-bold text-foreground">
                {detectedDate}
              </p>
            </div>
          </div>

          {/* Extruded Field Assignment Module */}
          <div className="rounded-2xl border border-white/40 bg-surface p-3.5 shadow-nm-sm dark:border-white/[0.06]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border/30 bg-background/85 text-primary shadow-nm-inset">
                  <UserCheck className="h-4 w-4" />
                </span>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  {isVietnamese ? "Phân công xử lý" : "Assignment"}
                </p>
              </div>

              {canAssign &&
                current.status !== "CLOSED" &&
                current.status !== "DISMISSED" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onAssign?.(current)}
                    className="h-7 shrink-0 gap-1 rounded-xl px-2.5 text-[11px] font-extrabold text-primary shadow-nm-sm transition-transform active:scale-95"
                  >
                    <UserPlus className="h-3 w-3" />
                    <span>
                      {activeAssignment
                        ? isVietnamese
                          ? "Đổi"
                          : "Reassign"
                        : isVietnamese
                          ? "Giao"
                          : "Assign"}
                    </span>
                  </Button>
                )}
            </div>

            <div className="mt-2.5 rounded-xl border border-border/25 bg-background/60 p-2.5 shadow-nm-inset">
              {activeAssignment ? (
                <div className="space-y-1.5">
                  <p className="truncate text-xs font-black text-foreground">
                    {activeAssignment.assignedToName ||
                      activeAssignment.assignedToEmail ||
                      activeAssignment.assignedTo.slice(0, 8)}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {isOfficerAssigned && (
                      <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                        {isVietnamese ? "Việc của bạn" : "Assigned to you"}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {activeAssignment.priority || "NORMAL"} • {deadlineLabel}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs font-medium text-muted-foreground">
                  {isVietnamese ? "Chưa phân công cán bộ" : "Unassigned"}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. FOOTER AUDIT & FULL RECORD LINK ──────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/25 bg-background/60 px-3.5 py-2.5 text-[11px] text-muted-foreground shadow-nm-inset">
        <span>
          {isVietnamese
            ? "Bình luận, kiểm định SHA-256, tệp đính kèm & nhật ký kiểm toán"
            : "Comments, SHA-256 checksum, evidence files & audit trail"}
        </span>
        <Link
          href={`/incidents/${current.id}`}
          className="inline-flex items-center gap-1 font-extrabold text-primary hover:underline"
        >
          <span>{isVietnamese ? "Xem trang chi tiết" : "Open detail page"}</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {/* Fullscreen Evidence Lightbox */}
      {lightboxOpen && effectivePrimaryUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={isVietnamese ? "Xem ảnh bằng chứng phóng to" : "Zoomed evidence viewer"}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative max-h-[90dvh] max-w-5xl overflow-hidden rounded-2xl border border-white/15 bg-slate-950 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              aria-label={isVietnamese ? "Đóng" : "Close"}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-black"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={effectivePrimaryUrl}
              alt={`Evidence #${current.id.slice(0, 8)}`}
              className="max-h-[88dvh] w-auto object-contain"
            />
          </div>
        </div>
      )}
    </section>
  );
}
