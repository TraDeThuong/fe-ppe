"use client";
import { Table, TableToolbar, TableContent, TablePagination, TableRefresh } from "@/components/ui/table";

import { useMemo, useState } from "react";
import { FileText, Eye, Send, Search, X, Plus, Volume2, Lock, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotificationTemplatesCatalog } from "@/hooks/notifications";
import { useNotificationSound } from "@/hooks/notifications/use-notification-sound";
import { useDebounce } from "@/hooks/use-debounce";
import { useLocale } from "@/providers/locale-provider";
import { PREDEFINED_SYSTEM_TEMPLATES, TEMPLATE_CATEGORY_LABELS, type TemplateCategory } from "./notification-predefined-data";
import type { NotificationTemplateItemDto } from "@/types";

export interface NotificationTemplatesTabProps {
  onPreviewTemplate?: (template: NotificationTemplateItemDto) => void;
  onTestSendTemplate?: (template: NotificationTemplateItemDto) => void;
  onCreateTemplate?: () => void;
  onEditTemplate?: (template: NotificationTemplateItemDto) => void;
  onDeleteTemplate?: (template: NotificationTemplateItemDto, isSystem: boolean) => void;
  className?: string;
}

export function NotificationTemplatesTab({
  onPreviewTemplate,
  onTestSendTemplate,
  onCreateTemplate,
  onEditTemplate,
  onDeleteTemplate,
  className = "",
}: NotificationTemplatesTabProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const { playPreset } = useNotificationSound();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<"ALL" | "SYSTEM" | "CUSTOM">("ALL");
  const debouncedSearch = useDebounce(search, 350);

  // Lấy dữ liệu từ Backend
  const { data: backendData, isLoading, isFetching, error, refetch } = useNotificationTemplatesCatalog();
  const backendTemplates = backendData || [];

  // Ghép danh sách mẫu hệ thống chuẩn với backend
  const mergedTemplates = useMemo(() => {
    const list: Array<
      NotificationTemplateItemDto & {
        isSystem: boolean;
        category?: TemplateCategory;
        soundPreset?: string;
      }
    > = [];

    const handledCodes = new Set<string>();

    // 1. Thêm các mẫu từ backend trước
    backendTemplates.forEach((bt) => {
      const predefined = PREDEFINED_SYSTEM_TEMPLATES.find((p) => p.code === bt.code);
      list.push({
        ...bt,
        isSystem: Boolean(predefined),
        category: predefined?.category || (bt.code.includes("PPE") ? "PPE" : "OPERATIONS"),
        soundPreset: predefined?.soundPreset || (bt.code.includes("CRITICAL") ? "critical" : "warning"),
        description: bt.description || (predefined ? (isVietnamese ? predefined.description : predefined.descriptionEn) : undefined),
      });
      handledCodes.add(bt.code);
    });

    // 2. Bổ sung các mẫu hệ thống định sẵn nếu backend chưa có trong DB
    PREDEFINED_SYSTEM_TEMPLATES.forEach((pt) => {
      if (!handledCodes.has(pt.code)) {
        list.push({
          id: `sys-${pt.code}`,
          code: pt.code,
          name: isVietnamese ? pt.name : pt.nameEn,
          channel: pt.channel,
          subjectTemplate: pt.subjectTemplate,
          contentTemplate: pt.contentTemplate,
          status: "ACTIVE",
          description: isVietnamese ? pt.description : pt.descriptionEn,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isSystem: true,
          category: pt.category,
          soundPreset: pt.soundPreset,

        });
      }
    });

    return list;
  }, [backendTemplates, isVietnamese]);

  // Bộ lọc theo Search, Category và Type
  const filteredTemplates = useMemo(() => {
    return mergedTemplates.filter((item) => {
      // 1. Search match
      if (debouncedSearch.trim()) {
        const query = debouncedSearch.toLowerCase();
        const matches =
          item.code.toLowerCase().includes(query) ||
          item.name.toLowerCase().includes(query) ||
          (item.subjectTemplate && item.subjectTemplate.toLowerCase().includes(query)) ||
          (item.description && item.description.toLowerCase().includes(query));
        if (!matches) return false;
      }

      // 2. Type match
      if (selectedType === "SYSTEM" && !item.isSystem) return false;
      if (selectedType === "CUSTOM" && item.isSystem) return false;

      // 3. Category match
      if (selectedCategory !== "ALL" && item.category !== selectedCategory) return false;

      return true;
    });
  }, [mergedTemplates, debouncedSearch, selectedType, selectedCategory]);

  const systemCount = mergedTemplates.filter((t) => t.isSystem).length;
  const customCount = mergedTemplates.filter((t) => !t.isSystem).length;

  return (<div
    className={`group/table-shell relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/80 bg-surface/95 p-3.5 sm:p-5 shadow-[12px_12px_28px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light)] transition-all duration-500 dark:border-white/[0.07] dark:bg-card/95 ${className}`}
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

    <Table
      className="relative"
      toolbar={
        <div className="space-y-4 pb-1">
          {/* 1. HEADER TOOLBAR */}
          <div className="relative flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between pb-4">
            {/* Engraved Divider */}
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-border/80 to-transparent dark:via-white/[0.08]"
            />

            <div className="flex items-center gap-3.5">
              {/* Extruded Neumorphic Medallion */}
              <div className="relative flex size-11 sm:size-12 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-gradient-to-br from-surface-elevated to-surface shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)] dark:border-white/10 dark:from-card dark:to-background">
                <div className="absolute inset-1 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10" />
                <FileText className="relative size-5 text-primary drop-shadow-[0_2px_6px_hsl(var(--primary)/0.35)]" />
              </div>

              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                    {isVietnamese ? "Quản Lý Mẫu Thông Báo & Cảnh Báo" : "Notification & Alert Templates"}
                  </h2>
                  <Badge
                    variant="outline"
                    size="sm"
                    className="border-primary/20 bg-primary/[0.06] font-mono text-[11px] font-semibold text-primary px-2.5 py-0.5 shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]"
                  >
                    {filteredTemplates.length} {isVietnamese ? "mẫu" : "templates"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isVietnamese
                    ? "Bao gồm các mẫu hệ thống cố định chuẩn công trường và các mẫu do người dùng tùy biến"
                    : "Standard site safety system templates and custom user-defined templates"}
                </p>
              </div>
            </div>

            {/* Nút tạo mẫu tùy chỉnh mới */}
            {onCreateTemplate && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={onCreateTemplate}
                className="h-9 rounded-xl bg-gradient-to-r from-primary to-primary/90 px-4 text-xs font-bold text-primary-foreground shadow-[0_4px_14px_hsl(var(--primary)/0.35)] transition-all hover:brightness-110 active:scale-[0.98] flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
              >
                <Plus className="size-4" />
                <span>{isVietnamese ? "Tạo mẫu tùy chỉnh" : "New Custom Template"}</span>
              </Button>
            )}
          </div>

          {/* 2. THANH LỌC LOẠI MẪU (SEGMENTED DOCK) & TÌM KIẾM */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Tactile Recessed Segmented Control */}
            <div className="inline-flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-black/[0.04] bg-background/60 p-1.5 shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_var(--shadow-light)] dark:border-white/[0.04]">
              <button
                type="button"
                onClick={() => setSelectedType("ALL")}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-200 shrink-0 ${
                  selectedType === "ALL"
                    ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-[3px_3px_8px_var(--shadow-dark),0_2px_10px_hsl(var(--primary)/0.3)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isVietnamese ? "Tất cả" : "All"}{" "}
                <span className="font-mono opacity-85">({mergedTemplates.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedType("SYSTEM")}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 shrink-0 ${
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
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 shrink-0 ${
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
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-primary/70" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                }}
                placeholder={isVietnamese ? "Tìm theo mã code, tên mẫu..." : "Search by code or title..."}
                className="w-full rounded-2xl border border-black/[0.05] bg-background/75 py-2 pl-10 pr-8 text-xs font-medium text-foreground placeholder:text-muted-foreground/70 shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_var(--shadow-light)] outline-none transition-all focus:border-primary/40 dark:border-white/[0.06]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-lg bg-surface text-muted-foreground shadow-[2px_2px_4px_var(--shadow-dark)] hover:text-primary"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          </div>

          {/* 3. CATEGORY FILTER CHIPS (TACTILE PILLS) */}
          <div className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-black/[0.03] bg-background/45 px-3 py-2 text-xs shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] dark:border-white/[0.04]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 mr-1">
              {isVietnamese ? "Lĩnh vực:" : "Domain:"}
            </span>

            <button
              type="button"
              onClick={() => setSelectedCategory("ALL")}
              className={`rounded-xl px-2.5 py-1 text-[11px] font-semibold transition-all shrink-0 ${
                selectedCategory === "ALL"
                  ? "border border-primary/25 bg-surface text-primary shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] dark:bg-card"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isVietnamese ? "Toàn bộ" : "All Domains"}
            </button>

            {(Object.keys(TEMPLATE_CATEGORY_LABELS) as TemplateCategory[]).map((cat) => {
              const info = TEMPLATE_CATEGORY_LABELS[cat];
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-xl px-2.5 py-1 text-[11px] font-semibold transition-all shrink-0 ${
                    isSelected
                      ? "border border-primary/25 bg-surface text-primary shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] dark:bg-card"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isVietnamese ? info.vi : info.en}
                </button>
              );
            })}
          </div>
        </div>
      }
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
                {tpl.isSystem && <Lock className="size-3 text-primary/70 shrink-0" />}
                <span>{tpl.code}</span>
              </div>
            );
          },
        },
        {
          id: "name",
          header: isVietnamese ? "Tên hiển thị & Lĩnh vực" : "Title & Domain",
          accessorFn: (tpl) => tpl.name,
          enableSorting: true,
          cell: ({ row }) => {
            const tpl = row.original;
            return (
              <div className="py-0.5">
                <p className="font-bold text-xs sm:text-[13px] text-foreground">{tpl.name}</p>
                {tpl.description && (
                  <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
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
                  onClick={() => playPreset((tpl.soundPreset as any) || "info")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/70 bg-surface px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] hover:border-primary/30 hover:text-primary transition-all active:shadow-[inset_2px_2px_4px_var(--shadow-dark)] dark:border-white/10 dark:bg-card"
                  title={isVietnamese ? "Bấm để nghe thử âm thanh" : "Click to test sound"}
                >
                  <Volume2 className="size-3.5 text-primary" />
                  <span className="capitalize">{tpl.soundPreset || "info"}</span>
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
              <div className="max-w-xs truncate text-xs text-muted-foreground font-medium">
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
                  className={`text-[10px] font-semibold px-2.5 ${
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
                      title={isVietnamese ? "Xem trước mẫu" : "Preview Template"}
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
                      title={isVietnamese ? "Chỉnh sửa mẫu" : "Edit Template"}
                      className="flex size-7 items-center justify-center rounded-lg border border-white/60 bg-surface text-foreground shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] transition-all hover:text-primary active:shadow-[inset_2px_2px_4px_var(--shadow-dark)] dark:border-white/10 dark:bg-card"
                    >
                      <Edit className="size-3.5" />
                    </button>
                  )}
                  {onDeleteTemplate && !tpl.isSystem && (
                    <button
                      type="button"
                      onClick={() => onDeleteTemplate(tpl, false)}
                      title={isVietnamese ? "Xóa mẫu tùy chỉnh" : "Delete Custom Template"}
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
      <TableToolbar showSearch={false} actions={<TableRefresh />} />
      <TableContent />
      <TablePagination />
    </Table>
  </div>);
}
