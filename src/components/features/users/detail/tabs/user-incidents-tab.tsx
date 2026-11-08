"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Search,
  Filter,
  ShieldAlert,
  Camera,
  Building2,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { IncidentItem, SiteItem, UserResponseDto } from "@/types";

export interface UserIncidentsTabProps {
  user: UserResponseDto;
  incidents: IncidentItem[];
  userSites: SiteItem[];
  isLoading?: boolean;
}

export function UserIncidentsTab({
  user,
  incidents,
  userSites,
  isLoading,
}: UserIncidentsTabProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  // Filter States
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "RESOLVED" | "PENDING">("ALL");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [siteFilter, setSiteFilter] = useState<string>("ALL");

  // Summary Metrics
  const summary = useMemo(() => {
    const total = incidents.length;
    const resolved = incidents.filter(
      (i) => i.status === "RESOLVED" || i.status === "CLOSED",
    ).length;
    const pending = total - resolved;
    const critical = incidents.filter((i) => i.severity === "CRITICAL").length;
    const rate = total > 0 ? Math.round((resolved / total) * 100) : 100;
    return { total, resolved, pending, critical, rate };
  }, [incidents]);

  // Filtered List
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      // Status filter
      const isResolved = inc.status === "RESOLVED" || inc.status === "CLOSED";
      if (statusFilter === "RESOLVED" && !isResolved) return false;
      if (statusFilter === "PENDING" && isResolved) return false;

      // Severity filter
      if (severityFilter !== "ALL" && inc.severity !== severityFilter) return false;

      // Site filter
      if (siteFilter !== "ALL" && inc.siteId !== siteFilter) return false;

      // Search
      if (search.trim()) {
        const term = search.toLowerCase();
        const vType = inc.violationType?.toLowerCase() || "";
        const desc = inc.description?.toLowerCase() || "";
        const cName = inc.cameraName?.toLowerCase() || inc.cameraId?.toLowerCase() || "";
        const sName = inc.siteName?.toLowerCase() || "";
        if (
          !vType.includes(term) &&
          !desc.includes(term) &&
          !cName.includes(term) &&
          !sName.includes(term)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [incidents, statusFilter, severityFilter, siteFilter, search]);

  const selectFilterClass = [
    "h-9 rounded-xl px-3 text-xs font-semibold",
    "border border-[var(--shadow-dark)]/30 dark:border-white/10 bg-background text-foreground",
    "shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]",
    "focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer",
  ].join(" ");

  return (
    <div className="space-y-5">
      {/* 1. Executive Status KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Handled */}
        <div className="rounded-2xl border border-white/80 dark:border-white/5 bg-background dark:bg-card p-4 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.9)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.35),-2px_-2px_6px_rgba(255,255,255,0.02)]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {isVietnamese ? "Tổng vụ việc được giao" : "Total Assigned Cases"}
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-foreground">{summary.total}</span>
            <span className="text-xs text-muted-foreground">{isVietnamese ? "vụ" : "cases"}</span>
          </div>
        </div>

        {/* Resolved Successfully */}
        <div className="rounded-2xl border border-white/80 dark:border-white/5 bg-background dark:bg-card p-4 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.9)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.35),-2px_-2px_6px_rgba(255,255,255,0.02)]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
            {isVietnamese ? "Đã xử lý xong" : "Resolved & Closed"}
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-primary">{summary.resolved}</span>
            <span className="text-xs font-semibold text-primary/80">({summary.rate}%)</span>
          </div>
        </div>

        {/* Pending / In-progress */}
        <div className="rounded-2xl border border-white/80 dark:border-white/5 bg-background dark:bg-card p-4 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.9)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.35),-2px_-2px_6px_rgba(255,255,255,0.02)]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-warning">
            {isVietnamese ? "Chưa xong / Đang chờ" : "Pending / In Progress"}
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-warning">{summary.pending}</span>
            <span className="text-xs text-muted-foreground">{isVietnamese ? "cần xử lý" : "pending"}</span>
          </div>
        </div>

        {/* Critical Cases */}
        <div className="rounded-2xl border border-white/80 dark:border-white/5 bg-background dark:bg-card p-4 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.9)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.35),-2px_-2px_6px_rgba(255,255,255,0.02)]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-danger">
            {isVietnamese ? "Vụ việc nghiêm trọng" : "Critical Severity"}
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-danger">{summary.critical}</span>
            <span className="text-xs text-muted-foreground">{isVietnamese ? "mức cao nhất" : "top risk"}</span>
          </div>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="p-4 rounded-2xl border border-white/80 dark:border-white/5 bg-background dark:bg-card shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.9)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.35),-2px_-2px_6px_rgba(255,255,255,0.02)] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Search Input (5 cols) */}
          <div className="sm:col-span-5 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={
                isVietnamese
                  ? "Tìm theo loại vi phạm, camera, mô tả..."
                  : "Search violations, camera, description..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 rounded-xl pl-9 pr-3 text-xs bg-background border border-border/50 text-foreground placeholder:text-muted-foreground shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)] focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Status Filter (3 cols) */}
          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className={`w-full ${selectFilterClass}`}
            >
              <option value="ALL">{isVietnamese ? "Tất cả tiến độ" : "All Progress"}</option>
              <option value="RESOLVED">{isVietnamese ? "Đã xử lý xong" : "Resolved / Closed"}</option>
              <option value="PENDING">{isVietnamese ? "Chưa xong (Đang xử lý)" : "Pending / In Progress"}</option>
            </select>
          </div>

          {/* Severity Filter (2 cols) */}
          <div className="sm:col-span-2">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className={`w-full ${selectFilterClass}`}
            >
              <option value="ALL">{isVietnamese ? "Mọi mức độ" : "All Severity"}</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>

          {/* Site Filter (2 cols) */}
          <div className="sm:col-span-2">
            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className={`w-full ${selectFilterClass}`}
            >
              <option value="ALL">{isVietnamese ? "Mọi công trường" : "All Sites"}</option>
              {userSites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. Incidents List Table */}
      <div className="rounded-2xl border border-white/80 dark:border-white/5 bg-background dark:bg-card shadow-[6px_6px_14px_var(--shadow-dark),-5px_-5px_14px_rgba(255,255,255,0.9)] dark:shadow-[6px_6px_14px_rgba(0,0,0,0.4),-2px_-2px_6px_rgba(255,255,255,0.02)] overflow-hidden">
        {filteredIncidents.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
            <AlertTriangle className="size-8 text-muted-foreground/60" />
            <p className="text-xs font-semibold">
              {isVietnamese ? "Không tìm thấy sự cố nào phù hợp." : "No matching incidents found."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/20">
                  <th className="p-3 pl-4">{isVietnamese ? "Bằng chứng" : "Evidence"}</th>
                  <th className="p-3">{isVietnamese ? "Loại vi phạm & Mức độ" : "Violation & Severity"}</th>
                  <th className="p-3">{isVietnamese ? "Công trường & Vị trí" : "Site & Location"}</th>
                  <th className="p-3">{isVietnamese ? "Thời điểm phát hiện" : "Detected At"}</th>
                  <th className="p-3">{isVietnamese ? "Tiến độ xử lý" : "Progress Status"}</th>
                  <th className="p-3 pr-4 text-right">{isVietnamese ? "Thao tác" : "Action"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30 text-xs">
                {filteredIncidents.map((incident) => {
                  const isResolved = incident.status === "RESOLVED" || incident.status === "CLOSED";
                  const primaryEvidence = incident.evidences?.[0];
                  const snapshotUrl = incident.snapshotUrl || primaryEvidence?.storageKey;

                  return (
                    <tr
                      key={incident.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      {/* Evidence snapshot */}
                      <td className="p-3 pl-4">
                        <div className="size-12 rounded-xl overflow-hidden border border-border/60 bg-muted/40 shadow-[1px_1px_3px_var(--shadow-dark)] shrink-0 flex items-center justify-center">
                          {snapshotUrl ? (
                            <img
                              src={snapshotUrl}
                              alt=""
                              className="size-full object-cover"
                            />
                          ) : (
                            <Camera className="size-5 text-muted-foreground/50" />
                          )}
                        </div>
                      </td>

                      {/* Violation & Severity */}
                      <td className="p-3">
                        <div className="font-bold text-foreground">
                          {incident.violationType}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className={`px-1.5 py-0.2 rounded font-mono font-bold text-[10px] uppercase border ${
                              incident.severity === "CRITICAL"
                                ? "border-danger/40 bg-danger/10 text-danger"
                                : incident.severity === "HIGH"
                                  ? "border-warning/40 bg-warning/10 text-warning"
                                  : "border-border/60 bg-muted/40 text-muted-foreground"
                            }`}
                          >
                            {incident.severity}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            #{incident.id.slice(0, 8)}
                          </span>
                        </div>
                      </td>

                      {/* Site & Location */}
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 font-semibold text-foreground">
                          <Building2 size={13} className="text-primary shrink-0" />
                          <span className="truncate max-w-[150px]">
                            {incident.siteName || (isVietnamese ? "Công trường liên kết" : "Linked site")}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate max-w-[150px] mt-0.5">
                          {incident.cameraName || incident.cameraCode || (isVietnamese ? "Camera an toàn" : "Camera")}
                        </div>
                      </td>

                      {/* Detected At */}
                      <td className="p-3 font-mono text-[11px] text-muted-foreground">
                        {new Date(incident.detectedAt).toLocaleString(
                          isVietnamese ? "vi-VN" : "en-US",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          },
                        )}
                      </td>

                      {/* Progress Status: Finished or Pending? */}
                      <td className="p-3">
                        {isResolved ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-primary/40 bg-primary/10 text-primary font-bold text-[11px]">
                              <CheckCircle2 size={12} />
                              <span>{isVietnamese ? "Đã xử lý xong" : "Resolved"}</span>
                            </span>
                            {incident.resolvedAt && (
                              <p className="text-[10px] text-muted-foreground font-mono">
                                {isVietnamese ? "Xong: " : "At: "}
                                {new Date(incident.resolvedAt).toLocaleDateString(
                                  isVietnamese ? "vi-VN" : "en-US",
                                )}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-warning/40 bg-warning/10 text-warning font-bold text-[11px]">
                              <Clock size={12} />
                              <span>{isVietnamese ? "Chưa xong (Đang xử lý)" : "In Progress"}</span>
                            </span>
                            <p className="text-[10px] text-warning/80 font-medium">
                              {incident.status}
                            </p>
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="p-3 pr-4 text-right">
                        <a
                          href={`/incidents/${incident.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border border-border/60 bg-background text-foreground hover:text-primary hover:border-primary/40 text-xs font-semibold shadow-[1.5px_1.5px_3px_var(--shadow-dark),-1.5px_-1.5px_3px_var(--shadow-light)] transition-all"
                        >
                          <span>{isVietnamese ? "Chi tiết" : "View"}</span>
                          <ExternalLink size={12} />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
