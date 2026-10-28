"use client";

import { useEffect, useRef, useState, useId } from "react";
import { Check, Clock, Moon, Sun, SunMoon } from "lucide-react";

import { useTheme, type Theme } from "@/providers/theme-provider";
import { useLocale } from "@/providers/locale-provider";

export interface ThemeToggleProps {
  /**
   * - "dropdown": Nút icon mở menu lựa chọn sáng/tối/hệ thống (mặc định trên Header)
   * - "segmented": Thanh chuyển đổi 3 trạng thái trực tiếp (dùng trên Mobile menu hoặc Settings)
   * - "cycle": Nút bấm chuyển vòng tròn Light -> Dark -> System
   */
  variant?: "dropdown" | "segmented" | "cycle";
  className?: string;
  id?: string;
}

export function ThemeToggle({
  variant = "dropdown",
  className = "",
  id = "theme-toggle-btn",
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, isDayTime } = useTheme();

  // useLocale an toàn (có fallback nếu dùng độc lập)
  let t = (key: string) => key;
  let isVietnamese = true;
  try {
    const localeCtx = useLocale();
    t = localeCtx.t;
    isVietnamese = localeCtx.locale === "vi-VN";
  } catch {
    // Fallback nếu render ngoài LocaleProvider
  }

  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Đóng dropdown khi click ra ngoài hoặc bấm Escape
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Chu kỳ đổi theme cho variant "cycle"
  const handleCycleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  const options: Array<{
    value: Theme;
    label: string;
    description: string;
    icon: typeof Sun;
    iconColor: string;
    optionId: string;
  }> = [
    {
      value: "light",
      label: isVietnamese ? "Sáng" : "Light",
      description: isVietnamese
        ? "Cố định giao diện sáng ban ngày"
        : "Fixed daytime light mode",
      icon: Sun,
      iconColor: "text-amber-500",
      optionId: "theme-option-light",
    },
    {
      value: "dark",
      label: isVietnamese ? "Tối" : "Dark",
      description: isVietnamese
        ? "Cố định giao diện tối ban đêm"
        : "Fixed nighttime dark mode",
      icon: Moon,
      iconColor: "text-indigo-400",
      optionId: "theme-option-dark",
    },
    {
      value: "system",
      label: isVietnamese ? "Hệ thống (Tự động)" : "System (Auto)",
      description: isVietnamese
        ? "06:00 – 18:00 Sáng • 18:00 – 06:00 Tối"
        : "06:00 – 18:00 Light • 18:00 – 06:00 Dark",
      icon: SunMoon,
      iconColor: "text-primary",
      optionId: "theme-option-system",
    },
  ];

  // Tooltip mô tả trạng thái hiện tại
  const currentTitle =
    theme === "system"
      ? isVietnamese
        ? `Giao diện: Hệ thống tự động (Hiện tại: ${isDayTime ? "Ban ngày → Sáng" : "Ban đêm → Tối"})`
        : `Theme: System Auto (Current: ${isDayTime ? "Day → Light" : "Night → Dark"})`
      : theme === "dark"
        ? isVietnamese
          ? "Giao diện: Tối"
          : "Theme: Dark"
        : isVietnamese
          ? "Giao diện: Sáng"
          : "Theme: Light";

  /* =========================================================================
   * VARIANT 1: SEGMENTED (Dành cho Mobile Settings, Modal, Settings Page)
   * ========================================================================= */
  if (variant === "segmented") {
    return (
      <div className={`flex w-full flex-col gap-2 ${className}`}>
        <div
          role="radiogroup"
          aria-label={isVietnamese ? "Lựa chọn giao diện" : "Appearance mode"}
          className="grid grid-cols-3 gap-1 rounded-2xl border border-[color-mix(in_srgb,var(--shadow-light)_30%,transparent)] bg-background p-1 shadow-[inset_2px_2px_5px_color-mix(in_srgb,var(--shadow-dark)_20%,transparent),inset_-2px_-2px_5px_color-mix(in_srgb,var(--shadow-light)_75%,transparent)]"
        >
          {options.map((opt) => {
            const isSelected = theme === opt.value;
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                id={opt.optionId}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setTheme(opt.value)}
                className={`
                  relative flex flex-col items-center justify-center gap-1 rounded-xl py-2 px-1 text-xs font-semibold transition-all duration-200
                  ${
                    isSelected
                      ? "bg-background text-primary shadow-[2px_2px_5px_color-mix(in_srgb,var(--shadow-dark)_25%,transparent),-2px_-2px_5px_color-mix(in_srgb,var(--shadow-light)_85%,transparent)] ring-1 ring-primary/20"
                      : "text-muted-foreground hover:text-foreground active:scale-95"
                  }
                `}
              >
                <Icon className={`h-4 w-4 ${isSelected ? opt.iconColor : "text-muted-foreground"}`} />
                <span className="truncate text-[11px] font-bold">{opt.label}</span>
                {opt.value === "system" && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Real-time status caption */}
        <div className="flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3 shrink-0 text-primary" />
          <span>
            {theme === "system"
              ? isVietnamese
                ? `Tự động: 06:00 – 18:00 Sáng • 18:00 – 06:00 Tối (${isDayTime ? "Hiện tại: Sáng" : "Hiện tại: Tối"})`
                : `Real-time: 06:00 – 18:00 Light • 18:00 – 06:00 Dark (${isDayTime ? "Active: Light" : "Active: Dark"})`
              : isVietnamese
                ? "Chế độ cố định theo lựa chọn của bạn"
                : "Fixed mode according to your selection"}
          </span>
        </div>
      </div>
    );
  }

  /* =========================================================================
   * VARIANT 2: CYCLE (Chuyển nhanh khi bấm trực tiếp)
   * ========================================================================= */
  if (variant === "cycle") {
    return (
      <button
        id={id}
        type="button"
        onClick={handleCycleTheme}
        aria-label={
          isVietnamese
            ? "Chuyển đổi giao diện sáng / tối / hệ thống"
            : "Cycle appearance theme"
        }
        title={currentTitle}
        className={`
          group relative inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl
          border border-[color-mix(in_srgb,var(--shadow-light)_30%,transparent)]
          bg-background text-foreground shadow-nm transition-all duration-200
          hover:shadow-nm-sm active:shadow-nm-pressed active:translate-y-px
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
          ${className}
        `}
      >
        {theme === "system" ? (
          <SunMoon className="h-4.5 w-4.5 text-primary transition-transform duration-300 group-hover:scale-110" />
        ) : resolvedTheme === "dark" ? (
          <Moon className="h-4.5 w-4.5 text-indigo-400 transition-transform duration-300 group-hover:-rotate-12" />
        ) : (
          <Sun className="h-4.5 w-4.5 text-amber-500 transition-transform duration-300 group-hover:rotate-45" />
        )}
        {theme === "system" && (
          <span
            aria-hidden="true"
            className="absolute top-1.5 right-1.5 flex h-2 w-2"
          >
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
        )}
      </button>
    );
  }

  /* =========================================================================
   * VARIANT 3: DROPDOWN (Mặc định: Nút icon Neumorphic + Dropdown Popover)
   * ========================================================================= */
  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        aria-label={
          isVietnamese
            ? "Chuyển đổi giao diện sáng / tối / hệ thống"
            : "Appearance theme options"
        }
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={isOpen ? listboxId : undefined}
        title={currentTitle}
        onClick={() => setIsOpen((previous) => !previous)}
        className="
          group relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl
          border border-[color-mix(in_srgb,var(--shadow-light)_30%,transparent)]
          bg-background text-foreground
          shadow-[2px_2px_5px_color-mix(in_srgb,var(--shadow-dark)_20%,transparent),-2px_-2px_5px_color-mix(in_srgb,var(--shadow-light)_70%,transparent)]
          transition-all duration-200
          hover:text-primary
          active:shadow-nm-pressed active:translate-y-px
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
        "
      >
        {/* Biểu tượng hiển thị theo trạng thái thực tế */}
        {theme === "system" ? (
          <SunMoon className="h-4.5 w-4.5 text-primary transition-transform duration-300 group-hover:scale-110" />
        ) : resolvedTheme === "dark" ? (
          <Moon className="h-4.5 w-4.5 text-indigo-400 transition-transform duration-300 group-hover:-rotate-12" />
        ) : (
          <Sun className="h-4.5 w-4.5 text-amber-500 transition-transform duration-300 group-hover:rotate-45" />
        )}

        {/* Chấm tròn báo hiệu Realtime Auto đang hoạt động */}
        {theme === "system" && (
          <span
            aria-hidden="true"
            className="absolute top-1.5 right-1.5 flex h-2 w-2"
          >
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
        )}
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div
          id={listboxId}
          role="menu"
          aria-label={isVietnamese ? "Chế độ giao diện" : "Appearance theme"}
          className="
            absolute right-0 top-[calc(100%+10px)] z-50 w-72 origin-top-right
            overflow-hidden rounded-2xl border
            border-[color-mix(in_srgb,var(--shadow-light)_40%,transparent)]
            bg-background p-2
            shadow-[8px_10px_24px_color-mix(in_srgb,var(--shadow-dark)_22%,transparent),-4px_-4px_12px_color-mix(in_srgb,var(--shadow-light)_55%,transparent)]
            animate-in fade-in slide-in-from-top-2 duration-200
          "
        >
          {/* Header & Live Real-time Status */}
          <div className="px-2.5 pb-2 pt-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {isVietnamese ? "Chế độ giao diện" : "Appearance"}
              </p>
              {theme === "system" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              )}
            </div>

            {/* Realtime Banner Info */}
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--shadow-dark)_8%,transparent)] bg-card/60 p-2 text-xs shadow-[inset_1px_1px_3px_color-mix(in_srgb,var(--shadow-dark)_15%,transparent),inset_-1px_-1px_3px_color-mix(in_srgb,var(--shadow-light)_65%,transparent)]">
              <Clock className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-foreground">
                  {isVietnamese ? "Thời gian thực Ngày & Đêm" : "Real-time Day & Night"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {isDayTime
                    ? isVietnamese
                      ? "06:00 – 18:00: Ban ngày (Giao diện Sáng)"
                      : "06:00 – 18:00: Daytime (Light Theme)"
                    : isVietnamese
                      ? "18:00 – 06:00: Ban đêm (Giao diện Tối)"
                      : "18:00 – 06:00: Nighttime (Dark Theme)"}
                </p>
              </div>
            </div>
          </div>

          <div className="mx-1.5 my-1 h-px bg-[color-mix(in_srgb,var(--shadow-dark)_10%,transparent)]" />

          {/* Options */}
          <div className="flex flex-col gap-1">
            {options.map((opt) => {
              const isSelected = theme === opt.value;
              const Icon = opt.icon;

              return (
                <button
                  key={opt.value}
                  id={opt.optionId}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isSelected}
                  onClick={() => {
                    setTheme(opt.value);
                    setIsOpen(false);
                  }}
                  className={`
                    group relative flex w-full items-center gap-3 rounded-xl p-2 text-left transition-all duration-150
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
                    ${
                      isSelected
                        ? "bg-primary/10 text-primary shadow-[inset_2px_2px_4px_color-mix(in_srgb,var(--shadow-dark)_12%,transparent),inset_-2px_-2px_4px_color-mix(in_srgb,var(--shadow-light)_70%,transparent)]"
                        : "text-foreground hover:bg-muted/40 hover:shadow-[2px_2px_4px_color-mix(in_srgb,var(--shadow-dark)_10%,transparent)]"
                    }
                  `}
                >
                  {/* Option Icon */}
                  <div
                    className={`
                      flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--shadow-light)_30%,transparent)] bg-background
                      ${
                        isSelected
                          ? "shadow-[inset_1px_1px_3px_color-mix(in_srgb,var(--shadow-dark)_20%,transparent)]"
                          : "shadow-[2px_2px_4px_color-mix(in_srgb,var(--shadow-dark)_16%,transparent),-2px_-2px_4px_color-mix(in_srgb,var(--shadow-light)_70%,transparent)]"
                      }
                    `}
                  >
                    <Icon className={`h-4 w-4 ${opt.iconColor}`} />
                  </div>

                  {/* Option Text */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold leading-tight">
                        {opt.label}
                      </p>
                      {opt.value === "system" && (
                        <span className="rounded bg-primary/15 px-1 py-0.2 text-[9px] font-black tracking-wider text-primary uppercase">
                          Auto
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted-foreground leading-tight">
                      {opt.description}
                    </p>
                  </div>

                  {/* Checkmark */}
                  {isSelected && (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[1px_1px_3px_rgba(0,0,0,0.2)]">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
