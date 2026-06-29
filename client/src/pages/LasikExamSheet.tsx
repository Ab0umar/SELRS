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

export default function LasikExamSheet() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { goBack } = useAppNavigation();
  const [, params] = useRoute("/sheets/:type/:id");
  const initialPatientId = params?.id ? Number(params.id) : undefined;
  const printMode = usePrintMode({ ready: Boolean(initialPatientId) });

  const [operationType, setOperationType] = useState("ليزك");
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
  }, []);

  useEffect(() => {
    if (!designerSettingsQuery.data?.value) return;
    const merged = coerceSheetDesignerConfig(designerSettingsQuery.data.value);
    setCustomSheetCss(merged.css.lasik || "");
    setSheetTemplate(merged.templates.lasik);
    setPrintOffsetXmm(merged.layout.lasik.offsetXmm);
    setPrintOffsetYmm(merged.layout.lasik.offsetYmm);
    setPrintScale(merged.layout.lasik.scale);
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

    return (
      <div className="lasik-print-root" dir="ltr">
        {/* BLUE ASSESSMENT HEADER CARD */}
        <div className="bg-[#003d9b] text-white mx-4 mt-4 mb-4 rounded-lg p-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="border border-white/30 rounded p-1.5">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold">{BRAND_NAME_EN} Eye Clinic</h1>
              <p className="text-blue-200 text-sm">{BRAND_NAME_AR}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold tracking-widest text-blue-300 uppercase">LASIK PRE-OP ASSESSMENT</p>
            <p className="text-2xl font-bold">
              Exam ID: {formData.patientCode ? `LX-${formData.patientCode}` : "LX-2023-8842"}
            </p>
            <p className="text-blue-200 text-sm">Date: {formData.examinationDate || today}</p>
          </div>
        </div>

        {/* SURGERY TYPE & EYE SELECTION */}
        <div className="mx-4 mb-4 border border-[#c3c6d6] rounded-lg p-4 bg-white flex gap-6">
          <div className="flex-1">
            <p className="text-[11px] text-gray-500 font-medium mb-1">Surgery Type Selection</p>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={operationType}
              onChange={(e) => setOperationType(e.target.value)}
            >
              <option value="ليزك">Lasik (Standard)</option>
              <option value="فيمتو ليزك">Femto Lasik (Femto)</option>
              <option value="PRK">PRK/LASEK</option>
              <option value="فيمتو سمايل">SMILE</option>
              <option value="ICL">ICL</option>
            </select>
          </div>
          <div className="flex-1">
            <p className="text-[11px] text-gray-500 font-medium mb-1">Eye Selection</p>
            <div className="flex gap-4 items-center mt-1">
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={operationEyes.right}
                  onChange={(e) => {
                    const right = e.target.checked;
                    setOperationEyes((prev) => ({ ...prev, right, both: right && prev.left }));
                  }}
                />
                RT (Right Eye)
              </label>
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={operationEyes.left}
                  onChange={(e) => {
                    const left = e.target.checked;
                    setOperationEyes((prev) => ({ ...prev, left, both: prev.right && left }));
                  }}
                />
                LT (Left Eye)
              </label>
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={operationEyes.both}
                  onChange={(e) => {
                    const both = e.target.checked;
                    setOperationEyes({ right: both, left: both, both });
                  }}
                />
                OU (Both Eyes)
              </label>
            </div>
          </div>
        </div>

        {/* PATIENT DETAILS */}
        <div className="mx-4 mb-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 mb-3">
            <User className="h-4 w-4" /> Patient Details
          </h2>
          <div className="border border-[#c3c6d6] rounded-lg overflow-hidden">
            <div className="grid grid-cols-4 divide-x border-b">
              {(
                [
                  { label: "Full Name", value: formData.patientName },
                  { label: "Patient Code", value: formData.patientCode },
                  { label: "Date of Birth", value: formData.dateOfBirth },
                  { label: "Age", value: formData.age },
                ] as { label: string; value: string }[]
              ).map(({ label, value }) => (
                <div key={label} className="p-3">
                  <p className="text-[10px] text-gray-500 mb-0.5">{label}</p>
                  <p className="font-semibold text-sm">{value || "—"}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 divide-x">
              {(
                [
                  { label: "Phone Number", value: formData.phone },
                  { label: "Profession / Job", value: formData.job },
                  { label: "Residential Address", value: formData.address },
                ] as { label: string; value: string }[]
              ).map(({ label, value }) => (
                <div key={label} className="p-3">
                  <p className="text-[10px] text-gray-500 mb-0.5">{label}</p>
                  <p className="font-semibold text-sm">{value || "—"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MEDICAL & OCULAR HISTORY */}
        <div className="mx-4 mb-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 mb-3">
            <Clock className="h-4 w-4" /> Medical &amp; Ocular History
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-[#c3c6d6] rounded-lg p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">General Conditions</p>
              <div className="grid grid-cols-2 gap-2">
                {["Diabetes", "Hypertension", "Rheumatoid", "Pregnancy"].map((cond) => (
                  <label key={cond} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="checkbox" /> {cond}
                  </label>
                ))}
              </div>
            </div>
            <div className="border border-[#c3c6d6] rounded-lg p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Ocular Conditions</p>
              <div className="grid grid-cols-2 gap-2">
                {["Dry Eye", "Glaucoma", "Keratoconus", "Family History"].map((cond) => (
                  <label key={cond} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="checkbox" /> {cond}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* COMPREHENSIVE REFRACTION */}
        <div className="mx-4 mb-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 mb-3">
            <LayoutGrid className="h-4 w-4" /> Comprehensive Refraction
          </h2>
          <div className="border border-[#c3c6d6] rounded-lg overflow-hidden">
            <table className="w-full text-center" dir="ltr">
              <thead>
                <tr className="bg-gray-100 text-gray-600 text-[11px] font-semibold uppercase border-b">
                  <th className="p-2 border-r">EYE</th>
                  <th className="p-2 border-r">UCVA</th>
                  <th className="p-2 border-r">Sphere (S)</th>
                  <th className="p-2 border-r">Cylinder (C)</th>
                  <th className="p-2 border-r">Axis (A)</th>
                  <th className="p-2 border-r">BCVA</th>
                  <th className="p-2">IOP (mmHg)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2 border-r">
                    <span className="text-sm font-bold text-[#003D9B]">OD (Right)</span>
                  </td>
                  {(["ucva", "s", "c", "axis", "bcva"] as const).map((field) => (
                    <td key={field} className="p-1 border-r">
                      <Input
                        value={examData.autorefraction.od[field]}
                        onChange={mkAutoPatch("od", field)}
                        className="h-7 text-[12px] text-center border-gray-300 w-16 mx-auto"
                      />
                    </td>
                  ))}
                  <td className="p-1">
                    <Input
                      value={examData.autorefraction.od.iop}
                      onChange={mkAutoPatch("od", "iop")}
                      className={`h-7 text-[12px] text-center border-gray-300 w-16 mx-auto${!Number.isNaN(odIopNum) && odIopNum > 21 ? " text-red-600 font-bold" : ""}`}
                    />
                  </td>
                </tr>
                <tr>
                  <td className="p-2 border-r">
                    <span className="text-sm font-bold text-gray-700">OS (Left)</span>
                  </td>
                  {(["ucva", "s", "c", "axis", "bcva"] as const).map((field) => (
                    <td key={field} className="p-1 border-r">
                      <Input
                        value={examData.autorefraction.os[field]}
                        onChange={mkAutoPatch("os", field)}
                        className="h-7 text-[12px] text-center border-gray-300 w-16 mx-auto"
                      />
                    </td>
                  ))}
                  <td className="p-1">
                    <Input
                      value={examData.autorefraction.os.iop}
                      onChange={mkAutoPatch("os", "iop")}
                      className={`h-7 text-[12px] text-center border-gray-300 w-16 mx-auto${!Number.isNaN(osIopNum) && osIopNum > 21 ? " text-red-600 font-bold" : ""}`}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* KERATOMETRY & PENTACAM ANALYSIS */}
        <div className="mx-4 mb-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 mb-3">
            <Layers className="h-4 w-4" /> Keratometry &amp; Pentacam Analysis
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {(["od", "os"] as const).map((eye) => {
              const thinnestNum = eye === "od" ? odThinnestNum : osThinnestNum;
              const isThin = !Number.isNaN(thinnestNum) && thinnestNum < 480;
              return (
                <div key={eye} className="border border-[#c3c6d6] rounded-lg overflow-hidden">
                  <div className="flex justify-between items-center px-4 py-2 bg-[#f3f4f6] border-b">
                    <span className="text-sm font-semibold text-[#003D9B]">{eye.toUpperCase()} Pentacam Data</span>
                    {isThin ? (
                      <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded">THIN AREA</span>
                    ) : (
                      <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded">STABLE</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-3 text-[12px]">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500 text-[10px] w-20 shrink-0">K1 (Flat)</span>
                      <Input className="h-6 w-16 text-center border-gray-300 text-[#003D9B] font-semibold text-[12px]" value={examData.pentacam[eye].k1} onChange={mkPentaPatch(eye, "k1")} />
                      <span className="text-gray-500 text-[10px] ml-1">D</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500 text-[10px] w-20 shrink-0">K2 (Steep)</span>
                      <Input className="h-6 w-16 text-center border-gray-300 text-[#003D9B] font-semibold text-[12px]" value={examData.pentacam[eye].k2} onChange={mkPentaPatch(eye, "k2")} />
                      <span className="text-gray-500 text-[10px] ml-1">D</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500 text-[10px] w-20 shrink-0">Thinnest Pt</span>
                      <Input
                        className={`h-6 w-16 text-center border-gray-300 text-[12px]${isThin ? " text-red-600 font-bold" : ""}`}
                        value={examData.pentacam[eye].thinnest}
                        onChange={mkPentaPatch(eye, "thinnest")}
                      />
                      <span className="text-gray-500 text-[10px] ml-1">μm</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500 text-[10px] w-20 shrink-0">Res. Stroma</span>
                      <Input className="h-6 w-16 text-center border-gray-300 text-[12px]" value={examData.pentacam[eye].residual} onChange={mkPentaPatch(eye, "residual")} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ABLATION & TARGET TRACKING */}
        <div className="mx-4 mb-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 mb-3">
            <Target className="h-4 w-4" /> Ablation &amp; Target Tracking
          </h2>
          <div className="border border-[#c3c6d6] rounded-lg overflow-hidden">
            <table className="w-full text-center" dir="ltr">
              <thead>
                <tr className="bg-gray-100 text-gray-600 text-[11px] font-semibold uppercase border-b">
                  <th className="p-2 border-r">Stage</th>
                  <th className="p-2 border-r">Flap Thickness</th>
                  <th className="p-2 border-r">Ablation Depth</th>
                  <th className="p-2 border-r">Optical Zone</th>
                  <th className="p-2 border-r">Target Residual</th>
                  <th className="p-2">Final Prediction</th>
                </tr>
              </thead>
              <tbody>
                {(["od", "os"] as const).map((eye) => (
                  <tr key={eye} className="border-b last:border-0">
                    <td className="p-2 border-r font-bold text-sm">{eye.toUpperCase()}</td>
                    <td className="p-1 border-r">
                      <Input value={examData.pentacam[eye].ttt} onChange={mkPentaPatch(eye, "ttt")} placeholder="110 μm" className="h-7 text-[11px] text-center border-gray-300 w-20 mx-auto" />
                    </td>
                    <td className="p-1 border-r">
                      <Input value={examData.pentacam[eye].ablation} onChange={mkPentaPatch(eye, "ablation")} placeholder="68 μm" className="h-7 text-[11px] text-center border-gray-300 w-20 mx-auto" />
                    </td>
                    <td className="p-1 border-r">
                      <Input placeholder="6.5 mm" className="h-7 text-[11px] text-center border-gray-300 w-20 mx-auto" />
                    </td>
                    <td className="p-1 border-r">
                      <Input value={examData.pentacam[eye].residual} onChange={mkPentaPatch(eye, "residual")} placeholder="≥300 μm" className="h-7 text-[11px] text-center border-gray-300 w-20 mx-auto" />
                    </td>
                    <td className="p-2">
                      <span className="text-[#003D9B] font-semibold text-sm">Plano</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CLINICAL NOTES + FINAL DIAGNOSIS */}
        <div className="mx-4 mb-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] text-gray-500 font-medium mb-1">Clinical Notes</p>
            <Textarea rows={4} placeholder="Enter surgical observations or preoperative findings..." className="text-sm w-full" />
          </div>
          <div>
            <p className="text-[11px] text-[#003D9B] font-semibold mb-1">Final Diagnosis &amp; Plan</p>
            <Textarea rows={4} placeholder="Diagnosis and surgical plan..." className="text-sm w-full border-[#003D9B]/30" />
          </div>
        </div>

        {/* SIGNATURES FOOTER */}
        <div className="mx-4 mb-4 grid grid-cols-4 text-center text-[11px]">
          {(
            [
              { label: "Reception", value: signatures.reception },
              { label: "Nurse", value: signatures.nurse },
              { label: "Technician", value: signatures.technician },
              { label: "Surgeon", value: signatures.doctor },
            ] as { label: string; value: string }[]
          ).map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className="border-b border-gray-400 w-full h-10 flex items-end justify-center pb-1">
                {value ? (
                  <span className={label === "Surgeon" ? "text-[#003D9B] font-semibold" : "text-gray-700"}>{value}</span>
                ) : null}
              </div>
              <span className="font-medium text-gray-600">{label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB]" dir="ltr">
      <style>{`
        ${customSheetCss}
        @media print {
          .lasik-print-root {
            transform: translateX(${printOffsetXmm}mm) translateY(${printOffsetYmm}mm) scale(${printScale});
            transform-origin: top center;
          }
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
      <div className="pb-10">
        <div className={`print:hidden ${printMode.printView ? "hidden" : ""}`}>
          {renderSheetBody()}
        </div>
        <div className="hidden print:block">{renderSheetBody(true)}</div>
      </div>
    </div>
  );
}
