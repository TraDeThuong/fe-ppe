
"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

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
  toggleLabel = {
    show: "Hiện mật khẩu",
    hide: "Ẩn mật khẩu",
  },
  disabled,
  ...props
}: PasswordInputProps) {
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
            aria-label={visible ? toggleLabel.hide : toggleLabel.show}
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
