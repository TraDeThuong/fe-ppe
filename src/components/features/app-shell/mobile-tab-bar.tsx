"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ellipsis } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/providers/locale-provider";
import { useSidebarBadges } from "@/hooks/app-shell";
import { formatBadgeCount, type SidebarBadgeItem } from "@/lib/sidebar-badges";
import {
  MOBILE_PRIMARY_TAB_KEYS,
  NAV_ITEMS,
  getMobileNavLabel,
  getVisibleNavItems,
  isNavItemActive,
  type NavItem,
} from "@/config/navigation";
import { MobileMoreSheet } from "./mobile-more-sheet";
import { useIsMobileTabBarHidden } from "./mobile-chrome-context";

/** Cuộn vùng nội dung chính về đầu trang (chạm lại tab đang mở). */
function scrollPageToTop() {
  const target = document.querySelector<HTMLElement>("[data-page-scroll]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target?.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
}

function TabBadge({ badge }: { badge: SidebarBadgeItem }) {
  return (
    <span
      aria-hidden="true"
      className="absolute -right-1 -top-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full border-2 border-background bg-danger px-1 text-[11px] font-bold leading-none text-white"
    >
      {formatBadgeCount(badge)}
    </span>
  );
}

const tabClass =
  "relative flex h-16 w-full flex-col items-center justify-center gap-1 text-xs transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50";

function TabIcon({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`relative flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
        active ? "bg-primary/13" : ""
      }`}
    >
      {children}
    </span>
  );
}

export interface MobileTabBarProps {
  maintenanceLocked?: boolean;
}

/**
 * Thanh tab ở đáy màn hình cho mobile (< 768px), thay menu ☰.
 * Tab chính theo quyền: Tổng quan · Sự cố · Camera · Thông báo; các trang còn lại nằm trong "Thêm".
 */
export function MobileTabBar({ maintenanceLocked = false }: MobileTabBarProps) {
  const { user } = useAuth();
  const pathname = usePathname() || "";
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const badges = useSidebarBadges();
  const hiddenByPage = useIsMobileTabBarHidden();

  // Sheet "Thêm" gắn với trang đang mở: chuyển trang là tự đóng.
  const [moreOpenAt, setMoreOpenAt] = useState<string | null>(null);
  const moreOpen = moreOpenAt === pathname;

  const visibleItems = getVisibleNavItems(user?.permissions ?? [], {
    maintenanceLocked,
    role: user?.role,
  });

  const tabs: NavItem[] = maintenanceLocked
    ? visibleItems.slice(0, 1)
    : MOBILE_PRIMARY_TAB_KEYS.flatMap((key) => {
        const item = visibleItems.find((candidate) => candidate.key === key);
        return item ? [item] : [];
      });
  const moreItems = visibleItems.filter((item) => !tabs.includes(item));

  const moreActive =
    moreItems.some((item) => isNavItemActive(pathname, item, NAV_ITEMS)) ||
    pathname === "/change-password";
  const moreHasBadge = moreItems.some((item) => Boolean(badges[item.key]));

  // Trang có thanh thao tác riêng ở đáy (ví dụ chi tiết sự cố) tạm ẩn thanh tab.
  if (hiddenByPage) return null;

  return (
    <>
      <nav
        aria-label={isVietnamese ? "Điều hướng chính" : "Main navigation"}
        className="relative z-30 shrink-0 border-t border-border/80 bg-background pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_18px_-12px_rgba(0,0,0,0.35)] md:hidden"
      >
        <ul
          className="grid"
          style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}
        >
          {tabs.map((item) => {
            const active = isNavItemActive(pathname, item, NAV_ITEMS);
            const badge = badges[item.key];
            const Icon = item.icon;
            const label = getMobileNavLabel(item, isVietnamese, t);

            return (
              <li key={item.key}>
                <Link
                  href={item.route}
                  aria-current={active ? "page" : undefined}
                  onClick={(event) => {
                    if (active && pathname === item.route) {
                      event.preventDefault();
                      scrollPageToTop();
                    }
                  }}
                  className={`${tabClass} font-medium ${active ? "text-primary" : "text-muted-foreground"}`}
                >
                  <TabIcon active={active}>
                    <Icon className="size-5.5" strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
                    {badge && <TabBadge badge={badge} />}
                  </TabIcon>
                  <span className="max-w-full truncate px-0.5">{label}</span>
                  {badge && <span className="sr-only">, {badge.label}</span>}
                </Link>
              </li>
            );
          })}

          <li>
            <button
              type="button"
              data-mobile-tab="more"
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              aria-controls="mobile-more-sheet"
              onClick={() => setMoreOpenAt(pathname)}
              className={`${tabClass} font-medium ${moreActive ? "text-primary" : "text-muted-foreground"}`}
            >
              <TabIcon active={moreActive}>
                <Ellipsis className="size-6" strokeWidth={moreActive ? 2.4 : 2} aria-hidden="true" />
                {moreHasBadge && (
                  <span
                    aria-hidden="true"
                    className="absolute right-2.5 top-0.5 size-2.5 rounded-full border-2 border-background bg-danger"
                  />
                )}
              </TabIcon>
              <span>{isVietnamese ? "Thêm" : "More"}</span>
            </button>
          </li>
        </ul>
      </nav>

      <MobileMoreSheet
        open={moreOpen}
        onClose={() => setMoreOpenAt(null)}
        items={moreItems}
        maintenanceLocked={maintenanceLocked}
      />
    </>
  );
}
