
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

export interface SegmentedControlOption<T extends string = string> {
  value: T;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  description?: string;
}

export type SegmentedControlSize = "sm" | "md" | "lg";

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedControlOption<T>[];
  value?: T;
  defaultValue?: T;
  onValueChange?: (value: T) => void;
  "aria-label": string;
  size?: SegmentedControlSize;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  emptyLabel?: string;
  className?: string;
  id?: string;
}

const SIZE_STYLES: Record<
  SegmentedControlSize,
  { root: string; item: string; icon: string }
> = {
  sm: {
    root: "p-1 gap-1 rounded-xl",
    item: "min-h-8 px-3 gap-1.5 rounded-lg text-xs",
    icon: "[&>svg]:size-3.5",
  },
  md: {
    root: "p-1.5 gap-1.5 rounded-2xl",
    item: "min-h-10 px-4 gap-2 rounded-xl text-sm",
    icon: "[&>svg]:size-4",
  },
  lg: {
    root: "p-2 gap-2 rounded-[1.35rem]",
    item: "min-h-12 px-5 gap-2.5 rounded-[1rem] text-sm",
    icon: "[&>svg]:size-[1.125rem]",
  },
};

export function SegmentedControl<T extends string = string>({
  options,
  value,
  defaultValue,
  onValueChange,
  "aria-label": ariaLabel,
  size = "md",
  fullWidth = false,
  disabled = false,
  loading = false,
  emptyLabel = "Không có lựa chọn",
  className = "",
  id,
}: SegmentedControlProps<T>) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState<T | undefined>(
    defaultValue
  );
  const selectedValue = isControlled ? value : internalValue;
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const styles = SIZE_STYLES[size];

  const isUnavailable = disabled || loading;

  const enabledOptions = options.filter((option) => !option.disabled);
  const selectedOption = options.find(
    (option) => option.value === selectedValue && !option.disabled
  );

  const [focusedValue, setFocusedValue] = useState<T | undefined>(
    selectedOption?.value ?? enabledOptions[0]?.value
  );

  useEffect(() => {
    if (
      !enabledOptions.some((option) => option.value === focusedValue)
    ) {
      setFocusedValue(selectedOption?.value ?? enabledOptions[0]?.value);
    }
  }, [focusedValue, selectedOption?.value, enabledOptions]);

  const selectOption = useCallback(
    (nextValue: T) => {
      if (isUnavailable) return;

      const option = options.find((item) => item.value === nextValue);
      if (!option || option.disabled) return;

      if (!isControlled) {
        setInternalValue(nextValue);
      }

      setFocusedValue(nextValue);

      if (nextValue !== selectedValue) {
        onValueChange?.(nextValue);
      }
    },
    [isUnavailable, options, isControlled, selectedValue, onValueChange]
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isUnavailable || enabledOptions.length === 0) return;

    const currentIndex = Math.max(
      0,
      enabledOptions.findIndex(
        (option) => option.value === (focusedValue ?? selectedValue)
      )
    );

    let nextIndex: number;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextIndex = (currentIndex + 1) % enabledOptions.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        nextIndex =
          (currentIndex - 1 + enabledOptions.length) %
          enabledOptions.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = enabledOptions.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();

    const nextOption = enabledOptions[nextIndex];
    setFocusedValue(nextOption.value);
    selectOption(nextOption.value);

    const nextButtonIndex = options.findIndex(
      (option) => option.value === nextOption.value
    );

    buttonRefs.current[nextButtonIndex]?.focus();
  };

  if (options.length === 0) {
    return emptyLabel ? (
      <div
        className={`inline-flex items-center rounded-xl border border-[var(--border)]/50 px-4 py-3 text-sm text-[var(--muted-foreground)] ${className}`}
        role="status"
      >
        {emptyLabel}
      </div>
    ) : null;
  }

  return (
    <div
      id={id}
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation="horizontal"
      aria-busy={loading || undefined}
      onKeyDown={handleKeyDown}
      className={[
        "relative isolate inline-flex max-w-full items-center",
        "overflow-x-auto overscroll-x-contain",
        "border border-[var(--border)]/50",
        "bg-transparent",
        "shadow-[var(--nm-raised-sm)]",
        "ring-1 ring-inset ring-[var(--shadow-light)]/20",
        "transition-[box-shadow,border-color] duration-300",
        "motion-reduce:transition-none",
        "scrollbar-none",
        styles.root,
        fullWidth ? "flex w-full" : "w-fit",
        isUnavailable ? "cursor-not-allowed opacity-65" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        boxShadow:
          "var(--nm-raised-sm), inset 0 1px 0 var(--shadow-light)",
      }}
    >
      {/* Subtle ambient highlight */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-3 top-0 h-px opacity-40"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--shadow-light), transparent)",
        }}
      />

      {options.map((option, index) => {
        const isSelected =
          selectedValue === option.value && !option.disabled;
        const isOptionDisabled = isUnavailable || !!option.disabled;

        return (
          <button
            key={option.value}
            ref={(element) => {
              buttonRefs.current[index] = element;
            }}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-disabled={isOptionDisabled || undefined}
            tabIndex={
              isSelected
                ? 0
                : !selectedOption && index === 0
                  ? 0
                  : -1
            }
            disabled={isOptionDisabled}
            onFocus={() => setFocusedValue(option.value)}
            onClick={() => selectOption(option.value)}
            className={[
              "group relative isolate flex shrink-0 items-center justify-center",
              "whitespace-nowrap font-semibold tracking-[-0.015em]",
              "outline-none select-none",
              "transition-[background-color,box-shadow,color,transform]",
              "duration-300 ease-out",
              "motion-reduce:transition-none",
              "focus-visible:z-10 focus-visible:ring-2",
              "focus-visible:ring-[var(--primary)]",
              "focus-visible:ring-offset-2",
              "focus-visible:ring-offset-[var(--background)]",
              "disabled:pointer-events-none disabled:cursor-not-allowed",
              styles.item,
              styles.icon,
              fullWidth ? "min-w-0 flex-1" : "",
              isSelected
                ? [
                    "text-[var(--primary)]",
                    "bg-[var(--card)]",
                    "border border-[var(--border)]/60",
                    "shadow-[var(--nm-raised-sm)]",
                  ].join(" ")
                : [
                    "border border-transparent",
                    "text-[var(--muted-foreground)]",
                    "hover:text-[var(--foreground)]",
                    "hover:bg-[var(--muted)]/35",
                    "hover:shadow-[var(--nm-btn-hover)]",
                    "active:translate-y-px",
                    "active:shadow-[var(--nm-pressed)]",
                  ].join(" "),
            ]
              .filter(Boolean)
              .join(" ")}
            style={
              isSelected
                ? {
                    boxShadow:
                      "var(--nm-raised-sm), inset 0 1px 0 var(--shadow-light)",
                  }
                : undefined
            }
          >
            {/* Selected-state inner sculpted surface */}
            {isSelected && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit]"
                style={{
                  background:
                    "linear-gradient(145deg, color-mix(in srgb, var(--card) 94%, var(--primary) 6%), var(--card))",
                }}
              />
            )}

            {loading && isSelected ? (
              <span
                aria-hidden="true"
                className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
              />
            ) : option.icon ? (
              <span
                aria-hidden="true"
                className={[
                  "inline-flex shrink-0 items-center justify-center",
                  "transition-transform duration-300",
                  "group-hover:scale-105",
                  isSelected ? "scale-100" : "",
                  "[&>svg]:shrink-0",
                ].join(" ")}
              >
                {option.icon}
              </span>
            ) : null}

            <span className="relative min-w-0 truncate">
              {option.label}
            </span>

            {isSelected && (
              <span
                aria-hidden="true"
                className="absolute bottom-0.5 left-1/2 h-[2px] w-4 -translate-x-1/2 rounded-full opacity-80"
                style={{
                  backgroundColor: "var(--primary)",
                  boxShadow: "0 0 8px color-mix(in srgb, var(--primary) 35%, transparent)",
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
