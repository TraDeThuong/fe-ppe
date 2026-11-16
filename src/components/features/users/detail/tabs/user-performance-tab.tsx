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
import type { UserIncidentStats } from "../user-detail-utils";
import type { IncidentItem, UserResponseDto } from "@/types";

export interface UserPerformanceTabProps {
  user: UserResponseDto;
  incidents: IncidentItem[];
  stats: UserIncidentStats;
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
    if (!stats.hasSlaData) {
      return Math.min(100, Math.max(10, stats.resolutionRate));
    }
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

    if (stats.resolutionRate >= 90 && (stats.slaComplianceRate >= 85 || !stats.hasSlaData)) {
      return {
        title: isVietnamese ? "Cán bộ An toàn Xuất sắc (Chiến sĩ An toàn)" : "Excellent Safety Officer",
        comment: isVietnamese
          ? stats.hasSlaData
            ? `Đạt tỷ lệ giải quyết sự cố rất cao (${stats.resolutionRate}%) với thời gian phản hồi trung bình ấn tượng (${stats.mttrHours < 1 ? Math.round(stats.mttrHours * 60) + " phút" : stats.mttrHours + " giờ"}). Luôn tuân thủ chặt chẽ thời hạn cam kết SLA.`
            : `Đạt tỷ lệ giải quyết sự cố rất cao (${stats.resolutionRate}%).`
          : stats.hasSlaData
            ? `High resolution rate (${stats.resolutionRate}%) and rapid response time (${stats.mttrHours}h). Outstanding compliance with SLA targets.`
            : `High resolution rate (${stats.resolutionRate}%).`,
        recommendation: isVietnamese
          ? "Phát huy kinh nghiệm xử lý nhanh để chia sẻ quy trình cho các cán bộ an toàn mới tại công trường."
          : "Leverage best practices to mentor newer team members.",
      };
    }

    if (stats.resolutionRate >= 75) {
      return {
        title: isVietnamese ? "Cán bộ An toàn Hoàn thành Tốt nhiệm vụ" : "Good Safety Performance",
        comment: isVietnamese
          ? `Đã xử lý dứt điểm ${stats.resolvedIncidents}/${stats.totalIncidents} sự cố liên quan.${stats.hasSlaData ? ` Tỷ lệ đáp ứng chuẩn thời hạn SLA đạt ${stats.slaComplianceRate}%.` : ""}`
          : `Handled ${stats.resolvedIncidents}/${stats.totalIncidents} correlated cases.${stats.hasSlaData ? ` SLA compliance: ${stats.slaComplianceRate}%.` : ""}`,
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
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Overall Score Badge Card (5 cols) */}
        <div className="flex flex-col items-center justify-between rounded-[26px] bg-background p-5 sm:p-6 text-center shadow-[10px_10px_24px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light)] lg:col-span-5">
          <div className="flex flex-1 flex-col items-center justify-center py-2">
            {/* Mặt đồng hồ 2 cấp độ: Vành ngoài nổi + Lõi số lõm sâu */}
            <div className="relative flex size-32 items-center justify-center rounded-full bg-background p-2.5 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)]">
              <div className="flex size-full flex-col items-center justify-center rounded-full bg-background shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_var(--shadow-light)]">
                <span className="font-mono text-3xl font-black leading-none text-primary">
                  {performanceScore !== null ? performanceScore : "—"}
                </span>
                <span className="mt-1.5 font-mono text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                  / 100
                </span>
              </div>
            </div>

            <h3 className="mt-4 text-base font-black tracking-tight text-foreground">
              {isVietnamese ? "Điểm Đánh Giá Năng Lực" : "Performance Rating Score"}
            </h3>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
              {stats.totalIncidents === 0
                ? isVietnamese
                  ? "Chưa có sự cố phân công để tính điểm."
                  : "No incidents assigned for scoring."
                : isVietnamese
                  ? "Tổng hợp từ tiến độ giải quyết vi phạm và mức độ đáp ứng thời hạn SLA."
                  : "Calculated from incident completion and SLA timeliness."}
            </p>
          </div>

          {/* 2 Ô chỉ số phụ khắc chìm cân đối ở đáy */}
          <div className="mt-4 grid w-full grid-cols-2 gap-3">
            <div className="rounded-[15px] bg-background px-3 py-2.5 shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)]">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {isVietnamese ? "Xếp loại" : "Tier"}
              </span>
              <p className="mt-0.5 truncate text-xs font-extrabold text-primary">
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
                      : stats.performanceTier === "AVERAGE"
                        ? isVietnamese
                          ? "Trung bình (Hạng B)"
                          : "Average (B)"
                        : isVietnamese
                          ? "Cần cải thiện (Hạng C)"
                          : "Needs Improvement (C)"}
              </p>
            </div>

            <div className="rounded-[15px] bg-background px-3 py-2.5 shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)]">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {isVietnamese ? "Đúng hạn SLA" : "SLA Rate"}
              </span>
              <p className="mt-0.5 font-mono text-xs font-black text-foreground">
                {!stats.hasSlaData ? "—" : `${stats.slaComplianceRate}%`}
              </p>
            </div>
          </div>
        </div>

        {/* SLA & MTTR Metrics Deep-Dive (7 cols) */}
        <div className="flex flex-col justify-between rounded-[26px] bg-background p-5 sm:p-6 shadow-[10px_10px_24px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light)] lg:col-span-7">
          <div className="space-y-4">
            {/* Header không đường kẻ ngang */}
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-[13px] bg-background text-primary shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]">
                <div className="flex size-7.5 items-center justify-center rounded-[9px] bg-background shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                  <Target size={16} strokeWidth={2.3} />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-black tracking-tight text-foreground sm:text-base">
                  {isVietnamese
                    ? "Chỉ số Thời gian & Hiệu suất Phản hồi"
                    : "Response Time & SLA Metrics"}
                </h4>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {isVietnamese
                    ? "Đo lường thời gian trung bình giải quyết vi phạm trên hiện trường"
                    : "Measurement of resolution speed against workplace safety standards"}
                </p>
              </div>
            </div>

            {/* 2 Hốc chỉ số lõm sâu */}
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="space-y-1.5 rounded-[18px] bg-background p-4 shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_var(--shadow-light)]">
                <span className="text-[11px] font-bold text-muted-foreground">
                  {isVietnamese
                    ? "Thời gian xử lý TB (MTTR)"
                    : "Mean Time to Resolve"}
                </span>
                <p className="font-mono text-2xl font-black text-foreground">
                  {stats.mttrHours <= 0
                    ? "—"
                    : stats.mttrHours < 1
                      ? `${Math.round(stats.mttrHours * 60)} ${isVietnamese ? "phút" : "min"}`
                      : `${stats.mttrHours} ${isVietnamese ? "giờ" : "hrs"}`}
                </p>
                <p className="text-[11px] font-semibold text-primary">
                  {stats.mttrHours <= 0
                    ? isVietnamese
                      ? "Chưa phát sinh dữ liệu"
                      : "No data available"
                    : isVietnamese
                      ? "Tiêu chuẩn ngành: dưới 4 giờ"
                      : "Benchmark: under 4 hours"}
                </p>
              </div>

              <div className="space-y-1.5 rounded-[18px] bg-background p-4 shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_var(--shadow-light)]">
                <span className="text-[11px] font-bold text-muted-foreground">
                  {isVietnamese
                    ? "Tỷ lệ hoàn thành nhiệm vụ"
                    : "Completion Rate"}
                </span>
                <p className="font-mono text-2xl font-black text-foreground">
                  {stats.totalIncidents === 0 ? "0%" : `${stats.resolutionRate}%`}
                </p>
                <p className="text-[11px] font-medium text-muted-foreground">
                  {stats.resolvedIncidents} / {stats.totalIncidents}{" "}
                  {isVietnamese ? "sự cố đã đóng" : "closed"}
                </p>
              </div>
            </div>
          </div>

          {/* Automated Evaluation Callout: Khối nổi nhẹ trên mặt nền */}
          <div className="mt-4 rounded-[18px] bg-background p-4 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)]">
            <div className="mb-1.5 flex items-center gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-background text-primary shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                <ThumbsUp size={14} strokeWidth={2.4} />
              </span>
              <span className="text-xs font-extrabold text-foreground">
                {feedback.title}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {feedback.comment}
            </p>
            <p className="mt-2.5 inline-block rounded-lg bg-background px-2.5 py-1 text-[11px] font-bold text-primary shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]">
              💡 {isVietnamese ? "Khuyến nghị: " : "Recommendation: "}
              {feedback.recommendation}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Violation Types Distribution */}
      <div className="space-y-4 rounded-[26px] bg-background p-5 sm:p-6 shadow-[10px_10px_24px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[13px] bg-background text-primary shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]">
              <div className="flex size-7.5 items-center justify-center rounded-[9px] bg-background shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                <ShieldCheck size={16} strokeWidth={2.3} />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-black tracking-tight text-foreground sm:text-base">
                {isVietnamese
                  ? "Phân loại Vi phạm đã Xử lý"
                  : "Violation Categories Handled"}
              </h4>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {isVietnamese
                  ? "Tỷ lệ phân bố các dạng vi phạm an toàn lao động mà nhân sự này tiếp nhận"
                  : "Distribution of PPE violation types assigned to this personnel"}
              </p>
            </div>
          </div>

          <span className="rounded-full bg-background px-3.5 py-1 font-mono text-xs font-extrabold text-primary shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
            {incidents.length} {isVietnamese ? "vụ việc" : "cases"}
          </span>
        </div>

        {/* Khay lõm chứa 4 thẻ phân loại vi phạm */}
        <div className="rounded-[20px] bg-background p-3 shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_var(--shadow-light)]">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {violationBreakdown.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="space-y-3 rounded-[16px] bg-background p-4 shadow-[3.5px_3.5px_8px_var(--shadow-dark),-3.5px_-3.5px_8px_var(--shadow-light)] transition-all duration-200 hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex size-9 items-center justify-center rounded-xl bg-background shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] ${item.color} border-0`}
                    >
                      <Icon size={16} strokeWidth={2.3} />
                    </span>
                    <span className="font-mono text-sm font-black text-foreground">
                      {item.percent}%
                    </span>
                  </div>

                  <div>
                    <p className="truncate text-xs font-extrabold text-foreground">
                      {item.label}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] font-medium text-muted-foreground">
                      {item.count} {isVietnamese ? "vụ việc" : "incidents"}
                    </p>
                  </div>

                  {/* Thanh tiến độ khắc chìm */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-background p-[2px] shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${item.barColor}`}
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
