
"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/providers/locale-provider";
import { ThemeToggle } from "@ui/theme-toggle";
import { Globe2, Settings2, ChevronRight } from "lucide-react";

export function MobileHeaderSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { locale, setLocale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={menuRef} className="relative z-30 sm:hidden">
      {/* Mobile settings trigger */}
      <button
        type="button"
        aria-label={isVietnamese ? "Cài đặt hệ thống và ngôn ngữ" : "System and language settings"}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => setIsOpen((previous) => !previous)}
        className="
          flex h-9 w-9 items-center justify-center rounded-xl
          border border-[color-mix(in_srgb,var(--shadow-light)_35%,transparent)]
          bg-background text-muted-foreground
          shadow-[2px_2px_5px_color-mix(in_srgb,var(--shadow-dark)_22%,transparent),-2px_-2px_5px_color-mix(in_srgb,var(--shadow-light)_75%,transparent)]
          transition-all duration-200
          hover:text-foreground
          active:shadow-[inset_2px_2px_4px_color-mix(in_srgb,var(--shadow-dark)_25%,transparent)]
          focus-visible:outline-none focus-visible:ring-2
          focus-visible:ring-primary/50
        "
      >
        <Settings2
          className={`h-[18px] w-[18px] transition-transform duration-300 ${
            isOpen ? "rotate-45" : ""
          }`}
        />
      </button>

      {/* Settings menu */}
      {isOpen && (
        <div
          role="menu"
          aria-label={isVietnamese ? "Cài đặt nhanh" : "Quick settings"}
          className="
            fixed right-3 top-[66px] z-50 w-[min(320px,calc(100vw-24px))] max-h-[calc(100dvh-5.5rem)]
            overflow-y-auto rounded-2xl border
            border-[color-mix(in_srgb,var(--shadow-light)_40%,transparent)]
            bg-background p-2.5
            shadow-[8px_10px_24px_color-mix(in_srgb,var(--shadow-dark)_22%,transparent),-4px_-4px_12px_color-mix(in_srgb,var(--shadow-light)_55%,transparent)]
            animate-in fade-in slide-in-from-top-2 duration-200
          "
        >
          <div className="px-2 pb-2 pt-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Preferences
            </p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">
              {isVietnamese ? "Tùy chỉnh giao diện" : "Display settings"}
            </p>
          </div>

          {/* Theme */}
          <div className="rounded-xl px-2 py-2 transition-colors hover:bg-muted/20">
            <div className="flex items-center gap-3 pb-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-background text-muted-foreground shadow-[2px_2px_4px_color-mix(in_srgb,var(--shadow-dark)_16%,transparent),-2px_-2px_4px_color-mix(in_srgb,var(--shadow-light)_65%,transparent)]">
                <Settings2 className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground">
                  {isVietnamese ? "Giao diện" : "Appearance"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {isVietnamese ? "Sáng • Tối • Tự động Ngày/Đêm" : "Light • Dark • Realtime Auto"}
                </p>
              </div>
            </div>

            <ThemeToggle variant="segmented" />
          </div>

          <div className="mx-2 my-1 h-px bg-[color-mix(in_srgb,var(--shadow-dark)_10%,transparent)]" />

          {/* Language */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setLocale(isVietnamese ? "en-US" : "vi-VN");
              setIsOpen(false);
            }}
            className="
              flex min-h-[54px] w-full items-center gap-3 rounded-xl px-3
              text-left transition-colors hover:bg-muted/40
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-primary/50
            "
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background text-muted-foreground shadow-[2px_2px_4px_color-mix(in_srgb,var(--shadow-dark)_16%,transparent),-2px_-2px_4px_color-mix(in_srgb,var(--shadow-light)_65%,transparent)]">
              <Globe2 className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                {isVietnamese ? "Ngôn ngữ" : "Language"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {isVietnamese ? "Tiếng Việt" : "English"}
              </p>
            </div>

            <span className="text-xs font-bold text-primary">
              {isVietnamese ? "VI" : "EN"}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      )}
    </div>
  );
}
