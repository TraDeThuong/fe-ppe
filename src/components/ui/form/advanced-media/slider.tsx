
"use client";

import { useState, type InputHTMLAttributes } from "react";

export interface SliderProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    | "type"
    | "value"
    | "defaultValue"
    | "onChange"
    | "size"
  > {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  showValue?: boolean;
  formatValue?: (value: number) => string;
  onValueChange?: (value: number) => void;
  containerClassName?: string;
}

export function Slider({
  value,
  defaultValue = 50,
  min = 0,
  max = 100,
  step = 1,
  label,
  showValue = true,
  formatValue = (number) => `${number}`,
  onValueChange,
  containerClassName = "",
  className = "",
  disabled = false,
  id,
  ...props
}: SliderProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);

  const currentValue = value ?? internalValue;
  const safeValue = Math.min(max, Math.max(min, currentValue));
  const range = max - min;

  const percentage =
    range > 0 ? ((safeValue - min) / range) * 100 : 0;

  const handleChange = (nextValue: number) => {
    setInternalValue(nextValue);
    onValueChange?.(nextValue);
  };

  return (
    <div className={`w-full space-y-3 ${containerClassName}`}>
      {(label || showValue) && (
        <div className="flex items-center justify-between gap-3">
          {label && (
            <label
              htmlFor={id}
              className="text-sm font-medium text-foreground"
            >
              {label}
            </label>
          )}

          {showValue && (
            <span className="rounded-lg px-2.5 py-1 text-sm font-semibold tabular-nums text-primary shadow-[var(--nm-raised-sm)]">
              {formatValue(safeValue)}
            </span>
          )}
        </div>
      )}

      <div className="relative px-1 pb-3 pt-9">
        {showValue && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-xl border border-border/50 bg-background px-3 py-1.5 text-xs font-bold tabular-nums text-foreground shadow-[var(--nm-raised)] transition-[left] duration-100"
            style={{ left: `calc(${percentage}% + 4px)` }}
          >
            {formatValue(safeValue)}

            <span className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 border-b border-r border-border/50 bg-background" />
          </div>
        )}

        <input
          {...props}
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={safeValue}
          disabled={disabled}
          onChange={(event) =>
            handleChange(Number(event.target.value))
          }
          aria-valuenow={safeValue}
          aria-valuemin={min}
          aria-valuemax={max}
          className={[
            "block h-3 w-full cursor-pointer appearance-none rounded-full",
            "bg-background shadow-[var(--nm-inset)]",
            "focus-visible:outline-none focus-visible:ring-2",
            "focus-visible:ring-primary/40",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "[&::-webkit-slider-thumb]:size-6",
            "[&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:rounded-full",
            "[&::-webkit-slider-thumb]:border",
            "[&::-webkit-slider-thumb]:border-border/70",
            "[&::-webkit-slider-thumb]:bg-background",
            "[&::-webkit-slider-thumb]:shadow-[var(--nm-raised)]",
            "[&::-webkit-slider-thumb]:transition-shadow",
            "[&::-webkit-slider-thumb]:duration-200",
            "[&::-webkit-slider-thumb]:hover:shadow-[var(--nm-raised-lg)]",
            "[&::-webkit-slider-thumb]:active:shadow-[var(--nm-pressed)]",
            "[&::-webkit-slider-thumb]:active:scale-95",
            "[&::-moz-range-thumb]:size-6",
            "[&::-moz-range-thumb]:rounded-full",
            "[&::-moz-range-thumb]:border",
            "[&::-moz-range-thumb]:border-border/70",
            "[&::-moz-range-thumb]:bg-background",
            "[&::-moz-range-thumb]:shadow-[var(--nm-raised)]",
            className,
          ].join(" ")}
          style={{
            background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${percentage}%, var(--background) ${percentage}%, var(--background) 100%)`,
            ...props.style,
          }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>
    </div>
  );
}

export default Slider;
