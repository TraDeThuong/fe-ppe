
import type { HTMLAttributes, ReactNode } from "react";

export type FormGridColumns = 1 | 2 | 3;

export interface FormSectionProps
  extends HTMLAttributes<HTMLElement> {
  title: string;
  description?: string;
  children: ReactNode;
  columns?: FormGridColumns;
  contentClassName?: string;
}

const gridClasses: Record<FormGridColumns, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
};

export function FormSection({
  title,
  description,
  children,
  columns = 1,
  className = "",
  contentClassName = "",
  ...props
}: FormSectionProps) {
  return (
    <section
      className={[
        "min-w-0 space-y-5",
        className,
      ].join(" ")}
      {...props}
    >
      <div className="space-y-1.5">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          {title}
        </h2>

        {description && (
          <p className="text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      <div
        className={[
          "grid gap-x-5 gap-y-5",
          gridClasses[columns],
          contentClassName,
        ].join(" ")}
      >
        {children}
      </div>
    </section>
  );
}

export default FormSection;
