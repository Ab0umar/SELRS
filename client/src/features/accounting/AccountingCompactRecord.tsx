import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AccountingCompactRecord({
  title,
  meta,
  value,
  children,
  className,
  forceOpen = false,
}: {
  title: ReactNode;
  meta?: ReactNode;
  value: ReactNode;
  children: ReactNode;
  className?: string;
  forceOpen?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <article className={cn("accounting-compact-record", className)}>
      <button
        type="button"
        className="accounting-record-summary"
        aria-expanded={open || forceOpen}
        onClick={() => setOpen(!open)}
      >
        <span className="accounting-record-heading">
          <span className="accounting-record-title">{title}</span>
          <span className="accounting-record-meta">{meta}</span>
        </span>
        <span className="accounting-record-value">{value}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn("accounting-record-chevron", open && "rotate-180")}
        />
      </button>
      <div className="accounting-record-details" data-open={open || forceOpen}>
        {children}
      </div>
    </article>
  );
}
