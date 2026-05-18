import React, { memo } from "react";
import { trpc } from "@/lib/trpc";
import { normalizeServiceCode, formatDisplayDate } from "@/lib/patientsHelpers";

interface PatientTransactionsProps {
  patientId: number;
  serviceCodeToLabel: Map<string, string>;
}

export const PatientTransactions = memo(function PatientTransactions({
  patientId,
  serviceCodeToLabel,
}: PatientTransactionsProps) {
  const entriesQuery = trpc.medical.getPatientServiceEntries.useQuery(
    { patientId },
    { refetchOnWindowFocus: false, staleTime: 30_000 }
  );
  const rows = Array.isArray(entriesQuery.data) ? entriesQuery.data : [];

  if (entriesQuery.isLoading) {
    return <div className="text-xs text-muted-foreground">Loading transactions...</div>;
  }
  if (rows.length === 0) {
    return <div className="text-xs text-muted-foreground">No transactions found</div>;
  }

  return (
    <div className="space-y-1 text-xs text-right" dir="rtl">
      {rows.map((entry: any) => {
        const code = normalizeServiceCode(entry?.serviceCode);
        const name = String(serviceCodeToLabel.get(code) ?? entry?.serviceName ?? code ?? "-").trim();
        const date = entry?.serviceDate ? formatDisplayDate(entry.serviceDate) : "";
        return (
          <div key={String(entry?.id ?? `${patientId}-${code}`)} className="rounded border bg-background px-2 py-1.5">
            <div className="flex flex-col items-end gap-0.5" dir="rtl">
              <span className="font-medium">{name}</span>
              <span className="text-muted-foreground">({code || "-"})</span>
              <span>{date || "-"}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
});
