import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import { DateInput } from "@/components/ui/date-input";

export default function ExternalOperationSheet() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { goBack } = useAppNavigation();
  const [, params] = useRoute("/sheets/external/:id");
  const initialPatientId = params?.id ? Number(params.id) : undefined;
  const printMode = usePrintMode({ ready: Boolean(initialPatientId) });
  const originalMode =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("original") === "1";

  const [operationType, setOperationType] = useState("زيارة خارجية");
  const [operationEyes, setOperationEyes] = useState({
    right: true,
    left: false,
    both: false,
  });

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
    od: {
      k1: "",
      k2: "",
      ax1: "",
      ax2: "",
      thinnest: "",
      apex: "",
      residual: "",
      ttt: "",
      ablation: "",
    },
    os: {
      k1: "",
      k2: "",
      ax1: "",
      ax2: "",
      thinnest: "",
      apex: "",
      residual: "",
      ttt: "",
      ablation: "",
    },
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
    DEFAULT_SHEET_DESIGNER_CONFIG.templates.external,
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
    setCustomSheetCss(localDesigner.css.external || "");
    setSheetTemplate(localDesigner.templates.external);
    setPrintOffsetXmm(localDesigner.layout.external.offsetXmm);
    setPrintOffsetYmm(localDesigner.layout.external.offsetYmm);
    setPrintScale(localDesigner.layout.external.scale);
  }, []);

  useEffect(() => {
    if (!designerSettingsQuery.data?.value) return;
    const merged = coerceSheetDesignerConfig(designerSettingsQuery.data.value);
    setCustomSheetCss(merged.css.external || "");
    setSheetTemplate(merged.templates.external);
    setPrintOffsetXmm(merged.layout.external.offsetXmm);
    setPrintOffsetYmm(merged.layout.external.offsetYmm);
    setPrintScale(merged.layout.external.scale);
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
  const sheetQuery = trpc.medical.getSheetEntry.useQuery(
    { patientId: initialPatientId ?? 0, sheetType: "external" },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const examinationStateQuery = trpc.medical.getPatientPageState.useQuery(
    { patientId: initialPatientId ?? 0, page: "examination" },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
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
  const prescriptionsQuery = trpc.medical.getPrescriptionsByPatient.useQuery(
    { patientId: initialPatientId ?? 0 },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const surgeriesQuery = trpc.medical.getSurgeriesByPatient.useQuery(
    { patientId: initialPatientId ?? 0 },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const followupsQuery = trpc.medical.getFollowupVisitsByPatient.useQuery(
    { patientId: initialPatientId ?? 0 },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const pentacamQuery = trpc.medical.getPentacamFilesByPatient.useQuery(
    { patientId: initialPatientId ?? 0 },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const testRequestsQuery = trpc.medical.getTestRequestsByPatient.useQuery(
    { patientId: initialPatientId ?? 0 },
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
          surgeriesQuery.refetch(),
          followupsQuery.refetch(),
          pentacamQuery.refetch(),
          testRequestsQuery.refetch(),
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
    surgeriesQuery,
    followupsQuery,
    pentacamQuery,
    testRequestsQuery,
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
      setLocation(`/sheets/external/${patient.id}`);
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
          ucvaOD: auto.od?.ucva ?? prev.ucvaOD,
          ucvaOS: auto.os?.ucva ?? prev.ucvaOS,
          bcvaOD: auto.od?.bcva ?? prev.bcvaOD,
          bcvaOS: auto.os?.bcva ?? prev.bcvaOS,
          refractionOD: {
            s: auto.od?.s ?? prev.refractionOD.s,
            c: auto.od?.c ?? prev.refractionOD.c,
            a: auto.od?.axis ?? prev.refractionOD.a,
          },
          refractionOS: {
            s: auto.os?.s ?? prev.refractionOS.s,
            c: auto.os?.c ?? prev.refractionOS.c,
            a: auto.os?.axis ?? prev.refractionOS.a,
          },
          iopOD: auto.od?.iop ?? prev.iopOD,
          iopOS: auto.os?.iop ?? prev.iopOS,
        }));
      }
      if (parsed.examData?.pentacam) {
        setPentacamData((prev) => ({
          od: { ...prev.od, ...(parsed.examData.pentacam.od ?? {}) },
          os: { ...prev.os, ...(parsed.examData.pentacam.os ?? {}) },
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
      if (parsed.operationDetails) {
        setOperationType(parsed.operationDetails.type ?? "زيارة خارجية");
        const parsedEyes = parsed.operationDetails.eyes ?? {};
        const right = Boolean(parsedEyes.right);
        const left = Boolean(parsedEyes.left);
        const both = Boolean(parsedEyes.both) || (right && left);
        setOperationEyes({
          right: both ? true : right,
          left: both ? true : left,
          both,
        });
      }
    } catch {
      // ignore malformed data
    }
  }, [sheetQuery.data]);

  useEffect(() => {
    if (!examinationsQuery.data || examinationsQuery.data.length === 0) return;
    const latestExam = examinationsQuery.data[0] as any;
    if (latestExam.autorefraction) {
      const auto = latestExam.autorefraction;
      setFormData((prev) => ({
        ...prev,
        ucvaOD: auto.od?.ucva ?? prev.ucvaOD,
        ucvaOS: auto.os?.ucva ?? prev.ucvaOS,
        bcvaOD: auto.od?.bcva ?? prev.bcvaOD,
        bcvaOS: auto.os?.bcva ?? prev.bcvaOS,
        refractionOD: {
          s: auto.od?.s ?? prev.refractionOD.s,
          c: auto.od?.c ?? prev.refractionOD.c,
          a: auto.od?.axis ?? prev.refractionOD.a,
        },
        refractionOS: {
          s: auto.os?.s ?? prev.refractionOS.s,
          c: auto.os?.c ?? prev.refractionOS.c,
          a: auto.os?.axis ?? prev.refractionOS.a,
        },
        iopOD: auto.od?.iop ?? prev.iopOD,
        iopOS: auto.os?.iop ?? prev.iopOS,
      }));
    }
    if (latestExam.pentacam) {
      const pentacam = latestExam.pentacam;
      setPentacamData((prev) => ({
        od: { ...prev.od, ...(pentacam?.od ?? {}) },
        os: { ...prev.os, ...(pentacam?.os ?? {}) },
      }));
    }
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
        pentacam: {
          od: {
            ...(existing.examData?.pentacam?.od ?? {}),
            ...pentacamData.od,
          },
          os: {
            ...(existing.examData?.pentacam?.os ?? {}),
            ...pentacamData.os,
          },
        },
      };
      await saveSheetMutation.mutateAsync({
        patientId: initialPatientId,
        sheetType: "external",
        content: JSON.stringify({
          ...existing,
          formData: { ...(existing.formData ?? {}), ...formData },
          examData: mergedExamData,
          operationDetails: {
            type: operationType,
            eyes: operationEyes,
          },
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
  }, [formData, pentacamData, operationType, operationEyes, initialPatientId]);

  const handlePrint = () => {
    void printOrExportPdf(
      `${String(formData.patientName || formData.patientCode || initialPatientId || "external-sheet").trim()}.pdf`,
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
          @page { size: A4 portrait; margin: 0 !important; }
          .external-print-root {
            transform: translateX(${originalMode ? 0 : printOffsetXmm}mm) translateY(${originalMode ? 0 : printOffsetYmm}mm) scale(${originalMode ? 1 : printScale});
            transform-origin: top center;
            margin-left: auto;
            margin-right: auto;
            width: 100% !important;
            max-width: 210mm;
          }
        }
      `}</style>
      <header
        className={`sticky top-0 z-10 border-b border-border bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60 print:hidden ${printMode.printView ? "hidden" : ""}`}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-2 flex-nowrap sheet-header-bar">
            <div className="flex items-center gap-3 whitespace-nowrap">
              <h1 className="text-xl font-bold text-foreground">
                {sheetTemplate.sheetTitle}
              </h1>
              <span className="text-sm text-muted-foreground">
                {formData.patientName}
              </span>
            </div>
            <div className="flex gap-1 items-center whitespace-nowrap print:hidden sheet-header-actions">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => goBack()}
              >
                رجوع
              </Button>
            </div>
            <div className="flex flex-nowrap gap-1 sheet-header-actions">
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

      <main
        data-mobile-pdf-root
        className={`container mx-auto print:p-0 ${printMode.printView ? "px-3 py-3" : "px-4 py-8 pb-24 sm:pb-8"}`}
      >
        {printMode.printView ? (
          <PrintPreviewBanner
            title="شيت الخارجي"
            subtitle={formData.patientName || undefined}
            onPrint={handlePrint}
          />
        ) : null}
        <div
          className={`mb-4 print:hidden ${printMode.printView ? "hidden" : ""}`}
        >
          <PatientPicker
            initialPatientId={initialPatientId}
            onSelect={handleSelectPatient}
          />
        </div>
        <div className="rounded-2xl border border-[#c3c6d6] bg-white p-6 shadow-md print:rounded-none print:border-0 print:p-0 external-print-root">
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
          <div className="mb-3 border-b-2 border-[#003d9b] pb-3 -mx-6 px-6 flex items-center justify-between">
            <div dir="rtl">
              <h2 className="text-base font-bold text-[#191c1e]">{BRAND_NAME_AR} — لليزك وتصحيح الإبصار</h2>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-[#003d9b] uppercase tracking-wide">{sheetTemplate.sheetTitle}</p>
            </div>
            <div dir="ltr">
              <p className="text-sm text-[#526069]">{BRAND_NAME_EN} — Lasik &amp; Vision Correction</p>
            </div>
          </div>

          <div className="mb-3 border border-[#c3c6d6] rounded-md bg-[#f8f9fb] px-3 py-2 flex flex-wrap items-center gap-3 text-xs" dir="rtl">
            <div className="flex items-center gap-1 min-w-0">
              <span className="font-bold">
                {sheetTemplate.examinationDateLabel}
              </span>
              <DateInput
                value={formData.examinationDate}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    examinationDate: event.target.value,
                  }))
                }
                className="text-xs text-right w-[120px] sm:w-[160px] min-w-0"
                dir="rtl"
              />
            </div>
            <div className="flex items-center gap-1 min-w-0">
              <span className="font-bold">نوع العملية</span>
              <select
                value={operationType}
                onChange={(event) => setOperationType(event.target.value)}
                className="text-xs text-right w-[120px] sm:w-[160px] min-w-0 h-8 rounded-md border border-input bg-background px-2"
                dir="rtl"
              >
                <option value=""></option>
                <option value="زيارة خارجية">زيارة خارجية</option>
                <option value="فحص خارجي">فحص خارجي</option>
                <option value="ليزك">ليزك</option>
                <option value="متابعة">متابعة</option>
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-1 min-w-0">
              <span className="font-bold">العيون</span>
              <label className="flex items-center gap-1 bg-background px-2 py-1">
                <span className="text-xs">يمين (RT)</span>
                <Checkbox
                  id="external-rt"
                  checked={operationEyes.right}
                  onCheckedChange={(checked) => {
                    const right = Boolean(checked);
                    setOperationEyes((prev) => ({
                      ...prev,
                      right,
                      both: right && prev.left,
                    }));
                  }}
                />
              </label>
              <label className="flex items-center gap-1 bg-background px-2 py-1">
                <span className="text-xs">يسار (LT)</span>
                <Checkbox
                  id="external-lt"
                  checked={operationEyes.left}
                  onCheckedChange={(checked) => {
                    const left = Boolean(checked);
                    setOperationEyes((prev) => ({
                      ...prev,
                      left,
                      both: prev.right && left,
                    }));
                  }}
                />
              </label>
              <label className="flex items-center gap-1 bg-background px-2 py-1">
                <span className="text-xs">OU</span>
                <Checkbox
                  id="external-ou"
                  checked={operationEyes.both}
                  onCheckedChange={(checked) => {
                    const both = Boolean(checked);
                    setOperationEyes({
                      right: both ? true : false,
                      left: both ? true : false,
                      both,
                    });
                  }}
                />
              </label>
            </div>
          </div>

          {/* Patient Info */}
          <div dir="rtl" className="mb-3">
            <div className="bg-[#003d9b] text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-t-md">بيانات المريض — Patient Information</div>
            <div className="border border-[#c3c6d6] border-t-0 rounded-b-md p-3 bg-[#f8f9fb]">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-xs">
                <div className="col-span-2 md:col-span-1">
                  <span className="text-[10px] text-[#434654] font-semibold block mb-0.5">الاسم</span>
                  <div className="border-b border-[#c3c6d6] min-h-[20px] pb-0.5 font-semibold text-[#003d9b] text-right" dir="rtl">{formData.patientName}</div>
                </div>
                <div>
                  <span className="text-[10px] text-[#434654] font-semibold block mb-0.5">تاريخ الميلاد</span>
                  <div className="border-b border-[#c3c6d6] min-h-[20px] pb-0.5 text-right" dir="ltr">{formData.dateOfBirth}</div>
                </div>
                <div>
                  <span className="text-[10px] text-[#434654] font-semibold block mb-0.5">السن</span>
                  <div className="border-b border-[#c3c6d6] min-h-[20px] pb-0.5 text-right" dir="ltr">{formData.age}</div>
                </div>
                <div>
                  <span className="text-[10px] text-[#434654] font-semibold block mb-0.5">كود العميل</span>
                  <div className="border-b border-[#c3c6d6] min-h-[20px] pb-0.5 font-mono text-[#526069] text-right" dir="ltr">{formData.patientCode}</div>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-[#434654] font-semibold block mb-0.5">العنوان</span>
                  <div className="border-b border-[#c3c6d6] min-h-[20px] pb-0.5 text-right" dir="rtl">{formData.address}</div>
                </div>
                <div>
                  <span className="text-[10px] text-[#434654] font-semibold block mb-0.5">الموبايل</span>
                  <div className="border-b border-[#c3c6d6] min-h-[20px] pb-0.5 text-right" dir="ltr">{formData.phone}</div>
                </div>
                <div>
                  <span className="text-[10px] text-[#434654] font-semibold block mb-0.5">الوظيفة</span>
                  <div className="border-b border-[#c3c6d6] min-h-[20px] pb-0.5 text-right" dir="rtl">{formData.job}</div>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-[#c3c6d6] flex items-center gap-3 text-xs">
                <span className="text-[10px] text-[#434654] font-semibold">{sheetTemplate.doctorLabel}:</span>
                <span className="font-semibold text-[#003d9b]" dir="rtl">{signatures.doctor}</span>
              </div>
            </div>
          </div>

          {/* Exam Table */}
          <div className="mb-3">
            <div className="bg-[#003d9b] text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-t-md">Visual Acuity, IOP &amp; Refraction</div>
            <table
              className="w-full text-xs text-center lasik-table refraction-table-center border border-[#c3c6d6] border-t-0 rounded-b-md overflow-hidden"
              dir="ltr"
              style={{
                direction: "ltr",
                unicodeBidi: "bidi-override",
                textAlign: "center",
              }}
            >
              <thead>
                <tr className="border-b bg-[#e7e8ea]">
                  <th className="border-r p-1 text-center font-bold" colSpan={4}>
                    Dominant Eye
                  </th>
                  <th className="p-1 text-center font-bold" colSpan={6}>
                    Refraction
                  </th>
                </tr>
                <tr className="border-b bg-[#e7e8ea]">
                  <th className="border-r p-0.5"></th>
                  <th className="border-r p-0.5">UCVA</th>
                  <th className="border-r p-0.5">BCVA</th>
                  <th className="border-r p-0.5">IOP</th>
                  <th className="border-r p-0.5" colSpan={3}>
                    OD
                  </th>
                  <th className="p-0.5" colSpan={3}>
                    OS
                  </th>
                </tr>
                <tr className="border-b">
                  <th className="border-r p-0.5"></th>
                  <th className="border-r p-0.5"></th>
                  <th className="border-r p-0.5"></th>
                  <th className="border-r p-0.5"></th>
                  <th className="border-r p-0.5">S</th>
                  <th className="border-r p-0.5">C</th>
                  <th className="border-r p-0.5">A</th>
                  <th className="border-r p-0.5">S</th>
                  <th className="border-r p-0.5">C</th>
                  <th className="p-0.5">A</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b bg-[#003d9b]/5">
                  <td className="border-r p-0.5 font-bold text-[#003d9b]">OD</td>
                  <td className="border-r p-0.5">
                    <Input
                      placeholder=""
                      className="text-xs"
                      value={formData.ucvaOD}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          ucvaOD: e.target.value,
                        }))
                      }
                    />
                  </td>
                  <td className="border-r p-0.5">
                    <Input
                      placeholder=""
                      className="text-xs"
                      value={formData.bcvaOD}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          bcvaOD: e.target.value,
                        }))
                      }
                    />
                  </td>
                  <td className="border-r p-0.5">
                    <Input
                      placeholder=""
                      className="text-xs"
                      value={formData.iopOD}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          iopOD: e.target.value,
                        }))
                      }
                    />
                  </td>
                  <td className="border-r p-0.5" rowSpan={2}>
                    <Input
                      placeholder=""
                      className="text-xs"
                      value={formData.refractionOD.s}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          refractionOD: {
                            ...prev.refractionOD,
                            s: e.target.value,
                          },
                        }))
                      }
                    />
                  </td>
                  <td className="border-r p-0.5" rowSpan={2}>
                    <Input
                      placeholder=""
                      className="text-xs"
                      value={formData.refractionOD.c}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          refractionOD: {
                            ...prev.refractionOD,
                            c: e.target.value,
                          },
                        }))
                      }
                    />
                  </td>
                  <td className="border-r p-0.5" rowSpan={2}>
                    <Input
                      placeholder=""
                      className="text-xs"
                      value={formData.refractionOD.a}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          refractionOD: {
                            ...prev.refractionOD,
                            a: e.target.value,
                          },
                        }))
                      }
                    />
                  </td>
                  <td className="border-r p-0.5" rowSpan={2}>
                    <Input
                      placeholder=""
                      className="text-xs"
                      value={formData.refractionOS.s}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          refractionOS: {
                            ...prev.refractionOS,
                            s: e.target.value,
                          },
                        }))
                      }
                    />
                  </td>
                  <td className="border-r p-0.5" rowSpan={2}>
                    <Input
                      placeholder=""
                      className="text-xs"
                      value={formData.refractionOS.c}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          refractionOS: {
                            ...prev.refractionOS,
                            c: e.target.value,
                          },
                        }))
                      }
                    />
                  </td>
                  <td className="p-0.5" rowSpan={2}>
                    <Input
                      placeholder=""
                      className="text-xs"
                      value={formData.refractionOS.a}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          refractionOS: {
                            ...prev.refractionOS,
                            a: e.target.value,
                          },
                        }))
                      }
                    />
                  </td>
                </tr>
                <tr className="border-b bg-[#f3f4f6]">
                  <td className="border-r p-0.5 font-bold text-[#526069]">OS</td>
                  <td className="border-r p-0.5">
                    <Input
                      placeholder=""
                      className="text-xs"
                      value={formData.ucvaOS}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          ucvaOS: e.target.value,
                        }))
                      }
                    />
                  </td>
                  <td className="border-r p-0.5">
                    <Input
                      placeholder=""
                      className="text-xs"
                      value={formData.bcvaOS}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          bcvaOS: e.target.value,
                        }))
                      }
                    />
                  </td>
                  <td className="border-r p-0.5">
                    <Input
                      placeholder=""
                      className="text-xs"
                      value={formData.iopOS}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          iopOS: e.target.value,
                        }))
                      }
                    />
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="border-r p-0.5 font-bold">Fundus</td>
                  <td className="p-0.5" colSpan={9}>
                    <Input placeholder="" className="text-xs" />
                  </td>
                </tr>
                <tr>
                  <td className="border-r p-0.5 font-bold">Tear film</td>
                  <td className="border-r p-0.5" colSpan={3}>
                    BUT
                  </td>
                  <td className="border-r p-0.5" colSpan={3}>
                    Schirmer T
                  </td>
                  <td className="p-0.5" colSpan={3}>
                    Lid Margin
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          </div>

          {/* Pentacam */}
          <div className="mb-3">
            <div className="bg-[#003d9b] text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-t-md">Pentacam — Corneal Measurements</div>
            <div className="border border-[#c3c6d6] border-t-0 rounded-b-md p-2 bg-[#f8f9fb]">
            <div className="grid grid-cols-2 gap-3">
            <div className="border border-[#003d9b]/20 rounded-md bg-[#003d9b]/5">
              <div className="bg-[#003d9b]/10 px-2 py-1 text-center font-bold text-xs border-b border-[#003d9b]/20 text-[#003d9b] rounded-t-md">
                Right Eye (OD)
              </div>
              <table
                className="w-full text-xs text-center lasik-table"
                dir="ltr"
                style={{
                  direction: "ltr",
                  unicodeBidi: "bidi-override",
                  textAlign: "center",
                }}
              >
                <tbody>
                  <tr className="border-b">
                    <td className="border-r p-0.5 font-bold text-center">K1</td>
                    <td className="border-r p-0.5">
                      <Input
                        placeholder=""
                        className="text-xs"
                        dir="ltr"
                        value={pentacamData.od.k1}
                        onChange={(e) =>
                          setPentacamData((prev) => ({
                            ...prev,
                            od: { ...prev.od, k1: e.target.value },
                          }))
                        }
                      />
                    </td>
                    <td
                      className="border-r p-0.5 font-bold text-center"
                      rowSpan={2}
                    >
                      AX
                    </td>
                    <td className="p-0.5">
                      <Input
                        placeholder=""
                        className="text-xs"
                        dir="ltr"
                        value={pentacamData.od.ax1}
                        onChange={(e) =>
                          setPentacamData((prev) => ({
                            ...prev,
                            od: { ...prev.od, ax1: e.target.value },
                          }))
                        }
                      />
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="border-r p-0.5 font-bold text-center">K2</td>
                    <td className="border-r p-0.5">
                      <Input
                        placeholder=""
                        className="text-xs"
                        dir="ltr"
                        value={pentacamData.od.k2}
                        onChange={(e) =>
                          setPentacamData((prev) => ({
                            ...prev,
                            od: { ...prev.od, k2: e.target.value },
                          }))
                        }
                      />
                    </td>
                    <td className="p-0.5">
                      <Input
                        placeholder=""
                        className="text-xs"
                        dir="ltr"
                        value={pentacamData.od.ax2}
                        onChange={(e) =>
                          setPentacamData((prev) => ({
                            ...prev,
                            od: { ...prev.od, ax2: e.target.value },
                          }))
                        }
                      />
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="border-r p-0.5 font-bold text-center">
                      Thinnest Point
                    </td>
                    <td colSpan={3} className="p-0.5">
                      <Input
                        placeholder=""
                        className="text-xs"
                        dir="ltr"
                        value={pentacamData.od.thinnest}
                        onChange={(e) =>
                          setPentacamData((prev) => ({
                            ...prev,
                            od: { ...prev.od, thinnest: e.target.value },
                          }))
                        }
                      />
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="border-r p-0.5 font-bold text-center">
                      Corneal Apex
                    </td>
                    <td colSpan={3} className="p-0.5">
                      <Input
                        placeholder=""
                        className="text-xs"
                        dir="ltr"
                        value={pentacamData.od.apex}
                        onChange={(e) =>
                          setPentacamData((prev) => ({
                            ...prev,
                            od: { ...prev.od, apex: e.target.value },
                          }))
                        }
                      />
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="border-r p-0.5 font-bold text-center">
                      Residual Stroma
                    </td>
                    <td colSpan={3} className="p-0.5">
                      <Input
                        placeholder=""
                        className="text-xs"
                        dir="ltr"
                        value={pentacamData.od.residual}
                        onChange={(e) =>
                          setPentacamData((prev) => ({
                            ...prev,
                            od: { ...prev.od, residual: e.target.value },
                          }))
                        }
                      />
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="border-r p-0.5 font-bold text-center">
                      Planned TTT
                    </td>
                    <td colSpan={3} className="p-0.5">
                      <Input
                        placeholder=""
                        className="text-xs"
                        dir="ltr"
                        value={pentacamData.od.ttt}
                        onChange={(e) =>
                          setPentacamData((prev) => ({
                            ...prev,
                            od: { ...prev.od, ttt: e.target.value },
                          }))
                        }
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="border-r p-0.5 font-bold text-center">
                      Ablation
                    </td>
                    <td colSpan={3} className="p-0.5">
                      <Input
                        placeholder=""
                        className="text-xs"
                        dir="ltr"
                        value={pentacamData.od.ablation}
                        onChange={(e) =>
                          setPentacamData((prev) => ({
                            ...prev,
                            od: { ...prev.od, ablation: e.target.value },
                          }))
                        }
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            </div>
            <div className="border border-[#526069]/20 rounded-md bg-[#f3f4f6]">
              <div className="bg-[#526069]/10 px-2 py-1 text-center font-bold text-xs border-b border-[#526069]/20 text-[#526069] rounded-t-md">
                Left Eye (OS)
              </div>
              <table
                className="w-full text-xs text-center lasik-table"
                dir="ltr"
                style={{
                  direction: "ltr",
                  unicodeBidi: "bidi-override",
                  textAlign: "center",
                }}
              >
                <tbody>
                  <tr className="border-b">
                    <td className="border-r p-0.5 font-bold text-center">K1</td>
                    <td className="border-r p-0.5">
                      <Input
                        placeholder=""
                        className="text-xs"
                        dir="ltr"
                        value={pentacamData.os.k1}
                        onChange={(e) =>
                          setPentacamData((prev) => ({
                            ...prev,
                            os: { ...prev.os, k1: e.target.value },
                          }))
                        }
                      />
                    </td>
                    <td
                      className="border-r p-0.5 font-bold text-center"
                      rowSpan={2}
                    >
                      AX
                    </td>
                    <td className="p-0.5">
                      <Input
                        placeholder=""
                        className="text-xs"
                        dir="ltr"
                        value={pentacamData.os.ax1}
                        onChange={(e) =>
                          setPentacamData((prev) => ({
                            ...prev,
                            os: { ...prev.os, ax1: e.target.value },
                          }))
                        }
                      />
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="border-r p-0.5 font-bold text-center">K2</td>
                    <td className="border-r p-0.5">
                      <Input
                        placeholder=""
                        className="text-xs"
                        dir="ltr"
                        value={pentacamData.os.k2}
                        onChange={(e) =>
                          setPentacamData((prev) => ({
                            ...prev,
                            os: { ...prev.os, k2: e.target.value },
                          }))
                        }
                      />
                    </td>
                    <td className="p-0.5">
                      <Input
                        placeholder=""
                        className="text-xs"
                        dir="ltr"
                        value={pentacamData.os.ax2}
                        onChange={(e) =>
                          setPentacamData((prev) => ({
                            ...prev,
                            os: { ...prev.os, ax2: e.target.value },
                          }))
                        }
                      />
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="border-r p-0.5 font-bold text-center">
                      Thinnest Point
                    </td>
                    <td colSpan={3} className="p-0.5">
                      <Input
                        placeholder=""
                        className="text-xs"
                        dir="ltr"
                        value={pentacamData.os.thinnest}
                        onChange={(e) =>
                          setPentacamData((prev) => ({
                            ...prev,
                            os: { ...prev.os, thinnest: e.target.value },
                          }))
                        }
                      />
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="border-r p-0.5 font-bold text-center">
                      Corneal Apex
                    </td>
                    <td colSpan={3} className="p-0.5">
                      <Input
                        placeholder=""
                        className="text-xs"
                        value={pentacamData.os.apex}
                        onChange={(e) =>
                          setPentacamData((prev) => ({
                            ...prev,
                            os: { ...prev.os, apex: e.target.value },
                          }))
                        }
                      />
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="border-r p-0.5 font-bold text-center">
                      Residual Stroma
                    </td>
                    <td colSpan={3} className="p-0.5">
                      <Input
                        placeholder=""
                        className="text-xs"
                        value={pentacamData.os.residual}
                        onChange={(e) =>
                          setPentacamData((prev) => ({
                            ...prev,
                            os: { ...prev.os, residual: e.target.value },
                          }))
                        }
                      />
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="border-r p-0.5 font-bold text-center">
                      Planned TTT
                    </td>
                    <td colSpan={3} className="p-0.5">
                      <Input
                        placeholder=""
                        className="text-xs"
                        value={pentacamData.os.ttt}
                        onChange={(e) =>
                          setPentacamData((prev) => ({
                            ...prev,
                            os: { ...prev.os, ttt: e.target.value },
                          }))
                        }
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="border-r p-0.5 font-bold text-center">
                      Ablation
                    </td>
                    <td colSpan={3} className="p-0.5">
                      <Input
                        placeholder=""
                        className="text-xs"
                        value={pentacamData.os.ablation}
                        onChange={(e) =>
                          setPentacamData((prev) => ({
                            ...prev,
                            os: { ...prev.os, ablation: e.target.value },
                          }))
                        }
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            </div>
            </div>
            </div>
          </div>

          {/* Treatment Plan */}
          <div className="mb-3">
            <div className="bg-[#526069] text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-t-md">Treatment Plan</div>
            <table
              className="w-full text-xs text-center lasik-table border border-[#c3c6d6] border-t-0 rounded-b-md overflow-hidden"
              dir="ltr"
              style={{
                direction: "ltr",
                unicodeBidi: "bidi-override",
                textAlign: "center",
              }}
            >
              <thead>
                <tr className="border-b bg-[#e7e8ea]">
                  <th className="border-r p-1 text-center font-bold">
                    Target Refraction
                  </th>
                  <th className="border-r p-0.5 text-center">OD / OS</th>
                  <th className="border-r p-0.5 text-center">Before Flap</th>
                  <th className="border-r p-0.5 text-center">After Flap</th>
                  <th className="border-r p-0.5 text-center">
                    After Treatment
                  </th>
                  <th className="border-r p-0.5 text-center">
                    After Flap Reposition
                  </th>
                  <th className="border-r p-0.5 text-center">Ciclo 3 مرات</th>
                  <th className="p-0.5 text-center">Note</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b bg-[#003d9b]/5">
                  <td className="border-r p-0.5">
                    <Input placeholder="" className="text-xs" dir="ltr" />
                  </td>
                  <td className="border-r p-0.5">
                    <Input placeholder="" className="text-xs" dir="ltr" />
                  </td>
                  <td className="border-r p-0.5">
                    <Input placeholder="" className="text-xs" dir="ltr" />
                  </td>
                  <td className="border-r p-0.5">
                    <Input placeholder="" className="text-xs" dir="ltr" />
                  </td>
                  <td className="border-r p-0.5">
                    <Input placeholder="" className="text-xs" dir="ltr" />
                  </td>
                  <td className="border-r p-0.5">
                    <Input placeholder="" className="text-xs" dir="ltr" />
                  </td>
                  <td className="border-r p-0.5">
                    <Input placeholder="" className="text-xs" dir="ltr" />
                  </td>
                  <td className="p-0.5">
                    <Input placeholder="" className="text-xs" dir="ltr" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          </div>

          {/* Notes */}
          <div className="flex gap-2 mb-2" dir="rtl">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-[#003d9b] uppercase tracking-wide block mb-1">Comments / ملاحظات</label>
              <Textarea
                placeholder=""
                className="text-xs w-full border-[#c3c6d6] rounded-md"
                rows={3}
                dir="ltr"
              />
            </div>
            <div className="w-1/3">
              <label className="text-[10px] font-bold text-[#003d9b] uppercase tracking-wide block mb-1">{sheetTemplate.notesLabel}</label>
              <Textarea
                placeholder=""
                className="text-xs w-full border-[#003d9b]/30 rounded-md bg-[#003d9b]/5"
                rows={3}
                dir="ltr"
              />
            </div>
          </div>

          <div className="mb-3 w-full">
            <label className="text-[10px] font-bold text-[#003d9b] uppercase tracking-wide block mb-1">Final Decision / القرار النهائي</label>
            <Textarea
              placeholder=""
              className="text-xs w-full border-[#c3c6d6] rounded-md"
              rows={2}
              dir="ltr"
            />
          </div>

          {/* Signatures */}
          <div className="border-t-2 border-[#003d9b] pt-3 mt-2">
            <div className="grid grid-cols-4 gap-4 text-xs" dir="rtl">
              {[
                ["طبيب / Doctor", signatures.doctor, true],
                ["فني / Optometrist", signatures.technician, false],
                ["تمريض / Nursing", signatures.nurse, false],
                ["استقبال / Reception", signatures.reception, false],
              ].map(([label, val, isDoctor], i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className={`border-b-2 w-full h-9 flex items-end justify-center pb-1 ${isDoctor ? "border-[#003d9b]" : "border-[#c3c6d6]"}`}>
                    {val && <span className={`text-xs italic ${isDoctor ? "text-[#003d9b] font-semibold" : "text-[#737685]"}`}>{val as string}</span>}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wide ${isDoctor ? "text-[#003d9b]" : "text-[#434654]"}`}>{label as string}</span>
                </div>
              ))}
            </div>
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
