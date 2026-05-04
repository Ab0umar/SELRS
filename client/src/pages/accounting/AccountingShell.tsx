import type { ReactNode } from "react";

type AccountingShellProps = {
  children: ReactNode;
};

/** Layout wrapper for accounting pages (navigation lives in the main sidebar). */
export default function AccountingShell({ children }: AccountingShellProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4 pt-2" dir="rtl">
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}
