
import {
  createContext,
  useContext,
  useId,
  type ReactNode,
} from "react";

import { Label, type LabelProps } from "./label";
import { FormMessage } from "./form-message";

export interface FormFieldContextValue {
  id: string;
  required?: boolean;
  hasError?: boolean;
  error?: ReactNode;
  describedBy?: string;
  errorId: string;
  helperId: string;
  controlClassName?: string;
}

export const FormFieldContext = createContext<FormFieldContextValue | null>(null);

export function useFormField(): FormFieldContextValue | null {
  return useContext(FormFieldContext);
}

export interface FormFieldProps {
  children: ReactNode;
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
  const controlId = id ?? `field-${generatedId}`;

  const helperId = `${controlId}-helper`;
  const errorId = `${controlId}-error`;

  const hasHelper = helperText != null && helperText !== "";
  const hasError = error != null && error !== "";

  const describedBy = [
    hasHelper && (showHelperWithError || !hasError)
      ? helperId
      : undefined,
    hasError ? errorId : undefined,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  const contextValue: FormFieldContextValue = {
    id: controlId,
    required,
    hasError,
    error,
    describedBy,
    errorId,
    helperId,
    controlClassName,
  };

  return (
    <FormFieldContext.Provider value={contextValue}>
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
            required={required}
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

        {children}

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
    </FormFieldContext.Provider>
  );
}

export { FormField };
