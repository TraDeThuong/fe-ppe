"use client";

import { useState, useEffect } from "react";
import { Eye, FileCode, CheckCircle, RefreshCw, Layers } from "lucide-react";
import { SculptedModal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { usePreviewNotificationTemplate } from "@/hooks/notifications";
import { useLocale } from "@/providers/locale-provider";
import type { NotificationTemplateItemDto, PreviewTemplateResponse } from "@/types";

export interface PreviewTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: NotificationTemplateItemDto | null;
}

const DEFAULT_SAMPLE_VARIABLES: Record<string, unknown> = {
  workerName: "Nguyễn Văn An",
  workerId: "NV-8921",
  siteName: "Công trường Landmark Tòa B",
  zoneName: "Khu vực Giàn giáo Tầng 12",
  violationType: "Thiếu nón bảo hộ & dây an toàn",
  severity: "HIGH",
  cameraName: "CAM-NORTH-04",
  timestamp: "14:32 28/10/2026",
  actionUrl: "http://localhost:3000/incidents",
};

export function PreviewTemplateModal({
  open,
  onOpenChange,
  template,
}: PreviewTemplateModalProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const [activeTab, setActiveTab] = useState<"rendered" | "source" | "variables">("rendered");
  const [variablesText, setVariablesText] = useState(
    JSON.stringify(DEFAULT_SAMPLE_VARIABLES, null, 2),
  );
  const [previewData, setPreviewData] = useState<PreviewTemplateResponse | null>(null);

  const previewMutation = usePreviewNotificationTemplate({
    onSuccess: (data) => {
      setPreviewData(data);
    },
  });

  const runPreview = (varsJson?: string) => {
    if (!template) return;
    try {
      const parsedVars = JSON.parse(varsJson ?? variablesText);
      previewMutation.mutate({
        code: template.code,
        payload: { variables: parsedVars },
      });
    } catch {
      // JSON format error
    }
  };

  useEffect(() => {
    if (open && template) {
      setPreviewData(null);
      runPreview();
    }
  }, [open, template]);

  if (!template) return null;

  return (
    <SculptedModal
      open={open}
      onOpenChange={onOpenChange}
      title={isVietnamese ? `Xem trước mẫu: ${template.name}` : `Preview Template: ${template.name}`}
      description={
        isVietnamese
          ? `Mã code: ${template.code} | Kênh: ${template.channel}`
          : `Code: ${template.code} | Channel: ${template.channel}`
      }
      icon={<Eye className="h-5 w-5 text-primary" />}
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Kênh:</span> {template.channel}
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            {isVietnamese ? "Đóng" : "Close"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Navigation Tabs */}
        <div className="flex rounded-xl bg-background p-1 border border-border/40 shadow-[inset_1px_1px_3px_var(--shadow-dark)]">
          <button
            type="button"
            onClick={() => setActiveTab("rendered")}
            className={[
              "flex-1 rounded-lg py-1.5 text-center font-bold transition-all",
              activeTab === "rendered"
                ? "bg-primary/10 text-primary shadow-[2px_2px_4px_var(--shadow-dark)]"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {isVietnamese ? "Hiển thị thực tế (Rendered)" : "Rendered View"}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("source")}
            className={[
              "flex-1 rounded-lg py-1.5 text-center font-bold transition-all",
              activeTab === "source"
                ? "bg-primary/10 text-primary shadow-[2px_2px_4px_var(--shadow-dark)]"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {isVietnamese ? "Mã nguồn Template (Source)" : "Source Code"}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("variables")}
            className={[
              "flex-1 rounded-lg py-1.5 text-center font-bold transition-all",
              activeTab === "variables"
                ? "bg-primary/10 text-primary shadow-[2px_2px_4px_var(--shadow-dark)]"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {isVietnamese ? "Biến giả định (Sample Data)" : "Sample Data"}
          </button>
        </div>

        {/* Tab 1: Rendered View */}
        {activeTab === "rendered" && (
          <div className="space-y-3">
            {previewMutation.isPending ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <RefreshCw className="size-6 animate-spin text-primary" />
                <span className="mt-2 text-xs">Đang nạp và render dữ liệu xem trước...</span>
              </div>
            ) : previewData ? (
              <div className="space-y-3">
                {/* Subject */}
                {previewData.subject && (
                  <div className="rounded-xl border border-border/40 bg-card p-3 shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
                    <span className="block text-[10px] font-bold uppercase text-muted-foreground">
                      Tiêu đề / Subject:
                    </span>
                    <p className="mt-0.5 text-sm font-bold text-foreground">
                      {previewData.subject}
                    </p>
                  </div>
                )}

                {/* Content */}
                <div className="rounded-xl border border-border/40 bg-card p-3.5 shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
                  <span className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                    Nội dung thông báo (Content):
                  </span>
                  <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-foreground leading-relaxed">
                    {previewData.content}
                  </div>
                </div>

                {/* HTML Preview nếu là email */}
                {previewData.html && (
                  <div className="rounded-xl border border-border/40 bg-background p-3 shadow-[2px_2px_6px_var(--shadow-dark)]">
                    <span className="block text-[10px] font-bold uppercase text-muted-foreground mb-2">
                      Xem trước khung HTML Email:
                    </span>
                    <div
                      className="rounded-lg border border-border/30 bg-white p-4 text-slate-800 shadow-inner max-h-60 overflow-auto"
                      dangerouslySetInnerHTML={{ __html: previewData.html }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-border/40 bg-background p-4 text-center text-muted-foreground">
                <FileCode className="mx-auto size-6 opacity-40 mb-1" />
                <span>Không có dữ liệu xem trước. Bấm làm mới bên dưới.</span>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Template Source */}
        {activeTab === "source" && (
          <div className="space-y-3">
            {template.subjectTemplate && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Mẫu tiêu đề (Subject Template)
                </label>
                <div className="rounded-xl border border-border/40 bg-muted/20 p-2.5 font-mono text-xs text-foreground shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
                  {template.subjectTemplate}
                </div>
              </div>
            )}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Mẫu nội dung (Content Template)
              </label>
              <div className="rounded-xl border border-border/40 bg-muted/20 p-3 font-mono text-xs text-foreground whitespace-pre-wrap max-h-64 overflow-auto shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
                {template.contentTemplate}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Sample Variables JSON */}
        {activeTab === "variables" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Dữ liệu mẫu biến nội suy (JSON)
              </label>
              <button
                type="button"
                onClick={() => runPreview(variablesText)}
                className="flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary transition-all hover:bg-primary/20"
              >
                <RefreshCw className="size-3" />
                <span>Cập nhật xem trước</span>
              </button>
            </div>
            <textarea
              rows={8}
              value={variablesText}
              onChange={(e) => setVariablesText(e.target.value)}
              className="w-full rounded-xl border border-border/40 bg-background p-3 font-mono text-xs text-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark)] outline-none focus:border-primary/50"
            />
          </div>
        )}
      </div>
    </SculptedModal>
  );
}
