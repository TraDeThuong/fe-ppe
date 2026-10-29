
"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { useLocale } from "@/providers/locale-provider";

export interface FormActionsProps {
  isSubmitting?: boolean;
  submitLabel?: string;
  submittingLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  disabled?: boolean;
  children?: ReactNode;
  className?: string;
  submitButtonProps?: Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "type" | "disabled" | "children"
  >;
  cancelButtonProps?: Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "type" | "disabled" | "onClick" | "children"
  >;
}

export function FormActions({
  isSubmitting = false,
  submitLabel,
  submittingLabel,
  cancelLabel,
  onCancel,
  disabled = false,
  children,
  className = "",
  submitButtonProps,
  cancelButtonProps,
}: FormActionsProps) {
  let isVietnamese = true;
  try {
    const localeCtx = useLocale();
    isVietnamese = localeCtx.locale === "vi-VN";
  } catch {
    // fallback if outside LocaleProvider
  }

  const effectiveSubmitLabel =
    submitLabel ?? (isVietnamese ? "Lưu thay đổi" : "Save changes");
  const effectiveSubmittingLabel =
    submittingLabel ?? (isVietnamese ? "Đang xử lý..." : "Processing...");
  const effectiveCancelLabel =
    cancelLabel ?? (isVietnamese ? "Hủy" : "Cancel");

  const isDisabled = disabled || isSubmitting;

  return (
    <div
      className={[
        "flex flex-col-reverse gap-3 border-t border-border/60 pt-5",
        "sm:flex-row sm:items-center sm:justify-end",
        className,
      ].join(" ")}
    >
      {children}

      {onCancel && (
        <button
          {...cancelButtonProps}
          type="button"
          onClick={onCancel}
          disabled={isDisabled}
          className={[
            "inline-flex min-h-11 items-center justify-center",
            "rounded-xl border border-border/60 bg-background px-5",
            "text-sm font-medium text-foreground",
            "shadow-[var(--nm-raised-sm)]",
            "transition-all duration-200",
            "hover:shadow-[var(--nm-raised)]",
            "active:shadow-[var(--nm-pressed)]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            cancelButtonProps?.className ?? "",
          ].join(" ")}
        >
          {effectiveCancelLabel}
        </button>
      )}

      <button
        {...submitButtonProps}
        type="submit"
        disabled={isDisabled}
        aria-busy={isSubmitting}
        className={[
          "inline-flex min-h-11 items-center justify-center gap-2",
          "rounded-xl bg-primary px-5 text-sm font-semibold",
          "text-primary-foreground shadow-[var(--nm-raised-sm)]",
          "transition-all duration-200",
          "hover:shadow-[var(--nm-raised)]",
          "active:shadow-[var(--nm-pressed)]",
          "disabled:cursor-not-allowed disabled:opacity-60",
          submitButtonProps?.className ?? "",
        ].join(" ")}
      >
        {isSubmitting && (
          <LoaderCircle
            size={17}
            aria-hidden="true"
            className="animate-spin"
          />
        )}

        {isSubmitting ? effectiveSubmittingLabel : effectiveSubmitLabel}
      </button>
    </div>
  );
}

export default FormActions;
