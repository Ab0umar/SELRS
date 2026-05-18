import { Badge } from "@/components/ui/badge";
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
  treatmentData: any[];
  medications: any[];
}

export function TreatmentTab({ treatmentRows, treatmentData, medications }: TreatmentTabProps) {
  return (
    <div className="space-y-6">
      <Card className="border-border/80 bg-background/92 shadow-sm" dir="ltr">
        <CardHeader className="border-b border-border">
          <CardTitle>الروشتات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {treatmentRows.length === 0 && <p className="text-sm text-muted-foreground">لا توجد روشتات محفوظة</p>}
          {treatmentRows.length > 0 && (
            <div className="overflow-x-auto rounded-[1.25rem] border border-border bg-background">
              <table className="w-full min-w-[920px] border-collapse text-center">
                <thead className="bg-muted text-xs uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="border px-3 py-3">Date</th><th className="border px-3 py-3">Medication</th>
                    <th className="border px-3 py-3">Dosage</th><th className="border px-3 py-3">Frequency</th>
                    <th className="border px-3 py-3">Duration</th><th className="border px-3 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {treatmentRows.map((row) => (
                    <tr key={row.key} className="bg-background text-sm font-medium text-slate-800">
                      <td className="border px-3 py-3">{row.date || "-"}</td>
                      <td className="border px-3 py-3">{row.medication || "-"}</td>
                      <td className="border px-3 py-3">{row.dosage || "-"}</td>
                      <td className="border px-3 py-3">{row.frequency || "-"}</td>
                      <td className="border px-3 py-3">{row.duration || "-"}</td>
                      <td className="border px-3 py-3 text-left">{row.notes || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {treatmentData.length > 0 && (
        <Card className="border-border/80 bg-background/92 shadow-sm" dir="rtl">
          <CardHeader className="border-b border-border">
            <CardTitle>العلاجات المختارة من الملف الطبي</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {treatmentData.map((treatmentId) => {
                const medication = medications.find((m: any) => m.id === treatmentId);
                return (
                  <Badge key={treatmentId} variant="default" className="rounded-full">
                    {medication?.name ?? `العلاج #${treatmentId}`}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
