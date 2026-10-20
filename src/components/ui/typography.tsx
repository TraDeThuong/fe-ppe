
import { forwardRef, type HTMLAttributes } from "react";

export type TypographyVariant =
  | "default"
  | "embossed"
  | "debossed"
  | "soft"
  | "display";

export type TypographyElement =
  | "p"
  | "span"
  | "div"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "label";

export type TypographyProps = HTMLAttributes<HTMLElement> & {
  variant?: TypographyVariant;
  as?: TypographyElement;
  children: React.ReactNode;
};

const variantClasses: Record<TypographyVariant, string> = {
  default: [
    "text-foreground",
    "font-normal",
  ].join(" "),

  embossed: [
    "text-foreground font-bold",
    "[text-shadow:-2px_-2px_2px_var(--shadow-light),3px_3px_3px_var(--shadow-dark),-4px_-4px_5px_var(--shadow-light),4px_4px_6px_var(--shadow-dark)]",
  ].join(" "),

debossed: [
  "text-muted-foreground font-semibold",
  "[text-shadow:-2px_-2px_2px_var(--shadow-dark),2px_2px_3px_var(--shadow-light),-3px_-3px_5px_var(--shadow-dark),3px_3px_5px_var(--shadow-light)]",
].join(" "),

  soft: [
    "text-muted-foreground font-normal",
    "tracking-wide",
    "antialiased",
  ].join(" "),

  display: [
    "text-foreground font-bold",
    "text-4xl sm:text-5xl",
    "tracking-tight leading-none",
    "tabular-nums",
    "[text-shadow:-1px_-1px_2px_var(--shadow-light),2px_2px_3px_var(--shadow-dark)]",
  ].join(" "),
};

export const Typography = forwardRef<HTMLElement, TypographyProps>(
  (
    {
      variant = "default",
      as: Component = "p",
      className = "",
      children,
      ...props
    },
    ref,
  ) => {
    const classes = [
      "transition-[color,text-shadow] duration-200",
      variantClasses[variant],
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <Component
        ref={ref as never}
        className={classes}
        {...props}
      >
        {children}
      </Component>
    );
  },
);

Typography.displayName = "Typography";
