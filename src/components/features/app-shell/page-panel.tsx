"use client";

import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";

export interface PagePanelProps {
  children?: React.ReactNode;
  icon?: LucideIcon;
  title?: string;
  description?: string;
  badge?: string;
  className?: string;
  innerClassName?: string;
}

/**
 * Khung chứa nội dung chuẩn Neumorphism (2 lớp: nổi bên ngoài + chìm bên trong)
 * đồng bộ với khung chứa nội dung của trang /settings/security.
 */
export function PagePanel({
  children,
  icon: Icon,
  title,
  description,
  badge = "Milestone M2 Preview",
  className = "",
  innerClassName = "",
}: PagePanelProps) {
  return (
    <section
      className={`min-w-0 rounded-2xl border border-border/30 bg-background p-2.5 shadow-[6px_6px_15px_var(--shadow-dark),-6px_-6px_15px_var(--shadow-light)] sm:p-4 ${className}`}
    >
      <div
        className={`min-w-0 rounded-xl border border-border/20 bg-background p-4 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] sm:p-5 lg:p-6 ${innerClassName}`}
      >
        {children ? (
          children
        ) : (
          <div className="flex min-h-[480px] flex-col items-center justify-center p-6 text-center">
            {Icon && (
              <div className="mb-4 flex size-16 items-center justify-center rounded-2xl border border-primary/20 bg-background text-primary shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)]">
                <Icon className="size-8" strokeWidth={1.7} aria-hidden="true" />
              </div>
            )}

            {badge && (
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-background px-3 py-1 text-[11px] font-semibold text-primary shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                <Sparkles className="size-3" aria-hidden="true" />
                <span>{badge}</span>
              </div>
            )}

            {title && (
              <h3 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                {title}
              </h3>
            )}

            {description && (
              <p className="mt-2 max-w-lg text-xs leading-6 text-muted-foreground sm:text-sm">
                {description}
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <div className="rounded-xl border border-border/30 bg-background px-4 py-2.5 text-xs text-muted-foreground shadow-[3px_3px_8px_var(--shadow-dark),-3px_-3px_8px_var(--shadow-light)]">
                <span className="font-semibold text-foreground">Giao diện M2:</span> Cấu trúc khung Neumorphic 2 lớp hoàn tất
              </div>
              <div className="rounded-xl border border-border/30 bg-background px-4 py-2.5 text-xs text-muted-foreground shadow-[3px_3px_8px_var(--shadow-dark),-3px_-3px_8px_var(--shadow-light)]">
                <span className="font-semibold text-foreground">Giai đoạn M3:</span> Tích hợp dữ liệu thời gian thực và API
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
