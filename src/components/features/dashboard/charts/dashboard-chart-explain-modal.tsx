"use client";

import { useState, type ReactNode } from "react";
import { BookOpen, Info, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useLocale } from "@/providers/locale-provider";

export interface ChartExplainHighlight {
  label: string;
  value: string;
  tone?: "default" | "primary" | "warning" | "danger";
}

export interface ChartExplainContent {
  title: string;
  subtitle: string;
  summary: string;
  details: string[];
  meaning: string;
  highlights?: ChartExplainHighlight[];
}

export interface DashboardChartExplainButtonProps {
  content: ChartExplainContent;
  icon?: ReactNode;
  defaultOpen?: boolean;
}

const HIGHLIGHT_TONE: Record<
  NonNullable<ChartExplainHighlight["tone"]>,
  string
> = {
  default:
    "border-border/45 bg-background/75 text-foreground dark:border-white/[0.08] dark:bg-card/55",
  primary:
    "border-primary/30 bg-primary/[0.08] text-primary dark:border-primary/35 dark:bg-primary/15",
  warning:
    "border-warning/35 bg-warning/[0.09] text-warning dark:border-warning/35 dark:bg-warning/15",
  danger:
    "border-danger/35 bg-danger/[0.09] text-danger dark:border-danger/35 dark:bg-danger/15",
};

export function DashboardChartExplainButton({
  content,
  icon,
  defaultOpen = false,
}: DashboardChartExplainButtonProps) {
  const { locale } = useLocale();
  const isVi = locale === "vi-VN";
  const [open, setOpen] = useState(defaultOpen);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={
          isVi
            ? `Xem giải thích chi tiết: ${content.title}`
            : `View detailed explanation: ${content.title}`
        }
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-primary/25 bg-background/85 px-2.5 py-1.5 text-[11px] font-bold text-primary shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/45 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 dark:border-primary/30 dark:bg-card/70 dark:shadow-none dark:hover:bg-primary/15"
      >
        <Info className="size-3.5 shrink-0" />
        <span>{isVi ? "Giải thích" : "Explain"}</span>
      </button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={content.title}
        description={content.subtitle}
        icon={icon ?? <Sparkles className="size-5 text-primary" />}
        size="lg"
        className="max-w-[700px]"
        contentClassName="overflow-x-hidden px-5 py-4 sm:px-6 sm:py-5"
        footer={
          <div className="flex w-full justify-end">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setOpen(false)}
            >
              {isVi ? "Đã hiểu" : "Got it"}
            </Button>
          </div>
        }
      >
        <div className="min-w-0 space-y-4">
          {/* Quick Highlights */}
          {content.highlights && content.highlights.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {content.highlights.map((item) => (
                <div
                  key={item.label}
                  className={`min-w-0 rounded-2xl border px-3.5 py-3 ${HIGHLIGHT_TONE[item.tone ?? "default"]}`}
                >
                  <p className="truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-1 break-words text-sm font-black leading-snug tabular-nums">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Plain-Language Current Situation */}
          <div className="min-w-0 rounded-2xl border border-primary/20 bg-primary/[0.045] p-4 sm:p-5 dark:border-primary/25 dark:bg-primary/10">
            <div className="flex items-center gap-2">
              <Sparkles className="size-3.5 shrink-0 text-primary" />
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-primary">
                {isVi ? "Tình hình hiện tại" : "Current situation"}
              </p>
            </div>

            <p className="mt-2 break-words text-[13.5px] font-medium leading-relaxed text-foreground">
              {content.summary}
            </p>

            {content.details.length > 0 && (
              <ul className="mt-3 space-y-2 border-t border-primary/15 pt-3 text-[13px] leading-relaxed text-foreground/90">
                {content.details.map((line, idx) => (
                  <li key={idx} className="flex min-w-0 items-start gap-2.5">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                    <span className="min-w-0 flex-1 break-words">{line}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* What This Card Reflects */}
          <div className="min-w-0 rounded-2xl border border-border/40 bg-background/70 p-4 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] dark:border-white/[0.06] dark:bg-card/40 dark:shadow-none">
            <div className="flex items-center gap-2">
              <BookOpen className="size-3.5 shrink-0 text-muted-foreground" />
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                {isVi ? "Card này đang phản chiếu gì?" : "What does this card reflect?"}
              </p>
            </div>
            <p className="mt-1.5 break-words text-[13px] leading-relaxed text-muted-foreground">
              {content.meaning}
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}
