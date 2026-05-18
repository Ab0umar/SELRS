import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { evaluateMedicalReference, findMedicalReference, medicalReferenceClass, type MedicalReference } from "@/lib/medical-reference";

interface PentacamTabProps {
  pentacamRows: Array<{ eye: string; k1: string; k2: string; thinnest: string; apex: string; residual: string; ttt: string; ablation: string }>;
}

export function PentacamTab({ pentacamRows }: PentacamTabProps) {
  const refsQuery = trpc.medical.getAllTests.useQuery(undefined, { refetchOnWindowFocus: false });
  const refs = (refsQuery.data ?? []) as Record<string, unknown>[];

  const k1Ref = findMedicalReference(refs, ["K1", "Pentacam K1", "بنتاكام K1"]);
  const k2Ref = findMedicalReference(refs, ["K2", "Pentacam K2", "بنتاكام K2"]);
  const thinnestRef = findMedicalReference(refs, ["Thinnest", "Thinnest Point", "CCT", "بنتاكام Thinnest"]);
  const apexRef = findMedicalReference(refs, ["Apex", "Pentacam Apex", "بنتاكام Apex"]);
  const residualRef = findMedicalReference(refs, ["Residual", "Residual Stroma", "RSB", "بنتاكام Residual"]);
  const tttRef = findMedicalReference(refs, ["TTT", "Pentacam TTT", "بنتاكام TTT"]);
  const ablationRef = findMedicalReference(refs, ["Ablation", "Pentacam Ablation", "بنتاكام Ablation"]);

  const RefCell = ({ value, reference }: { value: string; reference: MedicalReference | null }) => {
    const state = evaluateMedicalReference(value, reference);
    return (
      <td
        className={cn("border px-3 py-3 tabular-nums", medicalReferenceClass(state))}
        title={state === "low" || state === "high" ? `خارج الطبيعي: ${reference?.min} - ${reference?.max} ${reference?.unit}` : undefined}
      >
        {value || "-"}
      </td>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/80 bg-background/92 shadow-sm" dir="ltr">
        <CardHeader className="border-b border-border">
          <CardTitle>جدول البنتاكام</CardTitle>
        </CardHeader>
        <CardContent>
          {pentacamRows.length ? (
            <div className="overflow-x-auto rounded-[1.25rem] border border-border bg-background">
              <table className="w-full min-w-[720px] border-collapse text-center">
                <thead className="bg-muted text-xs uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="border px-3 py-3">Eye</th><th className="border px-3 py-3">K1</th>
                    <th className="border px-3 py-3">K2</th><th className="border px-3 py-3">Thinnest</th>
                    <th className="border px-3 py-3">Apex</th><th className="border px-3 py-3">Residual</th>
                    <th className="border px-3 py-3">TTT</th><th className="border px-3 py-3">Ablation</th>
                  </tr>
                </thead>
                <tbody>
                  {pentacamRows.map((row) => (
                    <tr key={`pent-${row.eye}`} className="bg-background text-sm font-medium text-slate-800">
                      <td className="border px-3 py-3 font-bold">{row.eye}</td>
                      <RefCell value={row.k1} reference={k1Ref} />
                      <RefCell value={row.k2} reference={k2Ref} />
                      <RefCell value={row.thinnest} reference={thinnestRef} />
                      <RefCell value={row.apex} reference={apexRef} />
                      <RefCell value={row.residual} reference={residualRef} />
                      <RefCell value={row.ttt} reference={tttRef} />
                      <RefCell value={row.ablation} reference={ablationRef} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="pt-2 text-sm text-muted-foreground">لا توجد بيانات Pentacam محفوظة</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-background/92 shadow-sm" dir="rtl">
        <CardHeader className="border-b border-border">
          <CardTitle>صور البنتاكام</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">لا توجد صور بنتاكام محفوظة للمريض حالياً</p>
        </CardContent>
      </Card>
    </div>
  );
}
