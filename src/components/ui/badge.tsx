
"use client";

import {
  type ReactNode,
  type CSSProperties,
  type MouseEventHandler,
} from "react";
import {
  Check,
  X,
  AlertCircle,
  Info,
  CircleCheck,
  LoaderCircle,
} from "lucide-react";

export type BadgeVariant =
  | "default"
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "outline";

export type BadgeSize = "sm" | "md" | "lg";
export type BadgeShape = "pill" | "rounded";
export type BadgeIndicator = "none" | "dot" | "icon";

export interface BadgeProps {
  children?: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  shape?: BadgeShape;
  indicator?: BadgeIndicator;
  icon?: ReactNode;
  count?: number;
  maxCount?: number;
  loading?: boolean;
  disabled?: boolean;
  removable?: boolean;
  onRemove?: () => void;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  className?: string;
  title?: string;
  "aria-label"?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: [
    "border-border/70",
    "bg-card text-foreground",
    "shadow-[inset_1px_1px_1px_var(--shadow-light),inset_-1px_-1px_2px_var(--shadow-dark),0_2px_5px_rgb(0_0_0/0.04)]",
  ].join(" "),

  primary: [
    "border-primary/25",
    "bg-primary/10 text-primary",
    "shadow-[inset_1px_1px_1px_var(--shadow-light),inset_-1px_-1px_1px_var(--shadow-dark),0_2px_6px_rgb(0_0_0/0.04)]",
  ].join(" "),

  secondary: [
    "border-secondary",
    "bg-secondary text-secondary-foreground",
    "shadow-[inset_1px_1px_1px_var(--shadow-light),inset_-1px_-1px_1px_var(--shadow-dark),0_2px_5px_rgb(0_0_0/0.04)]",
  ].join(" "),

  success: [
    "border-success/25",
    "bg-success/10 text-success",
    "shadow-[inset_1px_1px_1px_var(--shadow-light),inset_-1px_-1px_1px_var(--shadow-dark),0_2px_6px_rgb(0_0_0/0.04)]",
  ].join(" "),

  warning: [
    "border-warning/30",
    "bg-warning/10 text-warning",
    "shadow-[inset_1px_1px_1px_var(--shadow-light),inset_-1px_-1px_1px_var(--shadow-dark),0_2px_6px_rgb(0_0_0/0.04)]",
  ].join(" "),

  danger: [
    "border-danger/25",
    "bg-danger/10 text-danger",
    "shadow-[inset_1px_1px_1px_var(--shadow-light),inset_-1px_-1px_1px_var(--shadow-dark),0_2px_6px_rgb(0_0_0/0.04)]",
  ].join(" "),

  info: [
    "border-info/25",
    "bg-info/10 text-info",
    "shadow-[inset_1px_1px_1px_var(--shadow-light),inset_-1px_-1px_1px_var(--shadow-dark),0_2px_6px_rgb(0_0_0/0.04)]",
  ].join(" "),

  outline: [
    "border-border bg-transparent text-foreground",
    "shadow-[inset_1px_1px_2px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)]",
  ].join(" "),
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: "min-h-5 gap-1 px-2 py-0.5 text-[10px] tracking-[0.025em]",
  md: "min-h-6 gap-1.5 px-2.5 py-1 text-[11px] tracking-[0.035em]",
  lg: "min-h-8 gap-2 px-3 py-1.5 text-xs tracking-[0.025em]",
};

const iconSizes: Record<BadgeSize, string> = {
  sm: "[&_svg]:size-3",
  md: "[&_svg]:size-3.5",
  lg: "[&_svg]:size-4",
};

const defaultIndicators: Partial<Record<BadgeVariant, ReactNode>> = {
  success: <CircleCheck aria-hidden="true" />,
  warning: <AlertCircle aria-hidden="true" />,
  danger: <AlertCircle aria-hidden="true" />,
  info: <Info aria-hidden="true" />,
};

export function Badge({
  children,
  variant = "default",
  size = "md",
  shape = "pill",
  indicator = "none",
  icon,
  count,
  maxCount = 99,
  loading = false,
  disabled = false,
  removable = false,
  onRemove,
  onClick,
  className = "",
  title,
  "aria-label": ariaLabel,
}: BadgeProps) {
  const interactive = Boolean(onClick);
  const inactive = disabled || loading;
  const canRemove = removable && Boolean(onRemove) && !disabled;

  const hasCount = typeof count === "number" && Number.isFinite(count);
  const countLabel = hasCount
    ? count > maxCount
      ? `${maxCount}+`
      : String(Math.max(0, count))
    : null;

  const hasChildren =
    children !== null &&
    children !== undefined &&
    children !== false &&
    children !== "";

  const content = hasChildren ? children : null;
  const displayIcon =
    icon ??
    (indicator === "icon" ? defaultIndicators[variant] : undefined);

  const showDot = indicator === "dot";
  const isEmpty =
    !content && !displayIcon && !showDot && countLabel === null && !loading;

  if (isEmpty) return null;

  const rootClasses = [
    "group/badge relative inline-flex w-fit max-w-full shrink-0",
    "items-center align-middle",
    "border",
    "transition-[box-shadow,transform,opacity,border-color]",
    "duration-200 ease-out",
    "motion-reduce:transition-none",
    shape === "pill" ? "rounded-full" : "rounded-xl",
    variantClasses[variant],
    sizeClasses[size],
    iconSizes[size],
    interactive && !inactive
      ? "cursor-pointer hover:-translate-y-px hover:shadow-[var(--nm-btn-hover)] active:translate-y-0 active:shadow-[var(--nm-btn-pressed)]"
      : "",
    inactive ? "cursor-not-allowed opacity-55" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const label = ariaLabel ?? title;

  const indicatorClasses =
    "inline-flex shrink-0 items-center justify-center";

  const dotClasses = [
    "relative size-1.5 shrink-0 rounded-full",
    "bg-current",
    "shadow-[0_0_0_2px_var(--background)]",
  ].join(" ");

  const handleRemove: MouseEventHandler<HTMLButtonElement> = (event) => {
    event.stopPropagation();
    onRemove?.();
  };

  const badgeStyle = {
    "--badge-enter-duration": "240ms",
  } as CSSProperties;

  return (
    <>
      <span
        className={rootClasses}
        style={badgeStyle}
        title={title}
        aria-busy={loading || undefined}
        aria-disabled={inactive || undefined}
      >
        {/* Soft highlight along the upper edge */}
        <span
          aria-hidden="true"
          className={[
            "pointer-events-none absolute inset-x-2 top-0 h-px",
            "rounded-full bg-[var(--shadow-light)] opacity-70",
          ].join(" ")}
        />

        {interactive ? (
          <button
            type="button"
            onClick={onClick}
            disabled={inactive}
            aria-label={label}
            className={[
              "relative inline-flex min-w-0 max-w-full items-center",
              "justify-center gap-[inherit] rounded-[inherit]",
              "bg-transparent font-semibold leading-none",
              "outline-none",
              "focus-visible:z-10 focus-visible:outline",
              "focus-visible:outline-2 focus-visible:outline-offset-2",
              "focus-visible:outline-primary",
              "disabled:cursor-not-allowed",
            ].join(" ")}
          >
            {loading ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-3.5 shrink-0 animate-spin motion-reduce:animate-none"
              />
            ) : showDot ? (
              <span aria-hidden="true" className={dotClasses} />
            ) : displayIcon ? (
              <span className={indicatorClasses}>{displayIcon}</span>
            ) : null}

            <span className="min-w-0 truncate">{content}</span>

            {countLabel !== null && (
              <span
                aria-label={`Count: ${countLabel}`}
                className={[
                  "inline-flex shrink-0 items-center justify-center",
                  "rounded-full border border-current/10",
                  "bg-background/60 px-1.5 py-0.5",
                  "text-[0.9em] font-bold tabular-nums",
                  "shadow-[inset_1px_1px_2px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)]",
                ].join(" ")}
              >
                {countLabel}
              </span>
            )}
          </button>
        ) : (
          <span
            className={[
              "relative inline-flex min-w-0 max-w-full items-center",
              "gap-[inherit] font-semibold leading-none",
            ].join(" ")}
            aria-label={label}
          >
            {loading ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-3.5 shrink-0 animate-spin motion-reduce:animate-none"
              />
            ) : showDot ? (
              <span aria-hidden="true" className={dotClasses} />
            ) : displayIcon ? (
              <span className={indicatorClasses}>{displayIcon}</span>
            ) : null}

            {content && <span className="min-w-0 truncate">{content}</span>}

            {countLabel !== null && (
              <span
                className={[
                  "inline-flex shrink-0 items-center justify-center",
                  "rounded-full border border-current/10",
                  "bg-background/60 px-1.5 py-0.5",
                  "text-[0.9em] font-bold tabular-nums",
                  "shadow-[inset_1px_1px_2px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)]",
                ].join(" ")}
              >
                {countLabel}
              </span>
            )}
          </span>
        )}
      </span>

      {canRemove && (
        <button
          type="button"
          onClick={handleRemove}
          aria-label={`Remove ${typeof content === "string" ? content : "tag"}`}
          title="Remove tag"
          className={[
            "ml-1 inline-flex size-5 shrink-0 items-center justify-center",
            "self-center rounded-full border border-border/60",
            "bg-card text-muted-foreground",
            "shadow-[var(--nm-raised-sm)]",
            "transition-[color,box-shadow,transform]",
            "duration-200 motion-reduce:transition-none",
            "hover:text-danger hover:shadow-[var(--nm-inset)]",
            "active:scale-90 active:shadow-[var(--nm-pressed)]",
            "focus-visible:outline-none focus-visible:ring-2",
            "focus-visible:ring-primary focus-visible:ring-offset-2",
            "focus-visible:ring-offset-background",
          ].join(" ")}
        >
          <X aria-hidden="true" className="size-3" />
        </button>
      )}
    </>
  );
}

export default Badge;
