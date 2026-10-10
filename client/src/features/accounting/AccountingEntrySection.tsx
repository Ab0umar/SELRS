import { useState, type ReactNode } from "react";

export default function AccountingEntrySection({ children, label, editing = false, className }: {
  children: ReactNode;
  label: string;
  editing?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details className={className} open={open || editing} onToggle={event => setOpen(event.currentTarget.open)}>
      <summary className="min-h-11 cursor-pointer rounded-md px-2 py-3 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {editing ? "تعديل حركة" : label}
      </summary>
      <div className="pt-2">{children}</div>
    </details>
  );
}
