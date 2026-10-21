"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, HardHat } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/providers/locale-provider";
import { NAV_GROUPS, getVisibleNavItems } from "@/config/navigation";
import { Button } from "@ui/button";

const COLLAPSED_KEY = "ppe_sidebar_collapsed";

export function AppSidebar() {
  const { user } = useAuth();
  const { t } = useLocale();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(COLLAPSED_KEY);
    if (stored === "1") setCollapsed(true);
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  };

  const items = getVisibleNavItems(user?.permissions ?? []);
  const groups = NAV_GROUPS.filter((g) =>
    items.some((item) => item.group === g.key),
  );

  const isActive = (route: string) =>
    pathname === route || pathname.startsWith(`${route}/`);

  return (
    <aside
      className={`flex h-full shrink-0 flex-col border-r border-(--shadow-dark) bg-background transition-[width] duration-200 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-nm-sm">
          <HardHat className="h-5 w-5 text-primary" />
        </span>
        {!collapsed && (
          <span className="truncate text-sm font-semibold text-foreground">
            {t("app.name")}
          </span>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <div key={group.key}>
            {!collapsed && (
              <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t(group.i18nKey)}
              </p>
            )}
            <ul className="space-y-1">
              {items
                .filter((item) => item.group === group.key)
                .map((item) => {
                  const active = isActive(item.route);
                  const Icon = item.icon;
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.route}
                        title={collapsed ? t(item.i18nKey) : undefined}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-shadow ${
                          active
                            ? "bg-card text-primary shadow-nm-pressed"
                            : "text-foreground hover:shadow-nm-sm"
                        }`}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        {!collapsed && (
                          <span className="truncate">{t(item.i18nKey)}</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Nút collapse */}
      <div className="border-t border-(--shadow-dark) p-3">
        <Button
          variant="outline"
          onClick={toggle}
          className="w-full justify-center"
          aria-label="Toggle sidebar"
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <ChevronsLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}
