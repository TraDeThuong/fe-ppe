"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Check,
  Clock,
  Code2,
  Database,
  Edit,
  Eye,
  FileText,
  Lock,
  Mail,
  RefreshCw,
  RotateCcw,
  Send,
  Sliders,
  Sparkles,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useCreateNotificationTemplate,
  usePreviewNotificationTemplate,
  useUpdateNotificationTemplate,
} from "@/hooks/notifications/use-notification-templates";
import { useNotificationSound } from "@/hooks/notifications/use-notification-sound";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { useLocale } from "@/providers/locale-provider";
import { getChannelDisplay } from "./notification-meta-badges";
import { TEMPLATE_CATEGORY_LABELS } from "./notification-predefined-data";
import {
  buildSampleVariables,
  extractTemplatePlaceholders,
  getPlaceholderChipsForTemplate,
  interpolateTemplate,
  TEMPLATE_CATEGORY_STYLES,
  type MergedNotificationTemplate,
} from "./notification-template-helpers";
import type { SoundPreset } from "@/services/sound.service";
import type { NotificationChannel, PreviewTemplateResponse } from "@/types";

export interface NotificationTemplateDetailPanelProps {
  template: MergedNotificationTemplate | null;
  canEdit?: boolean;
  mode: "view" | "edit";
  onModeChange: (mode: "view" | "edit") => void;
  onDirtyChange?: (dirty: boolean) => void;
  pendingSwitchTemplate?: MergedNotificationTemplate | null;
  onConfirmSwitch?: () => void;
  onCancelSwitch?: () => void;
  onTestSend?: (template: MergedNotificationTemplate) => void;
  onDelete?: (template: MergedNotificationTemplate, isSystem: boolean) => void;
  onClose?: () => void;
  className?: string;
}

function renderHighlightedTemplateTokens(raw: string) {
  const parts = raw.split(/(\{\{\s*[a-zA-Z0-9_]+\s*\}\})/g);
  return parts.map((part, idx) => {
    if (/^\{\{\s*[a-zA-Z0-9_]+\s*\}\}$/.test(part)) {
      return (
        <span
          key={idx}
          className="mx-0.5 inline-block rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-primary"
        >
          {part}
        </span>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

function formatUpdatedTimestamp(
  value: string | Date | undefined,
  locale: string,
  isVietnamese: boolean,
): string {
  if (!value) {
    return isVietnamese ? "Mặc định hệ thống" : "System default";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return isVietnamese ? "Mặc định hệ thống" : "System default";
  }
  return date.toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificationTemplateDetailPanel({
  template,
  canEdit = false,
  mode,
  onModeChange,
  onDirtyChange,
  pendingSwitchTemplate = null,
  onConfirmSwitch,
  onCancelSwitch,
  onTestSend,
  onDelete,
  onClose,
  className = "",
}: NotificationTemplateDetailPanelProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const { playPreset } = useNotificationSound();

  // View sub-tab state
  const [viewTab, setViewTab] = useState<"rendered" | "source" | "variables">(
    "rendered",
  );
  const [variablesText, setVariablesText] = useState("{}");
  const [variablesJsonError, setVariablesJsonError] = useState<string | null>(
    null,
  );
  const [backendPreview, setBackendPreview] =
    useState<PreviewTemplateResponse | null>(null);

  // Edit form state
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [channel, setChannel] = useState<NotificationChannel>("IN_APP");
  const [soundPreset, setSoundPreset] = useState<SoundPreset>("info");
  const [subjectTemplate, setSubjectTemplate] = useState("");
  const [contentTemplate, setContentTemplate] = useState("");
  const [description, setDescription] = useState("");
  const [showLivePreview, setShowLivePreview] = useState(true);

  const contentTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Preview mutation (used to fetch authentic HTML baseLayout for DB-saved EMAIL templates)
  const previewMutation = usePreviewNotificationTemplate({
    suppressToast: true,
    onSuccess: (data) => {
      setBackendPreview(data);
    },
    onError: () => {
      setBackendPreview(null);
    },
  });
  const previewMutateRef = useRef(previewMutation.mutate);
  previewMutateRef.current = previewMutation.mutate;

  const createMutation = useCreateNotificationTemplate({
    onSuccess: () => {
      onDirtyChange?.(false);
      onModeChange("view");
    },
  });

  const updateMutation = useUpdateNotificationTemplate({
    onSuccess: () => {
      onDirtyChange?.(false);
      onModeChange("view");
    },
  });

  // Sync local states whenever template switches or updated from backend
  useEffect(() => {
    if (!template) return;

    const sampleVars = buildSampleVariables(template);
    setVariablesText(JSON.stringify(sampleVars, null, 2));
    setVariablesJsonError(null);
    setBackendPreview(null);

    setName(template.name || "");
    setStatus(template.status || "ACTIVE");
    setChannel(template.channel || "IN_APP");
    setSoundPreset(template.soundPreset || "info");
    setSubjectTemplate(template.subjectTemplate || "");
    setContentTemplate(template.contentTemplate || "");
    setDescription(template.description || "");

    if (!template.isVirtualDefault && template.channel === "EMAIL") {
      previewMutateRef.current({
        code: template.code,
        payload: { variables: sampleVars },
      });
    }
  }, [
    template?.code,
    template?.id,
    template?.name,
    template?.status,
    template?.channel,
    template?.subjectTemplate,
    template?.contentTemplate,
    template?.description,
    template?.soundPreset,
    template?.isVirtualDefault,
  ]);

  // Parse sample variables safely
  const parsedVariables = useMemo<Record<string, unknown>>(() => {
    try {
      const parsed = JSON.parse(variablesText) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Fallback to template default sample variables
    }
    return buildSampleVariables(template);
  }, [variablesText, template]);

  // Track dirty state in edit mode
  const isDirty = useMemo(() => {
    if (!template || mode !== "edit") return false;
    return (
      name !== (template.name || "") ||
      status !== (template.status || "ACTIVE") ||
      channel !== (template.channel || "IN_APP") ||
      subjectTemplate !== (template.subjectTemplate || "") ||
      contentTemplate !== (template.contentTemplate || "") ||
      description !== (template.description || "")
    );
  }, [
    template,
    mode,
    name,
    status,
    channel,
    subjectTemplate,
    contentTemplate,
    description,
  ]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const sanitizedBackendHtml = useMemo(
    () => sanitizeHtml(backendPreview?.html),
    [backendPreview?.html],
  );

  const placeholderChips = useMemo(
    () => getPlaceholderChipsForTemplate(template),
    [template],
  );

  if (!template) {
    return (
      <aside
        aria-label={
          isVietnamese ? "Chi tiết mẫu thông báo" : "Notification template details"
        }
        className={`flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-border/30 bg-background/80 p-8 text-center shadow-[inset_3px_3px_8px_var(--shadow-dark),inset_-3px_-3px_8px_var(--shadow-light)] sm:rounded-3xl ${className}`}
      >
        <div className="mb-3 flex size-12 items-center justify-center rounded-2xl border border-border/40 bg-background text-primary shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)]">
          <FileText className="size-5" />
        </div>
        <h3 className="text-sm font-bold text-foreground">
          {isVietnamese
            ? "Chọn một mẫu thông báo để xem hoặc chỉnh sửa"
            : "Select a template to inspect or edit"}
        </h3>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          {isVietnamese
            ? "Bản xem trước trực quan, mã nguồn biến động và trình chỉnh sửa trực tiếp sẽ hiển thị tại đây."
            : "Live preview, placeholder source, and inline editor will appear here."}
        </p>
      </aside>
    );
  }

  const isActive = template.status !== "INACTIVE";
  const channelInfo = getChannelDisplay(
    mode === "edit" ? channel : template.channel,
  );
  const ChannelIcon = channelInfo.icon;
  const categoryInfo = TEMPLATE_CATEGORY_LABELS[template.category];
  const categoryStyle = TEMPLATE_CATEGORY_STYLES[template.category];

  const renderedSubject = interpolateTemplate(
    template.subjectTemplate || template.name,
    parsedVariables,
  );
  const renderedContent = interpolateTemplate(
    template.contentTemplate,
    parsedVariables,
  );

  const liveEditSubject = interpolateTemplate(
    subjectTemplate || name,
    parsedVariables,
  );
  const liveEditContent = interpolateTemplate(contentTemplate, parsedVariables);

  const detectedPlaceholders = Array.from(
    new Set([
      ...extractTemplatePlaceholders(template.subjectTemplate),
      ...extractTemplatePlaceholders(template.contentTemplate),
    ]),
  );

  const handleApplyVariables = () => {
    try {
      const parsed = JSON.parse(variablesText) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        setVariablesJsonError(
          isVietnamese
            ? "Dữ liệu biến phải là một đối tượng JSON hợp lệ."
            : "Variables must be a valid JSON object.",
        );
        return;
      }
      setVariablesJsonError(null);
      if (!template.isVirtualDefault && template.channel === "EMAIL") {
        previewMutation.mutate({
          code: template.code,
          payload: { variables: parsed as Record<string, unknown> },
        });
      }
      setViewTab("rendered");
    } catch {
      setVariablesJsonError(
        isVietnamese
          ? "Cú pháp JSON không hợp lệ. Vui lòng kiểm tra lại."
          : "Invalid JSON syntax. Please check formatting.",
      );
    }
  };

  const handleResetVariables = () => {
    const sampleVars = buildSampleVariables(template);
    setVariablesText(JSON.stringify(sampleVars, null, 2));
    setVariablesJsonError(null);
    if (!template.isVirtualDefault && template.channel === "EMAIL") {
      previewMutation.mutate({
        code: template.code,
        payload: { variables: sampleVars },
      });
    }
  };

  const handleInsertPlaceholder = (token: string) => {
    const textarea = contentTextareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart ?? contentTemplate.length;
      const end = textarea.selectionEnd ?? contentTemplate.length;
      const next =
        contentTemplate.slice(0, start) + token + contentTemplate.slice(end);
      setContentTemplate(next);
      requestAnimationFrame(() => {
        textarea.focus();
        const cursor = start + token.length;
        textarea.setSelectionRange(cursor, cursor);
      });
      return;
    }
    setContentTemplate((prev) =>
      prev ? `${prev} ${token}` : token,
    );
  };

  const handleCancelEdit = () => {
    setName(template.name || "");
    setStatus(template.status || "ACTIVE");
    setChannel(template.channel || "IN_APP");
    setSoundPreset(template.soundPreset || "info");
    setSubjectTemplate(template.subjectTemplate || "");
    setContentTemplate(template.contentTemplate || "");
    setDescription(template.description || "");
    onDirtyChange?.(false);
    onModeChange("view");
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contentTemplate.trim()) return;

    if (template.id.startsWith("sys-")) {
      createMutation.mutate({
        code: template.code,
        name: name.trim(),
        channel,
        subjectTemplate: subjectTemplate.trim() || null,
        contentTemplate: contentTemplate.trim(),
        status,
        description: description.trim() || undefined,
      });
      return;
    }

    updateMutation.mutate({
      id: template.id,
      payload: {
        name: name.trim(),
        channel,
        subjectTemplate: subjectTemplate.trim() || null,
        contentTemplate: contentTemplate.trim(),
        status,
        description: description.trim() || undefined,
      },
    });
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <aside
      aria-label={
        isVietnamese ? "Chi tiết mẫu thông báo" : "Notification template details"
      }
      data-testid="template-detail-panel"
      data-mode={mode}
      className={`group/panel relative overflow-hidden rounded-3xl bg-surface p-5 shadow-nm transition-all sm:p-6 ${className}`}
    >
      {/* Subtle Ambient Corner Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 -right-28 h-60 w-60 rounded-full bg-gradient-to-br from-primary/15 via-accent/10 to-transparent blur-3xl"
      />

      <div className="relative space-y-5">
        {/* ── UNSAVED CHANGES TACTILE ALERT ─────────────────────────────────── */}
        {pendingSwitchTemplate && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-2xl border border-warning/25 bg-warning/10 p-4 text-xs shadow-nm-inset sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-surface text-warning shadow-nm-sm">
                <AlertTriangle className="size-4" />
              </span>
              <div className="space-y-0.5">
                <p className="font-extrabold text-foreground">
                  {isVietnamese
                    ? "Bạn có thay đổi chưa lưu"
                    : "You have unsaved changes"}
                </p>
                <p className="text-muted-foreground">
                  {isVietnamese
                    ? `Hủy các thay đổi hiện tại và chuyển sang "${pendingSwitchTemplate.name}"?`
                    : `Discard current edits and switch to "${pendingSwitchTemplate.name}"?`}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCancelSwitch}
                className="h-8 rounded-xl bg-surface px-3 text-[11px] font-bold shadow-nm-sm active:scale-95 active:shadow-nm-inset"
              >
                {isVietnamese ? "Ở lại sửa" : "Keep editing"}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={onConfirmSwitch}
                className="h-8 rounded-xl px-3 text-[11px] font-extrabold shadow-nm-sm active:scale-95"
              >
                {isVietnamese ? "Hủy & chuyển" : "Discard & switch"}
              </Button>
            </div>
          </div>
        )}

        {/* ── 1. STUDIO CONSOLE HEADER ──────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3.5">
          <div className="flex min-w-0 items-start gap-3.5">
            {/* Concentric Recessed Channel Dial */}
            <div className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-background/85 text-primary shadow-nm-inset">
              <ChannelIcon className="size-5" />
            </div>

            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-background/85 px-2.5 py-0.5 font-mono text-[10.5px] font-extrabold tracking-tight text-primary shadow-nm-inset">
                  {template.isSystem && <Lock className="size-2.5 opacity-80" />}
                  <span>{template.code}</span>
                </span>

                <span
                  className={`inline-flex items-center rounded-full border-0 px-2.5 py-0.5 text-[10px] font-extrabold ${categoryStyle.pillClass}`}
                >
                  {isVietnamese ? categoryInfo.vi : categoryInfo.en}
                </span>

                {mode === "edit" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-extrabold text-primary">
                    <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                    <span>{isVietnamese ? "Đang biên tập" : "Editing"}</span>
                  </span>
                )}
              </div>

              <h2 className="text-base font-black tracking-tight text-foreground sm:text-lg">
                {template.name}
              </h2>

              {template.description && mode === "view" && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {template.description}
                </p>
              )}
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={isVietnamese ? "Đóng chi tiết" : "Close details"}
              className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-surface text-muted-foreground shadow-nm-sm transition-all duration-150 hover:text-primary active:scale-95 active:shadow-nm-inset"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* ── 2. TACTILE ACTION BAR (VIEW MODE) ─────────────────────────────── */}
        {mode === "view" && (
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              {canEdit && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => onModeChange("edit")}
                  className="h-9 gap-1.5 rounded-xl px-3.5 text-xs font-extrabold shadow-nm-sm transition-all active:scale-95"
                >
                  <Edit className="size-3.5" />
                  <span>
                    {isVietnamese ? "Chỉnh sửa mẫu" : "Edit Template"}
                  </span>
                </Button>
              )}

              {onTestSend && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onTestSend(template)}
                  className="h-9 gap-1.5 rounded-xl bg-surface px-3.5 text-xs font-extrabold text-primary shadow-nm-sm transition-all hover:bg-primary/10 active:scale-95 active:shadow-nm-inset"
                >
                  <Send className="size-3.5" />
                  <span>{isVietnamese ? "Gửi thử nghiệm" : "Test Send"}</span>
                </Button>
              )}

              {/* Tactile Sound Equalizer Button */}
              <button
                type="button"
                onClick={() => playPreset(template.soundPreset)}
                className="group/snd inline-flex h-9 items-center gap-2 rounded-xl bg-surface px-3 text-xs font-extrabold text-foreground shadow-nm-sm transition-all duration-150 hover:text-primary active:scale-95 active:shadow-nm-inset"
              >
                <Volume2 className="size-3.5 text-primary transition-transform group-hover/snd:scale-110" />
                <span className="capitalize">{template.soundPreset}</span>
                {/* Mini Equalizer Bars */}
                <span className="flex items-end gap-0.5 h-3" aria-hidden="true">
                  <span className="w-0.5 h-1.5 rounded-full bg-primary/60 transition-all group-hover/snd:h-3" />
                  <span className="w-0.5 h-3 rounded-full bg-primary transition-all group-hover/snd:h-1.5" />
                  <span className="w-0.5 h-2 rounded-full bg-primary/80 transition-all group-hover/snd:h-2.5" />
                </span>
              </button>
            </div>

            {canEdit && !template.isSystem && onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onDelete(template, false)}
                className="h-9 gap-1.5 rounded-xl bg-surface px-3 text-xs font-bold text-muted-foreground shadow-nm-sm transition-all hover:text-danger active:scale-95 active:shadow-nm-inset"
              >
                <Trash2 className="size-3.5" />
                <span>{isVietnamese ? "Xóa" : "Delete"}</span>
              </Button>
            )}
          </div>
        )}

        {/* ── 3A. VIEW MODE: STUDIO VIEWPORT & TELEMETRY ────────────────────── */}
        {mode === "view" && (
          <div className="space-y-4">
            {/* Recessed Segmented Control */}
            <div className="flex gap-1.5 rounded-2xl bg-background/80 p-1.5 shadow-nm-inset">
              <button
                type="button"
                onClick={() => setViewTab("rendered")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-extrabold transition-all duration-200 ${viewTab === "rendered"
                    ? "bg-surface text-primary shadow-nm-sm"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <Eye className="size-3.5" />
                <span>
                  {isVietnamese ? "Xem trước thực tế" : "Live Preview"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setViewTab("source")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-extrabold transition-all duration-200 ${viewTab === "source"
                    ? "bg-surface text-primary shadow-nm-sm"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <Code2 className="size-3.5" />
                <span>{isVietnamese ? "Mã nguồn" : "Source"}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewTab("variables")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-extrabold transition-all duration-200 ${viewTab === "variables"
                    ? "bg-surface text-primary shadow-nm-sm"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <Sliders className="size-3.5" />
                <span>{isVietnamese ? "Biến giả định" : "Sample Data"}</span>
              </button>
            </div>

            {/* Sub-tab 1: Realistic Channel Simulation Stage */}
            {viewTab === "rendered" && (
              <div>
                {template.channel === "EMAIL" ? (
                  <div className="overflow-hidden rounded-2xl bg-background/80 shadow-nm-inset">
                    {/* Mail Client Window Top Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-surface/65 px-4 py-2.5 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-1.5" aria-hidden="true">
                          <span className="size-2 rounded-full bg-primary/70" />
                          <span className="size-2 rounded-full bg-accent/80" />
                          <span className="size-2 rounded-full bg-muted-foreground/40" />
                        </div>
                        <span className="font-bold text-foreground">
                          {isVietnamese
                            ? "Hộp thư mô phỏng"
                            : "Email Client Preview"}
                        </span>
                      </div>
                      <span className="rounded-md bg-background/80 px-2 py-0.5 font-mono text-[10px] font-bold text-primary shadow-nm-inset">
                        EmailWorker · HTML
                      </span>
                    </div>

                    <div className="space-y-3 p-4">
                      {/* Envelope Header */}
                      <div className="space-y-1.5 rounded-xl bg-surface/60 p-3 text-xs">
                        <div className="flex items-baseline gap-2">
                          <span className="w-16 shrink-0 text-[11px] font-semibold text-muted-foreground">
                            {isVietnamese ? "Tiêu đề:" : "Subject:"}
                          </span>
                          <span className="font-extrabold text-foreground">
                            {backendPreview?.subject || renderedSubject}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="w-16 shrink-0 text-[11px] font-semibold text-muted-foreground">
                            {isVietnamese ? "Tới:" : "To:"}
                          </span>
                          <span className="font-mono text-[11px] font-medium text-muted-foreground">
                            safety.officer@smart-ppe.local
                          </span>
                        </div>
                      </div>

                      {previewMutation.isPending ? (
                        <div className="flex items-center justify-center gap-2 py-10 text-xs font-medium text-muted-foreground">
                          <RefreshCw className="size-4 animate-spin text-primary" />
                          <span>
                            {isVietnamese
                              ? "Đang dựng khung HTML Email..."
                              : "Rendering HTML email frame..."}
                          </span>
                        </div>
                      ) : sanitizedBackendHtml ? (
                        <div
                          className="max-h-72 overflow-auto rounded-xl border border-border/40 bg-white p-4 text-[#1b2632] shadow-sm"
                          dangerouslySetInnerHTML={{
                            __html: sanitizedBackendHtml,
                          }}
                        />
                      ) : (
                        <div className="rounded-xl border border-border/40 bg-white p-5 text-[#1b2632] shadow-sm">
                          <h4 className="mb-2.5 text-center text-sm font-extrabold text-[#a35139]">
                            {renderedSubject}
                          </h4>
                          <div className="whitespace-pre-wrap text-xs leading-relaxed text-[#2c3b4d]">
                            {renderedContent}
                          </div>
                          <hr className="my-3.5 border-[#d6d0c5]" />
                          <p className="text-center text-[10px] font-medium text-[#2c3b4d]/65">
                            {isVietnamese
                              ? "Email tự động từ hệ thống giám sát an toàn Smart PPE."
                              : "Automated alert from Smart PPE Safety Monitoring."}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : template.channel === "IN_APP" || template.channel === "WEB" ? (
                  <div className="space-y-3 rounded-2xl bg-background/80 p-4 shadow-nm-inset">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5 font-extrabold text-foreground">
                        <Bell className="size-3.5 text-primary" />
                        <span>
                          {isVietnamese
                            ? "Mô phỏng Thông báo đẩy (In-App Toast)"
                            : "In-App Push Notification Preview"}
                        </span>
                      </span>
                      <span className="rounded-md bg-surface px-2 py-0.5 font-mono text-[10px] font-bold text-primary shadow-nm-sm">
                        {isVietnamese ? "Vừa xong" : "Just now"}
                      </span>
                    </div>

                    {/* Floating Extruded Notification Card inside Recessed Stage */}
                    <div className="flex gap-3.5 rounded-2xl bg-surface p-4 shadow-nm-sm">
                      <span
                        aria-hidden="true"
                        className={`w-1 shrink-0 rounded-full ${categoryStyle.accentBarClass}`}
                      />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="relative flex size-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                            <span className="relative inline-flex size-2 rounded-full bg-primary" />
                          </span>
                          <span className="rounded-md bg-background/85 px-2 py-0.5 font-mono text-[10px] font-extrabold text-muted-foreground shadow-nm-inset">
                            {channelInfo.label}
                          </span>
                          <span
                            className={`rounded-full border-0 px-2.5 py-0.5 text-[10px] font-bold ${categoryStyle.pillClass}`}
                          >
                            {isVietnamese ? categoryInfo.vi : categoryInfo.en}
                          </span>
                        </div>
                        <p className="text-sm font-black tracking-tight text-foreground">
                          {renderedSubject}
                        </p>
                        <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/85">
                          {renderedContent}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 rounded-2xl bg-background/80 p-4 shadow-nm-inset">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-extrabold text-foreground">
                        {isVietnamese
                          ? `Payload kênh ${channelInfo.label}`
                          : `${channelInfo.label} Channel Payload`}
                      </span>
                      <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-[10px] font-bold text-warning">
                        {isVietnamese
                          ? "Kênh mở rộng (chờ cấu hình transport)"
                          : "Extended channel (transport pending)"}
                      </span>
                    </div>
                    {renderedSubject && (
                      <p className="text-xs font-extrabold text-foreground">
                        {renderedSubject}
                      </p>
                    )}
                    <div className="whitespace-pre-wrap rounded-xl bg-surface p-3.5 font-mono text-xs leading-relaxed text-foreground/90 shadow-nm-sm">
                      {renderedContent}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 2: Source Code */}
            {viewTab === "source" && (
              <div className="space-y-3.5">
                <div>
                  <span className="mb-1.5 block text-[10.5px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    {isVietnamese
                      ? "Tiêu đề khuôn mẫu (Subject)"
                      : "Subject Template"}
                  </span>
                  <div className="rounded-2xl bg-background/80 p-3.5 font-mono text-xs leading-relaxed text-foreground shadow-nm-inset">
                    {template.subjectTemplate
                      ? renderHighlightedTemplateTokens(template.subjectTemplate)
                      : "—"}
                  </div>
                </div>

                <div>
                  <span className="mb-1.5 block text-[10.5px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    {isVietnamese
                      ? "Nội dung khuôn mẫu (Content)"
                      : "Content Template"}
                  </span>
                  <div className="max-h-60 overflow-auto whitespace-pre-wrap rounded-2xl bg-background/80 p-3.5 font-mono text-xs leading-relaxed text-foreground shadow-nm-inset">
                    {renderHighlightedTemplateTokens(template.contentTemplate)}
                  </div>
                </div>

                {detectedPlaceholders.length > 0 && (
                  <div>
                    <span className="mb-1.5 block text-[10.5px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      {isVietnamese
                        ? `Biến động đang sử dụng (${detectedPlaceholders.length})`
                        : `Active Placeholders (${detectedPlaceholders.length})`}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {detectedPlaceholders.map((key) => (
                        <span
                          key={key}
                          className="rounded-xl bg-background/85 px-2.5 py-1 font-mono text-[11px] font-extrabold text-primary shadow-nm-inset"
                        >
                          {`{{${key}}}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 3: Sample Variables JSON */}
            {viewTab === "variables" && (
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    {isVietnamese
                      ? "Dữ liệu giả định (JSON)"
                      : "Mock Payload (JSON)"}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetVariables}
                      className="inline-flex items-center gap-1 rounded-xl bg-surface px-2.5 py-1 text-[11px] font-bold text-muted-foreground shadow-nm-sm transition-all hover:text-foreground active:scale-95 active:shadow-nm-inset"
                    >
                      <RotateCcw className="size-3" />
                      <span>{isVietnamese ? "Mặc định" : "Reset"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyVariables}
                      className="inline-flex items-center gap-1 rounded-xl bg-surface px-3 py-1 text-[11px] font-extrabold text-primary shadow-nm-sm transition-all hover:bg-primary/10 active:scale-95 active:shadow-nm-inset"
                    >
                      <RefreshCw className="size-3" />
                      <span>
                        {isVietnamese ? "Áp dụng xem trước" : "Apply Preview"}
                      </span>
                    </button>
                  </div>
                </div>

                <textarea
                  rows={8}
                  value={variablesText}
                  onChange={(e) => {
                    setVariablesText(e.target.value);
                    if (variablesJsonError) setVariablesJsonError(null);
                  }}
                  className="w-full rounded-2xl bg-background/85 p-3.5 font-mono text-xs text-foreground shadow-nm-inset outline-none focus:ring-2 focus:ring-primary/30"
                />

                {variablesJsonError && (
                  <p className="text-xs font-semibold text-danger">
                    {variablesJsonError}
                  </p>
                )}
              </div>
            )}

            {/* 2x2 Recessed Telemetry Matrix */}
            <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-2xl bg-background/75 p-3 shadow-nm-inset">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-surface text-primary shadow-nm-sm">
                  <ChannelIcon className="size-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    {isVietnamese ? "Kênh phát" : "Channel"}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-xs font-extrabold text-foreground">
                    {template.channel}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-background/75 p-3 shadow-nm-inset">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-surface text-primary shadow-nm-sm">
                  <Database className="size-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    {isVietnamese ? "Nguồn lưu trữ" : "Storage"}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-extrabold text-foreground">
                    {template.isSystem
                      ? template.isVirtualDefault
                        ? isVietnamese
                          ? "Mặc định hệ thống"
                          : "Built-in Default"
                        : isVietnamese
                          ? "Hệ thống (Đã sửa)"
                          : "System Override"
                      : isVietnamese
                        ? "Tùy chỉnh (DB)"
                        : "Custom Record"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-background/75 p-3 shadow-nm-inset">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-surface text-primary shadow-nm-sm">
                  <Clock className="size-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    {isVietnamese ? "Cập nhật" : "Updated"}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-extrabold text-foreground">
                    {formatUpdatedTimestamp(
                      template.updatedAt,
                      locale,
                      isVietnamese,
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-background/75 p-3 shadow-nm-inset">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-surface text-primary shadow-nm-sm">
                  <Sparkles className="size-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    {isVietnamese ? "Biến động" : "Variables"}
                  </p>
                  <p className="mt-0.5 font-mono text-xs font-extrabold text-foreground">
                    {detectedPlaceholders.length}{" "}
                    {isVietnamese ? "biến" : "tokens"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 3B. INLINE EDIT STUDIO MODE ───────────────────────────────────── */}
        {mode === "edit" && (
          <form onSubmit={handleSaveSubmit} className="space-y-4">
            {template.isVirtualDefault && (
              <div className="rounded-2xl bg-primary/[0.08] px-3.5 py-2.5 text-[11.5px] font-semibold leading-relaxed text-foreground/90 shadow-nm-inset">
                {isVietnamese
                  ? "Mẫu hệ thống mặc định: khi bấm Lưu, hệ thống sẽ tạo bản ghi tùy biến riêng trong cơ sở dữ liệu."
                  : "Built-in default template: saving creates a customized override record in the database."}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-foreground">
                  {isVietnamese
                    ? "Tên hiển thị mẫu *"
                    : "Template Display Name *"}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl bg-background/85 px-3.5 py-2.5 text-xs font-semibold text-foreground shadow-nm-inset outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-foreground">
                  {isVietnamese ? "Trạng thái kích hoạt" : "Template Status"}
                </label>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as "ACTIVE" | "INACTIVE")
                  }
                  className="w-full rounded-xl bg-background/85 px-3.5 py-2.5 text-xs font-bold text-foreground shadow-nm-inset outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="ACTIVE">
                    {isVietnamese
                      ? "KÍCH HOẠT (ACTIVE) — Sẵn sàng phát"
                      : "ACTIVE — Ready to send"}
                  </option>
                  <option value="INACTIVE">
                    {isVietnamese
                      ? "TẠM NGỪNG (INACTIVE) — Chặn gửi"
                      : "INACTIVE — Muted"}
                  </option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-foreground">
                  {isVietnamese ? "Kênh truyền phát" : "Delivery Channel"}
                </label>
                <select
                  value={channel}
                  onChange={(e) =>
                    setChannel(e.target.value as NotificationChannel)
                  }
                  className="w-full rounded-xl bg-background/85 px-3.5 py-2.5 text-xs font-bold text-foreground shadow-nm-inset outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="IN_APP">
                    {isVietnamese
                      ? "In-App Web (Trực tiếp)"
                      : "In-App Web (Direct)"}
                  </option>
                  <option value="EMAIL">
                    {isVietnamese ? "Thư điện tử (Email)" : "Email"}
                  </option>
                  <option value="WEBHOOK">
                    {isVietnamese ? "Webhook (ERP / Bot)" : "Webhook (ERP / Bot)"}
                  </option>
                  <option value="ZALO_ZNS">Zalo ZNS SMS</option>
                </select>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">
                    {isVietnamese
                      ? "Âm thanh cảnh báo"
                      : "Audio Alert Cue"}
                  </label>
                  <button
                    type="button"
                    onClick={() => playPreset(soundPreset)}
                    className="inline-flex items-center gap-1 rounded-lg bg-surface px-2 py-0.5 text-[10px] font-extrabold text-primary shadow-nm-sm active:scale-95 active:shadow-nm-inset"
                  >
                    <Volume2 className="size-3" />
                    <span>{isVietnamese ? "Nghe thử" : "Test"}</span>
                  </button>
                </div>
                <select
                  value={soundPreset}
                  onChange={(e) => {
                    const val = e.target.value as SoundPreset;
                    setSoundPreset(val);
                    playPreset(val);
                  }}
                  className="w-full rounded-xl bg-background/85 px-3.5 py-2.5 text-xs font-bold text-foreground shadow-nm-inset outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="critical">
                    {isVietnamese
                      ? "Còi khẩn cấp (Siren)"
                      : "Emergency Siren"}
                  </option>
                  <option value="warning">
                    {isVietnamese
                      ? "Chuông tam âm (Warning)"
                      : "Tri-tone Chime"}
                  </option>
                  <option value="info">
                    {isVietnamese ? "Giọt nước (Glass Pop)" : "Glass Pop"}
                  </option>
                  <option value="success">
                    {isVietnamese
                      ? "Hợp âm (Success Chord)"
                      : "Success Chord"}
                  </option>
                  <option value="radio">
                    {isVietnamese
                      ? "Bộ đàm (Radio Chirp)"
                      : "Dispatch Radio"}
                  </option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-foreground">
                {isVietnamese
                  ? "Tiêu đề khuôn mẫu (Subject Template)"
                  : "Subject Template"}
              </label>
              <input
                type="text"
                value={subjectTemplate}
                onChange={(e) => setSubjectTemplate(e.target.value)}
                placeholder={
                  isVietnamese
                    ? "VD: Cảnh báo an toàn tại {{siteName}}"
                    : "e.g., Safety Alert at {{siteName}}"
                }
                className="w-full rounded-xl bg-background/85 px-3.5 py-2.5 text-xs font-semibold text-foreground shadow-nm-inset outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">
                  {isVietnamese
                    ? "Nội dung khuôn mẫu *"
                    : "Content Template *"}
                </label>
                <span className="text-[10px] font-medium text-muted-foreground">
                  {isVietnamese
                    ? "Bấm phím cơ học bên dưới để chèn biến"
                    : "Press keycaps below to insert variables"}
                </span>
              </div>

              {/* Tactile Variable Keycaps */}
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {placeholderChips.map((ph) => (
                  <button
                    key={ph.key}
                    type="button"
                    onClick={() => handleInsertPlaceholder(ph.token)}
                    title={`${isVietnamese ? ph.labelVi : ph.labelEn} (${isVietnamese ? "VD" : "e.g."}: ${ph.sample})`}
                    className="inline-flex items-center gap-1 rounded-lg bg-surface px-2.5 py-1 font-mono text-[10px] font-extrabold text-primary shadow-nm-sm transition-all hover:bg-primary/10 active:scale-95 active:shadow-nm-inset"
                  >
                    <span className="size-1 rounded-full bg-primary/70" />
                    <span>{ph.token}</span>
                  </button>
                ))}
              </div>

              <textarea
                ref={contentTextareaRef}
                required
                rows={5}
                value={contentTemplate}
                onChange={(e) => setContentTemplate(e.target.value)}
                className="w-full rounded-2xl bg-background/85 p-3.5 font-sans text-xs leading-relaxed text-foreground shadow-nm-inset outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Live Interpolated Preview Box */}
            <div className="rounded-2xl bg-background/75 p-3.5 shadow-nm-inset">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-primary">
                  <Eye className="size-3.5" />
                  <span>
                    {isVietnamese
                      ? "Xem trước trực tiếp khi gõ"
                      : "Live Preview"}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowLivePreview((prev) => !prev)}
                  className="text-[11px] font-bold text-muted-foreground hover:text-primary"
                >
                  {showLivePreview
                    ? isVietnamese
                      ? "Thu gọn"
                      : "Collapse"
                    : isVietnamese
                      ? "Mở rộng"
                      : "Expand"}
                </button>
              </div>

              {showLivePreview && (
                <div className="mt-2.5 space-y-1.5 rounded-xl bg-surface p-3 shadow-nm-sm">
                  <p className="text-xs font-extrabold text-foreground">
                    {liveEditSubject || "—"}
                  </p>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/85">
                    {liveEditContent || "—"}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-foreground">
                {isVietnamese
                  ? "Ghi chú & Hướng dẫn sử dụng"
                  : "Usage Notes"}
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl bg-background/85 px-3.5 py-2.5 text-xs font-medium text-foreground shadow-nm-inset outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Form Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <span className="text-[11px] font-semibold text-muted-foreground">
                {isDirty
                  ? isVietnamese
                    ? "● Có thay đổi chưa được lưu"
                    : "● Unsaved changes"
                  : isVietnamese
                    ? "Đã đồng bộ"
                    : "Synced"}
              </span>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="h-9 rounded-xl bg-surface px-3.5 text-xs font-bold shadow-nm-sm active:scale-95 active:shadow-nm-inset"
                >
                  {isVietnamese ? "Hủy" : "Cancel"}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSaving || !name.trim() || !contentTemplate.trim()}
                  className="flex h-9 items-center gap-1.5 rounded-xl px-4 text-xs font-extrabold shadow-nm-sm active:scale-95"
                >
                  <Check className="size-4" />
                  <span>
                    {isSaving
                      ? isVietnamese
                        ? "Đang lưu..."
                        : "Saving..."
                      : isVietnamese
                        ? "Lưu thay đổi"
                        : "Save Changes"}
                  </span>
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </aside>
  );
}
