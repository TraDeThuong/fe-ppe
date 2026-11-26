"use client";

import Link from "next/link";
import {
  Archive,
  Camera,
  CheckCircle2,
  CheckSquare,
  ExternalLink,
  Send,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { IncidentSeverityBadge } from "@/components/features/incidents/incident-severity-badge";
import { IncidentStatusBadge } from "@/components/features/incidents/incident-status-badge";
import { getIncidentEvidenceUrl } from "@/components/features/incidents/incident-table";
import {
  incidentHasVideoEvidence,
  IncidentTelemetryChips,
  IncidentThumbnail,
} from "@/components/features/incidents/table/incident-thumbnail";
import { useLocale } from "@/providers/locale-provider";
import {
  isIncidentAssignedToUser,
  resolveIncidentResponsibility,
  type ResponsibilityPhase,
} from "@/lib/incident-workflow";
import type { IncidentItem } from "@/types";
import type {
  AssignmentFormatters,
  AssignmentResponsibilityContext,
  AssignmentRowActions,
} from "./types";

export interface ResponsibilityBadgeProps {
  incident: IncidentItem;
  responsibilityContext: AssignmentResponsibilityContext;
}

export function ResponsibilityBadge({
  incident,
  responsibilityContext,
}: ResponsibilityBadgeProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const resp = resolveIncidentResponsibility(incident, responsibilityContext);
  const ownerDisplay =
    resp.ownerNames.length > 0
      ? resp.ownerNames.join(", ")
      : isVietnamese
        ? "Quản lý công trường"
        : "Site Manager";

  const phaseConfig: Record<
    ResponsibilityPhase,
    { label: string; className: string }
  > = {
    AWAITING_MANAGER_REVIEW: {
      label: isVietnamese
        ? `Trách nhiệm Manager (${ownerDisplay}): Chờ duyệt AI`
        : `Manager (${ownerDisplay}): Awaiting Review`,
      className:
        "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    },
    AWAITING_MANAGER_DISPATCH: {
      label: isVietnamese
        ? `Trách nhiệm Manager (${ownerDisplay}): Chưa giao Officer`
        : `Manager (${ownerDisplay}): Unassigned`,
      className:
        "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    },
    OFFICER_REMEDIATING: {
      label: isVietnamese
        ? `Trách nhiệm Officer (${resp.assignedOfficerName || ownerDisplay}): Đang khắc phục`
        : `Officer (${resp.assignedOfficerName || ownerDisplay}): Remediating`,
      className:
        "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    },
    AWAITING_MANAGER_ACCEPTANCE: {
      label: isVietnamese
        ? `Trách nhiệm Manager (${ownerDisplay}): Chờ nghiệm thu (Officer ${resp.assignedOfficerName || "—"} đã xong)`
        : `Manager (${ownerDisplay}): Awaiting Acceptance`,
      className:
        "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    },
    COMPLETED: {
      label: isVietnamese
        ? `Đã khép hồ sơ (${resp.assignedOfficerName || ownerDisplay})`
        : `Completed (${resp.assignedOfficerName || ownerDisplay})`,
      className: "border-border/50 bg-muted/40 text-muted-foreground",
    },
  };

  const cfg = phaseConfig[resp.phase];
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-semibold ${cfg.className}`}
    >
      <UserCheck className="h-3 w-3 shrink-0" />
      <span className="max-w-full sm:max-w-[320px] truncate">{cfg.label}</span>
    </span>
  );
}

export interface AssignmentIncidentRowProps {
  incident: IncidentItem;
  currentUserId?: string;
  selected?: boolean;
  selectable?: boolean;
  showResponsibility?: boolean;
  allowManagerActions?: boolean;
  allowOfficerResolve?: boolean;
  onToggleSelect?: (id: string) => void;
  responsibilityContext: AssignmentResponsibilityContext;
  formatters: AssignmentFormatters;
  actions: AssignmentRowActions;
}

export function AssignmentIncidentRow({
  incident,
  currentUserId,
  selected = false,
  selectable = false,
  showResponsibility = false,
  allowManagerActions = false,
  allowOfficerResolve = false,
  onToggleSelect,
  responsibilityContext,
  formatters,
  actions,
}: AssignmentIncidentRowProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const siteName = formatters.resolveSiteLabel(
    incident.siteId,
    incident.siteName,
  );
  const camLabel = formatters.resolveCameraLabel(incident);
  const isAssignedToMe = isIncidentAssignedToUser(incident, currentUserId);
  const evidenceUrl = getIncidentEvidenceUrl(incident);

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition ${
        selected ? "bg-primary/8" : "hover:bg-muted/15"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {selectable && onToggleSelect && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(incident.id)}
            className="h-4 w-4 shrink-0 cursor-pointer rounded accent-primary"
            aria-label={`Select incident ${incident.id.slice(0, 8)}`}
          />
        )}

        <IncidentThumbnail
          src={evidenceUrl}
          hasVideo={incidentHasVideoEvidence(incident)}
        />

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/incidents/${incident.id}`}
              className="font-mono text-xs font-bold text-primary hover:underline"
            >
              #{incident.id.slice(0, 8)}
            </Link>
            <span className="text-xs font-bold text-foreground">
              {formatters.formatViolation(incident.violationType)}
            </span>
            <IncidentTelemetryChips incident={incident} />
            <IncidentSeverityBadge severity={incident.severity} />
            <IncidentStatusBadge status={incident.status} />
            {showResponsibility && (
              <ResponsibilityBadge
                incident={incident}
                responsibilityContext={responsibilityContext}
              />
            )}
          </div>

          <p className="truncate text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground/85">{siteName}</span>
            {" • "}
            <span className="font-mono text-primary/90">{camLabel}</span>
            {" • "}
            {new Date(incident.detectedAt).toLocaleString(locale)}
            {incident.description ? ` • ${incident.description}` : ""}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        {allowManagerActions && incident.status === "PENDING_REVIEW" && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => actions.onReview(incident)}
            className="h-7 gap-1 px-2.5 text-[11px]"
          >
            <CheckSquare className="h-3 w-3" />
            <span>{isVietnamese ? "Duyệt" : "Review"}</span>
          </Button>
        )}

        {allowManagerActions &&
          (incident.status === "PENDING_REVIEW" ||
            incident.status === "CONFIRMED") && (
            <Button
              type="button"
              size="sm"
              variant="primary"
              onClick={() => actions.onDispatch([incident])}
              className="h-7 gap-1 px-2.5 text-[11px]"
            >
              <Send className="h-3 w-3" />
              <span>
                {incident.assignments && incident.assignments.length > 0
                  ? isVietnamese
                    ? "Đổi Officer"
                    : "Reassign"
                  : isVietnamese
                    ? "Giao Officer"
                    : "Dispatch"}
              </span>
            </Button>
          )}

        {allowManagerActions &&
          (incident.status === "RESOLVED" ||
            incident.status === "DISMISSED") && (
            <Button
              type="button"
              size="sm"
              variant="primary"
              onClick={() => actions.onClose(incident)}
              className="h-7 gap-1 bg-slate-700 px-2.5 text-[11px] text-white hover:bg-slate-800"
            >
              <Archive className="h-3 w-3" />
              <span>
                {isVietnamese ? "Nghiệm thu & Đóng" : "Accept & Close"}
              </span>
            </Button>
          )}

        {allowOfficerResolve &&
          incident.status === "CONFIRMED" &&
          isAssignedToMe && (
            <Button
              type="button"
              size="sm"
              variant="primary"
              onClick={() => actions.onResolve(incident)}
              className="h-7 gap-1 bg-emerald-600 px-2.5 text-[11px] text-white hover:bg-emerald-700"
            >
              <CheckCircle2 className="h-3 w-3" />
              <span>
                {isVietnamese ? "Báo cáo khắc phục" : "Report Resolved"}
              </span>
            </Button>
          )}

        <Link
          href={`/incidents/${incident.id}`}
          className="inline-flex items-center gap-1 rounded-lg border border-border/50 px-2.5 py-1 text-[11px] font-semibold text-foreground transition hover:border-primary hover:text-primary"
        >
          <span>{isVietnamese ? "Xử lý từng bước" : "Step-by-Step"}</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
