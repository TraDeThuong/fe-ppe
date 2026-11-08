"use client";

import Link from "next/link";
import {
  Cctv,
  FileSpreadsheet,
  PlusCircle,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { useLocale } from "@/providers/locale-provider";

export interface DashboardQuickActionsProps {
  onOpenGenerateReport?: () => void;
  canExportReports?: boolean;
  canReviewIncidents?: boolean;
}

export function DashboardQuickActions({
  onOpenGenerateReport,
  canExportReports = true,
  canReviewIncidents = true,
}: DashboardQuickActionsProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const actions = [
    {
      title: t("dashboard.quickActions.reviewPending"),
      description: isVietnamese
        ? "Xử lý danh sách sự cố vi phạm đang chờ xác nhận"
        : "Process list of unconfirmed safety violations",
      icon: ShieldAlert,
      href: "/incidents?status=PENDING_REVIEW",
      tone: "text-warning",
      bgColor: "bg-warning/10",
      borderColor: "border-warning/20",
      enabled: canReviewIncidents,
    },
    {
      title: t("dashboard.quickActions.openVideoWall"),
      description: isVietnamese
        ? "Giám sát trực tiếp đa luồng camera RTSP thời gian thực"
        : "Real-time multi-stream RTSP CCTV surveillance",
      icon: Cctv,
      href: "/cameras?view=wall",
      tone: "text-primary",
      bgColor: "bg-primary/10",
      borderColor: "border-primary/20",
      enabled: true,
    },
    {
      title: t("dashboard.quickActions.generateReport"),
      description: isVietnamese
        ? "Kết xuất dữ liệu vi phạm định dạng PDF/Excel tức thời"
        : "Export safety compliance data to PDF or Excel",
      icon: FileSpreadsheet,
      onClick: onOpenGenerateReport,
      href: onOpenGenerateReport ? undefined : "/reports",
      tone: "text-success",
      bgColor: "bg-success/10",
      borderColor: "border-success/20",
      enabled: canExportReports,
    },
    {
      title: t("dashboard.quickActions.safetyConfig"),
      description: isVietnamese
        ? "Tùy chỉnh ngưỡng tin cậy AI và vùng cấm camera"
        : "Fine-tune AI confidence thresholds & restricted zones",
      icon: SlidersHorizontal,
      href: "/sites",
      tone: "text-info",
      bgColor: "bg-info/10",
      borderColor: "border-info/20",
      enabled: true,
    },
  ].filter((a) => a.enabled);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          {t("dashboard.quickActions.title")}
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {actions.map((act, index) => {
          const content = (
            <div className="group relative flex items-start gap-3 rounded-2xl border border-border/40 bg-surface/90 p-3.5 shadow-[2px_3px_10px_rgba(0,0,0,0.03),-2px_-2px_8px_rgba(255,255,255,0.6)] transition-all duration-300 hover:-translate-y-0.5 dark:border-white/[0.08] dark:bg-card/40 dark:shadow-[0_4px_16px_rgba(0,0,0,0.2)] dark:hover:border-white/20 cursor-pointer h-full">
              {/* Specular highlight rim */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/[0.05]"
              />

              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${act.bgColor} ${act.tone} ${act.borderColor} shadow-[inset_1px_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none dark:border-white/[0.08] transition-transform duration-300 group-hover:scale-105`}
              >
                <act.icon className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                  {act.title}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug line-clamp-2">
                  {act.description}
                </p>
              </div>
            </div>
          );

          if (act.href) {
            return (
              <Link key={index} href={act.href} className="block h-full">
                {content}
              </Link>
            );
          }

          return (
            <button
              key={index}
              type="button"
              onClick={act.onClick}
              className="block w-full text-left h-full"
            >
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
}

