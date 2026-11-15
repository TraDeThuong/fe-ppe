
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
          "rounded-full border p-1",
          "transition-colors duration-200",
          "focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-primary/40 focus-visible:ring-offset-2",
          "focus-visible:ring-offset-background",
          isChecked
            ? "border-primary/60 bg-primary shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)]"
            : "border-border/60 bg-background shadow-[var(--nm-inset)]",
          sizes[size].track,
        ].join(" ")}
      >
        <span
          aria-hidden="true"
          className={[
            "pointer-events-none inline-block rounded-full",
            "transition-all duration-200 ease-out",
            sizes[size].thumb,
            isChecked
              ? `${sizes[size].translate} bg-white shadow-[0_1px_4px_rgba(0,0,0,0.3)]`
              : "translate-x-0 bg-muted-foreground/45 shadow-[var(--nm-raised-sm)]",
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
