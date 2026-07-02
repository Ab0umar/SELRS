import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Printer, User, LayoutGrid, Layers, Target, Clock } from "lucide-react";
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
import SheetCenterHeader from "@/components/SheetCenterHeader";
import FollowupTablesBody from "@/components/sheets/FollowupTablesBody";

export default function LasikExamSheet() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { goBack } = useAppNavigation();
  const [, params] = useRoute("/sheets/:type/:id");
  const initialPatientId = params?.id ? Number(params.id) : undefined;
  const printMode = usePrintMode({ ready: Boolean(initialPatientId) });
  const originalMode =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("original") === "1";
  const [followupLabels, setFollowupLabels] = useState(
    DEFAULT_SHEET_DESIGNER_CONFIG.followupLasik,
  );
  const [followups, setFollowups] = useState([
    { id: 1, date: "", type: "المتابعة الأولى" },
    { id: 2, date: "", type: "المتابعة الثانية" },
    { id: 3, date: "", type: "المتابعة الثالثة" },
    { id: 4, date: "", type: "المتابعة الرابعة" },
  ]);

  const [operationType, setOperationType] = useState("ليزك");
  const [operationDateRight, setOperationDateRight] = useState("");
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
  });
  const [examData, setExamData] = useState({
    autorefraction: {
      od: { s: "", c: "", axis: "", va: "", iop: "", ucva: "", bcva: "" },
      os: { s: "", c: "", axis: "", va: "", iop: "", ucva: "", bcva: "" },
    },
    pentacam: {
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
    DEFAULT_SHEET_DESIGNER_CONFIG.templates.lasik,
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
    setCustomSheetCss(localDesigner.css.lasik || "");
    setSheetTemplate(localDesigner.templates.lasik);
    setPrintOffsetXmm(localDesigner.layout.lasik.offsetXmm);
    setPrintOffsetYmm(localDesigner.layout.lasik.offsetYmm);
    setPrintScale(localDesigner.layout.lasik.scale);
    setFollowupLabels(localDesigner.followupLasik);
  }, []);

  useEffect(() => {
    if (!designerSettingsQuery.data?.value) return;
    const merged = coerceSheetDesignerConfig(designerSettingsQuery.data.value);
    setCustomSheetCss(merged.css.lasik || "");
    setSheetTemplate(merged.templates.lasik);
    setPrintOffsetXmm(merged.layout.lasik.offsetXmm);
    setPrintOffsetYmm(merged.layout.lasik.offsetYmm);
    setPrintScale(merged.layout.lasik.scale);
    setFollowupLabels(merged.followupLasik);
    saveSheetDesignerConfig(merged);
  }, [designerSettingsQuery.data]);

  useEffect(() => {
    const names = followupLabels?.followupNames ?? [];
    setFollowups((prev) =>
      prev.map((item, i) => ({ ...item, type: names[i] ?? item.type })),
    );
  }, [followupLabels?.followupNames]);

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
    { patientId: initialPatientId ?? 0, sheetType: "lasik" },
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
      setLocation(`/sheets/lasik/${patient.id}`);
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
      if (parsed.examData) {
        setExamData((prev) => ({
          autorefraction: {
            od: {
              ...prev.autorefraction.od,
              ...(parsed.examData.autorefraction?.od ?? {}),
            },
            os: {
              ...prev.autorefraction.os,
              ...(parsed.examData.autorefraction?.os ?? {}),
            },
          },
          pentacam: {
            od: {
              ...prev.pentacam.od,
              ...(parsed.examData.pentacam?.od ?? {}),
            },
            os: {
              ...prev.pentacam.os,
              ...(parsed.examData.pentacam?.os ?? {}),
            },
          },
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
        setOperationType(parsed.operationDetails.type ?? "ليزك");
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
      setExamData((prev) => ({
        autorefraction: {
          od: { ...prev.autorefraction.od, ...(auto?.od ?? {}) },
          os: { ...prev.autorefraction.os, ...(auto?.os ?? {}) },
        },
        pentacam: prev.pentacam,
      }));
    }
    if (latestExam.pentacam) {
      const pentacam = latestExam.pentacam;
      setExamData((prev) => ({
        autorefraction: prev.autorefraction,
        pentacam: {
          od: { ...prev.pentacam.od, ...(pentacam?.od ?? {}) },
          os: { ...prev.pentacam.os, ...(pentacam?.os ?? {}) },
        },
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
              examData.autorefraction.od.ucva,
              existing.examData?.autorefraction?.od?.ucva,
            ),
            bcva: pickValue(
              examData.autorefraction.od.bcva,
              existing.examData?.autorefraction?.od?.bcva,
            ),
            s: pickValue(
              examData.autorefraction.od.s,
              existing.examData?.autorefraction?.od?.s,
            ),
            c: pickValue(
              examData.autorefraction.od.c,
              existing.examData?.autorefraction?.od?.c,
            ),
            axis: pickValue(
              examData.autorefraction.od.axis,
              existing.examData?.autorefraction?.od?.axis,
            ),
            iop: pickValue(
              examData.autorefraction.od.iop,
              existing.examData?.autorefraction?.od?.iop,
            ),
          },
          os: {
            ...(existing.examData?.autorefraction?.os ?? {}),
            ucva: pickValue(
              examData.autorefraction.os.ucva,
              existing.examData?.autorefraction?.os?.ucva,
            ),
            bcva: pickValue(
              examData.autorefraction.os.bcva,
              existing.examData?.autorefraction?.os?.bcva,
            ),
            s: pickValue(
              examData.autorefraction.os.s,
              existing.examData?.autorefraction?.os?.s,
            ),
            c: pickValue(
              examData.autorefraction.os.c,
              existing.examData?.autorefraction?.os?.c,
            ),
            axis: pickValue(
              examData.autorefraction.os.axis,
              existing.examData?.autorefraction?.os?.axis,
            ),
            iop: pickValue(
              examData.autorefraction.os.iop,
              existing.examData?.autorefraction?.os?.iop,
            ),
          },
        },
        pentacam: {
          od: {
            ...(existing.examData?.pentacam?.od ?? {}),
            k1: pickValue(
              examData.pentacam.od.k1,
              existing.examData?.pentacam?.od?.k1,
            ),
            k2: pickValue(
              examData.pentacam.od.k2,
              existing.examData?.pentacam?.od?.k2,
            ),
            ax1: pickValue(
              examData.pentacam.od.ax1,
              existing.examData?.pentacam?.od?.ax1,
            ),
            ax2: pickValue(
              examData.pentacam.od.ax2,
              existing.examData?.pentacam?.od?.ax2,
            ),
            thinnest: pickValue(
              examData.pentacam.od.thinnest,
              existing.examData?.pentacam?.od?.thinnest,
            ),
            apex: pickValue(
              examData.pentacam.od.apex,
              existing.examData?.pentacam?.od?.apex,
            ),
            residual: pickValue(
              examData.pentacam.od.residual,
              existing.examData?.pentacam?.od?.residual,
            ),
            ttt: pickValue(
              examData.pentacam.od.ttt,
              existing.examData?.pentacam?.od?.ttt,
            ),
            ablation: pickValue(
              examData.pentacam.od.ablation,
              existing.examData?.pentacam?.od?.ablation,
            ),
          },
          os: {
            ...(existing.examData?.pentacam?.os ?? {}),
            k1: pickValue(
              examData.pentacam.os.k1,
              existing.examData?.pentacam?.os?.k1,
            ),
            k2: pickValue(
              examData.pentacam.os.k2,
              existing.examData?.pentacam?.os?.k2,
            ),
            ax1: pickValue(
              examData.pentacam.os.ax1,
              existing.examData?.pentacam?.os?.ax1,
            ),
            ax2: pickValue(
              examData.pentacam.os.ax2,
              existing.examData?.pentacam?.os?.ax2,
            ),
            thinnest: pickValue(
              examData.pentacam.os.thinnest,
              existing.examData?.pentacam?.os?.thinnest,
            ),
            apex: pickValue(
              examData.pentacam.os.apex,
              existing.examData?.pentacam?.os?.apex,
            ),
            residual: pickValue(
              examData.pentacam.os.residual,
              existing.examData?.pentacam?.os?.residual,
            ),
            ttt: pickValue(
              examData.pentacam.os.ttt,
              existing.examData?.pentacam?.os?.ttt,
            ),
            ablation: pickValue(
              examData.pentacam.os.ablation,
              existing.examData?.pentacam?.os?.ablation,
            ),
          },
        },
      };
      await saveSheetMutation.mutateAsync({
        patientId: initialPatientId,
        sheetType: "lasik",
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
  }, [formData, examData, operationType, operationEyes, initialPatientId]);

  const handlePrint = () => {
    void printOrExportPdf(
      `${String(formData.patientName || formData.patientCode || initialPatientId || "lasik-sheet").trim()}.pdf`,
      { forceBrowserPrint: true },
    );
  };

  const renderSheetBody = (_readOnly = false) => {
    const odThinnestNum = parseFloat(examData.pentacam.od.thinnest);
    const osThinnestNum = parseFloat(examData.pentacam.os.thinnest);
    const odIopNum = parseFloat(examData.autorefraction.od.iop);
    const osIopNum = parseFloat(examData.autorefraction.os.iop);
    const today = new Date().toLocaleDateString("en-GB");

    const mkAutoPatch = (eye: "od" | "os", field: string) =>
      (e: React.ChangeEvent<HTMLInputElement>) =>
        setExamData((prev) => ({
          ...prev,
          autorefraction: {
            ...prev.autorefraction,
            [eye]: { ...prev.autorefraction[eye], [field]: e.target.value } as typeof prev.autorefraction.od,
          },
        }));

    const mkPentaPatch = (eye: "od" | "os", field: string) =>
      (e: React.ChangeEvent<HTMLInputElement>) =>
        setExamData((prev) => ({
          ...prev,
          pentacam: {
            ...prev.pentacam,
            [eye]: { ...prev.pentacam[eye], [field]: e.target.value } as typeof prev.pentacam.od,
          },
        }));

    const inp =
      "w-full text-center bg-transparent border-0 border-b border-solid border-[#737685] focus:outline-none focus:border-[#003d9b] py-1 text-sm";
    const ctd = "p-1 border border-[#c3c6d6]";

    return (
      <div
        className="lasik-sheet bg-white text-[#191c1e] font-sans p-8 print:p-[10mm] print:border-0 print:shadow-none border border-[#c3c6d6] shadow-sm flex flex-col gap-5 w-[210mm] max-w-full mx-auto"
        dir="ltr"
      >
        {/* Header */}
        <SheetCenterHeader
          titleEn="Lasik Exam Sheet"
          titleAr="شيت فحص الليزك"
          date={formData.examinationDate || today}
        />

        {/* Patient Info */}
        <section className="print-lasik-patient-grid p-4 bg-[#f3f4f6] rounded-xl border border-[#c3c6d6] flex flex-wrap items-center gap-x-6 gap-y-2 text-sm" dir="rtl">
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
          <div className="inline-flex items-center gap-1 whitespace-nowrap"><span className="font-bold text-[#434654]">نوع العملية:</span>
            <select className="w-28 text-xs rounded border-[#c3c6d6] bg-white py-1" value={operationType} onChange={(e) => setOperationType(e.target.value)}>
              <option value="ليزك">ليزك</option>
              <option value="فيمتو ليزك">فيمتو ليزك</option>
              <option value="PRK">PRK</option>
              <option value="فيمتو سمايل">سمايل</option>
              <option value="ICL">ICL</option>
            </select>
          </div>
        </section>

        {/* Eye selection */}
        <div className="flex items-center gap-8 text-sm px-1" dir="ltr">
          <span className="font-bold text-[#434654] uppercase text-xs">Eye:</span>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-4 h-4 rounded text-[#003d9b]" checked={operationEyes.right} onChange={(e) => { const right = e.target.checked; setOperationEyes((p) => ({ ...p, right, both: right && p.left })); }} /> RT (OD)</label>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-4 h-4 rounded text-[#003d9b]" checked={operationEyes.left} onChange={(e) => { const left = e.target.checked; setOperationEyes((p) => ({ ...p, left, both: p.right && left })); }} /> LT (OS)</label>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-4 h-4 rounded text-[#003d9b]" checked={operationEyes.both} onChange={(e) => { const both = e.target.checked; setOperationEyes({ right: both, left: both, both }); }} /> OU</label>
        </div>

        {/* Medical History — two نعم/لا checklists */}
        <section className="print-lasik-questions" dir="rtl">
          <table className="w-full border-collapse border border-[#c3c6d6] rounded-lg overflow-hidden text-sm">
            <thead className="bg-[#e7e8ea]">
              <tr>
                <th className="w-12 p-2 border border-[#c3c6d6]">لا</th>
                <th className="w-12 p-2 border border-[#c3c6d6]">نعم</th>
                <th className="p-2 border border-[#c3c6d6] text-right">التاريخ المرضي</th>
                <th className="w-12 p-2 border border-[#c3c6d6]">لا</th>
                <th className="w-12 p-2 border border-[#c3c6d6]">نعم</th>
                <th className="p-2 border border-[#c3c6d6] text-right">التاريخ المرضي</th>
                <th className="w-12 p-2 border border-[#c3c6d6]">لا</th>
                <th className="w-12 p-2 border border-[#c3c6d6]">نعم</th>
                <th className="p-2 border border-[#c3c6d6] text-right">التاريخ المرضي</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["كورتيزون/ضغط؟", "الغدة الدرقية؟", "أمراض مناعة؟"],
                ["علاج لحب الشباب؟", "الأيزوتريتينوين؟", "مضادات حساسية/اكتئاب؟"],
                ["أمراض عامة؟", "أمراض بالعين؟", "حمل؟"],
                ["قرنية مخروطية بالعائلة؟", "ماء زرقاء؟", "بديل دموع؟"],
              ].map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((q, colIndex) => (
                    q ? (
                      <React.Fragment key={`${rowIndex}-${colIndex}`}>
                        <td className="text-center border border-[#c3c6d6]"><input type="checkbox" className="w-4 h-4 rounded text-[#003d9b]" /></td>
                        <td className="text-center border border-[#c3c6d6]"><input type="checkbox" className="w-4 h-4 rounded text-[#003d9b]" /></td>
                        <td className="p-1.5 border border-[#c3c6d6] text-right">{q}</td>
                      </React.Fragment>
                    ) : (
                      <React.Fragment key={`${rowIndex}-${colIndex}`}>
                        <td className="border border-[#c3c6d6] bg-[#f8f9fb]" />
                        <td className="border border-[#c3c6d6] bg-[#f8f9fb]" />
                        <td className="border border-[#c3c6d6] bg-[#f8f9fb]" />
                      </React.Fragment>
                    )
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Visual Acuity + Tear Film */}
        <section className="print-lasik-visual-grid grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <table className="w-full text-center border-collapse">
              <thead className="bg-[#e7e8ea] text-xs font-bold uppercase">
                <tr><th className={ctd}>Eye</th><th className={ctd}>UCVA</th><th className={ctd}>BCVA</th><th className={ctd}>IOP</th></tr>
              </thead>
              <tbody>
                <tr><td className={`${ctd} text-[#003d9b] bg-[#003d9b]/5`}>OD</td>
                  <td className={ctd}><input className={inp} value={examData.autorefraction.od.ucva} onChange={mkAutoPatch("od", "ucva")} /></td>
                  <td className={ctd}><input className={inp} value={examData.autorefraction.od.bcva} onChange={mkAutoPatch("od", "bcva")} /></td>
                  <td className={ctd}><input className={`${inp} ${!Number.isNaN(odIopNum) && odIopNum > 21 ? "text-red-600" : ""}`} value={examData.autorefraction.od.iop} onChange={mkAutoPatch("od", "iop")} /></td></tr>
                <tr><td className={`${ctd} text-[#526069] bg-[#f3f4f6]`}>OS</td>
                  <td className={ctd}><input className={inp} value={examData.autorefraction.os.ucva} onChange={mkAutoPatch("os", "ucva")} /></td>
                  <td className={ctd}><input className={inp} value={examData.autorefraction.os.bcva} onChange={mkAutoPatch("os", "bcva")} /></td>
                  <td className={ctd}><input className={`${inp} ${!Number.isNaN(osIopNum) && osIopNum > 21 ? "text-red-600" : ""}`} value={examData.autorefraction.os.iop} onChange={mkAutoPatch("os", "iop")} /></td></tr>
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
                <td className={ctd}><input className={inp} value={examData.autorefraction.od.s} onChange={mkAutoPatch("od", "s")} /></td>
                <td className={ctd}><input className={inp} value={examData.autorefraction.od.c} onChange={mkAutoPatch("od", "c")} /></td>
                <td className={ctd}><input className={inp} value={examData.autorefraction.od.axis} onChange={mkAutoPatch("od", "axis")} /></td>
                <td className={ctd}><input className={inp} value={examData.autorefraction.os.s} onChange={mkAutoPatch("os", "s")} /></td>
                <td className={ctd}><input className={inp} value={examData.autorefraction.os.c} onChange={mkAutoPatch("os", "c")} /></td>
                <td className={ctd}><input className={inp} value={examData.autorefraction.os.axis} onChange={mkAutoPatch("os", "axis")} /></td>
              </tr>
              <tr>
                <td className={`${ctd} text-left bg-[#f3f4f6]`}>Fundus</td>
                <td className={ctd} colSpan={3}><input className={inp} /></td>
                <td className={ctd} colSpan={3}><input className={inp} /></td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Pentacam RT / LT */}
        <section className="print-lasik-pentacam-right grid grid-cols-1 lg:grid-cols-[1fr_1.3fr_1.3fr] gap-4">
          <div className="hidden lg:block print:block" /> {/* Empty space on the left */}
          {(["od", "os"] as const).map((eye) => {
            const isOD = eye === "od";
            const thin = isOD ? odThinnestNum : osThinnestNum;
            return (
              <div key={eye} className={`${isOD ? "od-bg border-[#003d9b]/20" : "os-bg border-[#c3c6d6]"} print-lasik-eye-card p-2 rounded-xl border`}>
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-[11px] font-bold uppercase px-2 py-1 bg-white rounded shadow-sm ${isOD ? "text-[#003d9b]" : "text-[#526069]"}`}>{isOD ? "Right Eye (RT)" : "Left Eye (LT)"}</span>
                </div>
                <table className="w-full border-collapse text-sm bg-white rounded-lg overflow-hidden">
                  <tbody>
                    <tr><td className={`${ctd} bg-[#f3f4f6] w-1/3 text-right text-[11px]`}>K1 (Flat)</td><td className={ctd}><input className={inp} value={examData.pentacam[eye].k1} onChange={mkPentaPatch(eye, "k1")} /></td>
                      <td className={`${ctd} bg-[#f3f4f6] text-center w-8 text-[11px]`} rowSpan={2}>AX</td><td className={ctd} rowSpan={2}><input className={inp} value={examData.pentacam[eye].ax1} onChange={mkPentaPatch(eye, "ax1")} /></td></tr>
                    <tr><td className={`${ctd} bg-[#f3f4f6] text-right text-[11px]`}>K2 (Steep)</td><td className={ctd}><input className={inp} value={examData.pentacam[eye].k2} onChange={mkPentaPatch(eye, "k2")} /></td></tr>
                    <tr><td className={`${ctd} bg-[#f3f4f6] text-right text-[11px]`}>Thinnest</td><td className={ctd} colSpan={3}><input className={`${inp} ${thin < 480 ? "text-red-600" : ""}`} value={examData.pentacam[eye].thinnest} onChange={mkPentaPatch(eye, "thinnest")} /></td></tr>
                    <tr><td className={`${ctd} bg-[#f3f4f6] text-right text-[11px]`}>Apex</td><td className={ctd} colSpan={3}><input className={inp} value={examData.pentacam[eye].apex} onChange={mkPentaPatch(eye, "apex")} /></td></tr>
                    <tr><td className={`${ctd} bg-[#f3f4f6] text-[#003d9b] text-right text-[11px]`}>Residual</td><td className={`${ctd} bg-[#003d9b]/5`} colSpan={3}><input className={`${inp} text-[#003d9b]`} value={examData.pentacam[eye].residual} onChange={mkPentaPatch(eye, "residual")} /></td></tr>
                    <tr><td className={`${ctd} bg-[#f3f4f6] text-right text-[11px]`}>Planned TTT</td><td className={ctd} colSpan={3}><input className={inp} value={examData.pentacam[eye].ttt} onChange={mkPentaPatch(eye, "ttt")} /></td></tr>
                    <tr><td className={`${ctd} bg-[#f3f4f6] text-[#ba1a1a] text-right text-[11px]`}>Ablation</td><td className={ctd} colSpan={3}><input className={`${inp} text-[#ba1a1a]`} value={examData.pentacam[eye].ablation} onChange={mkPentaPatch(eye, "ablation")} /></td></tr>
                  </tbody>
                </table>
              </div>
            );
          })}
        </section>

        {/* Treatment plan */}
        <section>
          <table className="w-full text-center border-collapse text-sm">
            <thead className="bg-[#e7e8ea] text-xs uppercase font-bold text-[#434654]">
              <tr><th className={ctd}>Target Refraction</th><th className={ctd}>OD/OS</th><th className={ctd}>Before Flap</th><th className={ctd}>After Flap</th><th className={ctd}>After Treatment</th><th className={ctd}>Flap Reposition</th><th className={ctd}>Ciclo 3x</th><th className={ctd}>Note</th></tr>
            </thead>
            <tbody>
              {(["OD", "OS"] as const).map((label) => (
                <tr key={label}>
                  <td className={ctd}><input className={inp} /></td>
                  <td className={`${ctd} ${label === "OD" ? "text-[#003d9b] bg-[#003d9b]/5" : "text-[#526069] bg-[#f3f4f6]"}`}>{label}</td>
                  <td className={ctd}><input className={inp} /></td>
                  <td className={ctd}><input className={inp} /></td>
                  <td className={ctd}><input className={inp} /></td>
                  <td className={ctd}><input className={inp} /></td>
                  <td className={ctd}><input className={inp} /></td>
                  <td className={ctd}><input className={inp} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Notes + signatures */}
        <footer className="pt-6 border-t-2 border-[#003d9b] space-y-6">
          <div className="print-lasik-footer-grid grid grid-cols-1 lg:grid-cols-12 gap-8">
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
          <div className="print-lasik-signatures grid grid-cols-2 md:grid-cols-4 gap-8 pt-4 border-t border-[#c3c6d6]">
            {[
              ["التمريض / Nursing", signatures.nurse],
              ["الطبيب / Surgeon", signatures.doctor],
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
    );
  };

  return (
    <div className="min-h-screen bg-[#dde1e7]" dir="ltr">
      <style>{`
        ${customSheetCss}
        .lasik-sheet, .lasik-sheet * {
          font-weight: 400 !important;
          text-decoration: none !important;
        }
        .lasik-sheet th { font-weight: 700 !important; }
        .lasik-sheet .border-b,
        .lasik-sheet .border-b-2 {
          border-bottom: none !important;
        }
        @media print {
          .print-page-break { page-break-before: always !important; break-before: page !important; }
          .print-page-center-a4 { width: 210mm !important; margin: 0 auto !important; }
          @page { size: A4 portrait; margin: 0; }
          html, body {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          .lasik-print-root {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            overflow: visible !important;
            max-height: none !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .lasik-sheet {
            width: 210mm !important;
            max-width: 210mm !important;
            height: auto !important;
            min-height: 0 !important;
            box-sizing: border-box !important;
            padding: 6mm !important;
            gap: 10px !important;
            font-size: 92% !important;
            line-height: 1.15 !important;
          }
          .lasik-sheet section,
          .lasik-sheet footer,
          .lasik-sheet table,
          .lasik-sheet tr,
          .lasik-sheet td,
          .lasik-sheet th,
          .lasik-sheet label,
          .lasik-sheet input,
          .lasik-sheet select,
          .lasik-sheet span,
          .lasik-sheet div {
            page-break-inside: avoid !important;
          }
          .lasik-sheet table { font-size: 11px !important; }
          .lasik-sheet input,
          .lasik-sheet select {
            font-size: 11px !important;
            padding-top: 1px !important;
            padding-bottom: 1px !important;
          }
          .lasik-sheet input:not([type="checkbox"]):not([type="radio"]),
          .lasik-sheet textarea {
            border: 0 !important;
            border-bottom: 0 !important;
            box-shadow: none !important;
            outline: 0 !important;
            background: transparent !important;
            text-decoration: none !important;
            font-size: 12px !important;
            font-weight: 700 !important;
            line-height: 1.15 !important;
          }
          .lasik-sheet .border-b,
          .lasik-sheet .border-b-2,
          .lasik-sheet .border-b-4,
          .lasik-sheet .border-b-8 {
            border-bottom: 0 !important;
          }
            line-height: 1.15 !important;
          }
          .lasik-sheet .gap-8 { gap: 12px !important; }
          .lasik-sheet .gap-6 { gap: 10px !important; }
          .lasik-sheet .gap-5 { gap: 8px !important; }
          .lasik-sheet .gap-4 { gap: 6px !important; }
          .lasik-sheet .p-8 { padding: 0 !important; }
          .lasik-sheet .p-4 { padding: 8px !important; }
          .print-lasik-eye-card { padding-left: 10mm !important; }
          .lasik-sheet .pt-6 { padding-top: 10px !important; }
          .lasik-sheet .pt-4 { padding-top: 8px !important; }
          .lasik-sheet .pb-3 { padding-bottom: 6px !important; }
          .lasik-sheet .mb-3 { margin-bottom: 6px !important; }
          .lasik-sheet .mt-3 { margin-top: 6px !important; }
          .lasik-sheet .h-9 { height: 28px !important; }
          .lasik-sheet .h-8 { height: 22px !important; }
          .lasik-sheet .h-6 { height: 16px !important; }
          .print-lasik-patient-grid { display: flex !important; flex-wrap: wrap !important; column-gap: 6mm !important; row-gap: 1.5mm !important; }
          .print-lasik-pentacam-right { display: grid !important; grid-template-columns: 1fr 1.3fr 1.3fr !important; }
          .print-lasik-questions {
            display: block !important;
          }
          .print-lasik-questions table {
            font-size: 10px !important;
          }
          .print-lasik-questions th {
            padding: 3px !important;
            line-height: 1.05 !important;
          }
          .print-lasik-questions td {
            padding: 2px 3px !important;
            line-height: 1.05 !important;
          }
          .print-lasik-questions input[type="checkbox"] {
            width: 12px !important;
            height: 12px !important;
          }
          .print-lasik-visual-grid { display: grid !important; grid-template-columns: minmax(0, 7fr) minmax(0, 5fr) !important; }
          .print-lasik-footer-grid { display: grid !important; grid-template-columns: minmax(0, 8fr) minmax(0, 4fr) !important; }
          .print-lasik-signatures { display: grid !important; grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
        }
      `}</style>
      <header className="sticky top-0 z-50 print:hidden flex justify-between items-center px-6 py-2 bg-[#f8f9fb] border-b border-[#c3c6d6]" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="flex items-center gap-6">
          <span className="text-xl font-bold text-[#003d9b]">{BRAND_NAME_EN}</span>
          <nav className="hidden md:flex items-center gap-5 text-sm text-[#434654]">
            <span className="cursor-pointer hover:text-[#003d9b]">Patients</span>
            <span className="cursor-pointer font-bold text-[#003d9b] border-b-2 border-[#003d9b] pb-0.5">Surgery</span>
            <span className="cursor-pointer hover:text-[#003d9b]">Reports</span>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-60">
            <PatientPicker initialPatientId={initialPatientId} onSelect={handleSelectPatient} />
          </div>
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
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
        </div>
      </header>
      {printMode.printView && (
        <PrintPreviewBanner
          title="شيت الليزك"
          subtitle={formData.patientName || undefined}
          onPrint={handlePrint}
        />
      )}
      <div className="py-8 print:py-0">
        <div className={`print:hidden ${printMode.printView ? "hidden" : ""}`}>
          <div className="a4-page-card">{renderSheetBody()}</div>
        </div>
        <div className="hidden print:block">
          <div className="print-page-center-a4">{renderSheetBody(true)}</div>
          {!originalMode ? (
            <div
              className="print-page-break print-page-center-a4"
              style={{ pageBreakBefore: "always", breakBefore: "page" }}
            >
              <FollowupTablesBody
                titleEn="Lasik Follow-up"
                titleAr="متابعة الليزك"
                patientName={formData.patientName}
                patientDOB={formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString("en-GB") : ""}
                operationType={operationType}
                setOperationType={setOperationType}
                operationEyes={operationEyes}
                setOperationEyes={setOperationEyes}
                operationDateRight={operationDateRight}
                setOperationDateRight={setOperationDateRight}
                followups={followups}
                setFollowups={setFollowups}
                followupLabels={followupLabels}
                signatures={signatures}
                readOnly
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
