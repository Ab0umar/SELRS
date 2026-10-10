import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

export function ReportPatientField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value?: string | number | null;
  onChange?: (value: string) => void;
  type?: "text" | "date" | "tel";
}) {
  const source = value == null ? "" : String(value);
  const [draft, setDraft] = useState(source);
  useEffect(() => setDraft(source), [source]);
  const displayed = onChange ? source : draft;

  return (
    <>
      <Input
        aria-label={label}
        type={type}
        value={displayed}
        onChange={(event) => {
          setDraft(event.target.value);
          onChange?.(event.target.value);
        }}
        className="h-9 min-w-0 w-full bg-transparent text-center font-semibold print:hidden"
      />
      <span className="hidden whitespace-pre-wrap break-words print:block">
        {displayed || "-"}
      </span>
    </>
  );
}
