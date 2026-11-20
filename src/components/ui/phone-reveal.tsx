"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
import { useLocale } from "@/providers/locale-provider";

function joinClasses(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

export interface PhoneRevealProps {
  /** Phone number string to mask behind the eye toggle. */
  phoneNumber?: string | null;
  /** Fallback content when phoneNumber is empty. Pass `null` to render nothing. */
  emptyText?: ReactNode;
  /** Optional override for bilingual labels; defaults to active LocaleProvider. */
  isVietnamese?: boolean;
  /** Optional `tel:` href rendered as a clickable link once revealed. */
  href?: string;
  /** Optional copy callback; renders a copy button alongside the revealed number. */
  onCopy?: (phone: string) => void;
  /** Whether the phone number was recently copied (shows Check icon). */
  isCopied?: boolean;
  /** Wrapper class name. */
  className?: string;
  /** Class name for the revealed phone text / link. */
  textClassName?: string;
  /** Class name for the initial eye toggle button. */
  buttonClassName?: string;
  /** Icon size in pixels for the Eye button (defaults to 14). */
  iconSize?: number;
}

/**
 * Masks a phone number behind a single Eye icon button until the user clicks to reveal it.
 */
export function PhoneReveal({
  phoneNumber,
  emptyText = "-",
  isVietnamese: isVietnameseProp,
  href,
  onCopy,
  isCopied = false,
  className,
  textClassName,
  buttonClassName,
  iconSize = 14,
}: PhoneRevealProps) {
  const { locale } = useLocale();
  const isVietnamese = isVietnameseProp ?? locale === "vi-VN";
  const [isVisible, setIsVisible] = useState(false);

  const normalizedPhone = phoneNumber?.trim();
  if (!normalizedPhone) {
    if (emptyText === null) return null;
    if (typeof emptyText === "string") {
      return (
        <span className="text-xs font-mono text-muted-foreground">
          {emptyText}
        </span>
      );
    }
    return <>{emptyText}</>;
  }

  const viewLabel = isVietnamese
    ? "Nhấn để xem số điện thoại"
    : "Click to view phone number";
  const hideLabel = isVietnamese ? "Ẩn số điện thoại" : "Hide phone number";
  const copyLabel = isVietnamese
    ? "Sao chép số điện thoại"
    : "Copy phone number";

  if (!isVisible) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsVisible(true);
        }}
        title={viewLabel}
        aria-label={viewLabel}
        aria-expanded={false}
        className={joinClasses(
          "inline-flex size-7 items-center justify-center rounded-lg border border-border/50 bg-background text-muted-foreground shadow-[1.5px_1.5px_3px_var(--shadow-dark),-1.5px_-1.5px_3px_var(--shadow-light)] transition-all hover:text-primary hover:border-primary/40 active:shadow-[inset_1px_1px_2px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)] cursor-pointer",
          buttonClassName,
        )}
      >
        <Eye size={iconSize} />
      </button>
    );
  }

  const hideIconSize = Math.max(11, iconSize - 1);

  return (
    <div className={joinClasses("inline-flex items-center gap-1.5 min-w-0", className)}>
      {href ? (
        <a
          href={href}
          onClick={(e) => e.stopPropagation()}
          className={joinClasses(
            "text-xs font-mono font-semibold text-foreground hover:text-primary transition-colors break-all",
            textClassName,
          )}
        >
          {normalizedPhone}
        </a>
      ) : (
        <span
          className={joinClasses(
            "text-xs font-mono font-semibold text-foreground break-all",
            textClassName,
          )}
        >
          {normalizedPhone}
        </span>
      )}

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsVisible(false);
        }}
        title={hideLabel}
        aria-label={hideLabel}
        aria-expanded={true}
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/60 cursor-pointer"
      >
        <EyeOff size={hideIconSize} />
      </button>

      {onCopy && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCopy(normalizedPhone);
          }}
          title={copyLabel}
          aria-label={copyLabel}
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-md border border-border/40 bg-background/80 text-muted-foreground transition-colors hover:text-primary hover:border-primary/40 cursor-pointer"
        >
          {isCopied ? (
            <Check size={12} className="text-primary" />
          ) : (
            <Copy size={12} />
          )}
        </button>
      )}
    </div>
  );
}
