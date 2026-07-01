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

export default function ConsultantFollowupPage() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/sheets/consultant/:id/followup");
  const originalMode =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("original") === "1";
  const initialPatientId = params?.id ? Number(params.id) : undefined;

  const [operationDateLeft, setOperationDateLeft] = useState("");
  const [operationDateRight, setOperationDateRight] = useState("");
  const [operationType, setOperationType] = useState("");
  const [operationEyes, setOperationEyes] = useState({
    right: false,
    left: false,
  });
  const [designerConfig, setDesignerConfig] = useState(
    DEFAULT_SHEET_DESIGNER_CONFIG,
  );
  const [patientName, setPatientName] = useState("");
  const [patientDOB, setPatientDOB] = useState("");
  const [signatures, setSignatures] = useState({ doctor: "" });
  const [followups, setFollowups] = useState([
    { id: 1, date: "", type: "المتابعة الأولى", right: true, left: false },
    { id: 2, date: "", type: "المتابعة الثانية", right: false, left: true },
    { id: 3, date: "", type: "المتابعة الثالثة", right: false, left: false },
    { id: 4, date: "", type: "المتابعة الرابعة", right: true, left: true },
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
    const names = designerConfig.followupConsultant?.followupNames ?? [];
    setFollowups((prev) =>
      prev.map((item, i) => ({ ...item, type: names[i] ?? item.type })),
    );
  }, [designerConfig.followupConsultant?.followupNames]);

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
        designerConfig.followupConsultant?.followupNames?.[index] ??
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
        right: index % 2 === 0,
        left: index % 2 === 1,
      };
    });
    setFollowups(transformedFollowups);
  }, [
    followupVisitsQuery.data,
    designerConfig.followupConsultant?.followupNames,
  ]);

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
            designerConfig.followupConsultant?.followupNames?.[index % 4] ??
            `المتابعة #${(index % 4) + 1}`;
          newFollowups.push({
            id: nextId + i,
            date: "",
            type: followupName,
            right: index % 2 === 0,
            left: index % 2 === 1,
          });
        }
        setFollowups([...followups, ...newFollowups]);
      }
    }
  }, [followups, designerConfig.followupConsultant?.followupNames]);

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
      rightEye: f.right ?? false,
      leftEye: f.left ?? false,
      // Add other empty fields for now
      vaOD: "",
      vaOS: "",
      treatment: "",
      notes: "",
    }));

    try {
      await saveFollowupSheetMutation.mutateAsync({
        patientId: initialPatientId,
        sheetType: "consultant",
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
    designerConfig.followupConsultant ??
    DEFAULT_SHEET_DESIGNER_CONFIG.followupConsultant;

  const onPickPatient = (patient: { id: number }) => {
    if (patient?.id) setLocation(`/sheets/consultant/${patient.id}/followup`);
  };

  const followupTitles = ["1st Follow-up (Day 1)", "2nd Follow-up (1 Week)", "3rd Follow-up (1 Month)", "Later Follow-up"];

  return (
    <div className="min-h-screen bg-[#dde1e7] text-[#191c1e]" style={{ fontFamily: "Inter, sans-serif" }}>
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white !important; }
          .followup-print-root {
            zoom: ${originalMode ? 1 : followupLabels.scale};
            width: calc(190mm / ${originalMode ? 1 : followupLabels.scale});
            margin-top: ${originalMode ? 0 : followupLabels.offsetYmm}mm;
            margin-left: auto;
            margin-right: auto;
            transform: translateX(${originalMode ? 0 : followupLabels.offsetXmm}mm);
          }
        }
      `}</style>

      {/* Top nav */}
      <header className="print:hidden sticky top-0 z-50 flex justify-between items-center w-full px-6 py-2 bg-[#f8f9fb] border-b border-[#c3c6d6]">
        <span className="text-base font-bold text-[#003d9b]">Ophthalmic Clinic Management</span>
        <div className="flex items-center gap-3">
          <div className="w-60">
            <PatientPicker initialPatientId={initialPatientId} onSelect={onPickPatient} />
          </div>
          <Button
            type="button"
            className="bg-[#003d9b] text-white text-xs font-bold px-4 py-2 rounded uppercase tracking-wider hover:opacity-80 active:scale-95 disabled:opacity-60"
            onClick={handleSaveFollowup}
            disabled={saveFollowupSheetMutation.isPending}
          >
            {saveFollowupSheetMutation.isPending ? "Saving..." : "Save Sheet"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-[#737685] text-[#191c1e] text-xs font-bold px-4 py-2 rounded uppercase tracking-wider hover:bg-[#edeef0]"
            onClick={() => void printOrExportPdf(`consultant-followup-${initialPatientId ?? "sheet"}.pdf`)}
          >
            <Printer className="h-3 w-3 mr-1" /> Print PDF
          </Button>
        </div>
      </header>

      <div className="flex min-h-screen">
        {/* Left sidebar */}
        <aside className="print:hidden fixed left-0 top-[52px] h-[calc(100vh-52px)] w-60 flex flex-col py-5 border-r border-[#c3c6d6] bg-[#f3f4f6] z-40">
          <div className="px-4 mb-6">
            <div className="flex items-center gap-3 p-2 bg-[#e1e2e4] rounded-lg mb-4">
              <div className="w-10 h-10 rounded-full bg-[#0052cc] flex items-center justify-center text-white font-bold text-sm">
                {patientName ? patientName.slice(0, 2) : "PT"}
              </div>
              <div>
                <div className="text-sm font-bold text-[#191c1e] truncate max-w-[120px]">{patientName || "No Patient"}</div>
                <div className="text-xs uppercase text-[#434654] tracking-wide">ID: {initialPatientId ?? "—"}</div>
              </div>
            </div>
            <button
              type="button"
              className="w-full bg-[#003d9b] text-white py-2 rounded font-bold text-sm hover:opacity-90 transition-all"
              onClick={() => setLocation(`/sheets/consultant/${initialPatientId ?? ""}`)}
            >
              ← Consultant Sheet
            </button>
          </div>
          <nav className="flex-1 px-2 space-y-1">
            {[
              { label: "Consultant Sheet", active: false },
              { label: "Post-Op Follow-up", active: true },
              { label: "Patient History", active: false },
              { label: "Refraction Data", active: false },
            ].map((item) => (
              <div
                key={item.label}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all ${item.active ? "bg-[#d3e2ed] text-[#56656e] font-bold" : "text-[#434654] hover:bg-[#e7e8ea]"}`}
              >
                {item.label}
              </div>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="print:ml-0 ml-60 py-8 px-6 flex-1">
          <div className="a4-page-card followup-print-root space-y-5">
            {/* Operation header */}
            <div className="bg-white border border-[#c3c6d6] rounded-lg p-4 shadow-sm flex flex-col md:flex-row justify-between gap-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#434654] mb-1">{followupLabels.operationDateLabel ?? "Operation Date"}</p>
                  <DateInput value={operationDateRight} onChange={(e) => setOperationDateRight(e.target.value)} className="h-7 text-sm border-[#c3c6d6]" />
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#434654] mb-1">{followupLabels.operationTypeLabel ?? "Operation Type"}</p>
                  <Input
                    value={operationType}
                    onChange={(e) => setOperationType(e.target.value)}
                    className="h-7 text-sm font-bold text-[#003d9b] border-[#c3c6d6]"
                    placeholder="LASIK / Refractive Surgery"
                  />
                </div>
                <div className="flex gap-2 items-end">
                  <button
                    type="button"
                    className={`text-center p-2 rounded border flex-1 text-xs font-bold transition-all ${operationEyes.right ? "border-[#003d9b] bg-[#dae2ff]/30 text-[#003d9b]" : "border-[#c3c6d6] text-[#737685]"}`}
                    onClick={() => setOperationEyes((prev) => ({ ...prev, right: !prev.right }))}
                  >OD</button>
                  <button
                    type="button"
                    className={`text-center p-2 rounded border flex-1 text-xs font-bold transition-all ${operationEyes.left ? "border-[#003d9b] bg-[#dae2ff]/30 text-[#003d9b]" : "border-[#c3c6d6] text-[#737685]"}`}
                    onClick={() => setOperationEyes((prev) => ({ ...prev, left: !prev.left }))}
                  >OS</button>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="px-4 py-2 bg-[#ffdad6] text-[#93000a] rounded font-bold text-xs uppercase border border-[#ba1a1a] tracking-widest">
                  Post-Op Day 1
                </div>
              </div>
            </div>

            {/* Page title */}
            <div className="print:hidden flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#191c1e]">
                متابعة ما بعد العمليات <span className="text-[#737685]">/ Post-Op Follow-up</span>
              </h2>
              <div className="flex gap-2">
                <span className="px-2 py-1 bg-[#e7e8ea] rounded text-xs text-[#434654]">V.A: Visual Acuity</span>
                <span className="px-2 py-1 bg-[#e7e8ea] rounded text-xs text-[#434654]">IOP: Intraocular Pressure</span>
              </div>
            </div>

            {/* Followup sections */}
            <div className="space-y-5">
              {followups.map((f, idx) => (
                <section key={f.id} className="bg-white border border-[#c3c6d6] overflow-hidden rounded-lg shadow-sm">
                  <div className={`px-4 py-2 border-b border-[#c3c6d6] flex justify-between items-center ${idx === 0 ? "bg-[#d3e2ed]/30" : "bg-[#edeef0]"}`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-white text-sm ${idx === 0 ? "bg-[#003d9b]" : "bg-[#737685]"}`}>{idx + 1}</span>
                      <Input
                        value={f.type}
                        onChange={(e) => setFollowups((prev) => prev.map((x) => x.id === f.id ? { ...x, type: e.target.value } : x))}
                        className="h-7 text-base font-semibold border-0 bg-transparent focus:bg-white focus:border-[#003d9b] w-56"
                        placeholder={followupTitles[idx % 4]}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold uppercase text-[#434654]">{followupLabels.followupDateLabel ?? "Date"}:</label>
                      <DateInput
                        value={f.date}
                        onChange={(e) => setFollowups((prev) => prev.map((x) => x.id === f.id ? { ...x, date: e.target.value } : x))}
                        className="h-7 w-36 text-sm"
                      />
                    </div>
                  </div>

                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#f3f4f6] text-xs font-bold uppercase tracking-wider text-[#434654] border-b border-[#c3c6d6]">
                        <th className="px-3 py-2 w-14">Eye</th>
                        <th className="px-3 py-2">{followupLabels.vaLabel ?? "V.A (UCVA/BCVA)"}</th>
                        <th className="px-3 py-2">{followupLabels.refractionLabel ?? "Refraction (S/C/A)"}</th>
                        <th className="px-3 py-2">{followupLabels.flapLabel ?? "Flap Status"}</th>
                        <th className="px-3 py-2">{followupLabels.iopLabel ?? "IOP (mmHg)"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-[#c3c6d6]" style={{ backgroundColor: "rgba(0,61,155,0.03)" }}>
                        <td className="px-3 py-2.5 font-bold text-[#003d9b] text-sm">OD</td>
                        <td className="px-3 py-2.5"><input className="w-full bg-transparent border-0 border-b border-dashed border-[#c3c6d6] focus:border-[#003d9b] outline-none p-0 text-sm" /></td>
                        <td className="px-3 py-2.5"><input className="w-full bg-transparent border-0 border-b border-dashed border-[#c3c6d6] focus:border-[#003d9b] outline-none p-0 text-sm" /></td>
                        <td className="px-3 py-2.5"><input className="w-full bg-transparent border-0 border-b border-dashed border-[#c3c6d6] focus:border-[#003d9b] outline-none p-0 text-sm" /></td>
                        <td className="px-3 py-2.5"><input className="w-full bg-transparent border-0 border-b border-dashed border-[#c3c6d6] focus:border-[#003d9b] outline-none p-0 text-sm" /></td>
                      </tr>
                      <tr className="border-b border-[#c3c6d6] bg-white">
                        <td className="px-3 py-2.5 font-bold text-[#526069] text-sm">OS</td>
                        <td className="px-3 py-2.5"><input className="w-full bg-transparent border-0 border-b border-dashed border-[#c3c6d6] focus:border-[#003d9b] outline-none p-0 text-sm" /></td>
                        <td className="px-3 py-2.5"><input className="w-full bg-transparent border-0 border-b border-dashed border-[#c3c6d6] focus:border-[#003d9b] outline-none p-0 text-sm" /></td>
                        <td className="px-3 py-2.5"><input className="w-full bg-transparent border-0 border-b border-dashed border-[#c3c6d6] focus:border-[#003d9b] outline-none p-0 text-sm" /></td>
                        <td className="px-3 py-2.5"><input className="w-full bg-transparent border-0 border-b border-dashed border-[#c3c6d6] focus:border-[#003d9b] outline-none p-0 text-sm" /></td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="grid grid-cols-1 md:grid-cols-2 p-4 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-[#434654] block mb-1">{followupLabels.treatmentLabel ?? "Treatment Plan"}</label>
                      <textarea className="w-full border border-[#c3c6d6] rounded-lg focus:ring-1 focus:ring-[#003d9b] focus:outline-none text-sm p-2 resize-none h-16" />
                    </div>
                    <div className="grid grid-cols-3 gap-4 items-end">
                      <div className="text-center">
                        <div className="border-b border-[#c3c6d6] h-10 mb-1" />
                        <p className="text-[10px] font-bold uppercase text-[#434654] opacity-60">{followupLabels.receptionLabel ?? "Receptionist"}</p>
                      </div>
                      <div className="text-center">
                        <div className="border-b border-[#c3c6d6] h-10 mb-1" />
                        <p className="text-[10px] font-bold uppercase text-[#434654] opacity-60">{followupLabels.nurseLabel ?? "Nurse"}</p>
                      </div>
                      <div className="text-center">
                        <div className="border-b border-[#003d9b] h-10 mb-1 flex items-end justify-center">
                          <span className="text-[10px] text-[#003d9b] italic font-bold">{signatures.doctor}</span>
                        </div>
                        <p className="text-[10px] font-bold uppercase text-[#003d9b]">{followupLabels.doctorLabel ?? "Doctor"}</p>
                      </div>
                    </div>
                  </div>
                </section>
              ))}
            </div>

            <footer className="pt-4 border-t border-[#c3c6d6] flex justify-between items-center text-xs font-bold uppercase tracking-widest text-[#434654] opacity-50">
              <div>Ref: OP-FUP-V2.1</div>
              <div>Page 1 of 1</div>
              <div>Ophthalmic Management System</div>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
