import { Fragment, memo, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Edit, FileText, Printer, Upload, Trash2, Users2, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { getTrpcErrorMessage } from "@/lib/utils";
import { matchesServiceCodeOrNameTerm, normalizeSearchText, normalizeServiceCodeForSearch } from "@/lib/patientFiltering";
import { trpc } from "@/lib/trpc";
import PageHeader from "@/components/PageHeader";
import PatientPicker from "@/components/PatientPicker";
import { OfflinePageState } from "@/components/OfflinePageState";
import { PullToRefresh } from "@/components/PullToRefresh";
import { pushRecentPatient } from "@/lib/dashboardLocalState";
import { buildPrintUrl } from "@/lib/print";
import { loadXlsx } from "@/lib/xlsx";

type DoctorDirectoryEntry = {
  id: string;
  code: string;
  name: string;
  isActive?: boolean;
};
type PatientCursor = {
  codeNum: number;
  patientCode: string;
  id: number;
};
type ImportPreviewRow = {
  rowNumber: number;
  patientCode: string;
  fullName: string;
  serviceType: string;
  locationType: string;
  status: string;
  errors: string[];
};

const normalizeServiceCode = (value: unknown) => {
  return normalizeServiceCodeForSearch(value);
};
const normalizeSheetType = (value: unknown) => {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "";
  if (raw === "pentacam") return "pentacam_center";
  if (raw === "surgery_center") return "surgery";
  if (raw === "surgery_external") return "surgery_external";
  if (raw === "pentacam_center" || raw === "radiology_center") return "pentacam_center";
  if (raw === "pentacam_external" || raw === "radiology_external") return "pentacam_external";
  return raw;
};
  const toLegacyServiceType = (value: string): "consultant" | "specialist" | "lasik" | "external" | "surgery" => {
  const normalized = normalizeSheetType(value);
  if (normalized === "pentacam_center") return "consultant";
  if (normalized === "pentacam_external") return "external";
  if (normalized === "surgery_external") return "external";
  if (normalized === "consultant" || normalized === "specialist" || normalized === "lasik" || normalized === "external" || normalized === "surgery") {
    return normalized;
  }
  return "consultant";
};

function highlightSearchMatch(text: string, term: string) {
  const source = String(text ?? "");
  const normalizedTerm = normalizeSearchText(term);
  if (!source || !normalizedTerm) return source;
  const sourceLower = source.toLowerCase();
  const rawTerm = String(term ?? "").trim().toLowerCase();
  const directIndex = rawTerm ? sourceLower.indexOf(rawTerm) : -1;
  if (directIndex >= 0) {
    return (
      <>
        {source.slice(0, directIndex)}
        <mark className="rounded bg-sky-100 px-0.5 text-sky-800">{source.slice(directIndex, directIndex + rawTerm.length)}</mark>
        {source.slice(directIndex + rawTerm.length)}
      </>
    );
  }
  return source;
}

export default function Patients() {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === "admin";
  const canEditPatients = user?.role === "admin" || user?.role === "manager" || user?.role === "reception";
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [cursor, setCursor] = useState<PatientCursor | null>(null);
  const [cursorHistory, setCursorHistory] = useState<Array<PatientCursor | null>>([]);
  const [pageSize, setPageSize] = useState(25);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const userStateQuery = trpc.medical.getUserPageState.useQuery(
    { page: "patients" },
    { refetchOnWindowFocus: false, staleTime: 5 * 60 * 1000, refetchOnReconnect: false }
  );
  const saveUserStateMutation = trpc.medical.saveUserPageState.useMutation();
  const doctorDirectoryQuery = trpc.medical.getDoctorDirectory.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 60 * 60 * 1000,
    refetchOnReconnect: false,
  });
  const availableDoctors = ((doctorDirectoryQuery.data ?? []) as Array<{ id: string; name: string; code: string; isActive?: boolean }>)
    .filter((doctor) => doctor.isActive !== false)
    .sort((a, b) => String(a.code ?? "").localeCompare(String(b.code ?? ""), "en", { numeric: true }));
  const doctorsLoading = !!doctorDirectoryQuery?.isLoading;
  const serviceDirectoryQuery = trpc.medical.getServiceDirectory.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 60 * 60 * 1000,
    refetchOnReconnect: false,
  });
  const userStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didHydrateUserStateRef = useRef(false);
  const hydratedPatientStateRef = useRef<number | null>(null);
  const [activeTab, setActiveTab] = useState("consultant");
  const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string>>(new Set());
  const [bulkSheetType, setBulkSheetType] = useState<
    | "consultant"
    | "specialist"
    | "lasik"
    | "external"
    | "surgery"
    | "surgery_external"
    | "pentacam_center"
    | "pentacam_external"
  >("consultant");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importDateFormat, setImportDateFormat] = useState<"" | "DMY" | "MDY">("");
  const [allPatients, setAllPatients] = useState<any[]>([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState<number | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [selectedSheetType, setSelectedSheetType] = useState<
    | "consultant"
    | "specialist"
    | "lasik"
    | "external"
    | "surgery"
    | "surgery_external"
    | "pentacam_center"
    | "pentacam_external"
    | ""
  >("");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [importPreviewOpen, setImportPreviewOpen] = useState(false);
  const [importBatchId, setImportBatchId] = useState("");
  const [importSummary, setImportSummary] = useState<{ total: number; valid: number; invalid: number } | null>(null);
  const [importPreviewRows, setImportPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [patientDraft, setPatientDraft] = useState({
    patientCode: "",
    fullName: "",
    dateOfBirth: "",
    age: "",
    address: "",
    phone: "",
    occupation: "",
  });
  const [formData, setFormData] = useState({
    fullName: "",
    patientCode: "",
    phone: "",
    alternatePhone: "",
    dateOfBirth: "",
    age: "",
    gender: "",
    nationalId: "",
    occupation: "",
    referralSource: "",
    address: "",
    medicalHistory: "",
    allergies: "",
    serviceType: "",
    branch: "",
    locationType: "",
    doctorId: "",
    status: "",
  });

  const normalizeTypedDateInput = (value: string) => {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    if (/^\d{6}$/.test(raw)) {
      const dd = raw.slice(0, 2);
      const mm = raw.slice(2, 4);
      const yy = raw.slice(4, 6);
      return `${dd}/${mm}/20${yy}`;
    }
    if (/^\d{8}$/.test(raw)) {
      const dd = raw.slice(0, 2);
      const mm = raw.slice(2, 4);
      const yyyy = raw.slice(4, 8);
      return `${dd}/${mm}/${yyyy}`;
    }
    let match = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2}|\d{4})$/);
    if (match) {
      const dd = String(Number(match[1])).padStart(2, "0");
      const mm = String(Number(match[2])).padStart(2, "0");
      const yy = match[3];
      const yyyy = yy.length === 2 ? `20${yy}` : yy;
      return `${dd}/${mm}/${yyyy}`;
    }
    match = raw.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (match) {
      const yyyy = match[1];
      const mm = String(Number(match[2])).padStart(2, "0");
      const dd = String(Number(match[3])).padStart(2, "0");
      return `${dd}/${mm}/${yyyy}`;
    }
    return raw;
  };
  const toIsoDate = (value: string) => {
    const raw = normalizeTypedDateInput(value);
    if (!raw) return "";
    const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) return `${match[3]}-${match[2]}-${match[1]}`;
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
  };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchTerm(searchTerm.trim()), 180);
    return () => clearTimeout(t);
  }, [searchTerm]);
  const hasActiveDateFilters = Boolean(toIsoDate(dateFrom) || toIsoDate(dateTo));
  const liveSearchTerm = normalizeSearchText(searchTerm);
  const useClientFilterWindow = Boolean(liveSearchTerm || hasActiveDateFilters);
  const backendServiceType = useMemo<"consultant" | "specialist" | "lasik" | "surgery" | "external" | undefined>(() => {
    if (activeTab === "consultant" || activeTab === "specialist" || activeTab === "lasik" || activeTab === "surgery" || activeTab === "external") {
      return activeTab;
    }
    if (activeTab === "pentacam_center") return "specialist";
    if (activeTab === "pentacam_external" || activeTab === "surgery_external") return "external";
    return undefined;
  }, [activeTab]);
  const patientsQuery = trpc.medical.getAllPatients.useQuery(
    {
      branch: undefined,
      // Apply backend search for core fields; keep local filtering for service-name matching.
      searchTerm: debouncedSearchTerm || undefined,
      dateFrom: toIsoDate(dateFrom) || undefined,
      dateTo: toIsoDate(dateTo) || undefined,
      // Narrow on the backend when possible, then keep the final tab filter locally.
      serviceType: backendServiceType,
      limit: useClientFilterWindow ? 500 : Math.min(500, Math.max(pageSize * 4, pageSize)),
      cursor: useClientFilterWindow ? undefined : cursor ?? undefined,
    },
      {
        enabled:
          isAuthenticated,
        refetchOnWindowFocus: false,
        staleTime: 30 * 1000,
        refetchOnReconnect: false,
        retry: 1,
      }
    );

  useEffect(() => {
    setCursor(null);
    setCursorHistory([]);
  }, [debouncedSearchTerm, activeTab, dateFrom, dateTo, pageSize]);

  const createPatientMutation = trpc.medical.createPatient.useMutation({
    onSuccess: () => {
      setCursor(null);
      setCursorHistory([]);
      patientsQuery.refetch();
    },
    onError: (error: unknown) => {
      toast.error(getTrpcErrorMessage(error, "حدث خطأ أثناء إضافة المريض"));
    },
  });
  const updatePatientMutation = trpc.medical.updatePatient.useMutation({
    onSuccess: () => {
      setCursor(null);
      setCursorHistory([]);
      patientsQuery.refetch();
    },
    onError: (error: unknown) => {
      toast.error(getTrpcErrorMessage(error, "حدث خطأ أثناء تحديث المريض"));
    },
  });
  const deletePatientMutation = trpc.medical.deletePatient.useMutation({
    onSuccess: () => {
      setCursor(null);
      setCursorHistory([]);
      patientsQuery.refetch();
    },
    onError: (error: unknown) => {
      toast.error(getTrpcErrorMessage(error, "حدث خطأ أثناء حذف المريض"));
    },
  });
  const saveSheetMutation = trpc.medical.saveSheetEntry.useMutation({
    onSuccess: () => {
    toast.success("تم نقل البيانات إلى فحوصات الليزك المختارة");
    },
    onError: (error: unknown) => {
      toast.error(getTrpcErrorMessage(error, "حدث خطأ أثناء نقل البيانات"));
    },
  });
  const savePatientStateMutation = trpc.medical.savePatientPageState.useMutation();
  const bulkAssignSheetMutation = trpc.medical.bulkAssignSheetTypeToPatients.useMutation();
  const stageImportMutation = trpc.medical.stagePatientsImport.useMutation();
  const applyImportMutation = trpc.medical.applyPatientsImport.useMutation();

  const downloadInvalidImportCsv = () => {
    const invalidRows = importPreviewRows.filter((r) => r.status !== "valid");
    if (!invalidRows.length) {
      toast.info("No invalid rows to export");
      return;
    }
    const escapeCsv = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
      ["rowNumber", "patientCode", "fullName", "status", "errors"].join(","),
      ...invalidRows.map((r) =>
        [
          String(r.rowNumber),
          escapeCsv(r.patientCode),
          escapeCsv(r.fullName),
          escapeCsv(r.status),
          escapeCsv((r.errors ?? []).join(" | ")),
        ].join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `patients_import_errors_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const applyStagedImport = async () => {
    if (!importBatchId) return;
    try {
      const applied = await applyImportMutation.mutateAsync({ batchId: importBatchId });
      if (applied.inserted > 0 || applied.updated > 0) {
        toast.success(`Import applied. Inserted ${applied.inserted}, updated ${applied.updated}.`);
      }
      if (applied.failed > 0) {
        toast.error(`Apply failed for ${applied.failed} row(s).`);
      }
      setImportPreviewOpen(false);
      await patientsQuery.refetch();
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "Failed to apply import batch"));
    }
  };

  const handleImportPatients = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!importDateFormat) {
      toast.error("Choose import date format first (DD/MM/YYYY or MM/DD/YYYY)");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const XLSX = await loadXlsx();
        const workbook = XLSX.read(data, { type: "binary", cellDates: true });
        const normalizeString = (value: any) => String(value ?? "").trim();
        const extractServiceTypeFromSheetName = (sheetName: string) => {
          const normalizedSheetName = normalizeString(sheetName).toUpperCase();
          // Accept common prefixes like "A_...", "B-...", "C ...", or exact "A/B/C/D".
          const match = normalizedSheetName.match(/^([ABCD])(?:[\s_\-|].*|$)/);
          if (!match) return "";
          return match[1];
        };
        const extractDoctorFromSheetName = (sheetName: string) => {
          const raw = normalizeString(sheetName);
          if (!raw) return "";
          const tokens = raw.split(/[\s_\-|]+/).map((t) => t.trim()).filter(Boolean);
          if (tokens.length === 0) return "";
          const maybeServiceLetter = tokens[0].toUpperCase();
          if (["A", "B", "C", "D"].includes(maybeServiceLetter)) {
            return tokens.slice(1).join(" ").trim();
          }
          return raw;
        };
        const rowsWithSheetName = workbook.SheetNames.flatMap((name) => {
          const worksheet = workbook.Sheets[name];
          if (!worksheet) return [] as Array<Record<string, unknown> & { __sheetName: string }>;
          const rows = XLSX.utils.sheet_to_json(worksheet) as Array<Record<string, unknown>>;
          return rows.map((row) => ({ ...row, __sheetName: name }));
        });

        const preferredSlashOrder: "DMY" | "MDY" = importDateFormat;

        const normalizeCode = (value: any) => {
          const raw = normalizeString(value);
          if (!raw) return "";
          if (/^\d+$/.test(raw)) {
            return raw.padStart(4, "0");
          }
          return raw;
        };
        const normalizeDate = (value: any) => {
          if (!value) return "";
          if (value instanceof Date) {
            const yyyy = value.getFullYear();
            const mm = String(value.getMonth() + 1).padStart(2, "0");
            const dd = String(value.getDate()).padStart(2, "0");
            return `${yyyy}-${mm}-${dd}`;
          }
          const raw = String(value).trim();
          if (!raw) return "";
          // Excel numeric date
          if (/^\d+(\.\d+)?$/.test(raw)) {
            const excelEpoch = new Date(Date.UTC(1899, 11, 30));
            const days = Number(raw);
            if (Number.isFinite(days)) {
              const date = new Date(excelEpoch.getTime() + days * 86400000);
              const yyyy = date.getUTCFullYear();
              const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
              const dd = String(date.getUTCDate()).padStart(2, "0");
              return `${yyyy}-${mm}-${dd}`;
            }
          }
          // dd/mm/yyyy or mm/dd/yyyy (sheet may be mixed)
          const match = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
          if (match) {
            const p1 = Number(match[1]);
            const p2 = Number(match[2]);
            let dd = 0;
            let mm = 0;
            if (p1 > 12 && p2 >= 1 && p2 <= 12) {
              dd = p1;
              mm = p2;
            } else if (p2 > 12 && p1 >= 1 && p1 <= 12) {
              mm = p1;
              dd = p2;
            } else if (preferredSlashOrder === "MDY") {
              mm = p1;
              dd = p2;
            } else {
              dd = p1;
              mm = p2;
            }
            if (dd < 1 || dd > 31 || mm < 1 || mm > 12) return "";
            const yyyy = match[3];
            return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
          }
          // yyyy-mm-dd
          const iso = raw.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
          if (iso) {
            const yyyy = iso[1];
            const mm = iso[2].padStart(2, "0");
            const dd = iso[3].padStart(2, "0");
            return `${yyyy}-${mm}-${dd}`;
          }
          return "";
        };
        const parseServiceType = (raw: string) => {
          const v = raw.trim().toLowerCase();
          if (!v) return undefined as any;
          if (v === "a" || v === "استشاري" || v === "consultant" || v === "1") return "consultant";
          if (v === "b" || v === "اخصائي" || v === "أخصائي" || v === "specialist") return "specialist";
          if (v === "c" || v === "فحوصات الليزك" || v === "lasik") return "lasik";
          if (v === "d" || v === "خارجي" || v === "external" || v === "2") return "external";
          return undefined as any;
        };
        const readRowValue = (row: any, keys: string[]) => {
          for (const key of keys) {
            if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
              return row[key];
            }
          }
          return "";
        };

        const importedPatients = rowsWithSheetName.map((row: any) => {
          const patientCode =
            row.patientCode ||
            row.id ||
            row.ID ||
            row["Patient ID"] ||
            row["رقم المريض"] ||
            row["كود المريض"] ||
            "";
          const fullName =
            row.fullName ||
            row.name ||
            row["اسم المريض"] ||
            "";
          const phone =
            row.phone ||
            row["تليفون منزل"] ||
            row["تليفون"] ||
            row["موبايل"] ||
            row["الموبايل"] ||
            row["هاتف"] ||
            "";
          const ageRaw = row.age ?? row["السن"];
          const ageNum = (() => {
            if (ageRaw === null || ageRaw === undefined || ageRaw === "") return undefined;
            const cleaned = String(ageRaw).replace(/[^\d]/g, "");
            if (!cleaned) return undefined;
            const n = Number(cleaned);
            return Number.isFinite(n) ? n : undefined;
          })();
          const dateOfBirth = normalizeDate(row.dateOfBirth ?? row["تاريخ الميلاد"]);
          const rawGender = normalizeString(row.gender ?? row["النوع"]);
          const gender =
            rawGender === "ذكر" || rawGender.toLowerCase() === "male"
              ? "male"
              : rawGender === "أنثى" || rawGender === "انثى" || rawGender.toLowerCase() === "female"
              ? "female"
              : "";
          const nationalId = row.nationalId ?? "";
          const address = row.address ?? row["العنوان"];
          const serviceRaw = normalizeString(
            readRowValue(row, [
              "serviceCode",
              "service_code",
              "serviceType",
              "service_type",
              "Service Code",
              "Service Type",
              "كود الخدمة",
              "نوع الخدمة",
            ])
          );
          // Backward compatibility with old files that used رقم الهوية as temporary service marker.
          const legacyServiceRaw = normalizeString(row["رقم الهوية"] || "");
          const serviceFromSheetName = extractServiceTypeFromSheetName(String(row.__sheetName ?? ""));
          const resolvedServiceRaw = serviceRaw || legacyServiceRaw || serviceFromSheetName;
          const doctorFromRow = normalizeString(
            readRowValue(row, [
              "doctorCode",
              "doctor_code",
              "doctor",
              "doctorName",
              "DoctorCode",
              "Doctor Code",
              "doctor code",
              "docCode",
              "drCode",
              "treatingDoctor",
              "physicianCode",
              "physician",
              "كود الطبيب",
              "كود الدكتور",
              "الطبيب",
              "اسم الطبيب",
            ])
          );
          const doctorFromSheetName = extractDoctorFromSheetName(String(row.__sheetName ?? ""));
          const doctorToken = doctorFromRow || doctorFromSheetName;
          // Use opening file date only; do not map follow-up/visit dates into this field.
          const lastVisit = normalizeDate(row["تاريخ فتح الملف"] ?? row["تاريخ الملف"]);
          const resolvedServiceType = parseServiceType(resolvedServiceRaw);
          const locationType = resolvedServiceType === "external" ? "external" : "center";
          return {
            patientCode: normalizeCode(patientCode),
            fullName: normalizeString(fullName),
            phone: normalizeString(phone),
            age: ageNum,
            dateOfBirth,
            gender: normalizeString(gender),
            nationalId: normalizeString(nationalId),
            address: normalizeString(address),
            serviceType: resolvedServiceType,
            locationType,
            doctorToken,
            lastVisit,
          };
        });

        const runImport = async () => {
          const stageRows = importedPatients.map((p, idx) => ({
            rowNumber: idx + 2,
            patientCode: p.patientCode || "",
            fullName: p.fullName || "",
            dateOfBirth: p.dateOfBirth || "",
            gender: (p.gender === "male" || p.gender === "female" ? p.gender : "") as "" | "male" | "female",
            phone: p.phone || "",
            address: p.address || "",
            branch: "examinations" as const,
            serviceType: (p.serviceType as any) || "consultant",
            locationType: (p.locationType as any) || "center",
            doctorCode: String((p as any).doctorToken ?? ""),
            doctorName: String((p as any).doctorToken ?? ""),
          }));
          const stage = await stageImportMutation.mutateAsync({ rows: stageRows });
          const preview = await utils.medical.getPatientImportPreview.fetch({ batchId: stage.batchId, limit: 200 });
          setImportBatchId(stage.batchId);
          setImportSummary({ total: stage.total, valid: stage.valid, invalid: stage.invalid });
          setImportPreviewRows((preview as ImportPreviewRow[]) ?? []);
          setImportPreviewOpen(true);
          if (stage.invalid > 0) {
            toast.error(`Import validation has ${stage.invalid} invalid row(s). Review before apply.`);
          } else {
            toast.success(`Validation passed for ${stage.valid} row(s). Click Apply to import.`);
          }
        };
        runImport().catch((error) =>
          toast.error(getTrpcErrorMessage(error, "خطأ في استيراد الملف"))
        );
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (error) {
        toast.error(getTrpcErrorMessage(error, "خطأ في استيراد الملف"));
      }
    };
    reader.readAsBinaryString(file);
  };

  const rawPatientsData = patientsQuery.data as any;
  const patientsPayload = (
    Array.isArray(rawPatientsData)
      ? { rows: rawPatientsData, hasMore: false, nextCursor: null }
      : rawPatientsData ?? { rows: [], hasMore: false, nextCursor: null }
  ) as {
    rows: any[];
    hasMore: boolean;
    nextCursor: PatientCursor | null;
  };
  const patientsFromDb = (Array.isArray(patientsPayload.rows) ? patientsPayload.rows : []) as any[];
  const localWindowMode = useClientFilterWindow;
  const hasMore = localWindowMode ? false : Boolean(patientsPayload.hasMore);
  const nextCursor = localWindowMode ? null : patientsPayload.nextCursor ?? null;
  const currentPage = localWindowMode ? 1 : cursorHistory.length + 1;
  const serviceCodeToLabel = useMemo(() => {
    const list = Array.isArray(serviceDirectoryQuery.data) ? serviceDirectoryQuery.data : [];
    const map = new Map<string, string>();
    for (const item of list) {
      const code = String(item?.code ?? "").trim();
      const name = String(item?.name ?? "").trim();
      if (!code) continue;
      map.set(normalizeServiceCode(code), name || code);
    }
    return map;
  }, [serviceDirectoryQuery.data]);
  const serviceCodeToType = useMemo(() => {
    const list = Array.isArray(serviceDirectoryQuery.data) ? serviceDirectoryQuery.data : [];
    const map = new Map<string, string>();
    for (const item of list) {
      const code = String(item?.code ?? "").trim();
      const type = String((item as any)?.defaultSheet ?? item?.serviceType ?? "").trim().toLowerCase();
      if (!code || !type) continue;
      map.set(normalizeServiceCode(code), type);
    }
    return map;
  }, [serviceDirectoryQuery.data]);
  const serviceTypeToDefaultName = useMemo(() => {
    const map = new Map<string, string>();
    const list = Array.isArray(serviceDirectoryQuery.data) ? serviceDirectoryQuery.data : [];
    for (const item of list) {
      const code = String(item?.code ?? "").trim();
      const name = String(item?.name ?? "").trim();
      const type = String((item as any)?.defaultSheet ?? item?.serviceType ?? "").trim().toLowerCase();
      if (!code || !name || !type) continue;
      const normalized = normalizeSheetType(type);
      if (normalized && !map.has(normalized)) {
        map.set(normalized, name);
      }
    }
    return map;
  }, [serviceDirectoryQuery.data]);
  const getPatientRowKey = (patient: any) =>
    String(
      (patient as any).__rowKey ??
        `${patient.id}-${normalizeServiceCode((patient as any).__serviceCodeSingle || (patient as any).serviceCode || "base")}`
    );
  const mapLegacyServiceTypeToModernTabs = (legacyType: string): string[] => {
    const normalized = normalizeSheetType(legacyType);
    if (normalized === "pentacam_center") return ["consultant"];
    if (normalized === "pentacam_external") return ["external"];
    if (normalized === "surgery") return ["consultant"];
    if (normalized === "surgery_external") return ["external"];
    if (normalized === "consultant" || normalized === "specialist" || normalized === "lasik" || normalized === "external") {
      return [normalized];
    }
    return ["consultant"];
  };

  const resolveServiceTypes = (patient: any) => {
    const singleCode = normalizeServiceCode((patient as any).__serviceCodeSingle);
    if (singleCode) {
      const rowMappedType = normalizeSheetType((patient as any).__serviceTypeSingle);
      if (rowMappedType) return new Set<string>(mapLegacyServiceTypeToModernTabs(rowMappedType));
      const mapped = normalizeSheetType(serviceCodeToType.get(singleCode));
      if (mapped) {
        return new Set<string>(mapLegacyServiceTypeToModernTabs(mapped));
      }
      const singleType = normalizeSheetType((patient as any).__serviceTypeSingle ?? patient?.serviceType ?? "consultant");
      return new Set<string>(mapLegacyServiceTypeToModernTabs(singleType || "consultant"));
    }
    const codes = [
      ...((Array.isArray(patient?.serviceCodes) ? patient.serviceCodes : []) as unknown[]),
      patient?.serviceCode,
    ]
      .map((v) => normalizeServiceCode(v))
      .filter(Boolean);
    const types = new Set<string>();
    for (const code of codes) {
      const mapped = normalizeSheetType(serviceCodeToType.get(code));
      if (mapped) {
        for (const tab of mapLegacyServiceTypeToModernTabs(mapped)) {
          types.add(tab);
        }
      }
    }
    if (types.size === 0) {
      const fallback = normalizeSheetType(patient?.serviceType ?? "consultant");
      if (fallback) {
        for (const tab of mapLegacyServiceTypeToModernTabs(fallback)) {
          types.add(tab);
        }
      }
    }
    return types;
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    const data = (userStateQuery.data as any)?.data;
    if (!data) return;
    if (didHydrateUserStateRef.current) return;
    if (data.searchTerm !== undefined) setSearchTerm(data.searchTerm ?? "");
    if (data.activeTab !== undefined) {
      const nextTab = String(data.activeTab ?? "consultant");
      const allowedTabs = new Set([
        "consultant",
        "specialist",
        "pentacam",
        "pentacam_center",
        "pentacam_external",
        "lasik",
        "external",
        "surgery",
        "surgery_external",
      ]);
      setActiveTab(allowedTabs.has(nextTab) ? nextTab : "consultant");
    }
    didHydrateUserStateRef.current = true;
  }, [userStateQuery.data]);

  useEffect(() => {
    if (userStateTimerRef.current) clearTimeout(userStateTimerRef.current);
    userStateTimerRef.current = setTimeout(() => {
      const payload = { searchTerm, activeTab, mode: "print-only" };
      saveUserStateMutation.mutate({ page: "patients", data: payload });
    }, 600);
    return () => {
      if (userStateTimerRef.current) clearTimeout(userStateTimerRef.current);
    };
  }, [searchTerm, activeTab, saveUserStateMutation]);

  if (!isAuthenticated) return null;

  const currentPatients = useMemo(() => {
    const combined = [...patientsFromDb, ...allPatients];
    const term = liveSearchTerm;
    const splitByService = false;
    const parseUserDateInput = (rawInput: string): Date | null => {
      const raw = normalizeTypedDateInput(rawInput);
      if (!raw) return null;
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
        const [dd, mm, yyyy] = raw.split("/");
        const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
        return Number.isNaN(d.valueOf()) ? null : d;
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const d = new Date(`${raw}T00:00:00`);
        return Number.isNaN(d.valueOf()) ? null : d;
      }
      return null;
    };
    const parseDate = (value: any): Date | null => {
      if (!value) return null;
      if (value instanceof Date && !Number.isNaN(value.valueOf())) return value;
      const raw = String(value).trim();
      if (!raw) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const d = new Date(`${raw}T00:00:00`);
        return Number.isNaN(d.valueOf()) ? null : d;
      }
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
        const [dd, mm, yyyy] = raw.split("/");
        const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
        return Number.isNaN(d.valueOf()) ? null : d;
      }
      const d = new Date(raw);
      return Number.isNaN(d.valueOf()) ? null : d;
    };
    const fromDate = parseUserDateInput(dateFrom);
    const toDate = (() => {
      const d = parseUserDateInput(dateTo);
      if (!d) return null;
      d.setHours(23, 59, 59, 999);
      return d;
    })();

    let filtered = combined.filter((p) => {
      const fullName = String(p.fullName ?? "").toLowerCase();
      const code = String(p.patientCode ?? "").toLowerCase();
      const phone = String(p.phone ?? "").toLowerCase();
      const nationalId = String(p.nationalId ?? "").toLowerCase();
      const treatingDoctor = String((p as any).treatingDoctor ?? "").toLowerCase();
      const rawServiceCodes = [
        ...((Array.isArray((p as any).serviceCodes) ? (p as any).serviceCodes : []) as unknown[]),
        (p as any).serviceCode,
      ]
        .map((v) => String(v ?? "").trim())
        .filter(Boolean);
      const serviceCode = rawServiceCodes.join(" ").toLowerCase();
      const mappedServiceName = rawServiceCodes
        .map((code) => String(serviceCodeToLabel.get(normalizeServiceCode(code)) ?? ""))
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const serviceTypeRaw = String((p as any).serviceType ?? "").toLowerCase();
      const serviceTypeLabel = (() => {
        if (serviceTypeRaw === "consultant") return "استشاري";
        if (serviceTypeRaw === "specialist") return "اخصائي";
        if (serviceTypeRaw === "pentacam" || serviceTypeRaw === "pentacam_center" || serviceTypeRaw === "pentacam_external") return "بنتاكام";
        if (serviceTypeRaw === "lasik") return "فحوصات الليزك";
        if (serviceTypeRaw === "external") return "خارجي";
        if (serviceTypeRaw === "surgery") return "عمليات";
        return "";
      })();
      const matchesTerm =
        !term ||
        fullName.includes(term) ||
        code.includes(term) ||
        phone.includes(term) ||
        nationalId.includes(term) ||
        treatingDoctor.includes(term) ||
        serviceCode.includes(term) ||
        mappedServiceName.includes(term) ||
        serviceTypeRaw.includes(term) ||
        serviceTypeLabel.includes(term);

      const patientDate = parseDate((p as any).lastVisit);
      const matchesFrom = !fromDate || (patientDate && patientDate >= fromDate);
      const matchesTo = !toDate || (patientDate && patientDate <= toDate);

      return matchesTerm && matchesFrom && matchesTo;
    });
    const toNumber = (value: any) => {
      const raw = String(value ?? "").trim();
      const num = Number(raw.replace(/[^\d]/g, ""));
      return Number.isFinite(num) ? num : Number.MAX_SAFE_INTEGER;
    };
    const sorted = filtered.sort((a, b) => {
      const aNum = toNumber(a.patientCode);
      const bNum = toNumber(b.patientCode);
      if (aNum !== bNum) return aNum - bNum;
      const aCode = String(a.patientCode ?? "");
      const bCode = String(b.patientCode ?? "");
      return aCode.localeCompare(bCode, "ar");
    });
    if (!splitByService) return sorted;

    return sorted.flatMap((patient) => {
      const codes = Array.from(
        new Set(
          [
            ...((Array.isArray((patient as any)?.serviceCodes) ? (patient as any).serviceCodes : []) as unknown[]),
            (patient as any)?.serviceCode,
          ]
            .map((v) => normalizeServiceCode(v))
            .filter(Boolean)
        )
      );
      if (codes.length === 0) {
        const patientServiceType = normalizeSheetType(patient?.serviceType ?? "consultant");
        const defaultName = serviceTypeToDefaultName.get(patientServiceType) || String(patient?.serviceType ?? "");
        return [{ ...patient, __rowKey: `${patient.id}-no-service`, __defaultServiceName: defaultName }];
      }
      const rowCodes = (() => {
        if (!term) return codes;
        const matched = codes.filter((srvCode) => {
          return matchesServiceCodeOrNameTerm(
            term,
            String(srvCode ?? ""),
            String(serviceCodeToLabel.get(srvCode) ?? "")
          );
        });
        return matched.length > 0 ? matched : codes;
      })();
      return rowCodes.map((srvCode, idx) => ({
        ...patient,
        __serviceCodeSingle: srvCode,
        __serviceNameSingle: String(serviceCodeToLabel.get(srvCode) ?? "").trim(),
        __serviceTypeSingle: normalizeSheetType(
          (patient as any)?.serviceSheetTypeByCode?.[srvCode] ?? serviceCodeToType.get(srvCode) ?? ""
        ),
        __rowKey: `${patient.id}-${srvCode}-${idx}`,
      }));
    });
  }, [
      patientsFromDb,
      allPatients,
      liveSearchTerm,
      dateFrom,
      dateTo,
      serviceCodeToLabel,
      serviceCodeToType,
      serviceTypeToDefaultName,
    ]);

  const formatDisplayDate = (value: any) => {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.valueOf())) return "";
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  /**
   * Determine sheet type based on doctor and service location
   * If doctor OR service is external, use external sheet
   */
  const determineSheetType = (patient: any, baseServiceType: string): string => {
    // Check if doctor location is external
    const doctorLocationType = patient?.doctorLocationType;
    const serviceLocationType = patient?.serviceLocationType;

    // If either doctor or service is external, use external sheet
    if (doctorLocationType === "external" || serviceLocationType === "external") {
      return "external";
    }

    // Otherwise use the base service type
    return baseServiceType;
  };

  const getSheetUrl = (serviceType: string, patientId: number, patient?: any) => {
    // Determine final sheet type based on patient location info
    const finalSheetType = patient ? determineSheetType(patient, serviceType) : serviceType;

    const sheetMap: Record<string, string> = {
      consultant: `/sheets/consultant/${patientId}`,
      specialist: `/sheets/specialist/${patientId}`,
      pentacam: `/sheets/pentacam/${patientId}`,
      pentacam_center: `/sheets/pentacam/${patientId}`,
      pentacam_external: `/sheets/external/${patientId}`,
      lasik: `/sheets/lasik/${patientId}`,
      external: `/sheets/external/${patientId}`,
      surgery: `/sheets/operation/${patientId}`,
      surgery_center: `/sheets/operation/${patientId}`,
      surgery_external: `/sheets/external/${patientId}`,
      refraction: `/refraction/${patientId}`,
    };
    return sheetMap[finalSheetType];
  };
  const prefetchPatientNavigationData = (patientId: number) => {
    if (!patientId) return;
    void utils.patient.getPatient.prefetch(patientId);
    void utils.medical.getPatientPageState.prefetch({ patientId, page: "examination" });
  };
  const isNativeApp = typeof window !== "undefined" && Boolean((window as any).Capacitor?.isNativePlatform?.());

  const handleOpenSheet = (serviceType: string, patientId: number) => {
    const patient = currentPatients.find((entry) => Number(entry.id) === Number(patientId));
    const url = getSheetUrl(serviceType, patientId, patient);
    if (!url) return;
    prefetchPatientNavigationData(patientId);
    if (patient) {
      pushRecentPatient({
        id: Number(patient.id),
        name: String(patient.fullName ?? ""),
        code: String(patient.patientCode ?? ""),
        serviceType,
      });
    }
    setLocation(url);
  };

  const handlePrintSheet = (serviceType: string, patientId: number) => {
    const patient = currentPatients.find((entry) => Number(entry.id) === Number(patientId));
    const url = getSheetUrl(serviceType, patientId, patient);
    if (!url) return;
    prefetchPatientNavigationData(patientId);
    const printUrl = buildPrintUrl(url, { autoPrint: !isNativeApp, nativePrint: isNativeApp });
    if (isNativeApp) {
      setLocation(printUrl);
      return;
    }
    window.open(printUrl, "_blank", "noopener,noreferrer");
  };

  const getRefractionUrl = (patientId: number) => `/refraction/${patientId}`;

  const handleOpenRefraction = (patientId: number) => {
    prefetchPatientNavigationData(patientId);
    setLocation(getRefractionUrl(patientId));
  };

  const handlePrintRefraction = (patientId: number) => {
    prefetchPatientNavigationData(patientId);
    const printUrl = buildPrintUrl(getRefractionUrl(patientId), { autoPrint: !isNativeApp, nativePrint: isNativeApp });
    if (isNativeApp) {
      setLocation(printUrl);
      return;
    }
    window.open(printUrl, "_blank", "noopener,noreferrer");
  };

  const getFollowupUrl = (serviceType: string, patientId: number, patient?: any) => {
    const normalized = normalizeSheetType(serviceType);
    if (normalized === "consultant") return `/sheets/consultant/${patientId}/followup`;
    if (normalized === "lasik") return `/sheets/lasik/${patientId}/followup`;
    return getSheetUrl(serviceType, patientId, patient);
  };

  const handleOpenFollowup = (serviceType: string, patientId: number) => {
    const patient = currentPatients.find((entry) => Number(entry.id) === Number(patientId));
    const url = getFollowupUrl(serviceType, patientId, patient);
    if (!url) return;
    prefetchPatientNavigationData(patientId);
    setLocation(url);
  };

  const tabFilteredPatients = currentPatients.filter((patient) => {
    const serviceTypes = resolveServiceTypes(patient);
    return serviceTypes.has(activeTab);
  });
  const filteredPatients = tabFilteredPatients;
  const searchSuggestions = useMemo(() => {
    if (!liveSearchTerm || liveSearchTerm.length < 2) return [];
    const seen = new Set<number>();
    const ranked: Array<{
      id: number;
      fullName: string;
      patientCode: string;
      phone: string;
      treatingDoctor: string;
      serviceLabel: string;
      score: number;
      matchKind: "patient" | "doctor" | "service" | "code";
    }> = [];
    for (const patient of currentPatients) {
      const id = Number(patient.id);
      if (!Number.isFinite(id) || seen.has(id)) continue;
      seen.add(id);
      const fullName = String(patient.fullName ?? "").trim();
      const patientCode = String(patient.patientCode ?? "").trim();
      const phone = String(patient.phone ?? "").trim();
      const treatingDoctor = String((patient as any).treatingDoctor ?? "").trim();
      const rawServiceCodes = [
        ...((Array.isArray((patient as any).serviceCodes) ? (patient as any).serviceCodes : []) as unknown[]),
        (patient as any).serviceCode,
        (patient as any).__serviceCodeSingle,
      ]
        .map((value) => normalizeServiceCode(value))
        .filter(Boolean);
      const serviceLabel = Array.from(
        new Set(
          rawServiceCodes
            .map((code) => String(serviceCodeToLabel.get(code) ?? "").trim())
            .filter(Boolean)
        )
      ).join(" / ");
      const blob = normalizeSearchText([fullName, patientCode, phone, treatingDoctor, serviceLabel].join(" "));
      if (!blob.includes(liveSearchTerm)) continue;
      const exactName = normalizeSearchText(fullName) === liveSearchTerm;
      const exactCode = normalizeSearchText(patientCode) === liveSearchTerm;
      const startsWithName = normalizeSearchText(fullName).startsWith(liveSearchTerm);
      const startsWithCode = normalizeSearchText(patientCode).startsWith(liveSearchTerm);
      const doctorMatch = normalizeSearchText(treatingDoctor).includes(liveSearchTerm);
      const serviceMatch = normalizeSearchText(serviceLabel).includes(liveSearchTerm);
      const codeMatch = normalizeSearchText(patientCode).includes(liveSearchTerm);
      const score =
        (exactCode ? 400 : 0) +
        (exactName ? 300 : 0) +
        (startsWithCode ? 120 : 0) +
        (startsWithName ? 100 : 0) +
        (normalizeSearchText(phone).includes(liveSearchTerm) ? 40 : 0) +
        (doctorMatch ? 20 : 0) +
        (serviceMatch ? 15 : 0);
      const matchKind: "patient" | "doctor" | "service" | "code" =
        exactCode || startsWithCode || codeMatch
          ? "code"
          : exactName || startsWithName
            ? "patient"
            : doctorMatch
              ? "doctor"
              : serviceMatch
                ? "service"
                : "patient";
      ranked.push({ id, fullName, patientCode, phone, treatingDoctor, serviceLabel, score, matchKind });
    }
    return ranked
      .sort((a, b) => b.score - a.score || a.fullName.localeCompare(b.fullName, "ar"))
      .slice(0, 8);
  }, [currentPatients, liveSearchTerm, serviceCodeToLabel]);
  const groupedSearchSuggestions = useMemo(() => {
    const groups: Array<{
      key: "patient" | "doctor" | "service" | "code";
      label: string;
      items: typeof searchSuggestions;
    }> = [
      { key: "patient", label: "مرضى", items: [] },
      { key: "code", label: "أكواد", items: [] },
      { key: "doctor", label: "أطباء", items: [] },
      { key: "service", label: "خدمات", items: [] },
    ];
    for (const suggestion of searchSuggestions) {
      const target = groups.find((group) => group.key === suggestion.matchKind);
      if (target) target.items.push(suggestion);
    }
    return groups.filter((group) => group.items.length > 0);
  }, [searchSuggestions]);
  const flatSearchSuggestions = useMemo(
    () => groupedSearchSuggestions.flatMap((group) => group.items),
    [groupedSearchSuggestions]
  );
  useEffect(() => {
    if (activeSuggestionIndex >= flatSearchSuggestions.length) {
      setActiveSuggestionIndex(flatSearchSuggestions.length > 0 ? 0 : -1);
    }
  }, [activeSuggestionIndex, flatSearchSuggestions]);
  const filteredRowKeys = filteredPatients.map((p) => getPatientRowKey(p));
  const isAllSelected =
    filteredRowKeys.length > 0 && filteredRowKeys.every((key) => selectedRowKeys.has(key));
  const selectedCount = filteredPatients.filter((p) => selectedRowKeys.has(getPatientRowKey(p))).length;

  const tabsConfig = [
    { value: "consultant", label: "استشاري" },
    { value: "specialist", label: "اخصائي" },
    { value: "lasik", label: "فحوصات الليزك" },
    { value: "external", label: "خارجي" },
  ];


  const resetForm = () => {
    setFormData({
      fullName: "",
      patientCode: "",
      phone: "",
      alternatePhone: "",
      dateOfBirth: "",
      age: "",
      gender: "",
      nationalId: "",
      occupation: "",
      referralSource: "",
      address: "",
      medicalHistory: "",
      allergies: "",
      serviceType: "",
      branch: "",
      locationType: "",
      doctorId: "",
      status: "",
    });
  };

  const formatDate = (value?: string | Date | null) => {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.valueOf())) return "";
    return date.toISOString().split("T")[0];
  };

  const handleTransferToSheet = async (
    sheetType:
      | "consultant"
      | "specialist"
      | "lasik"
      | "external"
      | "surgery"
      | "surgery_external"
      | "pentacam_center"
      | "pentacam_external"
  ) => {
    if (!isAdmin) {
      toast.error("التعديل للأدمن فقط.");
      return;
    }
    if (!selectedPatient?.id) {
      toast.error("يرجى اختيار مريض أولاً");
      return;
    }
    await updatePatientMutation.mutateAsync({
      patientId: selectedPatient.id,
      updates: {
        serviceType: sheetType,
      },
    });
    const existingState = await utils.medical.getPatientPageState
      .fetch({ patientId: selectedPatient.id, page: "examination" })
      .catch(() => null);
    const existingData =
      existingState && typeof (existingState as any).data === "object" && (existingState as any).data
        ? ((existingState as any).data as Record<string, any>)
        : {};
    await savePatientStateMutation.mutateAsync({
      patientId: selectedPatient.id,
      page: "examination",
      data: {
        ...existingData,
        syncLockManual: true,
        manualEditedAt: new Date().toISOString(),
        serviceCode: "",
        serviceCodes: [],
      },
    });

    const payload = {
      formData: {
        patientName: selectedPatient.fullName ?? "",
        dateOfBirth: formatDate(selectedPatient.dateOfBirth),
        age: selectedPatient.age != null ? String(selectedPatient.age) : "",
        address: selectedPatient.address ?? "",
        phone: selectedPatient.phone ?? "",
        occupation: selectedPatient.occupation ?? "",
      },
    };
    if (
      sheetType !== "surgery" &&
      sheetType !== "surgery_external" &&
      sheetType !== "pentacam_center" &&
      sheetType !== "pentacam_external"
    ) {
      await saveSheetMutation.mutateAsync({
        patientId: selectedPatient.id,
        sheetType,
        content: JSON.stringify(payload),
      });
    }
    const url = getSheetUrl(sheetType, selectedPatient.id, selectedPatient);
    if (url) setLocation(url);
  };

  const openEditDialog = (patient: any) => {
    setEditingPatientId(patient.id);
    setFormData({
      fullName: patient.fullName ?? "",
      patientCode: patient.patientCode ?? "",
      phone: patient.phone ?? "",
      alternatePhone: patient.alternatePhone ?? "",
      dateOfBirth: formatDate(patient.dateOfBirth),
      age: patient.age != null ? String(patient.age) : "",
      gender: patient.gender ?? "",
      nationalId: patient.nationalId ?? "",
      occupation: patient.occupation ?? "",
      referralSource: patient.referralSource ?? "",
      address: patient.address ?? "",
      medicalHistory: patient.medicalHistory ?? "",
      allergies: patient.allergies ?? "",
      serviceType: patient.serviceType ?? "",
      branch: patient.branch ?? "",
      locationType: patient.locationType ?? "",
      doctorId: patient.doctorId ? String(patient.doctorId) : "",
      status: patient.status ?? "",
    });
    setIsEditOpen(true);
  };


  const handleUpdatePatient = () => {
    if (!editingPatientId) return;
    if (!formData.fullName.trim()) {
      toast.error("الاسم الكامل مطلوب");
      return;
    }
    if (!formData.phone.trim()) {
      toast.error("رقم الهاتف مطلوب");
      return;
    }

    updatePatientMutation
      .mutateAsync({
        patientId: editingPatientId,
        updates: {
          patientCode: formData.patientCode.trim(),
          fullName: formData.fullName.trim(),
          phone: formData.phone.trim(),
          alternatePhone: formData.alternatePhone.trim() || undefined,
          dateOfBirth: formData.dateOfBirth || null,
          age: formData.age ? Number(formData.age) : undefined,
          gender: formData.gender || undefined,
          nationalId: formData.nationalId.trim() || undefined,
          occupation: formData.occupation.trim() || undefined,
          referralSource: formData.referralSource.trim() || undefined,
          address: formData.address.trim() || undefined,
          medicalHistory: formData.medicalHistory.trim() || undefined,
          allergies: formData.allergies.trim() || undefined,
          serviceType: formData.serviceType || undefined,
          branch: formData.branch || undefined,
          locationType: formData.locationType || undefined,
          doctorId: formData.doctorId ? Number(formData.doctorId) : undefined,
          status: formData.status || undefined,
        },
      })
      .then(() => {
        toast.success("تم تحديث بيانات المريض");
        setIsEditOpen(false);
        setEditingPatientId(null);
        resetForm();
      })
      .catch(() => {
        toast.error("حدث خطأ أثناء تحديث المريض");
      });
  };

  const handleDeletePatient = (patientId: number) => {
    if (!window.confirm("هل أنت متأكد من حذف المريض؟")) return;
    deletePatientMutation
      .mutateAsync({ patientId })
      .then(() => toast.success("تم حذف المريض"))
      .catch(() => toast.error("حدث خطأ أثناء حذف المريض"));
  };

  const handleSelectPatientForForm = (patient: any) => {
    setSelectedPatient(patient);
    setPatientDraft({
      patientCode: patient.patientCode ?? "",
      fullName: patient.fullName ?? "",
      dateOfBirth: formatDate(patient.dateOfBirth),
      age: patient.age != null ? String(patient.age) : "",
      address: patient.address ?? "",
      phone: patient.phone ?? "",
      occupation: patient.occupation ?? "",
    });
  };

  const handleSavePatientFromForm = async () => {
    if (!patientDraft.fullName.trim()) {
      toast.error("الاسم الكامل مطلوب");
      return;
    }
    if (!patientDraft.phone.trim()) {
      toast.error("رقم الهاتف مطلوب");
      return;
    }

    if (selectedPatient?.id) {
      await updatePatientMutation.mutateAsync({
        patientId: selectedPatient.id,
        updates: {
          patientCode: patientDraft.patientCode.trim(),
          fullName: patientDraft.fullName.trim(),
          phone: patientDraft.phone.trim(),
          age: patientDraft.age ? Number(patientDraft.age) : undefined,
          dateOfBirth: patientDraft.dateOfBirth || undefined,
          address: patientDraft.address.trim(),
          occupation: patientDraft.occupation.trim(),
        },
      });
      toast.success("تم تحديث بيانات المريض");
      patientsQuery.refetch();
      return;
    }

    console.log(`[handleSavePatientFromForm] selectedDoctorId="${selectedDoctorId}", selectedSheetType="${selectedSheetType}"`);
    await createPatientMutation.mutateAsync({
      patientCode: patientDraft.patientCode.trim() || undefined,
      fullName: patientDraft.fullName.trim(),
      phone: patientDraft.phone.trim(),
      age: patientDraft.age ? Number(patientDraft.age) : undefined,
      dateOfBirth: patientDraft.dateOfBirth || undefined,
      address: patientDraft.address.trim(),
      occupation: patientDraft.occupation.trim(),
      branch: "examinations",
      serviceType: toLegacyServiceType(selectedSheetType || "consultant"),
      doctorId: selectedDoctorId ? Number(selectedDoctorId) : undefined,
    });
    setActiveTab(normalizeSheetType(selectedSheetType || "consultant") || "consultant");
    toast.success("تم إضافة المريض");
    setPatientDraft({
      patientCode: "",
      fullName: "",
      dateOfBirth: "",
      age: "",
      address: "",
      phone: "",
      occupation: "",
    });
    setSelectedDoctorId("");
    setSelectedPatient(null);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl" style={{ direction: "rtl", textAlign: "center" }}>
      {/* Header */}
      <PageHeader backTo="/dashboard" />
        <Dialog open={importPreviewOpen} onOpenChange={setImportPreviewOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Import Preview</DialogTitle>
            <DialogDescription>
              {importSummary
                ? `Total: ${importSummary.total}, Valid: ${importSummary.valid}, Invalid: ${importSummary.invalid}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[420px] overflow-auto border rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="p-2 text-right">Row</th>
                  <th className="p-2 text-right">Code</th>
                  <th className="p-2 text-right">Name</th>
                  <th className="p-2 text-right">Status</th>
                  <th className="p-2 text-right">Errors</th>
                </tr>
              </thead>
              <tbody>
                {importPreviewRows.map((r) => (
                  <tr key={`${r.rowNumber}-${r.patientCode}`} className="border-t">
                    <td className="p-2">{r.rowNumber}</td>
                    <td className="p-2">{r.patientCode}</td>
                    <td className="p-2">{r.fullName}</td>
                    <td className="p-2">{r.status}</td>
                    <td className="p-2 text-xs text-destructive">{(r.errors ?? []).join(" | ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={downloadInvalidImportCsv}>
              Download Error CSV
            </Button>
            <Button type="button" onClick={applyStagedImport} disabled={applyImportMutation.isPending}>
              {applyImportMutation.isPending ? "Applying..." : "Apply Valid Rows"}
            </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isEditOpen}
          onOpenChange={(open) => {
            setIsEditOpen(open);
            if (!open) {
              setEditingPatientId(null);
              resetForm();
            }
          }}
        >
          <DialogContent className="max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-right">تعديل بيانات المريض</DialogTitle>
              <DialogDescription className="text-right">
                عدل البيانات الأساسية ثم احفظ التغييرات.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label className="text-right">الاسم</Label>
                  <Input
                    value={formData.fullName}
                    onChange={(event) => setFormData((prev) => ({ ...prev, fullName: event.target.value }))}
                    className="text-right"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-right">كود المريض</Label>
                  <Input
                    value={formData.patientCode}
                    onChange={(event) => setFormData((prev) => ({ ...prev, patientCode: event.target.value }))}
                    className="text-right"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label className="text-right">الموبايل</Label>
                  <Input
                    value={formData.phone}
                    onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
                    className="text-right"
                    dir="ltr"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-right">موبايل بديل</Label>
                  <Input
                    value={formData.alternatePhone}
                    onChange={(event) => setFormData((prev) => ({ ...prev, alternatePhone: event.target.value }))}
                    className="text-right"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label className="text-right">تاريخ الميلاد</Label>
                  <Input
                    value={formData.dateOfBirth}
                    placeholder="DD/MM/YYYY"
                    onChange={(event) => setFormData((prev) => ({ ...prev, dateOfBirth: normalizeTypedDateInput(event.target.value) }))}
                    className="text-right"
                    dir="ltr"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-right">السن</Label>
                  <Input
                    value={formData.age}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, age: event.target.value.replace(/\D+/g, "") }))
                    }
                    className="text-right"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label className="text-right">النوع</Label>
                  <Select
                    value={formData.gender || undefined}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, gender: value }))}
                  >
                    <SelectTrigger className="text-right">
                      <SelectValue placeholder="اختر النوع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">ذكر</SelectItem>
                      <SelectItem value="female">أنثى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-right">الرقم القومي</Label>
                  <Input
                    value={formData.nationalId}
                    onChange={(event) => setFormData((prev) => ({ ...prev, nationalId: event.target.value }))}
                    className="text-right"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label className="text-right">المهنة</Label>
                  <Input
                    value={formData.occupation}
                    onChange={(event) => setFormData((prev) => ({ ...prev, occupation: event.target.value }))}
                    className="text-right"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-right">مصدر التحويل</Label>
                  <Input
                    value={formData.referralSource}
                    onChange={(event) => setFormData((prev) => ({ ...prev, referralSource: event.target.value }))}
                    className="text-right"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label className="text-right">العنوان</Label>
                  <Textarea
                    value={formData.address}
                    onChange={(event) => setFormData((prev) => ({ ...prev, address: event.target.value }))}
                    className="text-right"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-right">تاريخ مرضي</Label>
                  <Textarea
                    value={formData.medicalHistory}
                    onChange={(event) => setFormData((prev) => ({ ...prev, medicalHistory: event.target.value }))}
                    className="text-right"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label className="text-right">حساسية</Label>
                <Textarea
                  value={formData.allergies}
                  onChange={(event) => setFormData((prev) => ({ ...prev, allergies: event.target.value }))}
                  className="text-right"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label className="text-right">نوع الخدمة</Label>
                  <Select
                    value={formData.serviceType || undefined}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, serviceType: value }))}
                  >
                    <SelectTrigger className="text-right">
                      <SelectValue placeholder="اختر نوع الخدمة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consultant">Consultant</SelectItem>
                      <SelectItem value="specialist">Specialist</SelectItem>
                      <SelectItem value="pentacam_center">Pentacam (Center)</SelectItem>
                      <SelectItem value="pentacam_external">Pentacam (External)</SelectItem>
                      <SelectItem value="lasik">Lasik</SelectItem>
                      <SelectItem value="external">External</SelectItem>
                      <SelectItem value="surgery">Surgery</SelectItem>
                      <SelectItem value="surgery_external">Surgery (External)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-right">الفرع</Label>
                  <Input
                    value={formData.branch}
                    onChange={(event) => setFormData((prev) => ({ ...prev, branch: event.target.value }))}
                    className="text-right"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label className="text-right">الموقع</Label>
                  <Select
                    value={formData.locationType || undefined}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, locationType: value }))}
                  >
                    <SelectTrigger className="text-right">
                      <SelectValue placeholder="اختر الموقع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="center">المركز</SelectItem>
                      <SelectItem value="external">خارجي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-right">الطبيب المعالج</Label>
                  <Select
                    value={selectedDoctorId}
                    onValueChange={(value) => setSelectedDoctorId(value)}
                  >
                    <SelectTrigger className="text-right">
                      <SelectValue placeholder="اختر الطبيب" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {availableDoctors.map((doctor) => (
                        <SelectItem key={doctor.id} value={doctor.id}>
                          {doctor.code ? `${doctor.code} - ${doctor.name}` : doctor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label className="text-right">الحالة</Label>
                <Input
                  value={formData.status}
                  onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value }))}
                  className="text-right"
                />
              </div>
            </div>
            <div className="flex items-center justify-start gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditOpen(false);
                  setEditingPatientId(null);
                  resetForm();
                }}
              >
                إلغاء
              </Button>
              <Button
                type="button"
                onClick={handleUpdatePatient}
                disabled={updatePatientMutation.isPending}
              >
                {updatePatientMutation.isPending ? "جارٍ الحفظ..." : "حفظ"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
  
        {/* Main Content */}
        <PullToRefresh
          onRefresh={async () => {
            await Promise.all([
            patientsQuery.refetch(),
            doctorDirectoryQuery.refetch(),
            serviceDirectoryQuery.refetch(),
            userStateQuery.refetch(),
          ]);
        }}
        className="min-h-screen"
      >
      <main className="container mx-auto px-4 py-8">

        {(patientsQuery.isError || doctorDirectoryQuery.isError || serviceDirectoryQuery.isError) && (
          <div className="mb-6">
            <OfflinePageState
              title="تعذر تحديث بيانات المرضى"
              body="قد لا تظهر أحدث قائمة مرضى أو الأدلة المرجعية حتى يعود الاتصال. جرّب المزامنة مرة أخرى."
              onRetry={() => {
                void patientsQuery.refetch();
                void doctorDirectoryQuery.refetch();
                void serviceDirectoryQuery.refetch();
              }}
            />
          </div>
        )}
        {/* TEMPORARILY DISABLED
        {(user?.role === "admin" || user?.role === "reception" || user?.role === "manager") && (
          <div className="mb-6">
            <PatientDataQuickPanel onOpenExamination={() => setLocation("/examination")} />
          </div>
        )}
        */}
        <section className="mb-6 rounded-[1.6rem] border border-slate-200/80 bg-white/90 p-4 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f766e_0%,#2563eb_100%)] text-white shadow-lg shadow-sky-200">
                  <Users2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-black text-slate-900">البحث والأوامر السريعة</div>
                  <div className="text-xs text-slate-500">فلترة، استيراد، تحديد جماعي، وتنقل حسب نوع الشيت</div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
                  نتائج: {filteredPatients.length}
                </Badge>
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                  محدد: {selectedCount}
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 md:gap-3">
              <div className="relative w-full sm:w-[340px] md:w-[520px]">
                <Search className="absolute right-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="ابحث بالاسم أو الكود أو الموبايل أو الدكتور أو الخدمة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => {
                    setIsSearchFocused(true);
                    setActiveSuggestionIndex(-1);
                  }}
                  onBlur={() => {
                    window.setTimeout(() => setIsSearchFocused(false), 120);
                  }}
                  onKeyDown={(event) => {
                    if (!groupedSearchSuggestions.length) return;
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      setIsSearchFocused(true);
                      setActiveSuggestionIndex((prev) =>
                        prev >= flatSearchSuggestions.length - 1 ? 0 : prev + 1
                      );
                      return;
                    }
                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      setIsSearchFocused(true);
                      setActiveSuggestionIndex((prev) =>
                        prev <= 0 ? flatSearchSuggestions.length - 1 : prev - 1
                      );
                      return;
                    }
                    if (event.key === "Enter" && activeSuggestionIndex >= 0) {
                      event.preventDefault();
                      const suggestion = flatSearchSuggestions[activeSuggestionIndex];
                      if (!suggestion) return;
                      setSearchTerm(suggestion.fullName || suggestion.patientCode);
                      setIsSearchFocused(false);
                      setLocation(`/patients/${suggestion.id}`);
                      return;
                    }
                    if (event.key === "Escape") {
                      setIsSearchFocused(false);
                      setActiveSuggestionIndex(-1);
                    }
                  }}
                  className="h-11 rounded-xl border-slate-200 bg-slate-50/70 pr-10 text-right"
                  dir="rtl"
                />
                {isSearchFocused && groupedSearchSuggestions.length > 0 ? (
                  <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
                    <div className="border-b border-slate-100 px-4 py-2 text-right text-xs font-semibold text-slate-500">
                      اقتراحات سريعة
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {(() => {
                        let runningIndex = -1;
                        return groupedSearchSuggestions.map((group) => (
                        <div key={group.key}>
                          <div className="bg-slate-50 px-4 py-2 text-right text-[11px] font-bold text-slate-500">
                            {group.label}
                          </div>
                          {group.items.map((suggestion) => (
                            (() => {
                              runningIndex += 1;
                              const isActive = activeSuggestionIndex === runningIndex;
                              return (
                                <button
                                  key={`${group.key}-${suggestion.id}`}
                                  type="button"
                                  className={`flex w-full items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 text-right transition last:border-b-0 ${
                                    isActive ? "bg-sky-50" : "hover:bg-sky-50"
                                  }`}
                                  onMouseDown={(event) => event.preventDefault()}
                                  onMouseEnter={() => setActiveSuggestionIndex(runningIndex)}
                                  onClick={() => {
                                    setSearchTerm(suggestion.fullName || suggestion.patientCode);
                                    setIsSearchFocused(false);
                                    setActiveSuggestionIndex(-1);
                                    setLocation(`/patients/${suggestion.id}`);
                                  }}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-bold text-slate-900">
                                      {highlightSearchMatch(suggestion.fullName || "بدون اسم", searchTerm)}
                                    </div>
                                    <div className="mt-1 truncate text-xs text-slate-500">
                                      {highlightSearchMatch(suggestion.treatingDoctor || "بدون دكتور", searchTerm)}
                                      {suggestion.serviceLabel ? <> - {highlightSearchMatch(suggestion.serviceLabel, searchTerm)}</> : ""}
                                    </div>
                                  </div>
                                  <div className="shrink-0 text-left text-xs text-slate-500" dir="ltr">
                                    <div>{highlightSearchMatch(suggestion.patientCode || "-", searchTerm)}</div>
                                    <div>{highlightSearchMatch(suggestion.phone || "-", searchTerm)}</div>
                                  </div>
                                </button>
                              );
                            })()
                          ))}
                        </div>
                      ));
                      })()}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="flex w-full sm:w-auto flex-wrap items-center justify-end gap-2">
                <span className="text-sm text-muted-foreground">From (Open Date)</span>
                <Input
                  type="text"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  onBlur={(e) => setDateFrom(normalizeTypedDateInput(e.target.value))}
                  className="w-[140px] rounded-xl border-slate-200 bg-slate-50/70 sm:w-[150px]"
                  placeholder="DD/MM/YYYY"
                  dir="ltr"
                />
                <span className="text-sm text-muted-foreground">To (Open Date)</span>
                <Input
                  type="text"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  onBlur={(e) => setDateTo(normalizeTypedDateInput(e.target.value))}
                  className="w-[140px] rounded-xl border-slate-200 bg-slate-50/70 sm:w-[150px]"
                  placeholder="DD/MM/YYYY"
                  dir="ltr"
                />
              </div>
              {user?.role === "admin" && (
                <>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleImportPatients}
                  />
                  <Select value={importDateFormat} onValueChange={(v) => setImportDateFormat(v as "" | "DMY" | "MDY")}>
                    <SelectTrigger className="w-full rounded-xl border-slate-200 bg-white sm:w-[210px]">
                      <SelectValue placeholder="Excel Date Format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DMY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MDY">MM/DD/YYYY</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="w-full gap-2 rounded-xl border-slate-200 bg-white whitespace-normal text-xs sm:w-auto sm:text-sm"
                  >
                    <Upload className="h-4 w-4" />
                    استيراد من Excel
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>

        <div className="flex gap-4">
          {/* Patients List */}
          <div className="flex-1">
            <div className="mb-3 rounded-[1.4rem] border border-slate-200/80 bg-white/90 p-3 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center gap-2">
              {isAdmin && (
                <>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={(checked) => {
                    if (!checked) {
                      setSelectedRowKeys((prev) => {
                        const next = new Set(prev);
                        filteredRowKeys.forEach((key) => next.delete(key));
                        return next;
                      });
                      return;
                    }
                    setSelectedRowKeys((prev) => {
                      const next = new Set(prev);
                      filteredRowKeys.forEach((key) => next.add(key));
                      return next;
                    });
                  }}
                />
                <span>تحديد الكل</span>
              </label>
                  <Select value={bulkSheetType} onValueChange={(v) => setBulkSheetType(v as any)} disabled={!isAdmin}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="اختر الشيت" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultant">استشاري</SelectItem>
                  <SelectItem value="specialist">اخصائي</SelectItem>
                  <SelectItem value="lasik">فحوصات الليزك</SelectItem>
                  <SelectItem value="external">خارجي</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={async () => {
                  if (!isAdmin) {
                    toast.error("التعديل للأدمن فقط.");
                    return;
                  }
                  const selectedRows = filteredPatients.filter((p) =>
                    selectedRowKeys.has(getPatientRowKey(p))
                  );
                  if (selectedRows.length === 0) {
                    toast.error("Select at least one patient first");
                    return;
                  }
                  const rowsWithoutService = selectedRows.filter((row) => {
                    const code = normalizeServiceCode((row as any).__serviceCodeSingle || (row as any).serviceCode);
                    return !code;
                  });
                  const idsWithoutService = Array.from(
                    new Set(rowsWithoutService.map((row) => Number(row.id)).filter((id) => Number.isFinite(id)))
                  );
                  try {
                    for (const row of selectedRows) {
                      const id = Number(row.id);
                      if (!id) continue;
                      const rowServiceCode = normalizeServiceCode(
                        (row as any).__serviceCodeSingle || (row as any).serviceCode
                      );
                      const existingState = await utils.medical.getPatientPageState
                        .fetch({ patientId: id, page: "examination" })
                        .catch(() => null);
                      const existingData =
                        existingState && typeof (existingState as any).data === "object" && (existingState as any).data
                          ? ((existingState as any).data as Record<string, any>)
                          : {};
                      const serviceSheetTypeByCode =
                        existingData && typeof (existingData as any).serviceSheetTypeByCode === "object"
                          ? { ...(existingData as any).serviceSheetTypeByCode }
                          : {};
                      if (rowServiceCode) {
                        serviceSheetTypeByCode[rowServiceCode] = bulkSheetType;
                      }
                      await savePatientStateMutation.mutateAsync({
                        patientId: id,
                        page: "examination",
                        data: {
                          ...existingData,
                          syncLockManual: true,
                          manualEditedAt: new Date().toISOString(),
                          ...(rowServiceCode ? { serviceSheetTypeByCode } : {}),
                        },
                      });
                    }
                    if (idsWithoutService.length > 0) {
                      await bulkAssignSheetMutation.mutateAsync({
                        patientIds: idsWithoutService,
                        sheetType: toLegacyServiceType(bulkSheetType),
                      });
                    }
                    toast.success("Sheet type updated");
                    await patientsQuery.refetch();
                  } catch (error: any) {
                    const code = String(error?.data?.code ?? "");
                    if (code === "FORBIDDEN" || code === "UNAUTHORIZED") {
                      // Fallback for reception accounts that can update patient rows directly.
                      for (const id of idsWithoutService) {
                        await updatePatientMutation.mutateAsync({
                          patientId: id,
                          updates: { serviceType: toLegacyServiceType(bulkSheetType) },
                        });
                        const existingState = await utils.medical.getPatientPageState
                          .fetch({ patientId: id, page: "examination" })
                          .catch(() => null);
                        const existingData =
                          existingState && typeof (existingState as any).data === "object" && (existingState as any).data
                            ? ((existingState as any).data as Record<string, any>)
                            : {};
                        await savePatientStateMutation.mutateAsync({
                          patientId: id,
                          page: "examination",
                          data: {
                            ...existingData,
                            syncLockManual: true,
                            manualEditedAt: new Date().toISOString(),
                            serviceCode: "",
                            serviceCodes: [],
                          },
                        });
                      }
                      toast.success("Sheet type updated");
                      await patientsQuery.refetch();
                    } else {
                      throw error;
                    }
                  }
                }}
              disabled={!isAdmin}
              >
                نقل للشيت
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  filteredPatients
                    .filter((p) => selectedRowKeys.has(getPatientRowKey(p)))
                    .forEach((row) => handlePrintSheet(activeTab, Number(row.id)));
                }}
              >
                طباعة
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  const rows = filteredPatients.filter((p) =>
                    selectedRowKeys.has(getPatientRowKey(p))
                  );
                  if (rows.length === 0) {
                    toast.error("اختر مرضى للتصدير أولاً");
                    return;
                  }

                  const XLSX = await loadXlsx();
                  const byDoctor = new Map<string, any[]>();
                  for (const patient of rows) {
                    const doctorName = String((patient as any).treatingDoctor ?? "").trim() || "بدون طبيب";
                    if (!byDoctor.has(doctorName)) byDoctor.set(doctorName, []);
                    byDoctor.get(doctorName)!.push(patient);
                  }

                  const safeName = (value: string) =>
                    value
                      .replace(/[<>:"/\\|?*]+/g, "_")
                      .replace(/\s+/g, "_")
                      .replace(/_+/g, "_")
                      .replace(/^_+|_+$/g, "") || "Doctor";

                  const workbook = XLSX.utils.book_new();
                  const usedSheetNames = new Set<string>();
                  const makeUniqueSheetName = (base: string) => {
                    const trimmed = base.slice(0, 31) || "Doctor";
                    if (!usedSheetNames.has(trimmed)) {
                      usedSheetNames.add(trimmed);
                      return trimmed;
                    }
                    let i = 2;
                    while (true) {
                      const suffix = `_${i}`;
                      const candidate = `${trimmed.slice(0, Math.max(1, 31 - suffix.length))}${suffix}`;
                      if (!usedSheetNames.has(candidate)) {
                        usedSheetNames.add(candidate);
                        return candidate;
                      }
                      i += 1;
                    }
                  };

                  for (const [doctorName, doctorRows] of byDoctor.entries()) {
                    const exportRows = doctorRows.map((p: any) => ({
                      patientCode: p.patientCode,
                      fullName: p.fullName,
                      phone: p.phone,
                      age: p.age,
                      gender: p.gender,
                      nationalId: p.nationalId,
                      address: p.address,
                      lastVisit: p.lastVisit,
                      serviceType: p.serviceType,
                      locationType: p.locationType,
                      doctor: (p as any).treatingDoctor ?? "",
                    }));
                    const ws = XLSX.utils.json_to_sheet(exportRows);
                    const sheetName = makeUniqueSheetName(safeName(doctorName));
                    XLSX.utils.book_append_sheet(workbook, ws, sheetName);
                  }

                  XLSX.writeFile(workbook, "patients_by_doctor.xlsx");
                  toast.success(`تم تصدير ملف واحد بعدد ${byDoctor.size} شيت (طبيب)`);
                }}
              >
                تصدير
              </Button>
                </>
              )}
              {user?.role === "admin" && (
                <Button
                  variant="destructive"
                  onClick={async () => {
                    if (!window.confirm("هل أنت متأكد من حذف المرضى المحددين؟")) return;
                    const ids = Array.from(
                      new Set(
                        filteredPatients
                          .filter((p) => selectedRowKeys.has(getPatientRowKey(p)))
                          .map((p) => Number(p.id))
                          .filter((id) => Number.isFinite(id))
                      )
                    );
                    for (const id of ids) {
                      await deletePatientMutation.mutateAsync({ patientId: id });
                    }
                    setSelectedRowKeys(new Set());
                  }}
                >
                  حذف
                </Button>
              )}
              </div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              {tabsConfig.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveTab(tab.value)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm border transition-colors ${
                    activeTab === tab.value ? "border-sky-300 bg-sky-50 text-sky-700 shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
            </div>
            <PatientsTable
              patients={filteredPatients}
              serviceType={activeTab}
              serviceCodeToLabel={serviceCodeToLabel}
              serviceCodeToType={serviceCodeToType}
              onOpenRefraction={handleOpenRefraction}
              onPrintRefraction={handlePrintRefraction}
              onOpenFollowup={handleOpenFollowup}
              onOpenSheet={handleOpenSheet}
              onPrintSheet={handlePrintSheet}
              onDeletePatient={handleDeletePatient}
              onEditPatient={openEditDialog}
              onOpenDetails={(patientId) => {
                prefetchPatientNavigationData(patientId);
                const patient = currentPatients.find((entry) => Number(entry.id) === Number(patientId));
                if (patient) {
                  pushRecentPatient({
                    id: Number(patient.id),
                    name: String(patient.fullName ?? ""),
                    code: String(patient.patientCode ?? ""),
                    serviceType: String((patient as any).__serviceTypeSingle ?? patient.serviceType ?? ""),
                  });
                }
                setLocation(`/patients/${patientId}`);
              }}
              user={user}
              canBulkManage={isAdmin}
              selectedRowKeys={selectedRowKeys}
              onToggleSelect={(rowKey, checked) => {
                setSelectedRowKeys((prev) => {
                  const next = new Set(prev);
                  if (checked) next.add(rowKey);
                  else next.delete(rowKey);
                  return next;
                });
              }}
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm text-muted-foreground rounded-xl border border-slate-200 bg-white/80 px-3 py-2">
                Page {currentPage}
              </div>
              <div className="flex items-center gap-2">
                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                  <SelectTrigger className="w-[110px] rounded-xl border-slate-200 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25 / page</SelectItem>
                    <SelectItem value="50">50 / page</SelectItem>
                    <SelectItem value="100">100 / page</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  className="rounded-xl border-slate-200 bg-white"
                  onClick={() => {
                    if (cursorHistory.length === 0) return;
                    const prev = [...cursorHistory];
                    const previousCursor = prev.pop() ?? null;
                    setCursorHistory(prev);
                    setCursor(previousCursor);
                  }}
                  disabled={cursorHistory.length === 0}
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl border-slate-200 bg-white"
                  onClick={() => {
                    if (!nextCursor) return;
                    setCursorHistory((prev) => [...prev, cursor]);
                    setCursor(nextCursor);
                  }}
                  disabled={!hasMore || !nextCursor}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      </PullToRefresh>
    </div>
  );
}

function PatientDataQuickPanel({ onOpenExamination }: { onOpenExamination: () => void }) {
  const doctorDirectoryQuery = trpc.medical.getDoctorDirectory.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 60 * 60 * 1000,
    refetchOnReconnect: false,
  });
  const availableDoctors = ((doctorDirectoryQuery.data ?? []) as Array<{ id: string; name: string; code: string; isActive?: boolean }>)
    .filter((doctor) => doctor.isActive !== false)
    .sort((a, b) => String(a.code ?? "").localeCompare(String(b.code ?? ""), "en", { numeric: true }));
  const doctorsLoading = !!doctorDirectoryQuery?.isLoading;
  const normalizeServiceType = (value: unknown): "consultant" | "specialist" | "lasik" | "surgery" | "external" => {
    const raw = String(value ?? "").trim().toLowerCase();
    if (raw === "specialist" || raw === "lasik" || raw === "surgery" || raw === "external") return raw;
    return "consultant";
  };
  const formatPatientCode = (value: string) => {
    const raw = String(value ?? "").trim().toUpperCase();
    if (!raw) return "";
    if (/^\d+$/.test(raw)) return raw.padStart(4, "0");
    return raw.replace(/\s+/g, "");
  };
  const calculateAgeFromDob = (dob: string) => {
    const raw = String(dob ?? "").trim();
    if (!raw) return "";
    const date = new Date(`${raw}T00:00:00`);
    if (Number.isNaN(date.valueOf())) return "";
    const now = new Date();
    let age = now.getFullYear() - date.getFullYear();
    const monthDiff = now.getMonth() - date.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) {
      age -= 1;
    }
    return age >= 0 ? String(age) : "";
  };

  const [patientInfo, setPatientInfo] = useState({ id: 0, name: "", code: "" });
  const [patientDetails, setPatientDetails] = useState({
    dateOfBirth: "",
    age: "",
    address: "",
    phone: "",
    job: "",
  });
  const [doctorName, setDoctorName] = useState("");
  const [serviceType, setServiceType] = useState<"consultant" | "specialist" | "lasik" | "surgery" | "external">("consultant");
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().split("T")[0]);
  const hydratedPatientStateRef = useRef<number | null>(null);

  const patientQuery = trpc.patient.getPatient.useQuery(
    patientInfo.id,
    { enabled: Boolean(patientInfo.id), refetchOnWindowFocus: false, staleTime: 5 * 60 * 1000, refetchOnReconnect: false }
  );
  const patientStateQuery = trpc.medical.getPatientPageState.useQuery(
    { patientId: patientInfo.id, page: "examination" },
    { enabled: Boolean(patientInfo.id), refetchOnWindowFocus: false, staleTime: 5 * 60 * 1000, refetchOnReconnect: false }
  );
  const createPatientMutation = trpc.medical.createPatient.useMutation();
  const updatePatientMutation = trpc.medical.updatePatient.useMutation();
  const savePatientStateMutation = trpc.medical.savePatientPageState.useMutation();
  useEffect(() => {
    if (!patientQuery.data) return;
    const p = patientQuery.data as any;
    setPatientInfo({
      id: p.id ?? 0,
      name: p.fullName ?? "",
      code: p.patientCode ?? "",
    });
    setPatientDetails({
      dateOfBirth: p.dateOfBirth ? String(p.dateOfBirth).split("T")[0] : "",
      age: p.age != null ? String(p.age) : "",
      address: p.address ?? "",
      phone: p.phone ?? "",
      job: p.occupation ?? "",
    });
  }, [patientQuery.data]);

  useEffect(() => {
    hydratedPatientStateRef.current = null;
  }, [patientInfo.id]);

  useEffect(() => {
    const stateData = (patientStateQuery.data as any)?.data;
    if (!stateData) return;
    if (hydratedPatientStateRef.current === patientInfo.id) return;
    const doctorFromState =
      String(stateData.doctorName ?? "").trim() ||
      String(stateData.signatures?.doctor ?? "").trim();
    if (doctorFromState) setDoctorName(doctorFromState);
    const visitFromState = String(stateData.visitDate ?? "").trim();
    if (visitFromState) setVisitDate(visitFromState);
    hydratedPatientStateRef.current = patientInfo.id;
  }, [patientStateQuery.data, patientInfo.id]);

  useEffect(() => {
    setPatientDetails((prev) => ({
      ...prev,
      age: calculateAgeFromDob(prev.dateOfBirth),
    }));
  }, [patientDetails.dateOfBirth]);

  const handleSave = async () => {
    try {
      let targetPatientId = Number(patientInfo.id ?? 0);
      if (!targetPatientId) {
        const fullName = String(patientInfo.name ?? "").trim();
        const phone = String(patientDetails.phone ?? "").trim();
        if (!fullName) {
          toast.error("Enter patient name first");
          return;
        }
        if (!phone) {
          toast.error("Enter patient phone first");
          return;
        }
        const created = await createPatientMutation.mutateAsync({
          fullName,
          patientCode: formatPatientCode(patientInfo.code) || undefined,
          dateOfBirth: patientDetails.dateOfBirth || undefined,
          age: patientDetails.age ? Number(patientDetails.age) : undefined,
          phone,
          address: patientDetails.address || undefined,
          occupation: patientDetails.job || undefined,
          branch: "examinations",
          serviceType,
          locationType: "center",
          lastVisit: visitDate || undefined,
        });
        targetPatientId = Number((created as any)?.patientId ?? 0);
        if (!targetPatientId) {
          toast.error("Failed to create patient");
          return;
        }
        setPatientInfo((prev) => ({
          ...prev,
          id: targetPatientId,
          code: String((created as any)?.patientCode ?? prev.code ?? ""),
        }));
      } else {
        await updatePatientMutation.mutateAsync({
          patientId: targetPatientId,
          updates: {
            patientCode: formatPatientCode(patientInfo.code) || undefined,
            fullName: patientInfo.name || undefined,
            dateOfBirth: patientDetails.dateOfBirth || null,
            age: patientDetails.age ? Number(patientDetails.age) : null,
            address: patientDetails.address || null,
            phone: patientDetails.phone || null,
            occupation: patientDetails.job || null,
            serviceType,
          },
        });
      }
      await savePatientStateMutation.mutateAsync({
        patientId: targetPatientId,
        page: "examination",
        data: {
          doctorName,
          visitDate,
          signatures: { doctor: doctorName },
        },
      });
      toast.success("Patient saved");
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "Failed to save patient"));
    }
  };

  return (
    <Card className="overflow-hidden border-slate-200/80 bg-white/92 shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-[linear-gradient(180deg,rgba(248,250,252,0.9),rgba(255,255,255,0.95))]">
        <CardTitle className="text-xl">بيانات المريض</CardTitle>
        <CardDescription>نفس حقول شاشة الفحص</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4" dir="rtl">
        <PatientPicker
          onSelect={(patient: any) =>
            setPatientInfo({
              id: patient.id,
              name: patient.fullName ?? "",
              code: formatPatientCode(patient.patientCode ?? ""),
            })
          }
        />

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
          <div className="grid grid-cols-[90px_1fr] items-center gap-1">
            <Label className="text-sm text-right">الاسم</Label>
            <Input className="h-9 text-right" value={patientInfo.name} onChange={(e) => setPatientInfo((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-[90px_1fr] items-center gap-1">
            <Label className="text-sm text-right">تاريخ الميلاد</Label>
            <Input className="h-9" type="date" value={patientDetails.dateOfBirth} onChange={(e) => setPatientDetails((p) => ({ ...p, dateOfBirth: e.target.value }))} />
          </div>
          <div className="grid grid-cols-[90px_1fr] items-center gap-1">
            <Label className="text-sm text-right">السن</Label>
            <Input className="h-9 text-right" value={patientDetails.age} readOnly />
          </div>
          <div className="grid grid-cols-[90px_1fr] items-center gap-1">
            <Label className="text-sm text-right">الموبايل</Label>
            <Input className="h-9 text-right" value={patientDetails.phone} onChange={(e) => setPatientDetails((p) => ({ ...p, phone: e.target.value.replace(/\D+/g, "") }))} />
          </div>

          <div className="grid grid-cols-[90px_1fr] items-center gap-1">
            <Label className="text-sm text-right">العنوان</Label>
            <Input className="h-9 text-right" value={patientDetails.address} onChange={(e) => setPatientDetails((p) => ({ ...p, address: e.target.value }))} />
          </div>
          <div className="grid grid-cols-[90px_1fr] items-center gap-1">
            <Label className="text-sm text-right">الوظيفة</Label>
            <Input className="h-9 text-right" value={patientDetails.job} onChange={(e) => setPatientDetails((p) => ({ ...p, job: e.target.value }))} />
          </div>
          <div className="grid grid-cols-[90px_1fr] items-center gap-1">
            <Label className="text-sm text-right">كود العميل</Label>
            <Input
              value={patientInfo.code}
              onChange={(e) => setPatientInfo((p) => ({ ...p, code: formatPatientCode(e.target.value) }))}
              onBlur={(e) => setPatientInfo((p) => ({ ...p, code: formatPatientCode(e.target.value) }))}
              dir="ltr"
              className="h-9"
            />
          </div>
          <div className="grid grid-cols-[90px_1fr] items-center gap-1">
            <Label className="text-sm text-right">تاريخ الكشف</Label>
            <Input className="h-9" type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <div className="flex items-center justify-end gap-2">
            <Label className="text-sm text-right whitespace-nowrap">الطبيب</Label>
            <div className="w-full max-w-[420px]">
              <Select value={doctorName} onValueChange={setDoctorName}>
                <SelectTrigger className="h-9 text-right">
                  <SelectValue placeholder={doctorsLoading ? "Loading doctors..." : "اختر الطبيب"} />
                </SelectTrigger>
                <SelectContent>
                  {availableDoctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.name}>
                      {doctor.code} - {doctor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-[90px_1fr] items-center gap-1">
            <Label className="text-sm text-right">نوع الشيت</Label>
            <Select value={serviceType} onValueChange={(value) => setServiceType(normalizeServiceType(value))}>
              <SelectTrigger className="h-9 text-right">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="consultant">استشاري</SelectItem>
                <SelectItem value="specialist">اخصائي</SelectItem>
                <SelectItem value="lasik">ليزك</SelectItem>
                <SelectItem value="surgery">عمليات</SelectItem>
                <SelectItem value="external">خارجي</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSave} disabled={createPatientMutation.isPending || updatePatientMutation.isPending || savePatientStateMutation.isPending}>
            حفظ
          </Button>
          <Button variant="outline" onClick={onOpenExamination}>
            فتح شاشة الفحص
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const formatDisplayDate = (value: any) => {
  if (!value) return "";
  const raw = String(value).trim();
  // If already dd/mm/yyyy, return as-is
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
  // If ISO yyyy-mm-dd, convert
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [yyyy, mm, dd] = raw.split("-");
    return `${dd}/${mm}/${yyyy}`;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const PatientTransactions = memo(function PatientTransactions({
  patientId,
  serviceCodeToLabel,
}: {
  patientId: number;
  serviceCodeToLabel: Map<string, string>;
}) {
  const entriesQuery = trpc.medical.getPatientServiceEntries.useQuery(
    { patientId },
    { refetchOnWindowFocus: false, staleTime: 30_000 }
  );
  const rows = Array.isArray(entriesQuery.data) ? entriesQuery.data : [];

  if (entriesQuery.isLoading) {
    return <div className="text-xs text-muted-foreground">Loading transactions...</div>;
  }
  if (rows.length === 0) {
    return <div className="text-xs text-muted-foreground">No transactions found</div>;
  }

  return (
    <div className="space-y-1 text-xs text-right" dir="rtl">
      {rows.map((entry: any) => {
        const code = normalizeServiceCode(entry?.serviceCode);
        const name = String(serviceCodeToLabel.get(code) ?? entry?.serviceName ?? code ?? "-").trim();
        const date = entry?.serviceDate ? formatDisplayDate(entry.serviceDate) : "";
        return (
          <div key={String(entry?.id ?? `${patientId}-${code}`)} className="rounded border bg-white px-2 py-1.5">
            <div className="flex flex-col items-end gap-0.5" dir="rtl">
              <span className="font-medium">{name}</span>
              <span className="text-muted-foreground">({code || "-"})</span>
              <span>{date || "-"}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
});

const PatientsTable = memo(function PatientsTable({
  patients,
  serviceType,
  serviceCodeToLabel,
  serviceCodeToType,
  onOpenRefraction,
  onPrintRefraction,
  onOpenFollowup,
  onOpenSheet,
    onPrintSheet,
    onDeletePatient,
    onEditPatient,
    onOpenDetails,
    user,
    canBulkManage,
    selectedRowKeys,
    onToggleSelect,
}: {
  patients: any[];
  serviceType: string;
  serviceCodeToLabel: Map<string, string>;
  serviceCodeToType: Map<string, string>;
  onOpenRefraction: (patientId: number) => void;
  onPrintRefraction: (patientId: number) => void;
  onOpenFollowup: (serviceType: string, patientId: number) => void;
    onOpenSheet: (serviceType: string, patientId: number) => void;
    onPrintSheet: (serviceType: string, patientId: number) => void;
    onDeletePatient: (patientId: number) => void;
    onEditPatient: (patient: any) => void;
    onOpenDetails: (patientId: number) => void;
    user: any;
    canBulkManage: boolean;
    selectedRowKeys: Set<string>;
    onToggleSelect: (rowKey: string, checked: boolean) => void;
  }) {
  // Hooks MUST come first, before any conditional logic
  const [isMobile, setIsMobile] = useState(false);
  const desktopTableRef = useRef<HTMLDivElement | null>(null);
  const [tableScrollTop, setTableScrollTop] = useState(0);
  const [tableViewportHeight, setTableViewportHeight] = useState(640);
  const [expandedPatientIds, setExpandedPatientIds] = useState<Set<number>>(new Set());
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 640px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
      mq.addListener(apply);
      return () => mq.removeListener(apply);
    }, []);
  useEffect(() => {
    if (isMobile) return;
    const element = desktopTableRef.current;
    if (!element) return;
    const apply = () => {
      setTableScrollTop(element.scrollTop);
      setTableViewportHeight(element.clientHeight || 640);
    };
    apply();
    element.addEventListener("scroll", apply, { passive: true });
    if (typeof window !== "undefined") {
      window.addEventListener("resize", apply);
    }
    return () => {
      element.removeEventListener("scroll", apply);
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", apply);
      }
    };
  }, [isMobile, patients.length]);

  // Now safe to have conditional logic after hooks
  const canEditPatients = user?.role === "admin" || user?.role === "manager" || user?.role === "reception";
  const isExpanded = (patientId: number) => expandedPatientIds.has(patientId);
  const toggleExpanded = (patientId: number) => {
    setExpandedPatientIds((prev) => {
      const next = new Set(prev);
      if (next.has(patientId)) next.delete(patientId);
      else next.add(patientId);
      return next;
    });
  };
  const getPatientRowKey = (patient: any) =>
    String(
      (patient as any).__rowKey ??
        `${patient.id}-${normalizeServiceCode((patient as any).__serviceCodeSingle || (patient as any).serviceCode || "base")}`
    );
  if (patients.length === 0) {
    return (
      <Card className="border-slate-200/80 bg-white/90 shadow-sm">
        <CardContent className="pt-6 text-center text-muted-foreground">
          لا توجد بيانات مرضى في هذا القسم
        </CardContent>
      </Card>
    );
  }

  const getServiceLabel = (value: string) => {
    const key = normalizeSheetType(value);
    if (key === "consultant") return "استشاري";
    if (key === "specialist") return "اخصائي";
    if (key === "pentacam" || key === "pentacam_center" || key === "pentacam_external") return "بنتاكام";
    if (key === "lasik") return "فحوصات الليزك";
    if (key === "external") return "خارجي";
    if (key === "surgery") return "عمليات";
    return value || "-";
  };
  const getSheetTypeLabel = (value: string) => {
    const raw = String(value ?? "").trim().toLowerCase();
    if (raw === "surgery_external") return "عمليات خارجي";
    const key = normalizeSheetType(value);
    if (key === "consultant") return "استشاري";
    if (key === "specialist") return "اخصائي";
    if (key === "pentacam_center") return "بنتاكام مركز";
    if (key === "pentacam_external") return "بنتاكام خارجي";
    if (key === "lasik") return "فحوصات الليزك";
    if (key === "external") return "خارجي";
    if (key === "surgery") return "عمليات";
    return value || "-";
  };
  const getServiceDisplay = (patient: any) => {
    const singleName = String((patient as any)?.__serviceNameSingle ?? "").trim();
    if (singleName) return singleName;
    const defaultName = String((patient as any)?.__defaultServiceName ?? "").trim();
    if (defaultName) return defaultName;
    const singleCode = normalizeServiceCode((patient as any)?.__serviceCodeSingle);
    if (singleCode) {
      const mapped = String(serviceCodeToLabel.get(singleCode) ?? "").trim();
      if (mapped) return mapped;
    }
    const codes = [
      ...((Array.isArray(patient?.serviceCodes) ? patient.serviceCodes : []) as unknown[]),
      patient?.serviceCode,
    ]
      .map((v) => normalizeServiceCode(v))
      .filter(Boolean);
    if (codes.length > 0) {
      const names = Array.from(
        new Set(
          codes
            .map((code) => String(serviceCodeToLabel.get(code) ?? "").trim())
            .filter(Boolean)
        )
      );
      if (names.length > 0) return names.join(" / ");
    }
    return getServiceLabel(String(patient?.serviceType ?? ""));
  };
  const getRowSheetType = (patient: any) => {
    const singleCode = normalizeServiceCode((patient as any)?.__serviceCodeSingle);
    if (singleCode) {
      const mapped = normalizeSheetType((patient as any)?.serviceSheetTypeByCode?.[singleCode]);
      if (mapped) return mapped;
      const defaultType = normalizeSheetType(serviceCodeToType.get(singleCode));
      if (defaultType) return defaultType;
    }
    const singleType = normalizeSheetType((patient as any)?.__serviceTypeSingle);
    if (singleType) return singleType;
    const fallback = normalizeSheetType(patient?.serviceType ?? serviceType);
    return fallback || serviceType;
  };
  const getRowSheetSource = (patient: any): "manual" | "default" | "fallback" => {
    const singleCode = normalizeServiceCode((patient as any)?.__serviceCodeSingle);
    if (singleCode) {
      const manual = normalizeSheetType((patient as any)?.serviceSheetTypeByCode?.[singleCode]);
      if (manual) return "manual";
      const byDefault = normalizeSheetType(serviceCodeToType.get(singleCode));
      if (byDefault) return "default";
    }
    return "fallback";
  };
  const getSheetSourceLabel = (source: "manual" | "default" | "fallback") => {
    if (source === "manual") return "يدوي";
    if (source === "default") return "افتراضي";
    return "عام";
  };
  const shouldVirtualizeDesktop = !isMobile && patients.length > 80;
  const desktopRowHeight = 48;
  const overscanRows = 8;
  const visibleDesktopRange = (() => {
    if (!shouldVirtualizeDesktop) {
      return {
        start: 0,
        end: patients.length,
        topSpacer: 0,
        bottomSpacer: 0,
      };
    }
    const visibleCount = Math.max(1, Math.ceil(tableViewportHeight / desktopRowHeight));
    const start = Math.max(0, Math.floor(tableScrollTop / desktopRowHeight) - overscanRows);
    const end = Math.min(patients.length, start + visibleCount + overscanRows * 2);
    const topSpacer = start * desktopRowHeight;
    const bottomSpacer = Math.max(0, (patients.length - end) * desktopRowHeight);
    return { start, end, topSpacer, bottomSpacer };
  })();
  const desktopPatients = shouldVirtualizeDesktop
    ? patients.slice(visibleDesktopRange.start, visibleDesktopRange.end)
    : patients;
  const desktopColSpan = canBulkManage ? 9 : 8;

  if (isMobile) {
    return (
      <div className="mt-1 space-y-2">
        {patients.map((patient) => {
          const serviceLabel = getServiceDisplay(patient);
          const displayCode = patient.patientCode
            ? /^\d+$/.test(String(patient.patientCode))
              ? String(patient.patientCode).padStart(4, "0")
              : String(patient.patientCode)
            : "";
          return (
            <Card
              key={String((patient as any).__rowKey ?? patient.id)}
              className="cursor-pointer overflow-hidden border-slate-200/80 bg-white/92 shadow-sm transition-colors hover:border-sky-200 hover:bg-sky-50/30"
              onClick={() => onOpenDetails(patient.id)}
            >
              <CardContent className="space-y-3 p-3">
                <div className="flex items-center justify-between gap-2">
                  {canBulkManage ? (
                    <label
                      className="flex items-center gap-2"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Checkbox
                        checked={selectedRowKeys.has(getPatientRowKey(patient))}
                        onCheckedChange={(checked) => onToggleSelect(getPatientRowKey(patient), Boolean(checked))}
                      />
                      <span className="text-xs text-muted-foreground">تحديد</span>
                    </label>
                  ) : (
                    <span />
                  )}
                  <span
                    className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700"
                  >
                    {serviceLabel}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2" dir="rtl">
                  <div className="text-sm font-bold break-words text-slate-900">{patient.fullName}</div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 rounded-lg border-slate-200 bg-white p-0"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleExpanded(Number(patient.id));
                    }}
                  >
                    {isExpanded(Number(patient.id)) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-1 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 text-xs">
                  <div className="text-muted-foreground">الكود</div>
                  <div dir="ltr" className="text-right">{displayCode || "-"}</div>
                  <div className="text-muted-foreground">الدكتور</div>
                  <div className="text-right">{String((patient as any).treatingDoctor ?? "").trim() || "-"}</div>
                  <div className="text-muted-foreground">نوع الشيت</div>
                  <div className="text-right">
                    <span>{getSheetTypeLabel(getRowSheetType(patient))}</span>
                    <span className="mr-2 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {getSheetSourceLabel(getRowSheetSource(patient))}
                    </span>
                  </div>
                  <div className="text-muted-foreground">تاريخ فتح الملف</div>
                  <div dir="ltr" className="text-right">{patient.lastVisit ? formatDisplayDate(patient.lastVisit) : ""}</div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 w-9 rounded-xl border-sky-200 bg-sky-50 p-0 text-sky-700 shadow-sm hover:border-sky-300 hover:bg-sky-100"
                    title="فتح الشيت"
                    aria-label="فتح الشيت"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenSheet(getRowSheetType(patient), patient.id);
                    }}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                  {canEditPatients && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 w-9 rounded-xl border-amber-200 bg-amber-50 p-0 text-amber-700 shadow-sm hover:border-amber-300 hover:bg-amber-100"
                      title="تعديل المريض"
                      aria-label="تعديل المريض"
                      onClick={(event) => {
                        event.stopPropagation();
                        onEditPatient(patient);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 w-9 rounded-xl border-slate-200 bg-white p-0 shadow-sm"
                    title="طباعة الشيت"
                    aria-label="طباعة الشيت"
                    onClick={(event) => {
                      event.stopPropagation();
                      onPrintSheet(getRowSheetType(patient), patient.id);
                    }}
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                  {user?.role === "admin" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-9 w-9 rounded-xl p-0 shadow-sm"
                      title="حذف المريض"
                      aria-label="حذف المريض"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeletePatient(patient.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {isExpanded(Number(patient.id)) ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-2">
                    <PatientTransactions patientId={Number(patient.id)} serviceCodeToLabel={serviceCodeToLabel} />
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
        <Card className="mt-1 overflow-hidden border-slate-200/80 bg-white/92 shadow-sm">
          <CardContent className="pt-6">
            <div
              ref={desktopTableRef}
              className="w-full overflow-auto patients-table-wrap"
              style={{ maxHeight: "70vh" }}
            >
                <table className="patients-table min-w-[840px] w-max table-auto text-center text-xs md:text-sm" dir="rtl">
                <colgroup>
                  {canBulkManage ? <col className="w-[44px]" /> : null}
                  <col className="w-[72px]" />
                  <col className="w-[190px]" />
                  <col className="w-[130px]" />
                  <col className="w-[105px]" />
                  <col className="w-[120px]" />
                  <col className="w-[118px]" />
                  <col className="w-[250px]" />
                </colgroup>
                <thead className="sticky top-0 z-10 bg-slate-50/95 shadow-[0_1px_0_rgba(148,163,184,0.25)] backdrop-blur">
                  <tr className="border-b border-slate-200">
                  {canBulkManage ? <th className="bg-slate-50/95 text-center py-2 px-1 whitespace-nowrap">تحديد</th> : null}
                  <th className="bg-slate-50/95 text-center py-2 px-1 whitespace-nowrap">الكود</th>
                  <th className="bg-slate-50/95 text-center py-2 px-1 whitespace-nowrap">الاسم</th>
                  <th className="bg-slate-50/95 text-center py-2 px-1 whitespace-nowrap">تاريخ الميلاد</th>
                  <th className="bg-slate-50/95 text-center py-2 px-1 whitespace-nowrap">الدكتور</th>
                  <th className="bg-slate-50/95 text-center py-2 px-1 whitespace-nowrap">الخدمة</th>
                  <th className="bg-slate-50/95 text-center py-2 px-1 whitespace-nowrap">نوع الشيت</th>
                  <th className="bg-slate-50/95 text-center py-2 px-1 whitespace-nowrap">تاريخ فتح الملف</th>
                  <th className="bg-slate-50/95 text-center py-2 px-1 whitespace-nowrap">الإجراءات</th>
                </tr>
            </thead>
            <tbody>
              {shouldVirtualizeDesktop && visibleDesktopRange.topSpacer > 0 ? (
                <tr aria-hidden="true">
                  <td colSpan={desktopColSpan} style={{ height: `${visibleDesktopRange.topSpacer}px`, padding: 0 }} />
                </tr>
              ) : null}
              {desktopPatients.map((patient) => (
                <Fragment key={String((patient as any).__rowKey ?? patient.id)}>
                <tr
                  className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-sky-50/60"
                  onClick={() => onOpenDetails(patient.id)}
                >
                  {canBulkManage ? (
                    <td className="py-0 px-0.5 text-center" dir="ltr" onClick={(event) => event.stopPropagation()}>
                      <Checkbox
                        checked={selectedRowKeys.has(getPatientRowKey(patient))}
                        onCheckedChange={(checked) => onToggleSelect(getPatientRowKey(patient), Boolean(checked))}
                      />
                    </td>
                  ) : null}
                  <td className="py-0 px-0.5 text-center" dir="ltr">
                    {patient.patientCode
                      ? (/^\d+$/.test(String(patient.patientCode))
                        ? String(patient.patientCode).padStart(4, "0")
                        : patient.patientCode)
                      : ""}
                  </td>
                  <td className="py-0 px-0.5 text-center break-words">
                    <div className="flex flex-col items-end gap-1" dir="rtl">
                      <div className="flex items-center justify-end gap-2">
                        <span>{patient.fullName}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 rounded-lg border-slate-200 bg-white p-0"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleExpanded(Number(patient.id));
                          }}
                        >
                          {isExpanded(Number(patient.id)) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                      {isExpanded(Number(patient.id)) ? (
                        <div className="w-full rounded border border-slate-200 bg-slate-50/60 p-2 text-right">
                          <PatientTransactions patientId={Number(patient.id)} serviceCodeToLabel={serviceCodeToLabel} />
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td className="py-0 px-0.5 text-center" dir="ltr">
                    {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString("ar-EG", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, "/") : "-"}
                  </td>
                  <td className="py-0 px-0.5 text-center break-words">
                    {String((patient as any).treatingDoctor ?? "").trim() || "-"}
                  </td>
                  <td className="py-0 px-0.5 text-center">-</td>
                  <td className="py-0 px-0.5 text-center">
                    <span>{getSheetTypeLabel(getRowSheetType(patient))}</span>
                    <span className="mr-2 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {getSheetSourceLabel(getRowSheetSource(patient))}
                    </span>
                  </td>
                  <td className="py-0 px-0.5 text-center" dir="ltr">
                    {patient.lastVisit ? formatDisplayDate(patient.lastVisit) : ""}
                  </td>
                  <td className="py-0 px-0.5">
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 rounded-lg border-sky-200 bg-sky-50 p-0 text-sky-700 shadow-sm hover:border-sky-300 hover:bg-sky-100"
                        title="فتح الشيت"
                        aria-label="فتح الشيت"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenSheet(getRowSheetType(patient), patient.id);
                        }}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      {canEditPatients && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 rounded-lg border-amber-200 bg-amber-50 p-0 text-amber-700 shadow-sm hover:border-amber-300 hover:bg-amber-100"
                          title="تعديل المريض"
                          aria-label="تعديل المريض"
                          onClick={(event) => {
                            event.stopPropagation();
                            onEditPatient(patient);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 rounded-lg border-slate-200 bg-white p-0 shadow-sm"
                        title="طباعة الشيت"
                        aria-label="طباعة الشيت"
                        onClick={(event) => {
                          event.stopPropagation();
                          onPrintSheet(getRowSheetType(patient), patient.id);
                        }}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      {user?.role === "admin" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 w-8 rounded-lg p-0 shadow-sm"
                          title="حذف المريض"
                          aria-label="حذف المريض"
                          onClick={(event) => {
                            event.stopPropagation();
                            onDeletePatient(patient.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              </Fragment>
              ))}
              {shouldVirtualizeDesktop && visibleDesktopRange.bottomSpacer > 0 ? (
                <tr aria-hidden="true">
                  <td colSpan={desktopColSpan} style={{ height: `${visibleDesktopRange.bottomSpacer}px`, padding: 0 }} />
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
});





