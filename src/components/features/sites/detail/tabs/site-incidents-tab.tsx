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
  const { t } = useLocale();
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
        return "bg-rose-500/15 text-rose-500 border-rose-500/30";
      case "HIGH":
        return "bg-amber-500/15 text-amber-500 border-amber-500/30";
      case "MEDIUM":
        return "bg-sky-500/15 text-sky-500 border-sky-500/30";
      default:
        return "bg-slate-500/15 text-slate-400 border-slate-500/30";
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
              <option value="ALL">Tất cả mức độ</option>
              <option value="CRITICAL">Nguy hiểm cao (CRITICAL)</option>
              <option value="HIGH">Cảnh báo cao (HIGH)</option>
              <option value="MEDIUM">Trung bình (MEDIUM)</option>
              <option value="LOW">Nhẹ (LOW)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-border/40 bg-surface-elevated px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none dark:border-black/40 dark:bg-background/60"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING">Chờ xử lý (Pending)</option>
              <option value="INVESTIGATING">Đang điều tra</option>
              <option value="RESOLVED">Đã giải quyết</option>
              <option value="DISMISSED">Đã bác bỏ (False Alarm)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/incidents?siteId=${site.id}&siteName=${encodeURIComponent(site.name)}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/[0.08] px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15 transition shadow-sm"
            title="Mở toàn bộ sự cố của công trường này trên trang Quản lý Sự cố"
          >
            <span>Quản lý trên trang Sự cố</span>
            <ExternalLink className="h-3 w-3" />
          </Link>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/40 text-muted-foreground hover:text-primary transition dark:border-black/40"
            title="Làm mới sự cố"
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
          <CheckCircle className="mx-auto h-12 w-12 text-emerald-500/40 mb-3" />
          <h4 className="text-sm font-bold text-foreground">Không có sự cố vi phạm nào</h4>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            Công trường hiện đang tuân thủ an toàn tốt. Không ghi nhận vi phạm chưa được xử lý nào.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredIncidents.map((incident) => {
            const dateStr = incident.detectedAt || incident.createdAt;
            const formattedDate = dateStr
              ? new Date(dateStr).toLocaleString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })
              : "Vừa xong";

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
                      {incident.description || incident.violationType || "Phát hiện không tuân thủ trang bị PPE"}
                    </h4>

                    {/* Metadata: Camera, Zone, Time */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                      <Link
                        href={`/cameras?search=${incident.cameraCode || incident.cameraId}&view=wall`}
                        className="flex items-center gap-1 hover:text-primary transition hover:underline"
                        title="Xem camera này trên Video Wall"
                      >
                        <Camera className="h-3 w-3 text-primary/70 shrink-0" />
                        <span>{incident.cameraName || incident.cameraCode || "Camera An Toàn"}</span>
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
                    className="flex items-center gap-1.5 rounded-xl border border-border/40 bg-surface-elevated px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary hover:text-primary transition shadow-sm"
                  >
                    <Eye className="h-3.5 w-3.5 text-primary" />
                    <span>Xem chi tiết sự cố</span>
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
