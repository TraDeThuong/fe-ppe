"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, LogOut, Moon, Sun, SunMoon } from "lucide-react";

import { BottomSheet } from "@ui/bottom-sheet";
import { EnglishFlag, VietnamFlag } from "@ui/flag-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/providers/locale-provider";
import { useTheme, type Theme } from "@/providers/theme-provider";
import { useSidebarBadges } from "@/hooks/app-shell";
import { formatBadgeCount } from "@/lib/sidebar-badges";
import {
  NAV_GROUPS,
  NAV_ITEMS,
  ROLE_LABELS,
  getMobileNavLabel,
  isNavItemActive,
  type NavItem,
} from "@/config/navigation";

export interface MobileMoreSheetProps {
  open: boolean;
  onClose: () => void;
  /** Các mục menu không nằm trên thanh tab */
  items: NavItem[];
  maintenanceLocked?: boolean;
}

const rowClass =
  "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";

/** Nội dung tab "Thêm": tài khoản · các trang còn lại · giao diện · ngôn ngữ · đăng xuất. */
export function MobileMoreSheet({
  open,
  onClose,
  items,
  maintenanceLocked = false,
}: MobileMoreSheetProps) {
  const { user, logout } = useAuth();
  const { t, locale, setLocale } = useLocale();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname() || "";
  const badges = useSidebarBadges();
  const isVietnamese = locale === "vi-VN";

  // Mục "Cài đặt tài khoản" đã có ở thẻ tài khoản phía trên.
  const pageItems = items.filter((item) => item.key !== "settings");
  const groups = NAV_GROUPS.map((group) => ({
    group,
    items: pageItems.filter((item) => item.group === group.key),
  })).filter((entry) => entry.items.length > 0);
  const showGroupTitles = pageItems.length > 5;

  const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: "light", label: isVietnamese ? "Sáng" : "Light", icon: Sun },
    { value: "dark", label: isVietnamese ? "Tối" : "Dark", icon: Moon },
    { value: "system", label: isVietnamese ? "Tự động" : "Auto", icon: SunMoon },
  ];

  const displayName = user?.fullName || user?.email || "";
  const initials = (user?.fullName || user?.email || "U").trim().slice(0, 2).toUpperCase();
  // Cùng quy tắc với UserMenu: vai trò tự tạo hiển thị đúng tên vai trò.
  const roleLabel = user
    ? ROLE_LABELS[user.role]
      ? t(ROLE_LABELS[user.role])
      : user.role
    : "";
  const accountActive = pathname.startsWith("/settings") || pathname === "/change-password";

  const accountContent = (
    <>
      <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-bold text-primary-foreground">
        {user?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" className="size-full object-cover" />
        ) : (
          initials
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-semibold text-foreground">{displayName}</span>
        <span className="block truncate text-sm text-muted-foreground">{roleLabel}</span>
      </span>
    </>
  );

  return (
    <BottomSheet
      id="mobile-more-sheet"
      open={open}
      onClose={onClose}
      title={isVietnamese ? "Thêm" : "More"}
      closeLabel={isVietnamese ? "Đóng" : "Close"}
    >
      <div className="space-y-5 pt-1">
        {/* Tài khoản */}
        {user &&
          (maintenanceLocked ? (
            <div className="flex items-center gap-3 rounded-2xl border border-border/70 p-3">
              {accountContent}
            </div>
          ) : (
            <Link
              href="/settings/profile"
              onClick={onClose}
              aria-current={accountActive ? "page" : undefined}
              className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background p-3 shadow-nm-sm transition-shadow active:shadow-nm-pressed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              {accountContent}
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
          ))}

        {/* Các trang còn lại */}
        {groups.length > 0 && (
          <nav aria-label={isVietnamese ? "Trang khác" : "Other pages"} className="space-y-3">
            {groups.map(({ group, items: groupItems }) => (
              <div key={group.key}>
                {showGroupTitles && (
                  <p className="px-3 pb-1 text-sm font-semibold text-muted-foreground">
                    {t(group.i18nKey)}
                  </p>
                )}
                <ul className="space-y-0.5">
                  {groupItems.map((item) => {
                    const active = isNavItemActive(pathname, item, NAV_ITEMS);
                    const badge = badges[item.key];
                    const Icon = item.icon;
                    return (
                      <li key={item.key}>
                        <Link
                          href={item.route}
                          onClick={onClose}
                          aria-current={active ? "page" : undefined}
                          className={`${rowClass} ${
                            active
                              ? "bg-primary/10 font-semibold text-primary"
                              : "font-medium text-foreground hover:bg-foreground/5"
                          }`}
                        >
                          <Icon
                            className={`size-5 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`}
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {getMobileNavLabel(item, isVietnamese, t)}
                          </span>
                          {badge && (
                            <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-bold text-danger">
                              {formatBadgeCount(badge)}
                              <span className="sr-only">, {badge.label}</span>
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        )}

        {/* Giao diện & ngôn ngữ */}
        <section aria-label={isVietnamese ? "Tùy chọn hiển thị" : "Display options"} className="space-y-2">
          <div
            role="radiogroup"
            aria-label={isVietnamese ? "Giao diện" : "Appearance"}
            className="grid grid-cols-3 gap-1 rounded-2xl bg-foreground/5 p-1"
          >
            {themeOptions.map((option) => {
              const selected = theme === option.value;
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setTheme(option.value)}
                  className={`flex h-11 items-center justify-center gap-1.5 rounded-xl text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                    selected
                      ? "bg-background font-semibold text-primary shadow-nm-sm"
                      : "font-medium text-muted-foreground"
                  }`}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {option.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setLocale(isVietnamese ? "en-US" : "vi-VN")}
            className={`${rowClass} font-medium text-foreground hover:bg-foreground/5`}
          >
            {isVietnamese ? (
              <VietnamFlag className="size-5 shrink-0" aria-hidden="true" />
            ) : (
              <EnglishFlag className="size-5 shrink-0" aria-hidden="true" />
            )}
            <span className="flex-1">{isVietnamese ? "Ngôn ngữ" : "Language"}</span>
            <span className="text-sm text-muted-foreground">
              {isVietnamese ? "Tiếng Việt" : "English"}
            </span>
          </button>
        </section>

        {/* Đăng xuất */}
        <button
          type="button"
          onClick={() => {
            onClose();
            void logout();
          }}
          className={`${rowClass} font-semibold text-danger hover:bg-danger/10`}
        >
          <LogOut className="size-5 shrink-0" aria-hidden="true" />
          {t("common.logout")}
        </button>
      </div>
    </BottomSheet>
  );
}
