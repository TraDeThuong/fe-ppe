"use client";

import Link from "next/link";
import { AlertTriangle, Building2, Camera, CheckSquare, Eye, Shield, UserCheck, Video } from "lucide-react";
import { IncidentStatusBadge } from "./incident-status-badge";
import { IncidentSeverityBadge } from "./incident-severity-badge";
import { useLocale } from "@/providers/locale-provider";
import type { IncidentItem } from "@/types";

export interface IncidentTableProps {
  incidents: IncidentItem[];
  onReview?: (incident: IncidentItem) => void;
  onResolve?: (incident: IncidentItem) => void;
  onAssign?: (incident: IncidentItem) => void;
  loading?: boolean;
}

export function IncidentTable({
  incidents,
  onReview,
  onResolve,
  onAssign,
  loading = false,
}: IncidentTableProps) {
  const { t } = useLocale();

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-elevated/40" />
        ))}
      </div>
    );
  }

  if (incidents.length === 0) {
    return (
      <div className="rounded-2xl border border-border/30 bg-surface p-12 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">{t("incidents.table.empty")}</p>
      </div>
    );
  }

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

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/40 bg-surface shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3)]">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border/40 bg-surface-elevated/40 text-xs font-semibold uppercase text-muted-foreground">
          <tr>
            <th className="px-5 py-3.5">{t("incidents.table.incident")}</th>
            <th className="px-5 py-3.5">{t("incidents.table.violation")}</th>
            <th className="px-5 py-3.5">{t("incidents.table.severity")}</th>
            <th className="px-5 py-3.5">{t("incidents.table.location")}</th>
            <th className="px-5 py-3.5">{t("incidents.table.detectedAt")}</th>
            <th className="px-5 py-3.5">{t("incidents.table.status")}</th>
            <th className="px-5 py-3.5 text-right">{t("incidents.table.actions")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {incidents.map((incident) => {
            const dateStr = new Date(incident.detectedAt).toLocaleString("vi-VN", {
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });

            return (
              <tr
                key={incident.id}
                className="transition-colors duration-150 hover:bg-surface-elevated/30"
              >
                {/* Incident Code & Thumbnail */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="relative h-11 w-16 shrink-0 overflow-hidden rounded-lg bg-black/40 border border-border/40">
                      {incident.snapshotUrl || incident.evidences?.[0]?.storageKey ? (
                        <img
                          src={incident.snapshotUrl || `/api/v1/evidences/${incident.evidences?.[0]?.id}/download-url`}
                          alt="Evidence"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                          No Pic
                        </div>
                      )}
                    </div>
                    <div>
                      <Link
                        href={`/incidents/${incident.id}`}
                        className="font-mono text-xs font-bold text-primary hover:underline line-clamp-1"
                      >
                        #{incident.id.slice(0, 8)}
                      </Link>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 max-w-xs">
                        {incident.description || formatViolation(incident.violationType)}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Violation */}
                <td className="px-5 py-4">
                  <span className="font-semibold text-xs text-foreground">
                    {formatViolation(incident.violationType)}
                  </span>
                </td>

                {/* Severity */}
                <td className="px-5 py-4">
                  <IncidentSeverityBadge severity={incident.severity} />
                </td>

                {/* Location & Camera */}
                <td className="px-5 py-4">
                  <div className="flex flex-col gap-0.5 text-xs">
                    {incident.siteId ? (
                      <Link
                        href={`/sites/${incident.siteId}`}
                        className="inline-flex items-center gap-1 font-semibold text-foreground hover:text-primary transition hover:underline"
                        title="Mở trung tâm điều hành của công trường này"
                      >
                        <Building2 className="h-3 w-3 text-primary shrink-0" />
                        <span>{incident.siteName || "Công trường"}</span>
                      </Link>
                    ) : (
                      <span className="font-medium text-foreground">
                        {incident.siteName || "Công trường"}
                      </span>
                    )}

                    <Link
                      href={
                        incident.cameraId
                          ? `/cameras/${incident.cameraId}`
                          : `/cameras?search=${incident.cameraCode}&view=wall`
                      }
                      className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground hover:text-primary transition hover:underline"
                      title="Mở Camera AI Intelligence Studio"
                    >
                      <Camera className="h-2.5 w-2.5 shrink-0" />
                      <span>{incident.cameraCode || incident.cameraId.slice(0, 8)}</span>
                    </Link>
                  </div>
                </td>

                {/* Detected At */}
                <td className="px-5 py-4">
                  <span className="font-mono text-xs text-muted-foreground">
                    {dateStr}
                  </span>
                </td>

                {/* Status */}
                <td className="px-5 py-4">
                  <IncidentStatusBadge status={incident.status} />
                </td>

                {/* Actions */}
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {/* Xem trực tiếp luồng Camera */}
                    <Link
                      href={`/cameras?search=${incident.cameraCode || incident.cameraId}&view=wall`}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-primary transition"
                      title="Mở camera phát hiện sự cố này trên Video Wall"
                    >
                      <Video className="h-4 w-4" />
                    </Link>

                    <Link
                      href={`/incidents/${incident.id}`}
                      className="rounded-lg p-1.5 text-primary hover:bg-primary/10 transition"
                      title={t("incidents.actions.viewDetail")}
                    >
                      <Eye className="h-4 w-4" />
                    </Link>

                    {incident.status === "PENDING_REVIEW" && onReview && (
                      <button
                        type="button"
                        onClick={() => onReview(incident)}
                        title={t("incidents.actions.review")}
                        className="rounded-lg p-1.5 text-amber-500 hover:bg-amber-500/10 transition"
                      >
                        <CheckSquare className="h-4 w-4" />
                      </button>
                    )}

                    {incident.status === "CONFIRMED" && onAssign && (
                      <button
                        type="button"
                        onClick={() => onAssign(incident)}
                        title={t("incidents.actions.assign")}
                        className="rounded-lg p-1.5 text-primary hover:bg-primary/10 transition"
                      >
                        <UserCheck className="h-4 w-4" />
                      </button>
                    )}

                    {incident.status === "CONFIRMED" && onResolve && (
                      <button
                        type="button"
                        onClick={() => onResolve(incident)}
                        title={t("incidents.actions.resolve")}
                        className="rounded-lg p-1.5 text-emerald-500 hover:bg-emerald-500/10 transition"
                      >
                        <Shield className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
