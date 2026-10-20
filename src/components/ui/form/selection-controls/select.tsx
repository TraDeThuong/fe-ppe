
"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Check, ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  optionClassName?: string;
  emptyMessage?: ReactNode;
  ariaLabel?: string;
}

const triggerSizes = {
  sm: "min-h-9 rounded-xl px-3 py-2 text-xs",
  md: "min-h-11 rounded-2xl px-4 py-2.5 text-sm",
  lg: "min-h-[52px] rounded-2xl px-4 py-3 text-base",
};

function Select({
  options,
  value,
  defaultValue,
  onValueChange,
  name,
  id,
  placeholder = "Chọn một giá trị",
  disabled = false,
  required = false,
  size = "md",
  className = "",
  triggerClassName = "",
  menuClassName = "",
  optionClassName = "",
  emptyMessage = "Không có lựa chọn",
  ariaLabel,
}: SelectProps) {
  const generatedId = useId();
  const triggerId = id ?? `select-${generatedId}`;
  const listboxId = `${triggerId}-listbox`;

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef(new Map<string, HTMLButtonElement>());

  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const selectedValue = isControlled ? value : internalValue;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const selectedOption = options.find(
    (option) => option.value === selectedValue,
  );

  const enabledOptions = options.filter((option) => !option.disabled);

  const closeMenu = (restoreFocus = false) => {
    setOpen(false);

    if (restoreFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  };

  const chooseOption = (option: SelectOption) => {
    if (option.disabled || disabled) return;

    if (!isControlled) setInternalValue(option.value);
    onValueChange?.(option.value);
    closeMenu(true);
  };

  const openMenu = (direction: "first" | "last" | "selected" = "selected") => {
    if (disabled) return;

    const selectedIndex = enabledOptions.findIndex(
      (option) => option.value === selectedValue,
    );

    const nextIndex =
      direction === "first"
        ? 0
        : direction === "last"
          ? enabledOptions.length - 1
          : selectedIndex >= 0
            ? selectedIndex
            : 0;

    setActiveIndex(nextIndex);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;

    const option = enabledOptions[activeIndex];

    if (option) {
      optionRefs.current.get(option.value)?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [open, activeIndex, enabledOptions]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();

        if (!open) {
          openMenu("selected");
        } else if (enabledOptions.length) {
          setActiveIndex((index) =>
            index < 0 ? 0 : (index + 1) % enabledOptions.length,
          );
        }
        break;

      case "ArrowUp":
        event.preventDefault();

        if (!open) {
          openMenu("last");
        } else if (enabledOptions.length) {
          setActiveIndex((index) =>
            index <= 0 ? enabledOptions.length - 1 : index - 1,
          );
        }
        break;

      case "Home":
        if (open && enabledOptions.length) {
          event.preventDefault();
          setActiveIndex(0);
        }
        break;

      case "End":
        if (open && enabledOptions.length) {
          event.preventDefault();
          setActiveIndex(enabledOptions.length - 1);
        }
        break;

      case "Enter":
      case " ":
        event.preventDefault();

        if (!open) {
          openMenu("selected");
        } else if (enabledOptions[activeIndex]) {
          chooseOption(enabledOptions[activeIndex]);
        }
        break;

      case "Escape":
        if (open) {
          event.preventDefault();
          closeMenu();
        }
        break;

      case "Tab":
        closeMenu();
        break;
    }
  };

  const activeOption = enabledOptions[activeIndex];

  return (
    <div
      ref={rootRef}
      className={["relative w-full min-w-0", className].join(" ")}
    >
      {name && (
        <input
          type="hidden"
          name={name}
          value={selectedValue ?? ""}
          disabled={disabled}
          required={required}
        />
      )}

      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={
          open && activeOption
            ? `${listboxId}-option-${options.indexOf(activeOption)}`
            : undefined
        }
        aria-required={required || undefined}
        disabled={disabled}
        onClick={() => {
          if (open) closeMenu();
          else openMenu("selected");
        }}
        onKeyDown={handleKeyDown}
        className={[
          "flex w-full items-center justify-between gap-3",
          "border border-border/70 bg-background",
          "text-left text-foreground",
          "shadow-[var(--nm-inset)]",
          "transition-[border-color,box-shadow] duration-200",
          "focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-primary/40",
          "disabled:cursor-not-allowed disabled:opacity-50",
          triggerSizes[size],
          triggerClassName,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span
          className={[
            "min-w-0 flex-1 truncate",
            !selectedOption && "text-muted-foreground",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {selectedOption?.label ?? placeholder}
        </span>

        <ChevronDown
          aria-hidden="true"
          className={[
            "size-4 shrink-0 text-muted-foreground",
            "transition-transform duration-200",
            open && "rotate-180",
          ]
            .filter(Boolean)
            .join(" ")}
        />
      </button>

      {open && (
        <div
          className={[
            "absolute left-0 top-[calc(100%+8px)] z-50 w-full",
            "overflow-hidden rounded-2xl",
            "border border-border/70 bg-background/95",
            "shadow-[var(--nm-raised)] backdrop-blur-xl",
            "motion-safe:animate-in motion-safe:fade-in",
            "motion-safe:slide-in-from-top-1 motion-safe:duration-150",
            menuClassName,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div
            id={listboxId}
            role="listbox"
            aria-labelledby={ariaLabel ? undefined : triggerId}
            aria-label={ariaLabel}
            className="max-h-60 overflow-y-auto p-2"
          >
            {options.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                {emptyMessage}
              </p>
            ) : (
              options.map((option, index) => {
                const selected = option.value === selectedValue;
                const active =
                  enabledOptions[activeIndex]?.value === option.value;

                return (
                  <button
                    key={option.value}
                    ref={(node) => {
                      if (node) optionRefs.current.set(option.value, node);
                      else optionRefs.current.delete(option.value);
                    }}
                    id={`${listboxId}-option-${index}`}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={option.disabled}
                    onMouseEnter={() => {
                      if (!option.disabled) {
                        setActiveIndex(
                          enabledOptions.findIndex(
                            (item) => item.value === option.value,
                          ),
                        );
                      }
                    }}
                    onClick={() => chooseOption(option)}
                    className={[
                      "flex w-full items-center gap-3",
                      "rounded-xl px-3 py-2.5 text-left text-sm",
                      "transition-colors duration-150",
                      active && "bg-secondary/70",
                      selected && "font-medium text-primary",
                      !selected && "text-foreground",
                      "hover:bg-secondary/70",
                      "disabled:cursor-not-allowed disabled:opacity-40",
                      optionClassName,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block">{option.label}</span>

                      {option.description && (
                        <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                          {option.description}
                        </span>
                      )}
                    </span>

                    {selected && (
                      <Check
                        aria-hidden="true"
                        className="size-4 shrink-0 text-primary"
                        strokeWidth={2.5}
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { Select };
