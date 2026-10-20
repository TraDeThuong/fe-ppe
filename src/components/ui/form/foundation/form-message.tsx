
import type {
  HTMLAttributes,
  ReactNode,
} from "react";
import { AlertCircle } from "lucide-react";

export type FormMessageVariant =
  | "helper"
  | "error"
  | "success"
  | "warning"
  | "info";

export interface FormMessageProps
  extends HTMLAttributes<HTMLParagraphElement> {
  variant?: FormMessageVariant;
  icon?: ReactNode;
  showIcon?: boolean;
}

const variantClasses: Record<FormMessageVariant, string> = {
  helper: "text-muted-foreground",
  error: "text-danger",
  success: "text-success",
  warning: "text-warning",
  info: "text-info",
};

function FormMessage({
  variant = "helper",
  icon,
  showIcon,
  className = "",
  children,
  role,
  "aria-live": ariaLive,
  ...props
}: FormMessageProps) {
  if (children == null || children === false || children === "") {
    return null;
  }

  const isError = variant === "error";
  const shouldShowIcon = showIcon ?? isError;

  return (
    <p
      role={role ?? (isError ? "alert" : undefined)}
      aria-live={ariaLive ?? (isError ? "polite" : undefined)}
      className={[
        "flex items-start gap-1.5",
        "text-xs leading-5",
        variantClasses[variant],
        isError && "font-medium",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1",
        "motion-safe:duration-200",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {shouldShowIcon && (
        <span className="mt-0.5 inline-flex shrink-0">
          {icon ?? (
            <AlertCircle
              aria-hidden="true"
              className="size-3.5"
              strokeWidth={1.8}
            />
          )}
        </span>
      )}

      <span>{children}</span>
    </p>
  );
}

export { FormMessage };
