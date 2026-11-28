"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Archive,
  BellOff,
  BellRing,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  FileText,
  Mail,
  Megaphone,
  MoreHorizontal,
  RotateCcw,
  Search,
  Send,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { BottomSheet } from "@ui/bottom-sheet";
import { FilterChip, FilterChipRow } from "@ui/filter-chip";
import type { IncidentPeriodFilter, IncidentPeriodMode } from "@/lib/incident-period";
import { formatRelativeNotificationTime, parseNotificationDisplay } from "@/lib/notification-display";
import { isNotificationRead } from "@/lib/notification-inbox";
import { useLocale } from "@/providers/locale-provider";
import type { NotificationItemDto, NotificationSeverity } from "@/types";
import type { NotificationFilterState } from "../notification-filter-toolbar";
import { SEVERITY_META } from "../notification-meta-badges";
import type { NotificationTabKey } from "../notification-tabs";

const PPE_PREFIX_RE = /^(cảnh báo vi phạm ppe|ppe violation alert)\s*[:\-–]\s*/i;

function NotificationMobileItem({
  item,
  onMarkAsRead,
  onOpenDetail,
}: {
  item: NotificationItemDto;
  onMarkAsRead: (id: string) => void;
  onOpenDetail: (item: NotificationItemDto) => void;
}) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const parsed = parseNotificationDisplay(item, isVietnamese);
  const unread = !isNotificationRead(item);
  const severity = item.severity || "NORMAL";
  const accent = SEVERITY_META[severity]?.accentBarClass ?? "bg-primary";

  // Tiêu đề ngắn: bỏ tiền tố "Cảnh báo vi phạm PPE:" để thấy ngay lỗi gì.
  const title =
    parsed.kind === "PPE_ALERT" && parsed.violationLabel
      ? parsed.violationLabel
      : parsed.cleanTitle.replace(PPE_PREFIX_RE, "");
  const subtitle =
    parsed.kind === "PPE_ALERT"
      ? [parsed.siteName, parsed.zoneName, parsed.cameraCode].filter(Boolean).join(" · ") || parsed.cleanBody
      : parsed.kind === "DISPATCH"
        ? parsed.directiveNote || parsed.cleanBody
        : parsed.kind === "RESOLVED"
          ? parsed.resolutionNote || parsed.cleanBody
          : parsed.kind === "COMMENT" && parsed.commentAuthor
            ? `${parsed.commentAuthor}: ${parsed.commentText ?? ""}`
            : parsed.cleanBody;
  const time = formatRelativeNotificationTime(item.sentAt || item.createdAt, isVietnamese);
  const urgent = severity === "CRITICAL" || severity === "HIGH";
  const groupLabel =
    parsed.groupCount > 1 ? (isVietnamese ? `${parsed.groupCount} sự cố` : `${parsed.groupCount} incidents`) : "";

  const content = (
    <>
      <span
        aria-hidden="true"
        className={`w-1 shrink-0 self-stretch rounded-full ${accent} ${unread ? "" : "opacity-40"}`}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <span
            className={`line-clamp-2 min-w-0 flex-1 text-[15px] leading-snug ${
              unread ? "font-semibold text-foreground" : "font-medium text-foreground/75"
            }`}
          >
            {title}
          </span>
          {unread && (
            <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary">
              <span className="sr-only">{isVietnamese ? "Chưa đọc" : "Unread"}</span>
            </span>
          )}
        </span>
        {subtitle && <span className="mt-0.5 block truncate text-sm text-muted-foreground">{subtitle}</span>}
        <span className="mt-0.5 block truncate text-sm text-muted-foreground">
          {time}
          {urgent && (
            <span className={severity === "CRITICAL" ? "font-semibold text-danger" : "font-semibold text-warning"}>
              {" · "}
              {t(SEVERITY_META[severity].labelKey)}
            </span>
          )}
          {groupLabel && ` · ${groupLabel}`}
        </span>
      </span>
      {parsed.incidentHref && (
        <ChevronRight className="size-5 shrink-0 self-center text-muted-foreground/60" aria-hidden="true" />
      )}
    </>
  );

  const className = `flex w-full gap-3 rounded-2xl border p-3 text-left transition-shadow active:shadow-nm-pressed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
    unread ? "border-primary/30 bg-background shadow-nm-sm" : "border-border/70 bg-background"
  }`;

  // Thông báo gắn sự cố: chạm là mở thẳng sự cố (luồng: nhận cảnh báo → xem ảnh → xử lý).
  if (parsed.incidentHref) {
    return (
      <Link
        href={parsed.incidentHref}
        onClick={() => {
          if (unread) onMarkAsRead(item.id);
        }}
        className={className}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (unread) onMarkAsRead(item.id);
        onOpenDetail(item);
      }}
      className={className}
    >
      {content}
    </button>
  );
}

function SheetSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

export interface NotificationMobileInboxProps {
  activeTab: NotificationTabKey;
  allowedTabs: NotificationTabKey[];
  onTabChange: (tab: NotificationTabKey) => void;
  items: NotificationItemDto[];
  loading: boolean;
  error?: unknown;
  onRetry: () => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  filter: NotificationFilterState;
  onFilterChange: (next: NotificationFilterState) => void;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  periodFilter: IncidentPeriodFilter;
  today: string;
  onPeriodFilterChange: (next: IncidentPeriodFilter) => void;
  totalCount?: number;
  unreadCount?: number;
  notificationsEnabled: boolean;
  onMarkAsRead: (id: string) => void;
  onMarkAllRead: () => void;
  isMarkingAllRead: boolean;
  onOpenDetail: (item: NotificationItemDto) => void;
  canBroadcast: boolean;
  onOpenBroadcast: () => void;
  onOpenCustomDispatch: () => void;
}

/**
 * Hộp thư thông báo trên mobile (< 768px):
 * chip Tất cả / Chưa đọc / Đã đọc · tìm kiếm + Lọc + ⋯ · danh sách gọn.
 * Các tab khác (Lưu trữ, Cài đặt…) mở từ nút ⋯; trang hiển thị nội dung tab bên dưới.
 */
export function NotificationMobileInbox({
  activeTab,
  allowedTabs,
  onTabChange,
  items,
  loading,
  error,
  onRetry,
  page,
  totalPages,
  onPageChange,
  filter,
  onFilterChange,
  hasActiveFilters,
  onResetFilters,
  periodFilter,
  today,
  onPeriodFilterChange,
  totalCount,
  unreadCount,
  notificationsEnabled,
  onMarkAsRead,
  onMarkAllRead,
  isMarkingAllRead,
  onOpenDetail,
  canBroadcast,
  onOpenBroadcast,
  onOpenCustomDispatch,
}: NotificationMobileInboxProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const tabLabels: Record<NotificationTabKey, string> = {
    inbox: isVietnamese ? "Hộp thư" : "Inbox",
    archive: t("notifications.tabs.archive"),
    preferences: isVietnamese ? "Cài đặt nhận tin" : "Notification settings",
    templates: t("notifications.tabs.templates"),
    emailLogs: t("notifications.tabs.emailLogs"),
  };

  // Tab khác hộp thư: chỉ hiện nút quay lại, nội dung tab do trang hiển thị bên dưới.
  if (activeTab !== "inbox") {
    return (
      <div className="space-y-1">
        <h1 className="sr-only">{tabLabels[activeTab]}</h1>
        <button
          type="button"
          onClick={() => onTabChange("inbox")}
          className="-ml-2 inline-flex h-11 items-center gap-1 rounded-full pl-1 pr-3 text-[15px] font-semibold text-primary active:bg-primary/10"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
          {tabLabels.inbox}
        </button>
        <p className="text-lg font-bold text-foreground" aria-hidden="true">
          {tabLabels[activeTab]}
        </p>
      </div>
    );
  }

  const readCount =
    totalCount !== undefined && unreadCount !== undefined ? Math.max(0, totalCount - unreadCount) : undefined;
  const activeFilterCount = [periodFilter.mode !== "all", filter.severity].filter(Boolean).length;

  const periodOptions: { mode: IncidentPeriodMode; label: string }[] = [
    { mode: "all", label: isVietnamese ? "Tất cả" : "All time" },
    { mode: "day", label: isVietnamese ? "Hôm nay" : "Today" },
    { mode: "week", label: isVietnamese ? "Tuần này" : "This week" },
    { mode: "month", label: isVietnamese ? "Tháng này" : "This month" },
  ];
  const severityOptions: { value?: NotificationSeverity; label: string }[] = [
    { value: undefined, label: isVietnamese ? "Tất cả" : "All" },
    { value: "CRITICAL", label: t("notifications.severity.CRITICAL") },
    { value: "HIGH", label: t("notifications.severity.HIGH") },
    { value: "MEDIUM", label: t("notifications.severity.MEDIUM") },
    { value: "NORMAL", label: t("notifications.severity.NORMAL") },
    { value: "LOW", label: t("notifications.severity.LOW") },
  ];

  const moreActions: { key: string; label: string; icon: ReactNode; onSelect: () => void; disabled?: boolean }[] = [];
  if ((unreadCount ?? 0) > 0) {
    moreActions.push({
      key: "mark-all",
      label: t("notifications.actions.markAllRead"),
      icon: <CheckCheck className="size-5" />,
      onSelect: onMarkAllRead,
      disabled: isMarkingAllRead,
    });
  }
  if (allowedTabs.includes("archive")) {
    moreActions.push({ key: "archive", label: tabLabels.archive, icon: <Archive className="size-5" />, onSelect: () => onTabChange("archive") });
  }
  moreActions.push({ key: "preferences", label: tabLabels.preferences, icon: <BellRing className="size-5" />, onSelect: () => onTabChange("preferences") });
  if (allowedTabs.includes("templates")) {
    moreActions.push({ key: "templates", label: tabLabels.templates, icon: <FileText className="size-5" />, onSelect: () => onTabChange("templates") });
  }
  if (allowedTabs.includes("emailLogs")) {
    moreActions.push({ key: "emailLogs", label: tabLabels.emailLogs, icon: <Mail className="size-5" />, onSelect: () => onTabChange("emailLogs") });
  }
  if (canBroadcast && notificationsEnabled) {
    moreActions.push(
      { key: "broadcast", label: isVietnamese ? "Phát lệnh khẩn cấp" : "Emergency broadcast", icon: <Megaphone className="size-5" />, onSelect: onOpenBroadcast },
      { key: "custom", label: isVietnamese ? "Gửi thông báo tùy chỉnh" : "Send custom notification", icon: <Send className="size-5" />, onSelect: onOpenCustomDispatch },
    );
  }

  const setReadFilter = (isRead: boolean | undefined) => onFilterChange({ ...filter, isRead });
  const goToPage = (next: number) => {
    onPageChange(next);
    document.querySelector<HTMLElement>("[data-page-scroll]")?.scrollTo({ top: 0 });
  };

  return (
    <div className="space-y-3">
      <h1 className="sr-only">{t("nav.notifications")}</h1>

      {!notificationsEnabled && (
        <p role="status" className="flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm text-foreground">
          <BellOff className="size-4.5 shrink-0 text-warning" aria-hidden="true" />
          {isVietnamese ? "Hệ thống thông báo đang tạm dừng." : "Notifications are paused."}
        </p>
      )}

      <FilterChipRow label={isVietnamese ? "Trạng thái đọc" : "Read status"}>
        <FilterChip active={filter.isRead === undefined} onClick={() => setReadFilter(undefined)} count={totalCount}>
          {t("notifications.filter.all")}
        </FilterChip>
        <FilterChip active={filter.isRead === false} onClick={() => setReadFilter(false)} count={unreadCount}>
          {t("notifications.filter.unread")}
        </FilterChip>
        <FilterChip active={filter.isRead === true} onClick={() => setReadFilter(true)} count={readCount}>
          {t("notifications.filter.read")}
        </FilterChip>
      </FilterChipRow>

      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            enterKeyHint="search"
            value={filter.search}
            onChange={(event) => onFilterChange({ ...filter, search: event.target.value })}
            placeholder={isVietnamese ? "Tìm thông báo…" : "Search notifications…"}
            aria-label={isVietnamese ? "Tìm thông báo" : "Search notifications"}
            className="h-11 w-full rounded-full border border-border/80 bg-background pl-10 pr-11 text-base text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 [&::-webkit-search-cancel-button]:hidden"
          />
          {filter.search && (
            <button
              type="button"
              onClick={() => onFilterChange({ ...filter, search: "" })}
              aria-label={isVietnamese ? "Xóa tìm kiếm" : "Clear search"}
              className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          aria-haspopup="dialog"
          aria-label={
            activeFilterCount > 0
              ? isVietnamese
                ? `Bộ lọc, đang bật ${activeFilterCount}`
                : `Filters, ${activeFilterCount} active`
              : isVietnamese
                ? "Bộ lọc"
                : "Filters"
          }
          className={`relative flex size-11 shrink-0 items-center justify-center rounded-full border transition-colors ${
            activeFilterCount > 0
              ? "border-primary/60 bg-primary/10 text-primary"
              : "border-border/80 bg-background text-foreground"
          }`}
        >
          <SlidersHorizontal className="size-5" aria-hidden="true" />
          {activeFilterCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground"
            >
              {activeFilterCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          aria-label={isVietnamese ? "Thao tác khác" : "More actions"}
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border/80 bg-background text-foreground"
        >
          <MoreHorizontal className="size-5" aria-hidden="true" />
        </button>
      </div>

      {loading && items.length === 0 ? (
        <ul aria-busy="true" className="space-y-2.5">
          {[0, 1, 2, 3, 4].map((index) => (
            <li key={index} className="flex animate-pulse gap-3 rounded-2xl border border-border/60 p-3">
              <span className="w-1 self-stretch rounded-full bg-foreground/10" />
              <span className="flex-1 space-y-2 py-0.5">
                <span className="block h-4 w-3/4 rounded bg-foreground/10" />
                <span className="block h-3.5 w-1/2 rounded bg-foreground/10" />
              </span>
            </li>
          ))}
        </ul>
      ) : error && items.length === 0 ? (
        <div role="alert" className="space-y-3 rounded-2xl border border-danger/30 bg-danger/5 p-4 text-center">
          <p className="text-[15px] font-medium text-foreground">
            {isVietnamese ? "Không tải được thông báo." : "Could not load notifications."}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold text-primary"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            {isVietnamese ? "Thử lại" : "Try again"}
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
          <BellRing className="size-10 text-muted-foreground/60" aria-hidden="true" />
          <p className="text-base font-semibold text-foreground">
            {isVietnamese ? "Không có thông báo nào" : "No notifications"}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="h-11 rounded-full border border-border px-4 text-sm font-semibold text-primary"
            >
              {isVietnamese ? "Xóa bộ lọc" : "Clear filters"}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <ul aria-label={isVietnamese ? "Danh sách thông báo" : "Notification list"} className="space-y-2.5">
            {items.map((item) => (
              <li key={item.id}>
                <NotificationMobileItem item={item} onMarkAsRead={onMarkAsRead} onOpenDetail={onOpenDetail} />
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <nav aria-label={isVietnamese ? "Phân trang" : "Pagination"} className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                aria-label={isVietnamese ? "Trang trước" : "Previous page"}
                className="flex size-11 items-center justify-center rounded-full border border-border/80 bg-background text-foreground disabled:opacity-40"
              >
                <ChevronLeft className="size-5" aria-hidden="true" />
              </button>
              <span className="text-sm text-muted-foreground">
                {isVietnamese ? `Trang ${page}/${totalPages}` : `Page ${page} of ${totalPages}`}
              </span>
              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                aria-label={isVietnamese ? "Trang sau" : "Next page"}
                className="flex size-11 items-center justify-center rounded-full border border-border/80 bg-background text-foreground disabled:opacity-40"
              >
                <ChevronRight className="size-5" aria-hidden="true" />
              </button>
            </nav>
          )}
        </div>
      )}

      <BottomSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title={isVietnamese ? "Bộ lọc" : "Filters"}
        closeLabel={isVietnamese ? "Đóng" : "Close"}
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                onFilterChange({ ...filter, severity: undefined });
                onPeriodFilterChange({ mode: "all", anchorDate: today, customStart: today, customEnd: today });
              }}
              className="h-12 flex-1 rounded-xl border border-border/80 text-[15px] font-semibold text-foreground"
            >
              {isVietnamese ? "Đặt lại" : "Reset"}
            </button>
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="h-12 flex-1 rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground"
            >
              {isVietnamese ? "Xem kết quả" : "Show results"}
            </button>
          </div>
        }
      >
        <div className="space-y-5 pt-2">
          <SheetSection title={isVietnamese ? "Thời gian" : "Period"}>
            <FilterChipRow label={isVietnamese ? "Thời gian" : "Period"}>
              {periodOptions.map((option) => (
                <FilterChip
                  key={option.mode}
                  active={periodFilter.mode === option.mode}
                  onClick={() =>
                    onPeriodFilterChange({
                      mode: option.mode,
                      anchorDate: today,
                      customStart: periodFilter.customStart || today,
                      customEnd: periodFilter.customEnd || today,
                    })
                  }
                >
                  {option.label}
                </FilterChip>
              ))}
              {(periodFilter.mode === "year" || periodFilter.mode === "custom") && (
                <FilterChip active onClick={() => undefined}>
                  {periodFilter.mode === "year"
                    ? isVietnamese ? "Năm nay" : "This year"
                    : isVietnamese ? "Khoảng tự chọn" : "Custom range"}
                </FilterChip>
              )}
            </FilterChipRow>
          </SheetSection>

          <SheetSection title={isVietnamese ? "Mức độ" : "Severity"}>
            <FilterChipRow label={isVietnamese ? "Mức độ" : "Severity"}>
              {severityOptions.map((option) => (
                <FilterChip
                  key={option.value ?? "all"}
                  active={filter.severity === option.value}
                  onClick={() => onFilterChange({ ...filter, severity: option.value })}
                >
                  {option.label}
                </FilterChip>
              ))}
            </FilterChipRow>
          </SheetSection>
        </div>
      </BottomSheet>

      <BottomSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title={isVietnamese ? "Thao tác khác" : "More actions"}
        closeLabel={isVietnamese ? "Đóng" : "Close"}
      >
        <ul className="space-y-1 pt-1">
          {moreActions.map((action) => (
            <li key={action.key}>
              <button
                type="button"
                disabled={action.disabled}
                onClick={() => {
                  setMoreOpen(false);
                  action.onSelect();
                }}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] font-medium text-foreground active:bg-foreground/5 disabled:opacity-50"
              >
                <span className="text-muted-foreground">{action.icon}</span>
                {action.label}
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>
    </div>
  );
}
