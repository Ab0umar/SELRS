import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer, Download, ArrowRight, User, Eye, FileText, Target, Activity } from "lucide-react";
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
import FollowupTablesBody from "@/components/sheets/FollowupTablesBody";

export default function LasikExamSheet() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { goBack } = useAppNavigation();
  const [, params] = useRoute("/sheets/:type/:id");
  const initialPatientId = params?.id ? Number(params.id) : undefined;
  const printMode = usePrintMode({ ready: Boolean(initialPatientId) });
  const [followupLabels, setFollowupLabels] = useState(
    DEFAULT_SHEET_DESIGNER_CONFIG.followupLasik,
  );
  const [followups, setFollowups] = useState([
    { id: 1, date: "", type: "الFollow-up الأولى" },
    { id: 2, date: "", type: "الFollow-up الثانية" },
    { id: 3, date: "", type: "الFollow-up الثالثة" },
    { id: 4, date: "", type: "الFollow-up الرابعة" },
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
      od: { k1: "", k2: "", ax1: "", ax2: "", thinnest: "", apex: "", residual: "", ttt: "", ablation: "" },
      os: { k1: "", k2: "", ax1: "", ax2: "", thinnest: "", apex: "", residual: "", ttt: "", ablation: "" },
    },
  });
  const [signatures, setSignatures] = useState({
    reception: "",
    nurse: "",
    technician: "",
    doctor: "",
  });
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
    setFollowupLabels(localDesigner.followupLasik);
  }, []);

  useEffect(() => {
    if (!designerSettingsQuery.data?.value) return;
    const merged = coerceSheetDesignerConfig(designerSettingsQuery.data.value);
    setCustomSheetCss(merged.css.lasik || "");
    setSheetTemplate(merged.templates.lasik);
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
  }, [initialPatientId]);

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
            od: { ...prev.autorefraction.od, ...(parsed.examData.autorefraction?.od ?? {}) },
            os: { ...prev.autorefraction.os, ...(parsed.examData.autorefraction?.os ?? {}) },
          },
          pentacam: {
            od: { ...prev.pentacam.od, ...(parsed.examData.pentacam?.od ?? {}) },
            os: { ...prev.pentacam.os, ...(parsed.examData.pentacam?.os ?? {}) },
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
        setOperationEyes({ right: both ? true : right, left: both ? true : left, both });
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
        try { return sheetQuery.data ? JSON.parse(sheetQuery.data) : {}; } catch { return {}; }
      })();
      const pickValue = (next: string, prev?: string) => next && next.trim() ? next : prev;
      const mergedExamData = {
        autorefraction: {
          od: { ...(existing.examData?.autorefraction?.od ?? {}), ucva: pickValue(examData.autorefraction.od.ucva, existing.examData?.autorefraction?.od?.ucva), bcva: pickValue(examData.autorefraction.od.bcva, existing.examData?.autorefraction?.od?.bcva), s: pickValue(examData.autorefraction.od.s, existing.examData?.autorefraction?.od?.s), c: pickValue(examData.autorefraction.od.c, existing.examData?.autorefraction?.od?.c), axis: pickValue(examData.autorefraction.od.axis, existing.examData?.autorefraction?.od?.axis), iop: pickValue(examData.autorefraction.od.iop, existing.examData?.autorefraction?.od?.iop) },
          os: { ...(existing.examData?.autorefraction?.os ?? {}), ucva: pickValue(examData.autorefraction.os.ucva, existing.examData?.autorefraction?.os?.ucva), bcva: pickValue(examData.autorefraction.os.bcva, existing.examData?.autorefraction?.os?.bcva), s: pickValue(examData.autorefraction.os.s, existing.examData?.autorefraction?.os?.s), c: pickValue(examData.autorefraction.os.c, existing.examData?.autorefraction?.os?.c), axis: pickValue(examData.autorefraction.os.axis, existing.examData?.autorefraction?.os?.axis), iop: pickValue(examData.autorefraction.os.iop, existing.examData?.autorefraction?.os?.iop) },
        },
        pentacam: {
          od: { ...(existing.examData?.pentacam?.od ?? {}), k1: pickValue(examData.pentacam.od.k1, existing.examData?.pentacam?.od?.k1), k2: pickValue(examData.pentacam.od.k2, existing.examData?.pentacam?.od?.k2), ax1: pickValue(examData.pentacam.od.ax1, existing.examData?.pentacam?.od?.ax1), thinnest: pickValue(examData.pentacam.od.thinnest, existing.examData?.pentacam?.od?.thinnest), apex: pickValue(examData.pentacam.od.apex, existing.examData?.pentacam?.od?.apex), residual: pickValue(examData.pentacam.od.residual, existing.examData?.pentacam?.od?.residual), ttt: pickValue(examData.pentacam.od.ttt, existing.examData?.pentacam?.od?.ttt), ablation: pickValue(examData.pentacam.od.ablation, existing.examData?.pentacam?.od?.ablation) },
          os: { ...(existing.examData?.pentacam?.os ?? {}), k1: pickValue(examData.pentacam.os.k1, existing.examData?.pentacam?.os?.k1), k2: pickValue(examData.pentacam.os.k2, existing.examData?.pentacam?.os?.k2), ax1: pickValue(examData.pentacam.os.ax1, existing.examData?.pentacam?.os?.ax1), thinnest: pickValue(examData.pentacam.os.thinnest, existing.examData?.pentacam?.os?.thinnest), apex: pickValue(examData.pentacam.os.apex, existing.examData?.pentacam?.os?.apex), residual: pickValue(examData.pentacam.os.residual, existing.examData?.pentacam?.os?.residual), ttt: pickValue(examData.pentacam.os.ttt, existing.examData?.pentacam?.os?.ttt), ablation: pickValue(examData.pentacam.os.ablation, existing.examData?.pentacam?.os?.ablation) },
        },
      };
      await saveSheetMutation.mutateAsync({
        patientId: initialPatientId,
        sheetType: "lasik",
        content: JSON.stringify({ ...existing, formData: { ...(existing.formData ?? {}), ...formData }, examData: mergedExamData, operationDetails: { type: operationType, eyes: operationEyes } }),
      });
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "حدث خطأ أثناء الحفظ"));
    }
  };

  useEffect(() => {
    if (!initialPatientId) return;
    const timeout = setTimeout(() => { handleSaveSheet(); }, 600);
    return () => clearTimeout(timeout);
  }, [formData, examData, operationType, operationEyes, initialPatientId]);

  const handlePrint = () => {
    void printOrExportPdf(
      `${String(formData.patientName || formData.patientCode || initialPatientId || "lasik-sheet").trim()}.pdf`,
      { forceBrowserPrint: true },
    );
  };

  // ─── Shared style helpers ────────────────────────────────────────────────────
  const ctd = "p-1.5 border border-[#c3c6d6] text-center";
  const inp = "w-full text-center bg-transparent border-0 border-b border-solid border-[#c3c6d6] focus:outline-none focus:border-[#003d9b] py-0.5 text-sm font-mono";
  const sectionHeader = "flex items-center gap-2 px-3 py-1.5 bg-[#003d9b] text-white text-xs font-bold uppercase tracking-wider rounded-t-md";

  const renderSheetBody = (_readOnly = false) => {
    const today = new Date().toLocaleDateString("en-GB");
    const odThinnestNum = parseFloat(examData.pentacam.od.thinnest);
    const osThinnestNum = parseFloat(examData.pentacam.os.thinnest);
    const odIopNum = parseFloat(examData.autorefraction.od.iop);
    const osIopNum = parseFloat(examData.autorefraction.os.iop);

    const mkAutoPatch = (eye: "od" | "os", field: string) =>
      (e: React.ChangeEvent<HTMLInputElement>) =>
        setExamData((prev) => ({
          ...prev,
          autorefraction: { ...prev.autorefraction, [eye]: { ...prev.autorefraction[eye], [field]: e.target.value } as typeof prev.autorefraction.od },
        }));

    const mkPentaPatch = (eye: "od" | "os", field: string) =>
      (e: React.ChangeEvent<HTMLInputElement>) =>
        setExamData((prev) => ({
          ...prev,
          pentacam: { ...prev.pentacam, [eye]: { ...prev.pentacam[eye], [field]: e.target.value } as typeof prev.pentacam.od },
        }));

    return (
      <div
        className="lasik-sheet bg-white text-[#191c1e] font-sans p-6 print:p-[8mm] print:border-0 print:shadow-none border border-[#c3c6d6] shadow-md flex flex-col gap-4 w-[210mm] max-w-full mx-auto rounded-lg"
        dir="ltr"
      >
        {/* ── HEADER ── */}
        <header className="flex items-start justify-between border-b-2 border-[#003d9b] pb-3">
          <div className="flex-1">
            <div className="text-xl font-extrabold text-[#003d9b] leading-tight">{BRAND_NAME_EN}</div>
            <div className="text-sm text-[#434654]">Laser &amp; Vision Correction</div>
            <div className="text-xs text-[#737685] mt-0.5">LASIK PRE-OP ASSESSMENT</div>
          </div>
          <div className="text-center px-4">
            <div className="text-base font-bold text-[#003d9b]">Lasik Exam Sheet</div>
            <div className="text-sm text-[#434654]"></div>
            <div className="text-xs text-[#737685] mt-0.5">{formData.examinationDate ? new Date(formData.examinationDate).toLocaleDateString("en-GB") : today}</div>
          </div>
          <div className="text-right text-xs text-[#434654] space-y-0.5">
            {formData.patientName && <div className="font-bold text-sm text-[#191c1e]">{formData.patientName}</div>}
            {formData.patientCode && <div className="text-[#737685]">ID: {formData.patientCode}</div>}
          </div>
        </header>

        {/* ── SURGERY TYPE + EYE SELECTION ── */}
        <div className="flex flex-wrap items-center gap-4 p-3 bg-[#f3f4f6] border border-[#c3c6d6] rounded-lg text-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#434654] uppercase">Surgery Type:</span>
            <select
              className="text-sm rounded border border-[#c3c6d6] bg-white py-1 px-2 text-[#003d9b] font-semibold"
              value={operationType}
              onChange={(e) => setOperationType(e.target.value)}
            >
              <option value="ليزك">Lasik (Standard)</option>
              <option value="فيمتو ليزك">Femto-Lasik</option>
              <option value="PRK">PRK</option>
              <option value="فيمتو سمايل">Smile</option>
              <option value="ICL">ICL</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-[#434654] uppercase">Eye Selection:</span>
            {[
              { key: "right", label: "RT (Right Eye)", color: "#003d9b" },
              { key: "left", label: "LT (Left Eye)", color: "#526069" },
              { key: "both", label: "OU (Both Eyes)", color: "#003d9b" },
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-sm" dir="ltr">
              <div className="col-span-2 md:col-span-1">
                <span className="text-xs text-[#434654] font-semibold block mb-0.5">Full Name</span>
                <div className="border-b border-[#c3c6d6] min-h-[22px] font-semibold text-[#003d9b] pb-0.5">{formData.patientName}</div>
              </div>
              <div>
                <span className="text-xs text-[#434654] font-semibold block mb-0.5">Patient Code</span>
                <div className="border-b border-[#c3c6d6] min-h-[22px] font-mono text-[#526069] pb-0.5">{formData.patientCode}</div>
              </div>
              <div>
                <span className="text-xs text-[#434654] font-semibold block mb-0.5">Date of Birth</span>
                <div className="border-b border-[#c3c6d6] min-h-[22px] pb-0.5">{formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString("en-GB") : ""}</div>
              </div>
              <div>
                <span className="text-xs text-[#434654] font-semibold block mb-0.5">Age</span>
                <div className="border-b border-[#c3c6d6] min-h-[22px] pb-0.5">{formData.age}</div>
              </div>
              <div>
                <span className="text-xs text-[#434654] font-semibold block mb-0.5">Phone Number</span>
                <div className="border-b border-[#c3c6d6] min-h-[22px] pb-0.5">{formData.phone}</div>
              </div>
              <div>
                <span className="text-xs text-[#434654] font-semibold block mb-0.5">Profession / Job</span>
                <input dir="ltr" className="w-full border-b border-[#c3c6d6] bg-transparent focus:outline-none focus:border-[#003d9b] text-sm min-h-[22px]" value={formData.job} onChange={(e) => setFormData((p) => ({ ...p, job: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <span className="text-xs text-[#434654] font-semibold block mb-0.5">Residential Address</span>
                <div className="border-b border-[#c3c6d6] min-h-[22px] pb-0.5">{formData.address}</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── MEDICAL HISTORY ── */}
        <section className="print-lasik-questions">
          <div className={sectionHeader}>
            <FileText className="h-3.5 w-3.5" />
            <span>Medical &amp; Ocular History</span>
          </div>
          <div className="border border-[#c3c6d6] border-t-0 rounded-b-md overflow-hidden">
            <div className="grid grid-cols-2 divide-x divide-[#c3c6d6]">
              <div className="p-3">
                <p className="text-xs font-bold text-[#434654] uppercase mb-2">General Conditions</p>
                <div className="space-y-1.5">
                  {["Diabetes", "Hypertension", "Rheumatoid", "Pregnancy", "Thyroid Disease", "Immune Disease"].map((item) => (
                    <label key={item} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input type="checkbox" className="w-3.5 h-3.5 accent-[#003d9b]" />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="p-3">
                <p className="text-xs font-bold text-[#434654] uppercase mb-2">Ocular Conditions</p>
                <div className="space-y-1.5">
                  {["Dry Eye", "Glaucoma", "Keratoconus", "Family History (Keratoconus)", "Tear Substitutes Use", "Acne Treatment (Roaccutane)"].map((item) => (
                    <label key={item} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input type="checkbox" className="w-3.5 h-3.5 accent-[#003d9b]" />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── COMPREHENSIVE REFRACTION ── */}
        <section className="print-lasik-visual-grid grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8">
            <div className={sectionHeader}>
              <Eye className="h-3.5 w-3.5" />
              <span>Comprehensive Refraction</span>
            </div>
            <div className="border border-[#c3c6d6] border-t-0 rounded-b-md overflow-hidden">
              <table className="w-full text-center border-collapse">
                <thead className="bg-[#003d9b] text-white text-xs font-bold uppercase">
                  <tr>
                    <th className="p-2 border border-[#003d9b]/40">EYE</th>
                    <th className="p-2 border border-[#003d9b]/40">UCVA</th>
                    <th className="p-2 border border-[#003d9b]/40">Sphere (S)</th>
                    <th className="p-2 border border-[#003d9b]/40">Cylinder (C)</th>
                    <th className="p-2 border border-[#003d9b]/40">Axis (A)</th>
                    <th className="p-2 border border-[#003d9b]/40">BCVA</th>
                    <th className="p-2 border border-[#003d9b]/40">IOP (mmHg)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-[#003d9b]/5">
                    <td className="p-2 border border-[#c3c6d6] font-bold text-[#003d9b]">OD (Right)</td>
                    <td className={ctd}><input className={inp} value={examData.autorefraction.od.ucva} onChange={mkAutoPatch("od", "ucva")} /></td>
                    <td className={ctd}><input className={inp} value={examData.autorefraction.od.s} onChange={mkAutoPatch("od", "s")} /></td>
                    <td className={ctd}><input className={inp} value={examData.autorefraction.od.c} onChange={mkAutoPatch("od", "c")} /></td>
                    <td className={ctd}><input className={inp} value={examData.autorefraction.od.axis} onChange={mkAutoPatch("od", "axis")} /></td>
                    <td className={ctd}><input className={inp} value={examData.autorefraction.od.bcva} onChange={mkAutoPatch("od", "bcva")} /></td>
                    <td className={ctd}><input className={`${inp} ${!Number.isNaN(odIopNum) && odIopNum > 21 ? "text-red-600 font-bold" : ""}`} value={examData.autorefraction.od.iop} onChange={mkAutoPatch("od", "iop")} /></td>
                  </tr>
                  <tr className="bg-[#f3f4f6]">
                    <td className="p-2 border border-[#c3c6d6] font-bold text-[#526069]">OS (Left)</td>
                    <td className={ctd}><input className={inp} value={examData.autorefraction.os.ucva} onChange={mkAutoPatch("os", "ucva")} /></td>
                    <td className={ctd}><input className={inp} value={examData.autorefraction.os.s} onChange={mkAutoPatch("os", "s")} /></td>
                    <td className={ctd}><input className={inp} value={examData.autorefraction.os.c} onChange={mkAutoPatch("os", "c")} /></td>
                    <td className={ctd}><input className={inp} value={examData.autorefraction.os.axis} onChange={mkAutoPatch("os", "axis")} /></td>
                    <td className={ctd}><input className={inp} value={examData.autorefraction.os.bcva} onChange={mkAutoPatch("os", "bcva")} /></td>
                    <td className={ctd}><input className={`${inp} ${!Number.isNaN(osIopNum) && osIopNum > 21 ? "text-red-600 font-bold" : ""}`} value={examData.autorefraction.os.iop} onChange={mkAutoPatch("os", "iop")} /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="lg:col-span-4">
            <div className={sectionHeader}>
              <span>Tear Film Exam</span>
            </div>
            <div className="border border-[#c3c6d6] border-t-0 rounded-b-md overflow-hidden">
              <table className="w-full border-collapse text-sm">
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

        {/* ── KERATOMETRY & PENTACAM ── */}
        <section className="print-lasik-pentacam-right">
          <div className={sectionHeader}>
            <Activity className="h-3.5 w-3.5" />
            <span>Keratometry &amp; Pentacam Analysis</span>
          </div>
          <div className="border border-[#c3c6d6] border-t-0 rounded-b-md overflow-hidden">
            <div className="grid grid-cols-2 divide-x divide-[#c3c6d6]">
              {(["od", "os"] as const).map((eye) => {
                const isOD = eye === "od";
                const thin = isOD ? odThinnestNum : osThinnestNum;
                return (
                  <div key={eye} className={`p-3 ${isOD ? "bg-[#003d9b]/3" : "bg-white"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${isOD ? "bg-[#003d9b] text-white" : "bg-[#526069] text-white"}`}>
                        {isOD ? "OD — Right Eye (RT)" : "OS — Left Eye (LT)"}
                      </span>
                      {!Number.isNaN(thin) && thin > 0 && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${thin < 480 ? "bg-red-100 text-red-700 border border-red-300" : "bg-green-100 text-green-700 border border-green-300"}`}>
                          {thin < 480 ? "THIN AREA" : "STABLE"}
                        </span>
                      )}
                    </div>
                    <table className="w-full border-collapse text-xs">
                      <tbody>
                        {[
                          { label: "K1 (Flat)", field: "k1", highlight: false },
                          { label: "K2 (Steep)", field: "k2", highlight: false },
                          { label: "Thinnest Point (μm)", field: "thinnest", highlight: true, warn: thin < 480 },
                          { label: "Apex (μm)", field: "apex", highlight: false },
                          { label: "Residual Stroma (μm)", field: "residual", highlight: true, isKey: true },
                          { label: "Planned TTT (μm)", field: "ttt", highlight: false },
                          { label: "Ablation Depth (μm)", field: "ablation", highlight: false, isRed: true },
                        ].map(({ label, field, highlight, warn, isKey, isRed }) => (
                          <tr key={field} className="border-b border-[#c3c6d6] last:border-0">
                            <td className={`p-1.5 font-semibold w-2/5 ${isKey ? "text-[#003d9b]" : isRed ? "text-[#ba1a1a]" : "text-[#434654]"} bg-[#f3f4f6]`}>{label}</td>
                            <td className={`p-1.5 ${isKey ? "bg-[#003d9b]/5" : isRed ? "bg-red-50" : ""}`}>
                              <input
                                className={`w-full bg-transparent border-0 border-b border-[#c3c6d6] outline-none text-xs text-center focus:border-[#003d9b] font-mono ${warn ? "text-red-600 font-bold" : isKey ? "text-[#003d9b] font-bold" : isRed ? "text-[#ba1a1a]" : ""}`}
                                value={(examData.pentacam[eye] as any)[field]}
                                onChange={mkPentaPatch(eye, field)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── ABLATION & TARGET TRACKING ── */}
        <section>
          <div className={sectionHeader}>
            <Target className="h-3.5 w-3.5" />
            <span>Ablation &amp; Target Tracking</span>
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

        {/* ── CLINICAL NOTES + FINAL DIAGNOSIS ── */}
        <section className="grid grid-cols-2 gap-4">
          <div>
            <div className="px-3 py-1.5 bg-[#e7e8ea] text-[#434654] text-xs font-bold uppercase tracking-wider rounded-t-md border border-[#c3c6d6]">Clinical Notes</div>
            <div className="border border-[#c3c6d6] border-t-0 rounded-b-md p-3 min-h-[70px] bg-white">
              <textarea className="w-full bg-transparent border-0 focus:outline-none text-sm resize-none min-h-[60px]" placeholder="Enter surgical observations or preoperative findings..." />
            </div>
          </div>
          <div>
            <div className="px-3 py-1.5 bg-[#ba1a1a] text-white text-xs font-bold uppercase tracking-wider rounded-t-md">Final Diagnosis &amp; Plan</div>
            <div className="border border-[#c3c6d6] border-t-0 rounded-b-md p-3 min-h-[70px] bg-white">
              <textarea className="w-full bg-transparent border-0 focus:outline-none text-sm resize-none min-h-[60px]" placeholder="Primary diagnosis here..." />
            </div>
          </div>
        </section>

        {/* ── SIGNATURES ── */}
        <footer className="print-lasik-signatures border-t-2 border-[#003d9b] pt-4 mt-2">
          <div className="grid grid-cols-4 gap-6">
            {[
              { label: "Reception Signature", val: signatures.reception, isDoctor: false },
              { label: "Nurse Signature", val: signatures.nurse, isDoctor: false },
              { label: "Technician Signature", val: signatures.technician, isDoctor: false },
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
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] lasik-print-root" dir="ltr">
      <style>{`
        ${customSheetCss}
        .lasik-sheet, .lasik-sheet * { font-weight: 400 !important; text-decoration: none !important; }
        .lasik-sheet th { font-weight: 700 !important; }
        @media print {
          .print-page-break { page-break-before: always !important; break-before: page !important; }
          .print-page-center-a4 { width: 210mm !important; margin: 0 auto !important; }
          @page { size: A4 portrait; margin: 8mm; }
          html, body { width: 100% !important; margin: 0 !important; padding: 0 !important; background: white !important; }
          .lasik-print-root { width: 100% !important; max-width: 100% !important; margin: 0 !important; overflow: visible !important; max-height: none !important; }
          .lasik-sheet { width: 210mm !important; max-width: 210mm !important; height: auto !important; box-sizing: border-box !important; padding: 6mm !important; gap: 8px !important; font-size: 90% !important; line-height: 1.2 !important; border-radius: 0 !important; border: 0 !important; box-shadow: none !important; }
          .lasik-sheet input:not([type="checkbox"]):not([type="radio"]), .lasik-sheet textarea { border: 0 !important; border-bottom: 1px solid #c3c6d6 !important; box-shadow: none !important; outline: 0 !important; background: transparent !important; font-size: 11px !important; }
          .lasik-sheet table { font-size: 10px !important; }
          .lasik-sheet .gap-4 { gap: 5px !important; }
          .lasik-sheet .p-6 { padding: 5mm !important; }
          .lasik-sheet .p-3 { padding: 3px !important; }
          .lasik-sheet .p-2 { padding: 2px !important; }
          .print-lasik-visual-grid { display: grid !important; grid-template-columns: minmax(0, 8fr) minmax(0, 4fr) !important; }
          .print-lasik-pentacam-right .grid { display: grid !important; grid-template-columns: repeat(2, 1fr) !important; }
          .print-lasik-signatures { display: grid !important; grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
          .print-lasik-questions .grid { display: grid !important; grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      {/* ── TOP BAR ── */}
      <header className="sticky top-0 z-50 print:hidden flex justify-between items-center px-6 py-2 bg-white border-b border-[#c3c6d6] shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={goBack} className="gap-1">
            <ArrowRight className="h-4 w-4" /> Back
          </Button>
          <span className="text-lg font-bold text-[#003d9b]">{BRAND_NAME_EN}</span>
          <nav className="hidden md:flex items-center gap-4 text-sm text-[#434654]">
            <span className="cursor-pointer hover:text-[#003d9b]">Patients</span>
            <span className="cursor-pointer font-bold text-[#003d9b] border-b-2 border-[#003d9b] pb-0.5">Surgery</span>
            <span className="cursor-pointer hover:text-[#003d9b]">Reports</span>
          </nav>
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
        <PrintPreviewBanner title="Lasik Exam Sheet" subtitle={formData.patientName || undefined} onPrint={handlePrint} />
      )}

      <div className="py-6 print:py-0">
        <div className={`print:hidden ${printMode.printView ? "hidden" : ""}`}>
          {renderSheetBody()}
        </div>
        <div className="hidden print:block">
          <div className="print-page-center-a4">{renderSheetBody(true)}</div>
        </div>
      </div>
    </div>
  );
}
