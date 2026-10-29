"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  AlertTriangle,
  Camera,
  CheckCircle,
  Clock,
  ExternalLink,
  Eye,
  Filter,
  Layers,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { useIncidents } from "@/hooks/incidents";
import { useLocale } from "@/providers/locale-provider";
import type { IncidentItem, IncidentSeverity, IncidentStatus, SiteItem } from "@/types";

export interface SiteIncidentsTabProps {
  site: SiteItem;
}

export function SiteIncidentsTab({ site }: SiteIncidentsTabProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Fetch incidents for this site
  const { data: incidentsData, isLoading, refetch, isFetching } = useIncidents({
    siteId: site.id,
    limit: 50,
  });

  const incidents: IncidentItem[] = useMemo(
    () => incidentsData?.items ?? [],
    [incidentsData]
  );

  // Filtered incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (severityFilter !== "ALL" && inc.severity !== severityFilter) return false;
      if (statusFilter !== "ALL" && inc.status !== statusFilter) return false;
      return true;
    });
  }, [incidents, severityFilter, statusFilter]);

  const getSeverityBadge = (severity: IncidentSeverity | string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-danger/10 text-danger border-danger/25";
      case "HIGH":
        return "bg-accent/15 text-accent border-accent/25";
      case "MEDIUM":
        return "bg-primary/10 text-primary border-primary/25";
      default:
        return "bg-muted text-muted-foreground border-border/40";
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/40 bg-surface p-3.5 shadow-sm dark:border-black/60 dark:bg-card/90">
        <div className="flex flex-wrap items-center gap-2">
          {/* Severity Filter */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5 text-primary" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="rounded-xl border border-border/40 bg-surface-elevated px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none dark:border-black/40 dark:bg-background/60"
            >
              <option value="ALL">{isVietnamese ? "Tất cả mức độ" : "All Severities"}</option>
              <option value="CRITICAL">
                {isVietnamese ? "Nguy hiểm cao (CRITICAL)" : "Critical (CRITICAL)"}
              </option>
              <option value="HIGH">
                {isVietnamese ? "Cảnh báo cao (HIGH)" : "High (HIGH)"}
              </option>
              <option value="MEDIUM">
                {isVietnamese ? "Trung bình (MEDIUM)" : "Medium (MEDIUM)"}
              </option>
              <option value="LOW">{isVietnamese ? "Nhẹ (LOW)" : "Low (LOW)"}</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-border/40 bg-surface-elevated px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none dark:border-black/40 dark:bg-background/60"
            >
              <option value="ALL">{isVietnamese ? "Tất cả trạng thái" : "All Statuses"}</option>
              <option value="PENDING_REVIEW">
                {isVietnamese ? "Chờ thẩm duyệt (Pending Review)" : "Pending Review"}
              </option>
              <option value="CONFIRMED">
                {isVietnamese ? "Đã xác nhận (Confirmed)" : "Confirmed"}
              </option>
              <option value="RESOLVED">
                {isVietnamese ? "Đã giải quyết (Resolved)" : "Resolved"}
              </option>
              <option value="CLOSED">
                {isVietnamese ? "Đã nghiệm thu (Closed)" : "Closed"}
              </option>
              <option value="DISMISSED">
                {isVietnamese ? "Đã bác bỏ (Dismissed)" : "Dismissed"}
              </option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/incidents?siteId=${site.id}&siteName=${encodeURIComponent(site.name)}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/[0.08] px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15 transition shadow-sm"
            title={
              isVietnamese
                ? "Mở toàn bộ sự cố của công trường này trên trang Quản lý Sự cố"
                : "Open all incidents for this site on Incidents page"
            }
          >
            <span className="sm:hidden">{isVietnamese ? "Trang Sự cố" : "Incidents"}</span>
            <span className="hidden sm:inline">{isVietnamese ? "Quản lý trên trang Sự cố" : "Manage on Incidents"}</span>
            <ExternalLink className="h-3 w-3 shrink-0" />
          </Link>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/40 text-muted-foreground hover:text-primary transition dark:border-black/40"
            title={isVietnamese ? "Làm mới sự cố" : "Refresh incidents"}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface-elevated/40" />
          ))}
        </div>
      ) : filteredIncidents.length === 0 ? (
        <div className="rounded-2xl border border-border/30 bg-surface p-12 text-center dark:border-black/50 dark:bg-card/70">
          <CheckCircle className="mx-auto h-12 w-12 text-primary/40 mb-3" />
          <h4 className="text-sm font-bold text-foreground">
            {isVietnamese ? "Không có sự cố vi phạm nào" : "No safety violation incidents"}
          </h4>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            {isVietnamese
              ? "Công trường hiện đang tuân thủ an toàn tốt. Không ghi nhận vi phạm chưa được xử lý nào."
              : "The site is currently in full safety compliance. No unresolved violations reported."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredIncidents.map((incident) => {
            const dateStr = incident.detectedAt || incident.createdAt;
            const formattedDate = dateStr
              ? new Date(dateStr).toLocaleString(isVietnamese ? "vi-VN" : "en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })
              : isVietnamese
              ? "Vừa xong"
              : "Just now";

            return (
              <div
                key={incident.id}
                className="group flex flex-col justify-between gap-3 rounded-2xl border border-border/40 bg-surface p-3.5 sm:p-4 shadow-sm transition hover:border-primary/40 sm:flex-row sm:items-center dark:border-black/60 dark:bg-card/90"
              >
                {/* Left: Indicator & Main Info */}
                <div className="flex items-start gap-3 min-w-0">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${getSeverityBadge(
                      incident.severity
                    )}`}
                  >
                    <AlertTriangle className="h-5 w-5" />
                  </span>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-primary">
                        #INC-{incident.id.slice(0, 8)}
                      </span>

                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${getSeverityBadge(
                          incident.severity
                        )}`}
                      >
                        {incident.severity}
                      </span>

                      <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-[10px] font-semibold text-muted-foreground border border-border/30">
                        {incident.status}
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-semibold text-foreground truncate">
                      {incident.description ||
                        incident.violationType ||
                        (isVietnamese
                          ? "Phát hiện không tuân thủ trang bị PPE"
                          : "PPE non-compliance detected")}
                    </h4>

                    {/* Metadata: Camera, Zone, Time */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                      <Link
                        href={`/cameras?search=${incident.cameraCode || incident.cameraId}&view=wall`}
                        className="flex items-center gap-1 hover:text-primary transition hover:underline"
                        title={
                          isVietnamese
                            ? "Xem camera này trên Video Wall"
                            : "View this camera on Video Wall"
                        }
                      >
                        <Camera className="h-3 w-3 text-primary/70 shrink-0" />
                        <span>
                          {incident.cameraName ||
                            incident.cameraCode ||
                            (isVietnamese ? "Camera An Toàn" : "Safety Camera")}
                        </span>
                      </Link>

                      {incident.zoneName && (
                        <span className="flex items-center gap-1">
                          <Layers className="h-3 w-3 text-accent/70 shrink-0" />
                          <span>{incident.zoneName}</span>
                        </span>
                      )}

                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                        <span>{formattedDate}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions & Link */}
                <div className="flex items-center gap-2 shrink-0 justify-end pt-2 sm:pt-0 border-t border-border/20 sm:border-0">
                  <Link
                    href={`/incidents/${incident.id}`}
                    className="flex items-center gap-1.5 rounded-xl border border-border/40 bg-surface-elevated px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary hover:text-primary transition shadow-sm"
                  >
                    <Eye className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="sm:hidden">{isVietnamese ? "Chi tiết" : "Details"}</span>
                    <span className="hidden sm:inline">
                      {isVietnamese ? "Xem chi tiết sự cố" : "View Incident Details"}
                    </span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
