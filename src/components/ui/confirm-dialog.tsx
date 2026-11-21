"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  LoaderCircle,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { useLocale } from "@/providers/locale-provider";

export type ConfirmDialogVariant = "danger" | "warning" | "default";

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
  loading?: boolean;
  disabled?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
  itemName?: string;
  itemLabel?: string;
  className?: string;
}

const variantConfig = {
  danger: {
    icon: Trash2,
    eyebrowVi: "Cảnh báo thao tác",
    eyebrowEn: "Dangerous action",
    accent: "text-danger",
    iconSurface:
      "bg-danger/10 text-danger border-danger/25 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.06),inset_-2px_-2px_5px_rgba(255,255,255,0.12)]",
    itemSurface:
      "border-danger/20 bg-danger/[0.05] dark:bg-danger/[0.08]",
    itemIconSurface:
      "border-danger/20 bg-background text-danger",
    rimGradient: "via-danger/45",
    glow: "bg-danger/[0.08]",
    button:
      "bg-danger text-danger-foreground shadow-[5px_5px_12px_rgba(220,38,38,0.22),-3px_-3px_9px_rgba(255,255,255,0.10)] hover:brightness-105 hover:shadow-[7px_7px_16px_rgba(220,38,38,0.28),-3px_-3px_9px_rgba(255,255,255,0.12)] active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.22)] focus-visible:ring-danger/60",
    dot: "bg-danger",
  },
  warning: {
    icon: AlertTriangle,
    eyebrowVi: "Cần xác nhận",
    eyebrowEn: "Attention required",
    accent: "text-warning",
    iconSurface:
      "bg-warning/10 text-warning border-warning/25 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.06),inset_-2px_-2px_5px_rgba(255,255,255,0.12)]",
    itemSurface:
      "border-warning/25 bg-warning/[0.06] dark:bg-warning/[0.09]",
    itemIconSurface:
      "border-warning/25 bg-background text-warning",
    rimGradient: "via-warning/45",
    glow: "bg-warning/[0.09]",
    button:
      "bg-warning text-warning-foreground shadow-[5px_5px_12px_rgba(217,119,6,0.22),-3px_-3px_9px_rgba(255,255,255,0.10)] hover:brightness-105 hover:shadow-[7px_7px_16px_rgba(217,119,6,0.28),-3px_-3px_9px_rgba(255,255,255,0.12)] active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.22)] focus-visible:ring-warning/60",
    dot: "bg-warning",
  },
  default: {
    icon: ShieldAlert,
    eyebrowVi: "Xác nhận thao tác",
    eyebrowEn: "Confirm action",
    accent: "text-primary",
    iconSurface:
      "bg-primary/10 text-primary border-primary/25 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.06),inset_-2px_-2px_5px_rgba(255,255,255,0.12)]",
    itemSurface:
      "border-primary/20 bg-primary/[0.05] dark:bg-primary/[0.08]",
    itemIconSurface:
      "border-primary/20 bg-background text-primary",
    rimGradient: "via-primary/45",
    glow: "bg-primary/[0.08]",
    button:
      "bg-primary text-primary-foreground shadow-[5px_5px_12px_rgba(0,0,0,0.14),-3px_-3px_9px_rgba(255,255,255,0.10)] hover:brightness-105 hover:shadow-[7px_7px_16px_rgba(0,0,0,0.18),-3px_-3px_9px_rgba(255,255,255,0.12)] active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.22)] focus-visible:ring-primary/60",
    dot: "bg-primary",
  },
} as const;

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  variant = "danger",
  loading = false,
  disabled = false,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  icon,
  children,
  itemName,
  itemLabel,
  className = "",
}: ConfirmDialogProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const busy = loading || submitting;
  const config = variantConfig[variant];
  const Icon = config.icon;

  const resolvedTitle =
    title ??
    (isVietnamese ? "Xác nhận thực hiện thao tác?" : "Are you absolutely sure?");
  const resolvedDescription =
    description ??
    (isVietnamese
      ? "Vui lòng kiểm tra kỹ thông tin trước khi tiếp tục."
      : "Please review this action carefully before continuing.");
  const resolvedConfirmText =
    confirmText ?? (isVietnamese ? "Xác nhận" : "Confirm");
  const resolvedCancelText =
    cancelText ?? (isVietnamese ? "Hủy bỏ" : "Cancel");
  const resolvedItemLabel =
    itemLabel ??
    (isVietnamese ? "Đối tượng áp dụng" : "Selected target");
  const eyebrowText = isVietnamese ? config.eyebrowVi : config.eyebrowEn;

  const handleClose = useCallback(() => {
    if (!busy) onClose();
  }, [busy, onClose]);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const frame = requestAnimationFrame(() => {
      cancelRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && closeOnEscape) {
        event.preventDefault();
        handleClose();
      }

      if (event.key === "Tab" && panelRef.current) {
        const elements = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(
            'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter(
          (element) =>
            element.offsetParent !== null &&
            element.getAttribute("aria-hidden") !== "true",
        );

        if (!elements.length) return;

        const first = elements[0];
        const last = elements[elements.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [open, closeOnEscape, handleClose]);

  const handleConfirm = async () => {
    if (busy || disabled) return;

    try {
      setSubmitting(true);
      await onConfirm();
    } catch (error) {
      // Giữ dialog mở nếu thao tác thất bại.
      console.error("ConfirmDialog action failed:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || typeof document === "undefined") return null;

  const hasBody = Boolean(resolvedDescription || itemName || children);

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/35 p-3 backdrop-blur-[5px] animate-in fade-in duration-200 motion-reduce:animate-none dark:bg-black/55 sm:p-6"
      onMouseDown={(event) => {
        if (
          closeOnOverlayClick &&
          event.target === event.currentTarget
        ) {
          handleClose();
        }
      }}
    >
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={resolvedDescription ? descriptionId : undefined}
        aria-busy={busy}
        className={[
          "relative my-auto w-full max-w-[480px] outline-none",
          "max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)]",
          "animate-in fade-in zoom-in-[0.98] slide-in-from-bottom-2 duration-200 motion-reduce:animate-none motion-reduce:transform-none",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* 3D sculpted outer base */}
        <div className="relative isolate rounded-[24px] bg-[color-mix(in_srgb,var(--shadow-dark)_48%,var(--background))] pb-[4px] shadow-[0_10px_22px_color-mix(in_srgb,var(--shadow-dark)_28%,transparent)] sm:rounded-[26px]">
          {/* Main surface */}
          <div className="relative flex max-h-[calc(100dvh-1.75rem)] flex-col overflow-hidden rounded-[23px] border border-border/50 bg-background text-foreground shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] sm:max-h-[calc(100dvh-3.25rem)] sm:rounded-[25px]">
            {/* Top specular rim & subtle variant tint */}
            <div
              aria-hidden="true"
              className={[
                "pointer-events-none absolute inset-x-8 top-0 z-20 h-[2px] bg-gradient-to-r from-transparent to-transparent",
                config.rimGradient,
              ].join(" ")}
            />
            <div
              aria-hidden="true"
              className={[
                "pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full blur-3xl",
                config.glow,
              ].join(" ")}
            />

            {/* Header */}
            <header className="relative z-10 flex shrink-0 items-start justify-between gap-3 px-4 pb-3 pt-4 sm:gap-4 sm:px-6 sm:pb-4 sm:pt-5">
              <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-3.5">
                <div
                  aria-hidden="true"
                  className={[
                    "flex size-10 shrink-0 items-center justify-center rounded-2xl border sm:size-11",
                    config.iconSurface,
                  ].join(" ")}
                >
                  {icon ?? <Icon className="h-5 w-5" strokeWidth={1.9} />}
                </div>

                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-1.5 w-1.5 shrink-0">
                      <span
                        className={[
                          "absolute inline-flex h-full w-full animate-ping rounded-full opacity-40",
                          config.dot,
                        ].join(" ")}
                      />
                      <span
                        className={[
                          "relative inline-flex h-1.5 w-1.5 rounded-full",
                          config.dot,
                        ].join(" ")}
                      />
                    </span>
                    <span className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                      {eyebrowText}
                    </span>
                  </div>

                  <h2
                    id={titleId}
                    className="mt-1 break-words [overflow-wrap:anywhere] text-base font-bold leading-snug tracking-tight text-foreground sm:text-lg"
                  >
                    {resolvedTitle}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                disabled={busy}
                aria-label={isVietnamese ? "Đóng hộp thoại" : "Close dialog"}
                className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-border/40 bg-background text-muted-foreground shadow-[3px_3px_5px_var(--shadow-dark),-3px_-3px_5px_var(--shadow-light)] transition-[transform,color,box-shadow] duration-200 hover:-translate-y-0.5 hover:text-destructive active:translate-y-0 active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 motion-reduce:transform-none disabled:cursor-not-allowed disabled:opacity-40 sm:size-9"
              >
                <X className="h-4 w-4" strokeWidth={1.9} />
              </button>
            </header>

            {/* Scrollable Body */}
            {hasBody && (
              <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain border-y border-border/35 px-4 py-3.5 sm:px-6 sm:py-4">
                <div className="min-w-0 space-y-3">
                  {resolvedDescription && (
                    <p
                      id={descriptionId}
                      className="break-words [overflow-wrap:anywhere] text-xs leading-relaxed text-muted-foreground sm:text-sm"
                    >
                      {resolvedDescription}
                    </p>
                  )}

                  {itemName && (
                    <div
                      className={[
                        "flex items-start gap-3 rounded-2xl border p-3 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.035),inset_-2px_-2px_5px_rgba(255,255,255,0.22)] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.14),inset_-2px_-2px_5px_rgba(255,255,255,0.02)]",
                        config.itemSurface,
                      ].join(" ")}
                    >
                      <div
                        aria-hidden="true"
                        className={[
                          "flex size-9 shrink-0 items-center justify-center rounded-xl border shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)]",
                          config.itemIconSurface,
                        ].join(" ")}
                      >
                        {icon ?? <Icon className="h-4 w-4" strokeWidth={1.9} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                          {resolvedItemLabel}
                        </p>
                        <p className="mt-0.5 break-words [overflow-wrap:anywhere] text-xs font-semibold leading-snug text-foreground sm:text-sm">
                          {itemName}
                        </p>
                      </div>
                    </div>
                  )}

                  {children && (
                    <div className="min-w-0 break-words [overflow-wrap:anywhere]">
                      {children}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <footer className="relative z-10 flex shrink-0 flex-col-reverse gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:gap-2.5 sm:px-6 sm:py-4">
              <button
                ref={cancelRef}
                type="button"
                onClick={handleClose}
                disabled={busy}
                className="flex min-h-[40px] w-full items-center justify-center rounded-xl border border-border/50 bg-background px-4 py-2 text-xs font-semibold text-muted-foreground shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] transition-[transform,color,box-shadow] duration-200 hover:text-foreground active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 motion-reduce:transform-none disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[38px] sm:w-auto sm:text-sm"
              >
                {resolvedCancelText}
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={busy || disabled}
                className={[
                  "flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold tracking-[0.01em] sm:min-h-[38px] sm:w-auto sm:px-5 sm:text-sm",
                  "transition-[transform,filter,box-shadow] duration-200 ease-out",
                  "hover:-translate-y-0.5 active:translate-y-0",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  "motion-reduce:transform-none motion-reduce:transition-none",
                  "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0",
                  config.button,
                ].join(" ")}
              >
                {busy ? (
                  <>
                    <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" />
                    <span>
                      {isVietnamese ? "Đang xử lý..." : "Processing..."}
                    </span>
                  </>
                ) : (
                  <>
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="text-center leading-tight">{resolvedConfirmText}</span>
                  </>
                )}
              </button>
            </footer>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
