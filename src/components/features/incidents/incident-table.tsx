"use client";

import Link from "next/link";
import { AlertTriangle, Building2, Camera, CheckSquare, ExternalLink, Eye, Shield, UserCheck, Video } from "lucide-react";
import { IncidentStatusBadge } from "./incident-status-badge";
import { IncidentSeverityBadge } from "./incident-severity-badge";
import { useLocale } from "@/providers/locale-provider";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import type { IncidentItem } from "@/types";

export interface IncidentTableProps {
  incidents: IncidentItem[];
  onReview?: (incident: IncidentItem) => void;
  onResolve?: (incident: IncidentItem) => void;
  onAssign?: (incident: IncidentItem) => void;
  onFilterSite?: (siteId: string) => void;
  loading?: boolean;
}

export function IncidentTable({
  incidents,
  onReview,
  onResolve,
  onAssign,
  onFilterSite,
  loading = false,
}: IncidentTableProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const { getSiteName, getCameraCode, getCameraName } = useEntityLookup();

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
    <div className="space-y-3">
      {/* Mobile Card View (Simple, legible, Role benchmark) */}
      <div className="grid grid-cols-1 gap-3 sm:hidden">
        {incidents.map((incident) => {
          const dateStr = new Date(incident.detectedAt).toLocaleString("vi-VN", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          });
          const siteName = incident.siteName || getSiteName(incident.siteId);
          const cameraCode = incident.cameraCode || getCameraCode(incident.cameraId);

          return (
            <div
              key={incident.id}
              className="rounded-2xl border border-border/40 bg-surface p-3.5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3)] transition-all"
            >
              {/* Card Header: ID, Severity, Status */}
              <div className="flex items-center justify-between gap-2 border-b border-border/30 pb-2.5">
                <Link
                  href={`/incidents/${incident.id}`}
                  className="font-mono text-xs font-bold text-primary hover:underline"
                >
                  #{incident.id.slice(0, 8)}
                </Link>
                <div className="flex items-center gap-1.5 shrink-0">
                  <IncidentSeverityBadge severity={incident.severity} />
                  <IncidentStatusBadge status={incident.status} />
                </div>
              </div>

              {/* Card Body: Thumbnail & Details */}
              <div className="flex gap-3 py-3">
                <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-950/80 border border-border/40">
                  {incident.snapshotUrl ? (
                    <img
                      src={incident.snapshotUrl}
                      alt="Evidence"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center text-[10px] text-muted-foreground p-1 text-center bg-slate-900/40">
                      <Camera className="h-4 w-4 text-primary/70 mb-0.5" />
                      <span className="text-[9px] font-mono font-semibold line-clamp-1">{incident.violationType.replace('_', ' ')}</span>
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-semibold text-xs text-foreground line-clamp-1">
                    {formatViolation(incident.violationType)}
                  </p>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                    {incident.description || formatViolation(incident.violationType)}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-0.5 text-[11px] text-muted-foreground">
                    {siteName && (
                      <button
                        type="button"
                        onClick={() => onFilterSite?.(incident.siteId)}
                        className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary transition"
                        title={isVietnamese ? `Lọc xem sự cố của công trường ${siteName}` : `Filter by site ${siteName}`}
                      >
                        <Building2 className="h-3 w-3 text-primary shrink-0" />
                        <span className="truncate max-w-[120px]">{siteName}</span>
                      </button>
                    )}
                    {cameraCode && (
                      <span className="inline-flex items-center gap-1 font-mono font-bold text-primary">
                        <Camera className="h-2.5 w-2.5 text-primary/70 shrink-0" />
                        <span>{cameraCode}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer: Timestamp & Actions */}
              <div className="flex items-center justify-between border-t border-border/30 pt-2.5">
                <span className="font-mono text-[11px] text-muted-foreground">
                  {dateStr}
                </span>

                <div className="flex items-center gap-1">
                  <Link
                    href={`/cameras?search=${incident.cameraCode || incident.cameraId}&view=wall`}
                    className="flex size-7 items-center justify-center rounded-lg border border-border/40 bg-surface text-muted-foreground hover:text-primary transition"
                    title={isVietnamese ? "Xem video wall" : "View video wall"}
                  >
                    <Video className="h-3.5 w-3.5" />
                  </Link>

                  <Link
                    href={`/incidents/${incident.id}`}
                    className="flex size-7 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition"
                    title={t("incidents.actions.viewDetail")}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Link>

                  {incident.status === "PENDING_REVIEW" && onReview && (
                    <button
                      type="button"
                      onClick={() => onReview(incident)}
                      className="flex size-7 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition"
                      title={t("incidents.actions.review")}
                    >
                      <CheckSquare className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {incident.status === "CONFIRMED" && onAssign && (
                    <button
                      type="button"
                      onClick={() => onAssign(incident)}
                      className="flex size-7 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition"
                      title={t("incidents.actions.assign")}
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {incident.status === "CONFIRMED" && onResolve && (
                    <button
                      type="button"
                      onClick={() => onResolve(incident)}
                      className="flex size-7 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition"
                      title={t("incidents.actions.resolve")}
                    >
                      <Shield className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block overflow-x-auto rounded-2xl border border-border/40 bg-surface shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3)]">
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
                      <div className="relative h-11 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-950/80 border border-border/40">
                        {incident.snapshotUrl ? (
                          <img
                            src={incident.snapshotUrl}
                            alt="Evidence"
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center text-[9px] text-muted-foreground p-0.5 text-center bg-slate-900/40">
                            <Camera className="h-3.5 w-3.5 text-primary/70" />
                            <span className="text-[8px] font-mono font-bold">{incident.violationType.slice(0, 8)}</span>
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
                    {(() => {
                      const siteName = incident.siteName || getSiteName(incident.siteId);
                      const cameraCode = incident.cameraCode || getCameraCode(incident.cameraId);
                      const cameraName = incident.cameraName || getCameraName(incident.cameraId);

                      return (
                        <div className="flex flex-col gap-0.5 text-xs">
                          {incident.siteId ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onFilterSite?.(incident.siteId)}
                                className="inline-flex items-center gap-1 font-semibold text-foreground hover:text-primary transition hover:underline text-left"
                                title={
                                  isVietnamese
                                    ? `Lọc danh sách theo công trường ${siteName}`
                                    : `Filter by site ${siteName}`
                                }
                              >
                                <Building2 className="h-3 w-3 text-primary shrink-0" />
                                <span className="line-clamp-1 max-w-[160px]">{siteName}</span>
                              </button>
                              <Link
                                href={`/sites/${incident.siteId}`}
                                className="text-muted-foreground hover:text-primary transition p-0.5"
                                title={
                                  isVietnamese
                                    ? `Mở trang chi tiết công trường ${siteName}`
                                    : `Open site detail page ${siteName}`
                                }
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            </div>
                          ) : (
                            <span className="font-medium text-foreground line-clamp-1 max-w-[180px]">
                              {siteName}
                            </span>
                          )}

                          <Link
                            href={
                              incident.cameraId
                                ? `/cameras/${incident.cameraId}`
                                : `/cameras?search=${cameraCode}&view=wall`
                            }
                            className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground hover:text-primary transition hover:underline"
                            title={
                              isVietnamese
                                ? `Mở Camera AI Studio: ${cameraName}`
                                : `Open Camera AI Studio: ${cameraName}`
                            }
                          >
                            <Camera className="h-2.5 w-2.5 shrink-0 text-primary/70" />
                            <span className="font-bold text-primary/90">{cameraCode}</span>
                            {cameraName && cameraName !== cameraCode && (
                              <span className="text-muted-foreground truncate max-w-[120px]">
                                ({cameraName})
                              </span>
                            )}
                          </Link>
                        </div>
                      );
                    })()}
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
                        title={
                          isVietnamese
                            ? "Mở camera phát hiện sự cố này trên Video Wall"
                            : "Open camera feed on Video Wall"
                        }
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
    </div>
  );
}
