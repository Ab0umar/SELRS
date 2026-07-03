import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Printer, ArrowRight, User, Eye, FileText, Stethoscope } from "lucide-react";
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

export default function SpecialistSheet() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { goBack } = useAppNavigation();
  const [, params] = useRoute("/sheets/specialist/:id");
  const initialPatientId = params?.id ? Number(params.id) : undefined;
  const printMode = usePrintMode({ ready: Boolean(initialPatientId) });

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
  const [signatures, setSignatures] = useState({
    reception: "",
    nurse: "",
    technician: "",
    doctor: "",
  });
  const [customSheetCss, setCustomSheetCss] = useState("");
  const [sheetTemplate, setSheetTemplate] = useState(
    DEFAULT_SHEET_DESIGNER_CONFIG.templates.specialist,
  );
  const designerSettingsQuery = trpc.medical.getSystemSetting.useQuery(
    { key: "sheet_designer_config" },
    { enabled: isAuthenticated, refetchOnWindowFocus: false },
  );
  const mobileSheetModeQuery = trpc.medical.getSystemSetting.useQuery(
    { key: "mobile_sheet_mode_v1" },
    { enabled: isAuthenticated, refetchOnWindowFocus: false },
  );

  useEffect(() => {
    if (!isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    const localDesigner = loadSheetDesignerConfig();
    setCustomSheetCss(localDesigner.css.specialist || "");
    setSheetTemplate(localDesigner.templates.specialist);
  }, []);

  useEffect(() => {
    if (!designerSettingsQuery.data?.value) return;
    const merged = coerceSheetDesignerConfig(designerSettingsQuery.data.value);
    setCustomSheetCss(merged.css.specialist || "");
    setSheetTemplate(merged.templates.specialist);
    saveSheetDesignerConfig(merged);
  }, [designerSettingsQuery.data]);

  if (!isAuthenticated) return null;

  const mobileSheetModeRaw = (mobileSheetModeQuery.data as any)?.value;
  const mobileSheetModeEnabled = Boolean(
    mobileSheetModeRaw && typeof mobileSheetModeRaw === "object"
      ? mobileSheetModeRaw.enabled
      : mobileSheetModeRaw,
  );

  const patientQuery = trpc.patient.getPatient.useQuery(initialPatientId ?? 0, {
    enabled: Boolean(initialPatientId),
    refetchOnWindowFocus: false,
  });
  const examinationsQuery = trpc.medical.getExaminationsByPatient.useQuery(
    { patientId: initialPatientId ?? 0 },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const visitsQuery = trpc.medical.getVisitsByPatient.useQuery(
    { patientId: initialPatientId ?? 0 },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const reportsQuery = trpc.medical.getMedicalReportsByPatient.useQuery(
    { patientId: initialPatientId ?? 0 },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const prescriptionsQuery = trpc.medical.getPrescriptionsWithItemsByPatient.useQuery(
    { patientId: initialPatientId ?? 0 },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const pentacamQuery = trpc.medical.getPentacamMeasurementsByPatient.useQuery(
    { patientId: initialPatientId ?? 0, limit: 10 },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const sheetQuery = trpc.medical.getSheetEntry.useQuery(
    { patientId: initialPatientId ?? 0, sheetType: "specialist" },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const examinationStateQuery = trpc.medical.getPatientPageState.useQuery(
    { patientId: initialPatientId ?? 0, page: "examination" },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );

  useEffect(() => {
    if (!initialPatientId) return;
    const socket = connectSheetUpdates({
      patientId: initialPatientId,
      onUpdate: () => {
        Promise.all([
          sheetQuery.refetch(),
          patientQuery.refetch(),
          examinationsQuery.refetch(),
          visitsQuery.refetch(),
          reportsQuery.refetch(),
          prescriptionsQuery.refetch(),
          pentacamQuery.refetch(),
        ]);
      },
    });
    return () => socket?.close();
  }, [initialPatientId]);

  const saveSheetMutation = trpc.medical.saveSheetEntry.useMutation({
    onSuccess: () => { toast.success("تم الحفظ"); },
  });

  const formatDate = (value?: string | Date | null) => {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.valueOf())) return "";
    return date.toISOString().split("T")[0];
  };

  const handleSelectPatient = (patient: {
    id: number;
    fullName: string;
    patientCode?: string | null;
    phone?: string | null;
    age?: number | null;
    dateOfBirth?: string | Date | null;
    address?: string | null;
    occupation?: string | null;
  }) => {
    setFormData((prev) => ({
      ...prev,
      patientName: patient.fullName ?? "",
      phone: patient.phone ?? "",
      age: patient.age != null ? String(patient.age) : "",
      dateOfBirth: formatDate(patient.dateOfBirth),
      address: patient.address ?? "",
      patientCode: patient.patientCode ?? "",
      job: patient.occupation ?? "",
    }));
    if (patient.id) setLocation(`/sheets/specialist/${patient.id}`);
  };

  useEffect(() => {
    if (!patientQuery.data) return;
    const patient = patientQuery.data as any;
    setFormData((prev) => ({
      ...prev,
      patientName: patient.fullName ?? "",
      phone: patient.phone ?? "",
      age: patient.age != null ? String(patient.age) : "",
      dateOfBirth: formatDate(patient.dateOfBirth),
      address: patient.address ?? "",
      patientCode: patient.patientCode ?? "",
      job: patient.occupation ?? "",
    }));
  }, [patientQuery.data]);

  useEffect(() => {
    if (!sheetQuery.data) return;
    try {
      const parsed = JSON.parse(sheetQuery.data);
      if (parsed.formData) {
        setFormData((prev) => ({
          ...prev,
          ...parsed.formData,
          patientName: prev.patientName || parsed.formData.patientName,
          phone: prev.phone || parsed.formData.phone,
          age: prev.age || parsed.formData.age,
          dateOfBirth: prev.dateOfBirth || parsed.formData.dateOfBirth,
          address: prev.address || parsed.formData.address,
        }));
      }
      if (parsed.examData?.autorefraction) {
        const auto = parsed.examData.autorefraction;
        setFormData((prev) => ({
          ...prev,
          ucvaOD: auto.od?.ucva || prev.ucvaOD,
          ucvaOS: auto.os?.ucva || prev.ucvaOS,
          bcvaOD: auto.od?.bcva || prev.bcvaOD,
          bcvaOS: auto.os?.bcva || prev.bcvaOS,
          refractionOD: { s: auto.od?.s || prev.refractionOD.s, c: auto.od?.c || prev.refractionOD.c, a: auto.od?.axis || prev.refractionOD.a },
          refractionOS: { s: auto.os?.s || prev.refractionOS.s, c: auto.os?.c || prev.refractionOS.c, a: auto.os?.axis || prev.refractionOS.a },
          iopOD: auto.od?.iop || prev.iopOD,
          iopOS: auto.os?.iop || prev.iopOS,
        }));
      }
      if (parsed.signatures) {
        setSignatures({
          reception: parsed.signatures.reception ?? "",
          nurse: parsed.signatures.nurse ?? "",
          technician: parsed.signatures.technician ?? "",
          doctor: parsed.signatures.doctor ?? "",
        });
      }
    } catch { /* ignore */ }
  }, [sheetQuery.data]);

  useEffect(() => {
    if (!examinationsQuery.data || examinationsQuery.data.length === 0) return;
    const latestExam = examinationsQuery.data[0] as any;
    if (!latestExam.autorefraction) return;
    const auto = latestExam.autorefraction;
    setFormData((prev) => ({
      ...prev,
      ucvaOD: auto.od?.ucva || prev.ucvaOD,
      ucvaOS: auto.os?.ucva || prev.ucvaOS,
      bcvaOD: auto.od?.bcva || prev.bcvaOD,
      bcvaOS: auto.os?.bcva || prev.bcvaOS,
      refractionOD: { s: auto.od?.s || prev.refractionOD.s, c: auto.od?.c || prev.refractionOD.c, a: auto.od?.axis || prev.refractionOD.a },
      refractionOS: { s: auto.os?.s || prev.refractionOS.s, c: auto.os?.c || prev.refractionOS.c, a: auto.os?.axis || prev.refractionOS.a },
      iopOD: auto.od?.iop || prev.iopOD,
      iopOS: auto.os?.iop || prev.iopOS,
    }));
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
    setSignatures((prev) => ({
      ...prev,
      reception: role === "reception" ? fullName : prev.reception,
      nurse: role === "nurse" ? fullName : prev.nurse,
      technician: role === "technician" ? fullName : prev.technician,
      doctor: role === "doctor" ? prev.doctor || fullName : prev.doctor,
    }));
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
        pentacam: existing.examData?.pentacam ?? {},
      };
      await saveSheetMutation.mutateAsync({
        patientId: initialPatientId,
        sheetType: "specialist",
        content: JSON.stringify({ ...existing, formData: { ...(existing.formData ?? {}), ...formData }, examData: mergedExamData }),
      });
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "حدث خطأ أثناء الحفظ"));
    }
  };

  useEffect(() => {
    if (!initialPatientId) return;
    const timeout = setTimeout(() => { handleSaveSheet(); }, 600);
    return () => clearTimeout(timeout);
  }, [formData, initialPatientId]);

  const handlePrint = () => {
    void printOrExportPdf(
      `${String(formData.patientName || formData.patientCode || initialPatientId || "specialist-sheet").trim()}.pdf`,
      { forceBrowserPrint: true },
    );
  };

  // ─── Style helpers ────────────────────────────────────────────────────────────
  const ctd = "p-1.5 border border-[#c3c6d6] text-center";
  const inp = "w-full text-center bg-transparent border-0 border-b border-solid border-[#c3c6d6] focus:outline-none focus:border-[#003d9b] py-0.5 text-sm font-mono";
  const sectionHeader = "flex items-center gap-2 px-3 py-1.5 bg-[#003d9b] text-white text-xs font-bold uppercase tracking-wider rounded-t-md";
  const today = new Date().toLocaleDateString("en-GB");

  return (
    <div
      className={`min-h-screen bg-[#F8F9FB] specialist-page-root ${mobileSheetModeEnabled && !printMode.printView ? "mobile-sheet-mode" : ""}`}
      dir="ltr"
    >
      <style>{`
        ${customSheetCss}
        .specialist-sheet, .specialist-sheet * { font-weight: 400 !important; text-decoration: none !important; }
        .specialist-sheet th { font-weight: 700 !important; }
        @media print {
          /* ── Page setup ── */
          @page { size: A4 portrait; margin: 10mm 8mm 10mm 8mm; }
          @page :first { margin-top: 6mm; }

          /* ── Root reset ── */
          html, body {
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          #root, .specialist-page-root {
            width: 210mm !important;
            max-width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            max-height: none !important;
          }

          /* ── Sheet container ── */
          .print-page-center-a4 { width: 210mm !important; margin: 0 !important; }
          .specialist-sheet {
            width: 210mm !important;
            max-width: 210mm !important;
            height: auto !important;
            box-sizing: border-box !important;
            padding: 5mm 6mm !important;
            gap: 6px !important;
            font-size: 88% !important;
            line-height: 1.25 !important;
            border-radius: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
          }

          /* ── Color preservation ── */
          .specialist-sheet [class*="bg-\["] {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .specialist-sheet [class*="bg-\[#003d9b"] {
            background-color: #003d9b !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .specialist-sheet [class*="bg-\[#ba1a1a"] {
            background-color: #ba1a1a !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .specialist-sheet [class*="bg-\[#e7e8ea"],
          .specialist-sheet [class*="bg-\[#f3f4f6"],
          .specialist-sheet [class*="bg-\[#F8F9FB"] {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* ── Page-break control ── */
          .specialist-sheet section {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .specialist-sheet tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .specialist-sheet thead {
            display: table-header-group !important;
          }
          .print-specialist-signatures {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .specialist-sheet footer {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .specialist-sheet p, .specialist-sheet li {
            orphans: 3 !important;
            widows: 3 !important;
          }

          /* ── Typography ── */
          .specialist-sheet input:not([type="checkbox"]):not([type="radio"]),
          .specialist-sheet textarea {
            border: 0 !important;
            border-bottom: 1px solid #c3c6d6 !important;
            box-shadow: none !important;
            outline: 0 !important;
            background: transparent !important;
            font-size: 10px !important;
            line-height: 1.25 !important;
          }
          .specialist-sheet table { font-size: 9.5px !important; }
          .specialist-sheet .gap-4 { gap: 4px !important; }
          .specialist-sheet .p-6 { padding: 4mm !important; }
          .specialist-sheet .p-3 { padding: 2px !important; }

          /* ── Grid layouts ── */
          .print-specialist-visual-grid { display: grid !important; grid-template-columns: minmax(0, 7fr) minmax(0, 5fr) !important; }
          .print-specialist-footer-grid { display: grid !important; grid-template-columns: minmax(0, 8fr) minmax(0, 4fr) !important; }
          .print-specialist-signatures { display: grid !important; grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }

          /* ── Borders ── */
          .specialist-sheet [class*="border-\[#c3c6d6"] { border-color: #c3c6d6 !important; }
          .specialist-sheet [class*="border-\[#003d9b"] { border-color: #003d9b !important; }
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
        <PrintPreviewBanner title="" subtitle={formData.patientName || undefined} onPrint={handlePrint} />
      )}

      <div className="py-6 print:py-0 print-page-center-a4">
        <div
          data-mobile-pdf-root
          className={`specialist-sheet bg-white text-[#191c1e] font-sans p-6 border border-[#c3c6d6] shadow-md flex flex-col gap-4 w-[210mm] max-w-full mx-auto rounded-lg ${printMode.printView ? "hidden print:flex" : ""}`}
          dir="ltr"
        >
          {/* ── HEADER ── */}
          <header className="flex items-start justify-between border-b-2 border-[#003d9b] pb-3">
            <div className="flex-1">
              <div className="text-xl font-extrabold text-[#003d9b] leading-tight">{BRAND_NAME_EN}</div>
              <div className="text-sm text-[#434654]">Laser &amp; Vision Correction</div>
              <div className="text-xs text-[#737685] mt-0.5">SPECIALIST EXAMINATION</div>
            </div>
            <div className="text-center px-4">
              <div className="text-base font-bold text-[#003d9b]">Specialist Sheet</div>
              <div className="text-sm text-[#434654]"></div>
              <div className="text-xs text-[#737685] mt-0.5">{formData.examinationDate ? new Date(formData.examinationDate).toLocaleDateString("en-GB") : today}</div>
            </div>
            <div className="text-right text-xs text-[#434654] space-y-0.5">
              {formData.patientName && <div className="font-bold text-sm text-[#191c1e]">{formData.patientName}</div>}
              {formData.patientCode && <div className="text-[#737685]">ID: {formData.patientCode}</div>}
            </div>
          </header>

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
                  <input className="w-full border-b border-[#c3c6d6] bg-transparent focus:outline-none focus:border-[#003d9b] text-sm font-semibold text-[#003d9b]" dir="rtl" value={formData.patientName} onChange={(e) => setFormData((p) => ({ ...p, patientName: e.target.value }))} />
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
                  <input dir="ltr" className="w-full border-b border-[#c3c6d6] bg-transparent focus:outline-none focus:border-[#003d9b] text-sm min-h-[22px]" value={formData.job} onChange={(e) => setFormData((p) => ({ ...p, job: e.target.value }))} />
                </div>
                <div>
                  <span className="text-xs text-[#434654] font-semibold block mb-0.5">Exam Date</span>
                  <DateInput className="h-6 w-full border-b border-[#c3c6d6] bg-transparent focus:outline-none focus:border-[#003d9b] rounded-none px-0 text-sm" value={formData.examinationDate} onChange={(e) => setFormData((p) => ({ ...p, examinationDate: e.target.value }))} />
                </div>
                <div>
                  <span className="text-xs text-[#434654] font-semibold block mb-0.5">Physician</span>
                  <input dir="ltr" className="w-full border-b border-[#c3c6d6] bg-transparent focus:outline-none focus:border-[#003d9b] text-sm text-[#003d9b] font-semibold min-h-[22px]" value={signatures.doctor} onChange={(e) => setSignatures((p) => ({ ...p, doctor: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <span className="text-xs text-[#434654] font-semibold block mb-0.5">Address</span>
                  <input dir="rtl" className="w-full border-b border-[#c3c6d6] bg-transparent focus:outline-none focus:border-[#003d9b] text-sm min-h-[22px]" value={formData.address} onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))} />
                </div>
              </div>
            </div>
          </section>

          {/* ── VISUAL ACUITY + TEAR FILM ── */}
          <section className="print-specialist-visual-grid grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7">
              <div className={sectionHeader}>
                <Eye className="h-3.5 w-3.5" />
                <span>Visual Acuity &amp; IOP</span>
              </div>
              <div className="border border-[#c3c6d6] border-t-0 rounded-b-md overflow-hidden">
                <table className="w-full text-center border-collapse">
                  <thead className="bg-[#003d9b] text-white text-xs font-bold uppercase">
                    <tr>
                      <th className="p-2 border border-[#003d9b]/40">Eye</th>
                      <th className="p-2 border border-[#003d9b]/40">UCVA</th>
                      <th className="p-2 border border-[#003d9b]/40">BCVA</th>
                      <th className="p-2 border border-[#003d9b]/40">IOP (mmHg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-[#003d9b]/5">
                      <td className="p-2 border border-[#c3c6d6] font-bold text-[#003d9b]">OD (Right)</td>
                      <td className={ctd}><input className={inp} value={formData.ucvaOD} onChange={(e) => setFormData((p) => ({ ...p, ucvaOD: e.target.value }))} /></td>
                      <td className={ctd}><input className={inp} value={formData.bcvaOD} onChange={(e) => setFormData((p) => ({ ...p, bcvaOD: e.target.value }))} /></td>
                      <td className={ctd}><input className={inp} value={formData.iopOD} onChange={(e) => setFormData((p) => ({ ...p, iopOD: e.target.value }))} /></td>
                    </tr>
                    <tr className="bg-[#f3f4f6]">
                      <td className="p-2 border border-[#c3c6d6] font-bold text-[#526069]">OS (Left)</td>
                      <td className={ctd}><input className={inp} value={formData.ucvaOS} onChange={(e) => setFormData((p) => ({ ...p, ucvaOS: e.target.value }))} /></td>
                      <td className={ctd}><input className={inp} value={formData.bcvaOS} onChange={(e) => setFormData((p) => ({ ...p, bcvaOS: e.target.value }))} /></td>
                      <td className={ctd}><input className={inp} value={formData.iopOS} onChange={(e) => setFormData((p) => ({ ...p, iopOS: e.target.value }))} /></td>
                    </tr>
                  </tbody>
                </table>
                <div className="p-2 flex items-center justify-center gap-8 text-sm font-bold border-t border-[#c3c6d6] bg-[#f8f9fb]">
                  <span className="text-[#003d9b] uppercase text-xs">Dominant Eye:</span>
                  <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="radio" name="dominant" className="accent-[#003d9b]" /> OD (Right)</label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="radio" name="dominant" className="accent-[#003d9b]" /> OS (Left)</label>
                </div>
              </div>
            </div>
            <div className="lg:col-span-5">
              <div className={sectionHeader}>
                <span>Tear Film Examination</span>
              </div>
              <div className="border border-[#c3c6d6] border-t-0 rounded-b-md overflow-hidden">
                <table className="w-full border-collapse">
                  <tbody>
                    {["BUT (sec)", "Schirmer Test (mm)", "Lid Margin"].map((label) => (
                      <tr key={label} className="border-b border-[#c3c6d6] last:border-0">
                        <td className="p-2 bg-[#f3f4f6] text-xs font-semibold text-[#434654] w-1/2">{label}</td>
                        <td className="p-2"><input className={inp} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ── CLINICAL REFRACTION ── */}
          <section>
            <div className={sectionHeader}>
              <Stethoscope className="h-3.5 w-3.5" />
              <span>Clinical Refraction</span>
            </div>
            <div className="border border-[#c3c6d6] border-t-0 rounded-b-md overflow-hidden">
              <table className="w-full text-center border-collapse">
                <thead className="bg-[#e7e8ea] text-xs font-bold uppercase">
                  <tr>
                    <th className={`${ctd} w-40`} rowSpan={2}>Measurement</th>
                    <th className={`${ctd} text-[#003d9b]`} colSpan={3}>OD — Right Eye</th>
                    <th className={`${ctd} text-[#526069]`} colSpan={3}>OS — Left Eye</th>
                  </tr>
                  <tr>
                    <th className={ctd}>Sphere (S)</th><th className={ctd}>Cylinder (C)</th><th className={ctd}>Axis (A)</th>
                    <th className={ctd}>Sphere (S)</th><th className={ctd}>Cylinder (C)</th><th className={ctd}>Axis (A)</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  <tr className="bg-[#003d9b]/5">
                    <td className={`${ctd} text-left bg-[#f3f4f6] text-xs font-semibold`}>Refraction</td>
                    <td className={ctd}><input className={inp} value={formData.refractionOD.s} onChange={(e) => setFormData((p) => ({ ...p, refractionOD: { ...p.refractionOD, s: e.target.value } }))} /></td>
                    <td className={ctd}><input className={inp} value={formData.refractionOD.c} onChange={(e) => setFormData((p) => ({ ...p, refractionOD: { ...p.refractionOD, c: e.target.value } }))} /></td>
                    <td className={ctd}><input className={inp} value={formData.refractionOD.a} onChange={(e) => setFormData((p) => ({ ...p, refractionOD: { ...p.refractionOD, a: e.target.value } }))} /></td>
                    <td className={ctd}><input className={inp} value={formData.refractionOS.s} onChange={(e) => setFormData((p) => ({ ...p, refractionOS: { ...p.refractionOS, s: e.target.value } }))} /></td>
                    <td className={ctd}><input className={inp} value={formData.refractionOS.c} onChange={(e) => setFormData((p) => ({ ...p, refractionOS: { ...p.refractionOS, c: e.target.value } }))} /></td>
                    <td className={ctd}><input className={inp} value={formData.refractionOS.a} onChange={(e) => setFormData((p) => ({ ...p, refractionOS: { ...p.refractionOS, a: e.target.value } }))} /></td>
                  </tr>
                  <tr className="bg-[#f3f4f6]">
                    <td className={`${ctd} text-left bg-[#f3f4f6] text-xs font-semibold`}>Fundus</td>
                    <td className={ctd} colSpan={3}><input className={inp} /></td>
                    <td className={ctd} colSpan={3}><input className={inp} /></td>
                  </tr>
                  <tr>
                    <td className={`${ctd} text-left bg-[#f3f4f6] text-xs font-semibold`}>Keratometry</td>
                    <td className={ctd} colSpan={3}><input className={inp} /></td>
                    <td className={ctd} colSpan={3}><input className={inp} /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ── SLIT LAMP EXAM ── */}
          <section>
            <div className={sectionHeader}>
              <FileText className="h-3.5 w-3.5" />
              <span>Slit Lamp Examination</span>
            </div>
            <div className="border border-[#c3c6d6] border-t-0 rounded-b-md overflow-hidden">
              <table className="w-full text-center border-collapse text-xs">
                <thead className="bg-[#e7e8ea] font-bold uppercase">
                  <tr>
                    <th className={ctd}>Structure</th>
                    <th className={ctd}>OD (Right)</th>
                    <th className={ctd}>OS (Left)</th>
                  </tr>
                </thead>
                <tbody>
                  {["Cornea", "Anterior Chamber", "Iris", "Lens", "Vitreous", "Fundus / Disc"].map((row, i) => (
                    <tr key={row} className={i % 2 === 0 ? "bg-white" : "bg-[#f8f9fb]"}>
                      <td className={`${ctd} text-left font-semibold text-[#434654] bg-[#f3f4f6] w-1/4`}>{row}</td>
                      <td className={ctd}><input className={inp} /></td>
                      <td className={ctd}><input className={inp} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── NOTES + FINAL DECISION ── */}
          <section className="print-specialist-footer-grid grid grid-cols-1 lg:grid-cols-12 gap-4">
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
          <footer className="print-specialist-signatures border-t-2 border-[#003d9b] pt-4 mt-1">
            <div className="grid grid-cols-4 gap-6">
              {[
                { label: "Nursing", val: signatures.nurse, isDoctor: false },
                { label: "Physician", val: signatures.doctor, isDoctor: true },
                { label: "Optometrist", val: signatures.technician, isDoctor: false },
                { label: "Reception", val: signatures.reception, isDoctor: false },
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
