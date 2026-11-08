"use client";

import { useMemo } from "react";
import {
  Award,
  Clock,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  HardHat,
  Shirt,
  ShieldAlert,
  Flame,
  Check,
  ThumbsUp,
  Target,
} from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import type { IncidentItem, UserResponseDto } from "@/types";

export interface UserPerformanceTabProps {
  user: UserResponseDto;
  incidents: IncidentItem[];
  stats: {
    totalIncidents: number;
    resolvedIncidents: number;
    pendingIncidents: number;
    resolutionRate: number;
    mttrHours: number;
    slaComplianceRate: number;
    performanceTier: "EXCELLENT" | "GOOD" | "AVERAGE" | "NEEDS_IMPROVEMENT" | "UNRATED";
  };
}

export function UserPerformanceTab({
  user,
  incidents,
  stats,
}: UserPerformanceTabProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  // Violation Type Breakdown
  const violationBreakdown = useMemo(() => {
    const counts: Record<string, number> = {
      NO_HELMET: 0,
      NO_VEST: 0,
      RESTRICTED_AREA: 0,
      OTHER: 0,
    };

    incidents.forEach((inc) => {
      const type = (inc.violationType || "").toUpperCase();
      if (type.includes("HELMET") || type.includes("MŨ")) {
        counts.NO_HELMET += 1;
      } else if (type.includes("VEST") || type.includes("ÁO")) {
        counts.NO_VEST += 1;
      } else if (type.includes("RESTRICTED") || type.includes("CẤM") || type.includes("VÙNG")) {
        counts.RESTRICTED_AREA += 1;
      } else {
        counts.OTHER += 1;
      }
    });

    const total = incidents.length || 1;
    return [
      {
        id: "helmet",
        label: isVietnamese ? "Không đội mũ bảo hộ" : "No Helmet",
        count: counts.NO_HELMET,
        percent: Math.round((counts.NO_HELMET / total) * 100),
        icon: HardHat,
        color: "text-amber-500 bg-amber-500/10 border-amber-500/30",
        barColor: "bg-amber-500",
      },
      {
        id: "vest",
        label: isVietnamese ? "Không mặc áo phản quang" : "No High-Vis Vest",
        count: counts.NO_VEST,
        percent: Math.round((counts.NO_VEST / total) * 100),
        icon: Shirt,
        color: "text-blue-500 bg-blue-500/10 border-blue-500/30",
        barColor: "bg-blue-500",
      },
      {
        id: "area",
        label: isVietnamese ? "Vi phạm khu vực cấm" : "Restricted Area",
        count: counts.RESTRICTED_AREA,
        percent: Math.round((counts.RESTRICTED_AREA / total) * 100),
        icon: ShieldAlert,
        color: "text-danger bg-danger/10 border-danger/30",
        barColor: "bg-danger",
      },
      {
        id: "other",
        label: isVietnamese ? "Vi phạm an toàn khác" : "Other Safety Violations",
        count: counts.OTHER,
        percent: Math.round((counts.OTHER / total) * 100),
        icon: AlertTriangle,
        color: "text-muted-foreground bg-muted/40 border-border/60",
        barColor: "bg-muted-foreground",
      },
    ];
  }, [incidents, isVietnamese]);

  // Overall Performance Score Calculation (out of 100)
  const performanceScore = useMemo(() => {
    if (stats.totalIncidents === 0) return null;
    // 60% weight on resolution rate, 40% weight on SLA compliance
    const score = Math.round(stats.resolutionRate * 0.6 + stats.slaComplianceRate * 0.4);
    return Math.min(100, Math.max(10, score));
  }, [stats]);

  // Automated Feedback Generation
  const feedback = useMemo(() => {
    if (stats.totalIncidents === 0) {
      return {
        title: isVietnamese ? "Chưa có dữ liệu đánh giá" : "No Evaluation Data Yet",
        comment: isVietnamese
          ? "Nhân sự này hiện chưa tiếp nhận hoặc chưa được phân công sự cố an toàn lao động nào để tính toán các chỉ số MTTR, SLA và xếp hạng thi đua."
          : "This user has not been assigned any PPE incidents yet to evaluate MTTR or SLA performance benchmarks.",
        recommendation: isVietnamese
          ? "Khi có sự cố vi phạm được phân công, hệ thống sẽ tự động đo lường thời gian phản hồi và xếp hạng năng lực thực tế."
          : "Once incidents are assigned, the system will track real-time resolution speed and performance.",
      };
    }

    if (stats.resolutionRate >= 90 && stats.slaComplianceRate >= 85) {
      return {
        title: isVietnamese ? "Cán bộ An toàn Xuất sắc (Chiến sĩ An toàn)" : "Excellent Safety Officer",
        comment: isVietnamese
          ? `Đạt tỷ lệ giải quyết sự cố rất cao (${stats.resolutionRate}%) với thời gian phản hồi trung bình ấn tượng (${stats.mttrHours < 1 ? Math.round(stats.mttrHours * 60) + " phút" : stats.mttrHours + " giờ"}). Luôn tuân thủ chặt chẽ thời hạn cam kết SLA.`
          : `High resolution rate (${stats.resolutionRate}%) and rapid response time (${stats.mttrHours}h). Outstanding compliance with SLA targets.`,
        recommendation: isVietnamese
          ? "Phát huy kinh nghiệm xử lý nhanh để chia sẻ quy trình cho các cán bộ an toàn mới tại công trường."
          : "Leverage best practices to mentor newer team members.",
      };
    }

    if (stats.resolutionRate >= 75) {
      return {
        title: isVietnamese ? "Cán bộ An toàn Hoàn thành Tốt nhiệm vụ" : "Good Safety Performance",
        comment: isVietnamese
          ? `Đã xử lý dứt điểm ${stats.resolvedIncidents}/${stats.totalIncidents} sự cố được giao. Tỷ lệ đáp ứng chuẩn thời hạn SLA đạt ${stats.slaComplianceRate}%.`
          : `Handled ${stats.resolvedIncidents}/${stats.totalIncidents} assigned cases with ${stats.slaComplianceRate}% SLA compliance.`,
        recommendation: isVietnamese
          ? "Ưu tiên xử lý nhanh hơn đối với các sự cố mức độ Critical và High để nâng cao hơn nữa chỉ số MTTR."
          : "Focus on faster resolution for Critical and High severity alerts.",
      };
    }

    return {
      title: isVietnamese ? "Cần đôn đốc & Cải thiện tiến độ xử lý" : "Needs Attention & Improvement",
      comment: isVietnamese
        ? `Hiện tại vẫn còn ${stats.pendingIncidents} sự cố vi phạm PPE chưa được xử lý xong. Cần đôn đốc giải quyết dứt điểm để đảm bảo an toàn tuyệt đối cho người lao động.`
        : `${stats.pendingIncidents} incidents remain unresolved. Expedited action required to meet occupational safety benchmarks.`,
      recommendation: isVietnamese
        ? "Tập trung giải quyết các vụ việc tồn đọng ngay trong ca làm việc, phối hợp cùng ban chỉ huy công trường để đóng sự cố."
        : "Address backlog immediately in coordination with on-site command.",
    };
  }, [stats, isVietnamese]);

  return (
    <div className="space-y-6">
      {/* 1. Top Section: Score Hero + SLA Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Overall Score Badge Card (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-white/80 dark:border-white/5 bg-background dark:bg-card p-6 shadow-[6px_6px_14px_var(--shadow-dark),-5px_-5px_14px_rgba(255,255,255,0.9)] dark:shadow-[6px_6px_14px_rgba(0,0,0,0.4),-2px_-2px_6px_rgba(255,255,255,0.02)] flex flex-col items-center justify-center text-center">
          <div className="relative flex size-28 items-center justify-center rounded-full border-4 border-primary/20 bg-primary/[0.04] shadow-[inset_2px_2px_5px_var(--shadow-dark),2px_2px_5px_var(--shadow-light)]">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-extrabold text-foreground font-mono leading-none">
                {performanceScore !== null ? performanceScore : "—"}
              </span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                / 100
              </span>
            </div>
          </div>

          <h3 className="text-base font-bold text-foreground mt-4">
            {isVietnamese ? "Điểm Đánh Giá Năng Lực" : "Performance Rating Score"}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            {stats.totalIncidents === 0
              ? isVietnamese
                ? "Chưa có sự cố phân công để tính điểm."
                : "No incidents assigned for scoring."
              : isVietnamese
                ? "Tổng hợp từ tiến độ giải quyết vi phạm và mức độ đáp ứng thời hạn SLA."
                : "Calculated from incident completion and SLA timeliness."}
          </p>

          <div className="mt-4 pt-4 border-t border-border/40 w-full flex items-center justify-around">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                {isVietnamese ? "Xếp loại" : "Tier"}
              </span>
              <p className="text-xs font-bold text-primary">
                {stats.performanceTier === "EXCELLENT"
                  ? isVietnamese
                    ? "Xuất sắc (Hạng A+)"
                    : "Excellent (A+)"
                  : stats.performanceTier === "GOOD"
                    ? isVietnamese
                      ? "Tốt (Hạng A)"
                      : "Good (A)"
                    : stats.performanceTier === "UNRATED"
                      ? isVietnamese
                        ? "Chưa đánh giá"
                        : "Unrated"
                      : isVietnamese
                        ? "Cần cải thiện (Hạng C)"
                        : "Needs Improvement (C)"}
              </p>
            </div>

            <div className="h-7 w-px bg-border/40" />

            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                {isVietnamese ? "Đúng hạn SLA" : "SLA Rate"}
              </span>
              <p className="text-xs font-bold font-mono text-foreground">
                {stats.slaComplianceRate <= 0 ? "—" : `${stats.slaComplianceRate}%`}
              </p>
            </div>
          </div>
        </div>

        {/* SLA & MTTR Metrics Deep-Dive (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-white/80 dark:border-white/5 bg-background dark:bg-card p-6 shadow-[6px_6px_14px_var(--shadow-dark),-5px_-5px_14px_rgba(255,255,255,0.9)] dark:shadow-[6px_6px_14px_rgba(0,0,0,0.4),-2px_-2px_6px_rgba(255,255,255,0.02)] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-border/40 mb-4">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Target size={16} />
              </span>
              <div>
                <h4 className="text-sm font-bold text-foreground">
                  {isVietnamese ? "Chỉ số Thời gian & Hiệu suất Phản hồi" : "Response Time & SLA Metrics"}
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  {isVietnamese
                    ? "Đo lường thời gian trung bình giải quyết vi phạm trên hiện trường"
                    : "Measurement of resolution speed against workplace safety standards"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl border border-border/50 bg-background/60 shadow-[inset_1px_1px_3px_var(--shadow-dark)] space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {isVietnamese ? "Thời gian xử lý TB (MTTR)" : "Mean Time to Resolve"}
                </span>
                <p className="text-xl font-bold font-mono text-foreground">
                  {stats.mttrHours <= 0
                    ? "—"
                    : stats.mttrHours < 1
                      ? `${Math.round(stats.mttrHours * 60)} ${isVietnamese ? "phút" : "min"}`
                      : `${stats.mttrHours} ${isVietnamese ? "giờ" : "hrs"}`}
                </p>
                <p className="text-[10px] text-primary font-medium">
                  {stats.mttrHours <= 0
                    ? isVietnamese
                      ? "Chưa phát sinh dữ liệu"
                      : "No data available"
                    : isVietnamese
                      ? "Tiêu chuẩn ngành: < 4 giờ"
                      : "Benchmark: < 4 hours"}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-border/50 bg-background/60 shadow-[inset_1px_1px_3px_var(--shadow-dark)] space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {isVietnamese ? "Tỷ lệ hoàn thành nhiệm vụ" : "Completion Rate"}
                </span>
                <p className="text-xl font-bold font-mono text-foreground">
                  {stats.totalIncidents === 0 ? "0%" : `${stats.resolutionRate}%`}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {stats.resolvedIncidents} / {stats.totalIncidents} {isVietnamese ? "sự cố đã đóng" : "closed"}
                </p>
              </div>
            </div>
          </div>

          {/* Automated Evaluation Callout */}
          <div className="mt-4 p-4 rounded-xl border border-primary/30 bg-primary/[0.05] shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
            <div className="flex items-center gap-2 mb-1.5">
              <ThumbsUp size={15} className="text-primary" />
              <span className="text-xs font-bold text-foreground">{feedback.title}</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {feedback.comment}
            </p>
            <p className="text-[11px] text-primary/90 mt-2 font-medium">
              💡 {isVietnamese ? "Khuyến nghị: " : "Recommendation: "} {feedback.recommendation}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Violation Types Distribution */}
      <div className="rounded-2xl border border-white/80 dark:border-white/5 bg-background dark:bg-card p-6 shadow-[6px_6px_14px_var(--shadow-dark),-5px_-5px_14px_rgba(255,255,255,0.9)] dark:shadow-[6px_6px_14px_rgba(0,0,0,0.4),-2px_-2px_6px_rgba(255,255,255,0.02)] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent/10 text-accent border border-accent/20">
              <ShieldCheck size={16} />
            </span>
            <div>
              <h4 className="text-sm font-bold text-foreground">
                {isVietnamese ? "Phân loại Vi phạm đã Xử lý" : "Violation Categories Handled"}
              </h4>
              <p className="text-[11px] text-muted-foreground">
                {isVietnamese
                  ? "Tỷ lệ phân bố các dạng vi phạm an toàn lao động mà nhân sự này tiếp nhận"
                  : "Distribution of PPE violation types assigned to this personnel"}
              </p>
            </div>
          </div>

          <span className="text-xs font-mono font-bold text-muted-foreground">
            {incidents.length} {isVietnamese ? "vụ việc" : "cases"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {violationBreakdown.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-border/50 bg-background shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className={`p-2 rounded-lg border ${item.color}`}>
                    <Icon size={16} />
                  </span>
                  <span className="text-xs font-bold font-mono text-foreground">
                    {item.percent}%
                  </span>
                </div>

                <div>
                  <p className="text-xs font-bold text-foreground truncate">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                    {item.count} {isVietnamese ? "vụ việc" : "incidents"}
                  </p>
                </div>

                <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
                  <div
                    className={`h-full rounded-full ${item.barColor}`}
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
