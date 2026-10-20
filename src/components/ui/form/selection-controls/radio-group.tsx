
"use client";

import {
  createContext,
  forwardRef,
  useContext,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

export interface RadioOption {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps {
  options: RadioOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  disabled?: boolean;
  orientation?: "horizontal" | "vertical";
  className?: string;
  optionClassName?: string;
  ariaLabel?: string;
}

interface RadioContextValue {
  value?: string;
  name: string;
  disabled: boolean;
  onValueChange: (value: string) => void;
  register: (value: string, node: HTMLInputElement | null) => void;
}

const RadioContext = createContext<RadioContextValue | null>(null);

const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(
  (
    {
      options,
      value,
      defaultValue,
      onValueChange,
      name,
      disabled = false,
      orientation = "vertical",
      className = "",
      optionClassName = "",
      ariaLabel,
    },
    forwardedRef,
  ) => {
    const defaultName = useId();
    const groupName = name ?? defaultName;
    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = useState(defaultValue);
    const selectedValue = isControlled ? value : internalValue;
    const refs = useRef(new Map<string, HTMLInputElement>());

    const updateValue = (nextValue: string) => {
      if (!isControlled) setInternalValue(nextValue);
      onValueChange?.(nextValue);
    };

    const register = (optionValue: string, node: HTMLInputElement | null) => {
      if (node) refs.current.set(optionValue, node);
      else refs.current.delete(optionValue);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
      if (!keys.includes(event.key)) return;

      event.preventDefault();

      const enabled = options.filter(
        (option) => !disabled && !option.disabled,
      );

      if (!enabled.length) return;

      const currentIndex = enabled.findIndex(
        (option) => option.value === selectedValue,
      );

      const forward =
        event.key === "ArrowRight" || event.key === "ArrowDown";

      const nextIndex =
        currentIndex === -1
          ? 0
          : (currentIndex + (forward ? 1 : -1) + enabled.length) %
            enabled.length;

      const next = enabled[nextIndex];

      updateValue(next.value);
      refs.current.get(next.value)?.focus();
    };

    return (
      <RadioContext.Provider
        value={{
          value: selectedValue,
          name: groupName,
          disabled,
          onValueChange: updateValue,
          register,
        }}
      >
        <div
          ref={forwardedRef}
          role="radiogroup"
          aria-label={ariaLabel}
          aria-orientation={orientation}
          onKeyDown={handleKeyDown}
          className={[
            "flex gap-3",
            orientation === "vertical" ? "flex-col" : "flex-row flex-wrap",
            className,
          ].join(" ")}
        >
          {options.map((option) => (
            <RadioOptionItem
              key={option.value}
              option={option}
              className={optionClassName}
            />
          ))}
        </div>
      </RadioContext.Provider>
    );
  },
);

RadioGroup.displayName = "RadioGroup";

function RadioOptionItem({
  option,
  className,
}: {
  option: RadioOption;
  className: string;
}) {
  const context = useContext(RadioContext);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!context) return null;

  const selected = context.value === option.value;
  const disabled = context.disabled || Boolean(option.disabled);

  return (
    <label
      className={[
        "inline-flex items-start gap-3",
        "cursor-pointer select-none",
        disabled && "cursor-not-allowed opacity-50",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <input
        ref={(node) => {
          inputRef.current = node;
          context.register(option.value, node);
        }}
        type="radio"
        name={context.name}
        value={option.value}
        checked={selected}
        disabled={disabled}
        onChange={() => context.onValueChange(option.value)}
        className="peer sr-only"
      />

      <span
        aria-hidden="true"
        className={[
          "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center",
          "rounded-full border border-border/70 bg-background",
          "shadow-[var(--nm-pressed)] transition-all duration-200",
          "peer-checked:shadow-[var(--nm-raised-sm)]",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40",
        ].join(" ")}
      >
        <span
          className={[
            "size-2.5 rounded-full bg-primary transition-transform",
            selected ? "scale-100" : "scale-0",
          ].join(" ")}
        />
      </span>

      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">
          {option.label}
        </span>

        {option.description && (
          <span className="text-xs leading-5 text-muted-foreground">
            {option.description}
          </span>
        )}
      </span>
    </label>
  );
}

export { RadioGroup };
