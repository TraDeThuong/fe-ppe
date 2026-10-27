
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
  soft: 0.65,
  medium: 1,
  deep: 1.4,
};

const raisedShadow =
  "shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)]";

const insetShadow =
  "shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)]";

const flatShadow = "shadow-none";

function effectClass(effect: ModalEffect) {
  switch (effect) {
    case "raised":
      return raisedShadow;
    case "inset":
      return insetShadow;
    default:
      return flatShadow;
  }
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
  footerEffect,
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

  const sculpted = variant === "sculpted";
  const resolvedContentEffect =
    contentEffect ?? (sculpted ? "inset" : "raised");
  const resolvedFooterEffect =
    footerEffect ?? (sculpted ? "inset" : "raised");

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

    const oldOverflow = document.body.style.overflow;
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
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);

      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

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
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = oldOverflow;
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
    subtle: "border-[var(--border)]",
    accent: "border-[color-mix(in_srgb,var(--nm-accent,var(--primary))_55%,var(--border))]",
    glow: "border-[color-mix(in_srgb,var(--nm-accent,var(--primary))_70%,var(--border))] shadow-[0_0_0_1px_color-mix(in_srgb,var(--nm-accent,var(--primary))_15%,transparent),7px_7px_16px_var(--shadow-dark),-7px_-7px_16px_var(--shadow-light),0_0_24px_color-mix(in_srgb,var(--nm-accent,var(--primary))_12%,transparent)]",
  };

  const outerShadow = sculpted
    ? "shadow-[calc(5px*var(--nm-depth))_calc(5px*var(--nm-depth))_calc(14px*var(--nm-depth))_var(--shadow-dark),calc(-5px*var(--nm-depth))_calc(-5px*var(--nm-depth))_calc(14px*var(--nm-depth))_var(--shadow-light)]"
    : "shadow-[inset_5px_5px_12px_var(--shadow-dark),inset_-5px_-5px_12px_var(--shadow-light)]";

  const transitionShadow = sculpted
    ? "shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)]"
    : "shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light),inset_1px_1px_2px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)]";

  const innerShadow = sculpted
    ? "shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]"
    : "shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)]";

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto bg-black/35 p-3 backdrop-blur-md animate-in fade-in duration-200 dark:bg-black/60 sm:p-6"
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
          "animate-in fade-in slide-in-from-bottom-3 zoom-in-[0.98] duration-300",
          SIZE_CLASSES[size],
          className,
        ].join(" ")}
      >
        {/* OUTER RIM: raised or inset */}
        <div
          className={[
            "relative rounded-[1.8rem] border bg-[var(--background)] p-2",
            "transition-shadow duration-300",
            borderClasses[border],
            outerShadow,
          ].join(" ")}
        >
          {/* TRANSITION GROOVE: raised -> recessed */}
          <div
            className={[
              "relative rounded-[1.45rem] border border-[var(--border)]/70",
              "bg-[var(--background)] p-2",
              "transition-shadow duration-300",
              transitionShadow,
            ].join(" ")}
          >
            {/* INNER SHELL */}
            <div
              className={[
                "flex max-h-[calc(100dvh-5rem)] min-h-32 flex-col overflow-hidden",
                "rounded-[1.1rem] border border-[var(--border)]",
                "bg-[var(--background)] text-[var(--foreground)]",
                innerShadow,
              ].join(" ")}
            >
              {/* HEADER */}
              <header className="flex items-start justify-between gap-3 p-4 sm:p-5">
                <div className="flex min-w-0 items-center gap-3">
                  {icon && (
                    <div
                      className={[
                        "grid size-11 shrink-0 place-items-center rounded-2xl",
                        "border border-[var(--border)] bg-[var(--background)]",
                        "text-[var(--nm-accent,var(--primary))]",
                        effectClass(iconEffect),
                      ].join(" ")}
                    >
                      {icon}
                    </div>
                  )}

                  <div className="min-w-0">
                    <h2
                      id={titleId}
                      className="text-base font-bold tracking-tight text-[var(--foreground)] sm:text-lg"
                    >
                      {title}
                    </h2>

                    {description && (
                      <p
                        id={descriptionId}
                        className="mt-1 text-sm leading-relaxed text-[var(--muted-foreground)]"
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
                    className={[
                      "grid size-9 shrink-0 place-items-center rounded-xl",
                      "border border-[var(--border)] bg-[var(--background)]",
                      "text-[var(--muted-foreground)]",
                      raisedShadow,
                      "transition-all duration-200",
                      "hover:-translate-y-0.5 hover:text-[var(--danger)]",
                      "active:translate-y-0 active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
                      "disabled:cursor-not-allowed disabled:opacity-40",
                    ].join(" ")}
                  >
                    <X size={17} strokeWidth={1.8} />
                  </button>
                )}
              </header>

              {/* CONTENT */}
              <div
                className={[
                  "mx-3 min-h-0 overflow-y-auto rounded-2xl border",
                  "border-[var(--border)] bg-[var(--background)] p-3.5",
                  "text-sm leading-relaxed text-[var(--foreground)] sm:mx-4 sm:p-4",
                  effectClass(resolvedContentEffect),
                  contentClassName,
                ].join(" ")}
              >
                {children}
              </div>

              {/* FOOTER */}
              {footer && (
                <footer
                  className={[
                    "m-3 flex flex-wrap items-center justify-end gap-2.5",
                    "rounded-2xl border border-[var(--border)]",
                    "bg-[var(--background)] p-3 sm:m-4",
                    effectClass(resolvedFooterEffect),
                    footerClassName,
                  ].join(" ")}
                >
                  {footer}
                </footer>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Raised outer rim -> recessed transition groove -> inset content.
 */
export function SculptedModal(props: ModalProps) {
  return <ModalEngine {...props} variant="sculpted" />;
}

/**
 * Inset outer rim -> raised transition rim -> raised content.
 */
export function RecessedDialog(props: ModalProps) {
  return <ModalEngine {...props} variant="recessed" />;
}

export { SculptedModal as Modal };
export default SculptedModal;
