import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TreatmentRow {
  key: string;
  date: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes: string;
}

interface TreatmentTabProps {
  treatmentRows: TreatmentRow[];
}

export function TreatmentTab({ treatmentRows }: TreatmentTabProps) {
  return (
    <div className="space-y-6">
      <Card className="border-border/80 bg-background/92 shadow-sm" dir="ltr">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle>Treatment Plan</CardTitle>
            <span className="font-mono text-[10px] text-muted-foreground">
              prescriptions + prescriptionitems
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {treatmentRows.length === 0 && (
            <p className="text-sm text-muted-foreground">
              لا توجد روشتات محفوظة
            </p>
          )}
          {treatmentRows.length > 0 && (
            <div className="overflow-x-auto rounded-[1.25rem] border border-border bg-background">
              <table className="w-full min-w-[920px] border-collapse text-center">
                <thead className="bg-muted text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <tr>
                    <th className="border px-3 py-3">Date</th>
                    <th className="border px-3 py-3">Medication</th>
                    <th className="border px-3 py-3">Dosage</th>
                    <th className="border px-3 py-3">Frequency</th>
                    <th className="border px-3 py-3">Duration</th>
                    <th className="border px-3 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {treatmentRows.map((row) => (
                    <tr
                      key={row.key}
                      className="bg-background text-sm font-medium text-foreground"
                    >
                      <td className="border px-3 py-3" dir="auto">
                        {row.date || "-"}
                      </td>
                      <td className="border px-3 py-3" dir="auto">
                        {row.medication || "-"}
                      </td>
                      <td className="border px-3 py-3" dir="auto">
                        {row.dosage || "-"}
                      </td>
                      <td className="border px-3 py-3" dir="auto">
                        {row.frequency || "-"}
                      </td>
                      <td className="border px-3 py-3" dir="auto">
                        {row.duration || "-"}
                      </td>
                      <td className="border px-3 py-3 text-left" dir="auto">
                        {row.notes || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
