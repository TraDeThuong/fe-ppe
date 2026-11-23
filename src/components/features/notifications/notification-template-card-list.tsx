"use client";

import { AlertTriangle, FileText, Lock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import { getChannelDisplay } from "./notification-meta-badges";
import {
  TEMPLATE_CATEGORY_STYLES,
  type MergedNotificationTemplate,
} from "./notification-template-helpers";
import type { SoundPreset } from "@/services/sound.service";

export interface NotificationTemplateCardListProps {
  templates: MergedNotificationTemplate[];
  selectedCode: string | null;
  onSelect: (template: MergedNotificationTemplate) => void;
  onPlaySound?: (preset: SoundPreset) => void;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
  className?: string;
}

export function NotificationTemplateCardList({
  templates,
  selectedCode,
  onSelect,
  onPlaySound,
  isLoading = false,
  error,
  onRetry,
  hasActiveFilters = false,
  onResetFilters,
  className = "",
}: NotificationTemplateCardListProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  if (isLoading && templates.length === 0) {
    return (
      <div className={`space-y-3.5 p-1 ${className}`} aria-busy="true">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-2xl bg-surface p-4 shadow-nm-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="h-5 w-36 animate-pulse rounded-lg bg-background/80 shadow-nm-inset" />
              <div className="h-5 w-16 animate-pulse rounded-full bg-muted/35" />
            </div>
            <div className="mt-3 h-4 w-3/4 animate-pulse rounded-md bg-muted/40" />
            <div className="mt-2 h-3 w-5/6 animate-pulse rounded-md bg-muted/25" />
            <div className="mt-3.5 flex items-center justify-between pt-1">
              <div className="h-5 w-28 animate-pulse rounded-full bg-muted/30" />
              <div className="h-6 w-20 animate-pulse rounded-xl bg-background/70 shadow-nm-inset" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error && templates.length === 0) {
    return (
      <div
        className={`flex min-h-[280px] flex-col items-center justify-center rounded-2xl bg-background/80 p-6 text-center shadow-nm-inset ${className}`}
      >
        <div className="mb-3.5 flex size-12 items-center justify-center rounded-2xl bg-surface text-danger shadow-nm-sm">
          <AlertTriangle className="size-5" />
        </div>
        <h3 className="text-sm font-extrabold tracking-tight text-foreground">
          {isVietnamese
            ? "Không thể tải danh sách mẫu thông báo"
            : "Failed to load notification templates"}
        </h3>
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
          {isVietnamese
            ? "Đã xảy ra lỗi khi kết nối máy chủ. Vui lòng thử lại."
            : "An error occurred while fetching templates. Please try again."}
        </p>
        {onRetry && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="mt-4 gap-1.5 rounded-xl bg-surface font-bold shadow-nm-sm transition-transform active:scale-95 active:shadow-nm-inset"
          >
            <RotateCcw className="size-3.5" />
            <span>{isVietnamese ? "Thử lại" : "Retry"}</span>
          </Button>
        )}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div
        className={`flex min-h-[280px] flex-col items-center justify-center rounded-2xl bg-background/80 p-6 text-center shadow-nm-inset ${className}`}
      >
        <div className="mb-3.5 flex size-12 items-center justify-center rounded-2xl bg-surface text-primary shadow-nm-sm">
          <FileText className="size-5" />
        </div>
        <h3 className="text-sm font-extrabold tracking-tight text-foreground">
          {isVietnamese
            ? "Không tìm thấy mẫu thông báo phù hợp"
            : "No matching notification templates"}
        </h3>
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
          {hasActiveFilters
            ? isVietnamese
              ? "Thử thay đổi từ khóa tìm kiếm hoặc đặt lại bộ lọc lĩnh vực."
              : "Try adjusting your search query or clearing active filters."
            : isVietnamese
              ? "Chưa có mẫu thông báo nào trong danh mục."
              : "No notification templates are available yet."}
        </p>
        {hasActiveFilters && onResetFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="mt-4 gap-1.5 rounded-xl bg-surface font-bold shadow-nm-sm transition-transform active:scale-95 active:shadow-nm-inset"
          >
            <RotateCcw className="size-3.5" />
            <span>{isVietnamese ? "Xóa bộ lọc" : "Reset Filters"}</span>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      role="listbox"
      aria-label={
        isVietnamese ? "Danh sách mẫu thông báo" : "Notification templates list"
      }
      className={`space-y-2.5 p-1.5 xl:max-h-[min(820px,calc(100vh-140px))] xl:overflow-y-auto xl:pr-2 ${className}`}
    >
      {templates.map((tpl) => {
        const isSelected = tpl.code === selectedCode;
        const isActive = tpl.status !== "INACTIVE";
        const channelInfo = getChannelDisplay(tpl.channel);
        const ChannelIcon = channelInfo.icon;
        const categoryStyle = TEMPLATE_CATEGORY_STYLES[tpl.category];

        const cardSurfaceClass = isSelected
          ? "scale-[0.99] bg-background shadow-nm-inset"
          : "bg-surface shadow-nm-sm hover:-translate-y-0.5 active:scale-[0.99] active:shadow-nm-inset";

        const sourceShortText = tpl.isSystem
          ? tpl.isVirtualDefault
            ? null
            : isVietnamese
              ? "Đã sửa"
              : "Edited"
          : isVietnamese
            ? "Tùy chỉnh"
            : "Custom";

        return (
          <article
            key={tpl.code}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            data-testid={`template-card-${tpl.code}`}
            onClick={() => onSelect(tpl)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(tpl);
              }
            }}
            className={[
              "group relative flex min-h-[78px] cursor-pointer items-center overflow-hidden rounded-2xl px-3.5 py-3.5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              cardSurfaceClass,
              !isActive ? "opacity-65" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {/* Left Category / Active Accent Strip */}
            <span
              aria-hidden="true"
              className={`mr-3 self-stretch w-1 shrink-0 rounded-full transition-all duration-200 ${
                isActive ? categoryStyle.accentBarClass : "bg-muted-foreground/35"
              } ${
                isSelected
                  ? "opacity-100 shadow-[0_0_8px_color-mix(in_srgb,var(--primary)_55%,transparent)]"
                  : "opacity-45 group-hover:opacity-90"
              }`}
            />

            <div className="min-w-0 flex-1 space-y-2">
              {/* Row 1: Title + Inactive indicator (only when muted) */}
              <div className="flex items-center justify-between gap-2">
                <h3
                  className={`line-clamp-1 text-[13px] font-extrabold tracking-tight transition-colors group-hover:text-primary ${
                    isSelected ? "text-primary" : "text-foreground"
                  }`}
                >
                  {tpl.name}
                </h3>

                {!isActive && (
                  <span className="shrink-0 rounded-full bg-background/80 px-2 py-0.5 text-[9.5px] font-semibold text-muted-foreground shadow-nm-inset">
                    {isVietnamese ? "Tạm ngừng" : "Inactive"}
                  </span>
                )}
              </div>

              {/* Row 2: Code + Channel + Optional Custom/Edited Tag */}
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-background/85 px-2 py-0.5 font-mono text-[10.5px] font-bold tracking-tight text-primary shadow-nm-inset">
                    {tpl.isSystem && (
                      <Lock className="size-2.5 shrink-0 text-primary/75" />
                    )}
                    <span className="truncate">{tpl.code}</span>
                  </span>

                  <span className="inline-flex items-center gap-1 rounded-md bg-background/60 px-2 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
                    <ChannelIcon className="size-2.5 text-primary/80" />
                    <span>{channelInfo.label}</span>
                  </span>
                </div>

                {sourceShortText && (
                  <span className="shrink-0 rounded-full bg-background/75 px-2 py-0.5 text-[9.5px] font-semibold text-muted-foreground shadow-nm-inset">
                    {sourceShortText}
                  </span>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}