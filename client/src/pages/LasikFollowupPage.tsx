import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer } from "lucide-react";
import PatientPicker from "@/components/PatientPicker";
import { trpc } from "@/lib/trpc";
import { coerceSheetDesignerConfig, DEFAULT_SHEET_DESIGNER_CONFIG, loadSheetDesignerConfig, saveSheetDesignerConfig } from "@/lib/sheetDesigner";
import { printOrExportPdf } from "@/lib/nativePdf";

export default function LasikFollowupPage() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/sheets/:type/:id/followup");
  const initialPatientId = params?.id ? Number(params.id) : undefined;

  const [operationDateLeft, setOperationDateLeft] = useState("");
  const [operationDateRight, setOperationDateRight] = useState("");
  const [operationType, setOperationType] = useState("ليزك");
  const [operationEyes, setOperationEyes] = useState({ right: true, left: false });
  const [designerConfig, setDesignerConfig] = useState(DEFAULT_SHEET_DESIGNER_CONFIG);
  const [patientName, setPatientName] = useState("");
  const [patientDOB, setPatientDOB] = useState("");
  const [signatures, setSignatures] = useState({ doctor: "" });
  const [followups, setFollowups] = useState([
    { id: 1, date: "", type: "المتابعة الأولى" },
    { id: 2, date: "", type: "المتابعة الثانية" },
    { id: 3, date: "", type: "المتابعة الثالثة" },
    { id: 4, date: "", type: "المتابعة الرابعة" },
  ]);

  const patientQuery = trpc.patient.getPatient.useQuery(
    initialPatientId ?? 0,
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false }
  );
  const examinationStateQuery = trpc.medical.getPatientPageState.useQuery(
    { patientId: initialPatientId ?? 0, page: "examination" },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false }
  );
  const followupVisitsQuery = trpc.medical.getFollowupVisitsByPatient.useQuery(
    initialPatientId ?? 0,
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false }
  );
  const designerSettingsQuery = trpc.medical.getSystemSetting.useQuery(
    { key: "sheet_designer_config" },
    { enabled: isAuthenticated, refetchOnWindowFocus: false }
  );

  useEffect(() => {
    if (!isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    setDesignerConfig(loadSheetDesignerConfig());
  }, []);

  useEffect(() => {
    if (!designerSettingsQuery.data?.value) return;
    const merged = coerceSheetDesignerConfig(designerSettingsQuery.data.value);
    setDesignerConfig(merged);
    saveSheetDesignerConfig(merged);
  }, [designerSettingsQuery.data]);

  useEffect(() => {
    const names = designerConfig.followupLasik?.followupNames ?? [];
    setFollowups((prev) => prev.map((item, i) => ({ ...item, type: names[i] ?? item.type })));
  }, [designerConfig.followupLasik?.followupNames]);

  useEffect(() => {
    if (!followupVisitsQuery.data) return;
    const visits = followupVisitsQuery.data as any[];
    if (visits.length === 0) {
      // Keep template data if no followups found
      return;
    }
    // Transform visits to followup format
    const transformedFollowups = visits.map((visit, index) => {
      const followupName = designerConfig.followupLasik?.followupNames?.[index] ?? `المتابعة #${index + 1}`;
      const visitDate = typeof visit.visitDate === 'string'
        ? visit.visitDate.split('T')[0]
        : visit.visitDate instanceof Date
          ? visit.visitDate.toISOString().split('T')[0]
          : new Date(visit.visitDate).toISOString().split('T')[0];
      return {
        id: visit.id,
        date: visitDate,
        type: followupName,
      };
    });
    setFollowups(transformedFollowups);
  }, [followupVisitsQuery.data, designerConfig.followupLasik?.followupNames]);

  // Dynamic loading: add 4 new followups when last one is filled
  useEffect(() => {
    if (followups.length === 0) return;

    const lastFollowup = followups[followups.length - 1];
    const isLastFollowupOfGroup = followups.length % 4 === 0;

    // Check if last followup in the current group has a date
    if (isLastFollowupOfGroup && lastFollowup.date && !lastFollowup.id?.toString().includes("temp-")) {
      // Check if next group is already loaded
      const nextGroupStart = followups.length;
      const hasNextGroup = followups.length > 4 && followups.some((f, i) => i >= nextGroupStart);

      if (!hasNextGroup) {
        // Add 4 new followups dynamically
        const nextId = Math.max(...followups.map(f => (typeof f.id === "number" ? f.id : 0))) + 1;
        const newFollowups = [];
        for (let i = 0; i < 4; i++) {
          const index = followups.length + i;
          const followupName = designerConfig.followupLasik?.followupNames?.[index % 4] ?? `المتابعة #${(index % 4) + 1}`;
          newFollowups.push({
            id: nextId + i,
            date: "",
            type: followupName,
          });
        }
        setFollowups([...followups, ...newFollowups]);
      }
    }
  }, [followups, designerConfig.followupLasik?.followupNames]);

  useEffect(() => {
    const p = patientQuery.data as any;
    if (p?.fullName) setPatientName(String(p.fullName));
    if (p?.dateOfBirth) {
      const dob = new Date(p.dateOfBirth);
      const month = String(dob.getMonth() + 1).padStart(2, '0');
      const day = String(dob.getDate()).padStart(2, '0');
      const year = dob.getFullYear();
      setPatientDOB(`${month}/${day}/${year}`);
    }
  }, [patientQuery.data]);

  useEffect(() => {
    const doctorFromState = String((examinationStateQuery.data as any)?.data?.doctorName ?? "").trim();
    const fullName = String(user?.name ?? "").trim();
    setSignatures({ doctor: doctorFromState || fullName || "" });
  }, [examinationStateQuery.data, user?.name]);

  const saveFollowupSheetMutation = trpc.medical.saveFollowupSheet.useMutation();

  const handleSaveFollowup = async () => {
    if (!initialPatientId) return;

    // Collect filled followups in groups of 4
    const filledFollowups = followups.filter(f => f.date);
    if (filledFollowups.length === 0) {
      alert("لا توجد بيانات لحفظها");
      return;
    }

    // Convert to followup items format (only filled items)
    const followupItems = filledFollowups.map((f, index) => ({
      tableIndex: index % 4,
      followupDate: f.date,
      followupName: f.type,
      // Add other empty fields for now
      vaOD: "",
      vaOS: "",
      treatment: "",
      notes: "",
    }));

    try {
      await saveFollowupSheetMutation.mutateAsync({
        patientId: initialPatientId,
        sheetType: "lasik",
        followupItems,
      });
      alert("تم حفظ البيانات بنجاح");
    } catch (error) {
      alert("فشل حفظ البيانات");
      console.error(error);
    }
  };

  if (!isAuthenticated) return null;

  const followupLabels = designerConfig.followupLasik ?? DEFAULT_SHEET_DESIGNER_CONFIG.followupLasik;

  const onPickPatient = (patient: { id: number }) => {
    if (patient?.id) setLocation(`/sheets/lasik/${patient.id}/followup`);
  };

  return (
    <div className="min-h-screen bg-background sheet-layout" dir="rtl">
      <style>{`
        @media print {
          .followup-print-root {
            transform: translateX(${followupLabels.offsetXmm}mm) scale(${followupLabels.scale});
            transform-origin: top center;
            margin-top: ${followupLabels.offsetYmm}mm;
          }
        }
      `}</style>

      <header className="sticky top-0 z-[120] border-b border-border bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60 print:hidden pointer-events-auto">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="min-w-0 pointer-events-none">
            <h1 className="text-xl font-bold text-foreground">متابعات الليزك</h1>
            <p className="truncate text-sm text-muted-foreground">{patientName}</p>
          </div>
          <div className="relative z-[130] flex shrink-0 flex-wrap items-center gap-1 pointer-events-auto">
            <div className="w-72 max-w-[45vw]">
              <PatientPicker initialPatientId={initialPatientId} onSelect={onPickPatient} />
            </div>
            <Button type="button" variant="default" size="sm" onClick={handleSaveFollowup} disabled={saveFollowupSheetMutation.isPending} className="bg-green-600 hover:bg-green-700 text-white">{saveFollowupSheetMutation.isPending ? "جاري الحفظ..." : "حفظ"}</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setLocation(`/sheets/lasik/${initialPatientId ?? ""}`)}>الاستمارة</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void printOrExportPdf(`lasik-followup-${initialPatientId ?? "sheet"}.pdf`)}><Printer className="h-4 w-4 mr-2"/>طباعة</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="mb-3 print:hidden">
          <PatientPicker initialPatientId={initialPatientId} onSelect={onPickPatient} readOnly />
        </div>

        <div className="followup-print-root rounded-[28px] border border-slate-200/80 bg-white p-1 text-slate-900 shadow-sm print:rounded-none print:border-0 print:p-0" dir="ltr" style={{ fontFamily: '"Times New Roman", Tahoma, Arial, sans-serif' }}>
          <div className="mb-2 print:mb-1 flex items-center justify-between text-[15px] px-1 print:px-0 print:text-[13px]">
            <div className="whitespace-nowrap">{followupLabels.rtLabel}: {operationEyes.right ? "" : "..."} &nbsp;&nbsp; {followupLabels.ltLabel}: {operationEyes.left ? "" : "..."} &nbsp; //</div>
            <div className="whitespace-nowrap">{followupLabels.operationTypeLabel}: <Input value={operationType} onChange={(e) => setOperationType(e.target.value)} className="inline-block w-40 h-7 text-xs mx-1" /></div>
            <div className="whitespace-nowrap">{followupLabels.operationDateLabel}
              <Input type="date" value={operationDateRight} onChange={(e) => setOperationDateRight(e.target.value)} className="inline-block w-32 h-7 text-xs mx-1" />
              <Input type="date" value={operationDateLeft} onChange={(e) => setOperationDateLeft(e.target.value)} className="inline-block w-32 h-7 text-xs" />
            </div>
          </div>

          {followups.map((f) => (
            <table key={f.id} className="w-full border border-black/70 border-collapse text-[15px] table-fixed print:text-[12px]" style={{ marginBottom: `${followupLabels.tableGapMm}mm` }}>
              <colgroup>
                <col style={{ width: "14%" }} /><col style={{ width: "14%" }} /><col style={{ width: "12%" }} /><col style={{ width: "12%" }} /><col style={{ width: "12%" }} /><col style={{ width: "12%" }} /><col style={{ width: "12%" }} /><col style={{ width: "12%" }} />
              </colgroup>
              <tbody>
                <tr>
                  <td colSpan={2} className="border border-black/50 px-1 py-0.5 print:py-0 text-center">{followupLabels.nextFollowupLabel} <span className="mx-2 print:mx-1">/  /</span></td>
                  <td colSpan={3} className="border border-black/50 px-1 py-0.5 print:py-0 text-center font-semibold"><Input value={f.type} onChange={(e) => setFollowups((prev) => prev.map((x) => x.id === f.id ? { ...x, type: e.target.value } : x))} className="h-7 text-xs" /></td>
                  <td colSpan={3} className="border border-black/50 border-r-0 px-1 py-0.5 print:py-0 text-center">{followupLabels.followupDateLabel} <Input type="date" value={f.date} onChange={(e) => setFollowups((prev) => prev.map((x) => x.id === f.id ? { ...x, date: e.target.value } : x))} className="inline-block w-32 h-7 text-xs mx-1" /></td>
                </tr>
                <tr>
                  <td colSpan={8} className="border border-black/50 py-0.5 text-center font-semibold">Dominant eye _____________</td>
                </tr>
                <tr>
                  <td colSpan={2} className="border border-black/50 py-0.5"></td>
                  <td colSpan={3} className="border border-black/50 py-0.5 text-center font-semibold">OD</td>
                  <td colSpan={3} className="border border-black/50 border-r-0 py-0.5 text-center font-semibold">OS</td>
                </tr>
                <tr>
                  <td colSpan={2} className="border border-black/50 py-1 print:py-0.5 text-center font-semibold">{followupLabels.vaLabel}</td>
                  <td colSpan={3} className="border border-black/50 border-r-0 py-1 print:py-0.5"></td>
                  <td colSpan={3} className="border border-black/50 py-1 print:py-0.5"></td>
                </tr>
                <tr>
                  <td colSpan={2} className="border border-black/50 py-1 print:py-0.5 text-center font-semibold">{followupLabels.refractionLabel}</td>
                  <td className="border border-black/50 py-1 print:py-0.5 text-center font-semibold">S</td>
                  <td className="border border-black/50 py-1 print:py-0.5 text-center font-semibold">C</td>
                  <td className="border border-black/50 border-r-0 py-1 print:py-0.5 text-center font-semibold">A</td>
                  <td className="border border-black/50 py-1 print:py-0.5 text-center font-semibold">S</td>
                  <td className="border border-black/50 py-1 print:py-0.5 text-center font-semibold">C</td>
                  <td className="border border-black/50 py-1 print:py-0.5 text-center font-semibold">A</td>
                </tr>
                <tr>
                  <td colSpan={2} className="border border-black/50 py-1 print:py-0.5"></td>
                  <td className="border border-black/50 border-r-0 h-8 print:h-4">&nbsp;</td><td className="border border-black/50 h-8 print:h-4">&nbsp;</td><td className="border border-black/50 h-8 print:h-4">&nbsp;</td><td className="border border-black/50 h-8 print:h-4">&nbsp;</td><td className="border border-black/50 h-8 print:h-4">&nbsp;</td><td className="border border-black/50 h-8 print:h-4">&nbsp;</td>
                </tr>
                <tr>
                  <td rowSpan={2} className="border border-black/50 py-1 print:py-0.5 text-center font-semibold">{followupLabels.flapLabel}</td>
                  <td className="border border-black/50 py-1 print:py-0.5 text-center font-semibold">{followupLabels.edgesLabel}</td>
                  <td colSpan={6} className="border border-black/50 border-r-0 py-1 print:py-0.5"></td>
                </tr>
                <tr>
                  <td className="border border-black/50 py-1 print:py-0.5 text-center font-semibold">{followupLabels.bedLabel}</td>
                  <td colSpan={6} className="border border-black/50 border-r-0 py-1 print:py-0.5"></td>
                </tr>
                <tr>
                  <td colSpan={2} className="border border-black/50 py-1 print:py-0.5 text-center font-semibold">{followupLabels.iopLabel}</td>
                  <td colSpan={6} className="border border-black/50 border-r-0 py-1 print:py-0.5"></td>
                </tr>
                <tr>
                  <td colSpan={2} className="border border-black/50 py-1 print:py-0.5 text-center font-semibold">{followupLabels.treatmentLabel}</td>
                  <td colSpan={6} className="border border-black/50 border-r-0 py-1 print:py-0.5"></td>
                </tr>
                <tr>
                  <td colSpan={2} className="border border-black/50 px-1 py-0.5 print:py-0 text-right font-semibold">{followupLabels.receptionLabel}</td>
                  <td colSpan={3} className="border border-black/50 px-1 py-0.5 print:py-0 text-right font-semibold">{followupLabels.nurseLabel}</td>
                  <td colSpan={3} className="border border-black/50 border-r-0 px-1 py-0.5 print:py-0 text-right font-semibold">{followupLabels.doctorLabel}{signatures.doctor ? `: ${signatures.doctor}` : ""}</td>
                </tr>
              </tbody>
            </table>
          ))}
        </div>
      </main>
    </div>
  );
}
