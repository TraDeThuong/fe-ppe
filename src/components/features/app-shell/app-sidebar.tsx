
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronsLeft,
  ChevronsRight,
  HardHat,
  ShieldCheck,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/providers/locale-provider";
import {
  NAV_GROUPS,
  getVisibleNavItems,
} from "@/config/navigation";
import { Button } from "@ui/button";
import { Typography } from "@ui/typography";

const COLLAPSED_KEY = "ppe_sidebar_collapsed";

export function AppSidebar() {
  const { user } = useAuth();
  const { t } = useLocale();
  const pathname = usePathname();

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(COLLAPSED_KEY);

    if (stored === "1") {
      setCollapsed(true);
    }
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;

      window.localStorage.setItem(
        COLLAPSED_KEY,
        next ? "1" : "0",
      );

      return next;
    });
  };

  const items = getVisibleNavItems(user?.permissions ?? []);

  const groups = NAV_GROUPS.filter((group) =>
    items.some((item) => item.group === group.key),
  );

  const isActive = (route: string) =>
    pathname === route || pathname.startsWith(`${route}/`);

  // Chỉ thu gọn trên desktop. Mobile ẩn toàn bộ sidebar bằng CSS.
  const iconOnly = collapsed;

  return (
    <aside
      className={[
        // Responsive: ẩn hoàn toàn dưới breakpoint md (768px).
        "flex",
        "group/sidebar relative z-30 h-full shrink-0 flex-col",
        "isolate overflow-hidden bg-background",
        "border-r border-white/40 dark:border-white/5",
        "shadow-[8px_0_28px_-16px_var(--shadow-dark),inset_-1px_0_0_var(--shadow-light)]",
        "transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        collapsed ? "w-16" : "w-16 md:w-64",
      ].join(" ")}
    >
      {/* Soft ambient light */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-20 -top-24 h-64 w-64
          rounded-full bg-primary/[0.07] blur-3xl"
      />

      {/* Highlight along the outer edge */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 z-30 w-px
          bg-gradient-to-b from-white via-white/20 to-white/70
          dark:from-white/20 dark:via-white/5 dark:to-white/10"
      />

      {/* Brand */}
      <header
        className={[
          "relative z-10 flex h-[84px] shrink-0 items-center",
          "border-b border-[var(--shadow-dark)]/10",
          "shadow-[0_1px_0_var(--shadow-light)]",
          iconOnly ? "justify-center px-2" : "gap-3 px-4",
        ].join(" ")}
      >
        <Link
          href="/"
          aria-label={t("app.name")}
          className="group/brand flex min-w-0 items-center gap-3 rounded-2xl
            outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          {/* Layered 3D logo */}
          <span
            className="relative flex h-11 w-11 shrink-0 items-center justify-center
              rounded-[17px] border border-white/50 bg-background
              shadow-[5px_5px_11px_var(--shadow-dark),-5px_-5px_11px_var(--shadow-light),inset_1px_1px_0_rgb(255_255_255_/_65%)]
              transition-all duration-300
              group-hover/brand:-translate-y-0.5
              group-hover/brand:shadow-[7px_7px_14px_var(--shadow-dark),-7px_-7px_14px_var(--shadow-light)]
              active:translate-y-0 active:shadow-nm-pressed
              dark:border-white/10"
          >
            <span
              aria-hidden="true"
              className="absolute inset-[5px] rounded-[12px]
                bg-background shadow-nm-pressed"
            />

            <HardHat
              aria-hidden="true"
              className="relative z-10 h-[23px] w-[23px] text-primary
                drop-shadow-[0_1px_0_rgb(255_255_255_/_60%)]"
              strokeWidth={1.8}
            />

            <span
              aria-hidden="true"
              className="absolute -right-1 -top-1 flex h-4 w-4 items-center
                justify-center rounded-full border-2 border-background
                bg-primary shadow-[0_2px_5px_var(--shadow-dark)]"
            >
              <span className="h-1 w-1 rounded-full bg-white" />
            </span>
          </span>

          {!iconOnly && (
            <span className="min-w-0 flex-1">
              <Typography
                as="span"
                variant="embossed"
                className="block truncate text-sm font-bold tracking-tight"
              >
                {t("app.name")}
              </Typography>

              <span className="mt-1 flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-primary
                    shadow-[0_0_7px_var(--shadow-dark)]"
                />

                <span
                  className="truncate text-[9px] font-semibold uppercase
                    tracking-[0.19em] text-muted-foreground"
                >
                  Safety monitoring
                </span>
              </span>
            </span>
          )}
        </Link>
      </header>

      {/* Navigation */}
      <nav
        aria-label="Main navigation"
        className="relative z-10 flex-1 space-y-3 overflow-x-hidden
          overflow-y-auto px-3 py-3"
      >
        {groups.map((group) => {
          const groupItems = items.filter(
            (item) => item.group === group.key,
          );

          return (
            <section
              key={group.key}
              aria-label={iconOnly ? t(group.i18nKey) : undefined}
            >
              {!iconOnly ? (
                <div className="mb-3 flex items-center gap-2 px-3">
                  <span
                    aria-hidden="true"
                    className="h-px w-3 bg-gradient-to-r
                      from-primary/50 to-transparent"
                  />

                  <p
                    className="truncate text-[12px] font-bold uppercase
                      tracking-[0.19em] text-muted-foreground/80"
                  >
                    {t(group.i18nKey)}
                  </p>

                  <span
                    aria-hidden="true"
                    className="h-px flex-1 bg-gradient-to-r
                      from-[var(--shadow-dark)]/15 to-transparent"
                  />
                </div>
              ) : (
                <div
                  aria-hidden="true"
                  className="mx-2 mb-3 h-px rounded-full
                    bg-gradient-to-r from-transparent via-border to-transparent"
                />
              )}

              <ul className="space-y-2">
                {groupItems.map((item) => {
                  const active = isActive(item.route);
                  const Icon = item.icon;

                  return (
                    <li key={item.key}>
                      <Link
                        href={item.route}
                        title={iconOnly ? t(item.i18nKey) : undefined}
                        aria-label={
                          iconOnly ? t(item.i18nKey) : undefined
                        }
                        aria-current={active ? "page" : undefined}
                        className={[
                          "group/item relative flex min-h-12 items-center",
                          "rounded-2xl py-2 text-[12px]",
                          "outline-none transition-all duration-300",
                          "focus-visible:ring-2 focus-visible:ring-primary/50",
                          iconOnly
                            ? "justify-center px-1.5"
                            : "gap-3 px-3",
                          active
                            ? [
                                "translate-y-[1px] bg-background",
                                "font-semibold text-primary",
                                "border border-[var(--shadow-dark)]/10",
                                "shadow-[inset_4px_4px_8px_var(--shadow-dark),inset_-4px_-4px_8px_var(--shadow-light)]",
                                "dark:border-white/5",
                              ].join(" ")
                            : [
                                "border border-transparent text-muted-foreground",
                                "hover:-translate-y-0.5 hover:bg-background",
                                "hover:text-foreground",
                                "hover:border-white/40 dark:hover:border-white/5",
                                "hover:shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]",
                                "active:translate-y-[1px] active:shadow-nm-pressed",
                              ].join(" "),
                        ].join(" ")}
                      >
                        {/* Recessed icon socket */}
                        <span
                          className={[
                            "relative flex h-9 w-9 shrink-0 items-center justify-center",
                            "rounded-xl transition-all duration-300",
                            active
                              ? [
                                  "bg-background text-primary",
                                  "shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)]",
                                ].join(" ")
                              : [
                                  "text-muted-foreground/90",
                                  "group-hover/item:bg-background",
                                  "group-hover/item:text-primary",
                                  "group-hover/item:shadow-nm-sm",
                                ].join(" "),
                          ].join(" ")}
                        >
                          <Icon
                            aria-hidden="true"
                            className={[
                              "h-[18px] w-[18px] shrink-0",
                              "transition-all duration-300",
                              active
                                ? "scale-105 drop-shadow-[0_1px_0_rgb(255_255_255_/_55%)]"
                                : "group-hover/item:scale-110",
                            ].join(" ")}
                            strokeWidth={active ? 2.2 : 1.8}
                          />

                          {active && (
                            <span
                              aria-hidden="true"
                              className="absolute inset-0 rounded-xl
                                ring-1 ring-primary/15"
                            />
                          )}
                        </span>

                        {!iconOnly && (
                          <span className="min-w-0 flex-1 truncate">
                            {t(item.i18nKey)}
                          </span>
                        )}

                        {!iconOnly && active && (
                          <span
                            aria-hidden="true"
                            className="relative flex h-5 w-5 shrink-0
                              items-center justify-center rounded-full
                              bg-background text-primary shadow-nm-sm"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          </span>
                        )}

                        {/* Tooltip for collapsed desktop sidebar */}
                        {iconOnly && (
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute left-[calc(100%+12px)]
                              z-50 hidden whitespace-nowrap rounded-xl
                              border border-white/40 bg-background px-3 py-2
                              text-xs font-medium text-foreground
                              shadow-[5px_5px_12px_var(--shadow-dark),-3px_-3px_8px_var(--shadow-light)]
                              group-hover/item:block"
                          >
                            {t(item.i18nKey)}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </nav>

      {/* Footer */}
      <footer
        className="relative z-10 shrink-0 border-t border-[var(--shadow-dark)]/10
          p-3 shadow-[0_-1px_0_var(--shadow-light)]"
      >
        {!iconOnly && (
          <div
            className="mb-3 flex items-center gap-2 rounded-2xl
              border border-white/30 bg-background/70 p-3
              shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]
              dark:border-white/5"
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center
                rounded-xl bg-background text-primary shadow-nm-sm"
            >
              <ShieldCheck className="h-4 w-4" />
            </span>

            <span className="min-w-0">
              <span className="block truncate text-[10px] font-semibold text-foreground">
                Smart PPE
              </span>

              <span className="mt-0.5 block text-[9px] text-muted-foreground">
                Safety workspace
              </span>
            </span>

            <span
              aria-hidden="true"
              className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full
                bg-primary shadow-[0_0_6px_var(--shadow-dark)]"
            />
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={toggle}
          aria-label={
            collapsed ? "Expand sidebar" : "Collapse sidebar"
          }
          aria-expanded={!collapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden h-10 w-full items-center justify-center gap-2
            rounded-2xl border border-white/40 bg-background
            text-muted-foreground
            shadow-[4px_4px_8px_var(--shadow-dark),-4px_-4px_8px_var(--shadow-light)]
            transition-all duration-300
            hover:-translate-y-0.5 hover:text-primary hover:shadow-nm
            active:translate-y-0 active:shadow-nm-pressed
            dark:border-white/5 md:flex"
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronsLeft className="h-4 w-4" />
              <span className="text-[11px] font-semibold">
                Thu gọn menu
              </span>
            </>
          )}
        </Button>
      </footer>
    </aside>
  );
}
