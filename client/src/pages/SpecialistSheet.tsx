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
    );
  };

  return (
    <div
      className={`min-h-screen bg-background sheet-layout ${mobileSheetModeEnabled && !printMode.printView ? "mobile-sheet-mode" : ""}`}
      dir="rtl"
      style={{ direction: "rtl", textAlign: "right" }}
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
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { background: white !important; }
          .specialist-print-root {
            width: 100%;
            max-width: 100%;
            margin: 0 auto;
          }
          .print-specialist-patient-grid {
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          }
          .print-specialist-two-col {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
      `}</style>
      {/* Header */}
      <header
        className={`sticky top-0 z-10 border-b border-border bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60 print:hidden ${printMode.printView ? "hidden" : ""}`}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between sheet-header-bar">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    {sheetTemplate.sheetTitle}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {formData.patientName}
                  </p>
                </div>
              </div>
              <div className="flex gap-1 print:hidden sheet-header-actions">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => goBack()}
                >
                  رجوع
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 sheet-header-actions">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                type="button"
              >
                <Printer className="h-4 w-4 mr-2" />
                طباعة
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveSheet}
                type="button"
              >
                حفظ
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        data-mobile-pdf-root
        className={`container mx-auto print:p-0 ${printMode.printView ? "px-3 py-3" : "px-4 py-8 pb-24 sm:pb-8"}`}
      >
        {printMode.printView ? (
          <PrintPreviewBanner
            title="شيت الاختصاصي"
            subtitle={formData.patientName || undefined}
            onPrint={handlePrint}
          />
        ) : null}
        {/* Patient picker removed */}
        <div className="bg-background p-8 print:p-[10mm] specialist-print-root">
          <div
            className={`mb-2 print:hidden ${printMode.printView ? "hidden" : ""}`}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/dashboard")}
              className="border-primary text-card-foreground hover:bg-primary/10"
            >
              الصفحة الرئيسية
            </Button>
          </div>
          {/* Letterhead */}
          <div className="mb-6 flex justify-between items-center border-b-2 border-primary pb-3 -mx-8 px-8">
            <div className="flex items-center gap-3" dir="ltr">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center text-white">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M3 12c0-3 3-6 9-6s9 3 9 6-3 6-9 6-9-3-9-6z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-primary leading-tight" dir="rtl">{BRAND_NAME_AR}</h2>
                <p className="text-[10px] font-bold text-[#526069] uppercase tracking-widest">{BRAND_NAME_EN} — Specialist Sheet</p>
              </div>
            </div>
            <div className="text-left text-xs text-[#526069]" dir="ltr">
              <p className="font-bold text-primary text-sm">شيت الأخصائي</p>
              <p>{formData.examinationDate}</p>
            </div>
          </div>

          {/* Patient grid */}
          <div className="print-specialist-patient-grid grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4 mb-6 p-4 bg-[#f8f9fb] rounded-xl border border-[#c3c6d6]">
            {[
              ["الاسم / Name", formData.patientName],
              ["تاريخ الميلاد / DOB", formData.dateOfBirth],
              ["السن / Age", formData.age],
              ["كود العميل / ID", formData.patientCode],
              ["العنوان / Address", formData.address],
              ["الوظيفة / Job", formData.job],
              ["رقم التليفون / Phone", formData.phone],
              ["الطبيب / Physician", signatures.doctor],
            ].map(([label, val], i) => (
              <div key={i} className={`flex flex-col ${i === 4 ? "md:col-span-2" : ""}`}>
                <span className="text-[10px] font-bold text-[#526069] uppercase">{label}</span>
                <Input value={val ?? ""} readOnly className="h-7 text-sm font-bold border-0 border-b border-[#c3c6d6] rounded-none bg-transparent px-0 focus-visible:ring-0" style={{ textAlign: "right" }} />
              </div>
            ))}
          </div>

          {/* Vision + Tear film */}
          <div className="print-specialist-two-col grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="overflow-hidden rounded-lg border border-[#c3c6d6]">
              <table className="w-full text-center border-collapse refraction-table-center" dir="ltr">
                <thead>
                  <tr className="bg-primary text-white text-xs font-bold uppercase">
                    <th className="p-2 border-r border-white/20">Eye</th>
                    <th className="p-2 border-r border-white/20">UCVA</th>
                    <th className="p-2 border-r border-white/20">BCVA</th>
                    <th className="p-2">IOP</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#c3c6d6]">
                    <td className="p-2 bg-[#edeef0] font-black text-primary">OD</td>
                    <td className="p-1 border-r border-[#c3c6d6]"><Input value={formData.ucvaOD} onChange={(e) => setFormData((p) => ({ ...p, ucvaOD: e.target.value }))} className="text-sm border-0 text-center" /></td>
                    <td className="p-1 border-r border-[#c3c6d6]"><Input value={formData.bcvaOD} onChange={(e) => setFormData((p) => ({ ...p, bcvaOD: e.target.value }))} className="text-sm border-0 text-center" /></td>
                    <td className="p-1"><Input value={formData.iopOD} onChange={(e) => setFormData((p) => ({ ...p, iopOD: e.target.value }))} className="text-sm border-0 text-center" /></td>
                  </tr>
                  <tr>
                    <td className="p-2 bg-[#edeef0] font-black text-[#526069]">OS</td>
                    <td className="p-1 border-r border-[#c3c6d6]"><Input value={formData.ucvaOS} onChange={(e) => setFormData((p) => ({ ...p, ucvaOS: e.target.value }))} className="text-sm border-0 text-center" /></td>
                    <td className="p-1 border-r border-[#c3c6d6]"><Input value={formData.bcvaOS} onChange={(e) => setFormData((p) => ({ ...p, bcvaOS: e.target.value }))} className="text-sm border-0 text-center" /></td>
                    <td className="p-1"><Input value={formData.iopOS} onChange={(e) => setFormData((p) => ({ ...p, iopOS: e.target.value }))} className="text-sm border-0 text-center" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="overflow-hidden rounded-lg border border-[#c3c6d6]">
              <table className="w-full border-collapse text-sm" dir="ltr">
                <tbody>
                  <tr className="border-b border-[#c3c6d6]"><td className="p-2 font-bold bg-[#edeef0] w-1/3">1- BUT</td><td className="p-1"><Input className="text-sm border-0 px-3" /></td></tr>
                  <tr className="border-b border-[#c3c6d6]"><td className="p-2 font-bold bg-[#edeef0]">2- Schirmer Test</td><td className="p-1"><Input className="text-sm border-0 px-3" /></td></tr>
                  <tr><td className="p-2 font-bold bg-[#edeef0]">3- Lid Margin</td><td className="p-1"><Input className="text-sm border-0 px-3" /></td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Refraction & Fundus */}
          <div className="mb-6 overflow-hidden rounded-lg border border-[#c3c6d6]">
            <table className="w-full text-center border-collapse refraction-table-center" dir="ltr">
              <thead>
                <tr className="bg-[#e1e2e4] text-xs font-bold">
                  <th className="p-2 border-r border-[#c3c6d6] w-48">Parameter</th>
                  <th className="p-2 border-r border-[#c3c6d6] text-primary uppercase" colSpan={3}>OD (Right)</th>
                  <th className="p-2 text-[#526069] uppercase" colSpan={3}>OS (Left)</th>
                </tr>
                <tr className="bg-[#edeef0] text-[10px] font-bold uppercase border-b border-[#c3c6d6]">
                  <th className="border-r border-[#c3c6d6]"></th>
                  <th className="p-1 border-r border-[#c3c6d6]">S</th>
                  <th className="p-1 border-r border-[#c3c6d6]">C</th>
                  <th className="p-1 border-r border-[#c3c6d6]">A</th>
                  <th className="p-1 border-r border-[#c3c6d6]">S</th>
                  <th className="p-1 border-r border-[#c3c6d6]">C</th>
                  <th className="p-1">A</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#c3c6d6]">
                  <td className="p-2 font-bold text-left bg-[#edeef0] border-r border-[#c3c6d6]">Refraction</td>
                  <td className="p-1 border-r border-[#c3c6d6]"><Input value={formData.refractionOD.s} onChange={(e) => setFormData((p) => ({ ...p, refractionOD: { ...p.refractionOD, s: e.target.value } }))} className="text-sm border-0 text-center" /></td>
                  <td className="p-1 border-r border-[#c3c6d6]"><Input value={formData.refractionOD.c} onChange={(e) => setFormData((p) => ({ ...p, refractionOD: { ...p.refractionOD, c: e.target.value } }))} className="text-sm border-0 text-center" /></td>
                  <td className="p-1 border-r border-[#c3c6d6]"><Input value={formData.refractionOD.a} onChange={(e) => setFormData((p) => ({ ...p, refractionOD: { ...p.refractionOD, a: e.target.value } }))} className="text-sm border-0 text-center" /></td>
                  <td className="p-1 border-r border-[#c3c6d6]"><Input value={formData.refractionOS.s} onChange={(e) => setFormData((p) => ({ ...p, refractionOS: { ...p.refractionOS, s: e.target.value } }))} className="text-sm border-0 text-center" /></td>
                  <td className="p-1 border-r border-[#c3c6d6]"><Input value={formData.refractionOS.c} onChange={(e) => setFormData((p) => ({ ...p, refractionOS: { ...p.refractionOS, c: e.target.value } }))} className="text-sm border-0 text-center" /></td>
                  <td className="p-1"><Input value={formData.refractionOS.a} onChange={(e) => setFormData((p) => ({ ...p, refractionOS: { ...p.refractionOS, a: e.target.value } }))} className="text-sm border-0 text-center" /></td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-left bg-[#edeef0] border-r border-[#c3c6d6]">Fundus</td>
                  <td className="p-2" colSpan={6}>
                    <div className="flex items-center justify-center gap-6">
                      <label className="flex items-center gap-1 text-[11px] font-bold"><input type="checkbox" className="w-4 h-4 rounded text-primary" /> N</label>
                      <label className="flex items-center gap-1 text-[11px] font-bold"><input type="checkbox" className="w-4 h-4 rounded text-primary" /> A</label>
                      <label className="flex items-center gap-1 text-[11px] font-bold"><input type="checkbox" className="w-4 h-4 rounded text-primary" /> O</label>
                      <Input placeholder="Observations..." className="flex-1 text-sm border-0 text-left" dir="ltr" />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Clinical notes */}
          <div className="mb-6 border border-[#c3c6d6] rounded-lg p-4 min-h-[140px] space-y-4">
            <div className="border-b border-dotted border-[#c3c6d6] h-6" />
            <div className="border-b border-dotted border-[#c3c6d6] h-6" />
            <div className="border-b border-dotted border-[#c3c6d6] h-6" />
            <div className="border-b border-dotted border-[#c3c6d6] h-6" />
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-4 gap-8 pt-6 border-t border-[#c3c6d6]" dir="rtl">
            {[
              ["توقيع الاستشاري / Consultant", signatures.doctor],
              ["فني القياس / Technician", signatures.technician],
              ["تمريض / Nurse", signatures.nurse],
              ["الاستقبال / Reception", signatures.reception],
            ].map(([label, val], i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="border-b border-[#191c1e] w-full h-12 mb-2 flex items-end justify-center text-xs">
                  {val ? <span className="text-center pb-1">{val}</span> : null}
                </div>
                <span className="text-[10px] font-bold text-[#526069] uppercase tracking-widest text-center">{label}</span>
              </div>
            ))}
          </div>
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
      </main>
    </div>
  );
}
