"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Users,
  UserCheck,
} from "lucide-react";
import { Typography } from "./typography";

// ============================================================
// TYPES
// ============================================================

export type StatsCardVariant =
  | "classic"
  | "soft-extruded"
  | "deep-elevation"
  | "bento-console";

export type StatsCardMode = "raised-inset" | "inset-raised";

export type StatsSurfaceEffect =
  | "raised"
  | "inset"
  | "raised-inset"
  | "inset-raised"
  | "flat";

export type StatsCardTone =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";

export type StatsCardProps = {
  title: string;
  value: React.ReactNode;
  icon?: LucideIcon;

  description?: string;
  trend?: {
    value: string;
    label?: string;
    direction?: "up" | "down" | "neutral";
    positive?: boolean;
  };

  footer?: React.ReactNode;
  progress?: number;
  progressLabel?: string;

  tone?: StatsCardTone;
  size?: "sm" | "md" | "lg" | "xl";

  variant?: "classic" | "soft-extruded" | "deep-elevation";

  /** Mixed effect for the icon surface */
  iconEffect?: StatsSurfaceEffect;

  /** Mixed effect for the inner detail surface */
  contentEffect?: StatsSurfaceEffect;

  /** Optional card border */
  border?: "none" | "subtle" | "accent" | "glow";

  /** Override accent with any valid CSS color */
  accentColor?: string;

  /** Optional independent icon color */
  iconColor?: string;

  /** Control the intensity of the 3D shadows */
  depth?: "soft" | "medium" | "deep";

  hover?: boolean;
  loading?: boolean;
  animate?: boolean;
  onClick?: () => void;

  className?: string;
  ariaLabel?: string;
};

// ============================================================
// DESIGN TOKENS & HELPERS
// ============================================================

const tones: Record<StatsCardTone, string> = {
  default: "var(--foreground)",
  primary: "var(--primary)",
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  info: "var(--info)",
};

const dimensions = {
  sm: {
    padding: "p-3.5",
    title: "text-xs",
    value: "text-2xl",
    icon: "size-10",
  },
  md: {
    padding: "p-5",
    title: "text-xs sm:text-sm",
    value: "text-3xl",
    icon: "size-12",
  },
  lg: {
    padding: "p-6",
    title: "text-sm",
    value: "text-4xl",
    icon: "size-14",
  },
  xl: {
    padding: "p-7",
    title: "text-base",
    value: "text-5xl",
    icon: "size-16",
  },
};

const depthValues = {
  soft: {
    raised: "4px 4px 8px",
    highlight: "-4px -4px 8px",
    inset: "inset 2px 2px 4px",
    insetHighlight: "inset -2px -2px 4px",
  },
  medium: {
    raised: "8px 8px 16px",
    highlight: "-8px -8px 16px",
    inset: "inset 4px 4px 8px",
    insetHighlight: "inset -4px -4px 8px",
  },
  deep: {
    raised: "12px 12px 24px",
    highlight: "-12px -12px 24px",
    inset: "inset 6px 6px 12px",
    insetHighlight: "inset -6px -6px 12px",
  },
};

function cn(...classes: Array<string | null | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

function makeRaisedShadow(depth: keyof typeof depthValues) {
  const d = depthValues[depth];
  return `${d.raised} var(--shadow-dark), ${d.highlight} var(--shadow-light)`;
}

function makeInsetShadow(depth: keyof typeof depthValues) {
  const d = depthValues[depth];
  return `${d.inset} var(--shadow-dark), ${d.insetHighlight} var(--shadow-light)`;
}

function makeMixedShadow(effect: StatsSurfaceEffect, depth: keyof typeof depthValues) {
  const raised = makeRaisedShadow(depth);
  const inset = makeInsetShadow(depth);

  switch (effect) {
    case "raised":
      return raised;
    case "inset":
      return inset;
    case "raised-inset":
      return `${raised}, ${makeInsetShadow("soft")}`;
    case "inset-raised":
      return `${inset}, ${makeRaisedShadow("soft")}`;
    case "flat":
      return "none";
  }
}

function makeOuterShadow(mode: StatsCardMode, depth: keyof typeof depthValues) {
  const raised = makeRaisedShadow(depth);
  const inset = makeInsetShadow("soft");

  if (mode === "raised-inset") {
    return `${raised}, ${inset}`;
  }
  return `${makeInsetShadow(depth)}, ${makeRaisedShadow("soft")}`;
}

function getTrendColor(trend: NonNullable<StatsCardProps["trend"]>) {
  if (trend.direction === "neutral") return "var(--muted-foreground)";
  if (trend.positive !== undefined) {
    return trend.positive ? "var(--success)" : "var(--danger)";
  }
  return trend.direction === "up" ? "var(--success)" : "var(--danger)";
}

// ============================================================
// 1. CLASSIC CARD (DÒNG 1)
// ============================================================

function ClassicStatsCard({
  mode = "raised-inset",
  title,
  value,
  icon: Icon,
  description,
  trend,
  footer,
  progress,
  progressLabel,
  tone = "default",
  size = "md",
  iconEffect = "raised-inset",
  contentEffect = "inset-raised",
  border = "subtle",
  accentColor,
  iconColor,
  depth = "medium",
  hover = true,
  loading = false,
  animate = true,
  onClick,
  className,
  ariaLabel,
}: StatsCardProps & { mode?: StatsCardMode }) {
  const accent = accentColor ?? tones[tone];
  const dimension = dimensions[size];
  const isClickable = Boolean(onClick);

  const safeProgress =
    typeof progress === "number"
      ? Math.max(0, Math.min(100, progress))
      : undefined;

  const rootStyle: React.CSSProperties = {
    background: "var(--background)",
    boxShadow: makeOuterShadow(mode, depth),
  };

  const iconStyle: React.CSSProperties = {
    background: "var(--background)",
    boxShadow: makeMixedShadow(iconEffect, depth),
    color: iconColor ?? accent,
  };

  const detailStyle: React.CSSProperties = {
    background: "var(--background)",
    boxShadow: makeMixedShadow(contentEffect, depth),
  };

  const borderClass = {
    none: "",
    subtle: "border border-border",
    accent: "border border-[var(--primary)]/30",
    glow: "border border-white/20 dark:border-white/10",
  }[border];

  const TrendIcon = trend
    ? {
        up: ArrowUpRight,
        down: ArrowDownRight,
        neutral: Minus,
      }[trend.direction ?? "neutral"]
    : TrendingUp;

  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className={cn("font-medium tracking-wide uppercase text-muted-foreground", dimension.title)}>
            {title}
          </p>
          <div
            className={cn("mt-2 font-bold tracking-tight tabular-nums break-words transition-colors duration-300", dimension.value)}
            style={{ color: accent }}
          >
            {value}
          </div>
        </div>

        {Icon && (
          <div
            className={cn(
              "relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl transition-[box-shadow,transform] duration-300",
              dimension.icon,
              hover && "group-hover:-translate-y-0.5",
            )}
            style={iconStyle}
          >
            {iconEffect !== "flat" && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-2 top-0 h-px"
                style={{ background: "var(--shadow-light)" }}
              />
            )}
            <Icon className="size-[45%]" strokeWidth={1.8} aria-hidden="true" />
          </div>
        )}
      </div>

      {trend && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-0.5 text-xs font-semibold" style={{ color: getTrendColor(trend) }}>
            <TrendIcon className="size-4" />
            {trend.value}
          </span>
          {trend.label && (
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              {trend.label}
            </span>
          )}
        </div>
      )}

      {description && (
        <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
          {description}
        </p>
      )}

      {safeProgress !== undefined && (
        <div className="mt-5 rounded-2xl p-3.5" style={detailStyle}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
              {progressLabel ?? "Tiến độ"}
            </span>
            <span className="text-xs font-bold tabular-nums" style={{ color: accent }}>
              {safeProgress}%
            </span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full"
            style={{
              background: "var(--background)",
              boxShadow: makeInsetShadow("soft"),
            }}
          >
            <div
              className={cn("h-full rounded-full transition-all duration-700 ease-out", animate && "animate-in")}
              style={{
                width: `${safeProgress}%`,
                background: accent,
              }}
            />
          </div>
        </div>
      )}

      {footer && <div className="mt-4 pt-3 border-t border-border/50 text-xs">{footer}</div>}
    </>
  );

  const rootClass = cn(
    "group relative isolate overflow-hidden rounded-2xl transition-[box-shadow,transform] duration-300",
    dimension.padding,
    borderClass,
    hover && "hover:-translate-y-1 hover:shadow-lg",
    isClickable && "cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
    className,
  );

  if (isClickable) {
    return (
      <button type="button" onClick={onClick} aria-label={ariaLabel} aria-busy={loading} className={cn(rootClass, "block w-full")} style={rootStyle}>
        {content}
      </button>
    );
  }

  return (
    <article aria-label={ariaLabel} aria-busy={loading} className={rootClass} style={rootStyle}>
      {content}
    </article>
  );
}

// ============================================================
// 2. SOFT EXTRUDED 3D (DÒNG 2)
// ============================================================

export function SoftExtrudedStatsCard({
  title,
  value,
  icon: Icon,
  description,
  progress,
  progressLabel,
  tone = "primary",
  loading = false,
  className = "",
  footer,
  onClick,
}: StatsCardProps) {
  const accent = tones[tone];
  const safeProgress = typeof progress === "number" ? Math.max(0, Math.min(100, progress)) : undefined;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-[24px] border border-white/60 bg-background p-5",
        "shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)]",
        "transition-all duration-300 hover:-translate-y-1 hover:shadow-[10px_14px_24px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light)]",
        "dark:border-white/10",
        onClick && "cursor-pointer",
        className,
      )}
    >
      {/* Specular top highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/20"
      />
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl transition-colors opacity-60"
        style={{ backgroundColor: accent }}
      />

      <div className="relative flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {title}
          </span>
          <p className="mt-1 text-3xl font-extrabold tracking-tight text-foreground font-mono">
            {loading ? "..." : value}
          </p>
        </div>

        {Icon && (
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/50 bg-background shadow-[4px_4px_8px_var(--shadow-dark),-4px_-4px_8px_var(--shadow-light)] transition-transform duration-300 group-hover:scale-105 dark:border-white/10"
            style={{ color: accent }}
          >
            <Icon className="h-5 w-5" strokeWidth={2} />
          </div>
        )}
      </div>

      {/* Inset Tray bottom */}
      {safeProgress !== undefined ? (
        <div className="mt-4 rounded-xl border border-[var(--shadow-dark)]/20 bg-background/60 p-2.5 shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
            <span className="text-[11px] text-muted-foreground font-medium">
              {progressLabel ?? "Tiến độ"}
            </span>
            <span className="text-[11px] font-bold" style={{ color: accent }}>
              {safeProgress}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-background shadow-[inset_1px_1px_2px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${safeProgress}%`, backgroundColor: accent }}
            />
          </div>
        </div>
      ) : description || footer ? (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-[var(--shadow-dark)]/20 bg-background/60 px-3 py-2 shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
          <span className="truncate text-xs text-muted-foreground font-medium">
            {description}
          </span>
          {footer && <div className="shrink-0">{footer}</div>}
        </div>
      ) : null}
    </div>
  );
}

// ============================================================
// 3. DEEP ELEVATION 3D (DÒNG 3)
// ============================================================

export function DeepElevationStatsCard({
  title,
  value,
  icon: Icon,
  description,
  progress,
  progressLabel,
  tone = "primary",
  loading = false,
  className = "",
  footer,
  onClick,
}: StatsCardProps) {
  const accent = tones[tone];
  const safeProgress = typeof progress === "number" ? Math.max(0, Math.min(100, progress)) : undefined;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-[26px] border border-white/80 bg-background p-6",
        "shadow-[10px_10px_22px_var(--shadow-dark),-10px_-10px_22px_var(--shadow-light),inset_1px_1px_2px_rgba(255,255,255,0.9),inset_-1px_-1px_2px_var(--shadow-dark)]",
        "transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[14px_16px_30px_var(--shadow-dark),-14px_-14px_30px_var(--shadow-light)]",
        "dark:border-white/15 dark:shadow-[10px_10px_24px_rgba(0,0,0,0.5),-8px_-8px_20px_rgba(255,255,255,0.05),inset_1px_1px_2px_rgba(255,255,255,0.12)]",
        onClick && "cursor-pointer",
        className,
      )}
    >
      {/* Double specular rim */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent dark:via-white/30"
      />
      {/* Corner flare */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl transition-colors opacity-70"
        style={{ backgroundColor: accent }}
      />

      <div className="relative flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground/90">
          {title}
        </span>

        {Icon && (
          <div
            className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-background shadow-[5px_5px_11px_var(--shadow-dark),-5px_-5px_11px_var(--shadow-light),inset_1px_1px_1px_rgba(255,255,255,0.8)] transition-transform duration-300 group-hover:scale-110 dark:border-white/15"
            style={{ color: accent }}
          >
            <Icon className="h-6 w-6" strokeWidth={2.2} />
          </div>
        )}
      </div>

      {/* Chữ nổi với Typography variant="embossed" */}
      <div className="my-3">
        <Typography
          variant="embossed"
          as="div"
          className="text-4xl sm:text-5xl font-black tracking-tight !text-foreground font-mono"
        >
          {loading ? "..." : value}
        </Typography>
      </div>

      {/* Deep Inset Bottom Tray */}
      {safeProgress !== undefined ? (
        <div className="mt-4 rounded-2xl border border-[var(--shadow-dark)]/25 bg-background/70 p-3 shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)]">
          <div className="mb-2 flex items-center justify-between text-xs font-bold">
            <span className="text-muted-foreground">{progressLabel ?? "Tiến độ"}</span>
            <span className="font-extrabold" style={{ color: accent }}>
              {safeProgress}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-background shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${safeProgress}%`,
                background: `linear-gradient(to right, ${accent}, var(--info))`,
              }}
            />
          </div>
        </div>
      ) : description || footer ? (
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-[var(--shadow-dark)]/25 bg-background/70 px-3.5 py-2.5 shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)]">
          <span className="truncate text-xs font-semibold text-muted-foreground">
            {description}
          </span>
          {footer && <div className="shrink-0">{footer}</div>}
        </div>
      ) : null}
    </div>
  );
}

// ============================================================
// 4. BENTO CONSOLE ASYMMETRIC (DÒNG 4)
// ============================================================

export interface BentoConsoleStatsProps {
  scale: {
    title?: string;
    totalValue: React.ReactNode;
    totalLabel?: string;
    totalSub?: string;
    activeValue: React.ReactNode;
    activeLabel?: string;
    activeSub?: string;
    activeRate?: number;
    badgeText?: string;
    availabilityLabel?: string;
    availabilityText?: string;
  };
  security: {
    title?: string;
    badgeText?: string;
    percent: number;
    currentValue: React.ReactNode;
    totalValue: React.ReactNode;
    totalStaffLabel?: string;
    description?: string;
    statusLabel?: string;
    statusText?: string;
  };
  sentinel: {
    title?: string;
    count: number;
    label?: string;
    description?: string;
    statusText?: string;
    isWarning?: boolean;
  };
  loading?: boolean;
  className?: string;
}

export function BentoConsoleStats({
  scale,
  security,
  sentinel,
  loading = false,
  className = "",
}: BentoConsoleStatsProps) {
  const activePercent = scale.activeRate ?? 100;
  const isSecurityGood = security.percent >= 60;
  const hasWarning = sentinel.isWarning ?? sentinel.count > 0;

  return (
    <div className={className}>
      {/* MOBILE COMPACT 2x2 STATS (< md: Phone Screens) */}
      <div className="grid grid-cols-2 gap-2.5 md:hidden">
        {/* 1. Tổng người dùng */}
        <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-background p-3 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] dark:border-white/10 flex flex-col justify-between">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/20"
          />
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
              {scale.totalLabel ?? "Tổng người dùng"}
            </span>
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-background shadow-[inset_1px_1px_2px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)] text-primary border border-white/30 dark:border-white/10">
              <Users className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-1">
            <Typography
              variant="embossed"
              as="div"
              className="text-2xl font-black font-mono tracking-tight text-foreground"
            >
              {loading ? "..." : scale.totalValue}
            </Typography>
            <p className="text-[10px] text-muted-foreground/80 font-medium truncate mt-0.5">
              {scale.totalSub ?? "Toàn hệ thống"}
            </p>
          </div>
        </div>

        {/* 2. Đang hoạt động */}
        <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-background p-3 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] dark:border-white/10 flex flex-col justify-between">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/20"
          />
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
              {scale.activeLabel ?? "Đang hoạt động"}
            </span>
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-background shadow-[inset_1px_1px_2px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)] text-primary border border-white/30 dark:border-white/10">
              <UserCheck className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-1">
            <div className="flex items-baseline gap-1.5">
              <Typography
                variant="embossed"
                as="div"
                className="text-2xl font-black font-mono tracking-tight !text-primary"
              >
                {loading ? "..." : scale.activeValue}
              </Typography>
              <span className="text-[10px] font-extrabold text-primary">
                {activePercent}%
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-background shadow-[inset_1px_1px_2px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)] flex">
              <div
                className="h-full rounded-full bg-primary shadow-[0_0_4px_var(--primary)] transition-all duration-700"
                style={{ width: `${activePercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* 3. Bảo mật 2FA */}
        <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-background p-3 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] dark:border-white/10 flex flex-col justify-between">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/20"
          />
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
              {security.badgeText ?? security.title ?? "Bảo mật 2FA"}
            </span>
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-background shadow-[inset_1px_1px_2px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)] text-primary border border-white/30 dark:border-white/10">
              <ShieldCheck className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-1">
            <div className="flex items-baseline gap-1.5">
              <Typography
                variant="embossed"
                as="div"
                className="text-2xl font-black font-mono tracking-tight text-foreground"
              >
                {security.percent}%
              </Typography>
              <span className="text-[10px] font-medium text-muted-foreground truncate">
                {loading ? "..." : `${security.currentValue}/${security.totalValue}`}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-background shadow-[inset_1px_1px_2px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)] flex">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-[var(--accent)] transition-all duration-700"
                style={{ width: `${security.percent}%` }}
              />
            </div>
          </div>
        </div>

        {/* 4. Tạm khóa / Cảnh báo */}
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border bg-background p-3 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] flex flex-col justify-between",
            hasWarning
              ? "border-accent/40 bg-accent/[0.04]"
              : "border-white/70 dark:border-white/10"
          )}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/20"
          />
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
              {sentinel.label ?? "Tạm khóa"}
            </span>
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-background shadow-[inset_1px_1px_2px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)] border border-white/30 dark:border-white/10">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  hasWarning ? "bg-accent animate-ping" : "bg-primary"
                )}
              />
            </div>
          </div>
          <div className="mt-1">
            <div className="flex items-baseline gap-1.5">
              <Typography
                variant="embossed"
                as="div"
                className={cn(
                  "text-2xl font-black font-mono tracking-tight",
                  hasWarning ? "!text-accent" : "!text-foreground"
                )}
              >
                {loading ? "..." : sentinel.count}
              </Typography>
              <span
                className={cn(
                  "text-[9px] font-bold px-1.5 py-0.5 rounded-md",
                  hasWarning
                    ? "bg-accent/15 text-accent"
                    : "bg-primary/10 text-primary"
                )}
              >
                {sentinel.statusText ?? (hasWarning ? "Cần xử lý" : "An toàn")}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground/80 font-medium truncate mt-0.5">
              {hasWarning ? (sentinel.description ?? "Cần kiểm tra") : "Không có vi phạm"}
            </p>
          </div>
        </div>
      </div>

      {/* DESKTOP & TABLET BENTO CONSOLE (>= md) */}
      <div className="hidden md:grid md:grid-cols-12 md:gap-4 lg:gap-5">
        {/* KHỐI 1 (5 CỘT): TRUNG TÂM CHỈ HUY QUY MÔ & TỶ LỆ HOẠT ĐỘNG */}
        <div className="relative group overflow-hidden rounded-[28px] border border-white/80 bg-background p-6 shadow-[10px_10px_22px_var(--shadow-dark),-10px_-10px_22px_var(--shadow-light),inset_1px_1px_2px_rgba(255,255,255,0.9),inset_-1px_-1px_2px_var(--shadow-dark)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[14px_16px_30px_var(--shadow-dark),-14px_-14px_30px_var(--shadow-light)] dark:border-white/15 dark:shadow-[10px_10px_24px_rgba(0,0,0,0.5),-8px_-8px_20px_rgba(255,255,255,0.05),inset_1px_1px_2px_rgba(255,255,255,0.12)] md:col-span-12 lg:col-span-5 flex flex-col justify-between">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent dark:via-white/30"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-12 -top-12 h-36 w-36 rounded-full bg-primary/10 blur-3xl"
        />

        <div>
          <div className="flex items-center justify-between pb-4">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              {scale.title ?? "Quy mô nhân sự & Trạng thái hoạt động"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-background px-2.5 py-0.5 text-[10px] font-bold text-foreground shadow-[inset_1px_1px_2px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)]">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {scale.badgeText ?? "Directory Pulse"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 items-center py-2">
            <div className="space-y-1">
              <span className="text-xs font-bold text-muted-foreground block">
                {scale.totalLabel ?? "Tổng nhân sự"}
              </span>
              <Typography
                variant="embossed"
                as="div"
                className="text-4xl lg:text-5xl font-black tracking-tight !text-foreground font-mono"
              >
                {loading ? "..." : scale.totalValue}
              </Typography>
              <p className="text-[11px] text-muted-foreground/80 font-medium">
                {scale.totalSub ?? "Tài khoản toàn công ty"}
              </p>
            </div>

            <div className="space-y-1 border-l border-[var(--shadow-dark)]/20 pl-4 dark:border-white/10">
              <span className="text-xs font-bold text-muted-foreground block">
                {scale.activeLabel ?? "Đang hoạt động"}
              </span>
              <Typography
                variant="embossed"
                as="div"
                className="text-4xl lg:text-5xl font-black tracking-tight !text-primary font-mono"
              >
                {loading ? "..." : scale.activeValue}
              </Typography>
              <p className="text-[11px] text-muted-foreground/80 font-medium">
                {scale.activeSub ?? "Sẵn sàng đăng nhập"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-2 pt-3 border-t border-[var(--shadow-dark)]/20 dark:border-white/10">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-muted-foreground">
              {scale.availabilityLabel ?? "Tỷ lệ khả dụng hệ thống"}
            </span>
            <span className="font-extrabold text-foreground">
              {scale.availabilityText ?? `${activePercent}% sẵn sàng`}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-background p-0.5 shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] flex gap-1">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-[var(--accent)] shadow-[0_0_8px_var(--primary)] transition-all duration-700"
              style={{ width: `${activePercent}%` }}
            />
            {hasWarning && (
              <div
                className="h-full rounded-full bg-accent/60 transition-all duration-700"
                style={{ width: `${Math.max(5, 100 - activePercent)}%` }}
              />
            )}
          </div>
        </div>
      </div>

      {/* KHỐI 2 (4 CỘT): ĐỒNG HỒ TRẮC SINH BẢO MẬT 2FA (CIRCULAR DIAL) */}
      <div className="relative group overflow-hidden rounded-[28px] border border-white/80 bg-background p-6 shadow-[10px_10px_22px_var(--shadow-dark),-10px_-10px_22px_var(--shadow-light),inset_1px_1px_2px_rgba(255,255,255,0.9),inset_-1px_-1px_2px_var(--shadow-dark)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[14px_16px_30px_var(--shadow-dark),-14px_-14px_30px_var(--shadow-light)] dark:border-white/15 dark:shadow-[10px_10px_24px_rgba(0,0,0,0.5),-8px_-8px_20px_rgba(255,255,255,0.05),inset_1px_1px_2px_rgba(255,255,255,0.12)] md:col-span-6 lg:col-span-4 flex flex-col justify-between">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent dark:via-white/30"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl"
        />

        <div>
          <div className="flex items-center justify-between pb-3">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              {security.title ?? "Bảo mật xác thực hai bước"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              {security.badgeText ?? "TOTP 2FA"}
            </span>
          </div>

          <div className="flex items-center gap-5 py-2">
            <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-background shadow-[5px_5px_11px_var(--shadow-dark),-5px_-5px_11px_var(--shadow-light)] p-2 border border-white/50 dark:border-white/10">
              <div className="absolute inset-2.5 rounded-full bg-background shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]" />
              <svg className="relative h-20 w-20 -rotate-90 transform" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                  className="text-[var(--shadow-dark)]/40 dark:text-white/5"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="url(#dialGradient)"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={201}
                  strokeDashoffset={201 - (201 * security.percent) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="dialGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--primary)" />
                    <stop offset="100%" stopColor="var(--accent)" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-base font-black tracking-tight text-foreground font-mono">
                  {security.percent}%
                </span>
              </div>
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-foreground font-mono">
                  {loading ? "..." : security.currentValue}
                </span>
                <span className="text-xs text-muted-foreground font-bold">
                  {security.totalStaffLabel ?? `/ ${security.totalValue} nhân viên`}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground font-medium">
                {security.description ?? "Tài khoản kích hoạt mã bảo vệ Google Authenticator."}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl border border-[var(--shadow-dark)]/25 bg-background/70 px-3.5 py-2.5 shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)]">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            {security.statusLabel ?? "Độ phủ an ninh"}
          </span>
          <span className="text-xs font-bold text-foreground">
            {security.statusText ?? (isSecurityGood ? "Mức độ: Rất tốt" : "Mức độ: Cần tăng cường")}
          </span>
        </div>
      </div>

      {/* KHỐI 3 (3 CỘT): ĐÈN HẢI ĐĂNG BÁO NGUY HIỂM & KHÓA (SENTINEL BEACON) */}
      <div className="relative group overflow-hidden rounded-[28px] border border-white/80 bg-background p-6 shadow-[10px_10px_22px_var(--shadow-dark),-10px_-10px_22px_var(--shadow-light),inset_1px_1px_2px_rgba(255,255,255,0.9),inset_-1px_-1px_2px_var(--shadow-dark)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[14px_16px_30px_var(--shadow-dark),-14px_-14px_30px_var(--shadow-light)] dark:border-white/15 dark:shadow-[10px_10px_24px_rgba(0,0,0,0.5),-8px_-8px_20px_rgba(255,255,255,0.05),inset_1px_1px_2px_rgba(255,255,255,0.12)] md:col-span-6 lg:col-span-3 flex flex-col justify-between">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent dark:via-white/30"
        />
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute -right-10 -bottom-10 h-32 w-32 rounded-full blur-3xl transition-colors",
            hasWarning ? "bg-accent/20" : "bg-primary/10",
          )}
        />

        <div>
          <div className="flex items-center justify-between pb-3">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              {sentinel.title ?? "An ninh & Truy cập"}
            </span>

            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] border border-white/40 dark:border-white/10">
              <span
                className={cn(
                  "h-3 w-3 rounded-full transition-all",
                  hasWarning
                    ? "bg-accent shadow-[0_0_10px_var(--accent)] animate-ping"
                    : "bg-primary shadow-[0_0_8px_var(--primary)]",
                )}
              />
            </div>
          </div>

          <div className="py-2 space-y-1">
            <span className="text-xs font-bold text-muted-foreground block">
              {sentinel.label ?? (hasWarning ? "Tài khoản bị khóa" : "Tài khoản ngưng hoạt động")}
            </span>
            <Typography
              variant="embossed"
              as="div"
              className={cn(
                "text-4xl lg:text-5xl font-black tracking-tight font-mono",
                hasWarning ? "!text-accent" : "!text-foreground",
              )}
            >
              {loading ? "..." : sentinel.count}
            </Typography>
            <p className="text-xs text-muted-foreground/90 font-medium pt-1">
              {sentinel.description ?? (hasWarning
                ? "Nhập sai mật khẩu hoặc bị vô hiệu hóa"
                : "Không có xung đột truy cập trái phép")}
            </p>
          </div>
        </div>

        <div
          className={cn(
            "mt-4 flex items-center justify-between rounded-2xl border px-3.5 py-2.5 shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)]",
            hasWarning
              ? "border-accent/40 bg-accent/10 text-accent"
              : "border-[var(--shadow-dark)]/25 bg-background/70 text-foreground",
          )}
        >
          <span className="text-xs font-bold truncate">
            {sentinel.statusText ?? (hasWarning ? "Cần quản trị xử lý" : "Hệ thống an toàn")}
          </span>
          {hasWarning ? (
            <AlertTriangle className="h-4 w-4 shrink-0 text-accent" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
          )}
        </div>
      </div>
    </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT & EXPORTS
// ============================================================

export function StatsCard(props: StatsCardProps) {
  const { variant = "soft-extruded", ...rest } = props;

  switch (variant) {
    case "classic":
      return <ClassicStatsCard {...rest} />;
    case "deep-elevation":
      return <DeepElevationStatsCard {...rest} />;
    case "soft-extruded":
    default:
      return <SoftExtrudedStatsCard {...rest} />;
  }
}

export function RaisedInsetStatsCard(props: StatsCardProps) {
  return <ClassicStatsCard {...props} mode="raised-inset" />;
}

export function InsetRaisedStatsCard(props: StatsCardProps) {
  return <ClassicStatsCard {...props} mode="inset-raised" />;
}
