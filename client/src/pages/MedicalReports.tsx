import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowRight,
  ClipboardList,
  DoorOpen,
  FileText,
  FlaskConical,
  Image as ImageLucide,
  Eye,
  MessageSquare,
  Paperclip,
  Scan,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import PatientPicker from "@/components/PatientPicker";
import { trpc } from "@/lib/trpc";
import { formatDateLabel, getTrpcErrorMessage } from "@/lib/utils";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchBar } from "@/components/shared/SearchBar";
import { FilterBar } from "@/components/shared/FilterBar";
import { StatCard, STAT_CARDS_MOBILE_ROW } from "@/components/shared/StatCard";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { OfflinePageState } from "@/components/OfflinePageState";
import { BrandLogo } from "@/components/BrandLogo";
import { BRAND_NAME_AR, BRAND_NAME_EN } from "@/lib/brand";
import { DateInput } from "@/components/ui/date-input";

function formatDisplayValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (Array.isArray(value))
    return value
      .map((item) => formatDisplayValue(item))
      .filter(Boolean)
      .join(", ");
  if (typeof value === "object") {
    const maybeFundus = value as Record<string, unknown>;
    const fundusText = [
      maybeFundus.discStatus,
      maybeFundus.cupDiscRatio,
      maybeFundus.macuaStatus,
      maybeFundus.vesselStatus,
      maybeFundus.otherFindings,
    ]
      .map((item) => String(item ?? "").trim())
      .filter(Boolean)
      .join(", ");
    if (fundusText) return fundusText;
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }
  return "";
}

const MEDICAL_REPORT_TYPE_TABS = [
  { value: "all", label: "الكل" },
  { value: "labs", label: "تحاليل" },
  { value: "xrays", label: "أشعة" },
  { value: "images", label: "صور" },
  { value: "consult", label: "استشارة" },
  { value: "discharge", label: "خروج" },
] as const;

type MedicalReportCategory = (typeof MEDICAL_REPORT_TYPE_TABS)[number]["value"];

function categorizeMedicalReport(row: {
  operationType?: string | null;
  diagnosis?: string | null;
  recommendations?: string | null;
  clinicalOpinion?: string | null;
}): Exclude<MedicalReportCategory, "all"> {
  const ar = [
    row.operationType,
    row.diagnosis,
    row.recommendations,
    row.clinicalOpinion,
  ]
    .map((x) => String(x ?? ""))
    .join(" ");
  const low = `${ar} `.toLowerCase();
  if (/خروج|ملخص\s*خروج|discharge/i.test(ar)) return "discharge";
  if (/تحليل|تحاليل|lab\b/i.test(ar + low)) return "labs";
  if (/أشعة|اشعة|x\s*-?ray|radiology|ct\b|mri/i.test(ar + low)) return "xrays";
  if (/صور|fundus|oct|topography|angiography/i.test(ar + low)) return "images";
  if (/استشارة|consult/i.test(ar + low)) return "consult";
  return "consult";
}

function typeLabel(cat: Exclude<MedicalReportCategory, "all">) {
  const m: Record<string, string> = {
    labs: "تحاليل",
    xrays: "أشعة",
    images: "صور",
    consult: "استشارة",
    discharge: "ملخص خروج",
  };
  return m[cat] ?? cat;
}

function typeBadgeClass(cat: Exclude<MedicalReportCategory, "all">) {
  const m: Record<string, string> = {
    labs: "bg-secondary/15 text-secondary border-0",
    xrays: "bg-primary/10 text-primary border-0",
    images: "bg-success/15 text-success border-0",
    consult: "bg-warning/20 text-warning border-0",
    discharge: "bg-destructive/10 text-destructive border-0",
  };
  return m[cat] ?? "bg-muted text-muted-foreground border-0";
}

function deriveReportStatus(row: { createdAt: unknown; updatedAt: unknown }) {
  const c = new Date(row.createdAt as Date | string).getTime();
  const u = new Date(row.updatedAt as Date | string).getTime();
  if (!Number.isFinite(c)) return "final" as const;
  if (Number.isFinite(u) && u - c > 60_000) return "final" as const;
  const hrs = (Date.now() - c) / 36e5;
  if (hrs < 72) return "review" as const;
  return "pending" as const;
}

function statusLabel(st: ReturnType<typeof deriveReportStatus>) {
  if (st === "final") return "نهائي";
  if (st === "review") return "مراجعة";
  return "معلق";
}

function statusTone(st: ReturnType<typeof deriveReportStatus>) {
  if (st === "final") return "text-success font-semibold";
  if (st === "review") return "text-primary font-semibold";
  return "text-warning/90 font-semibold";
}

function overviewReportTitleSnippet(row: Record<string, unknown>) {
  const parts = [
    String(row.diagnosis ?? "").trim(),
    String(row.recommendations ?? "").trim(),
    String(row.operationType ?? "").trim(),
    String(row.clinicalOpinion ?? "").trim(),
  ].filter(Boolean);
  const raw = parts[0] ?? "";
  const oneLine = raw.replace(/\s+/g, " ").trim();
  if (!oneLine) return "—";
  if (oneLine.length <= 96) return oneLine;
  return `${oneLine.slice(0, 93)}…`;
}

const OVERVIEW_FILTERS = MEDICAL_REPORT_TYPE_TABS.map((t) => ({
  value: t.value,
  label: t.label,
}));

type ReportRow = {
  id: number;
  patientName: string;
  patientCode: string;
  patientAge?: string;
  date: string;
  doctor: string;
  diagnosis: string;
  diseases?: string[];
  recommendation: string;
  prescription?: string;
  notes?: string;
  operationType?: string;
  visitDate?: string;
};

export default function MedicalReports() {
  const { user, isAuthenticated } = useAuth();
  const [loc, setLocation] = useLocation();
  const inHubReports = loc.startsWith("/patient-hub/reports");
  const [, params] = useRoute("/medical-reports/:id");
  const [, hubReportsParams] = useRoute("/patient-hub/reports/:id");
  const routePatientId = params?.id ?? hubReportsParams?.id;
  const initialPatientId = routePatientId ? Number(routePatientId) : 0;
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(
    initialPatientId > 0 ? initialPatientId : null,
  );
  const reportsQuery = trpc.medical.getMedicalReportsByPatient.useQuery(
    { patientId: selectedPatientId ?? 0 },
    { enabled: Boolean(selectedPatientId), refetchOnWindowFocus: false },
  );
  const userStateQuery = trpc.medical.getUserPageState.useQuery(
    { page: "medical_reports" },
    { refetchOnWindowFocus: false },
  );
  const saveUserStateMutation = trpc.medical.saveUserPageState.useMutation();
  const userStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didHydrateUserStateRef = useRef(false);
  const patientQuery = trpc.patient.getPatient.useQuery(
    selectedPatientId ?? 0,
    { enabled: Boolean(selectedPatientId), refetchOnWindowFocus: false },
  );
  const prescriptionsQuery = trpc.medical.getPrescriptionsByPatient.useQuery(
    { patientId: selectedPatientId ?? 0 },
    { enabled: Boolean(selectedPatientId), refetchOnWindowFocus: false },
  );
  const prescriptionsWithItemsQuery =
    trpc.medical.getPrescriptionsWithItemsByPatient.useQuery(
      { patientId: selectedPatientId ?? 0 },
      { enabled: Boolean(selectedPatientId), refetchOnWindowFocus: false },
    );
  const sheetQuery = trpc.medical.getSheetEntry.useQuery(
    { patientId: selectedPatientId ?? 0, sheetType: "consultant" },
    { enabled: Boolean(selectedPatientId), refetchOnWindowFocus: false },
  );
  const diseasesQuery = trpc.medical.getAllDiseases.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const overviewQuery = trpc.medical.getMedicalReportsOverview.useQuery(
    undefined,
    {
      enabled: Boolean(isAuthenticated) && !inHubReports,
      refetchOnWindowFocus: false,
    },
  );
  const updateReportMutation = trpc.medical.updateMedicalReport.useMutation({
    onSuccess: () => {
      toast.success("تم تعديل التقرير");
      void reportsQuery.refetch();
      void overviewQuery.refetch();
    },
  });
  const deleteReportMutation = trpc.medical.deleteMedicalReport.useMutation({
    onSuccess: () => {
      toast.success("تم حذف التقرير");
      void reportsQuery.refetch();
      void overviewQuery.refetch();
    },
  });

  const [overviewSearch, setOverviewSearch] = useState("");
  const [overviewType, setOverviewType] = useState<string>("all");
  const [delConfirm, setDelConfirm] = useState<number | null>(null);

  const [selectedReport, setSelectedReport] = useState<ReportRow | null>(null);
  const [diseaseSearch, setDiseaseSearch] = useState("");
  const [expandedDiseaseGroups, setExpandedDiseaseGroups] = useState<string[]>(
    [],
  );
  const [formData, setFormData] = useState({
    patientName: "",
    patientCode: "",
    phone: "",
    age: "",
    address: "",
    visitDate: new Date().toISOString().split("T")[0],
    operationType: "",
    diagnosis: "",
    diseases: [] as string[],
    recommendation: "",
    prescription: "",
    notes: "",
  });

  const buildPrescriptionTextFromRecord = (record: any): string => {
    if (!record) return "";
    const items = Array.isArray(record.items) ? record.items : [];
    const lines = items
      .map((item: any) => {
        const name = String(item?.medicationName ?? "").trim();
        const instructions = String(item?.instructions ?? "").trim();
        const parts = [
          String(item?.dosage ?? "").trim(),
          String(item?.frequency ?? "").trim(),
          String(item?.duration ?? "").trim(),
        ].filter(Boolean);
        const details = instructions || parts.join(" / ");
        if (!name && !details) return "";
        if (name && details) return `${name} - ${details}`;
        return name || details;
      })
      .filter(Boolean);
    if (lines.length > 0) return lines.join("\n");
    return String(record?.notes ?? "").trim();
  };
  const getPrescriptionCandidates = (
    recordsWithItems: any[],
    simpleRecords: any[],
  ) => {
    const candidates: Array<{ id: string; date: string; text: string }> = [];
    const withItemsList = Array.isArray(recordsWithItems)
      ? recordsWithItems
      : [];
    for (const record of withItemsList) {
      const text = buildPrescriptionTextFromRecord(record);
      if (!text) continue;
      candidates.push({
        id: String(record?.id ?? ""),
        date: formatDateLabel(
          String(record?.prescriptionDate ?? "").split("T")[0],
        ),
        text,
      });
    }
    if (candidates.length > 0) return candidates;
    const simpleList = Array.isArray(simpleRecords) ? simpleRecords : [];
    for (const record of simpleList) {
      const text = String(record?.notes ?? "").trim();
      if (!text) continue;
      candidates.push({
        id: String(record?.id ?? ""),
        date: formatDateLabel(
          String(record?.prescriptionDate ?? "").split("T")[0],
        ),
        text,
      });
    }
    return candidates;
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    const fromRoute = Number(routePatientId ?? 0);
    if (Number.isFinite(fromRoute) && fromRoute > 0) {
      setSelectedPatientId(fromRoute);
    }
  }, [routePatientId]);

  useEffect(() => {
    const raw = localStorage.getItem("user_state_medical_reports");
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (Array.isArray(data.expandedDiseaseGroups))
        setExpandedDiseaseGroups(data.expandedDiseaseGroups);
      if (typeof data.diseaseSearch === "string")
        setDiseaseSearch(data.diseaseSearch);
    } catch {
      // ignore bad cache
    }
  }, []);

  useEffect(() => {
    const data = (userStateQuery.data as any)?.data;
    if (!data) return;
    if (didHydrateUserStateRef.current) return;
    if (Array.isArray(data.expandedDiseaseGroups))
      setExpandedDiseaseGroups(data.expandedDiseaseGroups);
    if (typeof data.diseaseSearch === "string")
      setDiseaseSearch(data.diseaseSearch);
    didHydrateUserStateRef.current = true;
  }, [userStateQuery.data]);

  useEffect(() => {
    if (inHubReports) return;
    const payload = {
      expandedDiseaseGroups,
      diseaseSearch,
    };
    localStorage.setItem("user_state_medical_reports", JSON.stringify(payload));
    if (userStateTimerRef.current) clearTimeout(userStateTimerRef.current);
    userStateTimerRef.current = setTimeout(() => {
      saveUserStateMutation.mutate({ page: "medical_reports", data: payload });
    }, 800);
    return () => {
      if (userStateTimerRef.current) clearTimeout(userStateTimerRef.current);
    };
  }, [
    expandedDiseaseGroups,
    diseaseSearch,
    saveUserStateMutation,
    inHubReports,
  ]);

  const canWriteReports = ["doctor", "admin"].includes(user?.role || "");
  const canDeleteReports = ["admin", "manager"].includes(user?.role || "");

  const doctorDbRowToReportRow = (
    row: Record<string, unknown>,
    patient:
      | {
          fullName?: string | null;
          patientCode?: string | null;
          age?: number | null;
        }
      | null
      | undefined,
  ): ReportRow => {
    let diseasesArr: string[] = [];
    try {
      const raw = row.diseases ? JSON.parse(String(row.diseases)) : [];
      diseasesArr = Array.isArray(raw)
        ? raw.map((x: unknown) => String(x))
        : [];
    } catch {
      diseasesArr = [];
    }
    const visitRaw = row.visitDate;
    const visitDateIso =
      visitRaw == null || visitRaw === ""
        ? new Date().toISOString().split("T")[0]
        : typeof visitRaw === "string"
          ? visitRaw.split("T")[0]
          : new Date(visitRaw as Date).toISOString().split("T")[0];
    const ca = row.createdAt;
    const created =
      ca == null
        ? ""
        : typeof ca === "string"
          ? ca.split("T")[0]
          : new Date(ca as Date).toISOString().split("T")[0];
    const notesCombined = [
      String(row.clinicalOpinion ?? "").trim(),
      String(row.additionalNotes ?? "").trim(),
    ]
      .filter(Boolean)
      .join("\n\n");
    return {
      id: Number(row.id ?? 0),
      patientName: String(patient?.fullName ?? "").trim(),
      patientCode: String(patient?.patientCode ?? "").trim(),
      patientAge: patient?.age != null ? String(patient.age) : "",
      date: created,
      doctor: "",
      diagnosis: String(row.diagnosis ?? ""),
      diseases: diseasesArr,
      recommendation: String(row.recommendations ?? ""),
      prescription: String(row.treatment ?? ""),
      notes: notesCombined,
      operationType: String(row.operationType ?? ""),
      visitDate: visitDateIso,
    };
  };

  const handleSaveReport = async () => {
    if (inHubReports) {
      toast.info("العرض فقط داخل مركز المريض");
      return;
    }
    if (!selectedReport) {
      toast.error("اختر تقريراً مسجّلاً من القائمة أولاً");
      return;
    }
    if (!selectedPatientId) {
      toast.error("يرجى اختيار المريض أولاً");
      return;
    }
    if (!formData.patientName || formData.diseases.length === 0) {
      toast.error("يرجى اختيار الأمراض");
      return;
    }

    try {
      await updateReportMutation.mutateAsync({
        reportId: selectedReport.id,
        visitDate: formData.visitDate,
        diagnosis: formData.diagnosis,
        diseases: formData.diseases,
        prescription: formData.prescription,
        recommendations: formData.recommendation,
        clinicalOpinion: formData.notes,
        operationType: formData.operationType,
        additionalNotes: formData.notes,
      });
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "حدث خطأ أثناء حفظ التقرير"));
      return;
    }
    const reportId = selectedReport.id;
    const res = await reportsQuery.refetch();
    const refreshed = (Array.isArray(res.data) ? res.data : []) as Record<
      string,
      unknown
    >[];
    const updated = refreshed.find((x) => Number(x?.id ?? 0) === reportId);
    const p = patientQuery.data as
      | {
          fullName?: string | null;
          patientCode?: string | null;
          age?: number | null;
        }
      | undefined;
    if (updated) handleViewReport(doctorDbRowToReportRow(updated, p ?? null));
  };

  const handleDeleteReport = async (id: number) => {
    if (inHubReports) {
      toast.info("العرض فقط داخل مركز المريض");
      return;
    }
    try {
      await deleteReportMutation.mutateAsync({ reportId: id });
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "حدث خطأ أثناء حذف التقرير"));
    }
  };

  const handleViewReport = (report: any) => {
    setSelectedReport(report);
    setFormData({
      patientName: report.patientName || "",
      patientCode: report.patientCode || "",
      phone: "",
      age: report.patientAge || "",
      address: "",
      visitDate: report.visitDate || new Date().toISOString().split("T")[0],
      operationType: report.operationType || "",
      diagnosis: report.diagnosis || "",
      diseases: report.diseases || [],
      recommendation: report.recommendation || "",
      prescription: report.prescription || "",
      notes: report.notes || "",
    });
  };

  function overviewRowToFormReport(row: Record<string, unknown>) {
    let diseasesArr: string[] = [];
    try {
      const raw = row.diseases ? JSON.parse(String(row.diseases)) : [];
      diseasesArr = Array.isArray(raw)
        ? raw.map((x: unknown) => String(x))
        : [];
    } catch {
      diseasesArr = [];
    }
    const vd = row.visitDate;
    const visitDateIso =
      vd == null || vd === ""
        ? new Date().toISOString().split("T")[0]
        : typeof vd === "string"
          ? vd.split("T")[0]
          : new Date(vd as Date).toISOString().split("T")[0];
    const created = row.createdAt
      ? new Date(String(row.createdAt)).toISOString().split("T")[0]
      : "";
    return {
      id: row.id as number,
      patientName: String(row.patientName ?? ""),
      patientCode: String(row.patientCode ?? ""),
      patientAge: "",
      date: created,
      doctor: String(row.doctorName ?? ""),
      diagnosis: String(row.diagnosis ?? ""),
      diseases: diseasesArr,
      recommendation: String(row.recommendations ?? row.operationType ?? ""),
      prescription: String(row.treatment ?? ""),
      notes: String(row.clinicalOpinion ?? row.additionalNotes ?? ""),
      operationType: String(row.operationType ?? ""),
      visitDate: visitDateIso,
    };
  }

  function openFromOverview(row: Record<string, unknown>) {
    const pid = Number(row.patientId ?? 0);
    if (!Number.isFinite(pid) || pid <= 0) return;
    setSelectedPatientId(pid);
    setLocation(
      inHubReports
        ? `/patient-hub/reports/${pid}${typeof window !== "undefined" ? window.location.search : ""}`
        : `/medical-reports/${pid}`,
    );
    handleViewReport(overviewRowToFormReport(row));
    window.setTimeout(() => {
      document
        .getElementById("medical-report-form")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  const handleDownloadReportPdf = (report?: ReportRow | null) => {
    if (report) {
      setSelectedReport(report);
    }
    window.setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleSelectPatient = (patient: {
    id: number;
    fullName: string;
    patientCode?: string | null;
  }) => {
    if (selectedPatientId !== patient.id) setSelectedReport(null);
    setSelectedPatientId(patient.id);
    setLocation(
      inHubReports
        ? `/patient-hub/reports/${patient.id}${typeof window !== "undefined" ? window.location.search : ""}`
        : `/medical-reports/${patient.id}`,
    );
    setFormData((prev) => ({
      ...prev,
      patientName: patient.fullName ?? "",
      patientCode: patient.patientCode ?? "",
    }));
  };

  useEffect(() => {
    const patient = patientQuery.data as any;
    if (!patient) return;
    setFormData((prev) => ({
      ...prev,
      patientName: patient.fullName ?? prev.patientName,
      patientCode: patient.patientCode ?? prev.patientCode,
      phone: patient.phone ?? "",
      age: patient.age != null ? String(patient.age) : "",
      address: patient.address ?? "",
    }));
  }, [patientQuery.data]);

  useEffect(() => {
    const diagnosisFromDiseases = formData.diseases.join("، ");
    if (formData.diagnosis === diagnosisFromDiseases) return;
    setFormData((prev) => ({
      ...prev,
      diagnosis: diagnosisFromDiseases,
    }));
  }, [formData.diseases, formData.diagnosis]);

  useEffect(() => {
    if (!sheetQuery.data) return;
    try {
      const parsed = JSON.parse(sheetQuery.data);
      if (parsed?.examData?.autorefraction) {
        const auto = parsed.examData.autorefraction;
        const summary = [
          `UCVA OD: ${auto?.od?.ucva ?? "-"}`,
          `UCVA OS: ${auto?.os?.ucva ?? "-"}`,
          `BCVA OD: ${auto?.od?.bcva ?? "-"}`,
          `BCVA OS: ${auto?.os?.bcva ?? "-"}`,
          `IOP OD: ${auto?.od?.iop ?? "-"}`,
          `IOP OS: ${auto?.os?.iop ?? "-"}`,
        ].join(" | ");
        setFormData((prev) => ({
          ...prev,
          notes: prev.notes ? prev.notes : summary,
        }));
      }
    } catch {
      // ignore
    }
  }, [sheetQuery.data]);

  useEffect(() => {
    const candidates = getPrescriptionCandidates(
      (prescriptionsWithItemsQuery.data ?? []) as any[],
      (prescriptionsQuery.data ?? []) as any[],
    );
    const latestText = candidates[0]?.text ?? "";
    if (!latestText) return;
    setFormData((prev) => ({
      ...prev,
      prescription: prev.prescription || latestText,
    }));
  }, [prescriptionsWithItemsQuery.data, prescriptionsQuery.data]);

  const handleLoadPrescriptionFromPage = () => {
    const candidates = getPrescriptionCandidates(
      (prescriptionsWithItemsQuery.data ?? []) as any[],
      (prescriptionsQuery.data ?? []) as any[],
    );
    if (candidates.length === 0) {
      toast.error("لا توجد روشتة محفوظة لهذا المريض");
      return;
    }
    if (candidates.length === 1) {
      setFormData((prev) => ({ ...prev, prescription: candidates[0].text }));
      toast.success("تم تحميل الروشتة من صفحة الروشتة");
      return;
    }
    const menu = candidates
      .map((item, index) => {
        const preview = item.text.replace(/\s+/g, " ").slice(0, 60);
        return `${index + 1}) ${item.date || "بدون تاريخ"} - ${preview}`;
      })
      .join("\n");
    const selectedRaw = window.prompt(`اختر رقم الروشتة:\n${menu}`, "1");
    if (!selectedRaw) return;
    const selectedIndex = Number(selectedRaw) - 1;
    if (
      !Number.isFinite(selectedIndex) ||
      selectedIndex < 0 ||
      selectedIndex >= candidates.length
    ) {
      toast.error("اختيار غير صحيح");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      prescription: candidates[selectedIndex].text,
    }));
    toast.success("تم تحميل الروشتة من صفحة الروشتة");
  };

  const overviewRows = (overviewQuery.data ?? []) as Record<string, unknown>[];

  const overviewStats = useMemo(() => {
    let labs = 0;
    let xrays = 0;
    let images = 0;
    let consult = 0;
    let discharge = 0;
    for (const r of overviewRows) {
      const c = categorizeMedicalReport(r as any);
      if (c === "labs") labs += 1;
      else if (c === "xrays") xrays += 1;
      else if (c === "images") images += 1;
      else if (c === "discharge") discharge += 1;
      else consult += 1;
    }
    return {
      total: overviewRows.length,
      labs,
      xrays,
      images,
      consult,
      discharge,
    };
  }, [overviewRows]);

  const filteredOverviewRows = useMemo(() => {
    const q = overviewSearch.trim().toLowerCase();
    return overviewRows.filter((row) => {
      const cat = categorizeMedicalReport(row as any);
      if (overviewType !== "all" && cat !== overviewType) return false;
      if (!q) return true;
      const hay = [
        row.patientName,
        row.patientCode,
        row.diagnosis,
        row.doctorName,
        row.operationType,
        row.recommendations,
        row.treatment,
        row.clinicalOpinion,
      ]
        .map((x) => String(x ?? "").toLowerCase())
        .join(" ");
      return hay.includes(q);
    });
  }, [overviewRows, overviewSearch, overviewType]);

  const patientDoctorReportRows = (reportsQuery.data ?? []) as Record<
    string,
    unknown
  >[];

  // Inline form panel — below hub table
  const FormPanel = () => (
    <Card
      id="medical-report-form"
      className="text-right scroll-mt-24 lg:sticky lg:top-4"
      dir="rtl"
    >
      <CardHeader>
        <div className="flex justify-between items-center gap-4">
          <CardTitle dir="rtl">
            {selectedReport ? "تعديل التقرير" : "التقارير الطبية للمريض"}
          </CardTitle>
          {selectedReport && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedReport(null)}
              className="text-xs h-7 px-2"
            >
              <ArrowRight className="h-3 w-3 ml-1" />
              العودة
            </Button>
          )}
        </div>
        <CardDescription>
          {selectedReport
            ? "عدّل حقول التقرير المختار ثم احفظ التحديث."
            : "اختر مريضاً ثم اختر تقريراً مسجّلاً لعرض محتواه وتعديله."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!selectedReport ? (
          <>
            <PatientPicker
              initialPatientId={selectedPatientId ?? undefined}
              onSelect={handleSelectPatient}
              fireOnInitialPatientLoad={false}
            />
            {selectedPatientId ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setLocation(
                    inHubReports
                      ? `/patient-hub/clinical-report/${selectedPatientId}`
                      : `/clinical-report/${selectedPatientId}`,
                  )
                }
              >
                <FileText className="h-4 w-4 ml-1" /> التقرير السريري الشامل
              </Button>
            ) : null}
            {selectedPatientId ? (
              <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-sm font-semibold">
                  التقارير المحفوظة لهذا المريض
                </p>
                {reportsQuery.isLoading ? (
                  <p className="text-xs text-muted-foreground">جاري التحميل…</p>
                ) : patientDoctorReportRows.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    لا توجد تقارير مسجّلة لهذا المريض.
                  </p>
                ) : (
                  <ul className="max-h-52 space-y-1 overflow-y-auto pr-1">
                    {patientDoctorReportRows.map((row) => {
                      const rid = Number(row?.id ?? 0);
                      const created = row?.createdAt
                        ? typeof row.createdAt === "string"
                          ? row.createdAt.split("T")[0]
                          : new Date(row.createdAt as Date)
                              .toISOString()
                              .split("T")[0]
                        : "";
                      const snippet = overviewReportTitleSnippet(row);
                      const active = false;
                      return (
                        <li key={rid || String(row.createdAt)}>
                          <Button
                            type="button"
                            variant={active ? "secondary" : "outline"}
                            className="h-auto w-full justify-start gap-2 whitespace-normal py-2 text-right"
                            onClick={() =>
                              handleViewReport(
                                doctorDbRowToReportRow(
                                  row,
                                  patientQuery.data as any,
                                ),
                              )
                            }
                          >
                            <span
                              className="shrink-0 font-mono text-xs text-muted-foreground"
                              dir="ltr"
                            >
                              {created ? formatDateLabel(created) : "—"}
                            </span>
                            <span className="min-w-0 flex-1 text-sm leading-snug">
                              {snippet}
                            </span>
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ) : null}
            {selectedPatientId ? (
              <p className="text-sm text-muted-foreground">
                اختر أحد التقارير أعلاه للمتابعة.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                اختر مريضاً للبدء.
              </p>
            )}
          </>
        ) : null}
        <fieldset
          disabled={inHubReports || !selectedReport}
          className="flex min-h-0 min-w-0 flex-col gap-4 border-0 p-0 m-0 disabled:opacity-95"
        >
          {selectedReport ? (
            <Tabs
              defaultValue="patient-info"
              persistKey="medical-reports"
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3" dir="rtl">
                <TabsTrigger value="patient-info">المريض</TabsTrigger>
                <TabsTrigger value="diagnosis">التشخيص</TabsTrigger>
                <TabsTrigger value="prescription">الروشتة</TabsTrigger>
              </TabsList>

              <TabsContent value="patient-info" className="space-y-4" dir="rtl">
                <div>
                  <Label htmlFor="patient-name">اسم المريض</Label>
                  <Input
                    id="patient-name"
                    placeholder="أدخل اسم المريض"
                    value={formData.patientName}
                    onChange={(e) =>
                      setFormData({ ...formData, patientName: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>الهاتف</Label>
                  <Input value={formData.phone} readOnly />
                </div>
                <div>
                  <Label>العمر</Label>
                  <Input value={formData.age} readOnly />
                </div>
                <div>
                  <Label>العنوان</Label>
                  <Input value={formData.address} readOnly />
                </div>
                <div>
                  <Label>كود المريض</Label>
                  <Input value={formData.patientCode} readOnly />
                </div>
              </TabsContent>

              <TabsContent value="diagnosis" className="space-y-4" dir="rtl">
                <div>
                  <Label htmlFor="visit-date">تاريخ الزيارة</Label>
                  <DateInput
                    id="visit-date"
                    value={formData.visitDate}
                    onChange={(e) =>
                      setFormData({ ...formData, visitDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>نوع العملية</Label>
                  <Input
                    value={formData.operationType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        operationType: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>التشخيص</Label>
                  <Input
                    value={diseaseSearch}
                    onChange={(e) => setDiseaseSearch(e.target.value)}
                    placeholder="ابحث عن تشخيص..."
                    className="mt-2 text-right"
                    dir="rtl"
                  />
                  <div className="mt-2 space-y-3 max-h-60 overflow-y-auto">
                    {(Object.entries(
                      (diseasesQuery.data ?? [])
                        .filter((d: any) =>
                          `${d.abbrev || ""} ${d.name || ""}`
                            .toLowerCase()
                            .includes(diseaseSearch.trim().toLowerCase()),
                        )
                        .reduce((acc: Record<string, any[]>, d: any) => {
                          const key = d.branch || "other";
                          if (!acc[key]) acc[key] = [];
                          acc[key].push(d);
                          return acc;
                        }, {} as Record<string, any[]>),
                    ) as [string, any[]][]).map(([branch, items]: [string, any[]]) => (
                      <div key={branch} className="border rounded-lg p-3">
                        <button
                          type="button"
                          className="w-full flex items-center justify-between font-semibold"
                          onClick={() =>
                            setExpandedDiseaseGroups((prev) =>
                              prev.includes(branch)
                                ? prev.filter((b) => b !== branch)
                                : [...prev, branch],
                            )
                          }
                        >
                          <span>{branch}</span>
                        </button>
                        {expandedDiseaseGroups.includes(branch) && (
                          <div className="mt-3 grid grid-cols-1 gap-2">
                            {(items as any[]).map((d: any) => {
                              const label = d.abbrev || d.name;
                              return (
                                <label
                                  key={d.id}
                                  className="flex items-center gap-2"
                                >
                                  <Checkbox
                                    checked={formData.diseases.includes(label)}
                                    onCheckedChange={(checked) => {
                                      const next = new Set(formData.diseases);
                                      if (checked) next.add(label);
                                      else next.delete(label);
                                      setFormData({
                                        ...formData,
                                        diseases: Array.from(next),
                                      });
                                    }}
                                  />
                                  <span>{label}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>التوصية</Label>
                  <Textarea
                    value={formData.recommendation}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        recommendation: e.target.value,
                      })
                    }
                    className="h-20"
                  />
                </div>
                <div>
                  <Label>ملاحظات إضافية</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    className="h-20"
                  />
                </div>
              </TabsContent>

              <TabsContent value="prescription" className="space-y-4" dir="rtl">
                <div className="rounded-lg border p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <Label>الروشتة الطبية</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleLoadPrescriptionFromPage}
                    >
                      تحميل من صفحة الروشتة
                    </Button>
                  </div>
                  <Textarea
                    value={formData.prescription}
                    onChange={(e) =>
                      setFormData({ ...formData, prescription: e.target.value })
                    }
                    className="h-32 mt-2"
                    placeholder="أدخل الأدوية والتعليمات"
                  />
                </div>
              </TabsContent>
            </Tabs>
          ) : null}

          <div className="flex gap-2 pt-2">
            {canWriteReports && !inHubReports && selectedReport ? (
              <Button
                onClick={() => void handleSaveReport()}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                تحديث التقرير
              </Button>
            ) : null}
          </div>
        </fieldset>
      </CardContent>
    </Card>
  );

  if (!isAuthenticated) return null;

  return (
    <div className="text-right">
      <div
        className={cn(
          "mx-auto w-full print:p-0",
          inHubReports
            ? "prescription-root bg-background max-w-none px-2 pb-4 pt-1"
            : "max-w-[1280px] px-4 pb-8 pt-4 md:px-6",
        )}
        dir="rtl"
      >
        {!inHubReports ? (
          <PageHeader
            title="التقارير الطبية"
            subtitle="عرض التقارير المسجّلة وطباعتها وربطها بملف المريض"
            icon={<FileText className="h-5 w-5" />}
          />
        ) : null}

        {reportsQuery.isError ||
        patientQuery.isError ||
        (!inHubReports && overviewQuery.isError) ? (
          <div className="mb-6">
            <OfflinePageState
              title="تعذر تحديث بيانات التقرير"
              body="بعض بيانات التقرير أو المريض أو الجدول غير متاحة الآن."
              onRetry={() => {
                void reportsQuery.refetch();
                void patientQuery.refetch();
                if (!inHubReports) void overviewQuery.refetch();
              }}
            />
          </div>
        ) : null}

        {!inHubReports ? (
          <>
            <div
              className={cn(
                STAT_CARDS_MOBILE_ROW,
                "mb-4 gap-2 print:hidden sm:mb-6 sm:grid sm:grid-cols-3 sm:gap-4 lg:grid-cols-6",
              )}
            >
              <StatCard
                title="إجمالي التقارير"
                value={overviewStats.total}
                icon={ClipboardList}
                iconColor="bg-primary text-primary-foreground"
              />
              <StatCard
                title="تحاليل"
                value={overviewStats.labs}
                icon={FlaskConical}
                iconColor="bg-secondary/15 text-secondary"
              />
              <StatCard
                title="أشعة"
                value={overviewStats.xrays}
                icon={Scan}
                iconColor="bg-primary/10 text-primary"
              />
              <StatCard
                title="صور"
                value={overviewStats.images}
                icon={ImageLucide}
                iconColor="bg-success/15 text-success"
              />
              <StatCard
                title="استشارة"
                value={overviewStats.consult}
                icon={MessageSquare}
                iconColor="bg-warning/20 text-warning"
              />
              <StatCard
                title="خروج"
                value={overviewStats.discharge}
                icon={DoorOpen}
                iconColor="bg-destructive/10 text-destructive"
              />
            </div>

            <div className="mb-6 flex flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
              <div className="w-full sm:w-96">
                <SearchBar
                  value={overviewSearch}
                  onChange={setOverviewSearch}
                  placeholder="بحث بالاسم أو عنوان التقرير..."
                />
              </div>
              <FilterBar
                filters={OVERVIEW_FILTERS}
                selected={overviewType}
                onSelect={setOverviewType}
                className="sm:justify-end"
              />
            </div>

            <div className="mb-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm print:hidden">
              {overviewQuery.isLoading ? (
                <div className="p-12 text-center text-muted-foreground">
                  جاري التحميل…
                </div>
              ) : filteredOverviewRows.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  {overviewRows.length === 0
                    ? "لا توجد تقارير مسجلة بعد."
                    : "لا توجد تقارير مطابقة للتصفية."}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[980px] w-full text-right text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="px-4 py-3 font-semibold">المريض</th>
                        <th className="px-4 py-3 font-semibold">الطبيب</th>
                        <th className="px-4 py-3 font-semibold">التاريخ</th>
                        <th className="px-4 py-3 font-semibold">النوع</th>
                        <th className="px-4 py-3 font-semibold">العنوان</th>
                        <th className="px-4 py-3 font-semibold">الحالة</th>
                        <th className="w-12 px-4 py-3 text-center font-semibold">
                          مرفقات
                        </th>
                        <th className="w-24 px-4 py-3 text-center font-semibold">
                          إجراءات
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOverviewRows.map((row) => {
                        const cat = categorizeMedicalReport(row as any);
                        const st = deriveReportStatus(
                          row as { createdAt: unknown; updatedAt: unknown },
                        );
                        const created = row.createdAt
                          ? typeof row.createdAt === "string"
                            ? row.createdAt.split("T")[0]
                            : new Date(row.createdAt as Date)
                                .toISOString()
                                .split("T")[0]
                          : "";
                        const attachmentHint =
                          String(row.treatment ?? "").trim().length > 0;
                        return (
                          <tr
                            key={String(row.id)}
                            className="border-b border-border/70 transition-colors hover:bg-primary/[0.06]"
                          >
                            <td className="max-w-[140px] px-4 py-3 align-top">
                              <div
                                className="truncate font-semibold"
                                title={String(row.patientName ?? "")}
                              >
                                {String(row.patientName ?? "").trim() || "—"}
                              </div>
                              {row.patientCode ? (
                                <div className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                                  {String(row.patientCode)}
                                </div>
                              ) : null}
                            </td>
                            <td
                              className="max-w-[120px] truncate px-4 py-3 align-top text-muted-foreground"
                              title={String(row.doctorName ?? "")}
                            >
                              {String(row.doctorName ?? "").trim() || "—"}
                            </td>
                            <td
                              className="whitespace-nowrap px-4 py-3 align-top"
                              dir="ltr"
                            >
                              <Badge variant="outline" className="font-normal">
                                {created ? formatDateLabel(created) : "—"}
                              </Badge>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 align-top">
                              <Badge
                                className={cn(
                                  "font-semibold",
                                  typeBadgeClass(cat),
                                )}
                              >
                                {typeLabel(cat)}
                              </Badge>
                            </td>
                            <td className="max-w-[220px] px-4 py-3 align-top text-muted-foreground">
                              <span
                                className="line-clamp-2"
                                title={overviewReportTitleSnippet(row)}
                              >
                                {overviewReportTitleSnippet(row)}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 align-top">
                              <span
                                className={cn(
                                  "text-xs font-semibold",
                                  statusTone(st),
                                )}
                              >
                                {statusLabel(st)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center align-top text-muted-foreground">
                              <Paperclip
                                className={`mx-auto h-4 w-4 ${attachmentHint ? "text-primary/80" : "opacity-30"}`}
                                aria-hidden
                              />
                            </td>
                            <td className="px-4 py-3 text-center align-top">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-9 w-9 p-0"
                                  title="عرض وتعديل"
                                  onClick={() => openFromOverview(row)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {canDeleteReports && !inHubReports ? (
                                  delConfirm === Number(row.id) ? (
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        aria-label="تأكيد الحذف"
                                        className="rounded bg-destructive text-destructive-foreground hover:bg-destructive/80"
                                        onClick={() => {
                                          void handleDeleteReport(
                                            Number(row.id),
                                          );
                                          setDelConfirm(null);
                                        }}
                                      >
                                        تأكيد
                                      </button>
                                      <button
                                        type="button"
                                        aria-label="إلغاء الحذف"
                                        className="rounded bg-muted text-muted-foreground hover:bg-border"
                                        onClick={() => setDelConfirm(null)}
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      aria-label="حذف التقرير"
                                      className="inline-flex h-9 w-9 items-center justify-center rounded text-destructive bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                                      onClick={() =>
                                        setDelConfirm(Number(row.id))
                                      }
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : null}

        {inHubReports ? (
          <div className="space-y-6 max-w-4xl mx-auto">
            {selectedReport ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center print:hidden">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setSelectedReport(null)}
                    className="gap-2"
                  >
                    <ArrowRight className="h-4 w-4 ml-1" />
                    <span>العودة لقائمة التقارير</span>
                  </Button>
                </div>
                <Card>
                  <CardHeader className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <CardTitle dir="rtl">تقرير طبي</CardTitle>
                      <div className="flex items-center gap-3">
                        <BrandLogo className="h-12 w-12 shrink-0 rounded-lg border border-border/50 bg-background" />
                        <div className="text-right">
                          <p className="font-semibold leading-tight">
                            {BRAND_NAME_AR}
                          </p>
                          <p className="text-xs text-muted-foreground leading-tight">
                            {BRAND_NAME_EN}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4" dir="rtl">
                    <div className="flex flex-wrap gap-6 border-b pb-3 text-sm">
                      <span>
                        <span className="font-semibold">الاسم: </span>
                        {selectedReport.patientName}
                      </span>
                      {selectedReport.patientAge ? (
                        <span>
                          <span className="font-semibold">السن: </span>
                          {selectedReport.patientAge}
                        </span>
                      ) : null}
                      {selectedReport.date ? (
                        <span>
                          <span className="font-semibold">التاريخ: </span>
                          {formatDateLabel(selectedReport.date)}
                        </span>
                      ) : null}
                    </div>
                    <div>
                      <p className="mb-1 text-sm font-semibold text-muted-foreground">
                        التشخيص
                      </p>
                      <p className="text-sm">
                        {formatDisplayValue(selectedReport.diagnosis)}
                      </p>
                    </div>
                    <div className="border-t pt-3">
                      <p className="mb-1 text-sm font-semibold text-muted-foreground">
                        التوصية
                      </p>
                      <p className="text-sm">
                        {formatDisplayValue(selectedReport.recommendation)}
                      </p>
                    </div>
                    {selectedReport.prescription ? (
                      <div className="border-t pt-3">
                        <p className="mb-1 text-sm font-semibold text-muted-foreground">
                          الروشتة
                        </p>
                        <p className="text-sm whitespace-pre-wrap">
                          {formatDisplayValue(selectedReport.prescription)}
                        </p>
                      </div>
                    ) : null}
                    {selectedReport.notes ? (
                      <div className="border-t pt-3">
                        <p className="mb-1 text-sm font-semibold text-muted-foreground">
                          ملاحظات
                        </p>
                        <p className="text-sm">
                          {formatDisplayValue(selectedReport.notes)}
                        </p>
                      </div>
                    ) : null}
                    <Button
                      className="w-full bg-primary hover:bg-primary/90 print:hidden"
                      onClick={() => handleDownloadReportPdf(selectedReport)}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      تحميل كـ PDF
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="border-b bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
                  <span>التقارير الطبية المحفوظة للمريض</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 font-semibold">
                        <th className="px-4 py-3">التاريخ</th>
                        <th className="px-4 py-3">الطبيب</th>
                        <th className="px-4 py-3">النوع</th>
                        <th className="px-4 py-3">العنوان / التشخيص</th>
                        <th className="w-24 px-4 py-3 text-center">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportsQuery.isLoading ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-muted-foreground">
                            جاري التحميل…
                          </td>
                        </tr>
                      ) : patientDoctorReportRows.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-muted-foreground">
                            لا توجد تقارير مسجّلة لهذا المريض.
                          </td>
                        </tr>
                      ) : (
                        patientDoctorReportRows.map((row) => {
                          const cat = categorizeMedicalReport(row as any);
                          const created = row.createdAt
                            ? typeof row.createdAt === "string"
                              ? row.createdAt.split("T")[0]
                              : new Date(row.createdAt as Date)
                                  .toISOString()
                                  .split("T")[0]
                            : "";
                          return (
                            <tr
                              key={String(row.id)}
                              className="border-b border-border/70 transition-colors hover:bg-primary/[0.06]"
                            >
                              <td className="px-4 py-3 align-top whitespace-nowrap">
                                <Badge variant="outline" className="font-normal">
                                  {created ? formatDateLabel(created) : "—"}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 align-top text-muted-foreground">
                                {String(row.doctorName ?? "").trim() || "—"}
                              </td>
                              <td className="px-4 py-3 align-top">
                                <Badge className={cn("font-semibold", typeBadgeClass(cat))}>
                                  {typeLabel(cat)}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 align-top text-muted-foreground">
                                {overviewReportTitleSnippet(row)}
                              </td>
                              <td className="px-4 py-3 text-center align-top">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-2"
                                  onClick={() =>
                                    setSelectedReport(
                                      doctorDbRowToReportRow(
                                        row,
                                        patientQuery.data as any,
                                      ),
                                    )
                                  }
                                >
                                  <Eye className="h-4 w-4 ml-1" />
                                  عرض
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 print:grid-cols-1">
            <div className="lg:col-span-2 print:hidden">
              <FormPanel />
            </div>
            <div className="print:hidden">
              {selectedReport ? (
                <Card className="sticky top-4">
                  <CardHeader className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <CardTitle>تقرير طبي</CardTitle>
                      <div className="flex items-center gap-3">
                        <BrandLogo className="h-12 w-12 shrink-0 rounded-lg border border-border/50 bg-background" />
                        <div className="text-right">
                          <p className="font-semibold leading-tight">
                            {BRAND_NAME_AR}
                          </p>
                          <p className="text-xs text-muted-foreground leading-tight">
                            {BRAND_NAME_EN}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4" dir="rtl">
                    <div className="flex flex-wrap gap-6 border-b pb-3 text-sm">
                      <span>
                        <span className="font-semibold">الاسم: </span>
                        {selectedReport.patientName}
                      </span>
                      {selectedReport.patientAge ? (
                        <span>
                          <span className="font-semibold">السن: </span>
                          {selectedReport.patientAge}
                        </span>
                      ) : null}
                      {selectedReport.date ? (
                        <span>
                          <span className="font-semibold">التاريخ: </span>
                          {formatDateLabel(selectedReport.date)}
                        </span>
                      ) : null}
                    </div>
                    <div>
                      <p className="mb-1 text-sm font-semibold text-muted-foreground">
                        التشخيص
                      </p>
                      <p className="text-sm">
                        {formatDisplayValue(selectedReport.diagnosis)}
                      </p>
                    </div>
                    <div className="border-t pt-3">
                      <p className="mb-1 text-sm font-semibold text-muted-foreground">
                        التوصية
                      </p>
                      <p className="text-sm">
                        {formatDisplayValue(selectedReport.recommendation)}
                      </p>
                    </div>
                    {selectedReport.prescription ? (
                      <div className="border-t pt-3">
                        <p className="mb-1 text-sm font-semibold text-muted-foreground">
                          الروشتة
                        </p>
                        <p className="text-sm whitespace-pre-wrap">
                          {formatDisplayValue(selectedReport.prescription)}
                        </p>
                      </div>
                    ) : null}
                    {selectedReport.notes ? (
                      <div className="border-t pt-3">
                        <p className="mb-1 text-sm font-semibold text-muted-foreground">
                          ملاحظات
                        </p>
                        <p className="text-sm font-mono">
                          {formatDisplayValue(selectedReport.notes)}
                        </p>
                      </div>
                    ) : null}
                    <Button
                      className="w-full bg-primary hover:bg-primary/90 print:hidden"
                      onClick={() => handleDownloadReportPdf(selectedReport)}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      تحميل كـ PDF
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="sticky top-4 border-dashed">
                  <CardHeader>
                    <CardTitle className="text-base">معاينة الطباعة</CardTitle>
                    <CardDescription>
                      اختر تقريراً مسجّلاً من القائمة أو من جدول التقارير لعرض المعاينة هنا.
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
      {selectedReport && (() => {
        const parsedSheet = (() => {
          if (!sheetQuery.data) return null;
          try {
            return JSON.parse(sheetQuery.data);
          } catch {
            return null;
          }
        })();

        const auto = parsedSheet?.examData?.autorefraction;
        const od = auto?.od;
        const os = auto?.os;

        const fundus = parsedSheet?.examData?.fundus;
        const fundusODText = fundus?.od ? [
          fundus.od.discStatus,
          fundus.od.cupDiscRatio,
          fundus.od.macuaStatus || fundus.od.maculaStatus,
          fundus.od.vesselStatus,
          fundus.od.otherFindings
        ].filter(Boolean).join(", ") : "";

        const fundusOSText = fundus?.os ? [
          fundus.os.discStatus,
          fundus.os.cupDiscRatio,
          fundus.os.macuaStatus || fundus.os.maculaStatus,
          fundus.os.vesselStatus,
          fundus.os.otherFindings
        ].filter(Boolean).join(", ") : "";

        const formatRefraction = (eyeData: any) => {
          if (!eyeData) return "-";
          const { s, c, axis } = eyeData;
          if (!s && !c && !axis) return "-";
          return `${s || "0.00"} / ${c || "0.00"} x ${axis || "0"}`;
        };

        const followUpDate = (() => {
          const baseDate = selectedReport.date ? new Date(selectedReport.date) : new Date();
          baseDate.setMonth(baseDate.getMonth() + 3);
          return baseDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
        })();

        return (
          <div className="hidden print:block print-container w-[210mm] min-h-[297mm] bg-white p-[20mm] flex flex-col gap-6 relative overflow-hidden mx-auto" dir="rtl">
            {/* Header */}
            <div className="flex justify-between items-start mb-6 border-b-4 border-primary pb-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-primary text-on-primary rounded flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl">visibility</span>
                </div>
                <div className="text-right">
                  <h1 className="section-title text-2xl font-bold text-primary">{BRAND_NAME_EN} Medical Suite</h1>
                  <p className="text-sm font-semibold text-secondary">{BRAND_NAME_AR} - المجمع الطبي</p>
                  <p className="text-[10px] text-outline mt-1 tracking-wider uppercase">License No: 1029384756 • Clinical Excellence since 2008</p>
                </div>
              </div>
              <div className="text-left text-[11px] leading-tight text-secondary" dir="ltr">
                <p>Health Plaza, Building 42, Downtown</p>
                <p>P.O. Box 92837, Riyadh, KSA</p>
                <p>Tel: +966 11 000 0000</p>
                <p className="font-bold">www.cityeyecenter.med</p>
              </div>
            </div>

            {/* Report Title */}
            <div className="text-center mb-6">
              <h2 className="section-title text-xl font-bold italic text-primary underline underline-offset-4 decoration-1">تقرير طبي شامل (Comprehensive Clinical Report)</h2>
              <p className="text-[10px] text-outline mt-1 italic uppercase tracking-[0.2em]">Medical Confidentiality Guaranteed</p>
            </div>

            {/* Content Sections */}
            <div className="flex flex-col gap-5 flex-1">
              {/* Patient Info Section */}
              <section className="border border-outline-variant p-4 rounded-lg bg-surface-container-low">
                <h3 className="section-title text-sm font-bold text-primary mb-3 border-r-2 border-primary pr-2">معلومات المريض (Patient Information)</h3>
                <div className="grid grid-cols-3 gap-x-10 gap-y-3">
                  <div className="data-grid-item">
                    <span className="block text-[10px] font-bold text-outline uppercase">Patient Name / الاسم</span>
                    <span className="text-sm font-bold">{selectedReport.patientName}</span>
                  </div>
                  <div className="data-grid-item">
                    <span className="block text-[10px] font-bold text-outline uppercase">File No / رقم الملف</span>
                    <span className="text-sm font-bold">{selectedReport.patientCode ? `#${selectedReport.patientCode}` : "—"}</span>
                  </div>
                  <div className="data-grid-item">
                    <span className="block text-[10px] font-bold text-outline uppercase">Exam Date / التاريخ</span>
                    <span className="text-sm font-bold">{selectedReport.date ? formatDateLabel(selectedReport.date) : "—"}</span>
                  </div>
                  <div className="data-grid-item">
                    <span className="block text-[10px] font-bold text-outline uppercase">Age / العمر</span>
                    <span className="text-sm font-bold">{selectedReport.patientAge ? `${selectedReport.patientAge} Years` : "—"}</span>
                  </div>
                  <div className="data-grid-item">
                    <span className="block text-[10px] font-bold text-outline uppercase">Gender / الجنس</span>
                    <span className="text-sm font-bold">Male (ذكر)</span>
                  </div>
                  <div className="data-grid-item">
                    <span className="block text-[10px] font-bold text-outline uppercase">Referring Dr / الطبيب</span>
                    <span className="text-sm font-bold italic">{selectedReport.doctor || "Dr. Sarah Khalid"}</span>
                  </div>
                </div>
              </section>

              {/* Medical History */}
              <section>
                <h3 className="section-title text-sm font-bold text-primary mb-2 border-r-2 border-primary pr-2">التاريخ الطبي (Medical History)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-outline-variant p-2 rounded text-[11px] leading-relaxed">
                    <p><strong className="text-primary uppercase">Chronic Conditions:</strong> {selectedReport.diseases && selectedReport.diseases.length > 0 ? selectedReport.diseases.join("، ") : "None recorded (لا يوجد أمراض مزمنة مسجلة)"}</p>
                  </div>
                  <div className="border border-outline-variant p-2 rounded text-[11px] leading-relaxed">
                    <p><strong className="text-error uppercase">Allergies:</strong> Penicillin (Severe Reaction), Seasonal Pollen (حساسية بنسلين وحبوب لقاح)</p>
                  </div>
                </div>
              </section>

              {/* Clinical Findings Grid */}
              <div className="grid grid-cols-2 gap-5">
                {/* Visual Acuity & Refraction */}
                <section className="border border-outline-variant rounded-lg overflow-hidden">
                  <div className="bg-surface-container-high px-3 py-1">
                    <h3 className="section-title text-[12px] font-bold text-primary">فحوصات النظر (Visual Examinations)</h3>
                  </div>
                  <div className="p-3 bg-white">
                    <table className="w-full text-center text-[11px] mb-3 border-collapse">
                      <thead>
                        <tr className="bg-surface-container text-outline">
                          <th className="p-1 border border-outline-variant uppercase">Eye</th>
                          <th className="p-1 border border-outline-variant">UCVA</th>
                          <th className="p-1 border border-outline-variant">BCVA</th>
                          <th className="p-1 border border-outline-variant">Refraction</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-1 border border-outline-variant font-bold text-primary bg-primary/5">OD</td>
                          <td className="p-1 border border-outline-variant">{od?.ucva || "—"}</td>
                          <td className="p-1 border border-outline-variant font-bold">{od?.bcva || "—"}</td>
                          <td className="p-1 border border-outline-variant">{formatRefraction(od)}</td>
                        </tr>
                        <tr>
                          <td className="p-1 border border-outline-variant font-bold text-secondary">OS</td>
                          <td className="p-1 border border-outline-variant">{os?.ucva || "—"}</td>
                          <td className="p-1 border border-outline-variant font-bold">{os?.bcva || "—"}</td>
                          <td className="p-1 border border-outline-variant">{formatRefraction(os)}</td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="bg-primary-5 p-2 rounded border-r-2 border-primary">
                      <span className="block text-[10px] font-bold text-primary uppercase">Tonometry (IOP)</span>
                      <div className="flex justify-between font-bold text-[13px]">
                        <span>OD: {od?.iop ? `${od.iop} mmHg` : "—"}</span>
                        <span>OS: {os?.iop ? `${os.iop} mmHg` : "—"}</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Fundus Exam Detail */}
                <section className="border border-outline-variant rounded-lg overflow-hidden">
                  <div className="bg-surface-container-high px-3 py-1">
                    <h3 className="section-title text-[12px] font-bold text-primary">فحص قاع العين (Fundus Exam)</h3>
                  </div>
                  <div className="p-3 text-[11px] leading-relaxed italic text-secondary bg-white">
                    <p className="mb-2"><strong className="not-italic text-on-surface">OD:</strong> {fundusODText || "Normal optic disc margins, healthy neuroretinal rim. C/D ratio 0.3. Macula clear. No diabetic retinopathy noted."}</p>
                    <p><strong className="not-italic text-on-surface">OS:</strong> {fundusOSText || "Disc margins clear. Mild arteriolar narrowing observed. Peripheral retina intact and flat. No hemorrhages."}</p>
                  </div>
                </section>
              </div>

              {/* Diagnosis & Management */}
              <section className="border-2 border-primary rounded-lg bg-primary/[0.02] p-4 bg-white">
                <h3 className="section-title text-sm font-bold text-primary mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">medical_information</span>
                  التشخيص والخطة العلاجية (Diagnosis &amp; Management Plan)
                </h3>
                <div className="mb-4">
                  <h4 className="text-[10px] font-bold text-primary uppercase mb-1">Clinical Diagnosis</h4>
                  <p className="text-[13px] font-bold leading-snug">{formatDisplayValue(selectedReport.diagnosis)}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-primary uppercase mb-1">Treatment Protocol / Recommendation</h4>
                  <p className="text-sm text-gray-800 mt-2 whitespace-pre-wrap">{formatDisplayValue(selectedReport.recommendation)}</p>
                </div>
                {selectedReport.prescription && (
                  <div className="mt-4 border-t border-primary/10 pt-4">
                    <h4 className="text-[10px] font-bold text-primary uppercase mb-1">Prescription / الروشتة</h4>
                    <p className="text-sm text-gray-800 mt-2 whitespace-pre-wrap">{formatDisplayValue(selectedReport.prescription)}</p>
                  </div>
                )}
              </section>

              {/* Follow-up */}
              <div className="flex items-center gap-4 border border-outline-variant p-3 rounded-lg bg-surface-container-low">
                <span className="material-symbols-outlined text-primary text-3xl">event_available</span>
                <div className="flex-1 border-l border-outline-variant pl-4">
                  <h4 className="text-[10px] font-bold text-secondary uppercase">Follow-up Appointment</h4>
                  <p className="text-sm font-bold">{followUpDate}</p>
                </div>
                <div className="px-4">
                  <h4 className="text-[10px] font-bold text-secondary uppercase">Purpose</h4>
                  <p className="text-[11px]">Routine clinical review &amp; IOP monitoring</p>
                </div>
              </div>

              {/* Notes */}
              {selectedReport.notes && (
                <section className="border border-outline-variant rounded-lg p-4 bg-surface-container-low">
                  <h3 className="section-title text-sm font-bold text-primary mb-2 border-r-2 border-primary pr-2">ملاحظات سريرية (Clinical Notes)</h3>
                  <div className="text-[11px] leading-relaxed text-secondary whitespace-pre-wrap">
                    {formatDisplayValue(selectedReport.notes)}
                  </div>
                </section>
              )}
            </div>

            {/* Footer / Official Area */}
            <footer className="mt-8 border-t-2 border-outline-variant pt-6">
              <div className="grid grid-cols-3 items-end">
                {/* Medical Stamp */}
                <div className="flex flex-col items-center">
                  <div className="medical-seal">
                    <span className="material-symbols-outlined text-4xl">verified_user</span>
                  </div>
                  <p className="text-[9px] text-outline mt-2 uppercase font-bold">Official Clinic Stamp</p>
                </div>
                {/* Administrator Signature */}
                <div className="text-center px-4">
                  <div className="border-b border-outline mb-1 pb-1">
                    <span className="text-[11px] italic font-serif text-secondary">Authenticated Electronic Record</span>
                  </div>
                  <p className="text-[10px] font-bold">Hassan Al-Saeed</p>
                  <p className="text-[8px] text-outline uppercase">Health Records Administrator</p>
                </div>
                {/* Physician Signature */}
                <div className="text-center">
                  <div className="h-14 flex items-end justify-center border-b border-outline mb-1">
                    <img alt="Physician Signature" className="h-10 opacity-90" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB6OjX2fmU4wb4GA7ctM1sUxtTnyRda_KnNKHQGe11rGocM4IOnXIKNE6QF1p2xDiyfJ3rJvgV6aC41cjmoDu9FsAopW0Awb_oFze-96zAPl8N4gBxvgrGERzCVmuYU54dCjfLQhiJU5XvZk-a8k2YAQ2Ru66lbJpYNsJpkhGtC5i6Z9JRobwHOIzRkIzCqMECD-fRn8JiqOcmgZhIEyPFY8u7megPKCcmGVW_IJPrl-BfXeWFnJAuAIT5PbXP1Jfn85VjRVS8dis0P"/>
                  </div>
                  <p className="text-[11px] font-bold text-primary">{selectedReport.doctor || "Dr. Visionary MS, FRCS"}</p>
                  <p className="text-[9px] text-outline uppercase font-bold tracking-tighter">Consultant Ophthalmologist</p>
                </div>
              </div>
              <div className="mt-6 flex justify-between items-center text-[8px] text-outline border-t border-outline-variant/30 pt-2">
                <p>© 2026 {BRAND_NAME_EN} Medical Suite - Confidential Medical Document</p>
                <div className="flex gap-4">
                  <span>HIPAA Compliant</span>
                  <span>ISO 9001:2015 Certified</span>
                  <span>Page 1 of 1</span>
                </div>
              </div>
            </footer>
            {/* Bottom Border Accent */}
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-primary"></div>
          </div>
        );
      })()}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

        @media print {
          body { 
            background: white !important; 
            margin: 0 !important; 
            padding: 0 !important; 
          }
          body > div:not(.print-container) {
            display: none !important;
          }
          .print-container {
            display: flex !important;
            box-shadow: none !important;
            margin: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            padding: 12mm 15mm !important;
          }
          @page {
            size: A4 portrait !important;
            margin: 0 !important;
          }
        }

        .print-container {
          width: 210mm;
          height: 297mm;
          background: white;
          margin: 20px auto;
          padding: 12mm 15mm;
          box-shadow: 0 0 15px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
          position: relative;
          box-sizing: border-box;
        }

        /* Color classes mapping to the exact palette in the HTML design */
        .print-container .bg-primary { background-color: #003d9b !important; }
        .print-container .text-primary { color: #003d9b !important; }
        .print-container .text-secondary { color: #526069 !important; }
        .print-container .text-outline { color: #737685 !important; }
        .print-container .border-primary { border-color: #003d9b !important; }
        .print-container .border-outline-variant { border-color: #c3c6d6 !important; }
        .print-container .bg-surface-container-low { background-color: #f3f4f6 !important; }
        .print-container .bg-surface-container-high { background-color: #e7e8ea !important; }
        .print-container .bg-surface-container { background-color: #edeef0 !important; }
        .print-container .bg-primary-5 { background-color: rgba(0, 61, 155, 0.05) !important; }
        .print-container .text-error { color: #ba1a1a !important; }
        .print-container .text-on-primary { color: #ffffff !important; }
        .print-container .text-on-surface { color: #191c1e !important; }
        
        .print-container .section-title {
          font-family: 'Playfair Display', serif;
          letter-spacing: -0.01em;
        }
        .print-container .data-grid-item {
          border-bottom: 1px solid #e5e7eb;
          padding: 4px 0;
        }
        .print-container .medical-seal {
          width: 80px;
          height: 80px;
          border: 2px solid rgba(0, 61, 155, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.4;
        }
      `}</style>
    </div>
  );
}
