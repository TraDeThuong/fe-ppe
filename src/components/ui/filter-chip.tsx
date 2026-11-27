"use client";

import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

export interface FilterChipProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  active: boolean;
  onClick: () => void;
  /** Số đếm hiển thị cạnh nhãn (bỏ qua khi chưa có dữ liệu) */
  count?: number | string;
  icon?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

/** Chip lọc cho mobile: cao 44px, trạng thái chọn bằng aria-pressed. */
export function FilterChip({
  active,
  onClick,
  count,
  icon,
  children,
  className = "",
  ref,
  ...rest
}: FilterChipProps) {
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={[
        "inline-flex h-11 shrink-0 snap-start items-center gap-1.5 rounded-full border px-4 text-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        active
          ? "border-primary/60 bg-primary/10 font-semibold text-primary"
          : "border-border/80 bg-background font-medium text-foreground active:bg-foreground/5",
        className,
      ].join(" ")}
      {...rest}
    >
      {icon}
      <span>{children}</span>
      {count !== undefined && count !== null && (
        <span
          className={`tabular-nums text-sm ${active ? "text-primary/80" : "text-muted-foreground"}`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export interface FilterChipRowProps {
  /** Nhãn nhóm cho trình đọc màn hình */
  label: string;
  /** Cho phép vuốt ngang (một hàng). Mặc định: xuống dòng. */
  scrollable?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Hàng chip lọc. Bản `scrollable` là ngoại lệ duy nhất được vuốt ngang trên mobile
 * (mép phải mờ dần để gợi ý còn chip phía sau).
 */
export function FilterChipRow({
  label,
  scrollable = false,
  className = "",
  children,
}: FilterChipRowProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={[
        "flex gap-2",
        scrollable
          ? "-mx-3 snap-x overflow-x-auto scroll-px-3 px-3 pr-8 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden mask-[linear-gradient(to_right,black_calc(100%-2rem),transparent)]"
          : "flex-wrap",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
