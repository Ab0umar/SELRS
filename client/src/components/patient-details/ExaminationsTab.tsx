import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";
import { classifyTest } from "@/hooks/patient-details/usePatientDetails";

interface ExaminationsTabProps {
  autorefractionRows: Array<{ eye: string; ucva: string; bcva: string; s: string; c: string; axis: string; iop: string }>;
  afterRows: Array<{ eye: string; s: string; c: string; axis: string }>;
  glassesRows: Array<{ eye: string; s: string; c: string; axis: string; pd: string; bcva: string }>;
  fundusRows: Array<{ eye: string; findings: string }>;
  requestedImagingAndLabs: any[];
  parsedExamSources: any[];
  openExamSections: { autoref: boolean; glasses: boolean; fundus: boolean; requestTests: boolean };
  toggleExamSection: (key: "autoref" | "glasses" | "fundus" | "requestTests") => void;
}

export function ExaminationsTab({ autorefractionRows, afterRows, glassesRows, fundusRows, requestedImagingAndLabs, parsedExamSources, openExamSections, toggleExamSection }: ExaminationsTabProps) {
  return (
    <Card className="border-border/80 bg-background/92 shadow-sm" dir="ltr">
      <CardHeader className="border-b border-border pb-3">
        <CardTitle className="text-base">القياسات</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {/* Autoref + IOP */}
        <div className="rounded-xl border border-border bg-background">
          <Button type="button" variant="ghost" className="h-auto w-full justify-between rounded-xl px-4 py-3 text-left font-semibold text-slate-800 hover:bg-muted" onClick={() => toggleExamSection("autoref")}>
            <span>Autoref + IOP</span>
            {openExamSections.autoref ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          {openExamSections.autoref && (
            <div className="space-y-3 border-t border-border p-3">
              {autorefractionRows.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] border-collapse text-center">
                    <thead className="bg-muted text-xs uppercase tracking-[0.18em] text-slate-500">
                      <tr>
                        <th className="border px-3 py-3">Eye</th><th className="border px-3 py-3">UCVA</th>
                        <th className="border px-3 py-3">S</th><th className="border px-3 py-3">C</th>
                        <th className="border px-3 py-3">Axis</th><th className="border px-3 py-3">IOP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {autorefractionRows.map((row) => (
                        <tr key={row.eye} className="bg-background text-sm font-medium text-slate-800">
                          <td className="border px-3 py-3 font-bold">{row.eye}</td>
                          <td className="border px-3 py-3">{row.ucva || "-"}</td>
                          <td className="border px-3 py-3">{row.s || "-"}</td>
                          <td className="border px-3 py-3">{row.c || "-"}</td>
                          <td className="border px-3 py-3">{row.axis || "-"}</td>
                          <td className="border px-3 py-3">{row.iop || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="text-sm text-muted-foreground">لا توجد بيانات Autoref محفوظة</p>}

              {afterRows.length ? (
                <div className="overflow-x-auto">
                  <div className="mb-2 text-xs font-semibold text-muted-foreground">After</div>
                  <table className="w-full min-w-[440px] border-collapse text-center">
                    <thead className="bg-muted text-xs uppercase tracking-[0.18em] text-slate-500">
                      <tr><th className="border px-3 py-3">Eye</th><th className="border px-3 py-3">S</th><th className="border px-3 py-3">C</th><th className="border px-3 py-3">Axis</th></tr>
                    </thead>
                    <tbody>
                      {afterRows.map((row) => (
                        <tr key={`after-${row.eye}`} className="bg-background text-sm font-medium text-slate-800">
                          <td className="border px-3 py-3 font-bold">{row.eye}</td>
                          <td className="border px-3 py-3">{row.s || "-"}</td>
                          <td className="border px-3 py-3">{row.c || "-"}</td>
                          <td className="border px-3 py-3">{row.axis || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Glasses */}
        <div className="rounded-xl border border-border bg-background">
          <Button type="button" variant="ghost" className="h-auto w-full justify-between rounded-xl px-4 py-3 text-left font-semibold text-slate-800 hover:bg-muted" onClick={() => toggleExamSection("glasses")}>
            <span>👓 مقاس النظاره</span>
            {openExamSections.glasses ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          {openExamSections.glasses && (
            <div className="overflow-x-auto border-t border-border">
              {glassesRows.length ? (
                <table className="w-full min-w-[520px] border-collapse text-center">
                  <thead className="bg-muted text-xs uppercase tracking-[0.18em] text-slate-500">
                    <tr><th className="border px-3 py-3">Eye</th><th className="border px-3 py-3">S</th><th className="border px-3 py-3">C</th><th className="border px-3 py-3">Axis</th><th className="border px-3 py-3">PD</th><th className="border px-3 py-3">BCVA</th></tr>
                  </thead>
                  <tbody>
                    {glassesRows.map((row) => (
                      <tr key={`glass-${row.eye}`} className="bg-background text-sm font-medium text-slate-800">
                        <td className="border px-3 py-3 font-bold">{row.eye}</td>
                        <td className="border px-3 py-3">{row.s || "-"}</td>
                        <td className="border px-3 py-3">{row.c || "-"}</td>
                        <td className="border px-3 py-3">{row.axis || "-"}</td>
                        <td className="border px-3 py-3">{row.pd || "-"}</td>
                        <td className="border px-3 py-3">{row.bcva || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="p-4 text-sm text-muted-foreground">لا توجد بيانات مقاس النظاره محفوظة</p>}
            </div>
          )}
        </div>

        {/* Fundus */}
        <div className="rounded-xl border border-border bg-background">
          <Button type="button" variant="ghost" className="h-auto w-full justify-between rounded-xl px-4 py-3 text-left font-semibold text-slate-800 hover:bg-muted" onClick={() => toggleExamSection("fundus")}>
            <span>Fundus</span>
            {openExamSections.fundus ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          {openExamSections.fundus && (
            <div className="overflow-x-auto border-t border-border">
              {fundusRows.length ? (
                <table className="w-full min-w-[360px] border-collapse text-center">
                  <thead className="bg-muted text-xs uppercase tracking-[0.18em] text-slate-500">
                    <tr><th className="border px-3 py-3">Eye</th><th className="border px-3 py-3">Findings</th></tr>
                  </thead>
                  <tbody>
                    {fundusRows.map((row) => (
                      <tr key={`fundus-${row.eye}`} className="bg-background text-sm font-medium text-slate-800">
                        <td className="border px-3 py-3 font-bold">{row.eye}</td>
                        <td className="border px-3 py-3 text-left">{row.findings || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="p-4 text-sm text-muted-foreground">لا توجد بيانات Fundus محفوظة</p>}
            </div>
          )}
        </div>

        {/* Radiology + Tests */}
        <div className="rounded-xl border border-border bg-background">
          <Button type="button" variant="ghost" className="h-auto w-full justify-between rounded-xl px-4 py-3 text-left font-semibold text-slate-800 hover:bg-muted" onClick={() => toggleExamSection("requestTests")}>
            <span>الأشعات + التحاليل (من طلب الفحوصات)</span>
            {openExamSections.requestTests ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          {openExamSections.requestTests && (
            <div className="overflow-x-auto border-t border-border space-y-4 p-4">
              {parsedExamSources.some((s) => s?.radiologyLabsNotes) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">📋 ملخص الأشعات والتحاليل من الزيارات:</h4>
                  {parsedExamSources.map((source, idx) => {
                    if (!source?.radiologyLabsNotes) return null;
                    try {
                      const data = JSON.parse(source.radiologyLabsNotes);
                      return (
                        <div key={idx} className="text-sm text-blue-800 mb-2">
                          {data.tests?.length > 0 && <p>🔬 <strong>الاختبارات:</strong> {data.tests.join(", ")}</p>}
                          {data.diagnosis?.length > 0 && <p>⚕️ <strong>التشخيص:</strong> {data.diagnosis.join(", ")}</p>}
                          {data.treatment?.length > 0 && <p>💊 <strong>العلاج:</strong> {data.treatment.join(", ")}</p>}
                        </div>
                      );
                    } catch { return null; }
                  })}
                </div>
              )}
              {requestedImagingAndLabs.length ? (
                <table className="w-full min-w-[640px] border-collapse text-center">
                  <thead className="bg-muted text-xs uppercase tracking-[0.18em] text-slate-500">
                    <tr><th className="border px-3 py-3">Type</th><th className="border px-3 py-3">Test Name</th><th className="border px-3 py-3">Category</th><th className="border px-3 py-3">Notes</th></tr>
                  </thead>
                  <tbody>
                    {requestedImagingAndLabs.map((test: any, index: number) => (
                      <tr key={`req-${String(test?.id ?? "")}-${index}`} className="bg-background text-sm font-medium text-slate-800">
                        <td className="border px-3 py-3">{classifyTest(test) === "imaging" ? "Imaging" : "Lab"}</td>
                        <td className="border px-3 py-3">{String(test?.name ?? "—")}</td>
                        <td className="border px-3 py-3">{String(test?.category ?? "—")}</td>
                        <td className="border px-3 py-3 text-left">{String(test?.notes ?? "").trim() || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="p-4 text-sm text-muted-foreground">لا توجد أشعات أو تحاليل محفوظة في طلب الفحوصات</p>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
