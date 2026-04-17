import { useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { EMPTY_SELECT_VALUE } from "@/lib/refractionOptions";

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
  const effectiveValue = normalizedValue || String(defaultValue ?? "").trim();

  useEffect(() => {
    if (!normalizedValue && defaultValue !== undefined) {
      onChange(defaultValue);
    }
  }, [defaultValue, normalizedValue, onChange]);

  return (
    <Select
      value={effectiveValue || EMPTY_SELECT_VALUE}
      onValueChange={(nextValue) =>
        onChange(nextValue === EMPTY_SELECT_VALUE ? "" : nextValue)
      }
    >
      <SelectTrigger className={cn("w-full", triggerClassName)}>
        <SelectValue placeholder={placeholder ?? "Select value"} />
      </SelectTrigger>
      <SelectContent className={className}>
        {allowEmpty ? <SelectItem value={EMPTY_SELECT_VALUE}>-</SelectItem> : null}
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
