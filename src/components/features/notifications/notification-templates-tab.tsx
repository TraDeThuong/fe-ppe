"use client";

import { useMemo, useState } from "react";
import {
  FileText,
  Eye,
  Send,
  Search,
  X,
  CheckCircle,
  AlertCircle,
  Plus,
  Volume2,
  Lock,
  Edit,
  Trash2,
  Filter,
  Sparkles,
  Shield,
  Camera,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotificationTemplates } from "@/hooks/notifications";
import { useNotificationSound } from "@/hooks/notifications/use-notification-sound";
import { useDebounce } from "@/hooks/use-debounce";
import { useLocale } from "@/providers/locale-provider";
import {
  PREDEFINED_SYSTEM_TEMPLATES,
  TEMPLATE_CATEGORY_LABELS,
  type TemplateCategory,
} from "./notification-predefined-data";
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

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<"ALL" | "SYSTEM" | "CUSTOM">("ALL");
  const debouncedSearch = useDebounce(search, 300);

  // Lấy dữ liệu từ Backend
  const { data: backendData, isLoading } = useNotificationTemplates({
    page: 1,
    limit: 100,
    search: debouncedSearch || undefined,
  });

  const backendTemplates = backendData?.data || [];

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
        isSystem: Boolean(predefined) || bt.code.startsWith("PPE_") || bt.code.startsWith("VERIFY_") || bt.code.startsWith("RESET_"),
        category: predefined?.category || (bt.code.includes("PPE") ? "PPE" : "OPERATIONS"),
        soundPreset: predefined?.soundPreset || (bt.code.includes("CRITICAL") ? "critical" : "warning"),
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

  return (
    <div
      className={`flex flex-col gap-4 rounded-2xl border border-border/30 bg-background p-4 shadow-[6px_6px_15px_var(--shadow-dark),-6px_-6px_15px_var(--shadow-light)] sm:p-6 ${className}`}
    >
      {/* 1. Header Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/30 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-[3px_3px_8px_var(--shadow-dark),-3px_-3px_8px_var(--shadow-light)]">
            <FileText className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-foreground sm:text-lg">
                {isVietnamese ? "Quản Lý Mẫu Thông Báo & Cảnh Báo" : "Notification & Alert Templates"}
              </h2>
              <Badge variant="outline" size="sm" className="font-mono text-[10px] text-primary">
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
            className="flex items-center gap-1.5 font-bold shadow-[2px_2px_6px_var(--shadow-dark)] shrink-0 self-start sm:self-auto"
          >
            <Plus className="size-4" />
            <span>{isVietnamese ? "+ Tạo mẫu tùy chỉnh" : "+ New Custom Template"}</span>
          </Button>
        )}
      </div>

      {/* 2. Thanh lọc Category & Tìm kiếm */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Bộ lọc loại: Tất cả, Hệ thống, Tùy chỉnh */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            type="button"
            onClick={() => setSelectedType("ALL")}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              selectedType === "ALL"
                ? "bg-primary text-white shadow-[2px_2px_5px_var(--shadow-dark)]"
                : "border border-border/30 bg-background/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {isVietnamese ? "Tất cả" : "All"} ({mergedTemplates.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedType("SYSTEM")}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1 ${
              selectedType === "SYSTEM"
                ? "bg-primary text-white shadow-[2px_2px_5px_var(--shadow-dark)]"
                : "border border-border/30 bg-background/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Lock className="size-3" />
            <span>{isVietnamese ? "Mẫu Hệ thống" : "System Built-in"}</span> ({systemCount})
          </button>
          <button
            type="button"
            onClick={() => setSelectedType("CUSTOM")}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1 ${
              selectedType === "CUSTOM"
                ? "bg-primary text-white shadow-[2px_2px_5px_var(--shadow-dark)]"
                : "border border-border/30 bg-background/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="size-3" />
            <span>{isVietnamese ? "Mẫu Tự tạo" : "User Custom"}</span> ({customCount})
          </button>
        </div>

        {/* Ô tìm kiếm */}
        <div className="relative min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={isVietnamese ? "Tìm theo mã code, tên mẫu..." : "Search by code or title..."}
            className="w-full rounded-xl border border-border/40 bg-background py-2 pl-9 pr-7 text-xs text-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] outline-none focus:border-primary/50"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Category Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] font-semibold text-muted-foreground shrink-0 mr-1">
          {isVietnamese ? "Lĩnh vực:" : "Domain:"}
        </span>
        <button
          type="button"
          onClick={() => setSelectedCategory("ALL")}
          className={`rounded-lg px-2 py-0.5 text-[11px] font-medium transition-all ${
            selectedCategory === "ALL"
              ? "bg-muted text-foreground font-bold shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
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
              className={`rounded-lg px-2 py-0.5 text-[11px] font-medium transition-all shrink-0 ${
                isSelected
                  ? "bg-primary/10 text-primary font-bold shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isVietnamese ? info.vi : info.en}
            </button>
          );
        })}
      </div>

      {/* 4. MOBILE VIEW: CARDS GỌN CHO ĐIỆN THOẠI */}
      <div className="block lg:hidden space-y-2.5 max-h-[460px] overflow-y-auto pr-0.5">
        {filteredTemplates.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            {isVietnamese ? "Không tìm thấy mẫu thông báo nào phù hợp." : "No matching templates found."}
          </div>
        ) : (
          filteredTemplates.map((tpl) => (
            <div
              key={tpl.id}
              className="rounded-xl border border-border/40 bg-background/60 p-3 shadow-[inset_1px_1px_2px_var(--shadow-dark)] space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-xs font-bold text-primary">{tpl.code}</span>
                    <Badge variant={tpl.isSystem ? "outline" : "secondary"} size="sm" className="text-[9px] px-1.5 py-0">
                      {tpl.isSystem ? (isVietnamese ? "Hệ thống" : "System") : isVietnamese ? "Tùy chỉnh" : "Custom"}
                    </Badge>
                  </div>
                  <h4 className="text-xs font-semibold text-foreground mt-0.5">{tpl.name}</h4>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {tpl.soundPreset && (
                    <button
                      type="button"
                      onClick={() => playPreset(tpl.soundPreset as any)}
                      title={isVietnamese ? "Nghe thử âm thanh chuông" : "Play sound cue"}
                      className="flex size-7 items-center justify-center rounded-lg border border-border/40 text-muted-foreground hover:text-primary active:shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
                    >
                      <Volume2 className="size-3.5" />
                    </button>
                  )}
                  {onPreviewTemplate && (
                    <button
                      type="button"
                      onClick={() => onPreviewTemplate(tpl)}
                      title={isVietnamese ? "Xem trước" : "Preview"}
                      className="flex size-7 items-center justify-center rounded-lg border border-border/40 text-muted-foreground hover:text-primary active:shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
                    >
                      <Eye className="size-3.5" />
                    </button>
                  )}
                  {onTestSendTemplate && (
                    <button
                      type="button"
                      onClick={() => onTestSendTemplate(tpl)}
                      title={isVietnamese ? "Gửi thử nghiệm" : "Test send"}
                      className="flex size-7 items-center justify-center rounded-lg border border-primary/30 text-primary hover:bg-primary/10 active:shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
                    >
                      <Send className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {tpl.subjectTemplate && (
                <p className="text-[11px] text-muted-foreground line-clamp-1 italic">
                  &ldquo;{tpl.subjectTemplate}&rdquo;
                </p>
              )}

              <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/20 pt-1.5">
                <span className="font-mono">{tpl.channel}</span>
                <div className="flex items-center gap-2">
                  {onEditTemplate && (
                    <button
                      type="button"
                      onClick={() => onEditTemplate(tpl)}
                      className="text-primary hover:underline font-semibold"
                    >
                      {isVietnamese ? "Sửa" : "Edit"}
                    </button>
                  )}
                  {onDeleteTemplate && !tpl.isSystem && (
                    <button
                      type="button"
                      onClick={() => onDeleteTemplate(tpl, false)}
                      className="text-rose-500 hover:underline font-semibold"
                    >
                      {isVietnamese ? "Xóa" : "Delete"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 5. DESKTOP VIEW: BẢNG DỮ LIỆU ĐẦY ĐỦ TIỆN ÍCH */}
      <div className="hidden lg:block overflow-x-auto rounded-xl border border-border/30 bg-background shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border/30 bg-muted/20 text-muted-foreground font-semibold">
            <tr>
              <th className="p-3.5 sm:p-4">{isVietnamese ? "Mã mẫu (Code)" : "Code"}</th>
              <th className="p-3.5 sm:p-4">{isVietnamese ? "Tên hiển thị & Lĩnh vực" : "Title & Domain"}</th>
              <th className="p-3.5 sm:p-4">{isVietnamese ? "Kênh" : "Channel"}</th>
              <th className="p-3.5 sm:p-4">{isVietnamese ? "Âm thanh" : "Audio Cue"}</th>
              <th className="p-3.5 sm:p-4 max-w-xs">{isVietnamese ? "Tiêu đề khuôn mẫu" : "Subject Template"}</th>
              <th className="p-3.5 sm:p-4 text-center">{isVietnamese ? "Phân loại" : "Type"}</th>
              <th className="p-3.5 sm:p-4 text-right">{isVietnamese ? "Thao tác" : "Actions"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20 text-foreground">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  {isVietnamese ? "Đang tải danh sách mẫu thông báo..." : "Loading notification templates..."}
                </td>
              </tr>
            ) : filteredTemplates.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  {isVietnamese ? "Không tìm thấy mẫu thông báo nào phù hợp." : "No templates found matching your criteria."}
                </td>
              </tr>
            ) : (
              filteredTemplates.map((tpl) => (
                <tr key={tpl.id} className="transition-colors hover:bg-muted/10 group">
                  <td className="p-3.5 sm:p-4 font-mono font-bold text-primary">
                    <div className="flex items-center gap-1.5">
                      {tpl.isSystem && <Lock className="size-3 text-muted-foreground shrink-0" />}
                      <span>{tpl.code}</span>
                    </div>
                  </td>
                  <td className="p-3.5 sm:p-4">
                    <p className="font-semibold text-foreground">{tpl.name}</p>
                    {tpl.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{tpl.description}</p>
                    )}
                  </td>
                  <td className="p-3.5 sm:p-4">
                    <span className="rounded-md border border-border/40 bg-muted/20 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {tpl.channel}
                    </span>
                  </td>
                  <td className="p-3.5 sm:p-4">
                    <button
                      type="button"
                      onClick={() => playPreset((tpl.soundPreset as any) || "info")}
                      className="inline-flex items-center gap-1 rounded-lg border border-border/40 bg-background px-2 py-1 text-[11px] font-semibold text-foreground shadow-[1px_1px_3px_var(--shadow-dark)] hover:text-primary transition-all active:shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
                      title={isVietnamese ? "Bấm để nghe thử âm thanh" : "Click to test sound"}
                    >
                      <Volume2 className="size-3 text-primary" />
                      <span className="capitalize">{tpl.soundPreset || "info"}</span>
                    </button>
                  </td>
                  <td className="p-3.5 sm:p-4 max-w-xs truncate text-muted-foreground">
                    {tpl.subjectTemplate || "—"}
                  </td>
                  <td className="p-3.5 sm:p-4 text-center">
                    <Badge variant={tpl.isSystem ? "outline" : "secondary"} size="sm" shape="pill" className="text-[10px]">
                      {tpl.isSystem ? (isVietnamese ? "Hệ thống" : "System") : isVietnamese ? "Tùy chỉnh" : "Custom"}
                    </Badge>
                  </td>
                  <td className="p-3.5 sm:p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {onPreviewTemplate && (
                        <button
                          type="button"
                          onClick={() => onPreviewTemplate(tpl)}
                          title={isVietnamese ? "Xem trước mẫu" : "Preview Template"}
                          className="flex size-7 items-center justify-center rounded-lg border border-border/40 bg-background text-foreground shadow-[2px_2px_4px_var(--shadow-dark)] transition-all hover:text-primary active:shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
                        >
                          <Eye className="size-3.5" />
                        </button>
                      )}

                      {onTestSendTemplate && (
                        <button
                          type="button"
                          onClick={() => onTestSendTemplate(tpl)}
                          title={isVietnamese ? "Gửi thử nghiệm" : "Test Send"}
                          className="flex size-7 items-center justify-center rounded-lg border border-primary/30 bg-background text-primary shadow-[2px_2px_4px_var(--shadow-dark)] transition-all hover:bg-primary/10 active:shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
                        >
                          <Send className="size-3.5" />
                        </button>
                      )}

                      {onEditTemplate && (
                        <button
                          type="button"
                          onClick={() => onEditTemplate(tpl)}
                          title={isVietnamese ? "Chỉnh sửa mẫu" : "Edit Template"}
                          className="flex size-7 items-center justify-center rounded-lg border border-border/40 bg-background text-foreground shadow-[2px_2px_4px_var(--shadow-dark)] transition-all hover:text-primary active:shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
                        >
                          <Edit className="size-3.5" />
                        </button>
                      )}

                      {onDeleteTemplate && !tpl.isSystem && (
                        <button
                          type="button"
                          onClick={() => onDeleteTemplate(tpl, false)}
                          title={isVietnamese ? "Xóa mẫu tùy chỉnh" : "Delete Custom Template"}
                          className="flex size-7 items-center justify-center rounded-lg border border-rose-500/30 bg-background text-rose-500 shadow-[2px_2px_4px_var(--shadow-dark)] transition-all hover:bg-rose-500/10 active:shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
