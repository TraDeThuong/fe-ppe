
"use client";

import {
  forwardRef,
  useEffect,
  useRef,
  type InputHTMLAttributes,
} from "react";
import { Check, Minus } from "lucide-react";

export interface CheckboxProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "type" | "size" | "checked" | "defaultChecked" | "onChange"
  > {
  checked?: boolean;
  defaultChecked?: boolean;
  indeterminate?: boolean;
  size?: "sm" | "md" | "lg";
  onCheckedChange?: (checked: boolean) => void;
}

const boxSizes = {
  sm: "size-4 rounded",
  md: "size-5 rounded-md",
  lg: "size-6 rounded-md",
};

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      checked,
      defaultChecked,
      indeterminate = false,
      size = "md",
      disabled,
      onCheckedChange,
      className = "",
      id,
      ...props
    },
    forwardedRef,
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const isControlled = checked !== undefined;

    const setRefs = (node: HTMLInputElement | null) => {
      inputRef.current = node;

      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    };

    useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate]);

    return (
      <span
        className={[
          "relative inline-flex shrink-0 align-middle",
          "items-center justify-center",
          "rounded-md",
          disabled && "cursor-not-allowed opacity-50",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <input
          {...props}
          ref={setRefs}
          id={id}
          type="checkbox"
          checked={isControlled ? checked : undefined}
          defaultChecked={!isControlled ? defaultChecked : undefined}
          disabled={disabled}
          aria-checked={
            indeterminate ? "mixed" : checked
          }
          onChange={(event) => {
            onCheckedChange?.(event.target.checked);
          }}
          className={[
            "peer absolute inset-0 z-10 m-0 size-full",
            "cursor-pointer opacity-0",
            "disabled:cursor-not-allowed",
          ].join(" ")}
        />

        <span
          aria-hidden="true"
          className={[
            "pointer-events-none inline-flex shrink-0",
            "items-center justify-center",
            "border border-border/60 bg-background",
            "text-primary transition-all duration-200",
            "shadow-[var(--nm-pressed)]",
            boxSizes[size],
            "peer-checked:shadow-[var(--nm-raised-sm)]",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40",
            "peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
          ].join(" ")}
        >
          {indeterminate ? (
            <Minus className="size-3.5" strokeWidth={2.8} />
          ) : (
            <Check
              className={[
                "size-3.5 transition-opacity",
                checked === false && isControlled
                  ? "opacity-0"
                  : "peer-checked:opacity-100",
              ].join(" ")}
              strokeWidth={2.8}
            />
          )}
        </span>
      </span>
    );
  },
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
