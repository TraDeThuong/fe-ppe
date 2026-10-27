"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Row, RowData } from "@tanstack/react-table";
import { MoreVertical, MoreHorizontal } from "lucide-react";
import type { TableFeatureSet } from "./table-config";

export interface TableRowAction<TData extends RowData = any> {
  id: string;
  label: string;
  onClick: (row: TData, rowId: string) => void;
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  disabled?: boolean | ((row: TData) => boolean);
  hidden?: boolean | ((row: TData) => boolean);
}

export interface TableRowActionsProps<TData extends RowData = any> {
  row: Row<TableFeatureSet, TData>;
  actions: TableRowAction<TData>[];
  className?: string;
  label?: string;
  showLabels?: boolean;
  /**
   * "dropdown" (mặc định): Gom toàn bộ actions vào 1 icon duy nhất (3 chấm), click vào sẽ sổ xuống menu.
   * "inline": Dàn trải các icon ra theo hàng ngang.
   */
  mode?: "dropdown" | "inline";
  /** Icon kích hoạt menu dropdown, mặc định là MoreVertical */
  triggerIcon?: ReactNode;
}

export function TableRowActions<TData extends RowData = any>({
  row,
  actions,
  className = "",
  label = "Thao tác",
  showLabels = false,
  mode = "dropdown",
  triggerIcon,
}: TableRowActionsProps<TData>) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    right: number;
  }>({ right: 0 });
  const [mounted, setMounted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const visibleActions = actions.filter((action) =>
    typeof action.hidden === "function"
      ? !action.hidden(row.original)
      : !action.hidden,
  );

  // Tính toán toạ độ hiển thị (trên/dưới trigger button)
  const calculatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuEstimatedHeight = 220;
    const spaceBelow = window.innerHeight - rect.bottom;
    const preferTop = spaceBelow < menuEstimatedHeight && rect.top > menuEstimatedHeight;

    if (preferTop) {
      setCoords({
        bottom: window.innerHeight - rect.top + 6,
        right: window.innerWidth - rect.right,
      });
    } else {
      setCoords({
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
      });
    }
  };

  const handleToggle = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!isOpen) {
      calculatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Click outside, phím Escape, và cuộn trang để đóng menu
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        (triggerRef.current && triggerRef.current.contains(target)) ||
        (menuRef.current && menuRef.current.contains(target))
      ) {
        return;
      }
      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      setIsOpen(false);
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (visibleActions.length === 0) return null;

  // CHẾ ĐỘ 1: SỔ XUỐNG MENU TỪ 1 ICON DUY NHẤT (DROPDOWN) - MẶC ĐỊNH
  if (mode === "dropdown") {
    return (
      <div
        ref={containerRef}
        className={["relative inline-flex items-center justify-end", className].join(" ")}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-label={label}
          title={label}
          onClick={handleToggle}
          className={[
            "inline-flex size-8 shrink-0 items-center justify-center rounded-xl",
            "border border-border/50 bg-background text-muted-foreground",
            "shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)]",
            "transition-all duration-200 hover:text-foreground hover:-translate-y-0.5",
            isOpen
              ? "shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] text-primary ring-1 ring-primary/40 -translate-y-0"
              : "",
            "active:shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)] active:translate-y-0",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          ].join(" ")}
        >
          {triggerIcon ?? <MoreVertical size={16} />}
        </button>

        {isOpen &&
          mounted &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-orientation="vertical"
              aria-label={label}
              style={{
                position: "fixed",
                top: coords.top !== undefined ? `${coords.top}px` : undefined,
                bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
                right: `${coords.right}px`,
                zIndex: 9999,
              }}
              onClick={(event) => event.stopPropagation()}
              className={[
                "min-w-[200px] overflow-hidden",
                "rounded-2xl border border-white/70 dark:border-white/10 bg-background/95 backdrop-blur-md",
                "shadow-[8px_16px_32px_rgba(0,0,0,0.35),-4px_-4px_16px_var(--shadow-light),inset_1px_1px_1px_rgba(255,255,255,0.7)]",
                "dark:shadow-[8px_16px_32px_rgba(0,0,0,0.7),-2px_-2px_12px_rgba(255,255,255,0.05),inset_1px_1px_1px_rgba(255,255,255,0.1)]",
                "p-1.5 space-y-0.5",
                "animate-in fade-in-0 zoom-in-95 duration-150",
              ].join(" ")}
            >
              {visibleActions.map((action) => {
                const isDisabled =
                  typeof action.disabled === "function"
                    ? action.disabled(row.original)
                    : Boolean(action.disabled);

                const isDanger = action.variant === "danger";
                const isPrimary = action.variant === "primary";

                return (
                  <button
                    key={action.id}
                    role="menuitem"
                    type="button"
                    disabled={isDisabled}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!isDisabled) {
                        setIsOpen(false);
                        action.onClick(row.original, row.id);
                      }
                    }}
                    className={[
                      "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-left transition-all duration-150",
                      isDanger
                        ? "text-danger hover:bg-danger/10 hover:shadow-[inset_1px_1px_2px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)]"
                        : isPrimary
                        ? "text-primary hover:bg-primary/10 hover:shadow-[inset_1px_1px_2px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)]"
                        : "text-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:shadow-[inset_1px_1px_2px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)]",
                      isDisabled
                        ? "cursor-not-allowed opacity-35 hover:bg-transparent hover:shadow-none"
                        : "cursor-pointer active:scale-[0.98]",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "flex size-4 shrink-0 items-center justify-center",
                        isDanger
                          ? "text-danger"
                          : isPrimary
                          ? "text-primary"
                          : "text-muted-foreground",
                      ].join(" ")}
                    >
                      {action.icon ?? <MoreHorizontal size={14} />}
                    </span>
                    <span className="truncate flex-1">{action.label}</span>
                  </button>
                );
              })}
            </div>,
            document.body,
          )}
      </div>
    );
  }

  // CHẾ ĐỘ 2: DÀN HÀNG NGANG (INLINE) NẾU CẦN
  return (
    <div
      role="group"
      aria-label={label}
      className={["flex items-center justify-end gap-1.5", className].join(" ")}
      onClick={(event) => event.stopPropagation()}
    >
      {visibleActions.map((action) => {
        const isDisabled =
          typeof action.disabled === "function"
            ? action.disabled(row.original)
            : Boolean(action.disabled);

        const isDanger = action.variant === "danger";
        const isPrimary = action.variant === "primary";

        return (
          <button
            key={action.id}
            type="button"
            disabled={isDisabled}
            title={action.label}
            aria-label={action.label}
            onClick={() => action.onClick(row.original, row.id)}
            className={[
              "group/btn inline-flex items-center justify-center gap-1.5 shrink-0",
              showLabels ? "h-8 px-3 rounded-xl text-xs font-bold" : "size-8 rounded-xl",
              "border transition-all duration-200",
              isDanger
                ? "border-danger/30 text-danger bg-danger/5 shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] hover:bg-danger/10 hover:shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)]"
                : isPrimary
                ? "border-primary/40 text-primary-foreground bg-primary shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] hover:brightness-105"
                : "border-border/40 text-muted-foreground bg-background shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] hover:text-foreground hover:-translate-y-0.5",
              "active:translate-y-0 active:shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]",
              "disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none disabled:hover:translate-y-0",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            ].join(" ")}
          >
            {action.icon ?? <MoreHorizontal size={14} />}
            {showLabels ? <span>{action.label}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export default TableRowActions;
