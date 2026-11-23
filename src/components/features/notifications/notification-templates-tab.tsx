"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Columns2,
  Edit,
  Eye,
  FileText,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Send,
  Table2,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import { Table, TableContent, TablePagination } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshIconButton } from "@/components/ui/refresh-action";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "@/components/ui/segmented-control";
import { useNotificationTemplatesCatalog } from "@/hooks/notifications";
import { useNotificationSound } from "@/hooks/notifications/use-notification-sound";
import { useDebounce } from "@/hooks/use-debounce";
import { useLocale } from "@/providers/locale-provider";
import {
  TEMPLATE_CATEGORY_LABELS,
  type TemplateCategory,
} from "./notification-predefined-data";
import {
  mergeNotificationTemplates,
  type MergedNotificationTemplate,
} from "./notification-template-helpers";
import { NotificationTemplateCardList } from "./notification-template-card-list";
import { NotificationTemplateDetailPanel } from "./notification-template-detail-panel";
import type { NotificationTemplateItemDto } from "@/types";

export type TemplateViewMode = "table" | "split";

const TEMPLATE_VIEW_MODE_STORAGE_KEY = "ppe.notifications.templates.view-mode.v1";

export interface NotificationTemplatesTabProps {
  onPreviewTemplate?: (template: NotificationTemplateItemDto) => void;
  onTestSendTemplate?: (template: NotificationTemplateItemDto) => void;
  onCreateTemplate?: () => void;
  onEditTemplate?: (template: NotificationTemplateItemDto) => void;
  onDeleteTemplate?: (template: NotificationTemplateItemDto, isSystem: boolean) => void;
  defaultViewMode?: TemplateViewMode;
  className?: string;
}

export function NotificationTemplatesTab({
  onPreviewTemplate,
  onTestSendTemplate,
  onCreateTemplate,
  onEditTemplate,
  onDeleteTemplate,
  defaultViewMode,
  className = "",
}: NotificationTemplatesTabProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const { playPreset } = useNotificationSound();

  const [viewMode, setViewMode] = useState<TemplateViewMode>(
    defaultViewMode ?? "table",
  );
  const [viewModeHydrated, setViewModeHydrated] = useState(
    Boolean(defaultViewMode),
  );
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<"ALL" | "SYSTEM" | "CUSTOM">(
    "ALL",
  );
  const debouncedSearch = useDebounce(search, 350);

  // Split-view master-detail state (keyed by template.code so first-time DB save of sys-* keeps selection)
  const [selectedTemplateCode, setSelectedTemplateCode] = useState<string | null>(
    null,
  );
  const [detailMode, setDetailMode] = useState<"view" | "edit">("view");
  const [isEditorDirty, setIsEditorDirty] = useState(false);
  const [pendingSwitchCode, setPendingSwitchCode] = useState<string | null>(
    null,
  );
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // Restore saved view mode preference from localStorage
  useEffect(() => {
    if (defaultViewMode) return;
    try {
      const saved = localStorage.getItem(TEMPLATE_VIEW_MODE_STORAGE_KEY);
      if (saved === "table" || saved === "split") {
        setViewMode(saved);
      }
    } catch {
      // Ignore storage errors
    } finally {
      setViewModeHydrated(true);
    }
  }, [defaultViewMode]);

  useEffect(() => {
    if (!viewModeHydrated || defaultViewMode) return;
    try {
      localStorage.setItem(TEMPLATE_VIEW_MODE_STORAGE_KEY, viewMode);
    } catch {
      // Ignore storage quota errors
    }
  }, [viewModeHydrated, viewMode, defaultViewMode]);

  // Lấy dữ liệu từ Backend
  const {
    data: backendData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useNotificationTemplatesCatalog();
  const backendTemplates = backendData || [];

  // Ghép danh sách mẫu hệ thống chuẩn với backend
  const mergedTemplates = useMemo<MergedNotificationTemplate[]>(
    () => mergeNotificationTemplates(backendTemplates, isVietnamese),
    [backendTemplates, isVietnamese],
  );

  // Bộ lọc theo Search, Category và Type
  const filteredTemplates = useMemo(() => {
    return mergedTemplates.filter((item) => {
      // 1. Search match
      if (debouncedSearch.trim()) {
        const query = debouncedSearch.toLowerCase();
        const matches =
          item.code.toLowerCase().includes(query) ||
          item.name.toLowerCase().includes(query) ||
          (item.subjectTemplate &&
            item.subjectTemplate.toLowerCase().includes(query)) ||
          (item.description &&
            item.description.toLowerCase().includes(query));
        if (!matches) return false;
      }

      // 2. Type match
      if (selectedType === "SYSTEM" && !item.isSystem) return false;
      if (selectedType === "CUSTOM" && item.isSystem) return false;

      // 3. Category match
      if (selectedCategory !== "ALL" && item.category !== selectedCategory)
        return false;

      return true;
    });
  }, [mergedTemplates, debouncedSearch, selectedType, selectedCategory]);

  const selectedTemplate = useMemo<MergedNotificationTemplate | null>(() => {
    if (filteredTemplates.length === 0) return null;
    if (selectedTemplateCode) {
      const exact = filteredTemplates.find(
        (tpl) => tpl.code === selectedTemplateCode,
      );
      if (exact) return exact;
    }
    return filteredTemplates[0] ?? null;
  }, [filteredTemplates, selectedTemplateCode]);

  const pendingSwitchTemplate = useMemo<MergedNotificationTemplate | null>(
    () =>
      pendingSwitchCode
        ? filteredTemplates.find((tpl) => tpl.code === pendingSwitchCode) ?? null
        : null,
    [filteredTemplates, pendingSwitchCode],
  );

  const systemCount = mergedTemplates.filter((tpl) => tpl.isSystem).length;
  const customCount = mergedTemplates.filter((tpl) => !tpl.isSystem).length;
  const hasActiveFilters = Boolean(
    search.trim() || selectedCategory !== "ALL" || selectedType !== "ALL",
  );
  const canEditTemplates = Boolean(onEditTemplate);

  const viewModeOptions = useMemo<SegmentedControlOption<TemplateViewMode>[]>(
    () => [
      {
        value: "table",
        label: isVietnamese ? "Bảng" : "Table",
        icon: <Table2 className="size-3.5" aria-hidden="true" />,
      },
      {
        value: "split",
        label: isVietnamese ? "Thẻ & Chi tiết" : "Cards & Detail",
        icon: <Columns2 className="size-3.5" aria-hidden="true" />,
      },
    ],
    [isVietnamese],
  );

  const handleViewModeChange = (nextMode: TemplateViewMode) => {
    setViewMode(nextMode);
    if (nextMode === "table") {
      setDetailMode("view");
      setIsEditorDirty(false);
      setPendingSwitchCode(null);
      setMobileDetailOpen(false);
    } else if (!selectedTemplateCode && filteredTemplates[0]) {
      setSelectedTemplateCode(filteredTemplates[0].code);
    }
  };

  const handleSelectCard = (template: MergedNotificationTemplate) => {
    const currentCode = selectedTemplate?.code ?? null;
    if (template.code === currentCode) {
      if (
        typeof window !== "undefined" &&
        !window.matchMedia("(min-width: 1280px)").matches
      ) {
        setMobileDetailOpen(true);
      }
      return;
    }

    if (detailMode === "edit" && isEditorDirty) {
      setPendingSwitchCode(template.code);
      if (
        typeof window !== "undefined" &&
        !window.matchMedia("(min-width: 1280px)").matches
      ) {
        setMobileDetailOpen(true);
      }
      return;
    }

    setSelectedTemplateCode(template.code);
    setDetailMode("view");
    setIsEditorDirty(false);
    setPendingSwitchCode(null);

    if (
      typeof window !== "undefined" &&
      !window.matchMedia("(min-width: 1280px)").matches
    ) {
      setMobileDetailOpen(true);
    }
  };

  const handleConfirmSwitch = () => {
    if (!pendingSwitchCode) return;
    setSelectedTemplateCode(pendingSwitchCode);
    setDetailMode("view");
    setIsEditorDirty(false);
    setPendingSwitchCode(null);
  };

  const handleResetFilters = () => {
    setSearch("");
    setSelectedCategory("ALL");
    setSelectedType("ALL");
  };

  return (
    <div
      className={`group/table-shell relative overflow-hidden rounded-2xl border border-white/80 bg-surface/95 p-3.5 shadow-[12px_12px_28px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light)] transition-all duration-500 dark:border-white/[0.07] dark:bg-card/95 sm:rounded-3xl sm:p-5 ${className}`}
    >
      {/* Ambient Radial Aura (Primary & Accent blend) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 -right-28 h-64 w-64 rounded-full bg-gradient-to-br from-primary/15 via-accent/10 to-transparent blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -left-28 h-64 w-64 rounded-full bg-gradient-to-tr from-accent/15 via-primary/5 to-transparent blur-3xl"
      />

      {/* Specular Metallic Top Rim */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/60 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-24 top-[1.5px] h-[1px] bg-gradient-to-r from-transparent via-accent/40 to-transparent"
      />

      {/* SHARED HEADER & FILTER CONTROLS */}
      <div className="relative space-y-4 pb-4">
        {/* 1. HEADER TOOLBAR */}
        <div className="relative flex flex-col gap-3.5 pb-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Engraved Divider */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-border/80 to-transparent dark:via-white/[0.08]"
          />

          <div className="flex items-center gap-3.5">
            {/* Extruded Neumorphic Medallion */}
            <div className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-gradient-to-br from-surface-elevated to-surface shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)] dark:border-white/10 dark:from-card dark:to-background sm:size-12">
              <div className="absolute inset-1 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10" />
              <FileText className="relative size-5 text-primary drop-shadow-[0_2px_6px_hsl(var(--primary)/0.35)]" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
                  {isVietnamese
                    ? "Quản Lý Mẫu Thông Báo & Cảnh Báo"
                    : "Notification & Alert Templates"}
                </h2>
                <Badge
                  variant="outline"
                  size="sm"
                  className="border-primary/20 bg-primary/[0.06] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-primary shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]"
                >
                  {filteredTemplates.length}{" "}
                  {isVietnamese ? "mẫu" : "templates"}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {isVietnamese
                  ? "Bao gồm các mẫu hệ thống cố định chuẩn công trường và các mẫu do người dùng tùy biến"
                  : "Standard site safety system templates and custom user-defined templates"}
              </p>
            </div>
          </div>

          {/* View Mode Switcher + Refresh + Create Button */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
            <SegmentedControl<TemplateViewMode>
              options={viewModeOptions}
              value={viewMode}
              onValueChange={handleViewModeChange}
              aria-label={
                isVietnamese
                  ? "Chế độ hiển thị mẫu thông báo"
                  : "Notification template view mode"
              }
              size="sm"
            />

            <RefreshIconButton
              onRefresh={() => refetch()}
              isRefreshing={isFetching}
              title={isVietnamese ? "Làm mới danh sách" : "Refresh templates"}
              ariaLabel={
                isVietnamese ? "Làm mới danh sách" : "Refresh templates"
              }
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/70 bg-surface text-foreground shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] hover:border-primary/30 hover:text-primary active:shadow-[inset_2px_2px_4px_var(--shadow-dark)] disabled:opacity-50 dark:border-white/10 dark:bg-card"
              iconClassName="size-4"
            />

            {onCreateTemplate && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={onCreateTemplate}
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary/90 px-4 text-xs font-bold text-primary-foreground shadow-[0_4px_14px_hsl(var(--primary)/0.35)] transition-all hover:brightness-110 active:scale-[0.98]"
              >
                <Plus className="size-4" />
                <span>
                  {isVietnamese ? "Tạo mẫu tùy chỉnh" : "New Custom Template"}
                </span>
              </Button>
            )}
          </div>
        </div>

        {/* 2. THANH LỌC LOẠI MẪU (SEGMENTED DOCK) & TÌM KIẾM */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Tactile Recessed Segmented Control */}
          <div className="inline-flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-black/[0.04] bg-background/60 p-1.5 shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_var(--shadow-light)] dark:border-white/[0.04]">
            <button
              type="button"
              onClick={() => setSelectedType("ALL")}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                selectedType === "ALL"
                  ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-[3px_3px_8px_var(--shadow-dark),0_2px_10px_hsl(var(--primary)/0.3)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isVietnamese ? "Tất cả" : "All"}{" "}
              <span className="font-mono opacity-85">
                ({mergedTemplates.length})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedType("SYSTEM")}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                selectedType === "SYSTEM"
                  ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-[3px_3px_8px_var(--shadow-dark),0_2px_10px_hsl(var(--primary)/0.3)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Lock className="size-3" />
              <span>{isVietnamese ? "Mẫu Hệ thống" : "System Built-in"}</span>
              <span className="font-mono opacity-85">({systemCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedType("CUSTOM")}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                selectedType === "CUSTOM"
                  ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-[3px_3px_8px_var(--shadow-dark),0_2px_10px_hsl(var(--primary)/0.3)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{isVietnamese ? "Mẫu Tự tạo" : "User Custom"}</span>
              <span className="font-mono opacity-85">({customCount})</span>
            </button>
          </div>

          {/* Recessed Search Input Well */}
          <div className="relative min-w-[250px] sm:min-w-[280px]">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-primary/70" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                isVietnamese
                  ? "Tìm theo mã code, tên mẫu..."
                  : "Search by code or title..."
              }
              className="w-full rounded-2xl border border-black/[0.05] bg-background/75 py-2 pr-8 pl-10 text-xs font-medium text-foreground shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_var(--shadow-light)] outline-none transition-all placeholder:text-muted-foreground/70 focus:border-primary/40 dark:border-white/[0.06]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute top-1/2 right-2.5 flex size-5 -translate-y-1/2 items-center justify-center rounded-lg bg-surface text-muted-foreground shadow-[2px_2px_4px_var(--shadow-dark)] hover:text-primary"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>

        {/* 3. CATEGORY FILTER CHIPS (TACTILE PILLS) */}
        <div className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-black/[0.03] bg-background/45 px-3 py-2 text-xs shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] dark:border-white/[0.04]">
          <span className="mr-1 shrink-0 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {isVietnamese ? "Lĩnh vực:" : "Domain:"}
          </span>

          <button
            type="button"
            onClick={() => setSelectedCategory("ALL")}
            className={`shrink-0 rounded-xl px-2.5 py-1 text-[11px] font-semibold transition-all ${
              selectedCategory === "ALL"
                ? "border border-primary/25 bg-surface text-primary shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] dark:bg-card"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {isVietnamese ? "Toàn bộ" : "All Domains"}
          </button>

          {(Object.keys(TEMPLATE_CATEGORY_LABELS) as TemplateCategory[]).map(
            (cat) => {
              const info = TEMPLATE_CATEGORY_LABELS[cat];
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 rounded-xl px-2.5 py-1 text-[11px] font-semibold transition-all ${
                    isSelected
                      ? "border border-primary/25 bg-surface text-primary shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] dark:bg-card"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isVietnamese ? info.vi : info.en}
                </button>
              );
            },
          )}
        </div>
      </div>

      {/* VIEW MODE BODY */}
      {viewMode === "table" ? (
        <Table
          className="relative"
          surface="embedded"
          hideTopHighlight
          data={filteredTemplates}
          columns={[
            {
              id: "code",
              header: isVietnamese ? "Mã mẫu (Code)" : "Code",
              accessorFn: (tpl) => tpl.code,
              enableSorting: true,
              cell: ({ row }) => {
                const tpl = row.original;
                return (
                  <div className="inline-flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/[0.06] px-2.5 py-1 font-mono text-xs font-bold text-primary shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                    {tpl.isSystem && (
                      <Lock className="size-3 shrink-0 text-primary/70" />
                    )}
                    <span>{tpl.code}</span>
                  </div>
                );
              },
            },
            {
              id: "name",
              header: isVietnamese
                ? "Tên hiển thị & Lĩnh vực"
                : "Title & Domain",
              accessorFn: (tpl) => tpl.name,
              enableSorting: true,
              cell: ({ row }) => {
                const tpl = row.original;
                return (
                  <div className="py-0.5">
                    <p className="text-xs font-bold text-foreground sm:text-[13px]">
                      {tpl.name}
                    </p>
                    {tpl.description && (
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                        {tpl.description}
                      </p>
                    )}
                  </div>
                );
              },
            },
            {
              id: "channel",
              header: isVietnamese ? "Kênh" : "Channel",
              accessorFn: (tpl) => tpl.channel,
              enableSorting: true,
              cell: ({ row }) => {
                const tpl = row.original;
                return (
                  <div>
                    <span className="inline-flex items-center rounded-lg border border-accent/40 bg-accent/15 px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-foreground">
                      {tpl.channel}
                    </span>
                  </div>
                );
              },
            },
            {
              id: "soundPreset",
              header: isVietnamese ? "Âm thanh" : "Audio Cue",
              accessorFn: (tpl) => tpl.soundPreset,
              enableSorting: true,
              cell: ({ row }) => {
                const tpl = row.original;
                return (
                  <div>
                    <button
                      type="button"
                      onClick={() => playPreset(tpl.soundPreset || "info")}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/70 bg-surface px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] transition-all hover:border-primary/30 hover:text-primary active:shadow-[inset_2px_2px_4px_var(--shadow-dark)] dark:border-white/10 dark:bg-card"
                      title={
                        isVietnamese
                          ? "Bấm để nghe thử âm thanh"
                          : "Click to test sound"
                      }
                    >
                      <Volume2 className="size-3.5 text-primary" />
                      <span className="capitalize">
                        {tpl.soundPreset || "info"}
                      </span>
                    </button>
                  </div>
                );
              },
            },
            {
              id: "subjectTemplate",
              header: isVietnamese ? "Tiêu đề khuôn mẫu" : "Subject Template",
              accessorFn: (tpl) => tpl.subjectTemplate,
              enableSorting: true,
              cell: ({ row }) => {
                const tpl = row.original;
                return (
                  <div className="max-w-xs truncate text-xs font-medium text-muted-foreground">
                    {tpl.subjectTemplate || "—"}
                  </div>
                );
              },
            },
            {
              id: "isSystem",
              header: isVietnamese ? "Phân loại" : "Type",
              accessorFn: (tpl) => tpl.isSystem,
              enableSorting: true,
              cell: ({ row }) => {
                const tpl = row.original;
                return (
                  <div className="text-center">
                    <Badge
                      variant={tpl.isSystem ? "outline" : "secondary"}
                      size="sm"
                      shape="pill"
                      className={`px-2.5 text-[10px] font-semibold ${
                        tpl.isSystem
                          ? "border-primary/25 bg-primary/[0.06] text-primary"
                          : "border-accent/50 bg-accent/25 text-foreground"
                      }`}
                    >
                      {tpl.isSystem
                        ? isVietnamese
                          ? "Hệ thống"
                          : "System"
                        : isVietnamese
                          ? "Tùy chỉnh"
                          : "Custom"}
                    </Badge>
                  </div>
                );
              },
            },
            {
              id: "actions",
              header: isVietnamese ? "Thao tác" : "Actions",
              enableSorting: false,
              cell: ({ row }) => {
                const tpl = row.original;
                return (
                  <div className="text-right">
                    <div className="inline-flex items-center justify-end gap-1.5 rounded-xl border border-black/[0.03] bg-background/45 p-1 shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] dark:border-white/[0.04]">
                      {onPreviewTemplate && (
                        <button
                          type="button"
                          onClick={() => onPreviewTemplate(tpl)}
                          title={
                            isVietnamese ? "Xem trước mẫu" : "Preview Template"
                          }
                          className="flex size-7 items-center justify-center rounded-lg border border-white/60 bg-surface text-foreground shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] transition-all hover:text-primary active:shadow-[inset_2px_2px_4px_var(--shadow-dark)] dark:border-white/10 dark:bg-card"
                        >
                          <Eye className="size-3.5" />
                        </button>
                      )}
                      {onTestSendTemplate && (
                        <button
                          type="button"
                          onClick={() => onTestSendTemplate(tpl)}
                          title={isVietnamese ? "Gửi thử nghiệm" : "Test Send"}
                          className="flex size-7 items-center justify-center rounded-lg border border-primary/25 bg-surface text-primary shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] transition-all hover:bg-primary hover:text-primary-foreground active:shadow-[inset_2px_2px_4px_var(--shadow-dark)] dark:bg-card"
                        >
                          <Send className="size-3.5" />
                        </button>
                      )}
                      {onEditTemplate && (
                        <button
                          type="button"
                          onClick={() => onEditTemplate(tpl)}
                          title={
                            isVietnamese ? "Chỉnh sửa mẫu" : "Edit Template"
                          }
                          className="flex size-7 items-center justify-center rounded-lg border border-white/60 bg-surface text-foreground shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] transition-all hover:text-primary active:shadow-[inset_2px_2px_4px_var(--shadow-dark)] dark:border-white/10 dark:bg-card"
                        >
                          <Edit className="size-3.5" />
                        </button>
                      )}
                      {onDeleteTemplate && !tpl.isSystem && (
                        <button
                          type="button"
                          onClick={() => onDeleteTemplate(tpl, false)}
                          title={
                            isVietnamese
                              ? "Xóa mẫu tùy chỉnh"
                              : "Delete Custom Template"
                          }
                          className="flex size-7 items-center justify-center rounded-lg border border-accent/50 bg-accent/20 text-foreground shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] transition-all hover:border-primary/40 hover:bg-primary hover:text-primary-foreground active:shadow-[inset_2px_2px_4px_var(--shadow-dark)]"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              },
            },
          ]}
          loading={isLoading}
          fetching={isFetching}
          error={error}
          onRetry={() => {
            void refetch();
          }}
          filterKey={`${debouncedSearch}:${selectedCategory}:${selectedType}`}
          getRowId={(row) => row.id}
          features={{
            globalFilter: false,
            sorting: true,
            rowSelection: false,
            pagination: true,
          }}
        >
          <TableContent />
          <TablePagination />
        </Table>
      ) : (
        <div
          className="relative"
          data-testid="notification-templates-split-view"
        >
          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
            {/* Left Column: Compact Template Cards List */}
            <div className="xl:col-span-4">
              <NotificationTemplateCardList
                templates={filteredTemplates}
                selectedCode={selectedTemplate?.code ?? null}
                onSelect={handleSelectCard}
                isLoading={isLoading}
                error={error}
                onRetry={() => {
                  void refetch();
                }}
                hasActiveFilters={hasActiveFilters}
                onResetFilters={handleResetFilters}
              />
            </div>

            {/* Right Column: Sticky View & Inline Edit Panel (Desktop >= xl) */}
            <div className="hidden xl:sticky xl:top-4 xl:col-span-8 xl:block">
              <NotificationTemplateDetailPanel
                template={selectedTemplate}
                canEdit={canEditTemplates}
                mode={detailMode}
                onModeChange={(nextMode) => {
                  setDetailMode(nextMode);
                  if (nextMode === "view") {
                    setPendingSwitchCode(null);
                  }
                }}
                onDirtyChange={setIsEditorDirty}
                pendingSwitchTemplate={pendingSwitchTemplate}
                onConfirmSwitch={handleConfirmSwitch}
                onCancelSwitch={() => setPendingSwitchCode(null)}
                onTestSend={
                  onTestSendTemplate
                    ? (tpl) => onTestSendTemplate(tpl)
                    : undefined
                }
                onDelete={
                  onDeleteTemplate
                    ? (tpl, isSystem) => onDeleteTemplate(tpl, isSystem)
                    : undefined
                }
              />
            </div>
          </div>

          {/* Mobile / Tablet Detail Modal (< xl) */}
          {mobileDetailOpen && selectedTemplate && (
            <div
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm xl:hidden"
              onClick={() => {
                if (detailMode === "edit" && isEditorDirty) return;
                setMobileDetailOpen(false);
              }}
            >
              <div
                className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <NotificationTemplateDetailPanel
                  template={selectedTemplate}
                  canEdit={canEditTemplates}
                  mode={detailMode}
                  onModeChange={(nextMode) => {
                    setDetailMode(nextMode);
                    if (nextMode === "view") {
                      setPendingSwitchCode(null);
                    }
                  }}
                  onDirtyChange={setIsEditorDirty}
                  pendingSwitchTemplate={pendingSwitchTemplate}
                  onConfirmSwitch={handleConfirmSwitch}
                  onCancelSwitch={() => setPendingSwitchCode(null)}
                  onTestSend={
                    onTestSendTemplate
                      ? (tpl) => onTestSendTemplate(tpl)
                      : undefined
                  }
                  onDelete={
                    onDeleteTemplate
                      ? (tpl, isSystem) => onDeleteTemplate(tpl, isSystem)
                      : undefined
                  }
                  onClose={() => {
                    setMobileDetailOpen(false);
                    setDetailMode("view");
                    setIsEditorDirty(false);
                    setPendingSwitchCode(null);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
