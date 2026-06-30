import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer, Eye } from "lucide-react";
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
  const [, params] = useRoute("/sheets/lasik/:id/followup");
  const originalMode =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("original") === "1";
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
    <div className="min-h-screen bg-[#f8f9fb] text-[#191c1e]" dir="rtl" style={{ fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-container { width: 100%; margin: 0; padding: 0; box-shadow: none !important; }
          @page { margin: 0; size: A4 portrait; }
          .followup-print-root {
            width: 100%;
            margin: 0 auto;
          }
        }
        .a4-canvas {
            width: 210mm;
            min-height: 297mm;
            margin: 20px auto;
            background: white;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
            padding: 15mm;
            position: relative;
        }
        .od-bg { background-color: rgba(0, 61, 155, 0.03); }
        .os-bg { background-color: transparent; }
        .table-input-cell {
            padding: 0 !important;
        }
        .table-input-cell input {
            height: 100%;
            border-radius: 0;
            text-align: center;
            background-color: transparent;
            border: 1px solid transparent;
            width: 100%;
            transition: all 0.2s;
        }
        .table-input-cell input:focus {
            border-color: #003d9b;
            background-color: #ffffff;
            outline: none;
            box-shadow: 0 0 0 2px rgba(0, 61, 155, 0.1);
        }
        .text-on-surface { color: #191c1e; }
        .text-primary { color: #003d9b; }
        .bg-primary { background-color: #003d9b; }
        .hover\:bg-primary-container:hover { background-color: #0052cc; }
        .bg-primary-container { background-color: #0052cc; }
        .text-on-primary-container { color: #c4d2ff; }
        .text-on-surface-variant { color: #434654; }
        .text-outline { color: #737685; }
        .border-outline-variant { border-color: #c3c6d6; }
        .border-outline { border-color: #737685; }
        .bg-surface-container-lowest { background-color: #ffffff; }
        .bg-surface-container-low { background-color: #f3f4f6; }
        .bg-surface-container-high { background-color: #e7e8ea; }
        .bg-surface-container-highest { background-color: #e1e2e4; }
        .bg-tertiary-container { background-color: #006476; }
        .text-on-tertiary-container { color: #70e2ff; }
        .text-secondary { color: #526069; }
        .bg-surface-variant { background-color: #e1e2e4; }
        .bg-surface { background-color: #f8f9fb; }
        
        .mb-section-margin { margin-bottom: 32px; }
        .mt-section-margin { margin-top: 32px; }
        .gap-gutter { gap: 16px; }
        .pt-gutter { padding-top: 16px; }
        
        .font-body-md, .text-body-md { font-size: 14px; line-height: 20px; font-weight: 400; }
        .font-headline-md, .text-headline-md { font-size: 24px; line-height: 32px; font-weight: 600; }
        .font-headline-sm, .text-headline-sm { font-size: 20px; line-height: 28px; font-weight: 600; }
        .font-body-lg, .text-body-lg { font-size: 16px; line-height: 24px; font-weight: 400; }
        .font-display-lg, .text-display-lg { font-size: 32px; line-height: 40px; letter-spacing: -0.02em; font-weight: 700; }
        .font-data-mono { font-size: 14px; line-height: 20px; font-weight: 600; }
        .font-label-caps { font-size: 12px; line-height: 16px; letter-spacing: 0.05em; font-weight: 700; text-transform: uppercase; }
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
        <main className="print:mr-0 mr-60 py-8 px-6 w-full flex justify-center bg-surface">
          <div className="a4-canvas print-container followup-print-root text-on-surface">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-primary pb-6 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary-container flex items-center justify-center rounded-xl">
                  <Eye className="text-on-primary-container h-10 w-10" />
                </div>
                <div>
                  <h2 className="font-headline-md text-headline-md text-primary tracking-tight">Ophthalmic Center</h2>
                  <p className="font-label-caps text-on-surface-variant">Post-Op Follow-up | متابعة ما بعد العمليات</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-body-md text-body-md text-on-surface font-bold">Confidential Clinical Record</p>
                <p className="font-label-caps text-outline">Date Generated: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              </div>
            </div>

            {/* Patient & Operation Info Grid */}
            <div className="grid grid-cols-2 gap-gutter mb-section-margin">
              {/* Patient Info */}
              <div className="border border-outline-variant rounded-lg p-4 bg-surface-container-low text-left" dir="ltr">
                <h3 className="font-label-caps text-primary border-b border-outline-variant mb-3 pb-1">Patient Information / بيانات المريض</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant font-body-md">Name / الاسم:</span>
                    <span className="font-data-mono">{patientName || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant font-body-md">ID / الرقم:</span>
                    <span className="font-data-mono">{initialPatientId ?? "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant font-body-md">DOB / تاريخ الميلاد:</span>
                    <span className="font-data-mono">{patientDOB || "—"}</span>
                  </div>
                </div>
              </div>
              {/* Operation Info */}
              <div className="border border-outline-variant rounded-lg p-4 bg-surface-container-low text-left" dir="ltr">
                <h3 className="font-label-caps text-primary border-b border-outline-variant mb-3 pb-1">Surgery Details / تفاصيل العملية</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-on-surface-variant font-body-md">Type / النوع:</span>
                    <div className="flex items-center gap-2">
                      <Input
                        value={operationType}
                        onChange={(e) => setOperationType(e.target.value)}
                        className="h-7 text-xs w-28 border-[#c3c6d6] font-bold text-[#003d9b]"
                        placeholder="ليزك"
                      />
                      <button
                        type="button"
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${operationEyes.right ? "bg-primary text-white" : "bg-surface-variant text-on-surface-variant"}`}
                        onClick={() => setOperationEyes((prev) => ({ ...prev, right: !prev.right }))}
                      >OD</button>
                      <button
                        type="button"
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${operationEyes.left ? "bg-primary text-white" : "bg-surface-variant text-on-surface-variant"}`}
                        onClick={() => setOperationEyes((prev) => ({ ...prev, left: !prev.left }))}
                      >OS</button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-on-surface-variant font-body-md">Date / التاريخ:</span>
                    <div className="flex gap-1">
                      <DateInput value={operationDateRight} onChange={(e) => setOperationDateRight(e.target.value)} className="h-7 w-24 text-[11px] border-[#c3c6d6]" />
                      <DateInput value={operationDateLeft} onChange={(e) => setOperationDateLeft(e.target.value)} className="h-7 w-24 text-[11px] border-[#c3c6d6]" />
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant font-body-md">Surgeon / الجراح:</span>
                    <span className="font-data-mono">{signatures.doctor || "—"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Follow-up Tables Container */}
            <div className="space-y-6">
              <div className="space-y-gutter" id="follow-up-grid">
                {followups.map((f, idx) => {
                  // Determine block background classes dynamically
                  const headerBgClass = idx === 0 
                    ? "bg-primary text-white" 
                    : idx === 1 
                      ? "bg-tertiary-container text-on-tertiary-container" 
                      : "bg-surface-container-highest text-on-surface border-b border-outline-variant";

                  return (
                    <div key={f.id} className="follow-up-block">
                      <div className="border border-outline rounded-lg overflow-hidden bg-white">
                        <div className={`px-4 py-1.5 flex justify-between items-center ${headerBgClass}`}>
                          <div className="flex items-center gap-2">
                            <span className="font-label-caps uppercase tracking-wider">{idx + 1}.</span>
                            <Input
                              value={f.type}
                              onChange={(e) => setFollowups((prev) => prev.map((x) => x.id === f.id ? { ...x, type: e.target.value } : x))}
                              className="h-6 text-xs font-semibold border-0 bg-transparent text-inherit focus:bg-white focus:text-[#191c1e] w-36 p-1 rounded"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <DateInput
                              value={f.date}
                              onChange={(e) => setFollowups((prev) => prev.map((x) => x.id === f.id ? { ...x, date: e.target.value } : x))}
                              className="h-6 w-32 text-xs border-outline-variant bg-transparent text-inherit"
                            />
                          </div>
                        </div>

                        <table className="w-full text-center border-collapse text-xs">
                          <thead>
                            <tr className="bg-surface-container-high border-b border-outline-variant text-[10px] font-label-caps">
                              <th className="py-1 px-1 w-12 border-r border-outline-variant">Eye</th>
                              <th className="py-1 px-2 border-r border-outline-variant">{followupLabels.vaLabel ?? "VA (U)"}</th>
                              <th className="py-1 px-2 border-r border-outline-variant">Refraction (S/C/A)</th>
                              <th className="py-1 px-2 border-r border-outline-variant">{followupLabels.flapLabel ?? "Flap"}</th>
                              <th className="py-1 px-2 border-r border-outline-variant">{followupLabels.iopLabel ?? "IOP"}</th>
                              <th className="py-1 px-2">{followupLabels.treatmentLabel ?? "Notes / Plan"}</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="od-bg border-b border-outline-variant h-12">
                              <td className="font-bold text-primary border-r border-outline-variant text-center">OD</td>
                              <td className="border-r border-outline-variant table-input-cell">
                                <input placeholder="6/6" type="text" className="w-full h-full text-center bg-transparent border-0 outline-none" />
                              </td>
                              <td className="border-r border-outline-variant table-input-cell">
                                <div className="flex items-center justify-center gap-1 px-1">
                                  <input placeholder="S" className="w-8 text-center bg-transparent border-0 outline-none" type="text" />
                                  <span className="text-gray-300">/</span>
                                  <input placeholder="C" className="w-8 text-center bg-transparent border-0 outline-none" type="text" />
                                  <span className="text-gray-300">/</span>
                                  <input placeholder="A" className="w-8 text-center bg-transparent border-0 outline-none" type="text" />
                                </div>
                              </td>
                              <td className="border-r border-outline-variant table-input-cell">
                                <select className="text-[11px] p-0.5 border border-outline-variant rounded bg-white w-20 text-center">
                                  <option>Edges: سليم</option>
                                  <option>تورم</option>
                                </select>
                              </td>
                              <td className="border-r border-outline-variant table-input-cell">
                                <div className="flex items-center justify-center gap-1">
                                  <input placeholder="OD" className="w-10 text-center bg-transparent border-0 outline-none" type="text" />
                                  <span className="text-[10px] text-outline">mmHg</span>
                                </div>
                              </td>
                              <td rowSpan={2} className="align-top p-1 text-left text-[11px] italic text-outline border-l border-outline-variant h-full">
                                <textarea
                                  className="w-full h-full min-h-[4.5rem] border-0 bg-transparent text-[11px] text-on-surface focus:outline-none resize-none p-1"
                                  placeholder="Treatment plan notes / الخطة العلاجية..."
                                />
                              </td>
                            </tr>
                            <tr className="os-bg h-12">
                              <td className="font-bold text-secondary border-r border-outline-variant text-center">OS</td>
                              <td className="border-r border-outline-variant table-input-cell">
                                <input placeholder="6/9" type="text" className="w-full h-full text-center bg-transparent border-0 outline-none" />
                              </td>
                              <td className="border-r border-outline-variant table-input-cell">
                                <div className="flex items-center justify-center gap-1 px-1">
                                  <input placeholder="S" className="w-8 text-center bg-transparent border-0 outline-none" type="text" />
                                  <span className="text-gray-300">/</span>
                                  <input placeholder="C" className="w-8 text-center bg-transparent border-0 outline-none" type="text" />
                                  <span className="text-gray-300">/</span>
                                  <input placeholder="A" className="w-8 text-center bg-transparent border-0 outline-none" type="text" />
                                </div>
                              </td>
                              <td className="border-r border-outline-variant table-input-cell">
                                <select className="text-[11px] p-0.5 border border-outline-variant rounded bg-white w-20 text-center">
                                  <option>Bed: صافي</option>
                                  <option>عكر</option>
                                </select>
                              </td>
                              <td className="border-r border-outline-variant table-input-cell">
                                <div className="flex items-center justify-center gap-1">
                                  <input placeholder="OS" className="w-10 text-center bg-transparent border-0 outline-none" type="text" />
                                  <span className="text-[10px] text-outline">mmHg</span>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Dominant Eye & Signatures under the table */}
                        <div className="p-3 bg-surface-container-low border-t border-outline-variant flex justify-between items-center text-xs">
                          <div className="flex items-center gap-4 bg-[#edeef0]/40 p-1.5 rounded">
                            <span className="text-[11px] font-bold text-on-surface-variant uppercase">Dominant Eye / العين المهيمنة:</span>
                            <div className="flex gap-3">
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input className="text-primary focus:ring-primary text-[11px]" name={`dominant_${f.id}`} type="radio" />
                                <span className="text-[11px]">OD</span>
                              </label>
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input className="text-primary focus:ring-primary text-[11px]" name={`dominant_${f.id}`} type="radio" />
                                <span className="text-[11px]">OS</span>
                              </label>
                            </div>
                          </div>

                          <div className="flex gap-4 text-[11px] text-on-surface-variant">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="font-label-caps text-[9px]">{followupLabels.receptionLabel ?? "الاستقبال"}</span>
                              <div className="w-16 border-b border-outline h-3" />
                            </div>
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="font-label-caps text-[9px]">{followupLabels.nurseLabel ?? "التمريض"}</span>
                              <div className="w-16 border-b border-outline h-3" />
                            </div>
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="font-label-caps text-[9px] text-primary">{followupLabels.doctorLabel ?? "الطبيب"}</span>
                              <div className="w-16 border-b border-primary h-3 flex items-end justify-center">
                                <span className="text-[8px] text-primary italic truncate max-w-[60px]">{signatures.doctor}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer / Notes */}
            <div className="mt-section-margin border-t border-outline-variant pt-gutter">
              <div className="grid grid-cols-2 gap-gutter items-end text-left" dir="ltr">
                <div className="space-y-4 w-full">
                  <div className="border-b border-outline-variant w-full h-8 flex items-end">
                    <span className="font-label-caps text-outline text-[10px]">Additional Observations / ملاحظات إضافية</span>
                  </div>
                  <div className="border-b border-outline-variant w-full h-8"></div>
                </div>
                <div className="text-right">
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-label-caps text-on-surface">Physician's Signature</span>
                    <div className="w-48 h-12 border-b-2 border-primary mb-2"></div>
                    <span className="font-body-md text-primary">{signatures.doctor || "Dr. Ahmed Said"}</span>
                  </div>
                </div>
              </div>
              <div className="mt-8 flex justify-center">
                <p className="font-label-caps text-outline text-center text-[10px] leading-relaxed">
                  Confidential Medical Record - Unauthorized Access Prohibited<br />
                  سجل طبي سري - يحظر الدخول غير المصرح به
                </p>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

