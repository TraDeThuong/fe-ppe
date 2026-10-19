
import { forwardRef } from "react";



const variantClasses = {
  default: [
    "bg-card text-foreground",
    "shadow-[8px_8px_12px_var(--shadow-dark),-8px_-8px_12px_var(--shadow-light)]",
  ].join(" "),

  raised: [
    "bg-card text-foreground",
    "shadow-[12px_12px_16px_var(--shadow-dark),-12px_-12px_16px_var(--shadow-light)]",
  ].join(" "),

  inset: [
    "bg-background text-foreground",
    "shadow-[inset_6px_6px_10px_var(--shadow-dark),inset_-6px_-6px_10px_var(--shadow-light)]",
  ].join(" "),

  interactive: [
    "bg-card text-foreground",
    "shadow-[8px_8px_12px_var(--shadow-dark),-8px_-8px_12px_var(--shadow-light)]",
    "transition-[box-shadow,transform] duration-200 ease-out",
    "hover:-translate-y-1.5",
    "hover:shadow-[14px_14px_18px_var(--shadow-dark),-14px_-14px_18px_var(--shadow-light)]",
    "active:translate-y-0",
    "active:shadow-[inset_5px_5px_8px_var(--shadow-dark),inset_-5px_-5px_8px_var(--shadow-light)]",
  ].join(" "),

  glass: [
    "bg-background/70 text-foreground",
    "backdrop-blur-md",
    "shadow-[8px_8px_14px_var(--shadow-dark),-8px_-8px_14px_var(--shadow-light)]",
  ].join(" "),

  accent: [
    "bg-primary text-primary-foreground",
    "shadow-[8px_8px_12px_var(--shadow-dark),-8px_-8px_12px_var(--shadow-light)]",
  ].join(" "),
} as const;



const paddingClasses = {
  none: "p-0",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
} as const;

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof variantClasses;
  padding?: keyof typeof paddingClasses;
  interactive?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  function Card(
    {
      variant = "default",
      padding = "md",
      interactive = false,
      className,
      ...props
    },
    ref,
  ) {
    const selectedVariant = interactive
      ? "interactive"
      : variant;

    return (
      <div
        ref={ref}
        className={[
          "rounded-2xl",
          variantClasses[selectedVariant],
          paddingClasses[padding],
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      />
    );
  },
);

Card.displayName = "Card";

export const CardHeader = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function CardHeader({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={[
        "flex flex-col gap-1.5",
        "pb-5",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
});

CardHeader.displayName = "CardHeader";

export const CardTitle = forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(function CardTitle({ className, ...props }, ref) {
  return (
    <h3
      ref={ref}
      className={[
        "text-lg font-semibold leading-tight tracking-tight",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
});

CardTitle.displayName = "CardTitle";

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(function CardDescription({ className, ...props }, ref) {
  return (
    <p
      ref={ref}
      className={[
        "text-sm leading-6 text-muted-foreground",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
});

CardDescription.displayName = "CardDescription";

export const CardContent = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function CardContent({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={["min-w-0", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
});

CardContent.displayName = "CardContent";

export const CardFooter = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function CardFooter({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={[
        "flex items-center gap-3 pt-5",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
});

CardFooter.displayName = "CardFooter";
