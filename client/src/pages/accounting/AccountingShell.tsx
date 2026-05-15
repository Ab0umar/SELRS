import type { ReactNode } from "react";

export default function AccountingShell({ children }: { children: ReactNode }) {
  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-900">
      <div className="h-1 w-full bg-slate-200" />
      <main className="mx-auto max-w-7xl px-4 py-4 lg:px-6 lg:py-5">
        {children}
      </main>
    </div>
  );
}
