
import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

export type InputSize = "sm" | "md" | "lg";
export type InputVariant = "inset" | "flat";
export type InputIconStyle = "raised" | "flat" | "none";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "prefix"> {
  size?: InputSize;
  variant?: InputVariant;
  error?: boolean | string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  containerClassName?: string;
  iconStyle?: InputIconStyle;
  iconClassName?: string;
}

const sizeClasses: Record<InputSize, string> = {
  sm: "h-9 rounded-xl px-3 text-xs",
  md: "h-11 rounded-2xl px-3.5 text-base sm:text-sm",
  lg: "h-[52px] rounded-2xl px-4 text-base",
};

const variantClasses: Record<InputVariant, string> = {
  inset: "shadow-[var(--nm-inset)]",
  flat: "shadow-[var(--nm-raised-sm)]",
};

const iconSizes: Record<InputSize, string> = {
  sm: "size-6 [&_svg]:size-3.5",
  md: "size-7 [&_svg]:size-4",
  lg: "size-8 [&_svg]:size-[18px]",
};

const iconStyles: Record<InputIconStyle, string> = {
  raised: [
    "bg-background",
    "border border-border/50",
    "shadow-[var(--nm-raised-sm)]",
    "hover:shadow-[var(--nm-raised)]",
    "active:shadow-[var(--nm-pressed)]",
  ].join(" "),
  flat: [
    "bg-transparent",
    "border border-transparent",
    "shadow-none",
  ].join(" "),
  none: "bg-transparent border-transparent shadow-none",
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className = "",
      containerClassName = "",
      iconClassName = "",
      type = "text",
      size = "md",
      variant = "inset",
      iconStyle = "raised",
      error = false,
      prefix,
      suffix,
      disabled,
      "aria-invalid": ariaInvalid,
      ...props
    },
    ref,
  ) => {
    const hasError = Boolean(error);

    const renderIcon = (content: ReactNode) => (
      <span
        className={[
          "inline-flex shrink-0 items-center justify-center",
          "rounded-full text-muted-foreground",
          "transition-[box-shadow,color,background-color] duration-200",
          iconSizes[size],
          iconStyles[iconStyle],
          iconClassName,
          "[&_svg]:shrink-0",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {content}
      </span>
    );

    return (
      <div
        className={[
          "group flex w-full min-w-0 items-center gap-2",
          "border bg-background text-foreground",
          "transition-[box-shadow,border-color] duration-200",
          sizeClasses[size],
          variantClasses[variant],
          hasError
            ? "border-danger/70 focus-within:border-danger focus-within:ring-2 focus-within:ring-danger/15"
            : "border-border/70 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10",
          disabled && "cursor-not-allowed opacity-50",
          containerClassName,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {prefix != null && renderIcon(prefix)}

        <input
          ref={ref}
          type={type}
          disabled={disabled}
          aria-invalid={hasError || ariaInvalid || undefined}
          className={[
            "h-full w-full min-w-0 flex-1",
            "border-0 bg-transparent p-0",
            "text-inherit outline-none ring-0",
            "placeholder:text-muted-foreground/70",
            "focus:outline-none focus:ring-0",
            "disabled:cursor-not-allowed",
            "file:border-0 file:bg-transparent file:text-sm",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...props}
        />

        {suffix != null && renderIcon(suffix)}
      </div>
    );
  },
);

Input.displayName = "Input";

export { Input };
