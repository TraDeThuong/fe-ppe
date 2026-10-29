"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { useIncidents } from "@/hooks/incidents";
import { useGenerateReport, useReportTemplates } from "@/hooks/reporting";
import { useLocale } from "@/providers/locale-provider";
import type { SiteItem } from "@/types";

export interface SiteAnalyticsTabProps {
  site: SiteItem;
}

export function SiteAnalyticsTab({ site }: SiteAnalyticsTabProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  // Fetch real incidents for this site
  const { data: incidentsData, isLoading } = useIncidents({
    siteId: site.id,
    limit: 100,
  });

  const { data: templates } = useReportTemplates();
  const generateReportMutation = useGenerateReport();

  const incidents = useMemo(
    () => incidentsData?.items ?? [],
    [incidentsData]
  );

  const handleExport = async (format: "pdf" | "excel") => {
    try {
      const templateId = templates?.[0]?.id || "default";
      const now = new Date();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await generateReportMutation.mutateAsync({
        templateId,
        siteId: site.id,
        reportType: "CUSTOM",
        periodStart: thirtyDaysAgo.toISOString(),
        periodEnd: now.toISOString(),
        format: format.toUpperCase() as "PDF" | "EXCEL",
      });
    } catch {
      // Handled by mutation toast
    }
  };

  // Group real incidents by violation type
  const violationCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const inc of incidents) {
      const type = inc.violationType || "OTHER";
      map[type] = (map[type] || 0) + 1;
    }
    return Object.entries(map).map(([type, count]) => ({
      type,
      count,
      rate: incidents.length > 0 ? Math.round((count / incidents.length) * 100) : 0,
    }));
  }, [incidents]);

  return (
    <div className="space-y-6">
      {/* Top Banner: Export & Summary */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border/40 bg-surface p-4 sm:p-5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:border-black/60 dark:bg-card/90 dark:shadow-[5px_5px_14px_rgba(0,0,0,0.55)]">
        <div>
          <h3 className="text-sm font-bold text-foreground">
            {isVietnamese
              ? "Báo cáo Tuân thủ An toàn Công trường (Safety Intelligence)"
              : "Site Safety Compliance Intelligence Report"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isVietnamese
              ? "Dữ liệu thống kê sự cố và tuân thủ an toàn thực tế được tổng hợp từ AI Video Analytics."
              : "Real safety compliance data and incident statistics aggregated from AI Video Analytics."}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleExport("excel")}
            className="flex items-center gap-1.5 rounded-xl text-xs h-8 px-2.5 sm:px-3 text-muted-foreground hover:text-foreground"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-accent shrink-0" />
            <span className="sm:hidden">Excel</span>
            <span className="hidden sm:inline">{isVietnamese ? "Xuất Excel" : "Export Excel"}</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => handleExport("pdf")}
            className="flex items-center gap-1.5 rounded-xl text-xs h-8 px-2.5 sm:px-3"
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span className="sm:hidden">PDF</span>
            <span className="hidden sm:inline">{isVietnamese ? "Tải Báo cáo PDF" : "Download PDF Report"}</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-surface-elevated/40" />
      ) : incidents.length === 0 ? (
        <div className="rounded-2xl border border-border/30 bg-surface p-12 text-center dark:border-black/50 dark:bg-card/70">
          <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
          <h4 className="text-sm font-bold text-foreground">
            {isVietnamese
              ? "Chưa có dữ liệu thống kê sự cố"
              : "No incident statistics available"}
          </h4>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            {isVietnamese
              ? `Chưa ghi nhận sự cố an toàn nào tại công trường ${site.name}. Số liệu phân tích và biểu đồ xu hướng sẽ được tổng hợp khi camera AI ghi nhận sự cố vi phạm thực tế.`
              : `No safety incidents recorded at site ${site.name} yet. Analytical figures and trend charts will be aggregated once cameras record safety violations.`}
          </p>
        </div>
      ) : (
        /* Real data summary */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Breakdown by violation type */}
          <div className="space-y-4 rounded-2xl border border-border/40 bg-surface p-4 sm:p-5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:border-black/60 dark:bg-card/90 dark:shadow-[5px_5px_14px_rgba(0,0,0,0.55)]">
            <div className="flex items-center justify-between border-b border-border/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <h4 className="text-xs font-bold text-foreground">
                  {isVietnamese ? "Phân loại Vi phạm Thực tế" : "Violation Breakdown"}
                </h4>
              </div>
              <span className="text-[11px] font-mono text-primary font-bold">
                {isVietnamese
                  ? `Tổng cộng: ${incidents.length} sự cố`
                  : `Total: ${incidents.length} incidents`}
              </span>
            </div>

            <div className="space-y-3.5">
              {violationCounts.map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">{item.type}</span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-bold text-foreground">
                        {item.count} {isVietnamese ? "vụ" : "cases"}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        ({item.rate}%)
                      </span>
                    </div>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-elevated">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${item.rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Real incidents overview */}
          <div className="space-y-4 rounded-2xl border border-border/40 bg-surface p-4 sm:p-5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:border-black/60 dark:bg-card/90 dark:shadow-[5px_5px_14px_rgba(0,0,0,0.55)]">
            <div className="flex items-center justify-between border-b border-border/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <TrendingUp className="h-4 w-4" />
                </span>
                <h4 className="text-xs font-bold text-foreground">
                  {isVietnamese
                    ? "Tổng quan Trạng thái Xử lý"
                    : "Resolution Status Overview"}
                </h4>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-surface-elevated">
                <span className="text-muted-foreground">
                  {isVietnamese ? "Chờ xử lý (Pending)" : "Pending Review"}
                </span>
                <span className="font-mono font-bold text-danger">
                  {incidents.filter((i) => i.status === "PENDING" || i.status === "PENDING_REVIEW").length}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-surface-elevated">
                <span className="text-muted-foreground">
                  {isVietnamese ? "Đã xác nhận / xử lý (Resolved)" : "Resolved / Confirmed"}
                </span>
                <span className="font-mono font-bold text-primary">
                  {incidents.filter((i) => i.status === "RESOLVED" || i.status === "CONFIRMED" || i.status === "CLOSED").length}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-surface-elevated">
                <span className="text-muted-foreground">
                  {isVietnamese ? "Báo động giả (Dismissed)" : "False Alarm (Dismissed)"}
                </span>
                <span className="font-mono font-bold text-muted-foreground">
                  {incidents.filter((i) => i.status === "DISMISSED").length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
