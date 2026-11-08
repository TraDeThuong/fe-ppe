



const variantClasses = {
  default: [
    "bg-card text-foreground",
    "shadow-[8px_8px_12px_var(--shadow-dark),-8px_-8px_12px_var(--shadow-light)]",
  ].join(" "),

raised: [
  "bg-background text-foreground",
  "shadow-[20px_20px_35px_var(--shadow-dark),-20px_-20px_35px_var(--shadow-light)]",
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

  transparent: [
    "bg-transparent text-foreground",
    "shadow-[4px_4px_12px_var(--shadow-dark),-4px_-4px_12px_var(--shadow-light)]",
  ].join(" "),

  "inset-transparent": [
    "bg-transparent text-foreground",
    "shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]",
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
  ref?: React.Ref<HTMLDivElement>;
  variant?: keyof typeof variantClasses;
  padding?: keyof typeof paddingClasses;
  /** @deprecated Sử dụng `variant="interactive"` thay vì cờ `interactive` */
  interactive?: boolean;
}

export function Card({
  ref,
  variant = "default",
  padding = "md",
  interactive,
  className,
  ...props
}: CardProps) {
  const selectedVariant = interactive ? "interactive" : variant;

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
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  ref?: React.Ref<HTMLDivElement>;
}

export function CardHeader({ ref, className, ...props }: CardHeaderProps) {
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
}

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  ref?: React.Ref<HTMLHeadingElement>;
}

export function CardTitle({ ref, className, ...props }: CardTitleProps) {
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
}

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  ref?: React.Ref<HTMLParagraphElement>;
}

export function CardDescription({ ref, className, ...props }: CardDescriptionProps) {
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
}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  ref?: React.Ref<HTMLDivElement>;
}

export function CardContent({ ref, className, ...props }: CardContentProps) {
  return (
    <div
      ref={ref}
      className={["min-w-0", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  ref?: React.Ref<HTMLDivElement>;
}

export function CardFooter({ ref, className, ...props }: CardFooterProps) {
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
}
