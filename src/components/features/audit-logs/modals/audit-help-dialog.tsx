"use client";

import { useMemo, useState } from "react";
import { BookOpen, FileText, HelpCircle, Search, Settings, ShieldCheck } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import {
  AUDIT_ACTION_DICTIONARY,
  type AuditActionCategory,
} from "../audit-action-dictionary";
import { AuditActionBadge } from "../audit-action-badge";

export interface AuditHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORY_ORDER: AuditActionCategory[] = ["config", "auth", "rbac", "system", "integration"];

export function AuditHelpDialog({ open, onOpenChange }: AuditHelpDialogProps) {
  const { t, locale } = useLocale();
  const isVi = locale === "vi-VN";
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<AuditActionCategory | "all">("all");

  const categoryLabels: Record<AuditActionCategory | "all", string> = {
    all: isVi ? "Tất cả" : "All",
    config: isVi ? "Cấu hình Hệ thống" : "System Config",
    auth: isVi ? "Đăng nhập & Bảo mật" : "Auth & Security",
    rbac: isVi ? "Phân quyền & Nhân sự" : "RBAC & Users",
    system: isVi ? "Hệ thống & Tác vụ" : "System & Cron",
    integration: isVi ? "Tích hợp (API/Webhook)" : "Integrations",
    other: isVi ? "Khác" : "Other",
  };

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return AUDIT_ACTION_DICTIONARY.filter((item) => {
      if (selectedCategory !== "all" && item.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        item.code.toLowerCase().includes(q) ||
        item.labelVi.toLowerCase().includes(q) ||
        item.labelEn.toLowerCase().includes(q) ||
        item.descriptionVi.toLowerCase().includes(q) ||
        item.descriptionEn.toLowerCase().includes(q)
      );
    });
  }, [query, selectedCategory]);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("audit.help.title")}
      description={t("audit.help.subtitle")}
      icon={<HelpCircle className="h-5 w-5 text-primary" />}
      size="lg"
      footer={
        <div className="flex w-full justify-end">
          <Button type="button" variant="primary" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Phần 1: Giải thích 2 khái niệm cốt lõi */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-primary/25 bg-primary/5 p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-primary">
              <FileText className="h-4 w-4 shrink-0" />
              <span>{isVi ? "Tổng bản ghi kiểm toán" : "Total Audit Logs"}</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {isVi
                ? "Ghi nhận tự động toàn bộ các hoạt động quan trọng trong hệ thống: người thực hiện, thao tác, thời điểm, địa chỉ IP và kết quả xử lý. Mọi bản ghi đều được lưu trữ bất biến (WORM), không thể chỉnh sửa hay xóa bỏ nhằm đảm bảo minh bạch và truy vết an ninh."
                : "Automatically records every critical system activity: actor, action, timestamp, source IP, and execution outcome. All records are stored immutably (WORM) and cannot be modified or deleted, ensuring auditability and security traceability."}
            </p>
          </div>

          <div className="rounded-xl border border-accent/45 bg-accent/10 p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Settings className="h-4 w-4 shrink-0 text-primary" />
              <span>{isVi ? "Thay đổi cấu hình hệ thống" : "System Configuration Changes"}</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {isVi
                ? "Theo dõi riêng các thao tác ảnh hưởng trực tiếp đến thiết lập vận hành như bật/tắt tính năng hoặc thêm, sửa, xóa tham số cài đặt — giúp quản trị viên rà soát nhanh những thay đổi nhạy cảm mà không bị lẫn với hoạt động đăng nhập, phân quyền hay tác vụ định kỳ."
                : "Tracks only operations that directly modify system behavior—such as toggling feature flags or creating, updating, and removing system settings—allowing administrators to isolate sensitive changes from routine sign-ins, role updates, or scheduled tasks."}
            </p>
          </div>
        </div>

        {/* Cam kết WORM ngắn gọn */}
        <div className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-surface p-3 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
          <span>
            {isVi
              ? "Mẹo: Ở bảng bên dưới, bạn có thể rê chuột lên bất kỳ nhãn hành động nào để xem nhanh mã kỹ thuật và ý nghĩa, hoặc bấm \"Chi tiết\" trên từng dòng để xem dữ liệu trước/sau."
              : "Tip: Hover over any action badge in the table to preview its technical code and meaning, or click Details to inspect Before/After data."}
          </span>
        </div>

        {/* Phần 2: Từ điển các hành động */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              <span>{isVi ? "Từ điển các hành động trong hệ thống" : "Action Glossary"}</span>
            </h4>
            <span className="text-[11px] text-muted-foreground font-mono">
              {filteredItems.length} {isVi ? "hành động" : "actions"}
            </span>
          </div>

          {/* Search & Category Filter */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  isVi
                    ? "Tìm theo tên hoặc mã (vd: TRIGGER_CRON_JOB, đăng nhập, 2FA)..."
                    : "Search by label or code (e.g. TRIGGER_CRON_JOB, login, 2FA)..."
                }
                className="w-full rounded-xl border border-border/40 bg-surface pl-9 pr-3 py-2 text-xs text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(["all", ...CATEGORY_ORDER] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "border border-border/40 bg-surface text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {categoryLabels[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* Danh sách từ điển */}
          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
            {filteredItems.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                {isVi ? "Không tìm thấy hành động phù hợp." : "No matching actions found."}
              </p>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.code}
                  className="rounded-xl border border-border/35 bg-surface/70 p-3 space-y-1.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <AuditActionBadge action={item.code} />
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {item.code}
                    </code>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {isVi ? item.descriptionVi : item.descriptionEn}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
