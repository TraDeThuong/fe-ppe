
"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";
export type ModalDepth = "soft" | "medium" | "deep";
export type ModalBorder = "none" | "subtle" | "accent" | "glow";
export type ModalEffect = "raised" | "inset" | "flat";

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  icon?: ReactNode;
  footer?: ReactNode;

  size?: ModalSize;
  depth?: ModalDepth;
  border?: ModalBorder;
  accentColor?: string;

  contentEffect?: ModalEffect;
  iconEffect?: ModalEffect;
  footerEffect?: ModalEffect;

  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  preventClose?: boolean;

  ariaLabel?: string;
  className?: string;
  contentClassName?: string;
  footerClassName?: string;
  onClose?: () => void;
}

interface ModalEngineProps extends ModalProps {
  variant: "sculpted" | "recessed";
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-none w-full",
};

const DEPTH_VALUES: Record<ModalDepth, number> = {
  soft: 0.7,
  medium: 1,
  deep: 1.3,
};

const RAISED =
  "shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)]";

const INSET =
  "shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]";

function effectClass(effect: ModalEffect) {
  if (effect === "raised") return RAISED;
  if (effect === "inset") return INSET;
  return "shadow-none";
}

function ModalEngine({
  variant,
  open,
  onOpenChange,
  title,
  description,
  children,
  icon,
  footer,
  size = "md",
  depth = "medium",
  border = "subtle",
  accentColor,
  contentEffect,
  iconEffect = "raised",
  footerEffect = "flat",
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  preventClose = false,
  ariaLabel,
  className = "",
  contentClassName = "",
  footerClassName = "",
  onClose,
}: ModalEngineProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const titleId = useId();
  const descriptionId = useId();

  const resolvedContentEffect =
    contentEffect ?? (variant === "sculpted" ? "flat" : "raised");

  const close = useCallback(() => {
    if (preventClose) return;

    onOpenChange(false);
    onClose?.();
  }, [preventClose, onOpenChange, onClose]);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const frame = requestAnimationFrame(() => {
      dialogRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!closeOnEscape || preventClose) {
          event.preventDefault();
          return;
        }

        event.preventDefault();
        close();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          [
            "a[href]",
            "button:not(:disabled)",
            "input:not(:disabled)",
            "select:not(:disabled)",
            "textarea:not(:disabled)",
            '[tabindex]:not([tabindex="-1"])',
          ].join(","),
        ),
      ).filter(
        (element) =>
          element.offsetParent !== null &&
          element.getAttribute("aria-hidden") !== "true",
      );

      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === dialogRef.current)
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [open, closeOnEscape, preventClose, close]);

  if (!open || typeof document === "undefined") return null;

  const style = {
    "--nm-depth": DEPTH_VALUES[depth],
    ...(accentColor ? { "--nm-accent": accentColor } : {}),
  } as CSSProperties;

  const borderClasses: Record<ModalBorder, string> = {
    none: "border-transparent",
    subtle: "border-border/40",
    accent:
      "border-[color-mix(in_srgb,var(--nm-accent,var(--primary))_45%,var(--border))]",
    glow: [
      "border-[color-mix(in_srgb,var(--nm-accent,var(--primary))_60%,var(--border))]",
      "shadow-[0_4px_0_color-mix(in_srgb,var(--shadow-dark)_35%,var(--background)),0_5px_10px_color-mix(in_srgb,var(--shadow-dark)_25%,transparent)]",
    ].join(" "),
  };

  const modalShadow =
    variant === "sculpted"
      ? [
          "shadow-[calc(2px*var(--nm-depth))_calc(2px*var(--nm-depth))_4px_var(--shadow-dark),calc(-2px*var(--nm-depth))_calc(-2px*var(--nm-depth))_4px_var(--shadow-light)]",
        ].join(" ")
      : [
          "shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]",
        ].join(" ");

  return createPortal(
    <div
      className="
        fixed inset-0 z-[1000]
        flex items-center justify-center
        overflow-y-auto
        bg-black/30 p-3
        animate-in fade-in duration-200
        dark:bg-black/50
        sm:p-6
      "
      style={style}
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          closeOnBackdrop &&
          !preventClose
        ) {
          close();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        aria-label={ariaLabel}
        tabIndex={-1}
        className={[
          "relative my-auto w-full outline-none",
          "max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)]",
          "animate-in fade-in zoom-in-[0.98] slide-in-from-bottom-2 duration-200",
          SIZE_CLASSES[size],
          className,
        ].join(" ")}
      >
        {/* 3D base: cạnh đáy nổi 4px */}
        <div
          className={[
            "relative isolate rounded-[26px]",
            variant === "sculpted"
              ? [
                  "pb-[4px]",
                  "bg-[color-mix(in_srgb,var(--shadow-dark)_48%,var(--background))]",
                  "shadow-[0_7px_12px_color-mix(in_srgb,var(--shadow-dark)_22%,transparent)]",
                ].join(" ")
              : "",
          ].join(" ")}
        >
          {/* Main surface */}
          <div
            className={[
              "relative flex max-h-[calc(100dvh-1.5rem)] flex-col",
              "overflow-hidden rounded-[25px] border",
              "bg-background text-foreground",
              borderClasses[border],
              modalShadow,
            ].join(" ")}
          >
            {/* White reflection along the upper edge */}
            {variant === "sculpted" && (
              <>
                <div
                  aria-hidden="true"
                  className="
                    pointer-events-none absolute inset-x-5 top-0 z-20
                    h-px bg-white/80
                    dark:bg-white/20
                  "
                />
                <div
                  aria-hidden="true"
                  className="
                    pointer-events-none absolute bottom-1 left-0 top-5 z-20
                    w-px bg-white/45
                    dark:bg-white/10
                  "
                />
              </>
            )}

            {/* Header */}
            <header
              className="
                flex shrink-0 items-start justify-between gap-4
                px-5 pb-4 pt-5
                sm:px-6 sm:pb-5 sm:pt-6
              "
            >
              <div className="flex min-w-0 items-start gap-3.5">
                {icon && (
                  <div
                    className={[
                      "flex size-11 shrink-0 items-center justify-center",
                      "rounded-2xl border border-border/40 bg-background",
                      "text-[var(--nm-accent,var(--primary))]",
                      effectClass(iconEffect),
                    ].join(" ")}
                  >
                    {icon}
                  </div>
                )}

                <div className="min-w-0 pt-0.5">
                  <h2
                    id={titleId}
                    className="text-base font-bold tracking-tight sm:text-lg"
                  >
                    {title}
                  </h2>

                  {description && (
                    <p
                      id={descriptionId}
                      className="
                        mt-1.5 text-sm leading-relaxed
                        text-muted-foreground
                      "
                    >
                      {description}
                    </p>
                  )}
                </div>
              </div>

              {showCloseButton && (
                <button
                  type="button"
                  aria-label="Đóng hộp thoại"
                  disabled={preventClose}
                  onClick={close}
                  className="
                    flex size-9 shrink-0 items-center justify-center
                    rounded-xl border border-border/40 bg-background
                    text-muted-foreground
                    shadow-[3px_3px_5px_var(--shadow-dark),-3px_-3px_5px_var(--shadow-light)]
                    transition-all duration-200
                    hover:-translate-y-0.5 hover:text-destructive
                    active:translate-y-0
                    active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]
                    focus-visible:outline-none
                    focus-visible:ring-2 focus-visible:ring-primary/40
                    disabled:cursor-not-allowed disabled:opacity-40
                  "
                >
                  <X size={17} strokeWidth={1.8} />
                </button>
              )}
            </header>

            {/* Content */}
            <div
              className={[
                "min-h-0 flex-1 overflow-y-auto",
                "border-y border-border/30",
                "px-5 py-5 sm:px-6 sm:py-6",
                effectClass(resolvedContentEffect),
                contentClassName,
              ].join(" ")}
            >
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <footer
                className={[
                  "flex shrink-0 flex-wrap items-center justify-end gap-2.5",
                  "px-5 py-4 sm:px-6",
                  effectClass(footerEffect),
                  footerClassName,
                ].join(" ")}
              >
                {footer}
              </footer>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Modal với khung nổi 3D, phù hợp form và hộp thoại thông thường. */
export function SculptedModal(props: ModalProps) {
  return <ModalEngine {...props} variant="sculpted" />;
}

/** Dialog với khung lõm, phù hợp giao diện cần cảm giác chìm. */
export function RecessedDialog(props: ModalProps) {
  return <ModalEngine {...props} variant="recessed" />;
}

export { SculptedModal as Modal };
export default SculptedModal;
