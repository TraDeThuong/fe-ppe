
"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  HardHat,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/providers/locale-provider";
import {
  NAV_GROUPS,
  getVisibleNavItems,
} from "@/config/navigation";
import { Typography } from "@ui/typography";

export interface MobileSidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function MobileSidebar({
  open: controlledOpen,
  onClose,
}: MobileSidebarProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const handleClose = useCallback(() => {
    if (!isControlled) {
      setInternalOpen(false);
    }
    onClose?.();
  }, [isControlled, onClose]);

  const handleOpen = useCallback(() => {
    if (!isControlled) {
      setInternalOpen(true);
    }
  }, [isControlled]);

  const { user } = useAuth();
  const { t } = useLocale();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleClose]);

  // Đóng menu khi chuyển trang.
  useEffect(() => {
    if (open) {
      handleClose();
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null;

  const items = getVisibleNavItems(user?.permissions ?? []);

  const groups = NAV_GROUPS.filter((group) =>
    items.some((item) => item.group === group.key),
  );

  const isActive = (route: string) =>
    pathname === route || pathname.startsWith(`${route}/`);

  return createPortal(
    <>
      {/* Floating trigger (uncontrolled mode only) */}
      {!isControlled && !open && (
        <button
          type="button"
          onClick={handleOpen}
          aria-label="Mở menu điều hướng"
          aria-expanded={false}
          className="
            fixed left-4 top-4 z-[80] md:hidden
            flex h-12 w-12 items-center justify-center
            rounded-2xl border border-white/50
            bg-background text-foreground
            shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)]
            transition-all duration-300
            hover:-translate-y-0.5 hover:text-primary
            active:translate-y-0 active:shadow-nm-pressed
            focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-primary/60
            dark:border-white/10
          "
        >
          <Menu className="h-6 w-6" strokeWidth={1.8} />
        </button>
      )}

      {/* Full-screen navigation */}
      <div
        id="mobile-navigation"
        aria-hidden={!open}
        className={[
          "fixed inset-0 z-[100] md:hidden",
          "h-[100dvh] w-screen overflow-hidden",
          "bg-background",
          "transition-[opacity,visibility] duration-300",
          open
            ? "visible opacity-100"
            : "invisible pointer-events-none opacity-0",
        ].join(" ")}
      >
        {/* Ambient lighting */}
        <div
          aria-hidden="true"
          className="
            pointer-events-none absolute -right-24 -top-24
            h-72 w-72 rounded-full
            bg-primary/[0.10] blur-3xl
          "
        />

        <div
          aria-hidden="true"
          className="
            pointer-events-none absolute -bottom-24 -left-24
            h-72 w-72 rounded-full
            bg-primary/[0.07] blur-3xl
          "
        />

        <div className="relative flex h-full flex-col">
          {/* Header */}
          <header
            className="
              flex shrink-0 items-center justify-between gap-3
              border-b border-[var(--shadow-dark)]/10
              px-5 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))]
              shadow-[0_2px_0_var(--shadow-light)]
            "
          >
            <div className="flex min-w-0 items-center gap-3">
              {/* Sculpted logo */}
              <div
                className="
                  relative flex h-14 w-14 shrink-0
                  items-center justify-center rounded-[20px]
                  border border-white/50 bg-background
                  shadow-[6px_6px_13px_var(--shadow-dark),-6px_-6px_13px_var(--shadow-light)]
                  dark:border-white/10
                "
              >
                <div
                  aria-hidden="true"
                  className="
                    absolute inset-[5px] rounded-[15px]
                    bg-background shadow-nm-pressed
                  "
                />

                <HardHat
                  aria-hidden="true"
                  className="relative z-10 h-7 w-7 text-primary"
                  strokeWidth={1.7}
                />

                <span
                  aria-hidden="true"
                  className="
                    absolute -right-1 -top-1 z-10
                    h-3.5 w-3.5 rounded-full
                    border-2 border-background bg-primary
                    shadow-[0_2px_5px_var(--shadow-dark)]
                  "
                />
              </div>

              <div className="min-w-0">
                <Typography
                  as="p"
                  variant="embossed"
                  className="truncate text-base font-bold tracking-tight"
                >
                  {t("app.name")}
                </Typography>

                <div className="mt-1 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span
                    className="
                      truncate text-[10px] font-semibold
                      uppercase tracking-[0.16em]
                      text-muted-foreground
                    "
                  >
                    Safety workspace
                  </span>
                </div>
              </div>
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Đóng menu"
              className="
                flex h-12 w-12 shrink-0 items-center justify-center
                rounded-2xl border border-white/40 bg-background
                text-muted-foreground
                shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]
                transition-all duration-200
                hover:text-primary
                active:shadow-nm-pressed
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-primary/60
                dark:border-white/10
              "
            >
              <X className="h-6 w-6" strokeWidth={1.8} />
            </button>
          </header>

          {/* Menu title */}
          <div className="shrink-0 px-5 pb-3 pt-5">
            <p
              className="
                text-[10px] font-bold uppercase
                tracking-[0.24em] text-muted-foreground
              "
            >
              Navigation
            </p>

            <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">
              Explore workspace
            </h2>
          </div>

          {/* Navigation items */}
          <nav
            aria-label="Mobile main navigation"
            className="
              min-h-0 flex-1 overflow-y-auto overscroll-contain
              px-4 pb-5 pt-2
            "
          >
            <div className="space-y-6">
              {groups.map((group) => {
                const groupItems = items.filter(
                  (item) => item.group === group.key,
                );

                return (
                  <section key={group.key}>
                    <div className="mb-3 flex items-center gap-2 px-2">
                      <span
                        aria-hidden="true"
                        className="
                          h-px w-5
                          bg-gradient-to-r from-primary/60 to-transparent
                        "
                      />

                      <p
                        className="
                          text-[10px] font-bold uppercase
                          tracking-[0.18em]
                          text-muted-foreground/90
                        "
                      >
                        {t(group.i18nKey)}
                      </p>

                      <span
                        aria-hidden="true"
                        className="
                          h-px flex-1
                          bg-gradient-to-r from-[var(--shadow-dark)]/15
                          to-transparent
                        "
                      />
                    </div>

                    <ul className="space-y-3">
                      {groupItems.map((item) => {
                        const active = isActive(item.route);
                        const Icon = item.icon;

                        return (
                          <li key={item.key}>
                            <Link
                              href={item.route}
                              onClick={handleClose}
                              aria-current={active ? "page" : undefined}
                              tabIndex={open ? 0 : -1}
                              className={[
                                "group flex min-h-[60px] items-center gap-3",
                                "rounded-2xl border px-3 py-2.5",
                                "transition-all duration-200",
                                "focus-visible:outline-none focus-visible:ring-2",
                                "focus-visible:ring-primary/60",
                                active
                                  ? [
                                      "border-[var(--shadow-dark)]/10",
                                      "bg-background text-primary",
                                      "shadow-[inset_4px_4px_8px_var(--shadow-dark),inset_-4px_-4px_8px_var(--shadow-light)]",
                                      "dark:border-white/5",
                                    ].join(" ")
                                  : [
                                      "border-white/30 bg-background/70",
                                      "text-foreground",
                                      "shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]",
                                      "hover:-translate-y-0.5 hover:text-primary",
                                      "active:translate-y-0 active:shadow-nm-pressed",
                                      "dark:border-white/5",
                                    ].join(" "),
                              ].join(" ")}
                            >
                              {/* Icon socket */}
                              <span
                                className={[
                                  "flex h-10 w-10 shrink-0 items-center justify-center",
                                  "rounded-xl transition-all duration-200",
                                  active
                                    ? "bg-background text-primary shadow-nm-pressed"
                                    : "text-muted-foreground group-hover:text-primary",
                                ].join(" ")}
                              >
                                <Icon
                                  aria-hidden="true"
                                  className="h-5 w-5"
                                  strokeWidth={active ? 2.2 : 1.8}
                                />
                              </span>

                              <span className="min-w-0 flex-1">
                                <span
                                  className={[
                                    "block truncate text-sm",
                                    active ? "font-bold" : "font-medium",
                                  ].join(" ")}
                                >
                                  {t(item.i18nKey)}
                                </span>

                                {active && (
                                  <span className="mt-1 block text-[10px] font-medium text-muted-foreground">
                                    Current page
                                  </span>
                                )}
                              </span>

                              {active ? (
                                <span
                                  aria-hidden="true"
                                  className="
                                    flex h-7 w-7 shrink-0 items-center
                                    justify-center rounded-full
                                    bg-background text-primary shadow-nm-sm
                                  "
                                >
                                  <span className="h-2 w-2 rounded-full bg-primary" />
                                </span>
                              ) : (
                                <ChevronRight
                                  aria-hidden="true"
                                  className="
                                    h-4 w-4 shrink-0
                                    text-muted-foreground/50
                                    transition-transform duration-200
                                    group-hover:translate-x-0.5
                                    group-hover:text-primary
                                  "
                                />
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
          </nav>

          {/* Footer */}
          <footer
            className="
              shrink-0 border-t border-[var(--shadow-dark)]/10
              px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]
              pt-4 shadow-[0_-2px_0_var(--shadow-light)]
            "
          >
            <div
              className="
                flex items-center gap-3 rounded-2xl
                border border-white/30 bg-background/70 p-3
                shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]
                dark:border-white/5
              "
            >
              <span
                className="
                  flex h-10 w-10 shrink-0 items-center justify-center
                  rounded-xl bg-background text-primary shadow-nm-sm
                "
              >
                <ShieldCheck className="h-5 w-5" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-foreground">
                  Smart PPE
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  Construction safety monitoring
                </p>
              </div>

              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full bg-primary"
              />
            </div>
          </footer>
        </div>
      </div>
    </>,
    document.body,
  );
}
