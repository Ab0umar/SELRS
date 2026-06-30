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
  const [printScale, setPrintScale] = useState(0.82);
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
      <div className="bg-white text-gray-900 font-sans p-10 print:p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-8 max-w-5xl mx-auto" dir="ltr">
        {/* Header Section */}
        <div className="flex justify-between items-start border-b border-gray-200 pb-4">
          <div className="flex gap-4">
            <div className="w-16 h-16 bg-[#003d9b]/10 rounded-lg flex items-center justify-center">
              <svg className="w-10 h-10 text-[#003d9b]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="3" />
                <path d="M3 12c0-3 3-6 9-6s9 3 9 6-3 6-9 6-9-3-9-6z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#003d9b]">{BRAND_NAME_EN} Eye Clinic</h1>
              <p className="text-gray-500 font-medium text-sm" dir="rtl">{BRAND_NAME_AR}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Lasik Pre-Op Assessment</p>
            <p className="text-lg font-bold text-gray-900">Exam ID: {formData.patientCode ? `LX-${formData.patientCode}` : "LX-2023-8842"}</p>
            <p className="text-sm text-gray-500">Date: {formData.examinationDate || today}</p>
          </div>
        </div>

        {/* Operation Details & Eye Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-lg border border-gray-200">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Surgery Type Selection</label>
            <select
              className="w-full rounded-lg border-gray-300 bg-white focus:ring-[#003d9b] focus:border-[#003d9b] text-sm py-2 px-3"
              value={operationType}
              onChange={(e) => setOperationType(e.target.value)}
            >
              <option value="ليزك">Lasik (Standard)</option>
              <option value="فيمتو ليزك">Femto-Lasik</option>
              <option value="PRK">PRK / Trans-PRK</option>
              <option value="فيمتو سمايل">SMILE</option>
              <option value="ICL">Phakic IOL (ICL)</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Eye Selection</label>
            <div className="flex gap-6 mt-2">
              <label className="flex items-center gap-2 cursor-pointer group text-sm font-semibold">
                <input
                  className="w-5 h-5 rounded border-gray-300 text-[#003d9b] focus:ring-[#003d9b]"
                  type="checkbox"
                  checked={operationEyes.right}
                  onChange={(e) => {
                    const right = e.target.checked;
                    setOperationEyes((prev) => ({ ...prev, right, both: right && prev.left }));
                  }}
                />
                <span className="text-gray-700 group-hover:text-[#003d9b]">RT (Right Eye)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group text-sm font-semibold">
                <input
                  className="w-5 h-5 rounded border-gray-300 text-[#003d9b] focus:ring-[#003d9b]"
                  type="checkbox"
                  checked={operationEyes.left}
                  onChange={(e) => {
                    const left = e.target.checked;
                    setOperationEyes((prev) => ({ ...prev, left, both: prev.right && left }));
                  }}
                />
                <span className="text-gray-700 group-hover:text-[#003d9b]">LT (Left Eye)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group text-sm font-semibold">
                <input
                  className="w-5 h-5 rounded border-gray-300 text-[#003d9b] focus:ring-[#003d9b]"
                  type="checkbox"
                  checked={operationEyes.both}
                  onChange={(e) => {
                    const both = e.target.checked;
                    setOperationEyes({ right: both, left: both, both });
                  }}
                />
                <span className="text-gray-700 group-hover:text-[#003d9b]">OU (Both Eyes)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Patient Information Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[#003d9b] font-bold text-lg">👤</span>
            <h2 className="text-lg font-bold text-gray-900">Patient Details</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border border-gray-200 p-6 rounded-lg">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Full Name</span>
              <input
                className="border-0 border-b border-gray-300 focus:ring-0 focus:border-[#003d9b] p-0 py-1 font-bold text-sm bg-transparent"
                type="text"
                value={formData.patientName}
                onChange={(e) => setFormData((prev) => ({ ...prev, patientName: e.target.value }))}
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Patient Code</span>
              <input
                className="border-0 border-b border-gray-300 focus:ring-0 focus:border-[#003d9b] p-0 py-1 font-bold text-sm bg-transparent"
                type="text"
                value={formData.patientCode}
                onChange={(e) => setFormData((prev) => ({ ...prev, patientCode: e.target.value }))}
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date of Birth</span>
              <input
                className="border-0 border-b border-gray-300 focus:ring-0 focus:border-[#003d9b] p-0 py-1 font-bold text-sm bg-transparent"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData((prev) => ({ ...prev, dateOfBirth: e.target.value }))}
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Age</span>
              <input
                className="border-0 border-b border-gray-300 focus:ring-0 focus:border-[#003d9b] p-0 py-1 font-bold text-sm bg-transparent"
                type="text"
                value={formData.age}
                onChange={(e) => setFormData((prev) => ({ ...prev, age: e.target.value }))}
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Phone Number</span>
              <input
                className="border-0 border-b border-gray-300 focus:ring-0 focus:border-[#003d9b] p-0 py-1 font-bold text-sm bg-transparent"
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Profession / Job</span>
              <input
                className="border-0 border-b border-gray-300 focus:ring-0 focus:border-[#003d9b] p-0 py-1 font-bold text-sm bg-transparent"
                type="text"
                value={formData.job}
                onChange={(e) => setFormData((prev) => ({ ...prev, job: e.target.value }))}
              />
            </div>
            <div className="flex flex-col col-span-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Residential Address</span>
              <input
                className="border-0 border-b border-gray-300 focus:ring-0 focus:border-[#003d9b] p-0 py-1 font-bold text-sm bg-transparent"
                type="text"
                value={formData.address}
                onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
              />
            </div>
          </div>
        </section>

        {/* Medical History */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[#003d9b] font-bold text-lg">⏳</span>
            <h2 className="text-lg font-bold text-gray-900">Medical &amp; Ocular History</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-100 px-4 py-2 text-xs font-bold text-gray-700 uppercase tracking-wider">General Conditions</div>
              <div className="p-4 grid grid-cols-2 gap-3 text-sm">
                <label className="flex items-center gap-2 cursor-pointer"><input className="rounded border-gray-300 text-[#003d9b] focus:ring-[#003d9b]" type="checkbox"/> Diabetes</label>
                <label className="flex items-center gap-2 cursor-pointer"><input className="rounded border-gray-300 text-[#003d9b] focus:ring-[#003d9b]" type="checkbox"/> Hypertension</label>
                <label className="flex items-center gap-2 cursor-pointer"><input className="rounded border-gray-300 text-[#003d9b] focus:ring-[#003d9b]" type="checkbox"/> Rheumatoid</label>
                <label className="flex items-center gap-2 cursor-pointer"><input className="rounded border-gray-300 text-[#003d9b] focus:ring-[#003d9b]" type="checkbox"/> Pregnancy</label>
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-100 px-4 py-2 text-xs font-bold text-gray-700 uppercase tracking-wider">Ocular Conditions</div>
              <div className="p-4 grid grid-cols-2 gap-3 text-sm">
                <label className="flex items-center gap-2 cursor-pointer"><input className="rounded border-gray-300 text-[#003d9b] focus:ring-[#003d9b]" type="checkbox"/> Dry Eye</label>
                <label className="flex items-center gap-2 cursor-pointer"><input className="rounded border-gray-300 text-[#003d9b] focus:ring-[#003d9b]" type="checkbox"/> Glaucoma</label>
                <label className="flex items-center gap-2 cursor-pointer"><input className="rounded border-gray-300 text-[#003d9b] focus:ring-[#003d9b]" type="checkbox"/> Keratoconus</label>
                <label className="flex items-center gap-2 cursor-pointer"><input className="rounded border-gray-300 text-[#003d9b] focus:ring-[#003d9b]" type="checkbox"/> Family History</label>
              </div>
            </div>
          </div>
        </section>

        {/* Refraction Table */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[#003d9b] font-bold text-lg">🔬</span>
            <h2 className="text-lg font-bold text-gray-900">Comprehensive Refraction</h2>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3 border-r border-gray-200">EYE</th>
                  <th className="p-3 border-r border-gray-200">UCVA</th>
                  <th className="p-3 border-r border-gray-200">Sphere (S)</th>
                  <th className="p-3 border-r border-gray-200">Cylinder (C)</th>
                  <th className="p-3 border-r border-gray-200">Axis (A)</th>
                  <th className="p-3 border-r border-gray-200">BCVA</th>
                  <th className="p-3">IOP (mmHg)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-[#0c56d0]/5 border-t border-gray-200">
                  <td className="p-3 font-bold text-[#003d9b] border-r border-gray-200">OD (Right)</td>
                  <td className="p-1 border-r border-gray-200">
                    <input className="w-full bg-transparent border-0 focus:ring-0 text-center font-mono text-sm py-1" type="text" value={examData.autorefraction.od.ucva} onChange={mkAutoPatch("od", "ucva")}/>
                  </td>
                  <td className="p-1 border-r border-gray-200">
                    <input className="w-full bg-transparent border-0 focus:ring-0 text-center font-mono text-sm py-1" type="text" value={examData.autorefraction.od.s} onChange={mkAutoPatch("od", "s")}/>
                  </td>
                  <td className="p-1 border-r border-gray-200">
                    <input className="w-full bg-transparent border-0 focus:ring-0 text-center font-mono text-sm py-1" type="text" value={examData.autorefraction.od.c} onChange={mkAutoPatch("od", "c")}/>
                  </td>
                  <td className="p-1 border-r border-gray-200">
                    <input className="w-full bg-transparent border-0 focus:ring-0 text-center font-mono text-sm py-1" type="text" value={examData.autorefraction.od.axis} onChange={mkAutoPatch("od", "axis")}/>
                  </td>
                  <td className="p-1 border-r border-gray-200">
                    <input className="w-full bg-transparent border-0 focus:ring-0 text-center font-mono text-sm py-1" type="text" value={examData.autorefraction.od.bcva} onChange={mkAutoPatch("od", "bcva")}/>
                  </td>
                  <td className="p-1">
                    <input className={`w-full bg-transparent border-0 focus:ring-0 text-center font-mono text-sm py-1 ${!Number.isNaN(odIopNum) && odIopNum > 21 ? "text-red-600 font-bold" : ""}`} type="text" value={examData.autorefraction.od.iop} onChange={mkAutoPatch("od", "iop")}/>
                  </td>
                </tr>
                <tr className="bg-transparent border-t border-gray-200">
                  <td className="p-3 font-bold text-gray-700 border-r border-gray-200">OS (Left)</td>
                  <td className="p-1 border-r border-gray-200">
                    <input className="w-full bg-transparent border-0 focus:ring-0 text-center font-mono text-sm py-1" type="text" value={examData.autorefraction.os.ucva} onChange={mkAutoPatch("os", "ucva")}/>
                  </td>
                  <td className="p-1 border-r border-gray-200">
                    <input className="w-full bg-transparent border-0 focus:ring-0 text-center font-mono text-sm py-1" type="text" value={examData.autorefraction.os.s} onChange={mkAutoPatch("os", "s")}/>
                  </td>
                  <td className="p-1 border-r border-gray-200">
                    <input className="w-full bg-transparent border-0 focus:ring-0 text-center font-mono text-sm py-1" type="text" value={examData.autorefraction.os.c} onChange={mkAutoPatch("os", "c")}/>
                  </td>
                  <td className="p-1 border-r border-gray-200">
                    <input className="w-full bg-transparent border-0 focus:ring-0 text-center font-mono text-sm py-1" type="text" value={examData.autorefraction.os.axis} onChange={mkAutoPatch("os", "axis")}/>
                  </td>
                  <td className="p-1 border-r border-gray-200">
                    <input className="w-full bg-transparent border-0 focus:ring-0 text-center font-mono text-sm py-1" type="text" value={examData.autorefraction.os.bcva} onChange={mkAutoPatch("os", "bcva")}/>
                  </td>
                  <td className="p-1">
                    <input className={`w-full bg-transparent border-0 focus:ring-0 text-center font-mono text-sm py-1 ${!Number.isNaN(osIopNum) && osIopNum > 21 ? "text-red-600 font-bold" : ""}`} type="text" value={examData.autorefraction.os.iop} onChange={mkAutoPatch("os", "iop")}/>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Pentacam Scan Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[#003d9b] font-bold text-lg">📈</span>
            <h2 className="text-lg font-bold text-gray-900">Keratometry &amp; Pentacam Analysis</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* OD Card */}
            <div className="border border-gray-200 rounded-lg p-6 bg-[#0c56d0]/5">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-[#003d9b]">OD Pentacam Data</span>
                <span className={`px-2 py-1 rounded text-xs font-bold ${odThinnestNum < 480 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                  {odThinnestNum < 480 ? "THIN AREA" : "STABLE"}
                </span>
              </div>
              <div className="aspect-square w-full mb-4 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden border border-gray-300">
                <img
                  className="w-full h-full object-cover opacity-80 mix-blend-multiply"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuC6OABzeJyXmabFoy_EoI8q1AYjJyr2aTzwcTGgUKDuUu1vO8eW1t75Tv1V9jYeD0ahmbwJgkOMLYYkl9sVPps-n_ubaisNsFWaeS5dSlifwmzHMFowMdV5B0nk4jiddqgE0EQCKuSqw6MbfSHP21Xr-AIOv3ye_PUmrmFBuZ-AOJrYWWoaLi31YtKuamOY9auVSXGHa2i9I9vP7EQwSXN9tv3TMtUAe1iHpR4HQ9qDCLBV7MxgzLx316j_dnj9N9fmNRYjg2ZkGF5B"
                  alt="OD Pentacam"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col border-b border-gray-200 pb-1">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">K1 (Flat)</span>
                  <input className="font-mono text-[#003d9b] font-bold bg-transparent border-0 p-0 focus:ring-0" value={examData.pentacam.od.k1} onChange={mkPentaPatch("od", "k1")} />
                </div>
                <div className="flex flex-col border-b border-gray-200 pb-1">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">K2 (Steep)</span>
                  <input className="font-mono text-[#003d9b] font-bold bg-transparent border-0 p-0 focus:ring-0" value={examData.pentacam.od.k2} onChange={mkPentaPatch("od", "k2")} />
                </div>
                <div className="flex flex-col border-b border-gray-200 pb-1">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Thinnest Pt</span>
                  <input className={`font-mono font-bold bg-transparent border-0 p-0 focus:ring-0 ${odThinnestNum < 480 ? "text-red-600" : "text-[#003d9b]"}`} value={examData.pentacam.od.thinnest} onChange={mkPentaPatch("od", "thinnest")} />
                </div>
                <div className="flex flex-col border-b border-gray-200 pb-1">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Res. Stroma</span>
                  <input className="font-mono text-[#003d9b] font-bold bg-transparent border-0 p-0 focus:ring-0" value={examData.pentacam.od.residual} onChange={mkPentaPatch("od", "residual")} />
                </div>
              </div>
            </div>

            {/* OS Card */}
            <div className="border border-gray-200 rounded-lg p-6 bg-white">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-gray-700">OS Pentacam Data</span>
                <span className={`px-2 py-1 rounded text-xs font-bold ${osThinnestNum < 480 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                  {osThinnestNum < 480 ? "THIN AREA" : "STABLE"}
                </span>
              </div>
              <div className="aspect-square w-full mb-4 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden border border-gray-300">
                <img
                  className="w-full h-full object-cover opacity-80 mix-blend-multiply"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCIcJGOwXRkBJvTvVeeT00K2c55LGhbWpdrhUgZTMSJ8c3uQuqDOQEbUIl0gQwAiHfacnBGQbhH48U_y6_zPUVimXjvbsl4td5Yv56DLzri-XCwKRQhAhEL9DlpAl1CNTHhqqkmXqKVIeP-tMgvDtRGdV8Nx4cu89JY98HxSBePPZ-fQ2Z4G8S21rLUUgrkz68Y5neRpPTfCSvDdhebmPfUte2tKGPcfjyWY-LHKwdL3V4plfxQhYA4YDtdLu8mRYI02OCoNZbR_oa8"
                  alt="OS Pentacam"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col border-b border-gray-200 pb-1">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">K1 (Flat)</span>
                  <input className="font-mono text-gray-700 font-bold bg-transparent border-0 p-0 focus:ring-0" value={examData.pentacam.os.k1} onChange={mkPentaPatch("os", "k1")} />
                </div>
                <div className="flex flex-col border-b border-gray-200 pb-1">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">K2 (Steep)</span>
                  <input className="font-mono text-gray-700 font-bold bg-transparent border-0 p-0 focus:ring-0" value={examData.pentacam.os.k2} onChange={mkPentaPatch("os", "k2")} />
                </div>
                <div className="flex flex-col border-b border-gray-200 pb-1">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Thinnest Pt</span>
                  <input className={`font-mono font-bold bg-transparent border-0 p-0 focus:ring-0 ${osThinnestNum < 480 ? "text-red-600" : "text-gray-700"}`} value={examData.pentacam.os.thinnest} onChange={mkPentaPatch("os", "thinnest")} />
                </div>
                <div className="flex flex-col border-b border-gray-200 pb-1">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Res. Stroma</span>
                  <input className="font-mono text-gray-700 font-bold bg-transparent border-0 p-0 focus:ring-0" value={examData.pentacam.os.residual} onChange={mkPentaPatch("os", "residual")} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Ablation & Target Residual Table */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[#003d9b] font-bold text-lg">🎯</span>
            <h2 className="text-lg font-bold text-gray-900">Ablation &amp; Target Tracking</h2>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3 border-r border-gray-200">Stage</th>
                  <th className="p-3 border-r border-gray-200">Flap Thickness</th>
                  <th className="p-3 border-r border-gray-200">Ablation Depth</th>
                  <th className="p-3 border-r border-gray-200">Optical Zone</th>
                  <th className="p-3 border-r border-gray-200">Target Residual</th>
                  <th className="p-3">Final Prediction</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-200">
                  <td className="p-3 font-bold text-gray-700 border-r border-gray-200">OD</td>
                  <td className="p-1 border-r border-gray-200">
                    <input className="w-full bg-transparent border-0 focus:ring-0 text-center font-mono text-sm py-1" value={examData.pentacam.od.ttt} onChange={mkPentaPatch("od", "ttt")} placeholder="110 µm" />
                  </td>
                  <td className="p-1 border-r border-gray-200">
                    <input className="w-full bg-transparent border-0 focus:ring-0 text-center font-mono text-sm py-1" value={examData.pentacam.od.ablation} onChange={mkPentaPatch("od", "ablation")} placeholder="68 µm" />
                  </td>
                  <td className="p-1 border-r border-gray-200">
                    <input className="w-full bg-transparent border-0 focus:ring-0 text-center font-mono text-sm py-1" placeholder="6.5 mm" />
                  </td>
                  <td className="p-1 border-r border-gray-200">
                    <input className="w-full bg-transparent border-0 focus:ring-0 text-center font-mono text-sm py-1" value={examData.pentacam.od.residual} onChange={mkPentaPatch("od", "residual")} placeholder="346 µm" />
                  </td>
                  <td className="p-3 font-bold text-[#003d9b]">Plano</td>
                </tr>
                <tr className="border-t border-gray-200">
                  <td className="p-3 font-bold text-gray-700 border-r border-gray-200">OS</td>
                  <td className="p-1 border-r border-gray-200">
                    <input className="w-full bg-transparent border-0 focus:ring-0 text-center font-mono text-sm py-1" value={examData.pentacam.os.ttt} onChange={mkPentaPatch("os", "ttt")} placeholder="110 µm" />
                  </td>
                  <td className="p-1 border-r border-gray-200">
                    <input className="w-full bg-transparent border-0 focus:ring-0 text-center font-mono text-sm py-1" value={examData.pentacam.os.ablation} onChange={mkPentaPatch("os", "ablation")} placeholder="78 µm" />
                  </td>
                  <td className="p-1 border-r border-gray-200">
                    <input className="w-full bg-transparent border-0 focus:ring-0 text-center font-mono text-sm py-1" placeholder="6.5 mm" />
                  </td>
                  <td className="p-1 border-r border-gray-200">
                    <input className="w-full bg-transparent border-0 focus:ring-0 text-center font-mono text-sm py-1" value={examData.pentacam.os.residual} onChange={mkPentaPatch("os", "residual")} placeholder="310 µm" />
                  </td>
                  <td className="p-3 font-bold text-[#003d9b]">Plano</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Notes & Diagnosis */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-700">Clinical Notes</label>
            <textarea
              className="w-full rounded-lg border-gray-300 bg-gray-50 focus:ring-[#003d9b] focus:border-[#003d9b] placeholder:text-gray-400 text-sm"
              placeholder="Enter surgical observations or preoperative findings..."
              rows={4}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-700">Final Diagnosis &amp; Plan</label>
            <textarea
              className="w-full rounded-lg border-gray-300 bg-[#003d9b]/5 focus:ring-[#003d9b] focus:border-[#003d9b] font-bold text-[#003d9b] text-sm"
              rows={4}
              value="Bilateral Myopic Astigmatism. Patient eligible for Femto-Lasik. Target plano OU. Corneal thickness sufficient."
              readOnly
            />
          </div>
        </section>

        {/* Signatures Section */}
        <footer className="mt-8 pt-8 border-t-2 border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="flex flex-col items-center">
              <div className="w-full border-b border-gray-300 h-12 mb-2 flex items-end justify-center">
                <span className="text-gray-400 italic text-sm">{signatures.reception || "Reception"}</span>
              </div>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Reception</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-full border-b border-gray-300 h-12 mb-2 flex items-end justify-center">
                <span className="text-gray-400 italic text-sm">{signatures.nurse || "Nurse"}</span>
              </div>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nurse</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-full border-b border-gray-300 h-12 mb-2 flex items-end justify-center">
                <span className="text-gray-400 italic text-sm">{signatures.technician || "Technician"}</span>
              </div>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Technician</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-full border-b border-[#003d9b] h-12 mb-2 flex items-end justify-center">
                <div className="text-[#003d9b] font-bold text-sm">{signatures.doctor || "Dr. Ahmed Al-Fahad"}</div>
              </div>
              <span className="text-xs font-bold text-[#003d9b] uppercase tracking-wider">Ophthalmic Surgeon</span>
            </div>
          </div>
        </footer>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#dde1e7]" dir="ltr">
      <style>{`
        ${customSheetCss}
        @media print {
          .lasik-print-root {
            zoom: ${printScale};
            width: calc(190mm / ${printScale});
            margin-top: ${printOffsetYmm}mm;
            margin-left: ${printOffsetXmm}mm;
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
      <div className="py-8">
        <div className={`print:hidden ${printMode.printView ? "hidden" : ""}`}>
          <div className="a4-page-card">{renderSheetBody()}</div>
        </div>
        <div className="hidden print:block">{renderSheetBody(true)}</div>
      </div>
    </div>
  );
}
