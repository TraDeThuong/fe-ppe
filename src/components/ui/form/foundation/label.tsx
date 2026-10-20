
import {
  forwardRef,
  type LabelHTMLAttributes,
  type ReactNode,
} from "react";

export interface LabelProps
  extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  requiredIndicator?: ReactNode;
}

const Label = forwardRef<HTMLLabelElement, LabelProps>(
  (
    {
      className = "",
      required = false,
      requiredIndicator,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <label
        ref={ref}
        className={[
          "inline-flex items-center gap-1.5",
          "text-sm font-medium leading-5",
          "text-foreground",
          "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {children}

        {required &&
          (requiredIndicator ?? (
            <span
              aria-hidden="true"
              className="text-danger"
            >
              *
            </span>
          ))}
      </label>
    );
  },
);

Label.displayName = "Label";

export { Label };
