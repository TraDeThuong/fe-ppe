
"use client";

import { useId, useState } from "react";

export interface SegmentedOption<T extends string = string> {
  label: string;
  value: T;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedOption<T>[];
  value?: T;
  defaultValue?: T;
  onValueChange?: (value: T) => void;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "min-h-8 px-2 text-xs",
  md: "min-h-10 px-3 text-sm",
  lg: "min-h-12 px-4 text-sm",
};

export function SegmentedControl<T extends string = string>({
  options,
  value,
  defaultValue,
  onValueChange,
  ariaLabel = "Chọn chế độ",
  disabled = false,
  className = "",
  size = "md",
}: SegmentedControlProps<T>) {
  const id = useId();

  const initialValue =
    defaultValue ?? options[0]?.value;

  const [internalValue, setInternalValue] = useState<T | undefined>(
    initialValue,
  );

  const selectedValue = value ?? internalValue;

  const selectedIndex = options.findIndex(
    (option) => option.value === selectedValue,
  );

  const selectOption = (nextValue: T) => {
    if (disabled) return;

    const option = options.find(
      (item) => item.value === nextValue,
    );

    if (!option || option.disabled) return;

    setInternalValue(nextValue);
    onValueChange?.(nextValue);
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (
      !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
        event.key,
      )
    ) {
      return;
    }

    event.preventDefault();

    const enabledOptions = options
      .map((option, optionIndex) => ({
        option,
        index: optionIndex,
      }))
      .filter(({ option }) => !option.disabled);

    if (enabledOptions.length === 0) return;

    let targetIndex: number;

    if (event.key === "Home") {
      targetIndex = enabledOptions[0].index;
    } else if (event.key === "End") {
      targetIndex = enabledOptions[enabledOptions.length - 1].index;
    } else {
      const currentEnabledIndex = enabledOptions.findIndex(
        ({ index: optionIndex }) => optionIndex === index,
      );

      const offset = event.key === "ArrowRight" ? 1 : -1;

      const nextEnabledIndex =
        (currentEnabledIndex + offset + enabledOptions.length) %
        enabledOptions.length;

      targetIndex = enabledOptions[nextEnabledIndex].index;
    }

    selectOption(options[targetIndex].value);

    document
      .getElementById(`${id}-${targetIndex}`)
      ?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      className={[
        "relative grid w-full items-stretch gap-1 rounded-2xl",
        "border border-border/50 bg-background p-1",
        "shadow-[var(--nm-inset)]",
        disabled ? "cursor-not-allowed opacity-50" : "",
        className,
      ].join(" ")}
      style={{
        gridTemplateColumns: `repeat(${Math.max(options.length, 1)}, minmax(0, 1fr))`,
      }}
    >
      {options.length > 0 && selectedIndex >= 0 && (
        <span
          aria-hidden="true"
          className={[
            "pointer-events-none absolute bottom-1 top-1 z-0",
            "rounded-xl border border-border/40 bg-background",
            "shadow-[var(--nm-raised-sm)]",
            "transition-transform duration-300 ease-out",
          ].join(" ")}
          style={{
            width: `calc((100% - 8px) / ${options.length})`,
            transform: `translateX(calc(${selectedIndex} * 100%))`,
            left: "4px",
          }}
        />
      )}

      {options.map((option, index) => {
        const selected = option.value === selectedValue;

        return (
          <button
            key={option.value}
            id={`${id}-${index}`}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled || option.disabled}
            tabIndex={selected ? 0 : -1}
            onClick={() => selectOption(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={[
              "relative z-10 min-w-0 rounded-xl",
              "inline-flex items-center justify-center",
              "font-medium transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2",
              "focus-visible:ring-primary/40",
              sizeClasses[size],
              selected
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
              "disabled:cursor-not-allowed disabled:opacity-50",
            ].join(" ")}
          >
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
