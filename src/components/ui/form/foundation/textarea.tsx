
import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  type TextareaHTMLAttributes,
} from "react";

export type TextareaVariant = "inset" | "flat";
export type TextareaResize = "none" | "vertical" | "both";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: TextareaVariant;
  error?: boolean | string;
  autoGrow?: boolean;
  resize?: TextareaResize;
  minHeight?: number;
  maxHeight?: number;
}

const variantClasses: Record<TextareaVariant, string> = {
  inset: "shadow-[var(--nm-inset)]",
  flat: "shadow-[var(--nm-raised-sm)]",
};

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className = "",
      style,
      variant = "inset",
      error = false,
      autoGrow = false,
      resize = "vertical",
      minHeight,
      maxHeight,
      rows = 4,
      disabled,
      value,
      defaultValue,
      onChange,
      onInput,
      "aria-invalid": ariaInvalid,
      ...props
    },
    forwardedRef,
  ) => {
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const hasError = Boolean(error);

    const setRefs = useCallback(
      (node: HTMLTextAreaElement | null) => {
        internalRef.current = node;

        if (typeof forwardedRef === "function") {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      },
      [forwardedRef],
    );

    const adjustHeight = useCallback(() => {
      const element = internalRef.current;

      if (!element || !autoGrow) return;

      element.style.height = "auto";

      const nextHeight = Math.max(
        minHeight ?? 0,
        Math.min(
          element.scrollHeight,
          maxHeight ?? Number.POSITIVE_INFINITY,
        ),
      );

      element.style.height = `${nextHeight}px`;
      element.style.overflowY =
        maxHeight != null && element.scrollHeight > maxHeight
          ? "auto"
          : "hidden";
    }, [autoGrow, minHeight, maxHeight]);

    useEffect(() => {
      adjustHeight();
    }, [adjustHeight, value, defaultValue]);

    return (
      <textarea
        {...props}
        ref={setRefs}
        rows={rows}
        disabled={disabled}
        value={value}
        defaultValue={defaultValue}
        onChange={(event) => {
          onChange?.(event);
          adjustHeight();
        }}
        onInput={(event) => {
          onInput?.(event);
          adjustHeight();
        }}
        aria-invalid={hasError || ariaInvalid || undefined}
        className={[
          "block w-full min-w-0",
          "rounded-2xl border bg-background",
          "px-4 py-3 text-sm leading-6 text-foreground",
          "transition-[box-shadow,border-color] duration-200",
          "placeholder:text-muted-foreground/70",
          "focus:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent",
          variantClasses[variant],
          resize === "none" && "resize-none",
          resize === "vertical" && !autoGrow && "resize-y",
          resize === "both" && !autoGrow && "resize",
          autoGrow && "resize-none",
          hasError
            ? "border-danger/70 focus:border-danger focus:ring-2 focus:ring-danger/15"
            : "border-border/70 focus:border-primary/50 focus:ring-2 focus:ring-primary/10",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          ...style,
          ...(autoGrow
            ? {
                height: "auto",
                minHeight,
                maxHeight,
              }
            : {}),
        }}
      />
    );
  },
);

Textarea.displayName = "Textarea";

export { Textarea };
