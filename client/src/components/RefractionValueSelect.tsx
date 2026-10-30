import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { EMPTY_SELECT_VALUE, ZERO_DASH_VALUE } from "@/lib/refractionOptions";

type RefractionValueSelectProps = {
  value?: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  defaultValue?: string;
  allowEmpty?: boolean;
  "aria-label"?: string;
  id?: string;
};

export default function RefractionValueSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
  triggerClassName,
  defaultValue,
  allowEmpty = true,
  "aria-label": ariaLabel,
  id,
}: RefractionValueSelectProps) {
  const normalizedValue = String(value ?? "").trim();
  // Ranges with a zero/dash entry (sphere, cylinder) default blank values to
  // that middle entry instead of a separate empty placeholder item.
  const hasZeroDash = options.includes(ZERO_DASH_VALUE);
  const effectiveValue =
    normalizedValue || (hasZeroDash ? ZERO_DASH_VALUE : EMPTY_SELECT_VALUE);

  // Radix mounts every SelectItem even while closed. With 80-240 options per
  // field and dozens of fields per tab that made the tabs slow, so while closed
  // only the selected item is mounted (enough for SelectValue to show its text).
  const [open, setOpen] = useState(false);
  const selectedLabel =
    effectiveValue === EMPTY_SELECT_VALUE ? "----" : effectiveValue;

  return (
    <span className="block w-full print:contents">
      <Select
        open={open}
        onOpenChange={setOpen}
        value={effectiveValue}
        onValueChange={(nextValue) =>
          onChange(nextValue === EMPTY_SELECT_VALUE ? "" : nextValue)
        }
      >
        <SelectTrigger
          id={id}
          aria-label={ariaLabel ?? placeholder ?? "قيمة القياس"}
          className={cn("w-full print:hidden", triggerClassName)}
        >
          <SelectValue placeholder={placeholder ?? "----"} />
        </SelectTrigger>
        <SelectContent className={className} position="item-aligned">
          {open ? (
            <>
              {!hasZeroDash && (
                <SelectItem value={EMPTY_SELECT_VALUE}>----</SelectItem>
              )}
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </>
          ) : (
            <SelectItem value={effectiveValue}>{selectedLabel}</SelectItem>
          )}
        </SelectContent>
      </Select>
      {/* Print shows the raw value as plain text over a fill-in line; an
          unset cell prints blank instead of the dropdown's "---" default. */}
      <span
        aria-hidden
        className="hidden print:block print:w-full print:border-b print:border-[#737685] print:min-h-[1.4em] print:text-center print:text-sm print:leading-relaxed"
      >
        {normalizedValue}
      </span>
    </span>
  );
}
