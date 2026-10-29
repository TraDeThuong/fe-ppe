
"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useLocale } from "@/providers/locale-provider";

import { Input, type InputProps } from "../foundation/input";

export interface PasswordInputProps
  extends Omit<InputProps, "type" | "suffix"> {
  showPasswordToggle?: boolean;
  toggleLabel?: {
    show: string;
    hide: string;
  };
}

function PasswordInput({
  showPasswordToggle = true,
  toggleLabel,
  disabled,
  ...props
}: PasswordInputProps) {
  let isVietnamese = true;
  try {
    const localeCtx = useLocale();
    isVietnamese = localeCtx.locale === "vi-VN";
  } catch {
    // fallback if outside LocaleProvider
  }

  const effectiveToggleLabel = toggleLabel ?? {
    show: isVietnamese ? "Hiện mật khẩu" : "Show password",
    hide: isVietnamese ? "Ẩn mật khẩu" : "Hide password",
  };

  const [visible, setVisible] = useState(false);

  return (
    <Input
      {...props}
      type={visible ? "text" : "password"}
      disabled={disabled}
      autoComplete={props.autoComplete ?? "current-password"}
      suffix={
        showPasswordToggle ? (
          <button
            type="button"
            disabled={disabled}
            aria-label={visible ? effectiveToggleLabel.hide : effectiveToggleLabel.show}
            aria-pressed={visible}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setVisible((current) => !current)}
            className={[
              "inline-flex size-8 items-center justify-center",
              "rounded-lg text-muted-foreground",
              "transition-all duration-200",
              "hover:text-foreground",
              "hover:shadow-[var(--nm-raised-sm)]",
              "active:shadow-[var(--nm-pressed)]",
              "focus-visible:outline-none",
              "focus-visible:ring-2 focus-visible:ring-primary/40",
              "disabled:cursor-not-allowed disabled:opacity-50",
            ].join(" ")}
          >
            {visible ? (
              <EyeOff aria-hidden="true" className="size-4" />
            ) : (
              <Eye aria-hidden="true" className="size-4" />
            )}
          </button>
        ) : undefined
      }
    />
  );
}

export { PasswordInput };
