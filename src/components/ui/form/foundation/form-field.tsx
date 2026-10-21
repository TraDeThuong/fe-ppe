
import {
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from "react";

import { Label, type LabelProps } from "./label";
import { FormMessage } from "./form-message";

export interface FormFieldProps {
  children: ReactElement<any>;
  label?: ReactNode;
  required?: boolean;
  helperText?: ReactNode;
  error?: ReactNode;

  id?: string;
  className?: string;
  labelClassName?: string;
  controlClassName?: string;
  helperClassName?: string;
  errorClassName?: string;

  labelProps?: Omit<LabelProps, "children" | "htmlFor" | "required">;
  showHelperWithError?: boolean;
}

function FormField({
  children,
  label,
  required,
  helperText,
  error,
  id,
  className = "",
  labelClassName = "",
  controlClassName = "",
  helperClassName = "",
  errorClassName = "",
  labelProps,
  showHelperWithError = true,
}: FormFieldProps) {
  const generatedId = useId();

  if (!isValidElement(children)) return null;

  const child = children as ReactElement<Record<string, any>>;
  const childProps = (child.props || {}) as Record<string, any>;
  const controlId = id ?? childProps.id ?? `field-${generatedId}`;

  const helperId = `${controlId}-helper`;
  const errorId = `${controlId}-error`;

  const hasHelper = helperText != null && helperText !== "";
  const hasError = error != null && error !== "";

  const describedBy = [
    childProps["aria-describedby"],
    hasHelper && (showHelperWithError || !hasError)
      ? helperId
      : undefined,
    hasError ? errorId : undefined,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  const control = cloneElement(child, {
    id: controlId,
    required: required ?? childProps.required,
    ...(typeof child.type === "string"
      ? {}
      : { error: hasError ? true : childProps.error }),
    "aria-describedby": describedBy,
    "aria-invalid": hasError
      ? true
      : childProps["aria-invalid"],
    className: [
      childProps.className,
      controlClassName,
    ]
      .filter(Boolean)
      .join(" ") || undefined,
  } as Record<string, any>);

  return (
    <div
      className={[
        "flex w-full flex-col gap-2",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {label != null && (
        <Label
          {...labelProps}
          htmlFor={controlId}
          required={required ?? childProps.required}
          className={[
            labelProps?.className,
            labelClassName,
          ]
            .filter(Boolean)
            .join(" ") || undefined}
        >
          {label}
        </Label>
      )}

      {control}

      {hasHelper && (showHelperWithError || !hasError) && (
        <FormMessage
          id={helperId}
          variant="helper"
          className={helperClassName}
        >
          {helperText}
        </FormMessage>
      )}

      {hasError && (
        <FormMessage
          id={errorId}
          variant="error"
          className={errorClassName}
        >
          {error}
        </FormMessage>
      )}
    </div>
  );
}

export { FormField };
