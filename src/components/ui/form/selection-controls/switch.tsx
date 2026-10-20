
"use client";

import { useState } from "react";

export interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  label?: React.ReactNode;
  checkedLabel?: React.ReactNode;
  uncheckedLabel?: React.ReactNode;
  className?: string;
  id?: string;
  name?: string;
  required?: boolean;
}

const sizes = {
  sm: {
    track: "h-5 w-9",
    thumb: "size-3.5",
    translate: "translate-x-4",
  },
  md: {
    track: "h-6 w-11",
    thumb: "size-[18px]",
    translate: "translate-x-5",
  },
  lg: {
    track: "h-7 w-14",
    thumb: "size-5",
    translate: "translate-x-[30px]",
  },
};

function Switch({
  checked,
  defaultChecked = false,
  onCheckedChange,
  disabled = false,
  size = "md",
  label,
  checkedLabel,
  uncheckedLabel,
  className = "",
  id,
  name,
  required,
}: SwitchProps) {
  const isControlled = checked !== undefined;
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const isChecked = isControlled ? checked : internalChecked;

  const toggle = () => {
    if (disabled) return;

    const next = !isChecked;

    if (!isControlled) setInternalChecked(next);
    onCheckedChange?.(next);
  };

  return (
    <label
      htmlFor={id}
      className={[
        "inline-flex items-center gap-3",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        className,
      ].join(" ")}
    >
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={isChecked}
        aria-required={required || undefined}
        disabled={disabled}
        name={name}
        onClick={toggle}
        className={[
          "relative inline-flex shrink-0 items-center",
          "rounded-full border border-border/50",
          "bg-background p-1",
          "shadow-[var(--nm-inset)]",
          "transition-colors duration-200",
          "focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-primary/40 focus-visible:ring-offset-2",
          "focus-visible:ring-offset-background",
          sizes[size].track,
        ].join(" ")}
      >
        <span
          aria-hidden="true"
          className={[
            "pointer-events-none inline-block rounded-full",
            "bg-background shadow-[var(--nm-raised-sm)]",
            "transition-transform duration-200 ease-out",
            sizes[size].thumb,
            isChecked ? sizes[size].translate : "translate-x-0",
          ].join(" ")}
        />
      </button>

      {(label != null || checkedLabel != null || uncheckedLabel != null) && (
        <span className="text-sm text-foreground">
          {label ?? (isChecked ? checkedLabel : uncheckedLabel)}
        </span>
      )}
    </label>
  );
}

export { Switch };
