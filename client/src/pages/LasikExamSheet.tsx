import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Printer,
  User,
  LayoutGrid,
  Layers,
  Target,
  Clock,
  Search,
  Trash2,
} from "lucide-react";
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
import { DateInput } from "@/components/ui/date-input";
import FollowupTablesBody, {
  type FollowupItem,
} from "@/components/sheets/FollowupTablesBody";
import SheetPrintHeader from "@/components/sheets/SheetPrintHeader";
import SheetWatermark from "@/components/sheets/SheetWatermark";
import RefractionValueSelect from "@/components/RefractionValueSelect";
import {
  CYLINDER_OPTIONS,
  SPHERE_OPTIONS,
  UCVA_BCVA_OPTIONS,
} from "@/lib/refractionOptions";
import { MedicalHistoryTab } from "@/components/patient-details/MedicalHistoryTab";
import {
  displaySheetDate,
  formatSheetDate,
  getPatientSheetDateOfBirth,
} from "@/lib/sheetDates";

function FundusDrawingCanvas({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (!value) return;
    const image = new Image();
    image.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    };
    image.src = value;
  }, [value]);
  const persistDrawing = () => {
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL("image/webp", 0.82));
  };
  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * event.currentTarget.width,
      y:
        ((event.clientY - rect.top) / rect.height) * event.currentTarget.height,
    };
  };
  return (
    <>
      <canvas
        ref={canvasRef}
        width={360}
        height={720}
        className="absolute inset-0 z-10 h-full w-full touch-none cursor-crosshair"
        onPointerDown={(event) => {
          drawingRef.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          const ctx = event.currentTarget.getContext("2d");
          const current = point(event);
          ctx?.beginPath();
          ctx?.moveTo(current.x, current.y);
        }}
        onPointerMove={(event) => {
          if (!drawingRef.current) return;
          const ctx = event.currentTarget.getContext("2d");
          if (!ctx) return;
          const current = point(event);
          ctx.strokeStyle = "#dc2626";
          ctx.lineWidth = 2.5;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.lineTo(current.x, current.y);
          ctx.stroke();
        }}
        onPointerUp={persistDrawing}
        onPointerCancel={persistDrawing}
      />
      <button
        type="button"
        title="مسح الرسم"
        aria-label="مسح الرسم"
        className="absolute right-1 top-1 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-[10px] font-bold text-slate-500 shadow print:hidden"
        onClick={() => {
          const canvas = canvasRef.current;
          if (canvas) {
            canvas
              .getContext("2d")
              ?.clearRect(0, 0, canvas.width, canvas.height);
            onChange("");
          }
        }}
      >
        ×
      </button>
    </>
  );
}

type LasikExamSheetProps = {
  params?: unknown;
  embedded?: boolean;
  patientId?: number;
  visitId?: number;
  sheetType?: "consultant" | "lasik" | "external";
  embeddedMode?: "full" | "examination";
};

const DEFAULT_FOLLOWUP_NAMES = [
  "المتابعة الأولى",
  "المتابعة الثانية",
  "المتابعة الثالثة",
  "المتابعة الرابعة",
];

function createEmptyFollowups(names = DEFAULT_FOLLOWUP_NAMES): FollowupItem[] {
  return DEFAULT_FOLLOWUP_NAMES.map((fallbackName, index) => ({
    id: `empty-${index + 1}`,
    date: "",
    type: names[index] ?? fallbackName,
  }));
}

export default function LasikExamSheet({
  embedded = false,
  patientId: embeddedPatientId,
  visitId: embeddedVisitId,
  sheetType: embeddedSheetType,
  embeddedMode = "full",
}: LasikExamSheetProps = {}) {
  const [selectedVisitId, setSelectedVisitId] = useState(embeddedVisitId);
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { goBack } = useAppNavigation();
  const [, params] = useRoute("/sheets/:type/:id");
  const currentPath =
    typeof window !== "undefined" ? window.location.pathname : "";
  const currentSheetType =
    embeddedSheetType ??
    (currentPath.includes("/sheets/consultant")
      ? "consultant"
      : currentPath.includes("/sheets/external") ||
        currentPath.includes("/sheets/operation")
        ? "external"
        : "lasik");
  const sheetTypeLabel =
    currentSheetType === "consultant"
      ? "كشف"
      : currentSheetType === "external"
        ? "د.الصواف"
        : "تصحيح ابصار";
  const routePatientId = (() => {
    if (params?.id) return Number(params.id);
    if (typeof window === "undefined") return undefined;
    const match = window.location.pathname.match(
      /^\/(?:patient-hub\/)?sheets\/(?:lasik|consultant|external)\/(\d+)/,
    );
    return match?.[1] ? Number(match[1]) : undefined;
  })();
  const initialPatientId = Number.isFinite(embeddedPatientId)
    ? embeddedPatientId
    : Number.isFinite(routePatientId)
      ? routePatientId
      : undefined;
  const originalMode =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("original") === "1";
  const includeFollowupsMode =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("includeFollowups") === "1";
  const defaultFollowupLabels =
    currentSheetType === "consultant"
      ? DEFAULT_SHEET_DESIGNER_CONFIG.followupConsultant
      : DEFAULT_SHEET_DESIGNER_CONFIG.followupLasik;
  const [followupLabels, setFollowupLabels] = useState(defaultFollowupLabels);
  const [followups, setFollowups] = useState<FollowupItem[]>(() =>
    createEmptyFollowups(defaultFollowupLabels.followupNames),
  );
  const [medicalHistory, setMedicalHistory] = useState<
    Record<string, "no" | "yes" | "">
  >({});
  const [medicalHistoryOther, setMedicalHistoryOther] = useState("");
  const [diabetesDuration, setDiabetesDuration] = useState("");
  const [operationType, setOperationType] = useState("");
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
    alternatePhone: "",
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
  const [clinicalRefraction, setClinicalRefraction] = useState({
    od: { s: "", c: "", axis: "", pd: "" },
    os: { s: "", c: "", axis: "", pd: "" },
  });
  const [signatures, setSignatures] = useState({
    reception: "",
    nurse: "",
    technician: "",
    doctor: currentSheetType === "external" ? "د. الصواف" : "",
  });
  const [readingValue, setReadingValue] = useState("");
  const [diagnosisText, setDiagnosisText] = useState("");
  const [finalDecisionText, setFinalDecisionText] = useState("");
  const [consultantDrawing, setConsultantDrawing] = useState("");
  const [consultantExam, setConsultantExam] = useState({
    externalPtosis: false,
    externalSquint: false,
    externalOthers: false,
    externalOthersNote: "",
    muscleNormal: false,
    muscleAbnormal: false,
    muscleAbnormalNote: "",
    otherAbnormalities: "",
    fundusNormal: false,
    fundusAbnormal: false,
    fundusAbnormalNote: "",
    complains: "",
  });
  useEffect(() => {
    setSelectedVisitId(embeddedVisitId);
  }, [embeddedVisitId]);
  useEffect(() => {
    if (!selectedVisitId) return;
    setConsultantExam({
      externalPtosis: false,
      externalSquint: false,
      externalOthers: false,
      externalOthersNote: "",
      muscleNormal: false,
      muscleAbnormal: false,
      muscleAbnormalNote: "",
      otherAbnormalities: "",
      fundusNormal: false,
      fundusAbnormal: false,
      fundusAbnormalNote: "",
      complains: "",
    });
    setClinicalRefraction({
      od: { s: "", c: "", axis: "", pd: "" },
      os: { s: "", c: "", axis: "", pd: "" },
    });
    setConsultantDrawing("");
  }, [selectedVisitId]);
  const [complainsSearchText, setComplainsSearchText] = useState("");
  const [complainsSearchOpen, setComplainsSearchOpen] = useState(false);
  const symptomsQuery = trpc.medical.getAllSymptoms.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const setConsultantExamField = (
    field: keyof typeof consultantExam,
    value: boolean | string,
  ) => {
    setConsultantExam((prev) => ({ ...prev, [field]: value }));
  };
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
    setCustomSheetCss(localDesigner.css[currentSheetType] || "");
    setSheetTemplate(localDesigner.templates[currentSheetType]);
    setPrintOffsetXmm(localDesigner.layout[currentSheetType].offsetXmm);
    setPrintOffsetYmm(localDesigner.layout[currentSheetType].offsetYmm);
    setPrintScale(localDesigner.layout[currentSheetType].scale);
    const labels =
      currentSheetType === "consultant"
        ? localDesigner.followupConsultant
        : localDesigner.followupLasik;
    setFollowupLabels(labels);
    setFollowups((previous) =>
      previous.map((item, index) => ({
        ...item,
        type: labels.followupNames[index] ?? item.type,
      })),
    );
  }, [currentSheetType]);

  useEffect(() => {
    if (!designerSettingsQuery.data?.value) return;
    const merged = coerceSheetDesignerConfig(designerSettingsQuery.data.value);
    setCustomSheetCss(merged.css[currentSheetType] || "");
    setSheetTemplate(merged.templates[currentSheetType]);
    setPrintOffsetXmm(merged.layout[currentSheetType].offsetXmm);
    setPrintOffsetYmm(merged.layout[currentSheetType].offsetYmm);
    setPrintScale(merged.layout[currentSheetType].scale);
    const labels =
      currentSheetType === "consultant"
        ? merged.followupConsultant
        : merged.followupLasik;
    setFollowupLabels(labels);
    setFollowups((previous) =>
      previous.map((item, index) => ({
        ...item,
        type: labels.followupNames[index] ?? item.type,
      })),
    );
    saveSheetDesignerConfig(merged);
  }, [currentSheetType, designerSettingsQuery.data]);

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
    {
      patientId: initialPatientId ?? 0,
      visitId: selectedVisitId,
      sheetType: currentSheetType,
    },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const fallbackSheetType =
    currentSheetType === "consultant"
      ? "lasik"
      : currentSheetType === "lasik"
        ? "consultant"
        : null;
  const fallbackSheetQuery = trpc.medical.getSheetEntry.useQuery(
    {
      patientId: initialPatientId ?? 0,
      sheetType: fallbackSheetType ?? "consultant",
    },
    {
      enabled:
        Boolean(initialPatientId) &&
        includeFollowupsMode &&
        Boolean(fallbackSheetType),
      refetchOnWindowFocus: false,
    },
  );
  const examinationStateQuery = trpc.medical.getPatientPageState.useQuery(
    { patientId: initialPatientId ?? 0, page: "examination" },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const examinationsQuery = trpc.medical.getExaminationsByPatient.useQuery(
    { patientId: initialPatientId ?? 0 },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const glassesQuery = trpc.medical.getGlassesRecordsByPatient.useQuery(
    { patientId: initialPatientId ?? 0 },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const autorefQuery = trpc.medical.getAutorefractometryByPatient.useQuery(
    { patientId: initialPatientId ?? 0 },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const checklistsQuery =
    trpc.medical.getExaminationChecklistsByPatient.useQuery(
      { patientId: initialPatientId ?? 0 },
      { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
    );
  const visitsQuery = trpc.medical.getVisitsByPatient.useQuery(
    { patientId: initialPatientId ?? 0 },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const hasAttachedFollowupPage =
    embeddedMode !== "examination" &&
    (currentSheetType === "consultant" || currentSheetType === "lasik");
  const followupSheetsQuery = trpc.medical.getFollowupSheets.useQuery(
    { patientId: initialPatientId ?? 0 },
    {
      enabled: Boolean(initialPatientId) && hasAttachedFollowupPage,
      refetchOnWindowFocus: false,
    },
  );
  // Auto-print (triggered by usePrintMode below) must wait for the sheet's
  // own data to finish loading — otherwise the print preview/dialog fires
  // against a still-empty page. `initialPatientId` alone is available
  // synchronously from the URL, long before any of these queries resolve.
  const printMode = usePrintMode({
    ready:
      Boolean(initialPatientId) &&
      !sheetQuery.isLoading &&
      !examinationsQuery.isLoading &&
      !visitsQuery.isLoading &&
      (!hasAttachedFollowupPage || !followupSheetsQuery.isLoading),
  });
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
  const pentacamQuery = trpc.medical.getPentacamFilesByPatient.useQuery(
    { patientId: initialPatientId ?? 0 },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const testRequestsQuery = trpc.medical.getTestRequestsByPatient.useQuery(
    { patientId: initialPatientId ?? 0 },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const medicalHistoryQuery = trpc.medical.getMedicalHistoryByPatient.useQuery(
    { patientId: initialPatientId ?? 0 },
    { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
  );
  const upsertMedicalHistoryMutation =
    trpc.medical.upsertMedicalHistory.useMutation();

  useEffect(() => {
    if (!followupSheetsQuery.data) return;

    const parseObject = (value: unknown) => {
      if (!value) return {} as Record<string, string>;
      try {
        return (typeof value === "string" ? JSON.parse(value) : value) as Record<
          string,
          string
        >;
      } catch {
        return {} as Record<string, string>;
      }
    };

    const items = (followupSheetsQuery.data as any[])
      .slice()
      .sort((a, b) => Number(a.version) - Number(b.version))
      .flatMap((sheet) =>
        (sheet.items ?? []).map((item: any) => ({
          ...item,
          sheetVersion: sheet.version,
        })),
      )
      .filter((item: any) => item.followupDate)
      .sort((a: any, b: any) => {
        const dateOrder =
          new Date(a.followupDate).getTime() -
          new Date(b.followupDate).getTime();
        if (dateOrder !== 0) return dateOrder;
        const versionOrder =
          Number(a.sheetVersion) - Number(b.sheetVersion);
        return versionOrder !== 0
          ? versionOrder
          : Number(a.tableIndex) - Number(b.tableIndex);
      })
      .slice(0, 4);

    const emptyRows = createEmptyFollowups(followupLabels.followupNames);
    setFollowups(
      emptyRows.map((emptyRow, index) => {
        const item = items[index];
        if (!item) return emptyRow;
        const od = parseObject(item.refracOD);
        const os = parseObject(item.refracOS);
        return {
          ...emptyRow,
          id: item.id,
          date: formatSheetDate(item.followupDate),
          odVa: item.vaOD ?? "",
          osVa: item.vaOS ?? "",
          odS: od.s ?? "",
          odC: od.c ?? "",
          odAxis: od.axis ?? "",
          osS: os.s ?? "",
          osC: os.c ?? "",
          osAxis: os.axis ?? "",
          odIop: item.iopOD ?? "",
          osIop: item.iopOS ?? "",
          treatment: item.treatment ?? "",
          notes: item.notes ?? "",
        };
      }),
    );
  }, [followupLabels.followupNames, followupSheetsQuery.data]);

  useEffect(() => {
    let sheetOwnsOtherHistory = false;
    try {
      const savedSheet = sheetQuery.data ? JSON.parse(sheetQuery.data) : null;
      sheetOwnsOtherHistory = Object.prototype.hasOwnProperty.call(
        savedSheet ?? {},
        "medicalHistoryOther",
      );
    } catch {
      sheetOwnsOtherHistory = false;
    }
    if (medicalHistoryQuery.data && medicalHistoryQuery.data.length > 0) {
      const rec = medicalHistoryQuery.data[0];
      setMedicalHistory({
        "سكر؟": Boolean(rec.diabetes) ? "yes" : "no",
        "ضغط؟": Boolean(rec.hypertension) ? "yes" : "no",
        "الغدة الدرقية؟": Boolean(rec.thyroid) ? "yes" : "no",
        "أمراض مناعة؟": Boolean(rec.autoimmune) ? "yes" : "no",
        "ماء زرقاء؟": Boolean(rec.glaucoma) ? "yes" : "no",
        "قرنية مخروطية بالعائلة؟": Boolean(rec.familyKeratoconus)
          ? "yes"
          : "no",
      });
      if (
        !sheetOwnsOtherHistory &&
        (rec.previousSurgeries || rec.familyHistory)
      ) {
        const extraParts = [
          rec.previousSurgeries && `عمليات سابقة: ${rec.previousSurgeries}`,
          rec.familyHistory && `تاريخ عائلي: ${rec.familyHistory}`,
        ]
          .filter(Boolean)
          .join(" | ");
        if (extraParts) setMedicalHistoryOther(extraParts);
      }
    } else {
      setMedicalHistory({
        "سكر؟": "no",
        "ضغط؟": "no",
        "الغدة الدرقية؟": "no",
        "أمراض مناعة؟": "no",
        "ماء زرقاء؟": "no",
        "قرنية مخروطية بالعائلة؟": "no",
      });
    }
  }, [medicalHistoryQuery.data, sheetQuery.data]);
  useEffect(() => {
    if (!initialPatientId) return;
    const socket = connectSheetUpdates({
      patientId: initialPatientId,
      onUpdate: () => {
        Promise.all([
          sheetQuery.refetch(),
          fallbackSheetQuery.refetch(),
          patientQuery.refetch(),
          examinationsQuery.refetch(),
          glassesQuery.refetch(),
          autorefQuery.refetch(),
          checklistsQuery.refetch(),
          visitsQuery.refetch(),
          reportsQuery.refetch(),
          prescriptionsQuery.refetch(),
          surgeriesQuery.refetch(),
          followupSheetsQuery.refetch(),
          pentacamQuery.refetch(),
          testRequestsQuery.refetch(),
        ]);
      },
    });
    return () => socket?.close();
  }, [
    initialPatientId,
    sheetQuery,
    fallbackSheetQuery,
    patientQuery,
    examinationsQuery,
    glassesQuery,
    autorefQuery,
    checklistsQuery,
    visitsQuery,
    reportsQuery,
    prescriptionsQuery,
    surgeriesQuery,
    followupSheetsQuery,
    pentacamQuery,
    testRequestsQuery,
  ]);
  const saveSheetMutation = trpc.medical.saveSheetEntry.useMutation({
    onSuccess: () => {
      toast.success("تم الحفظ");
    },
  });
  const deleteVisitSheetMutation =
    trpc.medical.deleteSheetEntryForVisit.useMutation({
      onSuccess: async ({ deleted }) => {
        setConsultantExam({
          externalPtosis: false,
          externalSquint: false,
          externalOthers: false,
          externalOthersNote: "",
          muscleNormal: false,
          muscleAbnormal: false,
          muscleAbnormalNote: "",
          otherAbnormalities: "",
          fundusNormal: false,
          fundusAbnormal: false,
          fundusAbnormalNote: "",
          complains: "",
        });
        await sheetQuery.refetch();
        toast.success(
          deleted ? "تم مسح شيت الزيارة" : "لا يوجد شيت محفوظ لهذه الزيارة",
        );
      },
      onError: (error) =>
        toast.error(getTrpcErrorMessage(error, "تعذر مسح شيت الزيارة")),
    });
  const saveRefractionMutation =
    trpc.medical.saveRefractionToExamination.useMutation();
  const updateChiefComplaintMutation =
    trpc.medical.updateVisitChiefComplaint.useMutation();

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
      const hubPrefix = currentPath.startsWith("/patient-hub/")
        ? "/patient-hub"
        : "";
      setLocation(`${hubPrefix}/sheets/${currentSheetType}/${patient.id}`);
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

  const loadedSheetData = sheetQuery.data ?? fallbackSheetQuery.data;

  useEffect(() => {
    if (!loadedSheetData) return;
    try {
      const parsed = JSON.parse(loadedSheetData);
      if (parsed.formData) {
        setFormData((prev) => ({
          ...prev,
          ...parsed.formData,
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
      if (parsed.consultantExam) {
        setConsultantExam((prev) => ({ ...prev, ...parsed.consultantExam }));
      }
      setConsultantDrawing(String(parsed.consultantDrawing ?? ""));
      if (parsed.medicalHistory) {
        setMedicalHistory((prev) => ({ ...parsed.medicalHistory, ...prev }));
      }
      if (Object.prototype.hasOwnProperty.call(parsed, "medicalHistoryOther")) {
        const savedOther = String(parsed.medicalHistoryOther ?? "").trim();
        const savedComplaint = String(
          parsed.consultantExam?.complains ?? "",
        ).trim();
        const otherWithoutLegacyMedicationLabel = savedOther
          .replace(/^أدوية:\s*/u, "")
          .trim();
        setMedicalHistoryOther(
          savedComplaint && otherWithoutLegacyMedicationLabel === savedComplaint
            ? ""
            : savedOther,
        );
      }
      if (parsed.operationDetails) {
        setOperationType(parsed.operationDetails.type ?? "");
        setOperationDateRight(parsed.operationDetails.date ?? "");
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
      if (parsed.diagnosisText) setDiagnosisText(parsed.diagnosisText);
      if (parsed.finalDecisionText)
        setFinalDecisionText(parsed.finalDecisionText);
    } catch {
      // ignore malformed data
    }
  }, [loadedSheetData]);

  // Requested-service code is the only reference available for the
  // operation type/date — pre-fill the header checkboxes and operation date
  // from it, but only once the saved sheet data (above) has settled and
  // left the fields empty, and never once the user/sheet has a real value:
  // this is a starting suggestion, not a lock, and must not clobber a
  // manual edit.
  const suggestedOperationTypeQuery =
    trpc.opHistory.getSuggestedOperationType.useQuery(
      { patientId: initialPatientId ?? 0 },
      { enabled: Boolean(initialPatientId), refetchOnWindowFocus: false },
    );
  useEffect(() => {
    if (sheetQuery.isLoading || operationType) return;
    const suggested = suggestedOperationTypeQuery.data;
    if (!suggested) return;
    const checkboxValue: Record<string, string> = {
      PRK: "PRK",
      Lasik: "LASIK",
      FL: "FL",
      FS: "FS",
      IOL: "IOL",
      ICL: "ICL",
    };
    const value = checkboxValue[suggested.operationType];
    if (value) setOperationType(value);
  }, [suggestedOperationTypeQuery.data, sheetQuery.isLoading, operationType]);
  useEffect(() => {
    if (sheetQuery.isLoading || operationDateRight) return;
    const suggested = suggestedOperationTypeQuery.data;
    if (!suggested?.operationDate) return;
    setOperationDateRight(displaySheetDate(suggested.operationDate));
  }, [
    suggestedOperationTypeQuery.data,
    sheetQuery.isLoading,
    operationDateRight,
  ]);

  useEffect(() => {
    if (!examinationsQuery.data || examinationsQuery.data.length === 0) return;
    const latestExam =
      ((examinationsQuery.data as any[]) ?? []).find(
        (row) => Number(row.visitId) === Number(selectedVisitId),
      ) ?? (!selectedVisitId ? (examinationsQuery.data[0] as any) : null);
    if (!latestExam) return;
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
  }, [examinationsQuery.data, selectedVisitId]);

  useEffect(() => {
    const selectedExamination = ((examinationsQuery.data as any[]) ?? []).find(
      (row) => Number(row.visitId) === Number(selectedVisitId),
    );
    const latest =
      ((glassesQuery.data as any[]) ?? []).find(
        (row) =>
          Number(row.visitId) === Number(selectedVisitId) ||
          Number(row.examinationId) === Number(selectedExamination?.id),
      ) ?? (!selectedVisitId ? ((glassesQuery.data as any[]) ?? [])[0] : null);
    if (!latest) return;
    setClinicalRefraction({
      od: {
        s: String(latest.sOD ?? ""),
        c: String(latest.cOD ?? ""),
        axis: String(latest.axisOD ?? ""),
        pd: String(latest.pdOD ?? ""),
      },
      os: {
        s: String(latest.sOS ?? ""),
        c: String(latest.cOS ?? ""),
        axis: String(latest.axisOS ?? ""),
        pd: String(latest.pdOS ?? ""),
      },
    });
    setExamData((previous) => ({
      ...previous,
      autorefraction: {
        od: {
          ...previous.autorefraction.od,
          bcva: String(latest.bcvaOD || previous.autorefraction.od.bcva || ""),
        },
        os: {
          ...previous.autorefraction.os,
          bcva: String(latest.bcvaOS || previous.autorefraction.os.bcva || ""),
        },
      },
    }));
  }, [examinationsQuery.data, glassesQuery.data, selectedVisitId]);

  useEffect(() => {
    const selectedExamination = ((examinationsQuery.data as any[]) ?? []).find(
      (row) => Number(row.visitId) === Number(selectedVisitId),
    );
    const latest =
      ((autorefQuery.data as any[]) ?? []).find(
        (row) =>
          Number(row.visitId) === Number(selectedVisitId) ||
          Number(row.examinationId) === Number(selectedExamination?.id),
      ) ?? (!selectedVisitId ? ((autorefQuery.data as any[]) ?? [])[0] : null);
    if (!latest) return;
    setExamData((previous) => ({
      ...previous,
      autorefraction: {
        od: {
          ...previous.autorefraction.od,
          s: String(latest.sphereOD ?? ""),
          c: String(latest.cylinderOD ?? ""),
          axis: String(latest.axisOD ?? ""),
          ucva: String(latest.ucvaOD ?? ""),
          bcva: String(latest.bcvaOD || previous.autorefraction.od.bcva || ""),
          iop: String(latest.iopOD ?? ""),
        },
        os: {
          ...previous.autorefraction.os,
          s: String(latest.sphereOS ?? ""),
          c: String(latest.cylinderOS ?? ""),
          axis: String(latest.axisOS ?? ""),
          ucva: String(latest.ucvaOS ?? ""),
          bcva: String(latest.bcvaOS || previous.autorefraction.os.bcva || ""),
          iop: String(latest.iopOS ?? ""),
        },
      },
    }));
  }, [autorefQuery.data, examinationsQuery.data, selectedVisitId]);

  useEffect(() => {
    const latestExamination =
      ((examinationsQuery.data as any[]) ?? []).find(
        (row) => Number(row.visitId) === Number(selectedVisitId),
      ) ??
      (!selectedVisitId ? ((examinationsQuery.data as any[]) ?? [])[0] : null);
    const visit =
      ((visitsQuery.data as any[]) ?? []).find(
        (row) => Number(row.id) === Number(latestExamination?.visitId),
      ) ??
      ((visitsQuery.data as any[]) ?? []).find(
        (row) => Number(row.id) === Number(selectedVisitId),
      );
    const complaint = String(visit?.chiefComplaint ?? "").trim();
    let hasSavedComplaint = false;
    try {
      const savedSheet = sheetQuery.data ? JSON.parse(sheetQuery.data) : null;
      hasSavedComplaint =
        Number(savedSheet?.visitId) === Number(selectedVisitId) &&
        Object.prototype.hasOwnProperty.call(
          savedSheet?.consultantExam ?? {},
          "complains",
        );
    } catch {
      hasSavedComplaint = false;
    }
    if (hasSavedComplaint) return;
    setConsultantExam((previous) => ({ ...previous, complains: complaint }));
  }, [
    examinationsQuery.data,
    selectedVisitId,
    sheetQuery.data,
    visitsQuery.data,
  ]);

  useEffect(() => {
    const latestReport =
      ((reportsQuery.data as any[]) ?? []).find(
        (row) => Number(row.visitId) === Number(selectedVisitId),
      ) ?? (!selectedVisitId ? ((reportsQuery.data as any[]) ?? [])[0] : null);
    setDiagnosisText(String(latestReport?.diagnosis ?? ""));
    setFinalDecisionText(
      String(latestReport?.recommendations ?? latestReport?.treatment ?? ""),
    );
  }, [reportsQuery.data, selectedVisitId]);

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
    if (embedded && !selectedVisitId) {
      toast.error("يجب اختيار زيارة موجودة قبل الحفظ");
      return;
    }
    const selectedExamination = ((examinationsQuery.data as any[]) ?? []).find(
      (examination) => Number(examination.visitId) === Number(selectedVisitId),
    );
    if (embeddedMode === "examination" && !selectedExamination?.id) {
      toast.error("الزيارة المختارة لا تحتوي على فحص قياسات محفوظ");
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
        visitId: selectedVisitId,
        sheetType: currentSheetType,
        content: JSON.stringify({
          ...existing,
          visitId: selectedVisitId,
          formData: { ...(existing.formData ?? {}), ...formData },
          examData: mergedExamData,
          consultantExam,
          consultantDrawing,
          medicalHistory,
          medicalHistoryOther,
          diagnosisText,
          finalDecisionText,
          operationDetails: {
            type: operationType,
            date: operationDateRight,
            eyes: operationEyes,
          },
        }),
      });
      if (selectedVisitId) {
        await updateChiefComplaintMutation.mutateAsync({
          visitId: selectedVisitId,
          chiefComplaint: consultantExam.complains.trim(),
        });
      }
      await upsertMedicalHistoryMutation.mutateAsync({
        patientId: initialPatientId,
        diabetes: medicalHistory["سكر؟"] === "yes",
        hypertension: medicalHistory["ضغط؟"] === "yes",
        thyroid: medicalHistory["الغدة الدرقية؟"] === "yes",
        autoimmune: medicalHistory["أمراض مناعة؟"] === "yes",
        glaucoma: medicalHistory["ماء زرقاء؟"] === "yes",
        familyKeratoconus: medicalHistory["قرنية مخروطية بالعائلة؟"] === "yes",
      });
      if (selectedExamination?.id) {
        await saveRefractionMutation.mutateAsync({
          patientId: initialPatientId,
          visitId: selectedVisitId,
          examinationId: selectedExamination.id,
          createVisitIfMissing: false,
          glassesData: {
            od: {
              s: clinicalRefraction.od.s || undefined,
              c: clinicalRefraction.od.c || undefined,
              axis: clinicalRefraction.od.axis || undefined,
              pd: clinicalRefraction.od.pd || undefined,
              bcva: examData.autorefraction.od.bcva || undefined,
            },
            os: {
              s: clinicalRefraction.os.s || undefined,
              c: clinicalRefraction.os.c || undefined,
              axis: clinicalRefraction.os.axis || undefined,
              pd: clinicalRefraction.os.pd || undefined,
              bcva: examData.autorefraction.os.bcva || undefined,
            },
          },
        });
      }
      await Promise.all([
        sheetQuery.refetch(),
        examinationsQuery.refetch(),
        glassesQuery.refetch(),
        autorefQuery.refetch(),
        visitsQuery.refetch(),
      ]);
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "حدث خطأ أثناء الحفظ"));
    }
  };

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

    const mkAutoPatch =
      (eye: "od" | "os", field: string) =>
        (e: React.ChangeEvent<HTMLInputElement>) =>
          setExamData((prev) => ({
            ...prev,
            autorefraction: {
              ...prev.autorefraction,
              [eye]: {
                ...prev.autorefraction[eye],
                [field]: e.target.value,
              } as typeof prev.autorefraction.od,
            },
          }));

    const mkClinicalPatch =
      (eye: "od" | "os", field: "s" | "c" | "axis" | "pd") =>
        (event: React.ChangeEvent<HTMLInputElement>) =>
          setClinicalRefraction((previous) => ({
            ...previous,
            [eye]: { ...previous[eye], [field]: event.target.value },
          }));

    const mkPentaPatch =
      (eye: "od" | "os", field: string) =>
        (e: React.ChangeEvent<HTMLInputElement>) =>
          setExamData((prev) => ({
            ...prev,
            pentacam: {
              ...prev.pentacam,
              [eye]: {
                ...prev.pentacam[eye],
                [field]: e.target.value,
              } as typeof prev.pentacam.od,
            },
          }));

    const inp =
      "w-full text-center bg-transparent border-0 border-b border-solid border-[#737685] focus:outline-none focus:border-[#003d9b] py-1 text-sm";
    const ctd = "p-1 border border-[#c3c6d6]";

    return (
      <div
        className={`lasik-sheet sheet-type-${currentSheetType} relative overflow-hidden bg-white text-[#191c1e] font-sans print:p-[10mm] print:border-0 print:shadow-none flex flex-col ${embeddedMode === "examination"
          ? "consultant-examination-only w-full max-w-none gap-0 border-0 p-0 shadow-none"
          : embedded
            ? "w-full max-w-none gap-5 border border-[#c3c6d6] p-8 shadow-sm"
            : "w-full max-w-[210mm] mx-auto gap-5 border border-[#c3c6d6] p-8 shadow-sm"
          }`}
        dir="ltr"
      >
        {embeddedMode !== "examination" ? <SheetWatermark /> : null}
        {embeddedMode !== "examination" ? (
          <SheetPrintHeader
            sheetType={sheetTypeLabel}
            logoLeftContent={
              currentSheetType !== "consultant" ? (
                <div
                  className="header-eye-field flex items-center gap-1.5 whitespace-nowrap text-[10px] font-bold"
                  dir="ltr"
                >
                  <span className="text-[#434654]">Eye:</span>
                  {(
                    [
                      ["OD", "right"],
                      ["OS", "left"],
                      ["OU", "both"],
                    ] as const
                  ).map(([label, eye]) => (
                    <label key={eye} className="flex items-center gap-0.5">
                      <input
                        type="checkbox"
                        checked={operationEyes[eye]}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          if (eye === "both") {
                            setOperationEyes({
                              right: checked,
                              left: checked,
                              both: checked,
                            });
                            return;
                          }
                          setOperationEyes((previous) => {
                            const next = { ...previous, [eye]: checked };
                            return {
                              ...next,
                              both: next.right && next.left,
                            };
                          });
                        }}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              ) : undefined
            }
            logoRightContent={
              currentSheetType !== "consultant" ? (
                <div
                  className="header-operation-type-field grid grid-cols-3 gap-x-2 gap-y-0.5 text-[10px] font-bold"
                  dir="ltr"
                >
                  {[
                    ["PRK", "PRK"],
                    ["LASIK", "LASIK"],
                    ["F.S", "FS"],
                    ["F.L", "FL"],
                    ["IOL", "IOL"],
                    ["ICL", "ICL"],
                  ].map(([label, value]) => (
                    <label
                      key={value}
                      className="inline-flex items-center gap-0.5 whitespace-nowrap"
                    >
                      <input
                        type="checkbox"
                        checked={operationType === value}
                        onChange={() =>
                          setOperationType(
                            operationType === value ? "" : value,
                          )
                        }
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              ) : undefined
            }
            bottomContent={
              <div
                className="flex w-full items-center justify-between gap-5 text-[11px]"
                dir="rtl"
              >
                <div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
                  <span className="font-bold text-[#434654]">
                    تاريخ الفحص:
                  </span>
                  <DateInput
                    className="h-6 w-32 rounded-none border-0 border-b border-[#c3c6d6] bg-transparent px-1 text-center text-[11px] font-bold"
                    value={formData.examinationDate}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        examinationDate: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
                  <span className="font-bold text-[#434654]">الطبيب:</span>
                  <input
                    size={(signatures.doctor || "").length || 10}
                    className="h-6 min-w-0 max-w-[35mm] rounded-none border-0 border-b border-[#c3c6d6] bg-transparent px-1 text-center text-[11px] font-bold focus:outline-none"
                    dir="rtl"
                    value={signatures.doctor}
                    onChange={(e) =>
                      setSignatures((p) => ({ ...p, doctor: e.target.value }))
                    }
                  />
                </div>
                {currentSheetType !== "consultant" ? (
                  <div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
                    <span className="font-bold text-[#434654]">
                      تاريخ العملية:
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      aria-label="تاريخ العملية"
                      placeholder="       /       /       "
                      className="h-7 w-40 shrink-0 rounded-none border-0 border-b border-[#c3c6d6] bg-transparent px-1 text-center text-[11px] font-normal tabular-nums outline-none placeholder:text-[#191c1e] placeholder:opacity-100"
                      value={operationDateRight}
                      onChange={(event) =>
                        setOperationDateRight(event.target.value)
                      }
                    />
                  </div>
                ) : null}
              </div>
            }
          />
        ) : null}

        {/* Patient Info */}
        <section
          className="print-lasik-patient-grid p-4 bg-[#f3f4f6] rounded-xl border border-[#c3c6d6] flex flex-col gap-2 text-sm"
          dir="rtl"
        >
          <div className="patient-info-grid-3x3 grid grid-cols-3 gap-x-4 gap-y-2 text-xs">
            <label className="inline-flex items-center gap-1 whitespace-nowrap font-bold min-w-0 shrink">
              <span className="text-[#434654] shrink-0">الاسم:</span>
              <input
                size={(formData.patientName || "").length || 12}
                className="patient-detail-emphasis min-w-0 text-[#003d9b] bg-transparent border-0 border-b border-[#c3c6d6] focus:outline-none text-right text-lg font-extrabold"
                dir="rtl"
                value={formData.patientName}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, patientName: e.target.value }))
                }
              />
            </label>
            <span className="inline-flex items-center gap-1 whitespace-nowrap font-bold min-w-0 shrink">
              <span className="text-[#434654] shrink-0">تاريخ الميلاد:</span>
              <span className="px-1 border-b border-[#c3c6d6] text-right min-w-0 truncate">
                {displaySheetDate(formData.dateOfBirth)}
              </span>
            </span>
            <label className="inline-flex items-center gap-1 whitespace-nowrap font-bold min-w-0 shrink">
              <span className="text-[#434654] shrink-0">السن:</span>
              <input
                size={(formData.age || "").length || 3}
                className="patient-detail-emphasis min-w-0 bg-transparent border-0 border-b border-[#c3c6d6] focus:outline-none text-right text-sm font-bold"
                dir="rtl"
                value={formData.age}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, age: e.target.value }))
                }
              />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-xs">
            <label className="inline-flex items-center gap-1 whitespace-nowrap min-w-0 shrink">
              <span className="text-[#434654] shrink-0">العنوان:</span>
              <input
                size={(formData.address || "").length || 8}
                className="min-w-0 font-normal text-xs bg-transparent border-0 border-b border-[#c3c6d6] focus:outline-none text-right"
                dir="rtl"
                value={formData.address}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, address: e.target.value }))
                }
              />
            </label>
            <label className="inline-flex items-center gap-1 whitespace-nowrap min-w-0 shrink">
              <span className="text-[#434654] shrink-0">التليفون:</span>
              <input
                size={(formData.phone || "").length || 8}
                className="min-w-0 font-normal text-xs bg-transparent border-0 border-b border-[#c3c6d6] focus:outline-none text-right"
                dir="rtl"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, phone: e.target.value }))
                }
              />
            </label>
            <label className="inline-flex items-center gap-1 whitespace-nowrap min-w-0 shrink">
              <span className="text-[#434654] shrink-0">موبايل:</span>
              <input
                size={(formData.alternatePhone || "").length || 8}
                className="min-w-0 font-normal text-xs bg-transparent border-0 border-b border-[#c3c6d6] focus:outline-none text-right"
                dir="rtl"
                value={formData.alternatePhone}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    alternatePhone: e.target.value,
                  }))
                }
              />
            </label>
          </div>
          <div className="grid grid-cols-2 justify-items-center gap-x-4 gap-y-2 text-xs">
            <label className="inline-flex items-center gap-1 whitespace-nowrap min-w-0 shrink">
              <span className="text-[#434654] shrink-0">الكود:</span>
              <input
                size={(formData.patientCode || "").length || 6}
                className="min-w-0 font-normal text-xs text-[#526069] bg-transparent border-0 border-b border-[#c3c6d6] focus:outline-none text-right"
                dir="rtl"
                value={formData.patientCode}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, patientCode: e.target.value }))
                }
              />
            </label>
            <label className="inline-flex items-center gap-1 whitespace-nowrap min-w-0 shrink">
              <span className="text-[#434654] shrink-0">المهنة:</span>
              <input
                size={(formData.job || "").length || 8}
                className="patient-detail-emphasis min-w-0 bg-transparent border-0 border-b border-[#c3c6d6] focus:outline-none text-right text-sm font-bold"
                dir="rtl"
                value={formData.job}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, job: e.target.value }))
                }
              />
            </label>
          </div>
        </section>

        <section
          className="print-lasik-history-visual-row flex flex-wrap items-stretch gap-3"
          dir="rtl"
        >
          {currentSheetType !== "external" ? (
            <div className="print-lasik-questions flex h-full w-full sm:w-[calc(75%-0.375rem)] min-w-0 flex-col">
              <table className="w-full h-full border-collapse border border-[#c3c6d6] rounded-lg overflow-hidden text-sm">
                <thead className="bg-[#e7e8ea]">
                  <tr>
                    <th className="w-12 p-2 border border-[#c3c6d6]">لا</th>
                    <th className="w-12 p-2 border border-[#c3c6d6]">نعم</th>
                    <th className="p-2 border border-[#c3c6d6] text-right">
                      التاريخ المرضي
                    </th>
                    <th className="w-12 p-2 border border-[#c3c6d6]">لا</th>
                    <th className="w-12 p-2 border border-[#c3c6d6]">نعم</th>
                    <th className="p-2 border border-[#c3c6d6] text-right">
                      التاريخ المرضي
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["قرنية مخروطية بالعائلة؟", "الغدة الدرقية؟"],
                    ["ماء زرقاء؟", "أمراض مناعة؟"],
                    ["ضغط؟", "سكر؟"],
                  ].map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((q, colIndex) =>
                        q ? (
                          <React.Fragment key={`${rowIndex}-${colIndex}`}>
                            <td className="text-center border border-[#c3c6d6]">
                              <input
                                type="checkbox"
                                className="w-4 h-4 rounded text-[#003d9b]"
                                checked={medicalHistory[q] === "no"}
                                onChange={(e) => {
                                  const val: "no" | "yes" | "" = e.target
                                    .checked
                                    ? "no"
                                    : "";
                                  setMedicalHistory((p) => {
                                    const next: Record<
                                      string,
                                      "no" | "yes" | ""
                                    > = { ...p, [q]: val };
                                    if (initialPatientId) {
                                      upsertMedicalHistoryMutation.mutate({
                                        patientId: initialPatientId,
                                        diabetes: next["سكر؟"] === "yes",
                                        hypertension: next["ضغط؟"] === "yes",
                                        thyroid:
                                          next["الغدة الدرقية؟"] === "yes",
                                        autoimmune:
                                          next["أمراض مناعة؟"] === "yes",
                                        glaucoma: next["ماء زرقاء؟"] === "yes",
                                        familyKeratoconus:
                                          next["قرنية مخروطية بالعائلة؟"] ===
                                          "yes",
                                      });
                                    }
                                    return next;
                                  });
                                }}
                              />
                            </td>
                            <td className="text-center border border-[#c3c6d6]">
                              <input
                                type="checkbox"
                                className="w-4 h-4 rounded text-[#003d9b]"
                                checked={medicalHistory[q] === "yes"}
                                onChange={(e) => {
                                  const val: "no" | "yes" | "" = e.target
                                    .checked
                                    ? "yes"
                                    : "";
                                  setMedicalHistory((p) => {
                                    const next: Record<
                                      string,
                                      "no" | "yes" | ""
                                    > = { ...p, [q]: val };
                                    if (initialPatientId) {
                                      upsertMedicalHistoryMutation.mutate({
                                        patientId: initialPatientId,
                                        diabetes: next["سكر؟"] === "yes",
                                        hypertension: next["ضغط؟"] === "yes",
                                        thyroid:
                                          next["الغدة الدرقية؟"] === "yes",
                                        autoimmune:
                                          next["أمراض مناعة؟"] === "yes",
                                        glaucoma: next["ماء زرقاء؟"] === "yes",
                                        familyKeratoconus:
                                          next["قرنية مخروطية بالعائلة؟"] ===
                                          "yes",
                                      });
                                    }
                                    return next;
                                  });
                                }}
                              />
                            </td>
                            <td className="p-1.5 border border-[#c3c6d6] text-right">
                              <div className="flex items-center gap-2">
                                <span>{q}</span>
                                {q === "سكر؟" && medicalHistory[q] === "yes" ? (
                                  <select
                                    className="text-xs border border-[#c3c6d6] rounded px-1.5 py-1 bg-white"
                                    value={diabetesDuration}
                                    onChange={(e) =>
                                      setDiabetesDuration(e.target.value)
                                    }
                                  >
                                    <option value="">مدة الإصابة</option>
                                    <option value="less than 5 years">
                                      أقل من 5 سنوات
                                    </option>
                                    <option value="5-10 years">
                                      من 5 إلى 10 سنوات
                                    </option>
                                    <option value="more than 10 years">
                                      أكثر من 10 سنوات
                                    </option>
                                  </select>
                                ) : null}
                              </div>
                            </td>
                          </React.Fragment>
                        ) : (
                          <React.Fragment key={`${rowIndex}-${colIndex}`}>
                            <td className="border border-[#c3c6d6] bg-[#f8f9fb]" />
                            <td className="border border-[#c3c6d6] bg-[#f8f9fb]" />
                            <td className="border border-[#c3c6d6] bg-[#f8f9fb]" />
                          </React.Fragment>
                        ),
                      )}
                    </tr>
                  ))}
                  <tr>
                    <td
                      className="p-1.5 border border-[#c3c6d6] text-right bg-[#f3f4f6]"
                      colSpan={2}
                    >
                      أخرى؟
                    </td>
                    <td className="p-1.5 border border-[#c3c6d6]" colSpan={4}>
                      <input
                        className="w-full h-6 border-0 border-b border-[#c3c6d6] bg-transparent px-1 outline-none"
                        value={medicalHistoryOther}
                        onChange={(e) => setMedicalHistoryOther(e.target.value)}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : null}

          {/* Visual Acuity */}
          {currentSheetType === "external" ? (
            <div
              className="print-external-vision-grid grid w-full grid-cols-3 gap-2"
              dir="ltr"
            >
              {(
                [
                  { key: "iop", label: "IOP", unit: "mmHg" },
                  { key: "ucva", label: "UCVA", unit: "Eye" },
                  { key: "bcva", label: "BCVA", unit: "Eye" },
                ] as const
              ).map((metric) => (
                <table
                  key={metric.key}
                  className="w-full text-center border-collapse"
                >
                  <thead className="bg-[#e7e8ea] text-xs font-bold uppercase">
                    <tr>
                      <th className={ctd}>{metric.label}</th>
                      <th className={`${ctd} text-[#003d9b]`}>OD</th>
                      <th className={`${ctd} text-[#526069]`}>OS</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className={`${ctd} bg-[#f3f4f6] text-[#434654]`}>
                        {metric.unit}
                      </td>
                      <td className={ctd}>
                        <input
                          className={`${inp} ${metric.key === "iop" && !Number.isNaN(odIopNum) && odIopNum > 21 ? "text-red-600" : ""}`}
                          value={examData.autorefraction.od[metric.key]}
                          onChange={mkAutoPatch("od", metric.key)}
                        />
                      </td>
                      <td className={ctd}>
                        <input
                          className={`${inp} ${metric.key === "iop" && !Number.isNaN(osIopNum) && osIopNum > 21 ? "text-red-600" : ""}`}
                          value={examData.autorefraction.os[metric.key]}
                          onChange={mkAutoPatch("os", metric.key)}
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              ))}
            </div>
          ) : (
            <div
              className="print-lasik-visual-grid flex h-full w-full sm:w-[calc(25%-0.375rem)] shrink-0 flex-col gap-2"
              dir="ltr"
            >
              <table className="w-full flex-1 text-center border-collapse">
                <thead className="bg-[#e7e8ea] text-xs font-bold uppercase">
                  <tr>
                    <th className={ctd}>IOP</th>
                    <th className={`${ctd} text-[#003d9b]`}>OD</th>
                    <th className={`${ctd} text-[#526069]`}>OS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={`${ctd} bg-[#f3f4f6] text-[#434654]`}>
                      mmHg
                    </td>
                    <td className={ctd}>
                      <input
                        className={`${inp} ${!Number.isNaN(odIopNum) && odIopNum > 21 ? "text-red-600" : ""}`}
                        value={examData.autorefraction.od.iop}
                        onChange={mkAutoPatch("od", "iop")}
                      />
                    </td>
                    <td className={ctd}>
                      <input
                        className={`${inp} ${!Number.isNaN(osIopNum) && osIopNum > 21 ? "text-red-600" : ""}`}
                        value={examData.autorefraction.os.iop}
                        onChange={mkAutoPatch("os", "iop")}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
              <table className="w-full flex-1 text-center border-collapse">
                <thead className="bg-[#e7e8ea] text-xs font-bold uppercase">
                  <tr>
                    <th className={ctd}>Eye</th>
                    <th className={ctd}>UCVA</th>
                    <th className={ctd}>BCVA</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={`${ctd} text-[#003d9b] bg-[#003d9b]/5`}>
                      OD
                    </td>
                    <td className={ctd}>
                      <input
                        className={inp}
                        value={examData.autorefraction.od.ucva}
                        onChange={mkAutoPatch("od", "ucva")}
                      />
                    </td>
                    <td className={ctd}>
                      <input
                        className={inp}
                        value={examData.autorefraction.od.bcva}
                        onChange={mkAutoPatch("od", "bcva")}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className={`${ctd} text-[#526069] bg-[#f3f4f6]`}>OS</td>
                    <td className={ctd}>
                      <input
                        className={inp}
                        value={examData.autorefraction.os.ucva}
                        onChange={mkAutoPatch("os", "ucva")}
                      />
                    </td>
                    <td className={ctd}>
                      <input
                        className={inp}
                        value={examData.autorefraction.os.bcva}
                        onChange={mkAutoPatch("os", "bcva")}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Detailed Refraction */}
        <section
          className={
            embeddedMode === "examination"
              ? "mx-auto w-full max-w-4xl"
              : undefined
          }
          data-purpose="clinical-refraction"
        >
          {embeddedMode === "examination" ? (
            <div className="mb-3 flex flex-wrap items-center gap-2" dir="ltr">
              <span className="min-w-[42px] text-xs font-medium">BCVA</span>
              <RefractionValueSelect
                value={examData.autorefraction.od.bcva}
                onChange={(value) =>
                  setExamData((previous) => ({
                    ...previous,
                    autorefraction: {
                      ...previous.autorefraction,
                      od: { ...previous.autorefraction.od, bcva: value },
                    },
                  }))
                }
                options={UCVA_BCVA_OPTIONS}
                placeholder="OD"
                triggerClassName="h-8 w-20 text-center text-xs font-mono"
              />
              <span className="text-muted-foreground">/</span>
              <RefractionValueSelect
                value={examData.autorefraction.os.bcva}
                onChange={(value) =>
                  setExamData((previous) => ({
                    ...previous,
                    autorefraction: {
                      ...previous.autorefraction,
                      os: { ...previous.autorefraction.os, bcva: value },
                    },
                  }))
                }
                options={UCVA_BCVA_OPTIONS}
                placeholder="OS"
                triggerClassName="h-8 w-20 text-center text-xs font-mono"
              />
              <span className="mx-2 h-6 border-l" />
              <span className="min-w-[28px] text-xs font-medium">PD</span>
              <input
                className="h-8 w-20 rounded border border-input bg-background px-2 text-center text-xs font-mono outline-none focus:border-[#003d9b]"
                inputMode="decimal"
                value={clinicalRefraction.od.pd}
                onChange={(event) => {
                  const pd = event.target.value;
                  setClinicalRefraction((previous) => ({
                    od: { ...previous.od, pd },
                    os: { ...previous.os, pd },
                  }));
                }}
              />
            </div>
          ) : null}
          {embeddedMode === "examination" ? (
            <div className="mb-3 grid grid-cols-1 gap-2 sm:hidden" dir="ltr">
              {(["od", "os"] as const).map((eye) => (
                <div
                  key={eye}
                  className="overflow-hidden rounded-lg border border-slate-200 bg-white"
                >
                  <div
                    className={`px-3 py-2 text-sm font-bold ${eye === "od"
                      ? "bg-blue-50 text-blue-900"
                      : "bg-slate-100 text-slate-700"
                      }`}
                  >
                    {eye === "od" ? "OD (Right)" : "OS (Left)"}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 p-2">
                    <label className="min-w-0 text-center text-xs font-semibold text-slate-500">
                      S
                      <RefractionValueSelect
                        value={clinicalRefraction[eye].s}
                        onChange={(value) =>
                          setClinicalRefraction((previous) => ({
                            ...previous,
                            [eye]: { ...previous[eye], s: value },
                          }))
                        }
                        options={SPHERE_OPTIONS}
                        triggerClassName="mt-1 h-9 w-full border-slate-200 text-center font-mono text-sm"
                      />
                    </label>
                    <label className="min-w-0 text-center text-xs font-semibold text-slate-500">
                      C
                      <RefractionValueSelect
                        value={clinicalRefraction[eye].c}
                        onChange={(value) =>
                          setClinicalRefraction((previous) => ({
                            ...previous,
                            [eye]: { ...previous[eye], c: value },
                          }))
                        }
                        options={CYLINDER_OPTIONS}
                        triggerClassName="mt-1 h-9 w-full border-slate-200 text-center font-mono text-sm"
                      />
                    </label>
                    <label className="col-span-2 min-w-0 text-center text-xs font-semibold text-slate-500">
                      Axis
                      <input
                        className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-1 text-center font-mono text-sm outline-none focus:border-blue-600"
                        inputMode="numeric"
                        value={clinicalRefraction[eye].axis}
                        onChange={mkClinicalPatch(eye, "axis")}
                      />
                    </label>
                  </div>
                </div>
              ))}
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm font-semibold text-blue-900">
                <span className="shrink-0">Reading / Add +</span>
                <input
                  className="h-9 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 text-center font-mono outline-none focus:border-blue-600"
                  value={readingValue}
                  onChange={(event) => setReadingValue(event.target.value)}
                />
              </label>
            </div>
          ) : null}
          <table
            className={`clinical-refraction-desktop-table w-full border-collapse text-center ${embeddedMode === "examination" ? "hidden sm:table" : ""
              }`}
          >
            <thead className="bg-[#e7e8ea] text-xs uppercase font-bold">
              <tr>
                <th className={`${ctd} w-48`}>Refraction</th>
                <th className={`${ctd} text-[#003d9b]`} colSpan={3}>
                  OD (Right)
                </th>
                <th className={`${ctd} text-[#526069]`} colSpan={3}>
                  OS (Left)
                </th>
              </tr>
              <tr>
                <th className={ctd}>Distance</th>
                <th className={ctd}>S</th>
                <th className={ctd}>C</th>
                <th className={ctd}>A</th>
                <th className={ctd}>S</th>
                <th className={ctd}>C</th>
                <th className={ctd}>A</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              <tr>
                <td className={`${ctd} bg-[#f3f4f6]`}>&nbsp;</td>
                <td className={ctd}>
                  <RefractionValueSelect
                    value={clinicalRefraction.od.s}
                    onChange={(value) =>
                      setClinicalRefraction((previous) => ({
                        ...previous,
                        od: { ...previous.od, s: value },
                      }))
                    }
                    options={SPHERE_OPTIONS}
                    triggerClassName="h-8 border-0 text-center font-mono"
                  />
                </td>
                <td className={ctd}>
                  <RefractionValueSelect
                    value={clinicalRefraction.od.c}
                    onChange={(value) =>
                      setClinicalRefraction((previous) => ({
                        ...previous,
                        od: { ...previous.od, c: value },
                      }))
                    }
                    options={CYLINDER_OPTIONS}
                    triggerClassName="h-8 border-0 text-center font-mono"
                  />
                </td>
                <td className={ctd}>
                  <input
                    className={inp}
                    value={clinicalRefraction.od.axis}
                    onChange={mkClinicalPatch("od", "axis")}
                  />
                </td>
                <td className={ctd}>
                  <RefractionValueSelect
                    value={clinicalRefraction.os.s}
                    onChange={(value) =>
                      setClinicalRefraction((previous) => ({
                        ...previous,
                        os: { ...previous.os, s: value },
                      }))
                    }
                    options={SPHERE_OPTIONS}
                    triggerClassName="h-8 border-0 text-center font-mono"
                  />
                </td>
                <td className={ctd}>
                  <RefractionValueSelect
                    value={clinicalRefraction.os.c}
                    onChange={(value) =>
                      setClinicalRefraction((previous) => ({
                        ...previous,
                        os: { ...previous.os, c: value },
                      }))
                    }
                    options={CYLINDER_OPTIONS}
                    triggerClassName="h-8 border-0 text-center font-mono"
                  />
                </td>
                <td className={ctd}>
                  <input
                    className={inp}
                    value={clinicalRefraction.os.axis}
                    onChange={mkClinicalPatch("os", "axis")}
                  />
                </td>
              </tr>
              <tr>
                <td className={`${ctd} bg-[#f3f4f6] font-bold text-[#003d9b]`}>
                  Reading
                </td>
                <td className={ctd} colSpan={6}>
                  <div className="flex items-center justify-center gap-2">
                    <span className="whitespace-nowrap font-bold">Add +</span>
                    <input
                      className={`${inp} max-w-24`}
                      value={readingValue}
                      onChange={(e) => setReadingValue(e.target.value)}
                    />
                  </div>
                </td>
              </tr>
              {currentSheetType !== "consultant" ? (
                <tr>
                  <td className={`${ctd} text-left bg-[#f3f4f6]`}>Fundus</td>
                  <td className={ctd} colSpan={3}>
                    <input className={inp} />
                  </td>
                  <td className={ctd} colSpan={3}>
                    <input className={inp} />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>

        {currentSheetType === "consultant" ? (
          <section
            className="print-consultant-diagrams flex flex-wrap items-stretch gap-2 border border-[#c3c6d6] rounded-xl p-4 bg-white flex-1 min-h-[90mm]"
            data-purpose="clinical-diagrams"
          >
            <div className="consultant-eyes-block relative flex w-full sm:w-1/4 flex-col items-center justify-center gap-4 overflow-hidden rounded-lg">
              <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-1">
                <div className="fundus-drawing-surface aspect-square w-full max-w-[150px] rounded-full border-4 border-[#003d9b]/30 flex items-center justify-center relative bg-white">
                  <div className="absolute inset-0 flex items-center justify-center opacity-10">
                    <div className="w-full border-t border-slate-900" />
                    <div className="h-full border-l border-slate-900 absolute top-0" />
                  </div>
                  <div className="absolute h-9 w-9 translate-x-3 -translate-y-1 rounded-full bg-[#f4c98a] border border-[#c98f4a]/60 flex items-center justify-center">
                    <div className="h-4 w-4 rounded-full bg-white border border-[#c98f4a]/50" />
                  </div>
                </div>
                <span className="text-[#003d9b]/70 text-xs font-bold select-none">
                  OD
                </span>
              </div>
              <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-1">
                <div className="fundus-drawing-surface aspect-square w-full max-w-[150px] rounded-full border-4 border-slate-300 flex items-center justify-center relative bg-white">
                  <div className="absolute inset-0 flex items-center justify-center opacity-10">
                    <div className="w-full border-t border-slate-900" />
                    <div className="h-full border-l border-slate-900 absolute top-0" />
                  </div>
                  <div className="absolute h-9 w-9 -translate-x-3 -translate-y-1 rounded-full bg-[#f4c98a] border border-[#c98f4a]/60 flex items-center justify-center">
                    <div className="h-4 w-4 rounded-full bg-white border border-[#c98f4a]/50" />
                  </div>
                </div>
                <span className="text-slate-500 text-xs font-bold select-none">
                  OS
                </span>
              </div>
              <FundusDrawingCanvas
                value={consultantDrawing}
                onChange={setConsultantDrawing}
              />
            </div>
            <div className="consultant-right-column flex w-full sm:w-[calc(75%-0.5rem)] flex-col gap-2">
              <div
                className="consultant-complains-block flex-[1] rounded-lg border border-[#c3c6d6] bg-[#f8f9fb] px-3 pb-3 pt-0 text-left text-[12px] text-[#1f2937]"
                dir="ltr"
              >
                <p className="mb-2 text-[13px] font-bold text-[#003d9b]">
                  Complains:
                </p>
                <textarea
                  className="w-full min-h-[48px] resize-none rounded-md border border-[#c3c6d6] bg-white px-2 py-1 text-[12px] outline-none print:placeholder-transparent"
                  value={consultantExam.complains}
                  onChange={(e) =>
                    setConsultantExamField("complains", e.target.value)
                  }
                  placeholder="اكتب الشكوى يدويًا أو ابحث من الأعراض بالأسفل..."
                />
                <div className="relative mt-2 print:hidden">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    className="h-8 w-full rounded-md border border-[#c3c6d6] bg-white pl-7 pr-2 text-[12px] outline-none"
                    placeholder="ابحث عن الأعراض..."
                    value={complainsSearchText}
                    onChange={(e) => setComplainsSearchText(e.target.value)}
                    onFocus={() => setComplainsSearchOpen(true)}
                    onBlur={() =>
                      window.setTimeout(
                        () => setComplainsSearchOpen(false),
                        150,
                      )
                    }
                  />
                  {complainsSearchOpen && complainsSearchText ? (
                    <div className="absolute z-10 mt-1 max-h-[160px] w-full overflow-y-auto rounded-md border border-[#c3c6d6] bg-white p-1 shadow-md">
                      {symptomsQuery.isLoading ? (
                        <p className="px-2 py-1 text-[11px] text-muted-foreground">
                          جاري التحميل...
                        </p>
                      ) : (symptomsQuery.data ?? []).filter((s: any) =>
                        String(s.name ?? "")
                          .toLowerCase()
                          .includes(complainsSearchText.toLowerCase()),
                      ).length === 0 ? (
                        <p className="px-2 py-1 text-[11px] text-muted-foreground">
                          لا توجد نتائج
                        </p>
                      ) : (
                        (symptomsQuery.data ?? [])
                          .filter((s: any) =>
                            String(s.name ?? "")
                              .toLowerCase()
                              .includes(complainsSearchText.toLowerCase()),
                          )
                          .map((s: any) => (
                            <button
                              type="button"
                              key={s.id}
                              className="block w-full rounded px-2 py-1 text-left text-[12px] hover:bg-muted/60"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setConsultantExamField(
                                  "complains",
                                  consultantExam.complains
                                    ? `${consultantExam.complains}, ${s.name}`
                                    : s.name,
                                );
                                setComplainsSearchText("");
                                setComplainsSearchOpen(false);
                              }}
                            >
                              {s.name}
                            </button>
                          ))
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
              <div
                className="consultant-examination-block flex-[3] rounded-lg border border-[#c3c6d6] bg-[#f8f9fb] p-3 text-left text-[12px] text-[#1f2937]"
                dir="ltr"
              >
                <p className="mb-2 text-[13px] font-bold text-[#003d9b]">
                  Examination:
                </p>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-semibold">
                      1. External Apperance:
                    </span>
                    <label className="inline-flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-[#003d9b]"
                        checked={consultantExam.externalPtosis}
                        onChange={(e) =>
                          setConsultantExamField(
                            "externalPtosis",
                            e.target.checked,
                          )
                        }
                      />
                      <span>Ptosis</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-[#003d9b]"
                        checked={consultantExam.externalSquint}
                        onChange={(e) =>
                          setConsultantExamField(
                            "externalSquint",
                            e.target.checked,
                          )
                        }
                      />
                      <span>Squint</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-[#003d9b]"
                        checked={consultantExam.externalOthers}
                        onChange={(e) =>
                          setConsultantExamField(
                            "externalOthers",
                            e.target.checked,
                          )
                        }
                      />
                      <span>Others</span>
                    </label>
                    <input
                      className="h-6 min-w-[170px] flex-1 border-0 border-b border-[#c3c6d6] bg-transparent px-1 outline-none"
                      value={consultantExam.externalOthersNote}
                      onChange={(e) =>
                        setConsultantExamField(
                          "externalOthersNote",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-semibold">2. Muscle action:</span>
                    <label className="inline-flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-[#003d9b]"
                        checked={consultantExam.muscleNormal}
                        onChange={(e) =>
                          setConsultantExamField(
                            "muscleNormal",
                            e.target.checked,
                          )
                        }
                      />
                      <span>Normal</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-[#003d9b]"
                        checked={consultantExam.muscleAbnormal}
                        onChange={(e) =>
                          setConsultantExamField(
                            "muscleAbnormal",
                            e.target.checked,
                          )
                        }
                      />
                      <span>Abnormal</span>
                    </label>
                    <input
                      className="h-6 min-w-[190px] flex-1 border-0 border-b border-[#c3c6d6] bg-transparent px-1 outline-none"
                      value={consultantExam.muscleAbnormalNote}
                      onChange={(e) =>
                        setConsultantExamField(
                          "muscleAbnormalNote",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      3. Other abnormalities:
                    </span>
                    <input
                      className="h-6 flex-1 border-0 border-b border-[#c3c6d6] bg-transparent px-1 outline-none"
                      value={consultantExam.otherAbnormalities}
                      onChange={(e) =>
                        setConsultantExamField(
                          "otherAbnormalities",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[#d9dce8] pt-2">
                    <span className="font-bold">Fundus:</span>
                    <label className="inline-flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-[#003d9b]"
                        checked={consultantExam.fundusNormal}
                        onChange={(e) =>
                          setConsultantExamField(
                            "fundusNormal",
                            e.target.checked,
                          )
                        }
                      />
                      <span>Normal</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-[#003d9b]"
                        checked={consultantExam.fundusAbnormal}
                        onChange={(e) =>
                          setConsultantExamField(
                            "fundusAbnormal",
                            e.target.checked,
                          )
                        }
                      />
                      <span>Abnormal</span>
                    </label>
                    <input
                      className="h-6 min-w-[220px] flex-1 border-0 border-b border-[#c3c6d6] bg-transparent px-1 outline-none"
                      value={consultantExam.fundusAbnormalNote}
                      onChange={(e) =>
                        setConsultantExamField(
                          "fundusAbnormalNote",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="print-lasik-pentacam-right grid grid-cols-1 lg:grid-cols-[1fr_1.3fr_1.3fr] gap-4">
            <div className="hidden lg:block print:hidden" />{" "}
            {/* Empty space on the left (screen only — print uses the full width for the two eye cards) */}
            {(["od", "os"] as const).map((eye) => {
              const isOD = eye === "od";
              const thin = isOD ? odThinnestNum : osThinnestNum;
              return (
                <div
                  key={eye}
                  className={`${isOD ? "od-bg border-[#003d9b]/20" : "os-bg border-[#c3c6d6]"} print-lasik-eye-card p-2 rounded-xl border`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span
                      className={`text-[11px] font-bold uppercase px-2 py-1 bg-white rounded shadow-sm ${isOD ? "text-[#003d9b]" : "text-[#526069]"}`}
                    >
                      {isOD ? "Right Eye (RT)" : "Left Eye (LT)"}
                    </span>
                  </div>
                  <table className="w-full border-collapse text-sm bg-white rounded-lg overflow-hidden">
                    <tbody>
                      <tr>
                        <td
                          className={`${ctd} bg-[#f3f4f6] w-1/3 text-right text-[11px]`}
                        >
                          K1 (Flat)
                        </td>
                        <td className={ctd}>
                          <input
                            className={inp}
                            value={examData.pentacam[eye].k1}
                            onChange={mkPentaPatch(eye, "k1")}
                          />
                        </td>
                        <td
                          className={`${ctd} bg-[#f3f4f6] text-center w-8 text-[11px]`}
                          rowSpan={2}
                        >
                          AX
                        </td>
                        <td className={ctd} rowSpan={2}>
                          <input
                            className={inp}
                            value={examData.pentacam[eye].ax1}
                            onChange={mkPentaPatch(eye, "ax1")}
                          />
                        </td>
                      </tr>
                      <tr>
                        <td
                          className={`${ctd} bg-[#f3f4f6] text-right text-[11px]`}
                        >
                          K2 (Steep)
                        </td>
                        <td className={ctd}>
                          <input
                            className={inp}
                            value={examData.pentacam[eye].k2}
                            onChange={mkPentaPatch(eye, "k2")}
                          />
                        </td>
                      </tr>
                      <tr>
                        <td
                          className={`${ctd} bg-[#f3f4f6] text-right text-[11px]`}
                        >
                          Thinnest
                        </td>
                        <td className={ctd} colSpan={3}>
                          <input
                            className={`${inp} ${thin < 480 ? "text-red-600" : ""}`}
                            value={examData.pentacam[eye].thinnest}
                            onChange={mkPentaPatch(eye, "thinnest")}
                          />
                        </td>
                      </tr>
                      <tr>
                        <td
                          className={`${ctd} bg-[#f3f4f6] text-right text-[11px]`}
                        >
                          Apex
                        </td>
                        <td className={ctd} colSpan={3}>
                          <input
                            className={inp}
                            value={examData.pentacam[eye].apex}
                            onChange={mkPentaPatch(eye, "apex")}
                          />
                        </td>
                      </tr>
                      <tr>
                        <td
                          className={`${ctd} bg-[#f3f4f6] text-[#003d9b] text-right text-[11px]`}
                        >
                          Residual
                        </td>
                        <td className={`${ctd} bg-[#003d9b]/5`} colSpan={3}>
                          <input
                            className={`${inp} text-[#003d9b]`}
                            value={examData.pentacam[eye].residual}
                            onChange={mkPentaPatch(eye, "residual")}
                          />
                        </td>
                      </tr>
                      <tr>
                        <td
                          className={`${ctd} bg-[#f3f4f6] text-right text-[11px]`}
                        >
                          Planned TTT
                        </td>
                        <td className={ctd} colSpan={3}>
                          <input
                            className={inp}
                            value={examData.pentacam[eye].ttt}
                            onChange={mkPentaPatch(eye, "ttt")}
                          />
                        </td>
                      </tr>
                      <tr>
                        <td
                          className={`${ctd} bg-[#f3f4f6] text-[#ba1a1a] text-right text-[11px]`}
                        >
                          Ablation
                        </td>
                        <td className={ctd} colSpan={3}>
                          <input
                            className={`${inp} text-[#ba1a1a]`}
                            value={examData.pentacam[eye].ablation}
                            onChange={mkPentaPatch(eye, "ablation")}
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })}
          </section>
        )}

        {currentSheetType !== "consultant" ? (
          <>
            {/* Treatment plan */}
            <section className="print-lasik-treatment-plan">
              <table className="w-full text-center border-collapse text-sm">
                <thead className="bg-[#e7e8ea] text-xs uppercase font-bold text-[#434654]">
                  <tr>
                    <th className={ctd}>Target Refraction</th>
                    <th className={ctd}>OD/OS</th>
                    <th className={ctd}>Before Flap</th>
                    <th className={ctd}>After Flap</th>
                    <th className={ctd}>After Treatment</th>
                    <th className={ctd}>Flap Reposition</th>
                    <th className={ctd}>Ciclo 3x</th>
                    <th className={ctd}>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {(["OD", "OS"] as const).map((label) => (
                    <tr key={label}>
                      <td className={ctd}>
                        <input className={inp} />
                      </td>
                      <td
                        className={`${ctd} ${label === "OD" ? "text-[#003d9b] bg-[#003d9b]/5" : "text-[#526069] bg-[#f3f4f6]"}`}
                      >
                        {label}
                      </td>
                      <td className={ctd}>
                        <input className={inp} />
                      </td>
                      <td className={ctd}>
                        <input className={inp} />
                      </td>
                      <td className={ctd}>
                        <input className={inp} />
                      </td>
                      <td className={ctd}>
                        <input className={inp} />
                      </td>
                      <td className={ctd}>
                        <input className={inp} />
                      </td>
                      <td className={ctd}>
                        <input className={inp} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        ) : null}

        {/* Notes + signatures */}
        <footer className="pt-6 border-t-2 border-[#003d9b] space-y-6 print-lasik-compact-footer">
          <div className="print-lasik-footer-grid grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-4">
              <div>
                <label className="font-bold text-[#003d9b] text-sm">
                  Diagnosis / التشخيص:
                </label>
                <textarea
                  className="mt-1 min-h-24 w-full resize-none border-0 border-b border-[#c3c6d6] bg-transparent p-1 outline-none"
                  value={diagnosisText}
                  onChange={(event) => setDiagnosisText(event.target.value)}
                />
              </div>
              <div>
                <label className="font-bold text-[#003d9b] text-sm">
                  Final Decision / القرار النهائي:
                </label>
                <textarea
                  className="mt-1 min-h-16 w-full resize-none border-0 border-b border-[#c3c6d6] bg-transparent p-1 outline-none"
                  value={finalDecisionText}
                  onChange={(event) => setFinalDecisionText(event.target.value)}
                />
              </div>
            </div>
            <div className="lg:col-span-4 border-2 border-[#003d9b] rounded-xl p-4 bg-[#003d9b]/5">
              <div className="text-center font-bold text-[#003d9b] uppercase text-xs border-b border-[#003d9b]/20 pb-2 mb-3">
                Office Notes
              </div>
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
                <span
                  className={`text-[11px] font-bold uppercase ${i === 1 ? "text-[#003d9b]" : "text-[#434654]"}`}
                >
                  {label}
                </span>
                <div
                  className={`border-b-2 h-9 flex items-end justify-center ${i === 1 ? "border-[#003d9b]" : "border-[#191c1e]"}`}
                >
                  <span
                    className={`text-xs italic ${i === 1 ? "text-[#003d9b] font-bold" : "text-[#737685]"}`}
                  >
                    {val || ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </footer>
      </div>
    );
  };

  const renderAttachedFollowupPage = () => (
    <FollowupTablesBody
      titleEn={
        currentSheetType === "consultant"
          ? "Consultant Follow-up"
          : "LASIK Follow-up"
      }
      titleAr={
        currentSheetType === "consultant" ? "متابعة الاستشاري" : "متابعة الليزك"
      }
      patientName={formData.patientName}
      patientDOB={displaySheetDate(formData.dateOfBirth)}
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
      printVariant="attached"
    />
  );

  return (
    <div
      className={
        embedded
          ? `lasik-print-root ${printMode.printView ? "print-view-active" : ""} bg-white`
          : `lasik-print-root ${printMode.printView ? "print-view-active" : ""} min-h-screen print:min-h-0 bg-[#dde1e7]`
      }
      dir="ltr"
    >
      <style>{`
        ${customSheetCss}
        .lasik-sheet, .lasik-sheet * {
          font-weight: 400 !important;
          text-decoration: none !important;
        }
        .lasik-sheet th { font-weight: 700 !important; }
        .patient-row-bold, .patient-row-bold * { font-weight: 700 !important; }
        .patient-row-normal, .patient-row-normal * { font-weight: 400 !important; }
        .lasik-sheet .border-b,
        .lasik-sheet .border-b-2 {
          border-bottom: none !important;
        }
          .lasik-sheet .sheet-print-header {
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) !important;
            align-items: center !important;
            border-bottom: 2px solid #003d9b !important;
            padding-bottom: 2px !important;
            margin-bottom: 2px !important;
          }
        .lasik-sheet .sheet-print-clinic-name {
          font-size: 20px !important;
          font-weight: 700 !important;
          line-height: 1.1 !important;
          color: #003d9b !important;
        }
        .lasik-sheet .sheet-print-clinic-tagline {
          font-size: 12px !important;
          font-weight: 400 !important;
          line-height: 1.2 !important;
          color: #434654 !important;
        }
          .lasik-sheet .sheet-print-logo {
            width: 40px !important;
            height: 40px !important;
          }
        .lasik-sheet .sheet-print-type {
          font-size: 17px !important;
          font-weight: 700 !important;
          line-height: 1.15 !important;
          color: #191c1e !important;
        }
        .lasik-sheet .sheet-watermark {
          opacity: 1 !important;
        }
        /* Same transparency as print — on the editing screen too, not just
           the printed page — so the watermark shows through form fields
           there as well. */
        .lasik-sheet input:not([type="checkbox"]):not([type="radio"]),
        .lasik-sheet [data-slot="input"],
        .lasik-sheet select,
        .lasik-sheet .border-input,
        .lasik-sheet textarea {
          background: transparent !important;
          background-color: transparent !important;
        }
        .consultant-examination-only > * {
          display: none !important;
        }
        .consultant-examination-only > [data-purpose="clinical-diagrams"] {
          display: flex !important;
          order: 1 !important;
          min-height: 0 !important;
          border: 0 !important;
          padding: 0 !important;
        }
        .consultant-examination-only > [data-purpose="clinical-refraction"] {
          display: block !important;
          order: 2 !important;
          width: 100% !important;
          margin-top: 8px !important;
        }
        .consultant-examination-only > [data-purpose="clinical-refraction"] th,
        .consultant-examination-only > [data-purpose="clinical-refraction"] td {
          padding: 2px 4px !important;
          font-size: 16px !important;
        }
        .consultant-examination-only > [data-purpose="clinical-refraction"] input,
        .consultant-examination-only > [data-purpose="clinical-refraction"] button,
        .consultant-examination-only > [data-purpose="clinical-refraction"] button span {
          font-size: 16px !important;
        }
        @media screen and (max-width: 639px) {
          #root .consultant-examination-only .clinical-refraction-desktop-table {
            display: none !important;
          }
        }
        .consultant-examination-only .consultant-eyes-block {
          display: none !important;
        }
        .consultant-examination-only .consultant-right-column {
          width: 100% !important;
        }
        /* Print preview pages must not become independent scroll containers. */
        .lasik-print-root.print-view-active [data-print-page],
        .lasik-print-root.print-view-active .print-page-center-a4,
        .lasik-print-root.print-view-active .print-page-center-a4 > .lasik-sheet {
          overflow: hidden !important;
          overflow-y: hidden !important;
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        .lasik-print-root.print-view-active [data-print-page]::-webkit-scrollbar,
        .lasik-print-root.print-view-active .print-page-center-a4::-webkit-scrollbar,
        .lasik-print-root.print-view-active .print-page-center-a4 > .lasik-sheet::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
          background: transparent !important;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          /* index.css's .lasik-print-root > div rule (margin-left/right:0,
             for stripping card gutters elsewhere) only matches the immediate
             py-8 wrapper — [data-print-document="lasik"] is a grandchild, so
             a child-combinator selector here never matched it and this
             override was dead. Use a descendant selector so it actually
             centers the page. */
          .lasik-print-root [data-print-document="lasik"] {
            margin-left: auto !important;
            margin-right: auto !important;
          }
          /* Scrollbars are useful on screen but must never be captured in print/PDF output. */
          html, body, #root,
          .lasik-print-root,
          .lasik-print-root * {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }
          html::-webkit-scrollbar,
          body::-webkit-scrollbar,
          #root::-webkit-scrollbar,
          .lasik-print-root::-webkit-scrollbar,
          .lasik-print-root *::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
          }
          .lasik-print-root {
            overflow: visible !important;
            max-height: none !important;
          }

          /* Keep the outer root visible for page breaks, but never the paper pages. */
          [data-print-document="lasik"] [data-print-page],
          [data-print-document="lasik"] .print-page-center-a4,
          [data-print-document="lasik"] .print-page-center-a4 > .lasik-sheet {
            overflow: hidden !important;
            overflow-y: hidden !important;
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }

          [data-print-document="lasik"] [data-print-page]::-webkit-scrollbar,
          [data-print-document="lasik"] .print-page-center-a4::-webkit-scrollbar,
          [data-print-document="lasik"] .print-page-center-a4 > .lasik-sheet::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
            background: transparent !important;
          }
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
            padding: 0 !important;
            background: white !important;
            overflow: visible !important;
          }
          .lasik-print-root.print-view-active {
            height: auto !important;
            overflow: visible !important;
          }
          .print-page-break {
            page-break-before: always !important;
            break-before: page !important;
          }
          .print-page-center-a4 {
            width: 100% !important;
            max-width: 100% !important;
            /* Exactly 297mm (A4) leaves zero headroom for Chrome's own px
               rounding of the mm size during PDF/print pagination, which is
               enough on its own to spawn a trailing blank page (confirmed
               for the external/no-followup sheet, which never picks up the
               combined-sheet-print override below). Match that override's
               293mm so single-page sheets get the same safety margin. */
            height: 293mm !important;
            min-height: 293mm !important;
            max-height: 293mm !important;
            margin: 0 !important;
            padding: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          [data-print-document="lasik"] .print-page-center-a4 {
            min-height: 293mm !important;
            display: flex !important;
            justify-content: center !important;
          }
          [data-print-document="lasik"]
            [data-print-page="main"] > .lasik-sheet {
            position: relative !important;
            inset: auto !important;
            left: auto !important;
            right: auto !important;
            transform: translateX(${printOffsetXmm}mm) translateY(${printOffsetYmm}mm) scale(${printScale}) !important;
            width: 100% !important;
            max-width: 100% !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }
          .print-page-center-a4 > .lasik-sheet {
            width: 100% !important;
            max-width: 100% !important;
            height: 275mm !important;
            min-height: 275mm !important;
            max-height: 275mm !important;
            box-sizing: border-box !important;
            padding: 1.5mm 3mm !important;
            gap: 0 !important;
            font-size: 98% !important;
            line-height: 1.02 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            row-gap: 1.5mm !important;
          }
          .print-page-center-a4 > .lasik-sheet > * {
            margin-top: 0 !important;
            margin-bottom: 0 !important;
          }
          .attached-followup-page > .sheet-followup-body[data-print-variant="attached"] {
            transform: translateX(${followupLabels.offsetXmm}mm) translateY(${followupLabels.offsetYmm}mm) scale(${followupLabels.scale}) !important;
          }
          [data-sheet-type="consultant"] .attached-followup-page > .sheet-followup-body[data-print-variant="attached"] {
            transform: none !important;
          }
          .print-page-center-a4 > .lasik-sheet section {
            margin-block: 0 !important;
          }
          .print-page-center-a4 > .lasik-sheet table th,
          .print-page-center-a4 > .lasik-sheet table td {
            padding: 1px 2px !important;
            line-height: 0.98 !important;
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
          .lasik-sheet table { font-size: 13px !important; }
          .lasik-sheet input,
          .lasik-sheet select {
            font-size: 13px !important;
            padding-top: 1px !important;
            padding-bottom: 1px !important;
          }
          .lasik-sheet textarea {
            overflow: hidden !important;
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
          /* [data-slot="input"] (shadcn Input, incl. every DateInput field)
             and its wrapping border box can lose their bg-transparent
             utility class to another [data-slot="input"] rule elsewhere in
             the cascade — force it so the watermark shows through instead
             of hiding behind an opaque white patch. */
          .lasik-sheet [data-slot="input"],
          .lasik-sheet select,
          .lasik-sheet .border-input {
            background: transparent !important;
            background-color: transparent !important;
          }
          .patient-row-normal input:not([type="checkbox"]):not([type="radio"]) {
            font-weight: 400 !important;
          }
          /* Same size across every field in the patient-info section, on
             every sheet type — only weight tells the important fields
             (name, age, job, ...) apart from the plain labels. */
          /* Titles (the field labels, e.g. "الاسم:") vs data (the actual
             values, whether an <input> or the read-only dateOfBirth <span>)
             — labels all carry the text-[#434654] color class, which is
             otherwise unused on any value in this section, so it doubles as
             a reliable title/value discriminator here. */
          .print-lasik-patient-grid span[class*="434654"] {
            font-size: 12px !important;
            font-weight: 700 !important;
            line-height: 1.2 !important;
          }
          .print-lasik-patient-grid span:not([class*="434654"]) {
            font-size: 11px !important;
          }
          .print-lasik-patient-grid input:not([type="checkbox"]):not([type="radio"]) {
            font-size: 11px !important;
          }
          .lasik-sheet .patient-detail-emphasis {
            font-size: 11px !important;
            font-weight: 700 !important;
          }
          .sheet-type-consultant .print-lasik-patient-grid,
          [data-sheet-type="consultant"] .print-lasik-patient-grid {
            min-height: 0 !important;
            padding: 5px !important;
            row-gap: 1mm !important;
          }
          .sheet-type-consultant .print-lasik-patient-grid > div,
          [data-sheet-type="consultant"] .print-lasik-patient-grid > div {
            row-gap: 3px !important;
          }
          .lasik-sheet .border-b,
          .lasik-sheet .border-b-2,
          .lasik-sheet .border-b-4,
          .lasik-sheet .border-b-8 {
            border-bottom: 0 !important;
          }
          .lasik-sheet .sheet-print-header {
            border-bottom: 2px solid #003d9b !important;
            padding-bottom: 2mm !important;
            margin-bottom: 2mm !important;
          }
          .lasik-sheet .sheet-print-clinic-name {
            font-size: 21px !important;
            font-weight: 700 !important;
          }
          .lasik-sheet .sheet-print-clinic-tagline {
            font-size: 12px !important;
            font-weight: 400 !important;
          }
          .lasik-sheet .sheet-print-logo {
            width: 15mm !important;
            height: 15mm !important;
          }
          .lasik-sheet .sheet-print-type {
            font-size: 18px !important;
            font-weight: 700 !important;
          }
          .lasik-sheet .sheet-watermark img {
            width: 120mm !important;
            height: 120mm !important;
            opacity: 0.07 !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          .lasik-sheet .gap-8 { gap: 12px !important; }
          .lasik-sheet .gap-6 { gap: 10px !important; }
          .lasik-sheet .gap-5 { gap: 8px !important; }
          .lasik-sheet .gap-4 { gap: 6px !important; }
          .lasik-sheet .p-8 { padding: 0 !important; }
          .lasik-sheet .p-4 { padding: 8px !important; }
          /* min-width:0 lets this grid item shrink below its content's
             intrinsic width — grid items default to min-width:auto, so
             without this a wide table (see table-layout:fixed below) plus
             the 10mm padding-left pushes the whole row past the page's
             210mm edge instead of respecting its 1.3fr track. This was the
             real source of the right-edge overflow/crop on lasik/external
             print (the pentacam eye cards consultant doesn't render). */
          .print-lasik-eye-card {
            display: flex !important;
            flex-direction: column !important;
            min-width: 0 !important;
            padding-left: 10mm !important;
            padding-top: 4px !important;
            padding-bottom: 4px !important;
          }
          /* Stretch the table down through the card's full stretched height
             (align-items:stretch on the section below) instead of sitting
             at its own small intrinsic size with empty space beneath it. */
          .print-lasik-eye-card table {
            flex: 1 1 auto !important;
            height: 100% !important;
          }
          .print-lasik-pentacam-right table {
            table-layout: fixed !important;
            width: 100% !important;
            font-size: 13px !important;
          }
          .print-lasik-pentacam-right td,
          .print-lasik-pentacam-right th {
            padding: 4px 6px !important;
            line-height: 1.3 !important;
          }
          .print-lasik-pentacam-right td input {
            font-size: 13px !important;
          }
          .print-lasik-pentacam-right .mb-2 {
            margin-bottom: 2px !important;
          }
          .lasik-sheet .pt-6 { padding-top: 10px !important; }
          .lasik-sheet .pt-4 { padding-top: 8px !important; }
          .lasik-sheet .pb-3 { padding-bottom: 6px !important; }
          .lasik-sheet .mb-3 { margin-bottom: 6px !important; }
          .lasik-sheet .mt-3 { margin-top: 6px !important; }
          .lasik-sheet .h-9 { height: 28px !important; }
          .lasik-sheet .h-8 { height: 22px !important; }
          .lasik-sheet .h-6 { height: 16px !important; }
          .print-lasik-patient-grid {
            display: flex !important;
            flex-wrap: wrap !important;
            column-gap: 6mm !important;
            row-gap: 1mm !important;
            padding: 5px !important;
            gap: 3px !important;
          }
          .print-lasik-patient-grid > div {
            gap: 3px !important;
          }
          .print-lasik-pentacam-right {
            display: grid !important;
            grid-template-columns: 1fr 1.3fr 1.3fr !important;
          }
          .print-lasik-pentacam-right > div:first-child { display: block !important; }
          .sheet-type-lasik .print-lasik-pentacam-right {
            min-height: 65mm !important;
            align-items: stretch !important;
          }
          .sheet-type-external .print-lasik-pentacam-right {
            min-height: 65mm !important;
            align-items: stretch !important;
          }
          .print-lasik-treatment-plan table {
            font-size: 10px !important;
          }
          .print-lasik-treatment-plan th,
          .print-lasik-treatment-plan td {
            padding: 2px 3px !important;
            line-height: 1.05 !important;
          }
          .print-consultant-diagrams {
            display: flex !important;
            flex-wrap: wrap !important;
            align-items: stretch !important;
            justify-content: center !important;
            gap: 3mm !important;
            flex: 1 1 auto !important;
            min-height: 125mm !important;
            padding: 4mm !important;
          }
          .print-consultant-diagrams .fundus-drawing-surface {
            width: 26mm !important;
            height: 26mm !important;
          }
          .print-consultant-diagrams [class*="f4c98a"] {
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          .print-consultant-diagrams .consultant-eyes-block {
            width: calc(25% - 1.5mm) !important;
          }
          .print-consultant-diagrams .consultant-right-column {
            width: calc(75% - 1.5mm) !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 2mm !important;
          }
          .print-consultant-diagrams .consultant-complains-block {
            flex: 1 !important;
          }
          .print-consultant-diagrams .consultant-examination-block {
            flex: 2.4 !important;
          }
          .print-consultant-diagrams p {
            margin-top: 2mm !important;
          }
          .print-consultant-diagrams .consultant-complains-block p {
            margin-top: 0 !important;
          }
          .print-lasik-history-visual-row {
            display: flex !important;
            align-items: stretch !important;
          }
          .print-lasik-questions {
            width: calc(75% - 3mm) !important;
          }
          .print-lasik-visual-grid {
            width: calc(25% - 3mm) !important;
          }
          .print-external-vision-grid {
            gap: 3mm !important;
          }
          .print-external-vision-grid table {
            font-size: 10px !important;
          }
          .print-external-vision-grid th,
          .print-external-vision-grid td {
            padding: 2px 3px !important;
            line-height: 1.05 !important;
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
          .print-lasik-questions input[type="checkbox"],
          .lasik-sheet input[type="checkbox"] {
            width: 12px !important;
            height: 12px !important;
            -webkit-appearance: none !important;
            appearance: none !important;
            border: 1.2px solid #191c1e !important;
            background-color: white !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
            flex-shrink: 0 !important;
            position: relative !important;
          }
          .print-lasik-questions input[type="checkbox"]:checked,
          .lasik-sheet input[type="checkbox"]:checked {
            background-color: #191c1e !important;
          }
          .print-lasik-questions input[type="checkbox"]:checked::after,
          .lasik-sheet input[type="checkbox"]:checked::after {
            content: "" !important;
            position: absolute !important;
            left: 3px !important;
            top: 0px !important;
            width: 3px !important;
            height: 6px !important;
            border: solid white !important;
            border-width: 0 1.5px 1.5px 0 !important;
            transform: rotate(45deg) !important;
          }
          .lasik-sheet input[type="radio"] {
            -webkit-appearance: none !important;
            appearance: none !important;
            width: 12px !important;
            height: 12px !important;
            border: 1.2px solid #191c1e !important;
            border-radius: 50% !important;
            background-color: white !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          .lasik-sheet input[type="radio"]:checked {
            background-color: #191c1e !important;
          }
          .print-lasik-footer-grid { display: grid !important; grid-template-columns: minmax(0, 8fr) minmax(0, 4fr) !important; }
          .print-lasik-signatures { display: grid !important; grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
          .print-page-center-a4 > .lasik-sheet > .print-lasik-compact-footer {
            flex: 0 0 auto !important;
            min-height: 0 !important;
            margin-top: 0 !important;
            padding-top: 2px !important;
            gap: 2px !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print-lasik-compact-footer {
            padding-top: 2px !important;
          }
          .print-lasik-compact-footer > :not([hidden]) ~ :not([hidden]) {
            margin-top: 2px !important;
          }
          .print-lasik-compact-footer .space-y-4 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 2px !important;
          }
          .print-lasik-compact-footer textarea {
            min-height: 36px !important;
            height: 36px !important;
            font-size: 10px !important;
            margin-top: 0 !important;
            padding: 1px !important;
          }
          .sheet-type-lasik .print-lasik-compact-footer textarea,
          .sheet-type-external .print-lasik-compact-footer textarea {
            min-height: 62px !important;
            height: 62px !important;
          }
          .print-lasik-compact-footer label {
            font-size: 11px !important;
          }
          .print-lasik-compact-footer .print-lasik-footer-grid {
            gap: 3px !important;
          }
          .print-lasik-compact-footer .print-lasik-footer-grid > div:first-child {
            gap: 2px !important;
          }
          .print-lasik-compact-footer .print-lasik-footer-grid > div:last-child {
            padding: 3px !important;
          }
          .print-lasik-compact-footer .print-lasik-footer-grid > div:last-child > div:first-child {
            font-size: 9px !important;
            padding-bottom: 1px !important;
            margin-bottom: 1px !important;
          }
          .print-lasik-compact-footer .print-lasik-footer-grid > div:last-child > div {
            margin-bottom: 1px !important;
            padding-bottom: 1px !important;
          }
          .print-lasik-compact-footer .print-lasik-footer-grid > div:last-child .h-6 {
            height: 20px !important;
            margin-bottom: 2px !important;
          }
          .sheet-type-lasik .print-lasik-compact-footer .print-lasik-footer-grid > div:last-child .h-6,
          .sheet-type-external .print-lasik-compact-footer .print-lasik-footer-grid > div:last-child .h-6 {
            height: 30px !important;
            margin-bottom: 3px !important;
          }
          .print-lasik-compact-footer .print-lasik-signatures {
            padding-top: 2px !important;
            gap: 8px !important;
          }
          .print-lasik-compact-footer .print-lasik-signatures > div {
            gap: 1px !important;
          }
          .print-lasik-compact-footer .print-lasik-signatures .h-9 {
            height: 18px !important;
          }

        }
      `}</style>
      {!embedded ? (
        <header
          className="sticky top-0 z-50 print:hidden flex justify-between items-center px-6 py-2 bg-[#f8f9fb] border-b border-[#c3c6d6]"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          {initialPatientId ? (
            <div className="flex items-center gap-1 text-sm">
              {[
                { key: "consultant", label: "استشاري" },
                { key: "lasik", label: "ليزك" },
                { key: "external", label: "اشعه خارجي" },
                { key: "referral", label: "خطاب تحويل" },
              ].map((tab) => {
                const hubPrefix = currentPath.startsWith("/patient-hub/")
                  ? "/patient-hub"
                  : "";
                const href =
                  tab.key === "referral"
                    ? `${hubPrefix}/sheets/referral/${initialPatientId}`
                    : `${hubPrefix}/sheets/${tab.key}/${initialPatientId}`;
                const active = tab.key === currentSheetType;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setLocation(href)}
                    className={`px-3 py-1.5 rounded font-bold ${active ? "bg-[#003d9b] text-white" : "text-[#434654] hover:bg-[#003d9b]/10"}`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-3">
            <div className="w-60">
              <PatientPicker
                initialPatientId={initialPatientId}
                onSelect={handleSelectPatient}
              />
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
      ) : null}
      {!embedded && printMode.printView && (
        <PrintPreviewBanner
          title={sheetTypeLabel}
          subtitle={formData.patientName || undefined}
          onPrint={handlePrint}
        />
      )}
      <div className={embedded ? "py-0" : "py-8 print:py-0"}>
        {embedded && embeddedMode !== "examination" ? (
          <div
            className="sticky top-0 z-30 mb-2 flex justify-end bg-white/95 py-2 print:hidden"
            dir="rtl"
          >
            <Button
              size="sm"
              onClick={handleSaveSheet}
              disabled={saveSheetMutation.isPending}
              type="button"
            >
              {saveSheetMutation.isPending ? "حفظ..." : "حفظ الملف"}
            </Button>
          </div>
        ) : null}
        {embedded && embeddedMode === "examination" ? (
          <div
            className="mb-2 flex flex-wrap items-end justify-end gap-2 print:hidden"
            dir="rtl"
          >
            <Button
              size="sm"
              onClick={handleSaveSheet}
              disabled={saveSheetMutation.isPending}
              type="button"
            >
              {saveSheetMutation.isPending ? "حفظ..." : "حفظ الفحص"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="h-9 gap-1.5"
              disabled={!selectedVisitId || deleteVisitSheetMutation.isPending}
              onClick={() => {
                if (!initialPatientId || !selectedVisitId) return;
                if (!window.confirm("مسح شيت هذه الزيارة من sheet_entries؟"))
                  return;
                deleteVisitSheetMutation.mutate({
                  patientId: initialPatientId,
                  visitId: selectedVisitId,
                  sheetType: currentSheetType,
                });
              }}
            >
              <Trash2 className="h-4 w-4" />
              {deleteVisitSheetMutation.isPending
                ? "جاري المسح..."
                : "مسح الزيارة"}
            </Button>
          </div>
        ) : null}
        <div className={`print:hidden ${printMode.printView ? "hidden" : ""}`}>
          <div className={embedded ? "w-full" : "a4-page-card"}>
            {renderSheetBody()}
          </div>
          {hasAttachedFollowupPage && (
            <div
              className={`combined-followup-screen mt-8 ${
                embedded ? "w-full max-w-none" : "a4-page-card"
              }`}
            >
              {renderAttachedFollowupPage()}
            </div>
          )}
        </div>
        <div
          className={`hidden print:block ${
            hasAttachedFollowupPage ? "combined-sheet-print" : ""
          }`}
          data-print-document="lasik"
          data-sheet-type={currentSheetType}
        >
          <div className="print-page-center-a4" data-print-page="main">
            {renderSheetBody(true)}
          </div>
          {hasAttachedFollowupPage && (
            <div
              className="attached-followup-page"
              data-print-page="followup"
            >
              {renderAttachedFollowupPage()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
