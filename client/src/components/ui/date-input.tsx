import * as React from "react";
import { format, isValid, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  inputClassName?: string;
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
      inputClassName,
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

    // Typed text is kept separate from `value` so a partial/incomplete date
    // (e.g. "12/0") doesn't get clobbered by the formatted prop value while
    // the user is still typing. Synced from `value` whenever it changes
    // externally (calendar pick, parent reset, etc).
    const [text, setText] = React.useState(() =>
      selectedDate ? format(selectedDate, DISPLAY_FORMAT) : "",
    );
    React.useEffect(() => {
      setText(selectedDate ? format(selectedDate, DISPLAY_FORMAT) : "");
    }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

    const emit = (next: Date | undefined) => {
      const nextValue = next ? format(next, ISO_FORMAT) : "";
      const fakeEvent = {
        target: { value: nextValue, name, id },
        currentTarget: { value: nextValue, name, id },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      onChange?.(fakeEvent);
    };

    // Auto-inserts "/" as the user types digits, so entering a date is just
    // typing 8 digits (ddmmyyyy) without needing to hit "/" manually.
    const formatTyped = (raw: string): string => {
      const digits = raw.replace(/\D/g, "").slice(0, 8);
      const parts = [
        digits.slice(0, 2),
        digits.slice(2, 4),
        digits.slice(4, 8),
      ].filter(Boolean);
      return parts.join("/");
    };

    const commitText = (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) {
        setText("");
        emit(undefined);
        return;
      }
      const parsed = parse(trimmed, DISPLAY_FORMAT, new Date());
      const withinRange =
        isValid(parsed) &&
        (!minDate || parsed >= minDate) &&
        (!maxDate || parsed <= maxDate);
      if (withinRange) {
        setText(format(parsed, DISPLAY_FORMAT));
        emit(parsed);
      } else {
        // Invalid/incomplete — revert the visible text to the last valid value.
        setText(selectedDate ? format(selectedDate, DISPLAY_FORMAT) : "");
      }
    };

    return (
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) onBlur?.();
        }}
      >
        <div
          className={cn(
            "inline-flex items-center gap-1 rounded-md border border-input bg-transparent",
            "focus-within:ring-1 focus-within:ring-ring",
            isDisabled && "opacity-50",
            className,
          )}
          style={style}
          dir={dir}
        >
          <Input
            ref={ref as any}
            id={id}
            name={name}
            type="text"
            inputMode="numeric"
            dir="ltr"
            disabled={isDisabled}
            autoFocus={autoFocus}
            aria-required={required}
            aria-label={ariaLabel}
            placeholder={placeholder || "dd/mm/yyyy"}
            // Keep the default wide enough for the full date. Dense layouts
            // can opt into a smaller input through inputClassName.
            size={11}
            value={text}
            onChange={(e) => setText(formatTyped(e.target.value))}
            onBlur={() => {
              commitText(text);
              onBlur?.();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitText(text);
              }
            }}
            className={cn(
              "w-auto min-w-28 border-0 shadow-none focus-visible:ring-0 tabular-nums",
              inputClassName,
            )}
          />
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={isDisabled}
              className="h-8 w-8 shrink-0"
              tabIndex={-1}
            >
              <CalendarIcon className="h-4 w-4 opacity-60" />
            </Button>
          </PopoverTrigger>
        </div>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            captionLayout="dropdown"
            startMonth={new Date(1900, 0)}
            endMonth={new Date(2099, 11)}
            disabled={
              minDate || maxDate
                ? ({ before: minDate, after: maxDate } as any)
                : undefined
            }
            onSelect={(d) => {
              emit(d);
              setText(d ? format(d, DISPLAY_FORMAT) : "");
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    );
  },
);
DateInput.displayName = "DateInput";
