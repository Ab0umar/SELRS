import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Printer } from "lucide-react";
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
import SheetCenterHeader from "@/components/SheetCenterHeader";
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
  const [printOffsetXmm, setPrintOffsetXmm] = useState(0);
  const [printOffsetYmm, setPrintOffsetYmm] = useState(0);
  const [printScale, setPrintScale] = useState(1);
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
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    const localDesigner = loadSheetDesignerConfig();
    setCustomSheetCss(localDesigner.css.specialist || "");
    setSheetTemplate(localDesigner.templates.specialist);
    setPrintOffsetXmm(localDesigner.layout.specialist.offsetXmm);
    setPrintOffsetYmm(localDesigner.layout.specialist.offsetYmm);
    setPrintScale(localDesigner.layout.specialist.scale);
  }, []);

  useEffect(() => {
    if (!designerSettingsQuery.data?.value) return;
    const merged = coerceSheetDesignerConfig(designerSettingsQuery.data.value);
    setCustomSheetCss(merged.css.specialist || "");
    setSheetTemplate(merged.templates.specialist);
    setPrintOffsetXmm(merged.layout.specialist.offsetXmm);
    setPrintOffsetYmm(merged.layout.specialist.offsetYmm);
    setPrintScale(merged.layout.specialist.scale);
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
  // Fetch all patient-file data sources instead of sheet-specific data
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
  const prescriptionsQuery =
    trpc.medical.getPrescriptionsWithItemsByPatient.useQuery(
      { patientId: initialPatientId ?? 0 },
      { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
    );
  const pentacamQuery = trpc.medical.getPentacamMeasurementsByPatient.useQuery(
    { patientId: initialPatientId ?? 0, limit: 10 },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  // Keep sheetQuery for backward compatibility
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
        // Refetch all patient-file data sources
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
  }, [
    initialPatientId,
    sheetQuery,
    patientQuery,
    examinationsQuery,
    visitsQuery,
    reportsQuery,
    prescriptionsQuery,
    pentacamQuery,
  ]);
  const saveSheetMutation = trpc.medical.saveSheetEntry.useMutation({
    onSuccess: () => {
      toast.success("تم الحفظ");
    },
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
    if (patient.id) {
      setLocation(`/sheets/specialist/${patient.id}`);
    }
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
          // keep patient info from DB if present
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
          ucvaOD: auto.od?.ucva ? auto.od.ucva : prev.ucvaOD,
          ucvaOS: auto.os?.ucva ? auto.os.ucva : prev.ucvaOS,
          bcvaOD: auto.od?.bcva ? auto.od.bcva : prev.bcvaOD,
          bcvaOS: auto.os?.bcva ? auto.os.bcva : prev.bcvaOS,
          refractionOD: {
            s: auto.od?.s ? auto.od.s : prev.refractionOD.s,
            c: auto.od?.c ? auto.od.c : prev.refractionOD.c,
            a: auto.od?.axis ? auto.od.axis : prev.refractionOD.a,
          },
          refractionOS: {
            s: auto.os?.s ? auto.os.s : prev.refractionOS.s,
            c: auto.os?.c ? auto.os.c : prev.refractionOS.c,
            a: auto.os?.axis ? auto.os.axis : prev.refractionOS.a,
          },
          iopOD: auto.od?.iop ? auto.od.iop : prev.iopOD,
          iopOS: auto.os?.iop ? auto.os.iop : prev.iopOS,
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
    } catch {
      // ignore malformed data
    }
  }, [sheetQuery.data]);

  useEffect(() => {
    if (!examinationsQuery.data || examinationsQuery.data.length === 0) return;
    const latestExam = examinationsQuery.data[0] as any;
    if (!latestExam.autorefraction) return;
    const auto = latestExam.autorefraction;
    setFormData((prev) => ({
      ...prev,
      ucvaOD: auto.od?.ucva ? auto.od.ucva : prev.ucvaOD,
      ucvaOS: auto.os?.ucva ? auto.os.ucva : prev.ucvaOS,
      bcvaOD: auto.od?.bcva ? auto.od.bcva : prev.bcvaOD,
      bcvaOS: auto.os?.bcva ? auto.os.bcva : prev.bcvaOS,
      refractionOD: {
        s: auto.od?.s ? auto.od.s : prev.refractionOD.s,
        c: auto.od?.c ? auto.od.c : prev.refractionOD.c,
        a: auto.od?.axis ? auto.od.axis : prev.refractionOD.a,
      },
      refractionOS: {
        s: auto.os?.s ? auto.os.s : prev.refractionOS.s,
        c: auto.os?.c ? auto.os.c : prev.refractionOS.c,
        a: auto.os?.axis ? auto.os.axis : prev.refractionOS.a,
      },
      iopOD: auto.od?.iop ? auto.od.iop : prev.iopOD,
      iopOS: auto.os?.iop ? auto.os.iop : prev.iopOS,
    }));
  }, [examinationsQuery.data]);

  useEffect(() => {
    const stateData = (examinationStateQuery.data as any)?.data;
    if (!stateData) return;
    const doctorFromState =
      String(stateData.doctorName ?? "").trim() ||
      String(stateData.signatures?.doctor ?? "").trim();
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
    if (!initialPatientId) {
      toast.error("يرجى اختيار المريض أولاً");
      return;
    }
    try {
      const existing = (() => {
        try {
          return sheetQuery.data ? JSON.parse(sheetQuery.data) : {};
        } catch {
          return {};
        }
      })();
      const pickValue = (next: string, prev?: string) =>
        next && next.trim() ? next : prev;
      const mergedExamData = {
        autorefraction: {
          od: {
            ...(existing.examData?.autorefraction?.od ?? {}),
            ucva: pickValue(
              formData.ucvaOD,
              existing.examData?.autorefraction?.od?.ucva,
            ),
            bcva: pickValue(
              formData.bcvaOD,
              existing.examData?.autorefraction?.od?.bcva,
            ),
            s: pickValue(
              formData.refractionOD?.s,
              existing.examData?.autorefraction?.od?.s,
            ),
            c: pickValue(
              formData.refractionOD?.c,
              existing.examData?.autorefraction?.od?.c,
            ),
            axis: pickValue(
              formData.refractionOD?.a,
              existing.examData?.autorefraction?.od?.axis,
            ),
            iop: pickValue(
              formData.iopOD,
              existing.examData?.autorefraction?.od?.iop,
            ),
          },
          os: {
            ...(existing.examData?.autorefraction?.os ?? {}),
            ucva: pickValue(
              formData.ucvaOS,
              existing.examData?.autorefraction?.os?.ucva,
            ),
            bcva: pickValue(
              formData.bcvaOS,
              existing.examData?.autorefraction?.os?.bcva,
            ),
            s: pickValue(
              formData.refractionOS?.s,
              existing.examData?.autorefraction?.os?.s,
            ),
            c: pickValue(
              formData.refractionOS?.c,
              existing.examData?.autorefraction?.os?.c,
            ),
            axis: pickValue(
              formData.refractionOS?.a,
              existing.examData?.autorefraction?.os?.axis,
            ),
            iop: pickValue(
              formData.iopOS,
              existing.examData?.autorefraction?.os?.iop,
            ),
          },
        },
        pentacam: existing.examData?.pentacam ?? {},
      };
      await saveSheetMutation.mutateAsync({
        patientId: initialPatientId,
        sheetType: "specialist",
        content: JSON.stringify({
          ...existing,
          formData: { ...(existing.formData ?? {}), ...formData },
          examData: mergedExamData,
        }),
      });
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "حدث خطأ أثناء الحفظ"));
    }
  };

  useEffect(() => {
    if (!initialPatientId) return;
    const timeout = setTimeout(() => {
      handleSaveSheet();
    }, 600);
    return () => clearTimeout(timeout);
  }, [formData, initialPatientId]);

  const handlePrint = () => {
    void printOrExportPdf(
      `${String(formData.patientName || formData.patientCode || initialPatientId || "specialist-sheet").trim()}.pdf`,
      { forceBrowserPrint: true },
    );
  };

  const inp =
    "w-full text-center bg-transparent border-0 border-b border-solid border-[#737685] focus:outline-none focus:border-[#003d9b] py-1 text-sm";
  const ctd = "p-1 border border-[#c3c6d6]";

  return (
    <div
      className={`min-h-screen bg-[#dde1e7] sheet-layout specialist-page-root ${mobileSheetModeEnabled && !printMode.printView ? "mobile-sheet-mode" : ""}`}
      dir="rtl"
    >
      <style>{`
        ${customSheetCss}
        .refraction-table-center th,
        .refraction-table-center td {
          text-align: center !important;
        }
        .refraction-table-center input {
          text-align: center !important;
        }
        .specialist-sheet, .specialist-sheet * {
          font-weight: 400 !important;
          text-decoration: none !important;
        }
        .specialist-sheet th { font-weight: 700 !important; }
        .specialist-sheet .border-b,
        .specialist-sheet .border-b-2 {
          border-bottom: none !important;
        }
        @media print {
          .print-page-center-a5 { min-height: 148mm; display: flex; align-items: center; justify-content: center; }
          @page { size: A5 landscape; margin: 0; }
          body { background: white !important; }
          /* the shared .sheet-layout print rule clips this page's fixed-width sheet — undo it here */
          .specialist-page-root.sheet-layout {
            overflow: visible !important;
            max-height: none !important;
            font-size: 100% !important;
          }
          .specialist-sheet {
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: 147mm !important;
            box-sizing: border-box !important;
            margin: 0 auto !important;
            padding: 5mm !important;
            gap: 6px !important;
            font-size: 92% !important;
            line-height: 1.15 !important;
            overflow: hidden !important;
          }
          .specialist-sheet section,
          .specialist-sheet footer,
          .specialist-sheet table,
          .specialist-sheet tr,
          .specialist-sheet td,
          .specialist-sheet th {
            page-break-inside: avoid !important;
          }
          .specialist-sheet table { font-size: 10px !important; }
          .specialist-sheet input,
          .specialist-sheet select {
            font-size: 10px !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }
          .specialist-sheet input:not([type="checkbox"]):not([type="radio"]),
          .specialist-sheet textarea {
            border: 0 !important;
            border-bottom: 0 !important;
            box-shadow: none !important;
            outline: 0 !important;
            background: transparent !important;
            text-decoration: none !important;
            line-height: 1.15 !important;
          }
          .specialist-sheet .sheet-center-header {
            padding-bottom: 3px !important;
            margin-bottom: 3px !important;
          }
          .specialist-sheet .p-8 { padding: 0 !important; }
          .specialist-sheet .p-4 { padding: 4px !important; }
          .specialist-sheet .gap-8 { gap: 10px !important; }
          .specialist-sheet .gap-6 { gap: 8px !important; }
          .specialist-sheet .gap-x-8 { column-gap: 10px !important; }
          .specialist-sheet .gap-y-3 { row-gap: 3px !important; }
          .specialist-sheet .pt-6 { padding-top: 6px !important; }
          .specialist-sheet .pt-4 { padding-top: 5px !important; }
          .specialist-sheet .mt-3 { margin-top: 4px !important; }
          .specialist-sheet .mb-3 { margin-bottom: 4px !important; }
          .specialist-sheet .h-9 { height: 16px !important; }
          .specialist-sheet .h-8 { height: 13px !important; }
          .specialist-sheet .h-6 { height: 11px !important; }
          .specialist-sheet .space-y-6 > * + * { margin-top: 6px !important; }
          .specialist-sheet .space-y-4 > * + * { margin-top: 4px !important; }
          .print-specialist-patient-grid {
            display: flex !important;
            flex-wrap: wrap !important;
            column-gap: 5mm !important;
            row-gap: 1mm !important;
          }
          .print-specialist-visual-grid {
            display: grid !important;
            grid-template-columns: minmax(0, 7fr) minmax(0, 5fr) !important;
          }
          .print-specialist-footer-grid {
            display: grid !important;
            grid-template-columns: minmax(0, 8fr) minmax(0, 4fr) !important;
          }
          .print-specialist-signatures {
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          }
        }
      `}</style>
      {/* Header */}
      <header
        className={`sticky top-0 z-50 print:hidden flex justify-between items-center px-6 py-2 bg-[#f8f9fb] border-b border-[#c3c6d6] ${printMode.printView ? "hidden" : ""}`}
        dir="ltr"
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" type="button" onClick={() => goBack()}>
            رجوع
          </Button>
          <span className="text-xl font-bold text-[#003d9b]">{BRAND_NAME_EN}</span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            className="bg-[#003d9b] text-white font-bold px-4 py-2 rounded hover:opacity-90 active:scale-95"
            onClick={handleSaveSheet}
            disabled={saveSheetMutation.isPending}
            type="button"
          >
            {saveSheetMutation.isPending ? "حفظ..." : "حفظ"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-[#003d9b] text-[#003d9b] font-bold px-4 py-2 rounded hover:bg-[#003d9b]/5"
            onClick={handlePrint}
            type="button"
          >
            <Printer className="h-4 w-4 mr-1" /> طباعة
          </Button>
        </div>
      </header>

      {printMode.printView && (
        <PrintPreviewBanner
          title="شيت الأخصائي"
          subtitle={formData.patientName || undefined}
          onPrint={handlePrint}
        />
      )}

      {/* Main Content */}
      <div className="py-8 print:py-0 print-page-center-a5">
        <div data-mobile-pdf-root className={`specialist-sheet bg-white text-[#191c1e] font-sans p-8 border border-[#c3c6d6] shadow-sm flex flex-col gap-5 w-[210mm] max-w-full mx-auto ${printMode.printView ? "hidden print:flex" : ""}`} dir="ltr">
          {/* Header */}
          <SheetCenterHeader
            titleEn="Specialist Sheet"
            titleAr="شيت الأخصائي"
            date={formData.examinationDate}
          />

          {/* Patient Info */}
          <section className="print-specialist-patient-grid p-4 bg-[#f3f4f6] rounded-xl border border-[#c3c6d6] flex flex-wrap items-center gap-x-6 gap-y-2 text-sm" dir="rtl">
            <label className="inline-flex items-center gap-1 whitespace-nowrap"><span className="font-bold text-[#434654]">الاسم:</span>
              <input className="w-44 font-semibold text-[#003d9b] bg-transparent border-0 border-b border-[#c3c6d6] focus:outline-none text-right" dir="rtl" value={formData.patientName} onChange={(e) => setFormData((p) => ({ ...p, patientName: e.target.value }))} /></label>
            <label className="inline-flex items-center gap-1 whitespace-nowrap"><span className="font-bold text-[#434654]">السن:</span>
              <input className="w-12 font-semibold bg-transparent border-0 border-b border-[#c3c6d6] focus:outline-none text-right" dir="rtl" value={formData.age} onChange={(e) => setFormData((p) => ({ ...p, age: e.target.value }))} /></label>
            <span className="inline-flex items-center gap-1 whitespace-nowrap"><span className="font-bold text-[#434654]">تاريخ الميلاد:</span>
              <span className="min-w-[70px] px-1 border-b border-[#c3c6d6] text-right">{formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString("en-GB") : ""}</span></span>
            <label className="inline-flex items-center gap-1 whitespace-nowrap"><span className="font-bold text-[#434654]">العنوان:</span>
              <input className="w-36 font-semibold bg-transparent border-0 border-b border-[#c3c6d6] focus:outline-none text-right" dir="rtl" value={formData.address} onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))} /></label>
            <label className="inline-flex items-center gap-1 whitespace-nowrap"><span className="font-bold text-[#434654]">التليفون:</span>
              <input className="w-28 font-semibold bg-transparent border-0 border-b border-[#c3c6d6] focus:outline-none text-right" dir="rtl" value={formData.phone} onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))} /></label>
            <label className="inline-flex items-center gap-1 whitespace-nowrap"><span className="font-bold text-[#434654]">تاريخ الفحص:</span>
              <DateInput className="h-6 w-28 font-semibold bg-transparent border-0 border-b border-[#c3c6d6] rounded-none px-1 text-right" value={formData.examinationDate} onChange={(e) => setFormData((p) => ({ ...p, examinationDate: e.target.value }))} /></label>
            <label className="inline-flex items-center gap-1 whitespace-nowrap"><span className="font-bold text-[#434654]">المهنة:</span>
              <input className="w-28 font-semibold bg-transparent border-0 border-b border-[#c3c6d6] focus:outline-none text-right" dir="rtl" value={formData.job} onChange={(e) => setFormData((p) => ({ ...p, job: e.target.value }))} /></label>
            <label className="inline-flex items-center gap-1 whitespace-nowrap"><span className="font-bold text-[#434654]">كود العميل:</span>
              <input className="w-24 font-semibold text-[#526069] bg-transparent border-0 border-b border-[#c3c6d6] focus:outline-none text-right" dir="rtl" value={formData.patientCode} onChange={(e) => setFormData((p) => ({ ...p, patientCode: e.target.value }))} /></label>
            <label className="inline-flex items-center gap-1 whitespace-nowrap"><span className="font-bold text-[#434654]">الطبيب:</span>
              <input className="w-36 font-semibold text-[#003d9b] bg-transparent border-0 border-b border-[#c3c6d6] focus:outline-none text-right" dir="rtl" value={signatures.doctor} onChange={(e) => setSignatures((p) => ({ ...p, doctor: e.target.value }))} /></label>
          </section>

          {/* Visual Acuity + Tear Film */}
          <section className="print-specialist-visual-grid grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7">
              <table className="w-full text-center border-collapse">
                <thead className="bg-[#e7e8ea] text-xs font-bold uppercase">
                  <tr><th className={ctd}>Eye</th><th className={ctd}>UCVA</th><th className={ctd}>BCVA</th><th className={ctd}>IOP</th></tr>
                </thead>
                <tbody>
                  <tr><td className={`${ctd} text-[#003d9b] bg-[#003d9b]/5`}>OD</td>
                    <td className={ctd}><input className={inp} value={formData.ucvaOD} onChange={(e) => setFormData((p) => ({ ...p, ucvaOD: e.target.value }))} /></td>
                    <td className={ctd}><input className={inp} value={formData.bcvaOD} onChange={(e) => setFormData((p) => ({ ...p, bcvaOD: e.target.value }))} /></td>
                    <td className={ctd}><input className={inp} value={formData.iopOD} onChange={(e) => setFormData((p) => ({ ...p, iopOD: e.target.value }))} /></td></tr>
                  <tr><td className={`${ctd} text-[#526069] bg-[#f3f4f6]`}>OS</td>
                    <td className={ctd}><input className={inp} value={formData.ucvaOS} onChange={(e) => setFormData((p) => ({ ...p, ucvaOS: e.target.value }))} /></td>
                    <td className={ctd}><input className={inp} value={formData.bcvaOS} onChange={(e) => setFormData((p) => ({ ...p, bcvaOS: e.target.value }))} /></td>
                    <td className={ctd}><input className={inp} value={formData.iopOS} onChange={(e) => setFormData((p) => ({ ...p, iopOS: e.target.value }))} /></td></tr>
                </tbody>
              </table>
              <div className="mt-3 flex items-center justify-center gap-8 text-sm font-bold border border-[#c3c6d6] rounded-lg p-2">
                <span className="text-[#003d9b] uppercase">Dominant Eye:</span>
                <label className="flex items-center gap-2"><input type="radio" name="dominant" /> OD</label>
                <label className="flex items-center gap-2"><input type="radio" name="dominant" /> OS</label>
              </div>
            </div>
            <div className="lg:col-span-5">
              <table className="w-full border-collapse h-full text-sm">
                <thead className="bg-[#e7e8ea]"><tr><th className={`${ctd} text-xs uppercase`} colSpan={2}>Tear Film Examination</th></tr></thead>
                <tbody>
                  <tr><td className={`${ctd} w-1/2 text-right`}>1- BUT</td><td className={ctd}><input className={inp} /></td></tr>
                  <tr><td className={`${ctd} text-right`}>2- Schirmer Test</td><td className={ctd}><input className={inp} /></td></tr>
                  <tr><td className={`${ctd} text-right`}>3- Lid Margin</td><td className={ctd}><input className={inp} /></td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Detailed Refraction */}
          <section>
            <table className="w-full text-center border-collapse">
              <thead className="bg-[#e7e8ea] text-xs uppercase font-bold">
                <tr>
                  <th className={`${ctd} w-48`} rowSpan={2}>Clinical Refraction</th>
                  <th className={`${ctd} text-[#003d9b]`} colSpan={3}>OD (Right)</th>
                  <th className={`${ctd} text-[#526069]`} colSpan={3}>OS (Left)</th>
                </tr>
                <tr><th className={ctd}>S</th><th className={ctd}>C</th><th className={ctd}>A</th><th className={ctd}>S</th><th className={ctd}>C</th><th className={ctd}>A</th></tr>
              </thead>
              <tbody className="font-mono">
                <tr>
                  <td className={`${ctd} text-left bg-[#f3f4f6]`}>Refraction</td>
                  <td className={ctd}><input className={inp} value={formData.refractionOD.s} onChange={(e) => setFormData((p) => ({ ...p, refractionOD: { ...p.refractionOD, s: e.target.value } }))} /></td>
                  <td className={ctd}><input className={inp} value={formData.refractionOD.c} onChange={(e) => setFormData((p) => ({ ...p, refractionOD: { ...p.refractionOD, c: e.target.value } }))} /></td>
                  <td className={ctd}><input className={inp} value={formData.refractionOD.a} onChange={(e) => setFormData((p) => ({ ...p, refractionOD: { ...p.refractionOD, a: e.target.value } }))} /></td>
                  <td className={ctd}><input className={inp} value={formData.refractionOS.s} onChange={(e) => setFormData((p) => ({ ...p, refractionOS: { ...p.refractionOS, s: e.target.value } }))} /></td>
                  <td className={ctd}><input className={inp} value={formData.refractionOS.c} onChange={(e) => setFormData((p) => ({ ...p, refractionOS: { ...p.refractionOS, c: e.target.value } }))} /></td>
                  <td className={ctd}><input className={inp} value={formData.refractionOS.a} onChange={(e) => setFormData((p) => ({ ...p, refractionOS: { ...p.refractionOS, a: e.target.value } }))} /></td>
                </tr>
                <tr>
                  <td className={`${ctd} text-left bg-[#f3f4f6]`}>Fundus</td>
                  <td className={ctd} colSpan={3}><input className={inp} /></td>
                  <td className={ctd} colSpan={3}><input className={inp} /></td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Notes + signatures */}
          <footer className="pt-6 border-t-2 border-[#003d9b] space-y-6">
            <div className="print-specialist-footer-grid grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-4">
                <div>
                  <label className="font-bold text-[#003d9b] text-sm">Comments / ملاحظات:</label>
                  <div className="border-b border-solid border-[#c3c6d6] h-8" />
                  <div className="border-b border-solid border-[#c3c6d6] h-8" />
                </div>
                <div>
                  <label className="font-bold text-[#003d9b] text-sm">Final Decision / القرار النهائي:</label>
                  <div className="border-b border-solid border-[#c3c6d6] h-8" />
                </div>
              </div>
              <div className="lg:col-span-4 border-2 border-[#003d9b] rounded-xl p-4 bg-[#003d9b]/5">
                <div className="text-center font-bold text-[#003d9b] uppercase text-xs border-b border-[#003d9b]/20 pb-2 mb-3">Office Notes</div>
                <div className="border-b border-solid border-[#003d9b]/40 h-6 mb-2" />
                <div className="border-b border-solid border-[#003d9b]/40 h-6 mb-2" />
                <div className="border-b border-solid border-[#003d9b]/40 h-6" />
              </div>
            </div>
            <div className="print-specialist-signatures grid grid-cols-2 md:grid-cols-4 gap-8 pt-4 border-t border-[#c3c6d6]">
              {[
                ["التمريض / Nursing", signatures.nurse],
                ["الطبيب / Physician", signatures.doctor],
                ["فني / Optometrist", signatures.technician],
                ["الاستقبال / Reception", signatures.reception],
              ].map(([label, val], i) => (
                <div key={i} className="flex flex-col gap-2">
                  <span className={`text-[11px] font-bold uppercase ${i === 1 ? "text-[#003d9b]" : "text-[#434654]"}`}>{label}</span>
                  <div className={`border-b-2 h-9 flex items-end justify-center ${i === 1 ? "border-[#003d9b]" : "border-[#191c1e]"}`}>
                    <span className={`text-xs italic ${i === 1 ? "text-[#003d9b] font-bold" : "text-[#737685]"}`}>{val || ""}</span>
                  </div>
                </div>
              ))}
            </div>
          </footer>
        </div>
        <div
          className={`sheet-mobile-actions print:hidden ${printMode.printView ? "hidden" : ""}`}
        >
          <Button type="button" variant="outline" onClick={() => goBack()}>
            رجوع
          </Button>
          <Button type="button" variant="outline" onClick={handlePrint}>
            طباعة
          </Button>
          <Button type="button" variant="default" onClick={handleSaveSheet}>
            حفظ
          </Button>
        </div>
      </div>
    </div>
  );
}
