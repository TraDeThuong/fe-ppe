
import { forwardRef } from "react";

const variantClasses = {
  primary: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  outline: "bg-background text-foreground",
  ghost: "bg-background text-foreground",
  danger: "bg-danger text-danger-foreground",
  hybrid: "bg-background text-foreground",
  sculpted: "bg-primary text-primary-foreground",
  aurora: "bg-background text-foreground",
  metal: "bg-background text-foreground",
} as const;

const sizeClasses = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
} as const;

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeClasses;
}

const baseClasses = [
  "relative isolate inline-flex items-center justify-center gap-2",
  "rounded-xl font-medium",
  "transition-[box-shadow,transform,background-color,filter] duration-300 ease-out",
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary",
  "enabled:active:translate-y-px",
  "disabled:cursor-not-allowed disabled:opacity-60",
].join(" ");

const neumorphicShadow = [
  "shadow-[10px_10px_20px_var(--shadow-dark),-10px_-10px_20px_var(--shadow-light)]",
  "enabled:hover:shadow-[14px_14px_26px_var(--shadow-dark),-14px_-14px_26px_var(--shadow-light)]",
  "enabled:active:shadow-[inset_6px_6px_12px_var(--shadow-dark),inset_-6px_-6px_12px_var(--shadow-light)]",
  "disabled:shadow-[inset_5px_5px_10px_var(--shadow-dark),inset_-5px_-5px_10px_var(--shadow-light)]",
].join(" ");

const hybridShadow = [
  "shadow-[10px_10px_20px_var(--shadow-dark),-10px_-10px_20px_var(--shadow-light),inset_-2px_-2px_4px_var(--shadow-light),inset_2px_2px_4px_var(--shadow-dark)]",
  "enabled:hover:shadow-[14px_14px_26px_var(--shadow-dark),-14px_-14px_26px_var(--shadow-light),inset_-2px_-2px_4px_var(--shadow-light),inset_2px_2px_4px_var(--shadow-dark)]",
].join(" ");

const solidShadow = [
  "shadow-[8px_8px_16px_rgba(0,0,0,0.34),-5px_-5px_12px_rgba(255,255,255,0.16)]",
  "enabled:hover:shadow-[12px_12px_22px_rgba(0,0,0,0.40),-6px_-6px_14px_rgba(255,255,255,0.20)]",
  "enabled:active:shadow-[inset_5px_5px_10px_rgba(0,0,0,0.34),inset_-2px_-2px_5px_rgba(255,255,255,0.03)]",
  "disabled:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.28)]",
].join(" ");

const sculptedClasses = [
  "rounded-2xl",
  "bg-gradient-to-br from-primary via-primary to-primary/80",
  "border border-white/15",
  "shadow-[8px_8px_16px_rgba(0,0,0,0.30),-5px_-5px_12px_rgba(255,255,255,0.18),inset_1px_1px_2px_rgba(255,255,255,0.20),inset_-2px_-2px_4px_rgba(0,0,0,0.12)]",
  "enabled:hover:-translate-y-1 enabled:hover:scale-[1.03]",
  "enabled:hover:shadow-[12px_12px_22px_rgba(0,0,0,0.35),-6px_-6px_14px_rgba(255,255,255,0.22),inset_1px_1px_2px_rgba(255,255,255,0.25)]",
  "enabled:active:translate-y-0 enabled:active:scale-[0.98]",
].join(" ");

const auroraClasses = [
  "overflow-hidden rounded-2xl",
  "border border-white/20",
  "bg-gradient-to-br from-[#a7f3d0] via-[#a5b4fc] to-[#f0abfc]",
  "text-slate-900",
  "shadow-[8px_8px_18px_rgba(0,0,0,0.22),-5px_-5px_14px_rgba(255,255,255,0.35),inset_1px_1px_2px_rgba(255,255,255,0.55)]",
  "enabled:hover:-translate-y-1 enabled:hover:scale-[1.025]",
  "enabled:hover:brightness-105",
  "enabled:hover:shadow-[12px_12px_24px_rgba(0,0,0,0.25),-6px_-6px_16px_rgba(255,255,255,0.40),inset_1px_1px_2px_rgba(255,255,255,0.65)]",
  "enabled:active:translate-y-0",
].join(" ");

const metalClasses = [
  "overflow-hidden rounded-xl",
  "border border-white/25",
  "bg-gradient-to-br from-[#f8fafc] via-[#cbd5e1] to-[#94a3b8]",
  "text-slate-800",
  "shadow-[8px_8px_16px_rgba(0,0,0,0.28),-5px_-5px_12px_rgba(255,255,255,0.30),inset_1px_1px_2px_rgba(255,255,255,0.75),inset_-1px_-1px_2px_rgba(0,0,0,0.12)]",
  "enabled:hover:-translate-y-1 enabled:hover:scale-[1.03]",
  "enabled:hover:brightness-105",
  "enabled:active:translate-y-0 enabled:active:scale-[0.98]",
].join(" ");

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      className,
      disabled = false,
      type = "button",
      ...props
    },
    ref,
  ) {
    const isSolid = variant === "primary" || variant === "danger";

    let shadowClasses = neumorphicShadow;

    if (isSolid) {
      shadowClasses = solidShadow;
    } else if (variant === "hybrid") {
      shadowClasses = hybridShadow;
    }

    let specialClasses = "";

    if (variant === "sculpted") {
      specialClasses = sculptedClasses;
    } else if (variant === "aurora") {
      specialClasses = auroraClasses;
    } else if (variant === "metal") {
      specialClasses = metalClasses;
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={[
          baseClasses,
          shadowClasses,
          specialClasses,
          variantClasses[variant],
          sizeClasses[size],
          disabled && "transform-none",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
