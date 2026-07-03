import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Printer, ArrowRight, User, Eye, Activity, Target, FileText } from "lucide-react";
import { toast } from "sonner";
import { getTrpcErrorMessage } from "@/lib/utils";
import PatientPicker from "@/components/PatientPicker";
import { trpc } from "@/lib/trpc";
import { connectSheetUpdates } from "@/lib/ws";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import {
  coerceSheetDesignerConfig,
  DEFAULT_SHEET_DESIGNER_CONFIG,
  loadSheetDesignerConfig,
  saveSheetDesignerConfig,
} from "@/lib/sheetDesigner";
import { usePrintMode } from "@/hooks/usePrintMode";
import PrintPreviewBanner from "@/components/PrintPreviewBanner";
import { printOrExportPdf } from "@/lib/nativePdf";
import { BRAND_NAME_AR, BRAND_NAME_EN } from "@/lib/brand";
import { DateInput } from "@/components/ui/date-input";

export default function ExternalOperationSheet() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { goBack } = useAppNavigation();
  const [, params] = useRoute("/sheets/external/:id");
  const initialPatientId = params?.id ? Number(params.id) : undefined;
  const printMode = usePrintMode({ ready: Boolean(initialPatientId) });

  const [operationType, setOperationType] = useState("زيارة خارجية");
  const [operationEyes, setOperationEyes] = useState({ right: true, left: false, both: false });

  const [formData, setFormData] = useState({
    patientName: "",
    dateOfBirth: "",
    age: "",
    address: "",
    phone: "",
    patientCode: "",
    job: "",
    examinationDate: new Date().toISOString().split("T")[0],
    ucvaOD: "",
    ucvaOS: "",
    bcvaOD: "",
    bcvaOS: "",
    refractionOD: { s: "", c: "", a: "" },
    refractionOS: { s: "", c: "", a: "" },
    iopOD: "",
    iopOS: "",
  });
  const [pentacamData, setPentacamData] = useState({
    od: { k1: "", k2: "", ax1: "", ax2: "", thinnest: "", apex: "", residual: "", ttt: "", ablation: "" },
    os: { k1: "", k2: "", ax1: "", ax2: "", thinnest: "", apex: "", residual: "", ttt: "", ablation: "" },
  });
  const [signatures, setSignatures] = useState({ reception: "", nurse: "", technician: "", doctor: "" });
  const [customSheetCss, setCustomSheetCss] = useState("");
  const [sheetTemplate, setSheetTemplate] = useState(DEFAULT_SHEET_DESIGNER_CONFIG.templates.external);

  const designerSettingsQuery = trpc.medical.getSystemSetting.useQuery(
    { key: "sheet_designer_config" },
    { enabled: isAuthenticated, refetchOnWindowFocus: false },
  );
  const mobileSheetModeQuery = trpc.medical.getSystemSetting.useQuery(
    { key: "mobile_sheet_mode_v1" },
    { enabled: isAuthenticated, refetchOnWindowFocus: false },
  );

  useEffect(() => { if (!isAuthenticated) setLocation("/"); }, [isAuthenticated, setLocation]);

  useEffect(() => {
    const localDesigner = loadSheetDesignerConfig();
    setCustomSheetCss(localDesigner.css.external || "");
    setSheetTemplate(localDesigner.templates.external);
  }, []);

  useEffect(() => {
    if (!designerSettingsQuery.data?.value) return;
    const merged = coerceSheetDesignerConfig(designerSettingsQuery.data.value);
    setCustomSheetCss(merged.css.external || "");
    setSheetTemplate(merged.templates.external);
    saveSheetDesignerConfig(merged);
  }, [designerSettingsQuery.data]);

  if (!isAuthenticated) return null;

  const mobileSheetModeRaw = (mobileSheetModeQuery.data as any)?.value;
  const mobileSheetModeEnabled = Boolean(
    mobileSheetModeRaw && typeof mobileSheetModeRaw === "object" ? mobileSheetModeRaw.enabled : mobileSheetModeRaw,
  );

  const patientQuery = trpc.patient.getPatient.useQuery(initialPatientId ?? 0, { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false });
  const sheetQuery = trpc.medical.getSheetEntry.useQuery({ patientId: initialPatientId ?? 0, sheetType: "external" }, { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false });
  const examinationStateQuery = trpc.medical.getPatientPageState.useQuery({ patientId: initialPatientId ?? 0, page: "examination" }, { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false });
  const examinationsQuery = trpc.medical.getExaminationsByPatient.useQuery({ patientId: initialPatientId ?? 0 }, { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false });
  const visitsQuery = trpc.medical.getVisitsByPatient.useQuery({ patientId: initialPatientId ?? 0 }, { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false });
  const reportsQuery = trpc.medical.getMedicalReportsByPatient.useQuery({ patientId: initialPatientId ?? 0 }, { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false });
  const prescriptionsQuery = trpc.medical.getPrescriptionsByPatient.useQuery({ patientId: initialPatientId ?? 0 }, { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false });
  const surgeriesQuery = trpc.medical.getSurgeriesByPatient.useQuery({ patientId: initialPatientId ?? 0 }, { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false });
  const followupsQuery = trpc.medical.getFollowupVisitsByPatient.useQuery({ patientId: initialPatientId ?? 0 }, { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false });
  const pentacamQuery = trpc.medical.getPentacamFilesByPatient.useQuery({ patientId: initialPatientId ?? 0 }, { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false });
  const testRequestsQuery = trpc.medical.getTestRequestsByPatient.useQuery({ patientId: initialPatientId ?? 0 }, { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false });

  useEffect(() => {
    if (!initialPatientId) return;
    const socket = connectSheetUpdates({
      patientId: initialPatientId,
      onUpdate: () => {
        Promise.all([sheetQuery.refetch(), patientQuery.refetch(), examinationsQuery.refetch(), visitsQuery.refetch(), reportsQuery.refetch(), prescriptionsQuery.refetch(), surgeriesQuery.refetch(), followupsQuery.refetch(), pentacamQuery.refetch(), testRequestsQuery.refetch()]);
      },
    });
    return () => socket?.close();
  }, [initialPatientId]);

  const saveSheetMutation = trpc.medical.saveSheetEntry.useMutation({ onSuccess: () => { toast.success("تم الحفظ"); } });

  const formatDate = (value?: string | Date | null) => {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.valueOf())) return "";
    return date.toISOString().split("T")[0];
  };

  const handleSelectPatient = (patient: { id: number; fullName: string; patientCode?: string | null; phone?: string | null; age?: number | null; dateOfBirth?: string | Date | null; address?: string | null; occupation?: string | null }) => {
    setFormData((prev) => ({ ...prev, patientName: patient.fullName ?? "", phone: patient.phone ?? "", age: patient.age != null ? String(patient.age) : "", dateOfBirth: formatDate(patient.dateOfBirth), address: patient.address ?? "", patientCode: patient.patientCode ?? "", job: patient.occupation ?? "" }));
    if (patient.id) setLocation(`/sheets/external/${patient.id}`);
  };

  useEffect(() => {
    if (!patientQuery.data) return;
    const patient = patientQuery.data as any;
    setFormData((prev) => ({ ...prev, patientName: patient.fullName ?? "", phone: patient.phone ?? "", age: patient.age != null ? String(patient.age) : "", dateOfBirth: formatDate(patient.dateOfBirth), address: patient.address ?? "", patientCode: patient.patientCode ?? "", job: patient.occupation ?? "" }));
  }, [patientQuery.data]);

  useEffect(() => {
    if (!sheetQuery.data) return;
    try {
      const parsed = JSON.parse(sheetQuery.data);
      if (parsed.formData) setFormData((prev) => ({ ...prev, ...parsed.formData, patientName: prev.patientName || parsed.formData.patientName, phone: prev.phone || parsed.formData.phone, age: prev.age || parsed.formData.age, dateOfBirth: prev.dateOfBirth || parsed.formData.dateOfBirth, address: prev.address || parsed.formData.address }));
      if (parsed.examData?.autorefraction) {
        const auto = parsed.examData.autorefraction;
        setFormData((prev) => ({ ...prev, ucvaOD: auto.od?.ucva ?? prev.ucvaOD, ucvaOS: auto.os?.ucva ?? prev.ucvaOS, bcvaOD: auto.od?.bcva ?? prev.bcvaOD, bcvaOS: auto.os?.bcva ?? prev.bcvaOS, refractionOD: { s: auto.od?.s ?? prev.refractionOD.s, c: auto.od?.c ?? prev.refractionOD.c, a: auto.od?.axis ?? prev.refractionOD.a }, refractionOS: { s: auto.os?.s ?? prev.refractionOS.s, c: auto.os?.c ?? prev.refractionOS.c, a: auto.os?.axis ?? prev.refractionOS.a }, iopOD: auto.od?.iop ?? prev.iopOD, iopOS: auto.os?.iop ?? prev.iopOS }));
      }
      if (parsed.examData?.pentacam) setPentacamData((prev) => ({ od: { ...prev.od, ...(parsed.examData.pentacam.od ?? {}) }, os: { ...prev.os, ...(parsed.examData.pentacam.os ?? {}) } }));
      if (parsed.signatures) setSignatures({ reception: parsed.signatures.reception ?? "", nurse: parsed.signatures.nurse ?? "", technician: parsed.signatures.technician ?? "", doctor: parsed.signatures.doctor ?? "" });
      if (parsed.operationDetails) {
        setOperationType(parsed.operationDetails.type ?? "زيارة خارجية");
        const parsedEyes = parsed.operationDetails.eyes ?? {};
        const right = Boolean(parsedEyes.right);
        const left = Boolean(parsedEyes.left);
        const both = Boolean(parsedEyes.both) || (right && left);
        setOperationEyes({ right: both ? true : right, left: both ? true : left, both });
      }
    } catch { /* ignore */ }
  }, [sheetQuery.data]);

  useEffect(() => {
    if (!examinationsQuery.data || examinationsQuery.data.length === 0) return;
    const latestExam = examinationsQuery.data[0] as any;
    if (latestExam.autorefraction) {
      const auto = latestExam.autorefraction;
      setFormData((prev) => ({ ...prev, ucvaOD: auto.od?.ucva ?? prev.ucvaOD, ucvaOS: auto.os?.ucva ?? prev.ucvaOS, bcvaOD: auto.od?.bcva ?? prev.bcvaOD, bcvaOS: auto.os?.bcva ?? prev.bcvaOS, refractionOD: { s: auto.od?.s ?? prev.refractionOD.s, c: auto.od?.c ?? prev.refractionOD.c, a: auto.od?.axis ?? prev.refractionOD.a }, refractionOS: { s: auto.os?.s ?? prev.refractionOS.s, c: auto.os?.c ?? prev.refractionOS.c, a: auto.os?.axis ?? prev.refractionOS.a }, iopOD: auto.od?.iop ?? prev.iopOD, iopOS: auto.os?.iop ?? prev.iopOS }));
    }
    if (latestExam.pentacam) {
      const pentacam = latestExam.pentacam;
      setPentacamData((prev) => ({ od: { ...prev.od, ...(pentacam?.od ?? {}) }, os: { ...prev.os, ...(pentacam?.os ?? {}) } }));
    }
  }, [examinationsQuery.data]);

  useEffect(() => {
    const stateData = (examinationStateQuery.data as any)?.data;
    if (!stateData) return;
    const doctorFromState = String(stateData.doctorName ?? "").trim() || String(stateData.signatures?.doctor ?? "").trim();
    if (!doctorFromState) return;
    setSignatures((prev) => ({ ...prev, doctor: doctorFromState }));
  }, [examinationStateQuery.data]);

  useEffect(() => {
    const fullName = String(user?.name ?? "").trim();
    if (!fullName) return;
    const role = String(user?.role ?? "").toLowerCase();
    setSignatures((prev) => ({ ...prev, reception: role === "reception" ? fullName : prev.reception, nurse: role === "nurse" ? fullName : prev.nurse, technician: role === "technician" ? fullName : prev.technician, doctor: role === "doctor" ? prev.doctor || fullName : prev.doctor }));
  }, [user?.name, user?.role, sheetQuery.data, examinationStateQuery.data]);

  const handleSaveSheet = async () => {
    if (!initialPatientId) { toast.error("يرجى اختيار المريض أولاً"); return; }
    try {
      const existing = (() => { try { return sheetQuery.data ? JSON.parse(sheetQuery.data) : {}; } catch { return {}; } })();
      const pickValue = (next: string, prev?: string) => next && next.trim() ? next : prev;
      const mergedExamData = {
        autorefraction: {
          od: { ...(existing.examData?.autorefraction?.od ?? {}), ucva: pickValue(formData.ucvaOD, existing.examData?.autorefraction?.od?.ucva), bcva: pickValue(formData.bcvaOD, existing.examData?.autorefraction?.od?.bcva), s: pickValue(formData.refractionOD?.s, existing.examData?.autorefraction?.od?.s), c: pickValue(formData.refractionOD?.c, existing.examData?.autorefraction?.od?.c), axis: pickValue(formData.refractionOD?.a, existing.examData?.autorefraction?.od?.axis), iop: pickValue(formData.iopOD, existing.examData?.autorefraction?.od?.iop) },
          os: { ...(existing.examData?.autorefraction?.os ?? {}), ucva: pickValue(formData.ucvaOS, existing.examData?.autorefraction?.os?.ucva), bcva: pickValue(formData.bcvaOS, existing.examData?.autorefraction?.os?.bcva), s: pickValue(formData.refractionOS?.s, existing.examData?.autorefraction?.os?.s), c: pickValue(formData.refractionOS?.c, existing.examData?.autorefraction?.os?.c), axis: pickValue(formData.refractionOS?.a, existing.examData?.autorefraction?.os?.axis), iop: pickValue(formData.iopOS, existing.examData?.autorefraction?.os?.iop) },
        },
        pentacam: { od: { ...(existing.examData?.pentacam?.od ?? {}), ...pentacamData.od }, os: { ...(existing.examData?.pentacam?.os ?? {}), ...pentacamData.os } },
      };
      await saveSheetMutation.mutateAsync({ patientId: initialPatientId, sheetType: "external", content: JSON.stringify({ ...existing, formData: { ...(existing.formData ?? {}), ...formData }, examData: mergedExamData, operationDetails: { type: operationType, eyes: operationEyes } }) });
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "حدث خطأ أثناء الحفظ"));
    }
  };

  useEffect(() => {
    if (!initialPatientId) return;
    const timeout = setTimeout(() => { handleSaveSheet(); }, 600);
    return () => clearTimeout(timeout);
  }, [formData, pentacamData, operationType, operationEyes, initialPatientId]);

  const handlePrint = () => {
    void printOrExportPdf(`${String(formData.patientName || formData.patientCode || initialPatientId || "external-sheet").trim()}.pdf`);
  };

  // ─── Style helpers ────────────────────────────────────────────────────────────
  const ctd = "p-1.5 border border-[#c3c6d6] text-center";
  const inp = "w-full text-center bg-transparent border-0 border-b border-solid border-[#c3c6d6] focus:outline-none focus:border-[#003d9b] py-0.5 text-sm font-mono";
  const sectionHeader = "flex items-center gap-2 px-3 py-1.5 bg-[#003d9b] text-white text-xs font-bold uppercase tracking-wider rounded-t-md";
  const today = new Date().toLocaleDateString("en-GB");

  const PentacamCard = ({ eye, label, color }: { eye: "od" | "os"; label: string; color: string }) => {
    const isOD = eye === "od";
    const thin = parseFloat(pentacamData[eye].thinnest);
    return (
      <div className={`border rounded-lg overflow-hidden ${isOD ? "border-[#003d9b]/30" : "border-[#526069]/30"}`}>
        <div className={`px-3 py-2 flex items-center justify-between ${isOD ? "bg-[#003d9b]" : "bg-[#526069]"} text-white`}>
          <span className="text-xs font-bold uppercase">{label}</span>
          {!Number.isNaN(thin) && thin > 0 && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${thin < 480 ? "bg-red-200 text-red-800" : "bg-green-200 text-green-800"}`}>
              {thin < 480 ? "THIN AREA" : "STABLE"}
            </span>
          )}
        </div>
        <table className="w-full border-collapse text-xs">
          <tbody>
            {[
              { label: "K1 (Flat)", field: "k1" },
              { label: "K2 (Steep)", field: "k2" },
              { label: "Axis 1", field: "ax1" },
              { label: "Axis 2", field: "ax2" },
              { label: "Thinnest (μm)", field: "thinnest", warn: thin < 480 },
              { label: "Apex (μm)", field: "apex" },
              { label: "Residual Stroma (μm)", field: "residual", isKey: true },
              { label: "Planned TTT (μm)", field: "ttt" },
              { label: "Ablation Depth (μm)", field: "ablation", isRed: true },
            ].map(({ label: rowLabel, field, warn, isKey, isRed }) => (
              <tr key={field} className="border-b border-[#c3c6d6] last:border-0">
                <td className={`p-1.5 font-semibold w-2/5 bg-[#f3f4f6] ${isKey ? "text-[#003d9b]" : isRed ? "text-[#ba1a1a]" : "text-[#434654]"}`}>{rowLabel}</td>
                <td className={`p-1.5 ${isKey ? "bg-[#003d9b]/5" : isRed ? "bg-red-50" : ""}`}>
                  <input
                    className={`w-full bg-transparent border-0 border-b border-[#c3c6d6] outline-none text-xs text-center focus:border-[#003d9b] font-mono ${warn ? "text-red-600 font-bold" : isKey ? "text-[#003d9b] font-bold" : isRed ? "text-[#ba1a1a]" : ""}`}
                    value={(pentacamData[eye] as any)[field]}
                    onChange={(e) => setPentacamData((prev) => ({ ...prev, [eye]: { ...prev[eye], [field]: e.target.value } }))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div
      className={`min-h-screen bg-[#F8F9FB] external-page-root ${mobileSheetModeEnabled && !printMode.printView ? "mobile-sheet-mode" : ""}`}
      dir="ltr"
    >
      <style>{`
        ${customSheetCss}
        .external-sheet, .external-sheet * { font-weight: 400 !important; text-decoration: none !important; }
        .external-sheet th { font-weight: 700 !important; }
        @media print {
          @page { size: A4 portrait; margin: 8mm; }
          html, body { width: 100% !important; margin: 0 !important; padding: 0 !important; background: white !important; }
          .external-page-root { overflow: visible !important; max-height: none !important; }
          .external-sheet { width: 210mm !important; max-width: 210mm !important; height: auto !important; box-sizing: border-box !important; padding: 6mm !important; gap: 8px !important; font-size: 90% !important; line-height: 1.2 !important; border-radius: 0 !important; border: 0 !important; box-shadow: none !important; }
          .external-sheet input:not([type="checkbox"]):not([type="radio"]), .external-sheet textarea { border: 0 !important; border-bottom: 1px solid #c3c6d6 !important; box-shadow: none !important; outline: 0 !important; background: transparent !important; font-size: 11px !important; }
          .external-sheet table { font-size: 10px !important; }
          .external-sheet .gap-4 { gap: 5px !important; }
          .external-sheet .p-6 { padding: 5mm !important; }
          .external-sheet .p-3 { padding: 3px !important; }
          .print-external-signatures { display: grid !important; grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
          .print-external-footer-grid { display: grid !important; grid-template-columns: minmax(0, 8fr) minmax(0, 4fr) !important; }
        }
      `}</style>

      {/* ── TOP BAR ── */}
      <header className={`sticky top-0 z-50 print:hidden flex justify-between items-center px-6 py-2 bg-white border-b border-[#c3c6d6] shadow-sm ${printMode.printView ? "hidden" : ""}`} dir="ltr">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" type="button" onClick={() => goBack()} className="gap-1">
            <ArrowRight className="h-4 w-4" /> Back
          </Button>
          <span className="text-lg font-bold text-[#003d9b]">{BRAND_NAME_EN}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-56">
            <PatientPicker initialPatientId={initialPatientId} onSelect={handleSelectPatient} />
          </div>
          <Button size="sm" className="bg-[#003d9b] text-white font-bold px-4 hover:bg-[#003d9b]/90" onClick={handleSaveSheet} disabled={saveSheetMutation.isPending} type="button">
            {saveSheetMutation.isPending ? "Saving..." : "Save"}
          </Button>
          <Button size="sm" variant="outline" className="border-[#003d9b] text-[#003d9b] font-bold hover:bg-[#003d9b]/5" onClick={handlePrint} type="button">
            <Printer className="h-4 w-4 mr-1" /> Print PDF
          </Button>
        </div>
      </header>

      {printMode.printView && (
        <PrintPreviewBanner title="External Operation Sheet" subtitle={formData.patientName || undefined} onPrint={handlePrint} />
      )}

      <div className="py-6 print:py-0">
        <div
          data-mobile-pdf-root
          className={`external-sheet bg-white text-[#191c1e] font-sans p-6 border border-[#c3c6d6] shadow-md flex flex-col gap-4 w-[210mm] max-w-full mx-auto rounded-lg ${printMode.printView ? "hidden print:flex" : ""}`}
          dir="ltr"
        >
          {/* ── HEADER ── */}
          <header className="flex items-start justify-between border-b-2 border-[#003d9b] pb-3">
            <div className="flex-1">
              <div className="text-xl font-extrabold text-[#003d9b] leading-tight">{BRAND_NAME_EN}</div>
              <div className="text-sm text-[#434654]">Laser &amp; Vision Correction</div>
              <div className="text-xs text-[#737685] mt-0.5">EXTERNAL EXAMINATION</div>
            </div>
            <div className="text-center px-4">
              <div className="text-base font-bold text-[#003d9b]">External Sheet</div>
              <div className="text-sm text-[#434654]">External Operation Sheet</div>
              <div className="text-xs text-[#737685] mt-0.5">{formData.examinationDate ? new Date(formData.examinationDate).toLocaleDateString("en-GB") : today}</div>
            </div>
            <div className="text-right text-xs text-[#434654] space-y-0.5">
              {formData.patientName && <div className="font-bold text-sm text-[#191c1e]">{formData.patientName}</div>}
              {formData.patientCode && <div className="text-[#737685]">ID: {formData.patientCode}</div>}
            </div>
          </header>

          {/* ── VISIT TYPE + EYE SELECTION ── */}
          <div className="flex flex-wrap items-center gap-4 p-3 bg-[#f3f4f6] border border-[#c3c6d6] rounded-lg text-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#434654] uppercase">Visit Type:</span>
              <select
                className="text-sm rounded border border-[#c3c6d6] bg-white py-1 px-2 text-[#003d9b] font-semibold"
                value={operationType}
                onChange={(e) => setOperationType(e.target.value)}
              >
                <option value="زيارة خارجية">External Visit</option>
                <option value="فحص خارجي">External Exam</option>
                <option value="ليزك">Lasik</option>
                <option value="Follow-up">Follow-up</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#434654] uppercase">Exam Date:</span>
              <DateInput
                value={formData.examinationDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, examinationDate: e.target.value }))}
                className="h-7 text-sm border-[#c3c6d6] w-36"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-[#434654] uppercase">Eye:</span>
              {[
                { key: "right", label: "OD (Right)", color: "#003d9b" },
                { key: "left", label: "OS (Left)", color: "#526069" },
                { key: "both", label: "OU (Both)", color: "#003d9b" },
              ].map(({ key, label, color }) => (
                <label key={key} className="flex items-center gap-1.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-[#003d9b]"
                    checked={Boolean((operationEyes as any)[key])}
                    onChange={(e) => {
                      if (key === "both") {
                        const both = e.target.checked;
                        setOperationEyes({ right: both, left: both, both });
                      } else {
                        const val = e.target.checked;
                        setOperationEyes((p) => ({ ...p, [key]: val, both: key === "right" ? val && p.left : p.right && val }));
                      }
                    }}
                  />
                  <span className="font-medium" style={{ color }}>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* ── PATIENT INFORMATION ── */}
          <section>
            <div className={sectionHeader}>
              <User className="h-3.5 w-3.5" />
              <span>Patient Details</span>
            </div>
            <div className="border border-[#c3c6d6] border-t-0 rounded-b-md p-3 bg-[#f8f9fb]">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-sm" dir="rtl">
                <div className="col-span-2 md:col-span-1">
                  <span className="text-xs text-[#434654] font-semibold block mb-0.5">Full Name</span>
                  <div className="border-b border-[#c3c6d6] min-h-[22px] font-semibold text-[#003d9b] pb-0.5" dir="rtl">{formData.patientName}</div>
                </div>
                <div>
                  <span className="text-xs text-[#434654] font-semibold block mb-0.5">Patient Code</span>
                  <div className="border-b border-[#c3c6d6] min-h-[22px] font-mono text-[#526069] pb-0.5">{formData.patientCode}</div>
                </div>
                <div>
                  <span className="text-xs text-[#434654] font-semibold block mb-0.5">Date of Birth</span>
                  <div className="border-b border-[#c3c6d6] min-h-[22px] pb-0.5 text-right" dir="ltr">{formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString("en-GB") : ""}</div>
                </div>
                <div>
                  <span className="text-xs text-[#434654] font-semibold block mb-0.5">Age</span>
                  <div className="border-b border-[#c3c6d6] min-h-[22px] pb-0.5 text-right" dir="ltr">{formData.age}</div>
                </div>
                <div>
                  <span className="text-xs text-[#434654] font-semibold block mb-0.5">Phone Number</span>
                  <div className="border-b border-[#c3c6d6] min-h-[22px] pb-0.5 text-right" dir="ltr">{formData.phone}</div>
                </div>
                <div>
                  <span className="text-xs text-[#434654] font-semibold block mb-0.5">Profession</span>
                  <div className="border-b border-[#c3c6d6] min-h-[22px] pb-0.5">{formData.job}</div>
                </div>
                <div>
                  <span className="text-xs text-[#434654] font-semibold block mb-0.5">Physician</span>
                  <div className="border-b border-[#c3c6d6] min-h-[22px] font-semibold text-[#003d9b] pb-0.5 text-right" dir="rtl">{signatures.doctor}</div>
                </div>
                <div className="col-span-2">
                  <span className="text-xs text-[#434654] font-semibold block mb-0.5">Address</span>
                  <div className="border-b border-[#c3c6d6] min-h-[22px] pb-0.5" dir="rtl">{formData.address}</div>
                </div>
              </div>
            </div>
          </section>

          {/* ── VISUAL ACUITY + REFRACTION ── */}
          <section>
            <div className={sectionHeader}>
              <Eye className="h-3.5 w-3.5" />
              <span>Visual Acuity &amp; Refraction</span>
            </div>
            <div className="border border-[#c3c6d6] border-t-0 rounded-b-md overflow-hidden">
              <table className="w-full text-center border-collapse text-xs">
                <thead className="bg-[#003d9b] text-white font-bold uppercase">
                  <tr>
                    <th className="p-2 border border-[#003d9b]/40" rowSpan={2}>Eye</th>
                    <th className="p-2 border border-[#003d9b]/40" rowSpan={2}>UCVA</th>
                    <th className="p-2 border border-[#003d9b]/40" rowSpan={2}>BCVA</th>
                    <th className="p-2 border border-[#003d9b]/40" rowSpan={2}>IOP</th>
                    <th className="p-2 border border-[#003d9b]/40" colSpan={3}>OD Refraction</th>
                    <th className="p-2 border border-[#003d9b]/40" colSpan={3}>OS Refraction</th>
                  </tr>
                  <tr>
                    <th className="p-1.5 border border-[#003d9b]/40">S</th>
                    <th className="p-1.5 border border-[#003d9b]/40">C</th>
                    <th className="p-1.5 border border-[#003d9b]/40">A</th>
                    <th className="p-1.5 border border-[#003d9b]/40">S</th>
                    <th className="p-1.5 border border-[#003d9b]/40">C</th>
                    <th className="p-1.5 border border-[#003d9b]/40">A</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-[#003d9b]/5">
                    <td className="p-2 border border-[#c3c6d6] font-bold text-[#003d9b]">OD</td>
                    <td className={ctd}><input className={inp} value={formData.ucvaOD} onChange={(e) => setFormData((p) => ({ ...p, ucvaOD: e.target.value }))} /></td>
                    <td className={ctd}><input className={inp} value={formData.bcvaOD} onChange={(e) => setFormData((p) => ({ ...p, bcvaOD: e.target.value }))} /></td>
                    <td className={ctd}><input className={inp} value={formData.iopOD} onChange={(e) => setFormData((p) => ({ ...p, iopOD: e.target.value }))} /></td>
                    <td className={ctd}><input className={inp} value={formData.refractionOD.s} onChange={(e) => setFormData((p) => ({ ...p, refractionOD: { ...p.refractionOD, s: e.target.value } }))} /></td>
                    <td className={ctd}><input className={inp} value={formData.refractionOD.c} onChange={(e) => setFormData((p) => ({ ...p, refractionOD: { ...p.refractionOD, c: e.target.value } }))} /></td>
                    <td className={ctd}><input className={inp} value={formData.refractionOD.a} onChange={(e) => setFormData((p) => ({ ...p, refractionOD: { ...p.refractionOD, a: e.target.value } }))} /></td>
                    <td className={ctd}><input className={inp} value={formData.refractionOS.s} onChange={(e) => setFormData((p) => ({ ...p, refractionOS: { ...p.refractionOS, s: e.target.value } }))} /></td>
                    <td className={ctd}><input className={inp} value={formData.refractionOS.c} onChange={(e) => setFormData((p) => ({ ...p, refractionOS: { ...p.refractionOS, c: e.target.value } }))} /></td>
                    <td className={ctd}><input className={inp} value={formData.refractionOS.a} onChange={(e) => setFormData((p) => ({ ...p, refractionOS: { ...p.refractionOS, a: e.target.value } }))} /></td>
                  </tr>
                  <tr className="bg-[#f3f4f6]">
                    <td className="p-2 border border-[#c3c6d6] font-bold text-[#526069]">OS</td>
                    <td className={ctd}><input className={inp} value={formData.ucvaOS} onChange={(e) => setFormData((p) => ({ ...p, ucvaOS: e.target.value }))} /></td>
                    <td className={ctd}><input className={inp} value={formData.bcvaOS} onChange={(e) => setFormData((p) => ({ ...p, bcvaOS: e.target.value }))} /></td>
                    <td className={ctd}><input className={inp} value={formData.iopOS} onChange={(e) => setFormData((p) => ({ ...p, iopOS: e.target.value }))} /></td>
                    <td className={ctd} colSpan={3}><input className={inp} placeholder="Same as OD" /></td>
                    <td className={ctd} colSpan={3}><input className={inp} /></td>
                  </tr>
                  <tr>
                    <td className="p-2 border border-[#c3c6d6] font-semibold text-[#434654] text-xs">Fundus</td>
                    <td className={ctd} colSpan={9}><input className={inp} /></td>
                  </tr>
                  <tr className="bg-[#f3f4f6]">
                    <td className="p-2 border border-[#c3c6d6] font-semibold text-[#434654] text-xs">Tear Film</td>
                    <td className={`${ctd} text-[#434654] font-semibold`} colSpan={3}>BUT (sec): <input className="inline-block w-16 bg-transparent border-b border-[#c3c6d6] outline-none text-center text-xs" /></td>
                    <td className={`${ctd} text-[#434654] font-semibold`} colSpan={3}>Schirmer (mm): <input className="inline-block w-16 bg-transparent border-b border-[#c3c6d6] outline-none text-center text-xs" /></td>
                    <td className={`${ctd} text-[#434654] font-semibold`} colSpan={3}>Lid Margin: <input className="inline-block w-16 bg-transparent border-b border-[#c3c6d6] outline-none text-center text-xs" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ── CORNEAL EXAM (PENTACAM) ── */}
          <section>
            <div className={sectionHeader}>
              <Activity className="h-3.5 w-3.5" />
              <span>Corneal Examination / Pentacam</span>
            </div>
            <div className="border border-[#c3c6d6] border-t-0 rounded-b-md p-3 bg-white">
              <div className="grid grid-cols-2 gap-4">
                <PentacamCard eye="od" label="OD — Right Eye (RT)" color="#003d9b" />
                <PentacamCard eye="os" label="OS — Left Eye (LT)" color="#526069" />
              </div>
            </div>
          </section>

          {/* ── TREATMENT PLAN ── */}
          <section>
            <div className={sectionHeader}>
              <Target className="h-3.5 w-3.5" />
              <span>Treatment Plan</span>
            </div>
            <div className="border border-[#c3c6d6] border-t-0 rounded-b-md overflow-hidden">
              <table className="w-full text-center border-collapse text-xs">
                <thead className="bg-[#e7e8ea] text-[#434654] font-bold uppercase">
                  <tr>
                    <th className={ctd}>Eye</th>
                    <th className={ctd}>Target Refraction</th>
                    <th className={ctd}>Before Flap</th>
                    <th className={ctd}>After Flap</th>
                    <th className={ctd}>After Treatment</th>
                    <th className={ctd}>Flap Reposition</th>
                    <th className={ctd}>Ciclo 3×</th>
                    <th className={ctd}>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {(["OD", "OS"] as const).map((label) => (
                    <tr key={label} className={label === "OD" ? "bg-[#003d9b]/5" : "bg-[#f3f4f6]"}>
                      <td className={`${ctd} font-bold ${label === "OD" ? "text-[#003d9b]" : "text-[#526069]"}`}>{label}</td>
                      {Array.from({ length: 7 }).map((_, i) => (
                        <td key={i} className={ctd}><input className={inp} /></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── NOTES + FINAL DECISION ── */}
          <section className="print-external-footer-grid grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8 space-y-3">
              <div>
                <div className="text-xs font-bold text-[#003d9b] uppercase mb-1">Comments:</div>
                <div className="border-b border-[#c3c6d6] h-7" />
                <div className="border-b border-[#c3c6d6] h-7 mt-1" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#003d9b] uppercase mb-1">Final Decision:</div>
                <div className="border-b border-[#c3c6d6] h-7" />
              </div>
            </div>
            <div className="lg:col-span-4 border-2 border-[#003d9b] rounded-xl p-3 bg-[#003d9b]/5">
              <div className="text-center font-bold text-[#003d9b] uppercase text-xs border-b border-[#003d9b]/20 pb-2 mb-2">Office Notes</div>
              <div className="border-b border-[#003d9b]/30 h-6 mb-1.5" />
              <div className="border-b border-[#003d9b]/30 h-6 mb-1.5" />
              <div className="border-b border-[#003d9b]/30 h-6" />
            </div>
          </section>

          {/* ── SIGNATURES ── */}
          <footer className="print-external-signatures border-t-2 border-[#003d9b] pt-4 mt-1">
            <div className="grid grid-cols-4 gap-6">
              {[
                { label: "Reception", val: signatures.reception, isDoctor: false },
                { label: "Nursing", val: signatures.nurse, isDoctor: false },
                { label: "Optometrist", val: signatures.technician, isDoctor: false },
                { label: "Surgeon", val: signatures.doctor, isDoctor: true },
              ].map(({ label, val, isDoctor }, i) => (
                <div key={i} className="flex flex-col gap-2 text-center">
                  <div className={`h-10 border-b-2 flex items-end justify-center pb-1 ${isDoctor ? "border-[#003d9b]" : "border-[#c3c6d6]"}`}>
                    {val && <span className={`text-xs italic ${isDoctor ? "text-[#003d9b] font-semibold" : "text-[#737685]"}`}>{val}</span>}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wide ${isDoctor ? "text-[#003d9b]" : "text-[#434654]"}`}>{label}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-2 border-t border-[#c3c6d6] flex justify-between items-center text-[10px] text-[#737685] uppercase tracking-widest">
              <span>Page 1 of 1</span>
              <span>Ophthalmic Management System</span>
              <span>Date: {today}</span>
            </div>
          </footer>
        </div>

        {/* Mobile actions */}
        <div className={`sheet-mobile-actions print:hidden ${printMode.printView ? "hidden" : ""}`}>
          <Button type="button" variant="outline" onClick={() => goBack()}>Back</Button>
          <Button type="button" variant="outline" onClick={handlePrint}>Print</Button>
          <Button type="button" variant="default" onClick={handleSaveSheet}>Save</Button>
        </div>
      </div>
    </div>
  );
}
