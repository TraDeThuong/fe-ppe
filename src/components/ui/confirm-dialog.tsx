
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
  ArrowRight,
  Check,
  LoaderCircle,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";

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
  className?: string;
}

const variantConfig = {
  danger: {
    icon: Trash2,
    eyebrow: "DANGEROUS ACTION",
    accent: "text-danger",
    iconSurface:
      "bg-danger/10 text-danger shadow-[inset_3px_3px_7px_rgba(0,0,0,0.08),inset_-3px_-3px_7px_rgba(255,255,255,0.12)]",
    ring: "border-danger/20",
    button:
      "bg-danger text-danger-foreground shadow-[5px_5px_12px_rgba(220,38,38,0.20),-3px_-3px_9px_rgba(255,255,255,0.12)] hover:shadow-[7px_7px_16px_rgba(220,38,38,0.28),-3px_-3px_9px_rgba(255,255,255,0.15)] active:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.18)]",
    dot: "bg-danger",
  },
  warning: {
    icon: AlertTriangle,
    eyebrow: "ATTENTION REQUIRED",
    accent: "text-warning",
    iconSurface:
      "bg-warning/10 text-warning shadow-[inset_3px_3px_7px_rgba(0,0,0,0.08),inset_-3px_-3px_7px_rgba(255,255,255,0.12)]",
    ring: "border-warning/20",
    button:
      "bg-warning text-warning-foreground shadow-[5px_5px_12px_rgba(217,119,6,0.20),-3px_-3px_9px_rgba(255,255,255,0.12)] hover:shadow-[7px_7px_16px_rgba(217,119,6,0.28),-3px_-3px_9px_rgba(255,255,255,0.15)] active:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.18)]",
    dot: "bg-warning",
  },
  default: {
    icon: ShieldAlert,
    eyebrow: "CONFIRM YOUR ACTION",
    accent: "text-primary",
    iconSurface:
      "bg-primary/10 text-primary shadow-[inset_3px_3px_7px_rgba(0,0,0,0.08),inset_-3px_-3px_7px_rgba(255,255,255,0.12)]",
    ring: "border-primary/20",
    button:
      "bg-primary text-primary-foreground shadow-[5px_5px_12px_rgba(0,0,0,0.12),-3px_-3px_9px_rgba(255,255,255,0.12)] hover:shadow-[7px_7px_16px_rgba(0,0,0,0.16),-3px_-3px_9px_rgba(255,255,255,0.15)] active:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.18)]",
    dot: "bg-primary",
  },
} as const;

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Are you absolutely sure?",
  description = "This action cannot be undone. Please review before proceeding.",
  confirmText = "Yes, delete it",
  cancelText = "Keep it",
  variant = "danger",
  loading = false,
  disabled = false,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  icon,
  children,
  itemName,
  className = "",
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const busy = loading || submitting;
  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleClose = useCallback(() => {
    if (!busy) onClose();
  }, [busy, onClose]);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const frame = requestAnimationFrame(() => {
      cancelRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && closeOnEscape) {
        event.preventDefault();
        handleClose();
      }

      if (event.key === "Tab" && panelRef.current) {
        const elements = panelRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], input:not(:disabled), [tabindex]:not([tabindex="-1"])'
        );

        if (!elements.length) return;

        const first = elements[0];
        const last = elements[elements.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === last
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
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

  return createPortal(
    <>
      <style>{`
        @keyframes cd-backdrop-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes cd-dialog-in {
          0% { opacity: 0; transform: translateY(16px) scale(.96); }
          65% { opacity: 1; transform: translateY(-2px) scale(1.005); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes cd-icon-in {
          0% { opacity: 0; transform: scale(.65) rotate(-12deg); }
          75% { opacity: 1; transform: scale(1.06) rotate(2deg); }
          100% { opacity: 1; transform: scale(1) rotate(0); }
        }
        @keyframes cd-orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .cd-backdrop-in { animation: cd-backdrop-in .22s ease-out both; }
        .cd-dialog-in { animation: cd-dialog-in .42s cubic-bezier(.2,.8,.2,1) both; }
        .cd-icon-in { animation: cd-icon-in .55s cubic-bezier(.2,.8,.2,1) both; }
        .cd-orbit { animation: cd-orbit 18s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .cd-backdrop-in, .cd-dialog-in, .cd-icon-in, .cd-orbit {
            animation: none !important;
          }
        }
      `}</style>

      <div
        className="cd-backdrop-in fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto bg-[#111820]/45 p-3 backdrop-blur-[7px] sm:p-6"
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
          aria-describedby={descriptionId}
          aria-busy={busy}
          className={[
            "cd-dialog-in relative my-auto w-full max-w-[440px] max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-[32px]",
            "border border-white/40 bg-background text-foreground",
            "shadow-[18px_18px_42px_rgba(20,28,38,0.20),-12px_-12px_36px_rgba(255,255,255,0.58)]",
            "dark:border-white/[0.07] dark:shadow-[18px_18px_42px_rgba(0,0,0,0.38),-8px_-8px_30px_rgba(41,55,71,0.30)]",
            className,
          ].join(" ")}
        >
          {/* Decorative ambient lighting */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-44 overflow-hidden"
          >
            <div
              className={[
                "absolute -right-12 -top-20 h-48 w-48 rounded-full blur-3xl",
                variant === "danger"
                  ? "bg-danger/[0.09]"
                  : variant === "warning"
                    ? "bg-warning/[0.10]"
                    : "bg-primary/[0.09]",
              ].join(" ")}
            />
            <div className="absolute -left-16 top-4 h-32 w-32 rounded-full bg-primary/[0.06] blur-3xl" />
          </div>

          {/* Outer raised lip + recessed inner surface */}
          <div className="relative m-[5px] overflow-hidden rounded-[28px] border border-border/60 bg-background shadow-[inset_2px_2px_5px_rgba(0,0,0,0.045),inset_-2px_-2px_5px_rgba(255,255,255,0.32)] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.15),inset_-2px_-2px_5px_rgba(255,255,255,0.025)]">
            {/* Top ornament */}
            <div className="relative flex items-center justify-between px-6 pt-5 sm:px-8">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2 w-2">
                  <span
                    className={[
                      "absolute inline-flex h-full w-full animate-ping rounded-full opacity-35",
                      config.dot,
                    ].join(" ")}
                  />
                  <span
                    className={[
                      "relative inline-flex h-2 w-2 rounded-full",
                      config.dot,
                    ].join(" ")}
                  />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                  {config.eyebrow}
                </span>
              </div>

              <button
                type="button"
                onClick={handleClose}
                disabled={busy}
                aria-label="Close dialog"
                className="group flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-background text-muted-foreground shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] transition-all duration-200 hover:text-foreground active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <X className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
              </button>
            </div>

            {/* Hero icon */}
            <div className="relative flex flex-col items-center px-6 pb-1 pt-7 sm:px-8 sm:pt-8">
              <div className="relative flex h-[116px] w-[116px] items-center justify-center">
                {/* Outer raised halo */}
                <div className="absolute inset-0 rounded-[36px] border border-white/50 bg-background shadow-[9px_9px_19px_var(--shadow-dark),-9px_-9px_19px_var(--shadow-light)] dark:border-white/[0.05]" />

                {/* Recessed circular track */}
                <div className="absolute inset-[10px] rounded-[29px] border border-border/40 bg-background shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_var(--shadow-light)]" />

                {/* Fine decorative orbit */}
                <div
                  aria-hidden="true"
                  className="cd-orbit absolute inset-[17px] rounded-[25px] border border-dashed border-border/80"
                />

                {/* Main embossed icon */}
                <div
                  className={[
                    "cd-icon-in relative flex h-[64px] w-[64px] items-center justify-center rounded-[22px] border",
                    config.ring,
                    config.iconSurface,
                    "shadow-[5px_5px_12px_rgba(0,0,0,0.09),-5px_-5px_12px_rgba(255,255,255,0.45)]",
                    "dark:shadow-[5px_5px_12px_rgba(0,0,0,0.20),-4px_-4px_10px_rgba(255,255,255,0.035)]",
                  ].join(" ")}
                >
                  {icon ?? <Icon className="h-[29px] w-[29px]" strokeWidth={1.8} />}
                </div>

                {/* Small floating highlight */}
                <span className="absolute right-[10px] top-[12px] h-3 w-3 rounded-full border-2 border-background bg-accent shadow-[0_0_12px_rgba(255,177,98,0.4)]" />
              </div>

              <h2
                id={titleId}
                className="mt-6 max-w-full text-center text-[25px] font-bold leading-tight tracking-[-0.045em] text-foreground sm:text-[29px]"
              >
                {title}
              </h2>

              <p
                id={descriptionId}
                className="mt-3 max-w-[330px] text-center text-[13px] leading-[1.85] text-muted-foreground sm:text-sm"
              >
                {description}
              </p>
            </div>

            {/* Optional item preview / custom content */}
            {itemName && (
              <div className="mx-6 mt-6 sm:mx-8">
                <div className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-danger/15 bg-danger/[0.045] p-3.5 shadow-[inset_3px_3px_7px_rgba(0,0,0,0.035),inset_-3px_-3px_7px_rgba(255,255,255,0.25)] dark:bg-danger/[0.06] dark:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.12),inset_-3px_-3px_7px_rgba(255,255,255,0.015)]">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-danger/15 bg-background text-danger shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)]">
                    <Trash2 className="h-[17px] w-[17px]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      Item to be deleted
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-foreground">
                      {itemName}
                    </p>
                  </div>
                  <AlertTriangle className="h-4 w-4 shrink-0 text-danger/70" />
                </div>
              </div>
            )}

            {children && (
              <div className="px-6 pt-5 sm:px-8">{children}</div>
            )}

            {/* Recessed divider */}
            <div className="mx-6 mt-7 h-px bg-border/70 shadow-[0_1px_1px_rgba(255,255,255,0.4)] sm:mx-8" />

            {/* Action area */}
            <div className="relative px-6 pb-6 pt-5 sm:px-8 sm:pb-8">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={busy || disabled}
                className={[
                  "group relative flex min-h-[54px] w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl px-5 py-3",
                  "text-[13px] font-bold tracking-[0.01em]",
                  "transition-all duration-200 ease-out",
                  "hover:-translate-y-0.5 active:translate-y-0",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0",
                  config.button,
                ].join(" ")}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/40"
                />

                {busy ? (
                  <>
                    <LoaderCircle className="h-[17px] w-[17px] animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Icon className="h-[17px] w-[17px] transition-transform duration-200 group-hover:scale-110" />
                    <span>{confirmText}</span>
                    <ArrowRight className="absolute right-5 h-4 w-4 opacity-60 transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-100" />
                  </>
                )}
              </button>

              <button
                ref={cancelRef}
                type="button"
                onClick={handleClose}
                disabled={busy}
                className="group mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-border/50 bg-background px-4 py-3 text-[13px] font-semibold text-muted-foreground shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)] transition-all duration-200 hover:text-foreground active:shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check className="h-4 w-4 opacity-50 transition-transform group-hover:scale-110" />
                {cancelText}
              </button>

              {/* Trust / safety footer */}
              <div className="mt-5 flex items-center justify-center gap-2">
                <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span className="text-[10px] font-medium tracking-wide text-muted-foreground/80">
                  Please review this action before continuing
                </span>
              </div>
            </div>
          </div>

          {/* Bottom ornamental accent */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-[28%] bottom-0 h-[2px] rounded-full bg-gradient-to-r from-transparent via-primary/40 to-transparent"
          />
        </div>
      </div>
    </>,
    document.body,
  );
}
