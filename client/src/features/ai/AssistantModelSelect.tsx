export type AssistantOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export default function AssistantModelSelect({
  value,
  onChange,
  options,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: AssistantOption[];
  disabled?: boolean;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-sm">
      المساعد والموديل
      <select
        aria-label="المساعد والموديل"
        className="min-h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-foreground"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
