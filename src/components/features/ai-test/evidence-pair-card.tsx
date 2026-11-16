"use client";

import { Clock, Expand, Film, Play, Radio, User } from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import { formatTimeSec, normalizeViolationType } from "./ai-test-utils";
import type { EvidenceItem } from "@/types/ai-test.types";

export interface EvidencePairCardProps {
  item: EvidenceItem;
  onInspect: (item: EvidenceItem) => void;
  onSeekToTime?: (timeSec: number) => void;
  compact?: boolean;
}

const VIOLATION_META: Record<
  string,
  { short: string; titleKey: string; useAccent: boolean }
> = {
  NO_HELMET: {
    short: "NO_HELMET",
    titleKey: "aiTest.violations.short.NO_HELMET",
    useAccent: true,
  },
  RESTRICTED_AREA: {
    short: "RESTRICTED",
    titleKey: "aiTest.violations.short.RESTRICTED_AREA",
    useAccent: true,
  },
  NO_VEST: {
    short: "NO_VEST",
    titleKey: "aiTest.violations.short.NO_VEST",
    useAccent: false,
  },
};

export function EvidencePairCard({
  item,
  onInspect,
  onSeekToTime,
  compact = false,
}: EvidencePairCardProps) {
  const { t } = useLocale();
  const isPair = Boolean(item.beforeUrl && item.afterUrl);
  const normType = normalizeViolationType(item.type);
  const metaConfig = VIOLATION_META[normType];
  const meta = metaConfig
    ? {
        short: metaConfig.short,
        title: t(metaConfig.titleKey),
        useAccent: metaConfig.useAccent,
      }
    : {
        short: normType || "VIOLATION",
        title: item.type,
        useAccent: false,
      };

  const shortSourceId =
    item.sourceId.length > 10 ? `${item.sourceId.slice(0, 8)}…` : item.sourceId;

  return (
    <article
      className={`group flex flex-col justify-between gap-3 rounded-2xl bg-background border border-white/45 dark:border-white/[0.05] shadow-[6px_6px_12px_rgba(0,0,0,0.09),-6px_-6px_12px_rgba(255,255,255,0.75)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.45),-5px_-5px_10px_rgba(255,255,255,0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[9px_9px_18px_rgba(0,0,0,0.12),-9px_-9px_18px_rgba(255,255,255,0.8)] ${
        compact ? "p-3" : "p-4"
      }`}
    >
      {/* Header gọn 1 hàng: Loại vi phạm + Track bên trái, Nguồn bên phải */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            title={meta.title}
            className={`inline-flex shrink-0 items-center rounded-lg px-2 py-0.5 font-mono text-[10px] font-extrabold tracking-wide ${
              meta.useAccent
                ? "bg-accent/15 text-accent"
                : "bg-primary/15 text-primary"
            }`}
          >
            {meta.short}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-background px-2 py-0.5 font-mono text-[11px] font-bold text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.09),inset_-2px_-2px_4px_rgba(255,255,255,0.65)] dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)]">
            <User className="size-3 text-muted-foreground" />#{item.trackId}
          </span>
        </div>

        <span
          title={
            item.source === "live"
              ? t("aiTest.card.liveSourceTitle", { id: item.sourceId })
              : t("aiTest.card.jobSourceTitle", { id: item.sourceId })
          }
          className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-0.5 font-mono text-[10px] font-bold ${
            item.source === "live"
              ? "bg-accent/10 text-accent"
              : "bg-primary/10 text-primary"
          }`}
        >
          {item.source === "live" ? (
            <Radio className="size-2.5" />
          ) : (
            <Film className="size-2.5" />
          )}
          <span>{item.source === "live" ? "LIVE" : "JOB"}</span>
          {!compact && shortSourceId && (
            <span className="hidden opacity-75 sm:inline">· {shortSourceId}</span>
          )}
        </span>
      </div>

      {/* Tên mô tả vi phạm rõ ràng ở chế độ đầy đủ */}
      {!compact && (
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="truncate font-semibold text-foreground">
            {meta.title}
          </span>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              isPair
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {isPair ? t("aiTest.card.pairBadge") : t("aiTest.card.singleBadge")}
          </span>
        </div>
      )}

      {/* Khay hiển thị ảnh khoét lõm tỉ lệ đồng đều */}
      <button
        type="button"
        onClick={() => onInspect(item)}
        className="relative w-full overflow-hidden rounded-xl bg-background/80 p-1.5 text-left shadow-[inset_4px_4px_8px_rgba(0,0,0,0.11),inset_-4px_-4px_8px_rgba(255,255,255,0.7)] dark:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.55)] border border-black/[0.04] dark:border-white/[0.03] focus-visible:outline-2 focus-visible:outline-primary cursor-pointer"
      >
        {isPair ? (
          <div className="grid grid-cols-2 gap-1.5">
            <div className="relative overflow-hidden rounded-lg bg-black/5 dark:bg-black/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.beforeUrl!}
                alt={`Before Track #${item.trackId}`}
                className={`w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] ${
                  compact ? "h-24" : "aspect-[4/3]"
                }`}
                loading="lazy"
              />
              <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-md bg-background/85 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-foreground backdrop-blur-sm">
                {t("aiTest.card.before")}
              </span>
            </div>

            <div className="relative overflow-hidden rounded-lg bg-black/5 dark:bg-black/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.afterUrl!}
                alt={`After Track #${item.trackId}`}
                className={`w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] ${
                  compact ? "h-24" : "aspect-[4/3]"
                }`}
                loading="lazy"
              />
              <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-md bg-accent px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-accent-foreground shadow-sm">
                {t("aiTest.card.after")}
              </span>
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-lg bg-black/5 dark:bg-black/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.primaryUrl}
              alt={`${item.type} Track #${item.trackId}`}
              className={`w-full object-cover transition-transform duration-300 group-hover:scale-[1.02] ${
                compact ? "h-24" : "aspect-[8/3]"
              }`}
              loading="lazy"
            />
            <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-md bg-primary/90 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm">
              {t("aiTest.card.snapshot")}
            </span>
          </div>
        )}

        {/* Cue phóng to khi hover */}
        <span className="pointer-events-none absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-lg bg-background/85 px-2 py-1 text-[10px] font-semibold text-foreground opacity-0 shadow-sm backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
          <Expand className="size-3 text-primary" />
          {t("aiTest.card.compare")}
        </span>
      </button>

      {/* Footer: Thời gian / Frame bên trái, Nút thao tác bên phải */}
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
          {typeof item.timeSec === "number" && (
            <span className="inline-flex items-center gap-1 font-semibold text-foreground">
              <Clock className="size-3 text-primary" />
              {formatTimeSec(item.timeSec)}
            </span>
          )}
          {typeof item.frameIdx === "number" && (
            <span className="rounded bg-background px-1.5 py-0.5 text-[10px] shadow-[inset_1px_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[inset_1px_1px_3px_rgba(0,0,0,0.4)]">
              F#{item.frameIdx}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {item.source === "job" &&
            typeof item.timeSec === "number" &&
            onSeekToTime && (
              <button
                type="button"
                onClick={() => onSeekToTime(item.timeSec!)}
                title={t("aiTest.card.seekTitle")}
                className="inline-flex h-7 items-center gap-1 rounded-lg bg-background px-2 text-[11px] font-semibold text-primary shadow-[3px_3px_6px_rgba(0,0,0,0.09),-3px_-3px_6px_rgba(255,255,255,0.75)] dark:shadow-[3px_3px_6px_rgba(0,0,0,0.45)] hover:text-accent active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.12)] border border-white/50 dark:border-white/[0.05] transition-all cursor-pointer"
              >
                <Play className="size-3" />
                {!compact && <span>{t("aiTest.card.seek")}</span>}
              </button>
            )}
          <button
            type="button"
            onClick={() => onInspect(item)}
            title={t("aiTest.card.inspectTitle")}
            className="inline-flex h-7 items-center gap-1 rounded-lg bg-background px-2 text-[11px] font-semibold text-foreground shadow-[3px_3px_6px_rgba(0,0,0,0.09),-3px_-3px_6px_rgba(255,255,255,0.75)] dark:shadow-[3px_3px_6px_rgba(0,0,0,0.45)] hover:text-primary active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.12)] border border-white/50 dark:border-white/[0.05] transition-all cursor-pointer"
          >
            <Expand className="size-3" />
            {!compact && <span>{t("aiTest.card.view")}</span>}
          </button>
        </div>
      </div>
    </article>
  );
}
