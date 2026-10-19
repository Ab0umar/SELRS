import * as React from "react";
import type { AriaAttributes, ReactElement, ReactNode } from "react";
import { AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  helperText?: string;
  /** Control id for the label's htmlFor; a child's own id still takes precedence. */
  id?: string;
}

type ControlProps = Pick<
  AriaAttributes,
  "aria-describedby" | "aria-invalid" | "aria-required"
> & {
  id?: string;
};

function isSingleControl(
  children: ReactNode,
): children is ReactElement<ControlProps> {
  return (
    React.isValidElement<ControlProps>(children) &&
    children.type !== React.Fragment
  );
}

export function FormField({
  label,
  error,
  required = false,
  children,
  helperText,
  id,
}: FormFieldProps) {
  const generatedId = React.useId();
  // Only a single element child is wired. A Radix <Select> root renders no DOM node,
  // so pass <SelectTrigger> here, or set `id` and put that id on the control yourself.
  const control = isSingleControl(children) ? children : null;
  const controlId = control?.props.id ?? id ?? generatedId;
  const errorId = `${controlId}-error`;
  const helperId = `${controlId}-helper`;
  const showHelper = Boolean(helperText) && !error;

  let content: ReactNode = children;
  if (control) {
    const describedBy = [
      control.props["aria-describedby"],
      error ? errorId : undefined,
      showHelper ? helperId : undefined,
    ]
      .filter(Boolean)
      .join(" ");

    content = React.cloneElement(control, {
      id: controlId,
      "aria-invalid": error ? true : control.props["aria-invalid"],
      "aria-required": required ? true : control.props["aria-required"],
      "aria-describedby": describedBy || undefined,
    });
  }

  return (
    <div className="space-y-2">
      <label
        htmlFor={control || id ? controlId : undefined}
        className="inline-flex items-center gap-1 text-sm font-medium text-foreground"
      >
        {label}
        {required && (
          <span aria-hidden="true" className="text-destructive me-1">
            *
          </span>
        )}
        {/* Wired children get aria-required; without one, speak the state here. */}
        {required && !control && <span className="sr-only">(مطلوب)</span>}
      </label>
      <div
        className={cn(
          "rounded-2xl transition-colors",
          error ? "ring-1 ring-destructive/30" : "",
        )}
      >
        {content}
      </div>
      {error && (
        <div
          id={errorId}
          role="alert"
          className="flex items-center gap-1 text-sm text-destructive"
        >
          <AlertCircle aria-hidden="true" className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
      {showHelper && (
        <p
          id={helperId}
          className="flex items-center gap-1 text-xs text-muted-foreground"
        >
          <Info aria-hidden="true" className="h-3.5 w-3.5" />
          {helperText}
        </p>
      )}
    </div>
  );
}
