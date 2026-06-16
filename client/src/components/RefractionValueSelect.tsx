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
}: RefractionValueSelectProps) {
  const normalizedValue = String(value ?? "").trim();
  // Ranges with a zero/dash entry (sphere, cylinder) default blank values to
  // that middle entry instead of a separate empty placeholder item.
  const hasZeroDash = options.includes(ZERO_DASH_VALUE);
  const effectiveValue =
    normalizedValue || (hasZeroDash ? ZERO_DASH_VALUE : EMPTY_SELECT_VALUE);

  return (
    <Select
      value={effectiveValue}
      onValueChange={(nextValue) =>
        onChange(nextValue === EMPTY_SELECT_VALUE ? "" : nextValue)
      }
    >
      <SelectTrigger className={cn("w-full", triggerClassName)}>
        <SelectValue placeholder={placeholder ?? "----"} />
      </SelectTrigger>
      <SelectContent className={className} position="item-aligned">
        {!hasZeroDash && (
          <SelectItem value={EMPTY_SELECT_VALUE}>----</SelectItem>
        )}
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
