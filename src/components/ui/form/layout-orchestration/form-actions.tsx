
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

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
  submitLabel = "Lưu thay đổi",
  submittingLabel = "Đang xử lý...",
  cancelLabel = "Hủy",
  onCancel,
  disabled = false,
  children,
  className = "",
  submitButtonProps,
  cancelButtonProps,
}: FormActionsProps) {
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
          {cancelLabel}
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

        {isSubmitting ? submittingLabel : submitLabel}
      </button>
    </div>
  );
}

export default FormActions;
