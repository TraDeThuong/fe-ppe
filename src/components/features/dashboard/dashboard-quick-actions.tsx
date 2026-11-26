"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Cctv,
  FileSpreadsheet,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { useLocale } from "@/providers/locale-provider";

export interface DashboardQuickActionsProps {
  onOpenGenerateReport?: () => void;
  canExportReports?: boolean;
  canReviewIncidents?: boolean;
  columns?: 2 | 4;
}

export function DashboardQuickActions({
  onOpenGenerateReport,
  canExportReports = true,
  canReviewIncidents = true,
  columns = 2,
}: DashboardQuickActionsProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const actions = [
    {
      code: "01",
      title: t("dashboard.quickActions.reviewPending"),
      description: isVietnamese
        ? "Xử lý danh sách sự cố vi phạm đang chờ xác nhận"
        : "Process list of unconfirmed safety violations",
      icon: ShieldAlert,
      href: "/incidents?status=PENDING_REVIEW",
      variant: "primary" as const,
      enabled: canReviewIncidents,
    },
    {
      code: "02",
      title: t("dashboard.quickActions.openVideoWall"),
      description: isVietnamese
        ? "Giám sát trực tiếp đa luồng camera RTSP thời gian thực"
        : "Real-time multi-stream RTSP CCTV surveillance",
      icon: Cctv,
      href: "/cameras?view=wall",
      variant: "primary" as const,
      enabled: true,
    },
    {
      code: "03",
      title: t("dashboard.quickActions.generateReport"),
      description: isVietnamese
        ? "Kết xuất dữ liệu vi phạm định dạng PDF/Excel tức thời"
        : "Export safety compliance data to PDF or Excel",
      icon: FileSpreadsheet,
      onClick: onOpenGenerateReport,
      href: onOpenGenerateReport ? undefined : "/reports",
      variant: "accent" as const,
      enabled: canExportReports,
    },
    {
      code: "04",
      title: t("dashboard.quickActions.safetyConfig"),
      description: isVietnamese
        ? "Tùy chỉnh ngưỡng tin cậy AI và vùng cấm camera"
        : "Fine-tune AI confidence thresholds & restricted zones",
      icon: SlidersHorizontal,
      href: "/sites",
      variant: "accent" as const,
      enabled: true,
    },
  ].filter((a) => a.enabled);

  return (
    <section
      className={[
        "relative overflow-hidden transition-all duration-300",
        // Khung vỏ ngoài lồi khối 3D
        "rounded-[24px] sm:rounded-[28px] p-4 sm:p-5",
        "bg-gradient-to-br from-background via-background to-muted/40 dark:from-card dark:via-card dark:to-background/90",
        "border-t border-l border-white/95 border-b border-r border-black/[0.06]",
        "dark:border-t-white/[0.12] dark:border-l-white/[0.08] dark:border-b-black/60 dark:border-r-black/40",
        "shadow-[12px_12px_26px_var(--shadow-dark),-12px_-12px_26px_var(--shadow-light)]",
        "dark:shadow-[14px_14px_30px_rgba(0,0,0,0.55),-8px_-8px_20px_rgba(255,255,255,0.03)]",
      ].join(" ")}
    >
      {/* Ambient Glow nhẹ từ Primary & Accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-14 -top-14 size-44 rounded-full bg-primary/[0.06] blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-14 -left-14 size-44 rounded-full bg-accent/[0.08] blur-3xl"
      />

      {/* Header gọn gàng */}
      <div className="relative mb-3.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {/* Icon Box nhỏ lồi 3D */}
          <div
            className={[
              "flex size-7 items-center justify-center rounded-[9px] text-primary",
              "bg-background dark:bg-card",
              "border-t border-l border-white/95 border-b border-r border-black/[0.06]",
              "dark:border-t-white/[0.12] dark:border-l-white/[0.08] dark:border-b-black/50",
              "shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)]",
              "dark:shadow-[3px_3px_7px_rgba(0,0,0,0.45)]",
            ].join(" ")}
          >
            <Sparkles className="size-3.5" strokeWidth={2.4} />
          </div>

          <h3 className="text-xs font-black uppercase tracking-[0.16em] text-foreground sm:text-sm">
            {t("dashboard.quickActions.title")}
          </h3>
        </div>

        {/* Badge đếm số lượng phím chức năng khắc chìm */}
        <span
          className={[
            "rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold text-muted-foreground",
            "bg-background/80 dark:bg-background/50",
            "border-t border-l border-black/[0.06] border-b border-r border-white/80",
            "dark:border-t-black/45 dark:border-b-white/[0.05]",
            "shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]",
            "dark:shadow-[inset_1.5px_1.5px_4px_rgba(0,0,0,0.45)]",
          ].join(" ")}
        >
          {actions.length} ACTIONS
        </span>
      </div>

      {/* Khay lõm chứa các phím bấm tác vụ (Recessed Keycap Well) */}
      <div
        className={[
          "relative rounded-[18px] p-2.5 sm:p-3",
          "bg-background/85 dark:bg-background/60",
          "border-t border-l border-black/[0.08] border-b border-r border-white/85",
          "dark:border-t-black/55 dark:border-l-black/45 dark:border-b-white/[0.07] dark:border-r-white/[0.04]",
          "shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_var(--shadow-light)]",
          "dark:shadow-[inset_5px_5px_11px_rgba(0,0,0,0.5),inset_-3px_-3px_8px_rgba(255,255,255,0.03)]",
        ].join(" ")}
      >
        <div
          className={`grid grid-cols-1 gap-2.5 sm:grid-cols-2 ${
            columns === 4 ? "xl:grid-cols-4" : ""
          }`}
        >
          {actions.map((act, index) => {
            const isPrimary = act.variant === "primary";

            const cardContent = (
              <div
                className={[
                  "group relative flex h-full cursor-pointer items-start gap-3 overflow-hidden rounded-[14px] p-3.5 transition-all duration-200",
                  // Phím bấm nổi khối 3D
                  "bg-gradient-to-br from-background to-muted/40 dark:from-card/95 dark:to-background/85",
                  "border-t border-l border-white/95 border-b border-r border-black/[0.06]",
                  "dark:border-t-white/[0.11] dark:border-l-white/[0.07] dark:border-b-black/50 dark:border-r-black/35",
                  "shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]",
                  "dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45),-2px_-2px_6px_rgba(255,255,255,0.03)]",
                  // Hover: Nhô lên nhẹ + viền ánh màu nhẹ
                  "hover:-translate-y-0.5 hover:shadow-[6px_6px_13px_var(--shadow-dark),-6px_-6px_13px_var(--shadow-light)]",
                  isPrimary
                    ? "hover:border-primary/25"
                    : "hover:border-accent-foreground/20",
                  // Active: Hiệu ứng nhấn phím lún sâu xuống
                  "active:translate-y-0 active:border-t-black/[0.07] active:border-l-black/[0.07] active:border-b-white/80 active:border-r-white/80",
                  "active:shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)]",
                  "dark:active:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.5),inset_-2px_-2px_5px_rgba(255,255,255,0.02)]",
                ].join(" ")}
              >
                {/* Hốc chứa Icon khắc chìm (Recessed Icon Socket) */}
                <div
                  className={[
                    "flex size-10 shrink-0 items-center justify-center rounded-[12px] transition-transform duration-200 group-hover:scale-105",
                    isPrimary
                      ? "bg-primary/[0.09] text-primary dark:bg-primary/[0.14]"
                      : "bg-accent text-accent-foreground dark:bg-accent/80",
                    "border-t border-l border-black/[0.06] border-b border-r border-white/85",
                    "dark:border-t-black/45 dark:border-b-white/[0.06]",
                    "shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]",
                    "dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.45)]",
                  ].join(" ")}
                >
                  <act.icon className="size-4.5" strokeWidth={2.2} />
                </div>

                {/* Nội dung chữ */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <p
                      className={[
                        "truncate text-xs font-extrabold tracking-tight text-foreground transition-colors sm:text-[13px]",
                        isPrimary
                          ? "group-hover:text-primary"
                          : "group-hover:text-accent-foreground",
                      ].join(" ")}
                    >
                      {act.title}
                    </p>

                    {/* Cụm số thứ tự + mũi tên tương tác */}
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="font-mono text-[9px] font-bold text-muted-foreground/50">
                        {act.code}
                      </span>
                      <ArrowUpRight
                        className={[
                          "size-3.5 text-muted-foreground/60 transition-all duration-200",
                          "group-hover:-translate-y-0.5 group-hover:translate-x-0.5",
                          isPrimary
                            ? "group-hover:text-primary"
                            : "group-hover:text-accent-foreground",
                        ].join(" ")}
                        strokeWidth={2.4}
                      />
                    </div>
                  </div>

                  <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                    {act.description}
                  </p>
                </div>
              </div>
            );

            if (act.href) {
              return (
                <Link key={index} href={act.href} className="block h-full">
                  {cardContent}
                </Link>
              );
            }

            return (
              <button
                key={index}
                type="button"
                onClick={act.onClick}
                className="block h-full w-full text-left"
              >
                {cardContent}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}