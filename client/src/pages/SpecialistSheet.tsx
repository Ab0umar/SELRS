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
import SheetPatientVisionBlock from "@/components/sheets/SheetPatientVisionBlock";
import SheetPrintHeader from "@/components/sheets/SheetPrintHeader";
import SheetWatermark from "@/components/sheets/SheetWatermark";
import { formatSheetDate, getPatientSheetDateOfBirth } from "@/lib/sheetDates";

export default function SpecialistSheet() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { goBack } = useAppNavigation();
  const [, params] = useRoute("/sheets/specialist/:id");
  const initialPatientId = params?.id ? Number(params.id) : undefined;
  const requestedVisitId =
    Number(new URLSearchParams(window.location.search).get("visitId")) ||
    undefined;

  const [formData, setFormData] = useState({
    patientName: "",
    dateOfBirth: "",
    age: "",
    address: "",
    phone: "",
    alternatePhone: "",
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
  const [readingValue, setReadingValue] = useState("");
  const [notes, setNotes] = useState("");
  const [finalDecision, setFinalDecision] = useState("");
  const [glassesCheck, setGlassesCheck] = useState(false);
  const [xrayCheck, setXrayCheck] = useState(false);
  const [printOffsetXmm, setPrintOffsetXmm] = useState(0);
  const [printOffsetYmm, setPrintOffsetYmm] = useState(0);
  const [printScale, setPrintScale] = useState(1);
  const [customSheetCss, setCustomSheetCss] = useState("");
  const [sheetTemplate, setSheetTemplate] = useState(
    DEFAULT_SHEET_DESIGNER_CONFIG.templates.specialist,
  );
  const designerSettingsQuery = trpc.medical.getSystemSetting.useQuery(
    { key: "sheet_designer_config" },
    {
      enabled: isAuthenticated,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  );
  const mobileSheetModeQuery = trpc.medical.getSystemSetting.useQuery(
    { key: "mobile_sheet_mode_v1" },
    {
      enabled: isAuthenticated,
      retry: 2,
      refetchOnWindowFocus: false,
    },
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
    enabled: isAuthenticated && Boolean(initialPatientId),
    retry: 2,
    refetchOnWindowFocus: false,
  });
  const examinationsQuery = trpc.medical.getExaminationsByPatient.useQuery(
    { patientId: initialPatientId ?? 0 },
    {
      enabled: isAuthenticated && Boolean(initialPatientId),
      retry: 2,
      refetchOnWindowFocus: false,
    },
  );
  const glassesQuery = trpc.medical.getGlassesRecordsByPatient.useQuery(
    { patientId: initialPatientId ?? 0 },
    {
      enabled: isAuthenticated && Boolean(initialPatientId),
      retry: 2,
      refetchOnWindowFocus: false,
    },
  );
  const autorefQuery = trpc.medical.getAutorefractometryByPatient.useQuery(
    { patientId: initialPatientId ?? 0 },
    {
      enabled: isAuthenticated && Boolean(initialPatientId),
      retry: 2,
      refetchOnWindowFocus: false,
    },
  );
  const visitsQuery = trpc.medical.getVisitsByPatient.useQuery(
    { patientId: initialPatientId ?? 0 },
    {
      enabled: isAuthenticated && Boolean(initialPatientId),
      retry: 2,
      refetchOnWindowFocus: false,
    },
  );
  const reportsQuery = trpc.medical.getMedicalReportsByPatient.useQuery(
    { patientId: initialPatientId ?? 0 },
    {
      enabled: isAuthenticated && Boolean(initialPatientId),
      retry: 2,
      refetchOnWindowFocus: false,
    },
  );
  const prescriptionsQuery =
    trpc.medical.getPrescriptionsWithItemsByPatient.useQuery(
      { patientId: initialPatientId ?? 0 },
      {
        enabled: isAuthenticated && Boolean(initialPatientId),
        retry: 2,
        refetchOnWindowFocus: false,
      },
    );
  const pentacamQuery = trpc.medical.getPentacamMeasurementsByPatient.useQuery(
    { patientId: initialPatientId ?? 0, limit: 10 },
    {
      enabled: isAuthenticated && Boolean(initialPatientId),
      retry: 2,
      refetchOnWindowFocus: false,
    },
  );
  const sheetQuery = trpc.medical.getSheetEntry.useQuery(
    {
      patientId: initialPatientId ?? 0,
      sheetType: "specialist",
      visitId: requestedVisitId,
    },
    {
      enabled: isAuthenticated && Boolean(initialPatientId),
      retry: 2,
      refetchOnWindowFocus: false,
    },
  );

  // Auto-print (triggered by usePrintMode below) must wait for the sheet's
  // own data to finish loading — otherwise the print preview/dialog fires
  // against a still-empty page.
  const printMode = usePrintMode({
    ready:
      Boolean(initialPatientId) &&
      !patientQuery.isLoading &&
      !examinationsQuery.isLoading &&
      !sheetQuery.isLoading,
  });
  useEffect(() => {
    if (!initialPatientId) return;
    const socket = connectSheetUpdates({
      patientId: initialPatientId,
      onUpdate: () => {
        Promise.all([
          sheetQuery.refetch(),
          patientQuery.refetch(),
          examinationsQuery.refetch(),
          glassesQuery.refetch(),
          autorefQuery.refetch(),
          visitsQuery.refetch(),
          reportsQuery.refetch(),
          prescriptionsQuery.refetch(),
          pentacamQuery.refetch(),
        ]);
      },
    });
    return () => socket?.close();
    // query.refetch is stable in @tanstack/react-query; listing the query
    // objects themselves here would tear the socket down on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPatientId]);
  const saveSheetMutation = trpc.medical.saveSheetEntry.useMutation({
    onSuccess: () => {
      toast.success("تم الحفظ");
    },
  });

  const handleSelectPatient = (patient: {
    id: number;
    fullName: string;
    patientCode?: string | null;
    phone?: string | null;
    alternatePhone?: string | null;
    age?: number | null;
    dateOfBirth?: string | Date | null;
    date_of_birth?: string | Date | null;
    birthDate?: string | Date | null;
    dob?: string | Date | null;
    birth?: string | Date | null;
    BDT?: string | Date | null;
    address?: string | null;
    occupation?: string | null;
  }) => {
    setFormData((prev) => ({
      ...prev,
      patientName: patient.fullName ?? "",
      phone: patient.phone ?? "",
      alternatePhone: patient.alternatePhone ?? "",
      age: patient.age != null ? String(patient.age) : "",
      dateOfBirth: getPatientSheetDateOfBirth(patient),
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
      alternatePhone: patient.alternatePhone ?? "",
      age: patient.age != null ? String(patient.age) : "",
      dateOfBirth: getPatientSheetDateOfBirth(patient),
      address: patient.address ?? "",
      patientCode: patient.patientCode ?? "",
      job: patient.occupation ?? "",
    }));
  }, [patientQuery.data]);

  useEffect(() => {
    if (!sheetQuery.data) return;
    let parsed: any;
    try {
      parsed = JSON.parse(sheetQuery.data);
    } catch {
      toast.warning("تعذر قراءة بيانات الشيت المحفوظة. قد تظهر الحقول فارغة.");
      return;
    }
    if (parsed.formData) {
      setFormData((prev) => ({
        ...prev,
        ...parsed.formData,
        // keep patient info from DB if present
        patientName: prev.patientName || parsed.formData.patientName,
        phone: prev.phone || parsed.formData.phone,
        alternatePhone:
          prev.alternatePhone || parsed.formData.alternatePhone || "",
        age: prev.age || parsed.formData.age,
        dateOfBirth:
          prev.dateOfBirth || formatSheetDate(parsed.formData.dateOfBirth),
        address: prev.address || parsed.formData.address,
      }));
    }
    if (parsed.examData?.autorefraction) {
      const auto = parsed.examData.autorefraction;
      setFormData((prev) => ({
        ...prev,
        ucvaOD: auto.od?.ucva ?? "",
        ucvaOS: auto.os?.ucva ?? "",
        bcvaOD: auto.od?.bcva ?? "",
        bcvaOS: auto.os?.bcva ?? "",
        iopOD: auto.od?.iop ?? "",
        iopOS: auto.os?.iop ?? "",
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
    if (parsed.examData?.glasses) {
      const glasses = parsed.examData.glasses;
      setFormData((previous) => ({
        ...previous,
        refractionOD: {
          s: glasses.od?.s ?? "",
          c: glasses.od?.c ?? "",
          a: glasses.od?.axis ?? "",
        },
        refractionOS: {
          s: glasses.os?.s ?? "",
          c: glasses.os?.c ?? "",
          a: glasses.os?.axis ?? "",
        },
      }));
    }
    setNotes(String(parsed.notes ?? ""));
    setReadingValue(String(parsed.readingValue ?? ""));
    setFinalDecision(String(parsed.finalDecision ?? ""));
    if (parsed.checks) {
      setGlassesCheck(Boolean(parsed.checks.glasses));
      setXrayCheck(Boolean(parsed.checks.xray));
    }
  }, [sheetQuery.data]);

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
  }, [user?.name, user?.role, sheetQuery.data]);

  const isSaving = saveSheetMutation.isPending;

  const specialistDataQueries = [
    sheetQuery,
    patientQuery,
    examinationsQuery,
    glassesQuery,
    autorefQuery,
    visitsQuery,
    reportsQuery,
    prescriptionsQuery,
    pentacamQuery,
  ];
  const specialistDataFailed = specialistDataQueries.some((q) => q.isError);
  const specialistDataLoading =
    Boolean(initialPatientId) &&
    (sheetQuery.isLoading || patientQuery.isLoading);

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
          return null;
        }
      })();
      if (existing === null) {
        toast.error(
          "تعذر قراءة البيانات المحفوظة؛ تم إلغاء الحفظ لتجنب فقدانها. حدّث الصفحة وحاول مرة أخرى.",
        );
        return;
      }
      const pickValue = (next: string, prev?: string) => next;
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
        visitId: requestedVisitId,
        sheetType: "specialist",
        content: JSON.stringify({
          ...existing,
          formData: { ...(existing.formData ?? {}), ...formData },
          examData: mergedExamData,
          checks: { glasses: glassesCheck, xray: xrayCheck },
          notes,
          readingValue,
          finalDecision,
          finalDecisionText: finalDecision,
        }),
      });
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "حدث خطأ أثناء الحفظ"));
    }
  };

  const handlePrint = () => {
    void printOrExportPdf(
      `${String(formData.patientName || formData.patientCode || initialPatientId || "specialist-sheet").trim()}.pdf`,
      { forceBrowserPrint: true },
    );
  };

  const persistPrintLayout = (patch: {
    offsetXmm?: number;
    offsetYmm?: number;
    scale?: number;
  }) => {
    const config = loadSheetDesignerConfig();
    saveSheetDesignerConfig({
      ...config,
      layout: {
        ...config.layout,
        specialist: { ...config.layout.specialist, ...patch },
      },
    });
  };

  return (
    <div
      className={`min-h-screen bg-[#dde1e7] sheet-layout specialist-page-root ${printMode.printView ? "print-view-active" : ""} ${mobileSheetModeEnabled && !printMode.printView ? "mobile-sheet-mode" : ""}`}
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
        .specialist-sheet {
          font-weight: 400;
          text-decoration: none;
        }
        .specialist-sheet th { font-weight: 600 !important; }
        .specialist-sheet table input { font-weight: 600 !important; }
        .patient-row-bold, .patient-row-bold * { font-weight: 700 !important; }
        .patient-row-normal, .patient-row-normal * { font-weight: 400 !important; }
        .specialist-sheet .border-b,
        .specialist-sheet .border-b-2 {
          border-bottom: none !important;
        }
        .specialist-sheet .sheet-print-header {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) !important;
          align-items: center !important;
          border-bottom: 2px solid #003d9b !important;
          padding-bottom: 10px !important;
          margin-bottom: 10px !important;
        }
        .specialist-sheet .sheet-print-clinic-name {
          font-size: 24px !important;
          font-weight: 700 !important;
          line-height: 1.1 !important;
          color: #003d9b !important;
        }
        .specialist-sheet .sheet-print-clinic-tagline {
          font-size: 14px !important;
          font-weight: 400 !important;
          line-height: 1.2 !important;
          color: #434654 !important;
        }
        .specialist-sheet .sheet-print-logo {
          width: 64px !important;
          height: 64px !important;
        }
        .specialist-sheet .sheet-print-type {
          font-size: 20px !important;
          font-weight: 700 !important;
          line-height: 1.15 !important;
          color: #191c1e !important;
        }
        .specialist-sheet .sheet-watermark {
          opacity: 1 !important;
        }
        @media print {
          /* Scrollbars are useful on screen but must never be captured in print/PDF output. */
          html, body, #root,
          .specialist-page-root,
          .specialist-page-root * {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }
          html::-webkit-scrollbar,
          body::-webkit-scrollbar,
          #root::-webkit-scrollbar,
          .specialist-page-root::-webkit-scrollbar,
          .specialist-page-root *::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
          }
          .specialist-page-root,
          .specialist-sheet {
            overflow: visible !important;
          }
          .print-page-center-a5 { width: 100%; margin: 0 auto; }
          body { background: white !important; }
          /* the shared .sheet-layout print rule clips this page's fixed-width sheet — undo it here */
          .specialist-page-root.sheet-layout {
            overflow: visible !important;
            max-height: none !important;
            min-height: 0 !important;
            font-size: 100% !important;
          }
          .specialist-sheet {
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            box-sizing: border-box !important;
            margin: 0 auto !important;
            padding: 5mm !important;
            gap: 6px !important;
            line-height: 1.15 !important;
            border: 0 !important;
            box-shadow: none !important;
            transform: translateX(${printOffsetXmm}mm) translateY(${printOffsetYmm}mm) scale(${printScale}) !important;
          }
          .specialist-sheet section,
          .specialist-sheet footer,
          .specialist-sheet table,
          .specialist-sheet tr,
          .specialist-sheet td,
          .specialist-sheet th {
            page-break-inside: avoid !important;
          }
          .specialist-sheet table { font-size: 14px !important; }
          .specialist-sheet table th,
          .specialist-sheet table td,
          .specialist-sheet table input,
          .specialist-sheet table textarea {
            text-align: center !important;
            vertical-align: middle !important;
          }
          .specialist-sheet .sheet-refraction-table th,
          .specialist-sheet .sheet-refraction-table td,
          .specialist-sheet .sheet-refraction-table input {
            font-size: 15px !important;
          }
          .specialist-sheet .sheet-refraction-table tbody td {
            height: 11mm !important;
            padding: 3px 4px !important;
          }
          .specialist-sheet input,
          .specialist-sheet select {
            font-size: 14px !important;
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
          .specialist-sheet .patient-detail-emphasis {
            font-size: 14px !important;
            font-weight: 700 !important;
          }
          .specialist-sheet .sheet-print-header {
            border-bottom: 2px solid #003d9b !important;
            padding-bottom: 2mm !important;
            margin-bottom: 2mm !important;
          }
          .specialist-sheet .sheet-print-clinic-name {
            font-size: 21px !important;
            font-weight: 700 !important;
          }
          .specialist-sheet .sheet-print-clinic-tagline {
            font-size: 12px !important;
            font-weight: 400 !important;
          }
          .specialist-sheet .sheet-print-logo {
            width: 15mm !important;
            height: 15mm !important;
          }
          .specialist-sheet .sheet-print-type {
            font-size: 18px !important;
            font-weight: 700 !important;
          }
          .specialist-sheet .sheet-watermark img {
            width: 120mm !important;
            height: 120mm !important;
            opacity: 0.055 !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
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
          .print-sheet-patient-grid {
            display: flex !important;
            flex-wrap: wrap !important;
            column-gap: 5mm !important;
            row-gap: 1mm !important;
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
      <header
        className={`specialist-screen-toolbar sticky top-0 z-50 flex flex-wrap items-start justify-between gap-3 border-b border-border/60 bg-card px-3 py-2 sm:px-6 print:hidden ${printMode.printView ? "hidden" : ""}`}
        dir="ltr"
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        <div className="flex min-w-0 flex-wrap items-start gap-3">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => goBack()}
          >
            رجوع
          </Button>
          {user?.role === "admin" && !printMode.printView ? (
            <details className="max-w-full print:hidden text-xs" dir="rtl">
              <summary className="cursor-pointer select-none text-muted-foreground hover:text-foreground">
                إعدادات الطباعة
              </summary>
              <div className="mt-2 flex w-52 max-w-full flex-col gap-1.5 rounded-md border border-border bg-card p-2">
                <label className="flex items-center justify-between gap-2">
                  <span>إزاحة أفقية (مم)</span>
                  <input
                    type="number"
                    step="0.5"
                    className="w-16 rounded border border-border bg-background px-1 py-0.5 text-right"
                    value={printOffsetXmm}
                    onChange={(e) => {
                      const v = Number(e.target.value) || 0;
                      setPrintOffsetXmm(v);
                      persistPrintLayout({ offsetXmm: v });
                    }}
                  />
                </label>
                <label className="flex items-center justify-between gap-2">
                  <span>إزاحة رأسية (مم)</span>
                  <input
                    type="number"
                    step="0.5"
                    className="w-16 rounded border border-border bg-background px-1 py-0.5 text-right"
                    value={printOffsetYmm}
                    onChange={(e) => {
                      const v = Number(e.target.value) || 0;
                      setPrintOffsetYmm(v);
                      persistPrintLayout({ offsetYmm: v });
                    }}
                  />
                </label>
                <label className="flex items-center justify-between gap-2">
                  <span>مقياس الطباعة</span>
                  <input
                    type="number"
                    step="0.05"
                    className="w-16 rounded border border-border bg-background px-1 py-0.5 text-right"
                    value={printScale}
                    onChange={(e) => {
                      const v = Number(e.target.value) || 1;
                      setPrintScale(v);
                      persistPrintLayout({ scale: v });
                    }}
                  />
                </label>
              </div>
            </details>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            className="rounded bg-primary px-4 py-2 font-bold text-primary-foreground hover:opacity-90"
            onClick={handleSaveSheet}
            disabled={isSaving}
            type="button"
          >
            {isSaving ? "حفظ…" : "حفظ"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded border-primary px-4 py-2 font-bold text-primary hover:bg-primary/5"
            onClick={handlePrint}
            type="button"
          >
            <Printer className="h-4 w-4 mr-1" /> طباعة
          </Button>
        </div>
      </header>

      {printMode.printView && (
        <PrintPreviewBanner
          title="مقاس نظارة / أشعة خارجي"
          subtitle={formData.patientName || undefined}
          onPrint={handlePrint}
        />
      )}

      <div className="py-8 print:py-0 print-page-center-a5">
        {!printMode.printView && !initialPatientId ? (
          <div
            className="print:hidden mx-auto mb-6 max-w-md rounded-xl border border-border bg-card p-4 text-center"
            dir="rtl"
          >
            <p className="mb-3 text-sm font-semibold text-foreground">
              اختر مريضًا لفتح شيت مقاس النظارة
            </p>
            <PatientPicker
              onSelect={handleSelectPatient}
              placeholder="ابحث برمز المريض"
            />
          </div>
        ) : null}
        {!printMode.printView && specialistDataFailed ? (
          <div
            role="alert"
            className="print:hidden mx-auto mb-6 flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3"
            dir="rtl"
          >
            <p className="text-sm font-semibold text-red-900">
              تعذر تحميل بيانات المريض. تحقق من الاتصال ثم أعد المحاولة.
            </p>
            <button
              type="button"
              onClick={() => {
                for (const q of specialistDataQueries) {
                  if (q.isError) q.refetch();
                }
              }}
              className="rounded-md border border-red-400 bg-white px-3 py-1.5 text-xs font-bold text-red-900 hover:bg-red-100"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : null}
        {!printMode.printView && specialistDataLoading ? (
          <div
            role="status"
            className="print:hidden mx-auto mb-6 max-w-2xl rounded-lg border border-border bg-muted px-4 py-2 text-center text-sm text-muted-foreground"
            dir="rtl"
          >
            جارٍ تحميل بيانات المريض…
          </div>
        ) : null}
        <div
          data-mobile-pdf-root
          className={`specialist-sheet relative overflow-hidden bg-white text-[#191c1e] font-sans p-8 border border-[#c3c6d6] shadow-sm flex flex-col gap-5 w-[210mm] max-w-full mx-auto ${printMode.printView ? "hidden print:flex" : ""}`}
          dir="ltr"
        >
          <SheetWatermark />
          <SheetPrintHeader
            sheetType="مقاس نظارة / أشعة خارجي"
            sheetTypeContent={
              <div className="flex flex-col gap-1" dir="rtl">
                <label className="flex items-center gap-2 text-sm font-bold text-[#191c1e]">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded text-[#003d9b]"
                    checked={glassesCheck}
                    onChange={(e) => setGlassesCheck(e.target.checked)}
                  />
                  مقاس نظارة
                </label>
                <label className="flex items-center gap-2 text-sm font-bold text-[#191c1e]">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded text-[#003d9b]"
                    checked={xrayCheck}
                    onChange={(e) => setXrayCheck(e.target.checked)}
                  />
                  أشعة
                </label>
              </div>
            }
          />

          <SheetPatientVisionBlock
            patientName={formData.patientName}
            onPatientNameChange={(v) =>
              setFormData((p) => ({ ...p, patientName: v }))
            }
            age={formData.age}
            onAgeChange={(v) => setFormData((p) => ({ ...p, age: v }))}
            dateOfBirth={formData.dateOfBirth}
            address={formData.address}
            onAddressChange={(v) => setFormData((p) => ({ ...p, address: v }))}
            phone={formData.phone}
            onPhoneChange={(v) => setFormData((p) => ({ ...p, phone: v }))}
            alternatePhone={formData.alternatePhone}
            onAlternatePhoneChange={(v) =>
              setFormData((p) => ({ ...p, alternatePhone: v }))
            }
            patientCode={formData.patientCode}
            onPatientCodeChange={(v) =>
              setFormData((p) => ({ ...p, patientCode: v }))
            }
            examinationDate={formData.examinationDate}
            onExaminationDateChange={(v) =>
              setFormData((p) => ({ ...p, examinationDate: v }))
            }
            job={formData.job}
            onJobChange={(v) => setFormData((p) => ({ ...p, job: v }))}
            doctorName={signatures.doctor}
            onDoctorNameChange={(v) =>
              setSignatures((p) => ({ ...p, doctor: v }))
            }
            ucvaOD={formData.ucvaOD}
            onUcvaODChange={(v) => setFormData((p) => ({ ...p, ucvaOD: v }))}
            ucvaOS={formData.ucvaOS}
            onUcvaOSChange={(v) => setFormData((p) => ({ ...p, ucvaOS: v }))}
            bcvaOD={formData.bcvaOD}
            onBcvaODChange={(v) => setFormData((p) => ({ ...p, bcvaOD: v }))}
            bcvaOS={formData.bcvaOS}
            onBcvaOSChange={(v) => setFormData((p) => ({ ...p, bcvaOS: v }))}
            iopOD={formData.iopOD}
            onIopODChange={(v) => setFormData((p) => ({ ...p, iopOD: v }))}
            iopOS={formData.iopOS}
            onIopOSChange={(v) => setFormData((p) => ({ ...p, iopOS: v }))}
            refractionOD={formData.refractionOD}
            onRefractionODChange={(v) =>
              setFormData((p) => ({ ...p, refractionOD: v }))
            }
            refractionOS={formData.refractionOS}
            onRefractionOSChange={(v) =>
              setFormData((p) => ({ ...p, refractionOS: v }))
            }
            readingValue={readingValue}
            onReadingValueChange={setReadingValue}
            compactEyeTable
          />

          <footer className="pt-6 border-t-2 border-[#003d9b] space-y-6">
            <div className="print-specialist-footer-grid grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-4">
                <div>
                  <label
                    htmlFor="specialist-notes"
                    className="font-bold text-[#003d9b] text-sm"
                  >
                    Comments / ملاحظات:
                  </label>
                  <Textarea
                    id="specialist-notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    className="mt-1 min-h-20 resize-none border-0 border-b border-[#c3c6d6] bg-transparent p-1"
                  />
                </div>
                <div>
                  <label
                    htmlFor="specialist-final-decision"
                    className="font-bold text-[#003d9b] text-sm"
                  >
                    Final Decision / القرار النهائي:
                  </label>
                  <Textarea
                    id="specialist-final-decision"
                    value={finalDecision}
                    onChange={(event) => setFinalDecision(event.target.value)}
                    className="mt-1 min-h-16 resize-none border-0 border-b border-[#c3c6d6] bg-transparent p-1"
                  />
                </div>
              </div>
              <div className="lg:col-span-4 border-2 border-[#003d9b] rounded-xl p-4 bg-[#003d9b]/5">
                <div className="text-center font-bold text-[#003d9b] text-xs border-b border-[#003d9b]/20 pb-2 mb-3">
                  Notes | ملاحظات
                </div>
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
                  <span
                    className={`text-[11px] font-bold ${i === 1 ? "text-[#003d9b]" : "text-[#434654]"}`}
                  >
                    {label}
                  </span>
                  <div
                    className={`border-b-2 h-9 flex items-end justify-center ${i === 1 ? "border-[#003d9b]" : "border-[#191c1e]"}`}
                  >
                    <span
                      className={`text-xs italic ${i === 1 ? "text-[#003d9b] font-bold" : "text-[#434654]"}`}
                    >
                      {val || ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
