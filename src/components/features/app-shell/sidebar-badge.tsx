"use client";

import {
  formatBadgeCount,
  type SidebarBadgeItem,
  type SidebarBadgeVariant,
} from "@/lib/sidebar-badges";

const EXPANDED_VARIANT_CLASSES: Record<SidebarBadgeVariant, string> = {
  danger:
    "border-danger/60 bg-danger text-danger-foreground shadow-[0_2px_8px_color-mix(in_srgb,var(--danger)_35%,transparent),inset_0_1px_0_rgba(255,255,255,0.25)]",
  accent:
    "border-accent/60 bg-accent text-accent-foreground shadow-[0_2px_6px_color-mix(in_srgb,var(--accent)_30%,transparent)]",
  primary:
    "border-primary/40 bg-primary/15 text-primary shadow-[inset_1px_1px_2px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)]",
};

const COLLAPSED_VARIANT_CLASSES: Record<SidebarBadgeVariant, string> = {
  danger:
    "bg-danger text-danger-foreground shadow-[0_2px_6px_color-mix(in_srgb,var(--danger)_45%,transparent)]",
  accent:
    "bg-accent text-accent-foreground shadow-[0_2px_5px_var(--shadow-dark)]",
  primary:
    "bg-primary text-primary-foreground shadow-[0_2px_5px_var(--shadow-dark)]",
};

export interface SidebarBadgeProps {
  badge?: SidebarBadgeItem;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Badge số lượng thông báo / mục chờ xử lý cho Sidebar mở rộng & Mobile Drawer.
 */
export function SidebarBadge({
  badge,
  size = "md",
  className = "",
}: SidebarBadgeProps) {
  if (!badge || badge.count <= 0) return null;

  const text = formatBadgeCount(badge, 99);
  const sizeClass =
    size === "sm"
      ? "h-[18px] min-w-[18px] px-1 text-[10px]"
      : "h-[22px] min-w-[22px] px-1.5 text-[11px]";

  return (
    <span
      title={badge.label}
      aria-label={badge.label}
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-full border",
        "font-bold leading-none tabular-nums transition-transform duration-200",
        sizeClass,
        EXPANDED_VARIANT_CLASSES[badge.variant],
        badge.pulse ? "animate-pulse" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {text}
    </span>
  );
}

export interface SidebarCollapsedBadgeProps {
  badge?: SidebarBadgeItem;
}

/**
 * Badge thu gọn gắn ở góc trên phải của icon socket khi Sidebar ở trạng thái iconOnly.
 */
export function SidebarCollapsedBadge({ badge }: SidebarCollapsedBadgeProps) {
  if (!badge || badge.count <= 0) return null;

  const text = formatBadgeCount(badge, 9);

  return (
    <span
      title={badge.label}
      aria-label={badge.label}
      className={[
        "absolute -right-1.5 -top-1.5 z-10 flex h-[18px] min-w-[18px]",
        "items-center justify-center rounded-full border-2 border-background px-1",
        "text-[9px] font-bold leading-none tabular-nums",
        COLLAPSED_VARIANT_CLASSES[badge.variant],
        badge.pulse ? "animate-pulse" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {text}
    </span>
  );
}

