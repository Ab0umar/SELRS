import * as React from "react";
import { format, isValid, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const ISO_FORMAT = "yyyy-MM-dd";
const DISPLAY_FORMAT = "dd/MM/yyyy";

export interface DateInputProps {
  /** ISO yyyy-MM-dd string — same value convention the native date field used. */
  value?: string | null;
  /** Fires a native-input-shaped change event so existing
   *  `(e) => setX(e.target.value)` handlers keep working unchanged. */
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  id?: string;
  name?: string;
  className?: string;
  style?: React.CSSProperties;
  dir?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Date field can't really be "read only" and still pickable — treated the
   *  same as `disabled` (blocks opening the picker). */
  readOnly?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  /** ISO yyyy-MM-dd — earliest selectable date. */
  min?: string;
  /** ISO yyyy-MM-dd — latest selectable date. */
  max?: string;
  "aria-label"?: string;
}

function parseIso(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = parse(value, ISO_FORMAT, new Date());
  return isValid(parsed) ? parsed : undefined;
}

// Drop-in replacement for the native date field that always displays
// dd/mm/yyyy regardless of the browser/OS locale (native date inputs render
// per-locale, which caused dates to be misread). Value/onChange keep the
// same ISO yyyy-MM-dd contract as before.
export const DateInput = React.forwardRef<HTMLButtonElement, DateInputProps>(
  (
    {
      value,
      onChange,
      onBlur,
      className,
      style,
      dir,
      disabled,
      readOnly,
      id,
      name,
      placeholder,
      required,
      autoFocus,
      min,
      max,
      "aria-label": ariaLabel,
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const isDisabled = disabled || readOnly;

    const selectedDate = React.useMemo(() => parseIso(value), [value]);
    const minDate = React.useMemo(() => parseIso(min), [min]);
    const maxDate = React.useMemo(() => parseIso(max), [max]);

    const emit = (next: Date | undefined) => {
      const nextValue = next ? format(next, ISO_FORMAT) : "";
      const fakeEvent = {
        target: { value: nextValue, name, id },
        currentTarget: { value: nextValue, name, id },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      onChange?.(fakeEvent);
    };

    return (
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) onBlur?.();
        }}
      >
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            id={id}
            type="button"
            variant="outline"
            disabled={isDisabled}
            autoFocus={autoFocus}
            aria-required={required}
            aria-label={ariaLabel}
            dir={dir}
            style={style}
            className={cn(
              "justify-start gap-2 font-normal",
              !selectedDate && "text-muted-foreground",
              className,
            )}
          >
            <CalendarIcon className="h-4 w-4 shrink-0 opacity-60" />
            <span dir="ltr" className="tabular-nums">
              {selectedDate
                ? format(selectedDate, DISPLAY_FORMAT)
                : placeholder || "dd/mm/yyyy"}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            captionLayout="dropdown"
            disabled={
              minDate || maxDate
                ? ({ before: minDate, after: maxDate } as any)
                : undefined
            }
            onSelect={(d) => {
              emit(d);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    );
  },
);
DateInput.displayName = "DateInput";
