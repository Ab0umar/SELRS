import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer } from "lucide-react";
import PatientPicker from "@/components/PatientPicker";
import { trpc } from "@/lib/trpc";
import {
  coerceSheetDesignerConfig,
  DEFAULT_SHEET_DESIGNER_CONFIG,
  loadSheetDesignerConfig,
  saveSheetDesignerConfig,
} from "@/lib/sheetDesigner";
import { printOrExportPdf } from "@/lib/nativePdf";
import { DateInput } from "@/components/ui/date-input";

export default function LasikFollowupPage() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/sheets/:type/:id/followup");
  const initialPatientId = params?.id ? Number(params.id) : undefined;

  const [operationDateLeft, setOperationDateLeft] = useState("");
  const [operationDateRight, setOperationDateRight] = useState("");
  const [operationType, setOperationType] = useState("ليزك");
  const [operationEyes, setOperationEyes] = useState({
    right: true,
    left: false,
  });
  const [designerConfig, setDesignerConfig] = useState(
    DEFAULT_SHEET_DESIGNER_CONFIG,
  );
  const [patientName, setPatientName] = useState("");
  const [patientDOB, setPatientDOB] = useState("");
  const [signatures, setSignatures] = useState({ doctor: "" });
  const [followups, setFollowups] = useState([
    { id: 1, date: "", type: "المتابعة الأولى" },
    { id: 2, date: "", type: "المتابعة الثانية" },
    { id: 3, date: "", type: "المتابعة الثالثة" },
    { id: 4, date: "", type: "المتابعة الرابعة" },
  ]);

  const patientQuery = trpc.patient.getPatient.useQuery(initialPatientId ?? 0, {
    enabled: Boolean(initialPatientId),
    refetchOnWindowFocus: false,
  });
  const examinationStateQuery = trpc.medical.getPatientPageState.useQuery(
    { patientId: initialPatientId ?? 0, page: "examination" },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const followupVisitsQuery = trpc.medical.getFollowupVisitsByPatient.useQuery(
    initialPatientId ?? 0,
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const designerSettingsQuery = trpc.medical.getSystemSetting.useQuery(
    { key: "sheet_designer_config" },
    { enabled: isAuthenticated, refetchOnWindowFocus: false },
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
    setFollowups((prev) =>
      prev.map((item, i) => ({ ...item, type: names[i] ?? item.type })),
    );
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
      const followupName =
        designerConfig.followupLasik?.followupNames?.[index] ??
        `المتابعة #${index + 1}`;
      const visitDate =
        typeof visit.visitDate === "string"
          ? visit.visitDate.split("T")[0]
          : visit.visitDate instanceof Date
            ? visit.visitDate.toISOString().split("T")[0]
            : new Date(visit.visitDate).toISOString().split("T")[0];
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
    if (
      isLastFollowupOfGroup &&
      lastFollowup.date &&
      !lastFollowup.id?.toString().includes("temp-")
    ) {
      // Check if next group is already loaded
      const nextGroupStart = followups.length;
      const hasNextGroup =
        followups.length > 4 && followups.some((f, i) => i >= nextGroupStart);

      if (!hasNextGroup) {
        // Add 4 new followups dynamically
        const nextId =
          Math.max(
            ...followups.map((f) => (typeof f.id === "number" ? f.id : 0)),
          ) + 1;
        const newFollowups = [];
        for (let i = 0; i < 4; i++) {
          const index = followups.length + i;
          const followupName =
            designerConfig.followupLasik?.followupNames?.[index % 4] ??
            `المتابعة #${(index % 4) + 1}`;
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
      const month = String(dob.getMonth() + 1).padStart(2, "0");
      const day = String(dob.getDate()).padStart(2, "0");
      const year = dob.getFullYear();
      setPatientDOB(`${month}/${day}/${year}`);
    }
  }, [patientQuery.data]);

  useEffect(() => {
    const doctorFromState = String(
      (examinationStateQuery.data as any)?.data?.doctorName ?? "",
    ).trim();
    const fullName = String(user?.name ?? "").trim();
    setSignatures({ doctor: doctorFromState || fullName || "" });
  }, [examinationStateQuery.data, user?.name]);

  const saveFollowupSheetMutation =
    trpc.medical.saveFollowupSheet.useMutation();

  const handleSaveFollowup = async () => {
    if (!initialPatientId) return;

    // Collect filled followups in groups of 4
    const filledFollowups = followups.filter((f) => f.date);
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

  const followupLabels =
    designerConfig.followupLasik ?? DEFAULT_SHEET_DESIGNER_CONFIG.followupLasik;

  const onPickPatient = (patient: { id: number }) => {
    if (patient?.id) setLocation(`/sheets/lasik/${patient.id}/followup`);
  };

  return (
    <div className="min-h-screen bg-[#dde1e7] text-[#191c1e]" dir="rtl" style={{ fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white !important; }
          .followup-print-root {
            zoom: ${followupLabels.scale};
            width: calc(190mm / ${followupLabels.scale});
            margin-top: ${followupLabels.offsetYmm}mm;
            margin-left: ${followupLabels.offsetXmm}mm;
          }
        }
      `}</style>

      {/* Top nav */}
      <header className="print:hidden sticky top-0 z-50 flex justify-between items-center px-6 py-2 bg-[#f8f9fb] border-b border-[#c3c6d6]">
        <div className="flex items-center gap-6">
          <span className="text-xl font-bold text-[#003d9b]">OphthalmoCare Pro</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-60">
            <PatientPicker initialPatientId={initialPatientId} onSelect={onPickPatient} />
          </div>
          <Button
            type="button"
            className="bg-[#003d9b] text-white px-5 py-2 rounded-lg font-bold text-sm hover:opacity-90 active:scale-95 disabled:opacity-60"
            onClick={handleSaveFollowup}
            disabled={saveFollowupSheetMutation.isPending}
          >
            {saveFollowupSheetMutation.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-[#003d9b] text-[#003d9b] px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#003d9b]/5"
            onClick={() => void printOrExportPdf(`lasik-followup-${initialPatientId ?? "sheet"}.pdf`)}
          >
            <Printer className="h-4 w-4 mr-2" />
            طباعة PDF
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Right sidebar */}
        <aside className="print:hidden fixed right-0 top-[52px] h-[calc(100vh-52px)] w-60 flex flex-col p-4 z-40 bg-[#f3f4f6] border-l border-[#c3c6d6]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-lg bg-[#0052cc] flex items-center justify-center text-white font-bold text-lg">
              {patientName ? patientName.slice(0, 2) : "P"}
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#191c1e] truncate max-w-[130px]">{patientName || "اختر مريضاً"}</h3>
              <p className="text-xs text-[#434654]">ID: {initialPatientId ?? "—"}</p>
            </div>
          </div>
          <nav className="flex flex-col gap-1">
            <button
              type="button"
              className="flex items-center gap-3 text-[#434654] hover:bg-[#edeef0] p-3 rounded-lg transition-all text-sm text-right"
              onClick={() => setLocation(`/sheets/lasik/${initialPatientId ?? ""}`)}
            >
              ← الاستمارة
            </button>
            <div className="flex items-center gap-3 bg-[#0052cc] text-white font-bold p-3 rounded-lg text-sm">
              متابعات الليزك
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <main className="print:mr-0 mr-60 py-8 px-6 w-full">
          <div className="a4-page-card followup-print-root">
          {/* Patient banner */}
          <section className="bg-white border border-[#c3c6d6] rounded-xl p-5 mb-6 shadow-sm">
            <div className="flex flex-wrap gap-8 items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#434654] mb-1">اسم المريض</p>
                <h1 className="text-2xl font-semibold text-[#003d9b]">{patientName || "—"}</h1>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#434654] mb-1">{followupLabels.operationTypeLabel ?? "نوع العملية"}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={operationType}
                    onChange={(e) => setOperationType(e.target.value)}
                    className="h-8 text-sm w-36 border-[#c3c6d6] font-bold text-[#003d9b]"
                    placeholder="ليزك"
                  />
                  <button
                    type="button"
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${operationEyes.right ? "bg-[#003d9b] text-white" : "bg-[#e1e2e4] text-[#434654]"}`}
                    onClick={() => setOperationEyes((prev) => ({ ...prev, right: !prev.right }))}
                  >OD</button>
                  <button
                    type="button"
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${operationEyes.left ? "bg-[#003d9b] text-white" : "bg-[#e1e2e4] text-[#434654]"}`}
                    onClick={() => setOperationEyes((prev) => ({ ...prev, left: !prev.left }))}
                  >OS</button>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#434654] mb-1">{followupLabels.operationDateLabel ?? "تاريخ العملية"}</p>
                <div className="flex gap-2">
                  <DateInput value={operationDateRight} onChange={(e) => setOperationDateRight(e.target.value)} className="h-8 w-32 text-sm border-[#c3c6d6]" />
                  <DateInput value={operationDateLeft} onChange={(e) => setOperationDateLeft(e.target.value)} className="h-8 w-32 text-sm border-[#c3c6d6]" />
                </div>
              </div>
            </div>
          </section>

          {/* Followup cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {followups.map((f, idx) => (
              <article key={f.id} className="bg-white border border-[#c3c6d6] rounded-xl overflow-hidden shadow-sm">
                {/* Card header */}
                <div className={`px-4 py-3 border-b border-[#c3c6d6] flex justify-between items-center ${idx === 0 ? "bg-[#003d9b]/5" : "bg-[#edeef0]/40"}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white ${idx === 0 ? "bg-[#003d9b]" : "bg-[#737685]"}`}>{idx + 1}</span>
                    <Input
                      value={f.type}
                      onChange={(e) => setFollowups((prev) => prev.map((x) => x.id === f.id ? { ...x, type: e.target.value } : x))}
                      className="h-7 text-sm font-semibold border-0 bg-transparent focus:bg-white focus:border-[#003d9b] w-44"
                    />
                  </div>
                  <DateInput
                    value={f.date}
                    onChange={(e) => setFollowups((prev) => prev.map((x) => x.id === f.id ? { ...x, date: e.target.value } : x))}
                    className="h-7 w-36 text-sm border-[#c3c6d6]"
                  />
                </div>

                <div className="p-4 space-y-4">
                  {/* Clinical data table */}
                  <table className="w-full border-collapse border border-[#c3c6d6] text-xs rounded overflow-hidden">
                    <thead className="bg-[#e7e8ea] text-[#434654] font-bold uppercase tracking-wider">
                      <tr>
                        <th className="p-2 border border-[#c3c6d6] text-center">Eye</th>
                        <th className="p-2 border border-[#c3c6d6]">{followupLabels.vaLabel ?? "VA (U)"}</th>
                        <th className="p-2 border border-[#c3c6d6]">Sph</th>
                        <th className="p-2 border border-[#c3c6d6]">Cyl</th>
                        <th className="p-2 border border-[#c3c6d6]">Axis</th>
                        <th className="p-2 border border-[#c3c6d6]">VA (C)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ backgroundColor: "rgba(0,61,155,0.04)" }}>
                        <td className="p-2 border border-[#c3c6d6] font-bold text-[#003d9b] text-center">OD</td>
                        <td className="border border-[#c3c6d6] p-0"><input className="w-full h-8 text-center bg-transparent border-0 focus:ring-1 focus:ring-[#003d9b] outline-none text-xs" /></td>
                        <td className="border border-[#c3c6d6] p-0"><input className="w-full h-8 text-center bg-transparent border-0 focus:ring-1 focus:ring-[#003d9b] outline-none text-xs" /></td>
                        <td className="border border-[#c3c6d6] p-0"><input className="w-full h-8 text-center bg-transparent border-0 focus:ring-1 focus:ring-[#003d9b] outline-none text-xs" /></td>
                        <td className="border border-[#c3c6d6] p-0"><input className="w-full h-8 text-center bg-transparent border-0 focus:ring-1 focus:ring-[#003d9b] outline-none text-xs" /></td>
                        <td className="border border-[#c3c6d6] p-0"><input className="w-full h-8 text-center bg-transparent border-0 focus:ring-1 focus:ring-[#003d9b] outline-none text-xs" /></td>
                      </tr>
                      <tr style={{ backgroundColor: "#ffffff" }}>
                        <td className="p-2 border border-[#c3c6d6] font-bold text-[#526069] text-center">OS</td>
                        <td className="border border-[#c3c6d6] p-0"><input className="w-full h-8 text-center bg-transparent border-0 focus:ring-1 focus:ring-[#003d9b] outline-none text-xs" /></td>
                        <td className="border border-[#c3c6d6] p-0"><input className="w-full h-8 text-center bg-transparent border-0 focus:ring-1 focus:ring-[#003d9b] outline-none text-xs" /></td>
                        <td className="border border-[#c3c6d6] p-0"><input className="w-full h-8 text-center bg-transparent border-0 focus:ring-1 focus:ring-[#003d9b] outline-none text-xs" /></td>
                        <td className="border border-[#c3c6d6] p-0"><input className="w-full h-8 text-center bg-transparent border-0 focus:ring-1 focus:ring-[#003d9b] outline-none text-xs" /></td>
                        <td className="border border-[#c3c6d6] p-0"><input className="w-full h-8 text-center bg-transparent border-0 focus:ring-1 focus:ring-[#003d9b] outline-none text-xs" /></td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Flap + IOP */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="border border-[#c3c6d6] rounded-lg p-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#434654] mb-2">{followupLabels.flapLabel ?? "Flap"}</p>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-[#434654]">{followupLabels.edgesLabel ?? "Edges"}:</span>
                          <input className="border border-[#c3c6d6] rounded px-2 py-1 w-20 text-xs focus:ring-1 focus:ring-[#003d9b] outline-none" />
                        </div>
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-[#434654]">{followupLabels.bedLabel ?? "Bed"}:</span>
                          <input className="border border-[#c3c6d6] rounded px-2 py-1 w-20 text-xs focus:ring-1 focus:ring-[#003d9b] outline-none" />
                        </div>
                      </div>
                    </div>
                    <div className="border border-[#c3c6d6] rounded-lg p-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#434654] mb-2">{followupLabels.iopLabel ?? "IOP"}</p>
                      <div className="flex items-center gap-2">
                        <input className="border border-[#c3c6d6] rounded text-center h-8 w-16 text-xs outline-none focus:ring-1 focus:ring-[#003d9b]" placeholder="OD" />
                        <input className="border border-[#c3c6d6] rounded text-center h-8 w-16 text-xs outline-none focus:ring-1 focus:ring-[#003d9b]" placeholder="OS" />
                        <span className="text-xs text-[#434654]">mmHg</span>
                      </div>
                    </div>
                  </div>

                  {/* Treatment / Notes */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#434654] mb-1">{followupLabels.treatmentLabel ?? "ملاحظات وعلاج"}</p>
                    <textarea className="w-full h-14 border border-[#c3c6d6] rounded-lg p-2 text-xs focus:ring-1 focus:ring-[#003d9b] focus:outline-none resize-none" />
                  </div>

                  {/* Signatures */}
                  <div className="flex justify-between text-xs text-[#434654] pt-3 border-t border-dashed border-[#c3c6d6]">
                    <div className="flex flex-col items-center gap-1">
                      <span>{followupLabels.receptionLabel ?? "الاستقبال"}</span>
                      <div className="w-20 border-b border-[#737685] h-5" />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span>{followupLabels.nurseLabel ?? "التمريض"}</span>
                      <div className="w-20 border-b border-[#737685] h-5" />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[#003d9b] font-bold">{followupLabels.doctorLabel ?? "الطبيب"}</span>
                      <div className="w-20 border-b border-[#003d9b] h-5 flex items-end justify-center">
                        <span className="text-[10px] text-[#003d9b] italic">{signatures.doctor}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
          </div>
        </main>
      </div>
    </div>
  );
}
