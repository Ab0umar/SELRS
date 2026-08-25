import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import MedicalFilePanel from "@/components/MedicalFilePanel";
import ConsultantSheet from "@/pages/ConsultantSheet";
import { useTodayQueuePatientsMerged } from "@/hooks/useTodayQueuePatientsMerged";
import { localISODate } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import {
  SPHERE_OPTIONS,
  CYLINDER_OPTIONS,
  UCVA_BCVA_OPTIONS,
  ADD_OPTIONS,
} from "@/lib/refractionOptions";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  Plus,
  X,
  ClipboardList,
  FileText,
  Info,
  Printer,
  Save,
  ScanLine,
  Send,
  Stethoscope,
  Syringe,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type StageId =
  "reception" | "nursing" | "specialist" | "pentacam" | "consultant";
type WorkflowTabId = StageId | "lasik";
type WorkflowSectionId =
  | "measurements"
  | "examination"
  | "diagnosis"
  | "consultantSheet"
  | "final"
  | "pentacam"
  | "tests"
  | "prescription";
type VisitType = "consultation" | "lasik";
type DoctorSheet = "specialist" | "consultant" | "lasik";
type Eye = "od" | "os";

const displayDateValue = (value: unknown): string => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? ""
      : value.toLocaleDateString("en-CA");
  }
  return value == null ? "" : String(value);
};

const calculateAgeAtDate = (birthValue: unknown, atValue: unknown): string => {
  const birth = new Date(displayDateValue(birthValue));
  const at = new Date(displayDateValue(atValue));
  if (Number.isNaN(birth.getTime()) || Number.isNaN(at.getTime())) return "";
  let age = at.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    at.getMonth() < birth.getMonth() ||
    (at.getMonth() === birth.getMonth() && at.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? String(age) : "";
};

type Refraction = { s: string; c: string; a: string };
type WorkflowData = {
  reception: {
    fullName: string;
    nationalId: string;
    dateOfBirth: string;
    age: string;
    gender: string;
    mobile: string;
    address: string;
    occupation: string;
    medicalHistory: string;
    previousOperations: string;
    medicationsAllergies: string;
    notes: string;
  };
  nursing: {
    ucva: Record<Eye, string>;
    bcva: Record<Eye, string>;
    iop: Record<Eye, string>;
    autoref: Record<Eye, Refraction>;
    after: Record<Eye, Refraction>;
    notes: string;
  };
  specialist: {
    complains: string;
    bcva: Record<Eye, string>;
    distance: Record<Eye, Refraction>;
    reading: string;
    diseases: string;
    diagnosis: string;
    testsRays: string;
    prescription: string;
    externalAppearance: { ptosis: boolean; squint: boolean; others: string };
    muscleAction: "Normal" | "Abnormal";
    otherAbnormalities: string;
    fundus: "Normal" | "Abnormal";
  };
  pentacam: {
    od: { k1: string; k2: string; axis: string; thinnestLocation: string };
    os: { k1: string; k2: string; axis: string; thinnestLocation: string };
    notes: string;
  };
  consultant: {
    diseases: string;
    diagnosis: string;
    testsRays: string;
    prescription: string;
    finalDecision: string;
  };
};

const stageMeta: Array<{
  id: StageId;
  label: string;
  subtitle: string;
  icon: typeof UserRound;
}> = [
  {
    id: "reception",
    label: "الاستقبال",
    subtitle: "تسجيل المريض",
    icon: UserRound,
  },
  {
    id: "nursing",
    label: "التمريض",
    subtitle: "UCVA / IOP / Autoref / After",
    icon: Syringe,
  },
  {
    id: "specialist",
    label: "الأخصائي",
    subtitle: "الفحص والبيانات الطبية",
    icon: Stethoscope,
  },
  { id: "pentacam", label: "Pentacam", subtitle: "عند الحاجة", icon: ScanLine },
  {
    id: "consultant",
    label: "الاستشاري",
    subtitle: "المراجعة والاعتماد",
    icon: ClipboardList,
  },
];

const acuityOptions = UCVA_BCVA_OPTIONS;
const sphereOptions = SPHERE_OPTIONS;
const cylinderOptions = CYLINDER_OPTIONS;
const readingOptions = ADD_OPTIONS;
const eyeOrder: Eye[] = ["od", "os"];

const workflowSectionMeta: Array<{
  id: WorkflowSectionId;
  label: string;
  shortLabel: string;
  optional?: boolean;
  icon: typeof Activity;
}> = [
  {
    id: "measurements",
    label: "القياسات",
    shortLabel: "قياسات",
    icon: Activity,
  },
  { id: "examination", label: "الفحص", shortLabel: "فحص", icon: Stethoscope },
  {
    id: "diagnosis",
    label: "التشخيص",
    shortLabel: "تشخيص",
    icon: ClipboardList,
  },
  {
    id: "pentacam",
    label: "Pentacam",
    shortLabel: "Pentacam",
    optional: true,
    icon: ScanLine,
  },
  {
    id: "tests",
    label: "تحاليل وأشعة",
    shortLabel: "تحاليل",
    optional: true,
    icon: FileText,
  },
  {
    id: "prescription",
    label: "الروشتة",
    shortLabel: "روشتة",
    optional: true,
    icon: ClipboardList,
  },
  {
    id: "consultantSheet",
    label: "الملف",
    shortLabel: "الملف",
    icon: ClipboardList,
  },
  { id: "final", label: "الشيت النهائي", shortLabel: "نهائي", icon: FileText },
];

function stageForQueueStatus(status?: string): StageId {
  switch (status) {
    case "pentacam":
      return "pentacam";
    case "clinic2":
      return "consultant";
    case "clinic1":
      return "specialist";
    case "treated":
      return "consultant";
    case "checkedIn":
    case "next":
    default:
      return "nursing";
  }
}

const createInitialData = (): WorkflowData => ({
  reception: {
    fullName: "",
    nationalId: "",
    dateOfBirth: "",
    age: "",
    gender: "",
    mobile: "",
    address: "",
    occupation: "",
    medicalHistory: "",
    previousOperations: "",
    medicationsAllergies: "",
    notes: "",
  },
  nursing: {
    ucva: { od: "", os: "" },
    bcva: { od: "", os: "" },
    iop: { od: "", os: "" },
    autoref: {
      od: { s: "", c: "", a: "" },
      os: { s: "", c: "", a: "" },
    },
    after: {
      od: { s: "", c: "", a: "" },
      os: { s: "", c: "", a: "" },
    },
    notes: "",
  },
  specialist: {
    complains: "",
    bcva: { od: "", os: "" },
    distance: {
      od: { s: "", c: "", a: "" },
      os: { s: "", c: "", a: "" },
    },
    reading: "",
    diseases: "",
    diagnosis: "",
    testsRays: "",
    prescription: "",
    externalAppearance: { ptosis: false, squint: false, others: "" },
    muscleAction: "Normal",
    otherAbnormalities: "",
    fundus: "Normal",
  },
  pentacam: {
    od: { k1: "", k2: "", axis: "", thinnestLocation: "" },
    os: { k1: "", k2: "", axis: "", thinnestLocation: "" },
    notes: "",
  },
  consultant: {
    diseases: "",
    diagnosis: "",
    testsRays: "",
    prescription: "",
    finalDecision: "",
  },
});

function Field({
  label,
  value,
  onChange,
  dir = "rtl",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  dir?: "rtl" | "ltr";
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-600">
        {label}
      </span>
      <Input
        dir={dir}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-lg disabled:opacity-100"
      />
    </label>
  );
}

function SelectBox({
  label,
  value,
  options,
  onChange,
  ariaLabel,
}: {
  label?: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  return (
    <label className="block" dir="ltr">
      {label ? (
        <span className="mb-1 block text-[11px] font-semibold text-slate-500">
          {label}
        </span>
      ) : null}
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-center text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

type CatalogItem = { id: string | number; name: string };

const referenceMedicationId = (name: string) => {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) | 0;
  }
  return -1_000_000 - Math.abs(hash);
};

function CatalogSearchSelect({
  label,
  placeholder,
  searchText,
  onSearchTextChange,
  items,
  selectedIds,
  onToggle,
  isLoading,
  isError,
  errorText,
  selectedEmptyText = "No selected items",
  selectedItemsLast = false,
}: {
  label: string;
  placeholder: string;
  searchText: string;
  onSearchTextChange: (value: string) => void;
  items: CatalogItem[];
  selectedIds: Array<string | number>;
  onToggle: (item: CatalogItem) => void;
  isLoading?: boolean;
  isError?: boolean;
  errorText: string;
  selectedEmptyText?: string;
  selectedItemsLast?: boolean;
}) {
  const normalizedSearch = searchText.trim().toLowerCase();
  const filteredItems = items.filter((item) =>
    String(item.name ?? "")
      .toLowerCase()
      .includes(normalizedSearch),
  );

  return (
    <div className="space-y-2">
      <span className="block text-xs font-semibold text-slate-600">
        {label}
      </span>
      {!selectedItemsLast && selectedIds.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedIds.map((selectedId) => {
            const item = items.find(
              (candidate) => String(candidate.id) === String(selectedId),
            );
            return (
              <span
                key={String(selectedId)}
                className="inline-flex max-w-full items-center gap-1 rounded-md bg-blue-100 px-2 py-1 text-[10px] text-blue-900"
              >
                <span className="min-w-0 truncate">
                  {item?.name ?? String(selectedId)}
                </span>
                <button
                  type="button"
                  onClick={() => item && onToggle(item)}
                  className="text-blue-700 hover:text-destructive"
                  aria-label={`Remove ${item?.name ?? selectedId}`}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      ) : null}
      <div className="relative">
        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          dir="ltr"
          placeholder={placeholder}
          value={searchText}
          onChange={(event) => onSearchTextChange(event.target.value)}
          className="h-8 pl-8 text-xs"
        />
      </div>
      {searchText ? (
        isLoading ? (
          <p className="text-xs text-muted-foreground">Loading...</p>
        ) : isError ? (
          <p className="text-xs text-destructive">{errorText}</p>
        ) : (
          <div className="max-h-[160px] space-y-1 overflow-y-auto rounded-md border border-slate-200 p-1.5">
            {filteredItems.length === 0 ? (
              <p className="px-1.5 text-xs text-muted-foreground">
                {selectedEmptyText.replace("عناصر مختارة", "نتائج")}
              </p>
            ) : (
              filteredItems.map((item) => {
                const checked = selectedIds.some(
                  (selectedId) => String(selectedId) === String(item.id),
                );
                return (
                  <label
                    key={String(item.id)}
                    className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-slate-50"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => onToggle(item)}
                    />
                    <span className="flex-1">{item.name}</span>
                  </label>
                );
              })
            )}
          </div>
        )
      ) : null}
      {selectedItemsLast && selectedIds.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedIds.map((selectedId) => {
            const item = items.find(
              (candidate) => String(candidate.id) === String(selectedId),
            );
            return (
              <span
                key={String(selectedId)}
                className="inline-flex max-w-full items-center gap-1 rounded-md bg-blue-100 px-2 py-1 text-[10px] text-blue-900"
              >
                <span className="min-w-0 truncate">
                  {item?.name ?? String(selectedId)}
                </span>
                <button
                  type="button"
                  onClick={() => item && onToggle(item)}
                  className="text-blue-700 hover:text-destructive"
                  aria-label={`Remove ${item?.name ?? selectedId}`}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

const READY_PRESCRIPTION_TABS = [
  "Tracoma",
  "بديل دموع",
  "مضاد حيوي",
  "عياده",
  "تصحيح ابصار",
  "جلوكوما",
  "التهاب قرنيه",
  "أخرى 1",
  "أخرى 2",
  "أخرى 3",
];
const READY_TEST_TABS = ["مياه بيضاء", "ليزك", "زراعة عدسات", "اخري"];

const stripTemplateCategory = (value: string) =>
  String(value ?? "")
    .replace(/^\\[(.+?)\\]\\s*/, "")
    .trim();

const templateCategory = (name: string, tabs: string[]) =>
  tabs.find((tab) => name.includes(tab)) ?? "اخري";

function RefractionInputs({
  value,
  onChange,
  title,
}: {
  value: Refraction;
  onChange: (value: Refraction) => void;
  title: string;
}) {
  return (
    <div
      className="grid grid-cols-[74px_repeat(3,minmax(0,1fr))] items-end gap-2"
      dir="ltr"
    >
      <span className="pb-2 text-xs font-bold text-slate-600">{title}</span>
      <SelectBox
        value={value.s}
        options={sphereOptions}
        onChange={(s) => onChange({ ...value, s })}
        ariaLabel={`${title} S`}
      />
      <SelectBox
        value={value.c}
        options={cylinderOptions}
        onChange={(c) => onChange({ ...value, c })}
        ariaLabel={`${title} C`}
      />
      <Input
        dir="ltr"
        value={value.a}
        onChange={(event) => onChange({ ...value, a: event.target.value })}
        aria-label={`${title} A`}
        placeholder="Axis"
        className="h-9 text-center text-xs"
      />
    </div>
  );
}

function Panel({
  title,
  subtitle,
  icon: Icon,
  children,
  active = false,
}: {
  title: string;
  subtitle?: string;
  icon: typeof UserRound;
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <Card
      className={`overflow-hidden border-slate-200 shadow-sm ${active ? "ring-2 ring-blue-100" : ""}`}
    >
      <CardHeader className="border-b border-slate-100 bg-white pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${active ? "bg-blue-700 text-white" : "bg-blue-50 text-blue-700"}`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              {subtitle ? (
                <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
              ) : null}
            </div>
          </div>
          {active ? (
            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
              قيد التنفيذ
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">{children}</CardContent>
    </Card>
  );
}

function ReadonlySummary({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="mb-2 text-xs font-bold text-slate-500">{title}</p>
      <div className="text-sm leading-6 text-slate-800">{children}</div>
    </div>
  );
}

export default function WorkflowPrototypeLive() {
  const { user } = useAuth();
  const [activeStage, setActiveStage] = useState<StageId>("reception");
  const [visitType, setVisitType] = useState<VisitType>("consultation");
  const [doctorSheet, setDoctorSheet] = useState<DoctorSheet | null>(null);
  const [completed, setCompleted] = useState<StageId[]>([]);
  const [data, setData] = useState<WorkflowData>(() => createInitialData());
  const [selectedLivePatientId, setSelectedLivePatientId] = useState<
    number | null
  >(null);
  const [selectedLiveVisitId, setSelectedLiveVisitId] = useState<number | null>(
    null,
  );
  const [selectedDate, setSelectedDate] = useState(
    () =>
      new URLSearchParams(window.location.search).get("visitDate") ??
      localISODate(),
  );
  const [openSheetStage, setOpenSheetStage] = useState<StageId | null>(null);
  const [embeddedSheetPath, setEmbeddedSheetPath] = useState<string | null>(
    null,
  );
  const [activeSection, setActiveSection] =
    useState<WorkflowSectionId>("measurements");
  const [optionalSections, setOptionalSections] = useState<WorkflowSectionId[]>(
    [],
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [symptomSearchText, setSymptomSearchText] = useState("");
  const [diseaseSearchText, setDiseaseSearchText] = useState("");
  const [testSearchText, setTestSearchText] = useState("");
  const [medicationSearchText, setMedicationSearchText] = useState("");
  const [selectedSymptomIds, setSelectedSymptomIds] = useState<string[]>([]);
  const [selectedDiseaseIds, setSelectedDiseaseIds] = useState<
    Array<string | number>
  >([]);
  const [selectedTestIds, setSelectedTestIds] = useState<
    Array<string | number>
  >([]);
  const [selectedMedicationIds, setSelectedMedicationIds] = useState<
    Array<string | number>
  >([]);
  const [referenceMedicationItems, setReferenceMedicationItems] = useState<
    CatalogItem[]
  >([]);
  const symptomsQuery = trpc.medical.getAllSymptoms.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const diseasesQuery = trpc.medical.getAllDiseases.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const testsQuery = trpc.medical.getAllTests.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const medicationsQuery = trpc.medical.getAllMedications.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const referenceMedicationsQuery =
    trpc.medical.searchEgyptianDrugReference.useQuery(
      { query: medicationSearchText.trim(), limit: 25 },
      {
        enabled: medicationSearchText.trim().length >= 2,
        refetchOnWindowFocus: false,
        staleTime: 10 * 60 * 1000,
      },
    );
  useEffect(() => {
    const incoming = (referenceMedicationsQuery.data?.items ?? []).map(
      (drug) => ({
        id: referenceMedicationId(drug.commercialNameEn),
        name: drug.commercialNameEn,
      }),
    );
    if (!incoming.length) return;
    setReferenceMedicationItems((current) => {
      const byId = new Map(current.map((item) => [String(item.id), item]));
      incoming.forEach((item) => byId.set(String(item.id), item));
      return Array.from(byId.values()).slice(-200);
    });
  }, [referenceMedicationsQuery.data?.items]);
  const testTemplatesQuery = trpc.medical.getReadyTemplateOverrides.useQuery(
    { scope: "tests" },
    { refetchOnWindowFocus: false },
  );
  const prescriptionTemplatesQuery =
    trpc.medical.getReadyTemplateOverrides.useQuery(
      { scope: "prescription" },
      { refetchOnWindowFocus: false },
    );
  const doctorDirectoryQuery = trpc.medical.getDoctorDirectory.useQuery(
    undefined,
    {
      enabled: user?.role === "doctor",
      refetchOnWindowFocus: false,
    },
  );
  const roleDefaultSection = useMemo<WorkflowSectionId | null>(() => {
    if (user?.role === "nurse") return "measurements";
    if (user?.role !== "doctor") return null;
    const userName = String(user.name ?? "")
      .trim()
      .toLowerCase();
    const username = String(user.username ?? "")
      .trim()
      .toLowerCase();
    const doctor = ((doctorDirectoryQuery.data as any[]) ?? []).find((item) => {
      const doctorName = String(item.name ?? "")
        .trim()
        .toLowerCase();
      const doctorCode = String(item.code ?? "")
        .trim()
        .toLowerCase();
      return (
        (userName && doctorName === userName) ||
        (username && doctorCode === username)
      );
    });
    return doctor?.doctorType === "specialist"
      ? "examination"
      : doctor?.doctorType === "consultant"
        ? "consultantSheet"
        : null;
  }, [doctorDirectoryQuery.data, user?.name, user?.role, user?.username]);
  const roleDefaultAppliedRef = useRef(false);
  useEffect(() => {
    if (roleDefaultAppliedRef.current || !roleDefaultSection) return;
    roleDefaultAppliedRef.current = true;
    setActiveSection(roleDefaultSection);
  }, [roleDefaultSection]);
  const liveQueue = useTodayQueuePatientsMerged(selectedDate);
  const trpcUtils = trpc.useUtils();
  const livePatients = useMemo(() => {
    const allowedTypes = new Set(["specialist", "consultant", "lasik"]);
    return liveQueue.merged.filter((patient) => {
      const serviceType = String(patient.serviceType ?? "")
        .trim()
        .toLowerCase();
      const locationType = String(patient.locationType ?? "")
        .trim()
        .toLowerCase();
      return locationType === "center" && allowedTypes.has(serviceType);
    });
  }, [liveQueue.merged]);
  const requestedVisitId = useMemo(() => {
    const raw = new URLSearchParams(window.location.search).get("visitId");
    const value = raw ? Number(raw) : NaN;
    return Number.isFinite(value) ? value : null;
  }, []);
  const requestedVisitHandledRef = useRef(false);
  useEffect(() => {
    if (
      requestedVisitHandledRef.current ||
      requestedVisitId === null ||
      livePatients.length === 0
    )
      return;
    const patient = livePatients.find(
      (item) => Number(item.visitId) === requestedVisitId,
    );
    if (patient) {
      requestedVisitHandledRef.current = true;
      selectLivePatient(patient.id, patient.visitId ?? null);
    }
  }, [requestedVisitId, livePatients]);
  const effectiveLivePatientId =
    selectedLivePatientId ??
    (requestedVisitId !== null &&
    !requestedVisitHandledRef.current &&
    liveQueue.isLoading
      ? null
      : (livePatients[0]?.id ?? null));
  const selectedLivePatient = useMemo(
    () =>
      livePatients.find(
        (patient) =>
          patient.id === effectiveLivePatientId &&
          (selectedLiveVisitId == null ||
            Number(patient.visitId) === selectedLiveVisitId),
      ) ??
      livePatients.find((patient) => patient.id === effectiveLivePatientId) ??
      null,
    [livePatients, effectiveLivePatientId, selectedLiveVisitId],
  );
  const [workflowVisitId, setWorkflowVisitId] = useState<number | undefined>();
  useEffect(() => {
    setWorkflowVisitId(selectedLivePatient?.visitId);
  }, [selectedLivePatient?.id, selectedLivePatient?.visitId]);
  const activeWorkflowVisitId =
    workflowVisitId ?? selectedLivePatient?.visitId ?? undefined;
  useEffect(() => {
    if (!activeWorkflowVisitId) return;
    setData(createInitialData());
  }, [activeWorkflowVisitId]);
  const queueStatusMutation = trpc.medical.updateVisitQueueStatus.useMutation({
    onSuccess: async () => {
      await trpcUtils.medical.getTodayPatientsByQueueStatus.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "تعذر تحديث مرحلة الزيارة");
    },
  });
  const doctorReportQuery = trpc.medical.getDoctorReportsByVisit.useQuery(
    { visitId: activeWorkflowVisitId ?? 0 },
    {
      enabled: Boolean(activeWorkflowVisitId),
      refetchOnWindowFocus: false,
    },
  );
  const finalSheetDataQuery = trpc.medical.getSheetEntry.useQuery(
    {
      patientId: selectedLivePatient?.id ?? 0,
      visitId: activeWorkflowVisitId,
      sheetType: "consultant",
    },
    {
      enabled: Boolean(selectedLivePatient?.id),
      refetchOnWindowFocus: false,
    },
  );
  const finalPatientQuery = trpc.patient.getPatient.useQuery(
    selectedLivePatient?.id ?? 0,
    { enabled: Boolean(selectedLivePatient?.id), refetchOnWindowFocus: false },
  );
  const finalVisitsQuery = trpc.medical.getVisitsByPatient.useQuery(
    { patientId: selectedLivePatient?.id ?? 0 },
    { enabled: Boolean(selectedLivePatient?.id), refetchOnWindowFocus: false },
  );
  const finalMedicalHistoryQuery =
    trpc.medical.getMedicalHistoryByPatient.useQuery(
      { patientId: selectedLivePatient?.id ?? 0 },
      {
        enabled: Boolean(selectedLivePatient?.id),
        refetchOnWindowFocus: false,
      },
    );
  const finalTestRequestsQuery = trpc.medical.getTestRequestsByVisit.useQuery(
    { visitId: activeWorkflowVisitId ?? 0 },
    { enabled: Boolean(activeWorkflowVisitId), refetchOnWindowFocus: false },
  );
  const finalPrescriptionsQuery =
    trpc.medical.getPrescriptionsWithItemsByVisit.useQuery(
      { visitId: activeWorkflowVisitId ?? 0 },
      {
        enabled: Boolean(activeWorkflowVisitId),
        refetchOnWindowFocus: false,
      },
    );
  const replaceFinalTestRequestMutation =
    trpc.medical.replaceTestRequest.useMutation();
  const replaceFinalPrescriptionMutation =
    trpc.medical.replacePrescriptionWithItems.useMutation();
  const updateFinalDoctorReportMutation =
    trpc.medical.updateDoctorReport.useMutation();
  const createFinalDoctorReportMutation =
    trpc.medical.createDoctorReport.useMutation();
  const [isSavingFinalReport, setIsSavingFinalReport] = useState(false);

  useEffect(() => {
    setSelectedTestIds(
      ((finalTestRequestsQuery.data as any[]) ?? []).flatMap((request) =>
        (request.items ?? []).map((item: any) => item.testId),
      ),
    );
  }, [activeWorkflowVisitId, finalTestRequestsQuery.data]);

  useEffect(() => {
    setSelectedMedicationIds(
      ((finalPrescriptionsQuery.data as any[]) ?? []).flatMap((prescription) =>
        (prescription.items ?? []).map((item: any) => item.medicationId),
      ),
    );
  }, [activeWorkflowVisitId, finalPrescriptionsQuery.data]);
  const selectedPatientServicesQuery =
    trpc.medical.getPatientServiceEntries.useQuery(
      { patientId: selectedLivePatient?.id ?? 0 },
      {
        enabled: Boolean(selectedLivePatient?.id),
        refetchOnWindowFocus: false,
      },
    );
  const selectedFileSheetType = useMemo<"consultant" | "lasik">(() => {
    const visitDate = selectedDate.slice(0, 10);
    const visitCodes = ((selectedPatientServicesQuery.data as any[]) ?? [])
      .filter((entry) =>
        String(entry.serviceDate ?? entry.createdAt ?? "")
          .slice(0, 10)
          .startsWith(visitDate),
      )
      .map((entry) => String(entry.serviceCode ?? "").trim());
    const fallbackCodes = [
      String(selectedLivePatient?.serviceCode ?? "").trim(),
      ...(selectedLivePatient?.serviceCodes ?? []).map((code) =>
        String(code).trim(),
      ),
    ];
    const codes = new Set(
      (visitCodes.length > 0 ? visitCodes : fallbackCodes).filter(Boolean),
    );
    if (codes.has("1502")) return "lasik";
    if (codes.has("1589") || codes.has("1586")) return "consultant";
    return "consultant";
  }, [selectedDate, selectedLivePatient, selectedPatientServicesQuery.data]);
  const finalExaminationsQuery = trpc.medical.getExaminationsByPatient.useQuery(
    { patientId: selectedLivePatient?.id ?? 0 },
    { enabled: Boolean(selectedLivePatient?.id), refetchOnWindowFocus: false },
  );
  const finalAutorefQuery = trpc.medical.getAutorefractometryByPatient.useQuery(
    { patientId: selectedLivePatient?.id ?? 0 },
    { enabled: Boolean(selectedLivePatient?.id), refetchOnWindowFocus: false },
  );
  const finalAfterQuery = trpc.medical.getAfterRefractionByPatient.useQuery(
    { patientId: selectedLivePatient?.id ?? 0 },
    { enabled: Boolean(selectedLivePatient?.id), refetchOnWindowFocus: false },
  );
  const finalGlassesQuery = trpc.medical.getGlassesRecordsByPatient.useQuery(
    { patientId: selectedLivePatient?.id ?? 0 },
    { enabled: Boolean(selectedLivePatient?.id), refetchOnWindowFocus: false },
  );
  const finalPentacamQuery = trpc.medical.getPentacamResultsByVisit.useQuery(
    { visitId: activeWorkflowVisitId ?? 0 },
    {
      enabled: Boolean(activeWorkflowVisitId),
      refetchOnWindowFocus: false,
    },
  );
  useEffect(() => {
    const report = (doctorReportQuery.data as any)?.[0];
    if (!report || !activeWorkflowVisitId) return;
    let diseases = "";
    try {
      const parsed = JSON.parse(String(report.additionalNotes ?? ""));
      diseases = Array.isArray(parsed)
        ? parsed
            .map((item) => item?.name ?? item)
            .filter(Boolean)
            .join("، ")
        : String(report.additionalNotes ?? "");
    } catch {
      diseases = String(report.additionalNotes ?? "");
    }
    setData((current) => ({
      ...current,
      specialist: {
        ...current.specialist,
        complains: String(
          report.clinicalOpinion ?? current.specialist.complains,
        ),
        diseases: diseases || current.specialist.diseases,
        diagnosis: String(report.diagnosis ?? current.specialist.diagnosis),
      },
      consultant: {
        ...current.consultant,
        diseases: diseases || current.consultant.diseases,
        diagnosis: String(report.diagnosis ?? current.consultant.diagnosis),
        prescription: String(
          report.prescription ?? current.consultant.prescription,
        ),
        finalDecision: (report.recommendations ||
          current.consultant
            .finalDecision) as WorkflowData["consultant"]["finalDecision"],
      },
    }));
  }, [activeWorkflowVisitId, doctorReportQuery.data]);

  useEffect(() => {
    if (!finalSheetDataQuery.data || !selectedLivePatient?.id) return;
    try {
      const sheet = JSON.parse(finalSheetDataQuery.data);
      const auto = sheet?.examData?.autorefraction ?? {};
      const glasses = sheet?.examData?.glasses ?? {};
      const pentacam = sheet?.examData?.pentacam ?? {};
      const patientData = sheet?.patientData ?? {};
      setData((current) => ({
        ...current,
        reception: {
          ...current.reception,
          fullName: selectedLivePatient.fullName ?? patientData.fullName ?? "",
          dateOfBirth: displayDateValue(
            patientData.dateOfBirth ??
              patientData.dob ??
              current.reception.dateOfBirth,
          ),
          age: String(patientData.age ?? current.reception.age ?? ""),
          gender: patientData.gender ?? current.reception.gender,
          mobile:
            patientData.mobile ?? patientData.phone ?? current.reception.mobile,
          address: patientData.address ?? current.reception.address,
          occupation: patientData.occupation ?? current.reception.occupation,
          medicalHistory:
            sheet?.formData?.medicalHistory ?? current.reception.medicalHistory,
          previousOperations:
            sheet?.formData?.previousOperations ??
            current.reception.previousOperations,
          medicationsAllergies:
            sheet?.formData?.allergies ??
            current.reception.medicationsAllergies,
        },
        nursing: {
          ...current.nursing,
          ucva: { od: auto?.od?.ucva ?? "", os: auto?.os?.ucva ?? "" },
          bcva: { od: auto?.od?.bcva ?? "", os: auto?.os?.bcva ?? "" },
          iop: {
            od: auto?.od?.iop ?? auto?.od?.airPuff1 ?? "",
            os: auto?.os?.iop ?? auto?.os?.airPuff1 ?? "",
          },
          autoref: {
            od: {
              s: auto?.od?.s ?? "",
              c: auto?.od?.c ?? "",
              a: auto?.od?.axis ?? auto?.od?.a1 ?? "",
            },
            os: {
              s: auto?.os?.s ?? "",
              c: auto?.os?.c ?? "",
              a: auto?.os?.axis ?? auto?.os?.a1 ?? "",
            },
          },
          after: {
            od: {
              s: auto?.od?.afterS ?? "",
              c: auto?.od?.afterC ?? "",
              a: auto?.od?.afterA ?? "",
            },
            os: {
              s: auto?.os?.afterS ?? "",
              c: auto?.os?.afterC ?? "",
              a: auto?.os?.afterA ?? "",
            },
          },
        },
        specialist: {
          ...current.specialist,
          distance: {
            od: {
              s: glasses?.od?.s ?? "",
              c: glasses?.od?.c ?? "",
              a: glasses?.od?.axis ?? "",
            },
            os: {
              s: glasses?.os?.s ?? "",
              c: glasses?.os?.c ?? "",
              a: glasses?.os?.axis ?? "",
            },
          },
          bcva: {
            od: glasses?.od?.bcva ?? auto?.od?.bcva ?? "",
            os: glasses?.os?.bcva ?? auto?.os?.bcva ?? "",
          },
          reading:
            glasses?.od?.add ?? glasses?.os?.add ?? current.specialist.reading,
          diagnosis: sheet?.formData?.diagnosis ?? current.specialist.diagnosis,
        },
        pentacam: {
          od: {
            k1: pentacam?.od?.k1 ?? "",
            k2: pentacam?.od?.k2 ?? "",
            axis: pentacam?.od?.axis ?? pentacam?.od?.ax1 ?? "",
            thinnestLocation: pentacam?.od?.thinnest ?? "",
          },
          os: {
            k1: pentacam?.os?.k1 ?? "",
            k2: pentacam?.os?.k2 ?? "",
            axis: pentacam?.os?.axis ?? pentacam?.os?.ax1 ?? "",
            thinnestLocation: pentacam?.os?.thinnest ?? "",
          },
          notes: current.pentacam.notes,
        },
        consultant: {
          ...current.consultant,
          diagnosis: sheet?.formData?.diagnosis ?? current.consultant.diagnosis,
          finalDecision: (sheet?.formData?.recommendations ||
            current.consultant
              .finalDecision) as WorkflowData["consultant"]["finalDecision"],
        },
      }));
    } catch {
      toast.error("تعذر تحميل بيانات الشيت النهائي");
    }
  }, [
    activeWorkflowVisitId,
    finalSheetDataQuery.data,
    selectedLivePatient?.id,
  ]);

  useEffect(() => {
    const visitId = activeWorkflowVisitId;
    if (!visitId) return;
    const examination = (finalExaminationsQuery.data ?? []).find(
      (item: any) => Number(item.visitId) === visitId,
    ) as any;
    if (!examination) return;
    const examId = Number(examination.id);
    const autoref = (finalAutorefQuery.data ?? []).find(
      (item: any) => Number(item.examinationId) === examId,
    ) as any;
    const after = (finalAfterQuery.data ?? []).find(
      (item: any) => Number(item.examinationId) === examId,
    ) as any;
    const glasses = (finalGlassesQuery.data ?? []).find(
      (item: any) => Number(item.examinationId) === examId,
    ) as any;
    const pentacam = (finalPentacamQuery.data ?? [])[0] as any;
    const patient = finalPatientQuery.data as any;
    setData((current) => ({
      ...current,
      reception: {
        ...current.reception,
        fullName: patient?.fullName ?? selectedLivePatient?.fullName ?? "",
        nationalId: patient?.nationalId ?? current.reception.nationalId,
        dateOfBirth: displayDateValue(
          patient?.dateOfBirth ??
            patient?.birthDate ??
            current.reception.dateOfBirth,
        ),
        gender: patient?.gender ?? current.reception.gender,
        mobile: patient?.mobile ?? patient?.phone ?? current.reception.mobile,
        address: patient?.address ?? current.reception.address,
        occupation: patient?.occupation ?? current.reception.occupation,
      },
      nursing: {
        ...current.nursing,
        ucva: { od: autoref?.ucvaOD ?? "", os: autoref?.ucvaOS ?? "" },
        bcva: { od: autoref?.bcvaOD ?? "", os: autoref?.bcvaOS ?? "" },
        iop: { od: autoref?.iopOD ?? "", os: autoref?.iopOS ?? "" },
        autoref: {
          od: {
            s: autoref?.sphereOD ?? "",
            c: autoref?.cylinderOD ?? "",
            a: autoref?.axisOD ?? "",
          },
          os: {
            s: autoref?.sphereOS ?? "",
            c: autoref?.cylinderOS ?? "",
            a: autoref?.axisOS ?? "",
          },
        },
        after: {
          od: {
            s: after?.sphereOD ?? "",
            c: after?.cylinderOD ?? "",
            a: after?.axisOD ?? "",
          },
          os: {
            s: after?.sphereOS ?? "",
            c: after?.cylinderOS ?? "",
            a: after?.axisOS ?? "",
          },
        },
      },
      specialist: {
        ...current.specialist,
        distance: {
          od: {
            s: glasses?.sOD ?? "",
            c: glasses?.cOD ?? "",
            a: glasses?.axisOD ?? "",
          },
          os: {
            s: glasses?.sOS ?? "",
            c: glasses?.cOS ?? "",
            a: glasses?.axisOS ?? "",
          },
        },
        bcva: {
          od: glasses?.bcvaOD ?? autoref?.bcvaOD ?? "",
          os: glasses?.bcvaOS ?? autoref?.bcvaOS ?? "",
        },
      },
      pentacam: {
        od: {
          k1: pentacam?.k1OD ?? "",
          k2: pentacam?.k2OD ?? "",
          axis: pentacam?.axisOD ?? "",
          thinnestLocation: pentacam?.thinnestPointOD ?? "",
        },
        os: {
          k1: pentacam?.k1OS ?? "",
          k2: pentacam?.k2OS ?? "",
          axis: pentacam?.axisOS ?? "",
          thinnestLocation: pentacam?.thinnestPointOS ?? "",
        },
        notes: current.pentacam.notes,
      },
    }));
  }, [
    activeWorkflowVisitId,
    finalPatientQuery.data,
    finalExaminationsQuery.data,
    finalAutorefQuery.data,
    finalAfterQuery.data,
    finalGlassesQuery.data,
    finalPentacamQuery.data,
  ]);

  const advanceLiveVisitAfterSave = async () => {
    if (!selectedLivePatient?.visitId) return;
    await Promise.all([
      finalSheetDataQuery.refetch(),
      doctorReportQuery.refetch(),
      finalPatientQuery.refetch(),
      finalVisitsQuery.refetch(),
      finalMedicalHistoryQuery.refetch(),
      finalTestRequestsQuery.refetch(),
      finalPrescriptionsQuery.refetch(),
      finalExaminationsQuery.refetch(),
      finalAutorefQuery.refetch(),
      finalAfterQuery.refetch(),
      finalGlassesQuery.refetch(),
      finalPentacamQuery.refetch(),
    ]);
    const currentStatus = selectedLivePatient.queueStatus;
    let nextStatus: "clinic1" | "clinic2" | null = null;
    if (currentStatus === "checkedIn" || currentStatus === "next") {
      nextStatus = "clinic1";
    } else if (
      currentStatus === "clinic1" &&
      selectedLivePatient.serviceType !== "specialist"
    ) {
      nextStatus = "clinic2";
    } else if (currentStatus === "pentacam") {
      nextStatus = "clinic2";
    }
    if (!nextStatus) return;
    await queueStatusMutation.mutateAsync({
      visitId: selectedLivePatient.visitId,
      patientId: selectedLivePatient.id,
      date: selectedDate,
      queueStatus: nextStatus,
    });
    toast.success(
      nextStatus === "clinic1"
        ? "تم الحفظ وإرسال الحالة للأخصائي"
        : "تم الحفظ وإرسال الحالة للاستشاري",
    );
  };

  const saveFinalReportEdits = async () => {
    if (!selectedLivePatient?.id || !activeWorkflowVisitId) {
      toast.error("لا توجد زيارة محددة للحفظ");
      return;
    }
    setIsSavingFinalReport(true);
    try {
      const report = ((doctorReportQuery.data as any[]) ?? [])[0];
      const diagnosis = data.consultant.diagnosis.trim();
      const recommendations = data.consultant.finalDecision.trim();
      const reportPayload = {
        diagnosis,
        recommendations,
        additionalNotes: JSON.stringify(selectedDiseaseIds),
      };
      if (report?.id) {
        await updateFinalDoctorReportMutation.mutateAsync({
          reportId: report.id,
          ...reportPayload,
        });
      } else if (diagnosis || recommendations || selectedDiseaseIds.length) {
        await createFinalDoctorReportMutation.mutateAsync({
          visitId: activeWorkflowVisitId,
          patientId: selectedLivePatient.id,
          ...reportPayload,
        });
      }

      await replaceFinalTestRequestMutation.mutateAsync({
        patientId: selectedLivePatient.id,
        visitId: activeWorkflowVisitId,
        items: selectedTestIds.map((testId) => ({ testId: Number(testId) })),
      });

      await replaceFinalPrescriptionMutation.mutateAsync({
        patientId: selectedLivePatient.id,
        visitId: activeWorkflowVisitId,
        notes: "Updated from final medical report",
        items: selectedMedicationIds.map((medicationId) => {
          const medication = medicationItems.find(
            (item) => String(item.id) === String(medicationId),
          );
          return {
            medicationId: Number(medicationId),
            medicationName: medication?.name || String(medicationId),
          };
        }),
      });

      await Promise.all([
        doctorReportQuery.refetch(),
        finalTestRequestsQuery.refetch(),
        finalPrescriptionsQuery.refetch(),
      ]);
      toast.success("تم حفظ تعديلات الشيت النهائي");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر حفظ الشيت النهائي",
      );
    } finally {
      setIsSavingFinalReport(false);
    }
  };

  const activeIndex = stageMeta.findIndex((item) => item.id === activeStage);
  const activeMeta = stageMeta[activeIndex];
  const nextMeta = stageMeta[activeIndex + 1];
  const progress = Math.round((completed.length / stageMeta.length) * 100);
  const visibleTabs = useMemo(() => {
    const specialistTab = {
      ...stageMeta[2],
      label: "شيت الأخصائي",
      subtitle: "فتح شيت الكشف",
    };
    const consultantTab = {
      ...stageMeta[4],
      label: "الملف",
      subtitle: "فتح شيت الكشف",
    };
    if (activeStage === "specialist") {
      return [stageMeta[0], stageMeta[1], specialistTab];
    }
    if (activeStage === "consultant") {
      return [stageMeta[0], stageMeta[1], specialistTab, consultantTab];
    }
    if (activeStage === "pentacam") {
      return [
        stageMeta[0],
        stageMeta[1],
        stageMeta[2],
        stageMeta[4],
        {
          id: "lasik" as const,
          label: "شيت الليزك",
          subtitle: "فتح شيت الليزك",
          icon: ScanLine,
        },
      ];
    }
    return stageMeta;
  }, [activeStage]);
  const activeTabId: WorkflowTabId =
    activeStage === "specialist" &&
    (doctorSheet === "specialist" || doctorSheet === "lasik")
      ? doctorSheet
      : activeStage === "consultant" && doctorSheet === "consultant"
        ? "consultant"
        : activeStage === "pentacam"
          ? "lasik"
          : activeStage;

  const update = <K extends keyof WorkflowData>(
    section: K,
    value: WorkflowData[K],
  ) => setData((current) => ({ ...current, [section]: value }));

  const symptomItems = (symptomsQuery.data ?? []) as CatalogItem[];
  const diseaseItems = (diseasesQuery.data ?? []) as CatalogItem[];
  const testItems = (testsQuery.data ?? []) as CatalogItem[];
  const medicationItems = useMemo(() => {
    const localItems = (medicationsQuery.data ?? []) as CatalogItem[];
    const localNames = new Set(
      localItems.map((item) => item.name.trim().toLowerCase()),
    );
    return [
      ...localItems,
      ...referenceMedicationItems.filter(
        (item) => !localNames.has(item.name.trim().toLowerCase()),
      ),
    ];
  }, [medicationsQuery.data, referenceMedicationItems]);
  const selectedNames = (items: CatalogItem[], ids: Array<string | number>) =>
    ids
      .map((id) => items.find((item) => String(item.id) === String(id))?.name)
      .filter(Boolean)
      .join("، ");
  const toggleCatalogId = (
    selectedIds: Array<string | number>,
    item: CatalogItem,
  ) =>
    selectedIds.some((id) => String(id) === String(item.id))
      ? selectedIds.filter((id) => String(id) !== String(item.id))
      : [...selectedIds, item.id];
  const toggleSymptom = (item: CatalogItem) => {
    setSelectedSymptomIds((current) => {
      const next = toggleCatalogId(current, item).map(String);
      setData((previous) => ({
        ...previous,
        specialist: {
          ...previous.specialist,
          complains: selectedNames(symptomItems, next),
        },
      }));
      return next;
    });
  };
  const toggleDisease = (item: CatalogItem) => {
    setSelectedDiseaseIds((current) => {
      const next = toggleCatalogId(current, item);
      const value = selectedNames(diseaseItems, next);
      setData((previous) => ({
        ...previous,
        specialist: { ...previous.specialist, diseases: value },
        consultant: {
          ...previous.consultant,
          diseases: value,
          diagnosis: value,
        },
      }));
      return next;
    });
  };
  const toggleTest = (item: CatalogItem) => {
    setSelectedTestIds((current) => {
      const next = toggleCatalogId(current, item);
      const value = selectedNames(testItems, next);
      setData((previous) => ({
        ...previous,
        specialist: { ...previous.specialist, testsRays: value },
        consultant: { ...previous.consultant, testsRays: value },
      }));
      return next;
    });
  };
  const toggleMedication = (item: CatalogItem) => {
    setSelectedMedicationIds((current) => {
      const next = toggleCatalogId(current, item);
      const value = selectedNames(medicationItems, next);
      setData((previous) => ({
        ...previous,
        specialist: { ...previous.specialist, prescription: value },
        consultant: { ...previous.consultant, prescription: value },
      }));
      return next;
    });
  };
  const markDone = (stage: StageId) =>
    setCompleted((items) => Array.from(new Set([...items, stage])));

  const openWorkflowTab = (tab: WorkflowTabId) => {
    setOpenSheetStage(null);
    setEmbeddedSheetPath(null);
    if (tab === "specialist") {
      setActiveStage("specialist");
      setDoctorSheet("specialist");
      setVisitType("consultation");
      return;
    }
    if (tab === "consultant") {
      setActiveStage("consultant");
      setDoctorSheet("consultant");
      return;
    }
    if (tab === "lasik") {
      setActiveStage("pentacam");
      setDoctorSheet("lasik");
      setVisitType("lasik");
      return;
    }
    setActiveStage(tab);
  };

  const saveAndNext = () => {
    markDone(activeStage);
    if (activeStage === "reception") {
      setActiveStage("nursing");
      toast.success("تم تسجيل المريض. أصبح متاحًا للتمريض.");
      return;
    }
    if (activeStage === "nursing") {
      setActiveStage("specialist");
      toast.success("تم حفظ بيانات التمريض وإرسال الحالة للأخصائي.");
      return;
    }
    if (activeStage === "specialist") {
      if (visitType === "lasik") {
        setActiveStage("pentacam");
        toast.success("تم حفظ الأخصائي. الحالة تحتاج Pentacam.");
      } else {
        setActiveStage("consultant");
        toast.success("تم حفظ الأخصائي وإرسال الحالة للاستشاري.");
      }
      return;
    }
    if (activeStage === "pentacam") {
      setActiveStage("consultant");
      toast.success("تم حفظ Pentacam وإرسال الحالة للاستشاري.");
      return;
    }
    toast.success("تم اعتماد الزيارة التجريبية وإغلاق الـworkflow.");
  };

  const reset = () => {
    setData(createInitialData());
    setActiveStage("reception");
    setCompleted([]);
    setVisitType("consultation");
    setDoctorSheet(null);
    toast.success("تمت إعادة التجربة");
  };
  const printSheet = () => {
    window.setTimeout(() => window.print(), 100);
  };

  const reception = data.reception;
  const nursing = data.nursing;
  const specialist = data.specialist;
  const consultant = data.consultant;

  const renderReception = () => (
    <Panel
      title="تسجيل مريض"
      subtitle="الاستقبال يسجل كل البيانات، ثم ينتهي دوره"
      icon={UserRound}
      active={activeStage === "reception"}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field
          label="اسم المريض"
          value={reception.fullName}
          onChange={(fullName) =>
            update("reception", { ...reception, fullName })
          }
        />
        <Field
          label="رقم الهوية"
          value={reception.nationalId}
          onChange={(nationalId) =>
            update("reception", { ...reception, nationalId })
          }
          dir="ltr"
        />
        <Field
          label="تاريخ الميلاد"
          value={reception.dateOfBirth}
          onChange={(dateOfBirth) =>
            update("reception", { ...reception, dateOfBirth })
          }
          dir="ltr"
        />
        <Field
          label="العمر / النوع"
          value={`${reception.age} سنة - ${reception.gender}`}
          onChange={() => undefined}
          disabled
        />
        <Field
          label="الجوال"
          value={reception.mobile}
          onChange={(mobile) => update("reception", { ...reception, mobile })}
          dir="ltr"
        />
        <div className="sm:col-span-2">
          <Field
            label="العنوان"
            value={reception.address}
            onChange={(address) =>
              update("reception", { ...reception, address })
            }
          />
        </div>
        <Field
          label="نوع الزيارة"
          value={visitType === "lasik" ? "LASIK / عملية" : "كشف استشاري"}
          onChange={() => undefined}
          disabled
        />
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <div>
          <Field
            label="التاريخ المرضي"
            value={reception.medicalHistory}
            onChange={(medicalHistory) =>
              update("reception", { ...reception, medicalHistory })
            }
          />
        </div>
        <div>
          <Field
            label="العمليات السابقة"
            value={reception.previousOperations}
            onChange={(previousOperations) =>
              update("reception", { ...reception, previousOperations })
            }
          />
        </div>
        <div>
          <Field
            label="الأدوية / الحساسية / ملاحظات التسجيل"
            value={`${reception.medicationsAllergies} ${reception.notes}`}
            onChange={(notes) => update("reception", { ...reception, notes })}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-blue-50 p-3 text-sm text-blue-900">
        <span>
          بعد الحفظ تظهر الحالة تلقائيًا للتمريض. لا توجد متابعة استقبال بعد
          التسجيل.
        </span>
        <Button
          type="button"
          variant="outline"
          className="gap-2 bg-white"
          onClick={printSheet}
        >
          <Printer className="h-4 w-4" />
          طباعة الشيت
        </Button>
      </div>
    </Panel>
  );

  const renderNursing = () => (
    <Panel
      title="التمريض"
      subtitle="نفس محتوى MedicalFilePanel داخل نفس صفحة الـworkflow"
      icon={Syringe}
      active={activeStage === "nursing"}
    >
      <div className="space-y-4" dir="ltr">
        <section className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold">AUTOR EF | IOP</h3>
            <SelectBox
              value="all"
              options={[
                "all",
                "autoref",
                "after",
                "refraction",
                "pentacam",
                "fundus",
              ]}
              onChange={() => undefined}
              ariaLabel="عرض القياسات"
            />
          </div>
          <div className="mb-3 grid gap-2 sm:grid-cols-2" dir="ltr">
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-2">
              <span className="w-16 text-xs font-bold">UCVA</span>
              <SelectBox
                value={nursing.ucva.od}
                options={acuityOptions}
                onChange={(ucva) =>
                  update("nursing", {
                    ...nursing,
                    ucva: { ...nursing.ucva, od: ucva },
                  })
                }
                ariaLabel="OD UCVA"
              />
              <span>/</span>
              <SelectBox
                value={nursing.ucva.os}
                options={acuityOptions}
                onChange={(ucva) =>
                  update("nursing", {
                    ...nursing,
                    ucva: { ...nursing.ucva, os: ucva },
                  })
                }
                ariaLabel="OS UCVA"
              />
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-2">
              <span className="w-28 text-xs font-bold">IOP (Air Puff)</span>
              <Input
                dir="ltr"
                value={nursing.iop.od}
                onChange={(event) =>
                  update("nursing", {
                    ...nursing,
                    iop: { ...nursing.iop, od: event.target.value },
                  })
                }
                aria-label="OD IOP"
              />
              <span>/</span>
              <Input
                dir="ltr"
                value={nursing.iop.os}
                onChange={(event) =>
                  update("nursing", {
                    ...nursing,
                    iop: { ...nursing.iop, os: event.target.value },
                  })
                }
                aria-label="OS IOP"
              />
            </div>
          </div>
          <div className="overflow-visible rounded-lg border border-slate-200">
            <table className="w-full max-w-full table-auto text-xs" dir="ltr">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-2 text-left">Eye</th>
                  <th className="p-2 text-left">S</th>
                  <th className="p-2 text-left">C</th>
                  <th className="p-2 text-left">Axis</th>
                </tr>
              </thead>
              <tbody>
                {eyeOrder.map((eye) => (
                  <tr key={eye} className="border-t">
                    <td className="p-2 font-bold">{eye.toUpperCase()}</td>
                    <td className="p-2">
                      <SelectBox
                        value={nursing.autoref[eye].s}
                        options={sphereOptions}
                        onChange={(s) =>
                          update("nursing", {
                            ...nursing,
                            autoref: {
                              ...nursing.autoref,
                              [eye]: { ...nursing.autoref[eye], s },
                            },
                          })
                        }
                        ariaLabel={`${eye} AutoRef S`}
                      />
                    </td>
                    <td className="p-2">
                      <SelectBox
                        value={nursing.autoref[eye].c}
                        options={cylinderOptions}
                        onChange={(c) =>
                          update("nursing", {
                            ...nursing,
                            autoref: {
                              ...nursing.autoref,
                              [eye]: { ...nursing.autoref[eye], c },
                            },
                          })
                        }
                        ariaLabel={`${eye} AutoRef C`}
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        dir="ltr"
                        value={nursing.autoref[eye].a}
                        onChange={(event) =>
                          update("nursing", {
                            ...nursing,
                            autoref: {
                              ...nursing.autoref,
                              [eye]: {
                                ...nursing.autoref[eye],
                                a: event.target.value,
                              },
                            },
                          })
                        }
                        aria-label={`${eye} AutoRef Axis`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-3">
          <h3 className="mb-3 text-sm font-bold">AFTER REFRACTION</h3>
          <div className="overflow-visible rounded-lg border border-slate-200">
            <table className="w-full max-w-full table-auto text-xs" dir="ltr">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-2 text-left">Eye</th>
                  <th className="p-2 text-left">S</th>
                  <th className="p-2 text-left">C</th>
                  <th className="p-2 text-left">Axis</th>
                </tr>
              </thead>
              <tbody>
                {eyeOrder.map((eye) => (
                  <tr key={eye} className="border-t">
                    <td className="p-2 font-bold">{eye.toUpperCase()}</td>
                    <td className="p-2">
                      <SelectBox
                        value={nursing.after[eye].s}
                        options={sphereOptions}
                        onChange={(s) =>
                          update("nursing", {
                            ...nursing,
                            after: {
                              ...nursing.after,
                              [eye]: { ...nursing.after[eye], s },
                            },
                          })
                        }
                        ariaLabel={`${eye} After S`}
                      />
                    </td>
                    <td className="p-2">
                      <SelectBox
                        value={nursing.after[eye].c}
                        options={cylinderOptions}
                        onChange={(c) =>
                          update("nursing", {
                            ...nursing,
                            after: {
                              ...nursing.after,
                              [eye]: { ...nursing.after[eye], c },
                            },
                          })
                        }
                        ariaLabel={`${eye} After C`}
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        dir="ltr"
                        value={nursing.after[eye].a}
                        onChange={(event) =>
                          update("nursing", {
                            ...nursing,
                            after: {
                              ...nursing.after,
                              [eye]: {
                                ...nursing.after[eye],
                                a: event.target.value,
                              },
                            },
                          })
                        }
                        aria-label={`${eye} After Axis`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-3">
          <h3 className="mb-3 text-sm font-bold">PENTACAM</h3>
          <div className="overflow-visible rounded-lg border border-slate-200">
            <table className="w-full max-w-full table-auto text-xs" dir="ltr">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-2 text-left">Eye</th>
                  <th className="p-2 text-left">K1</th>
                  <th className="p-2 text-left">K2</th>
                  <th className="p-2 text-left">Axis</th>
                  <th className="p-2 text-left">Thinnest Location</th>
                </tr>
              </thead>
              <tbody>
                {eyeOrder.map((eye) => (
                  <tr key={eye} className="border-t">
                    <td className="p-2 font-bold">{eye.toUpperCase()}</td>
                    <td className="p-2">
                      <Input
                        dir="ltr"
                        value={data.pentacam[eye].k1}
                        onChange={(event) =>
                          update("pentacam", {
                            ...data.pentacam,
                            [eye]: {
                              ...data.pentacam[eye],
                              k1: event.target.value,
                            },
                          })
                        }
                        aria-label={`${eye} K1`}
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        dir="ltr"
                        value={data.pentacam[eye].k2}
                        onChange={(event) =>
                          update("pentacam", {
                            ...data.pentacam,
                            [eye]: {
                              ...data.pentacam[eye],
                              k2: event.target.value,
                            },
                          })
                        }
                        aria-label={`${eye} K2`}
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        dir="ltr"
                        value={data.pentacam[eye].axis}
                        onChange={(event) =>
                          update("pentacam", {
                            ...data.pentacam,
                            [eye]: {
                              ...data.pentacam[eye],
                              axis: event.target.value,
                            },
                          })
                        }
                        aria-label={`${eye} Axis`}
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        dir="ltr"
                        value={data.pentacam[eye].thinnestLocation}
                        onChange={(event) =>
                          update("pentacam", {
                            ...data.pentacam,
                            [eye]: {
                              ...data.pentacam[eye],
                              thinnestLocation: event.target.value,
                            },
                          })
                        }
                        aria-label={`${eye} Thinnest Location`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <details
          className="rounded-xl border border-slate-200 bg-white p-3"
          dir="ltr"
        >
          <summary className="cursor-pointer text-sm font-bold">
            FUNDUS EXAMINATION
          </summary>
          <p className="mt-3 text-xs leading-5 text-slate-600">
            يتم فتح وتسجيل فحص Fundus من نفس القسم الحالي في MedicalFilePanel.
          </p>
        </details>

        <Field
          label="ملاحظات التمريض"
          value={nursing.notes}
          onChange={(notes) => update("nursing", { ...nursing, notes })}
        />
      </div>
    </Panel>
  );

  const renderDoctorSheetLauncher = (role: "specialist" | "consultant") => (
    <Panel
      title={role === "specialist" ? "فتح شيت الأخصائي" : "فتح شيت الاستشاري"}
      subtitle="كل خدمة تفتح الشيت الخاص بها بنفس محتواه الحالي"
      icon={role === "specialist" ? Stethoscope : ClipboardList}
      active
    >
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <p className="text-sm font-bold text-blue-950">
          الحالة وصلت لمرحلة {role === "specialist" ? "الأخصائي" : "الاستشاري"}.
        </p>
        <p className="mt-1 text-xs leading-5 text-blue-800">
          اختر الشيت الخاص بالخدمة. لن يتم إنشاء نموذج جديد؛ سيتم فتح الشيت
          الموجود حاليًا بنفس بياناته وجدوله.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {role === "specialist" ? (
          <>
            <Button
              type="button"
              className="h-auto justify-start gap-3 p-4 text-right"
              onClick={() => {
                setDoctorSheet("specialist");
                setVisitType("consultation");
                toast.success("تم فتح شيت الأخصائي التجريبي");
              }}
            >
              <Stethoscope className="h-5 w-5" />
              <span>
                <strong className="block">شيت الأخصائي</strong>
                <small className="font-normal opacity-80">
                  الكشف والفحص وRefraction
                </small>
              </span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-auto justify-start gap-3 p-4 text-right"
              onClick={() => {
                setDoctorSheet("lasik");
                setVisitType("lasik");
                toast.success("تم فتح شيت الليزك التجريبي");
              }}
            >
              <ScanLine className="h-5 w-5" />
              <span>
                <strong className="block">شيت الليزك</strong>
                <small className="font-normal">LASIK / يحتاج Pentacam</small>
              </span>
            </Button>
          </>
        ) : (
          <Button
            type="button"
            className="h-auto justify-start gap-3 p-4 text-right"
            onClick={() => {
              setDoctorSheet("consultant");
              toast.success("تم فتح شيت الاستشاري التجريبي");
            }}
          >
            <ClipboardList className="h-5 w-5" />
            <span>
              <strong className="block">شيت الاستشاري</strong>
              <small className="font-normal opacity-80">
                مراجعة البيانات والقرار النهائي
              </small>
            </span>
          </Button>
        )}
      </div>
    </Panel>
  );

  const renderSpecialistSheet = () => (
    <Panel
      title={doctorSheet === "lasik" ? "شيت الليزك" : "شيت الأخصائي"}
      subtitle="الشيت الحالي كما هو محفوظ في النظام"
      icon={Stethoscope}
      active={activeStage === "specialist"}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <Field
          label="Complains"
          value={specialist.complains}
          onChange={(complains) =>
            update("specialist", { ...specialist, complains })
          }
        />
        <div className="rounded-xl border border-slate-200 p-3">
          <h3 className="mb-3 text-sm font-bold" dir="ltr">
            Refraction
          </h3>
          {eyeOrder.map((eye) => (
            <div key={eye} className="mb-3 last:mb-0">
              <p className="mb-2 text-xs font-bold" dir="ltr">
                {eye === "od" ? "OD (Right)" : "OS (Left)"}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <SelectBox
                  label="BCVA"
                  value={specialist.bcva[eye]}
                  options={acuityOptions}
                  onChange={(bcva) =>
                    update("specialist", {
                      ...specialist,
                      bcva: { ...specialist.bcva, [eye]: bcva },
                    })
                  }
                  ariaLabel={`${eye} BCVA`}
                />
                <div>
                  <span
                    className="mb-1 block text-[11px] font-semibold text-slate-500"
                    dir="ltr"
                  >
                    Distance S / C / A
                  </span>
                  <RefractionInputs
                    title=""
                    value={specialist.distance[eye]}
                    onChange={(value) =>
                      update("specialist", {
                        ...specialist,
                        distance: { ...specialist.distance, [eye]: value },
                      })
                    }
                  />
                </div>
              </div>
            </div>
          ))}
          <SelectBox
            label="Reading — shared for OD & OS"
            value={specialist.reading}
            options={["N6", "N8", "N10", "N12"]}
            onChange={(reading) =>
              update("specialist", { ...specialist, reading })
            }
            ariaLabel="Reading shared"
          />
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <Field
          label="Diseases"
          value={specialist.diseases}
          onChange={(diseases) =>
            update("specialist", { ...specialist, diseases })
          }
        />
        <Field
          label="Diagnosis"
          value={specialist.diagnosis}
          onChange={(diagnosis) =>
            update("specialist", { ...specialist, diagnosis })
          }
        />
        <Field
          label="Tests & Rays"
          value={specialist.testsRays}
          onChange={(testsRays) =>
            update("specialist", { ...specialist, testsRays })
          }
        />
      </div>
      <Field
        label="Prescription"
        value={specialist.prescription}
        onChange={(prescription) =>
          update("specialist", { ...specialist, prescription })
        }
      />
      <div className="rounded-xl border border-slate-200 p-4">
        <h3 className="mb-3 text-sm font-bold" dir="ltr">
          Examination
        </h3>
        <div className="grid gap-3 md:grid-cols-2" dir="ltr">
          <div>
            <p className="text-xs font-semibold">1. External Apperance</p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs">
              <label className="flex items-center gap-1">
                <Checkbox
                  checked={specialist.externalAppearance.ptosis}
                  onCheckedChange={(value) =>
                    update("specialist", {
                      ...specialist,
                      externalAppearance: {
                        ...specialist.externalAppearance,
                        ptosis: value === true,
                      },
                    })
                  }
                />
                Ptosis
              </label>
              <label className="flex items-center gap-1">
                <Checkbox
                  checked={specialist.externalAppearance.squint}
                  onCheckedChange={(value) =>
                    update("specialist", {
                      ...specialist,
                      externalAppearance: {
                        ...specialist.externalAppearance,
                        squint: value === true,
                      },
                    })
                  }
                />
                Squint
              </label>
              <Field
                label="Others"
                value={specialist.externalAppearance.others}
                onChange={(others) =>
                  update("specialist", {
                    ...specialist,
                    externalAppearance: {
                      ...specialist.externalAppearance,
                      others,
                    },
                  })
                }
              />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold">2. Muscle action</p>
            <div className="mt-2 flex gap-4 text-xs">
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={specialist.muscleAction === "Normal"}
                  onChange={() =>
                    update("specialist", {
                      ...specialist,
                      muscleAction: "Normal",
                    })
                  }
                />
                Normal
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={specialist.muscleAction === "Abnormal"}
                  onChange={() =>
                    update("specialist", {
                      ...specialist,
                      muscleAction: "Abnormal",
                    })
                  }
                />
                Abnormal
              </label>
            </div>
          </div>
          <Field
            label="3. Other abnormalities"
            value={specialist.otherAbnormalities}
            onChange={(otherAbnormalities) =>
              update("specialist", { ...specialist, otherAbnormalities })
            }
          />
          <div>
            <p className="text-xs font-semibold">4. Fundus</p>
            <div className="mt-2 flex gap-4 text-xs">
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={specialist.fundus === "Normal"}
                  onChange={() =>
                    update("specialist", { ...specialist, fundus: "Normal" })
                  }
                />
                Normal
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={specialist.fundus === "Abnormal"}
                  onChange={() =>
                    update("specialist", { ...specialist, fundus: "Abnormal" })
                  }
                />
                Abnormal
              </label>
            </div>
          </div>
        </div>
      </div>
      <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
        <p className="mb-2 font-bold">مسار الزيارة</p>
        <label className="mr-4 inline-flex items-center gap-2">
          <input
            type="radio"
            checked={visitType === "consultation"}
            onChange={() => setVisitType("consultation")}
          />
          كشف استشاري عادي
        </label>
        <label className="mr-4 inline-flex items-center gap-2">
          <input
            type="radio"
            checked={visitType === "lasik"}
            onChange={() => setVisitType("lasik")}
          />
          LASIK / يحتاج Pentacam
        </label>
      </div>
    </Panel>
  );

  const renderPentacam = () => (
    <Panel
      title="Pentacam"
      subtitle="Text Inputs — OD / OS — الفني والتمريض"
      icon={ScanLine}
      active={activeStage === "pentacam"}
    >
      <div className="overflow-visible rounded-xl border border-slate-200">
        <table className="w-full max-w-full table-auto text-sm" dir="ltr">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3 text-left">Measurement</th>
              <th className="p-3 text-center">OD (Right Eye)</th>
              <th className="p-3 text-center">OS (Left Eye)</th>
            </tr>
          </thead>
          <tbody>
            {(
              [
                ["K1", "k1"],
                ["K2", "k2"],
                ["Axis", "axis"],
                ["Thinnest Location", "thinnestLocation"],
              ] as const
            ).map(([label, key]) => (
              <tr key={key} className="border-t">
                <td className="p-2 font-semibold">{label}</td>
                <td className="p-2">
                  <Input
                    dir="ltr"
                    value={data.pentacam.od[key]}
                    onChange={(event) =>
                      update("pentacam", {
                        ...data.pentacam,
                        od: { ...data.pentacam.od, [key]: event.target.value },
                      })
                    }
                  />
                </td>
                <td className="p-2">
                  <Input
                    dir="ltr"
                    value={data.pentacam.os[key]}
                    onChange={(event) =>
                      update("pentacam", {
                        ...data.pentacam,
                        os: { ...data.pentacam.os, [key]: event.target.value },
                      })
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Field
        label="ملاحظات Pentacam"
        value={data.pentacam.notes}
        onChange={(notes) => update("pentacam", { ...data.pentacam, notes })}
      />
    </Panel>
  );

  const renderConsultantSheet = () => (
    <Panel
      title="شيت الاستشاري"
      subtitle="كل البيانات السابقة ثم القرار النهائي"
      icon={ClipboardList}
      active={activeStage === "consultant"}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ReadonlySummary title="الاستقبال">
          كل البيانات الأساسية والتاريخ المرضي والعمليات السابقة.
        </ReadonlySummary>
        <ReadonlySummary title="التمريض">
          UCVA، IOP (Air Puff)، Autoref، After.
        </ReadonlySummary>
        <ReadonlySummary title="الأخصائي">
          Complains، BCVA، Refraction، Examination.
        </ReadonlySummary>
        <ReadonlySummary title="Pentacam">
          {visitType === "lasik"
            ? "K1، K2، Axis، Thinnest Location."
            : "غير مطلوب في الزيارة الحالية."}
        </ReadonlySummary>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <Field
          label="Diseases & Diagnosis"
          value={consultant.diseases}
          onChange={(diseases) =>
            update("consultant", { ...consultant, diseases })
          }
        />
        <Field
          label="Tests & Rays"
          value={consultant.testsRays}
          onChange={(testsRays) =>
            update("consultant", { ...consultant, testsRays })
          }
        />
        <Field
          label="Prescription"
          value={consultant.prescription}
          onChange={(prescription) =>
            update("consultant", { ...consultant, prescription })
          }
        />
      </div>
      <Field
        label="التشخيص النهائي"
        value={consultant.diagnosis}
        onChange={(diagnosis) =>
          update("consultant", { ...consultant, diagnosis })
        }
      />
      <div className="flex flex-wrap gap-2">
        {["متابعة", "علاج", "عملية", "إحالة"].map((decision) => (
          <Button
            key={decision}
            type="button"
            variant={
              consultant.finalDecision === decision ? "default" : "outline"
            }
            onClick={() =>
              update("consultant", {
                ...consultant,
                finalDecision:
                  decision as WorkflowData["consultant"]["finalDecision"],
              })
            }
          >
            {decision}
          </Button>
        ))}
      </div>
    </Panel>
  );

  const renderActive = () => {
    if (activeStage === "reception") return renderReception();
    if (activeStage === "nursing") return renderNursing();
    if (activeStage === "specialist") {
      return doctorSheet === "specialist" || doctorSheet === "lasik"
        ? renderSpecialistSheet()
        : renderDoctorSheetLauncher("specialist");
    }
    if (activeStage === "pentacam") return renderPentacam();
    return doctorSheet === "consultant"
      ? renderConsultantSheet()
      : renderDoctorSheetLauncher("consultant");
  };

  const selectLivePatient = (
    patientId: number | null,
    visitId: number | null = null,
  ) => {
    setSelectedLivePatientId(patientId);
    setSelectedLiveVisitId(visitId);
    setOpenSheetStage(null);
    setEmbeddedSheetPath(null);
    if (roleDefaultSection) setActiveSection(roleDefaultSection);
    if (patientId == null) return;
    const patient = livePatients.find((item) => item.id === patientId);
    if (!patient) return;
    const stage = stageForQueueStatus(patient.queueStatus);
    setActiveStage(stage);
    if (stage === "nursing") setActiveSection("measurements");
    if (stage === "specialist") setActiveSection("examination");
    if (stage === "pentacam") {
      setOptionalSections((current) =>
        current.includes("pentacam") ? current : [...current, "pentacam"],
      );
      setActiveSection("pentacam");
    }
    if (stage === "consultant") setActiveSection("final");
    setDoctorSheet(
      stage === "specialist"
        ? "specialist"
        : stage === "consultant"
          ? "consultant"
          : stage === "pentacam"
            ? "lasik"
            : null,
    );
  };

  const renderLivePatientPicker = () => (
    <div className="w-[320px] max-w-full min-w-0 shrink-0" dir="ltr">
      <div className="flex items-end gap-2">
        <label className="block w-[135px] shrink-0">
          <span className="mb-0.5 block text-[10px] font-semibold text-slate-600">
            Visit Date
          </span>
          <Input
            type="date"
            value={selectedDate}
            onChange={(event) => {
              setSelectedDate(event.target.value);
              setSelectedLivePatientId(null);
              setSelectedLiveVisitId(null);
            }}
            aria-label="Visit Date"
            className="h-8 text-xs"
          />
        </label>
        <label className="block min-w-0 flex-1">
          <span className="mb-0.5 block text-[10px] font-semibold text-slate-600">
            Patient
          </span>
          <select
            value={selectedLivePatient?.visitId ?? ""}
            onChange={(event) => {
              const visitId = event.target.value
                ? Number(event.target.value)
                : null;
              const patient = livePatients.find(
                (item) => Number(item.visitId) === visitId,
              );
              selectLivePatient(patient?.id ?? null, visitId);
            }}
            className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            aria-label="Patient"
          >
            <option value="">اختر الزيارة</option>
            {livePatients.map((patient) => (
              <option
                key={`${patient.id}-${patient.visitId ?? "visit"}`}
                value={patient.visitId ?? ""}
              >
                {patient.fullName ?? "Unnamed Patient"} — #
                {patient.visitId ?? "—"}
              </option>
            ))}
          </select>
        </label>
      </div>
      {liveQueue.isLoading ? (
        <p className="mt-1 text-[10px] text-slate-500">Loading...</p>
      ) : livePatients.length === 0 ? (
        <p className="mt-1 text-[10px] text-slate-500">No visits found.</p>
      ) : null}
    </div>
  );

  const renderNursingPanel = () => {
    const renderEyeTable = (
      title: string,
      values: Record<Eye, Refraction>,
      onChange: (eye: Eye, value: Refraction) => void,
    ) => {
      const sphereValues = (value: string) =>
        sphereOptions.includes(value)
          ? sphereOptions
          : [value, ...sphereOptions];
      const cylinderValues = (value: string) =>
        cylinderOptions.includes(value)
          ? cylinderOptions
          : [value, ...cylinderOptions];
      return (
        <div className="rounded-lg border border-slate-200 p-2" dir="ltr">
          <h3 className="mb-2 text-sm font-black text-blue-950">{title}</h3>
          <div className="grid grid-cols-[52px_repeat(6,minmax(0,1fr))] items-center gap-1 text-center text-[10px] font-bold">
            <span className="text-left">EYE</span>
            <span className="col-span-3 rounded bg-slate-100 py-1">OD</span>
            <span className="col-span-3 rounded bg-slate-100 py-1">OS</span>
            <span />
            <span>S</span>
            <span>C</span>
            <span>AX</span>
            <span>S</span>
            <span>C</span>
            <span>AX</span>
            <span className="text-left font-black">&lt;R&gt;</span>
            <SelectBox
              value={values.od.s}
              options={sphereValues(values.od.s)}
              onChange={(s) => onChange("od", { ...values.od, s })}
              ariaLabel={title + " OD S"}
            />
            <SelectBox
              value={values.od.c}
              options={cylinderValues(values.od.c)}
              onChange={(c) => onChange("od", { ...values.od, c })}
              ariaLabel={title + " OD C"}
            />
            <Input
              dir="ltr"
              value={values.od.a}
              onChange={(event) =>
                onChange("od", { ...values.od, a: event.target.value })
              }
              aria-label={title + " OD AX"}
              placeholder="AX"
              className="h-9 text-center text-xs"
            />
            <SelectBox
              value={values.os.s}
              options={sphereValues(values.os.s)}
              onChange={(s) => onChange("os", { ...values.os, s })}
              ariaLabel={title + " OS S"}
            />
            <SelectBox
              value={values.os.c}
              options={cylinderValues(values.os.c)}
              onChange={(c) => onChange("os", { ...values.os, c })}
              ariaLabel={title + " OS C"}
            />
            <Input
              dir="ltr"
              value={values.os.a}
              onChange={(event) =>
                onChange("os", { ...values.os, a: event.target.value })
              }
              aria-label={title + " OS AX"}
              placeholder="AX"
              className="h-9 text-center text-xs"
            />
            <span className="text-left font-black">&lt;L&gt;</span>
            <span className="col-span-6 h-0" />
          </div>
        </div>
      );
    };
    return (
      <div className="grid gap-3 lg:grid-cols-2" dir="ltr">
        <Panel title="AUTOREF" subtitle="UCVA / IOP" icon={Activity} active>
          <div className="grid gap-2" dir="ltr">
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
              <span className="text-xs font-black">UCVA</span>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1">
                <SelectBox
                  value={data.nursing.ucva.od}
                  options={acuityOptions}
                  onChange={(value) =>
                    update("nursing", {
                      ...data.nursing,
                      ucva: { ...data.nursing.ucva, od: value },
                    })
                  }
                  ariaLabel="OD UCVA"
                />
                <span>/</span>
                <SelectBox
                  value={data.nursing.ucva.os}
                  options={acuityOptions}
                  onChange={(value) =>
                    update("nursing", {
                      ...data.nursing,
                      ucva: { ...data.nursing.ucva, os: value },
                    })
                  }
                  ariaLabel="OS UCVA"
                />
              </div>
              <span className="text-xs font-black">IOP</span>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1">
                <Input
                  dir="ltr"
                  value={data.nursing.iop.od}
                  onChange={(event) =>
                    update("nursing", {
                      ...data.nursing,
                      iop: { ...data.nursing.iop, od: event.target.value },
                    })
                  }
                  aria-label="OD IOP"
                  className="h-9 text-center text-xs"
                />
                <span>/</span>
                <Input
                  dir="ltr"
                  value={data.nursing.iop.os}
                  onChange={(event) =>
                    update("nursing", {
                      ...data.nursing,
                      iop: { ...data.nursing.iop, os: event.target.value },
                    })
                  }
                  aria-label="OS IOP"
                  className="h-9 text-center text-xs"
                />
              </div>
            </div>
            {renderEyeTable("AUTOREF", data.nursing.autoref, (eye, value) =>
              update("nursing", {
                ...data.nursing,
                autoref: { ...data.nursing.autoref, [eye]: value },
              }),
            )}
          </div>
        </Panel>
        <Panel
          title="AFTER REFRACTION"
          subtitle="OD / OS / S / C / AX"
          icon={Activity}
        >
          <div className="space-y-3" dir="ltr">
            {renderEyeTable(
              "AFTER REFRACTION",
              data.nursing.after,
              (eye, value) =>
                update("nursing", {
                  ...data.nursing,
                  after: { ...data.nursing.after, [eye]: value },
                }),
            )}
            <Field
              label="Nursing Notes"
              value={data.nursing.notes}
              onChange={(value) =>
                update("nursing", { ...data.nursing, notes: value })
              }
              dir="ltr"
            />
          </div>
        </Panel>
      </div>
    );
  };

  const handleEmbeddedSheetLoad = (
    event: SyntheticEvent<HTMLIFrameElement>,
  ) => {
    const document = event.currentTarget.contentDocument;
    if (!document) return;

    const sheetRoot = document.querySelector<HTMLElement>(
      ".consultant-sheet, .specialist-sheet, .lasik-sheet, [data-mobile-pdf-root]",
    );
    if (!sheetRoot) return;

    let current: HTMLElement = sheetRoot;
    while (current.parentElement && current.parentElement !== document.body) {
      const parent = current.parentElement;
      Array.from(parent.children).forEach((child) => {
        if (child !== current && child instanceof HTMLElement) {
          child.style.display = "none";
        }
      });
      current = parent;
    }

    Array.from(document.body.children).forEach((child) => {
      if (child !== current && child instanceof HTMLElement) {
        child.style.display = "none";
      }
    });
    document.body.style.margin = "0";
    document.body.style.background = "white";
    sheetRoot.style.width = "100%";
    sheetRoot.style.maxWidth = "100%";
    sheetRoot.style.margin = "0";
  };

  const openActualSheet = (path: string, label: string) => {
    if (!selectedLivePatient) return;
    const visitQuery = selectedLivePatient.visitId
      ? `?visitId=${encodeURIComponent(String(selectedLivePatient.visitId))}`
      : "";
    toast.success(`تم فتح ${label} داخل صفحة الـWorkflow`);
    setOpenSheetStage(null);
    setEmbeddedSheetPath(`${path}/${selectedLivePatient.id}${visitQuery}`);
  };

  const renderLiveWorkspace = () => {
    if (!selectedLivePatient) return null;

    const optionalSet = new Set(optionalSections);
    const finalReportTab = workflowSectionMeta.find(
      (item) => item.id === "final",
    );
    const tabs = [
      ...workflowSectionMeta.filter(
        (item) =>
          item.id !== "final" && (!item.optional || optionalSet.has(item.id)),
      ),
      ...(finalReportTab ? [finalReportTab] : []),
    ];
    const hasPentacam = [data.pentacam.od, data.pentacam.os].some((eye) =>
      Object.values(eye).some(Boolean),
    );
    const finalPatient = finalPatientQuery.data as any;
    const finalVisit = ((finalVisitsQuery.data as any[]) ?? []).find(
      (visit) => Number(visit.id) === Number(activeWorkflowVisitId),
    );
    const finalReport = ((doctorReportQuery.data as any[]) ?? [])[0];
    const finalHistory = ((finalMedicalHistoryQuery.data as any[]) ?? [])[0];
    let finalSheet: any = {};
    try {
      finalSheet = finalSheetDataQuery.data
        ? JSON.parse(finalSheetDataQuery.data)
        : {};
    } catch {
      finalSheet = {};
    }
    const finalExam = finalSheet?.consultantExam ?? {};
    const hasExaminationData =
      Boolean(finalExam.externalPtosis) ||
      Boolean(finalExam.externalSquint) ||
      Boolean(finalExam.externalOthers) ||
      Boolean(String(finalExam.externalOthersNote ?? "").trim()) ||
      Boolean(finalExam.muscleNormal) ||
      Boolean(finalExam.muscleAbnormal) ||
      Boolean(String(finalExam.otherAbnormalities ?? "").trim()) ||
      Boolean(finalExam.fundusNormal) ||
      Boolean(finalExam.fundusAbnormal);
    const testsRaysSummary = ((finalTestRequestsQuery.data as any[]) ?? [])
      .flatMap((request) => request.items ?? [])
      .map((item) => String(item.testName ?? "").trim())
      .filter(Boolean)
      .join("، ");
    const prescriptionSummary = ((finalPrescriptionsQuery.data as any[]) ?? [])
      .flatMap((prescription) => prescription.items ?? [])
      .map((item) => {
        const details = [
          item.dosage,
          item.frequency,
          item.duration,
          item.instructions,
        ]
          .map((value) => String(value ?? "").trim())
          .filter(Boolean)
          .join(" - ");
        const name = String(item.medicationName ?? "").trim();
        return details ? `${name}: ${details}` : name;
      })
      .filter(Boolean)
      .join("\n");
    const hasTestsRaysSummary = Boolean(testsRaysSummary?.trim());
    const hasPrescriptionSummary = Boolean(prescriptionSummary?.trim());
    const hasMeasurements = [
      ...eyeOrder.flatMap((eye) => [
        ...Object.values(data.nursing.autoref[eye]),
        ...Object.values(data.nursing.after[eye]),
        data.nursing.ucva[eye],
        data.nursing.bcva[eye],
        data.nursing.iop[eye],
        ...Object.values(data.specialist.distance[eye]),
        data.specialist.bcva[eye],
      ]),
      data.specialist.reading,
    ].some(Boolean);
    const complaintSummary = String(
      finalExam.complains || finalVisit?.chiefComplaint || "",
    ).trim();
    const diagnosisSummary = String(finalReport?.diagnosis ?? "").trim();
    const hasDiagnosisSummary = Boolean(diagnosisSummary.trim());
    const finalDecisionSummary = String(
      finalReport?.recommendations ?? finalSheet?.finalDecisionText ?? "",
    ).trim();
    const hasFinalDecision = Boolean(finalDecisionSummary);
    const printWorkflowItems = (kind: "tests" | "prescription") => {
      const isTests = kind === "tests";
      const selectedIds = isTests ? selectedTestIds : selectedMedicationIds;
      const sourceItems = isTests ? testItems : medicationItems;
      const names = selectedIds.map((id) => {
        const item = sourceItems.find(
          (entry) => String(entry.id) === String(id),
        );
        return String(item?.name ?? id);
      });
      const escapeHtml = (value: unknown) =>
        String(value ?? "")
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#039;");
      const content = names.length
        ? names
            .map(
              (name, index) =>
                `<div class="item"><b>${isTests ? `${index + 1}. ` : ""}${escapeHtml(name)}</b></div>`,
            )
            .join("")
        : '<div class="empty">لا توجد عناصر مسجلة</div>';
      const frame = document.createElement("iframe");
      frame.setAttribute("aria-hidden", "true");
      frame.style.cssText =
        "position:fixed;width:1px;height:1px;right:-10000px;bottom:0;opacity:0";
      frame.srcdoc = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${isTests ? "طلب تحاليل وأشعة" : "روشتة علاج"}</title><style>@page{size:A5;margin:0}*{box-sizing:border-box}body{width:132mm;margin:35mm auto 0;font-family:Arial,"Segoe UI",sans-serif;color:#111}.head{border-bottom:1px solid #17468f;padding-bottom:2.4mm;margin-bottom:3mm}.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:2mm 5mm;font-size:9.5pt;line-height:1.25}.diagnosis{grid-column:1/-1;border-top:1px solid #d1d5db;padding-top:1.5mm;text-align:center}.list{direction:ltr;text-align:left;margin-top:3mm;border:1px solid #e5e5e5;font-size:10pt;line-height:1.3}.rx{border-bottom:1px solid #e5e5e5;font-size:12pt;padding:2.5mm 2mm;font-weight:800}.item{min-height:11.3mm;padding:2.5mm 3.5mm;border-bottom:1px solid #e5e5e5;break-inside:avoid}.item:last-child{border-bottom:0}.empty{text-align:center;padding:8mm;color:#666}.sign{margin-top:12mm;border-top:1px solid #bbb;padding-top:3mm;font-size:9.5pt}</style></head><body><div class="head"><div class="meta"><div>الاسم: <b>${escapeHtml(selectedLivePatient.fullName)}</b></div><div>الكود: <b>${escapeHtml(selectedLivePatient.patientCode)}</b></div><div>التاريخ: <b>${escapeHtml(selectedDate)}</b></div><div class="diagnosis">التشخيص: <b>${escapeHtml(data.consultant.diagnosis || diagnosisSummary)}</b></div></div></div><div class="list">${isTests ? "" : '<div class="rx">RX :</div>'}${content}</div><div class="sign">توقيع الطبيب: ................................</div></body></html>`;
      frame.onload = () =>
        window.setTimeout(() => frame.contentWindow?.print(), 30);
      document.body.appendChild(frame);
      window.setTimeout(() => frame.remove(), 60_000);
    };
    const medicalHistorySummary = [
      finalHistory?.diabetes && "سكر",
      finalHistory?.hypertension && "ضغط",
      finalHistory?.heartDisease && "أمراض قلب",
      finalHistory?.asthma && "ربو",
      finalHistory?.thyroid && "الغدة الدرقية",
      finalHistory?.autoimmune && "أمراض مناعية",
      finalHistory?.glaucoma && "مياه زرقاء",
      finalHistory?.familyKeratoconus && "تاريخ عائلي لقرنية مخروطية",
    ]
      .filter(Boolean)
      .join("، ");
    const patientDateOfBirth = displayDateValue(
      finalPatient?.dateOfBirth ?? finalPatient?.birthDate,
    );
    const patientAge = calculateAgeAtDate(patientDateOfBirth, selectedDate);
    const finalExaminationRecord = (
      (finalExaminationsQuery.data as any[]) ?? []
    ).find((item) => Number(item.visitId) === Number(activeWorkflowVisitId));
    const finalGlassesRecord = ((finalGlassesQuery.data as any[]) ?? []).find(
      (item) =>
        Number(item.examinationId) === Number(finalExaminationRecord?.id),
    );
    const pdSummary = String(
      finalGlassesRecord?.pdOD || finalGlassesRecord?.pdOS || "",
    ).trim();
    const addOptional = (section: WorkflowSectionId) => {
      setOptionalSections((current) =>
        current.includes(section) ? current : [...current, section],
      );
      setActiveSection(section);
    };
    const removeOptional = (section: WorkflowSectionId) => {
      setOptionalSections((current) => current.filter((id) => id !== section));
      if (activeSection === section) setActiveSection("measurements");
    };
    const applyTestTemplate = (template: any) => {
      const ids = Array.isArray(template?.testItems)
        ? template.testItems
            .map((item: any) => item.testId ?? item.id)
            .filter((id: any) => id !== undefined && id !== null)
        : [];
      if (ids.length === 0) return;
      setSelectedTestIds((current) => {
        const next = Array.from(new Set([...current, ...ids]));
        const value = selectedNames(testItems, next);
        setData((previous) => ({
          ...previous,
          specialist: { ...previous.specialist, testsRays: value },
          consultant: { ...previous.consultant, testsRays: value },
        }));
        return next;
      });
      toast.success(`تم إضافة ${ids.length} فحص من القالب`);
    };
    const applyPrescriptionTemplate = (template: any) => {
      const ids = Array.isArray(template?.prescriptionItems)
        ? template.prescriptionItems
            .map(
              (item: any) =>
                medicationItems.find(
                  (medication) => medication.name === item.medicationName,
                )?.id,
            )
            .filter((id: any) => id !== undefined && id !== null)
        : [];
      if (ids.length === 0) return;
      setSelectedMedicationIds((current) => {
        const next = Array.from(new Set([...current, ...ids]));
        const value = selectedNames(medicationItems, next);
        setData((previous) => ({
          ...previous,
          specialist: { ...previous.specialist, prescription: value },
          consultant: { ...previous.consultant, prescription: value },
        }));
        return next;
      });
      toast.success(`تم إضافة ${ids.length} دواء من القالب`);
    };
    const renderReadyTemplateMenus = (
      templateData: Record<string, any> | undefined,
      tabsToShow: string[],
      kind: "tests" | "prescription",
    ) => {
      if (!templateData || Object.keys(templateData).length === 0) return null;
      return (
        <div className="mt-2">
          <span
            className={`${kind === "prescription" ? "text-sm font-semibold" : "text-[10px]"} text-muted-foreground`}
          >
            {kind === "tests" ? "قوالب:" : "وصفات جاهزة:"}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {tabsToShow.map((tab) => {
              const templatesInTab = Object.entries(templateData).filter(
                ([templateId, template]: [string, any]) =>
                  templateCategory(
                    String(template?.name ?? templateId),
                    tabsToShow,
                  ) === tab,
              );
              if (templatesInTab.length === 0) return null;
              return (
                <DropdownMenu key={tab}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={`flex items-center gap-1 rounded-md border border-input bg-transparent px-2.5 py-1 font-medium text-[#1e3a66] transition-colors hover:bg-muted/60 ${kind === "prescription" ? "text-sm" : "text-[10px]"}`}
                    >
                      <span>{tab}</span>
                      <ChevronDown className="h-3 w-3 opacity-70" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="max-h-[300px] min-w-[160px] overflow-y-auto"
                  >
                    {templatesInTab.map(
                      ([templateId, template]: [string, any]) => (
                        <DropdownMenuItem
                          key={templateId}
                          className={`cursor-pointer py-2 pr-4 text-right hover:bg-muted/50 ${kind === "prescription" ? "text-sm" : "text-xs"}`}
                          onClick={() =>
                            kind === "tests"
                              ? applyTestTemplate(template)
                              : applyPrescriptionTemplate(template)
                          }
                        >
                          {stripTemplateCategory(
                            String(template?.name ?? templateId),
                          )}
                        </DropdownMenuItem>
                      ),
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })}
          </div>
        </div>
      );
    };

    const renderDigitalFinal = (
      title = "FINAL MEDICAL REPORT",
      subtitle = "Digital Visit Summary",
    ) => (
      <div
        className="final-report-sheet mx-auto w-full max-w-none space-y-5 bg-white p-[8mm] text-[15px] leading-7 text-slate-900 shadow-[0_4px_24px_rgba(0,0,0,0.14)] print:w-[190mm] print:max-w-[190mm] print:space-y-2 print:text-[11px] print:leading-4 print:p-0 print:shadow-none"
        dir="ltr"
      >
        <header className="border-b-4 border-blue-900 pb-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-sm font-black tracking-[0.22em] text-blue-900">
                SELRS EYE CENTER
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">
                {title}
              </h2>
              <p className="mt-1 text-base font-semibold text-slate-600">
                {subtitle}
              </p>
            </div>
            <div className="flex gap-2 print:hidden">
              <Button
                type="button"
                onClick={saveFinalReportEdits}
                disabled={isSavingFinalReport}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSavingFinalReport ? "جاري الحفظ" : "حفظ التقرير"}
              </Button>
              <Button type="button" variant="outline" onClick={printSheet}>
                <Printer className="mr-2 h-4 w-4" />
                Print Report
              </Button>
            </div>
          </div>
        </header>

        <section
          className="grid items-stretch gap-4 md:grid-cols-2 print:grid-cols-2 print:gap-2 print:break-inside-avoid"
          dir="ltr"
        >
          <div className="order-2 rounded-xl border-2 border-slate-300 bg-white p-4 lg:order-2">
            <h3 className="mb-3 border-b-2 border-slate-200 pb-2 text-xl font-black text-blue-950">
              History &amp; Complaints
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-baseline gap-2">
                <span className="shrink-0 font-bold text-slate-500">
                  Medical History:
                </span>
                <p className="min-w-0" dir="rtl">
                  {medicalHistorySummary || "—"}
                </p>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="shrink-0 font-bold text-slate-500">
                  Previous Operations:
                </span>
                <p className="min-w-0" dir="rtl">
                  {finalHistory?.previousSurgeries || "—"}
                </p>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="shrink-0 font-bold text-slate-500">
                  Allergies:
                </span>
                <p className="min-w-0" dir="rtl">
                  {finalHistory?.allergies ? "نعم" : "—"}
                </p>
              </div>
              <div className="border-t border-slate-200 pt-2">
                <span className="font-bold text-slate-500">Complaint:</span>
                <p className="mt-1 text-base font-semibold" dir="rtl">
                  {complaintSummary || "—"}
                </p>
              </div>
            </div>
          </div>
          <div className="order-1 rounded-xl border-2 border-slate-300 bg-white p-4 lg:order-1">
            <h3 className="mb-3 border-b-2 border-slate-200 pb-2 text-xl font-black text-blue-950">
              Report Information
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-baseline gap-2">
                <span className="shrink-0 font-bold text-slate-500">
                  Patient Name:
                </span>
                <p className="min-w-0 text-base font-black" dir="rtl">
                  {finalPatient?.fullName ??
                    selectedLivePatient.fullName ??
                    "—"}
                </p>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="shrink-0 font-bold text-slate-500">
                  Date of Birth:
                </span>
                <p className="min-w-0 font-semibold" dir="ltr">
                  {patientDateOfBirth || "—"}
                </p>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="shrink-0 font-bold text-slate-500">Age:</span>
                <p className="min-w-0 font-semibold" dir="ltr">
                  {patientAge || "—"}
                </p>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="shrink-0 font-bold text-slate-500">
                  Occupation:
                </span>
                <p className="min-w-0 font-semibold" dir="rtl">
                  {finalPatient?.occupation || "—"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {hasMeasurements ? (
          <section className="report-section print:break-inside-avoid">
            <div className="mb-3 flex items-center gap-3 border-b-2 border-slate-200 pb-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-900 text-sm font-black text-white">
                1
              </span>
              <h3 className="text-xl font-black text-blue-950">Measurements</h3>
            </div>
            <div
              className="grid items-start gap-5 md:grid-cols-[minmax(0,280px)_minmax(0,1fr)] print:grid-cols-[52mm_minmax(0,1fr)] print:items-stretch print:gap-3"
              dir="ltr"
            >
              <div className="flex flex-col items-center gap-4 py-3 md:items-start">
                <div className="grid w-full max-w-[280px] grid-cols-[64px_1fr_1fr] overflow-hidden rounded-xl border-2 border-slate-300 bg-white text-center text-sm font-semibold print:max-w-[52mm] print:text-[10px]">
                  <div className="border-b border-r border-slate-300 bg-slate-100 px-2 py-2" />
                  <div className="border-b border-r border-slate-300 bg-slate-100 px-2 py-2 font-black text-[#003d9b]">
                    OD
                  </div>
                  <div className="border-b border-slate-300 bg-slate-100 px-2 py-2 font-black text-[#526069]">
                    OS
                  </div>
                  <div className="border-r border-slate-300 px-2 py-2 font-black">
                    UCVA
                  </div>
                  <div className="border-r border-slate-300 px-2 py-2">
                    {data.nursing.ucva.od || "—"}
                  </div>
                  <div className="px-2 py-2">{data.nursing.ucva.os || "—"}</div>
                  <div className="border-r border-t border-slate-300 px-2 py-2 font-black">
                    BCVA
                  </div>
                  <div className="border-r border-t border-slate-300 px-2 py-2">
                    {data.specialist.bcva.od || data.nursing.bcva.od || "—"}
                  </div>
                  <div className="border-t border-slate-300 px-2 py-2">
                    {data.specialist.bcva.os || data.nursing.bcva.os || "—"}
                  </div>
                </div>
                <div className="relative w-full max-w-[280px] print:max-w-[52mm] print:break-inside-avoid">
                  <div className="absolute left-24 top-[-10px] z-10 h-5 w-20 -rotate-6 rounded-sm border border-slate-400 bg-slate-300/80 shadow-sm print:hidden">
                    <span className="sr-only">Stapled AutoRef receipt</span>
                  </div>
                  <article className="relative w-full rotate-[0.5deg] border border-slate-300 bg-[#fffef9] px-3 py-4 text-[12px] leading-5 text-slate-950 shadow-[4px_5px_0_rgba(15,23,42,0.14)] print:rotate-0 print:shadow-none">
                    <div className="receipt-edge absolute -bottom-1 left-0 right-0 h-2 bg-[radial-gradient(circle_at_4px_0,#fffef9_3px,transparent_3.5px)] bg-[length:8px_8px]" />
                    <header className="border-b border-dashed border-slate-500 pb-3 text-center font-mono">
                      <p className="text-[11px] font-bold tracking-[0.28em]">
                        SELRS EYE CENTER
                      </p>
                      <p className="mt-1 text-xl font-black tracking-widest">
                        AUTO REFRACTION
                      </p>
                    </header>
                    <div className="py-4 font-mono">
                      <div className="grid grid-cols-[52px_repeat(3,minmax(0,1fr))] items-center justify-items-center border-b border-slate-400 pb-1 text-center text-[12px] font-black">
                        <span>EYE</span>
                        <span>S</span>
                        <span>C</span>
                        <span>A</span>
                      </div>
                      {eyeOrder.map((eye) => (
                        <div
                          key={eye}
                          className="grid grid-cols-[52px_repeat(3,minmax(0,1fr))] items-center justify-items-center py-1 text-center text-[15px] font-semibold"
                        >
                          <span className="text-center">
                            &lt;{eye === "od" ? "R" : "L"}&gt;
                          </span>
                          <span>{data.nursing.autoref[eye].s || "—"}</span>
                          <span>{data.nursing.autoref[eye].c || "—"}</span>
                          <span>{data.nursing.autoref[eye].a || "—"}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-y border-dashed border-slate-500 py-3 font-mono text-[13px]">
                      <div className="grid grid-cols-2 gap-3 text-center">
                        {eyeOrder.map((eye) => (
                          <div key={eye}>
                            <p className="text-base font-black">
                              {eye === "od" ? "RIGHT (R)" : "LEFT (L)"}
                            </p>
                            <p className="text-[14px] font-semibold">
                              IOP: {data.nursing.iop[eye] || "—"}
                            </p>
                          </div>
                        ))}
                      </div>
                      <p className="mt-3">PD: {pdSummary || "—"}</p>
                    </div>
                  </article>
                </div>
              </div>
              <div className="min-w-0 space-y-5 print:flex print:h-full print:flex-col print:gap-3 print:space-y-0">
                <div className="min-w-0 overflow-hidden rounded-xl border-2 border-slate-300 bg-white print:flex-[3]">
                  <table
                    className="w-full max-w-full table-fixed border-collapse text-center text-[14px] font-semibold print:h-full print:text-[16px] [&_td]:!px-1 [&_th]:!px-1"
                    dir="ltr"
                  >
                    <colgroup>
                      <col className="w-[22%]" />
                      {Array.from({ length: 6 }).map((_, index) => (
                        <col key={index} className="w-[13%]" />
                      ))}
                    </colgroup>
                    <thead className="bg-[#e7e8ea] text-sm font-bold uppercase text-slate-800">
                      <tr>
                        <th className="break-words border border-slate-300 px-1 py-3 text-xs sm:text-sm">
                          Refraction
                        </th>
                        <th
                          className="border border-slate-300 px-3 py-3 text-[#003d9b]"
                          colSpan={3}
                        >
                          OD (Right)
                        </th>
                        <th
                          className="border border-slate-300 px-3 py-3 text-[#526069]"
                          colSpan={3}
                        >
                          OS (Left)
                        </th>
                      </tr>
                      <tr>
                        <th className="whitespace-nowrap border border-slate-300 bg-[#f3f4f6] px-1 py-3 text-[11px] sm:text-sm">
                          Distance
                        </th>
                        <th className="border border-slate-300 px-3 py-3">S</th>
                        <th className="border border-slate-300 px-3 py-3">C</th>
                        <th className="border border-slate-300 px-3 py-3">A</th>
                        <th className="border border-slate-300 px-3 py-3">S</th>
                        <th className="border border-slate-300 px-3 py-3">C</th>
                        <th className="border border-slate-300 px-3 py-3">A</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      <tr>
                        <td className="border border-slate-300 bg-[#f3f4f6] px-3 py-3">
                          &nbsp;
                        </td>
                        <td className="border border-slate-300 px-3 py-3">
                          {data.specialist.distance.od.s || "—"}
                        </td>
                        <td className="border border-slate-300 px-3 py-3">
                          {data.specialist.distance.od.c || "—"}
                        </td>
                        <td className="border border-slate-300 px-3 py-3">
                          {data.specialist.distance.od.a || "—"}
                        </td>
                        <td className="border border-slate-300 px-3 py-3">
                          {data.specialist.distance.os.s || "—"}
                        </td>
                        <td className="border border-slate-300 px-3 py-3">
                          {data.specialist.distance.os.c || "—"}
                        </td>
                        <td className="border border-slate-300 px-3 py-3">
                          {data.specialist.distance.os.a || "—"}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-slate-300 bg-[#f3f4f6] px-3 py-3 font-bold text-[#003d9b]">
                          Reading
                        </td>
                        <td className="border border-slate-300 p-0" colSpan={6}>
                          <div className="flex w-full items-center gap-3 px-3 py-2">
                            <span className="whitespace-nowrap font-bold">
                              Add +
                            </span>
                            <span className="flex-1 rounded border border-slate-300 bg-slate-50 px-4 py-2 text-center font-mono text-base font-semibold">
                              {data.specialist.reading || "—"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {hasPentacam ? (
                  <div className="overflow-visible rounded-xl border-2 border-slate-300 bg-white print:flex-[2]">
                    <table
                      className="h-full w-full max-w-full table-auto border-collapse text-center text-[14px] print:text-[16px]"
                      dir="ltr"
                    >
                      <thead className="bg-slate-100 font-black text-slate-800">
                        <tr>
                          <th className="border border-slate-300 px-3 py-3">
                            Pentacam
                          </th>
                          <th className="border border-slate-300 px-3 py-3">
                            K1
                          </th>
                          <th className="border border-slate-300 px-3 py-3">
                            K2
                          </th>
                          <th className="border border-slate-300 px-3 py-3">
                            Axis
                          </th>
                          <th className="whitespace-nowrap border border-slate-300 px-2 py-3">
                            Thinnest Location
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {eyeOrder.map((eye) => (
                          <tr key={eye} className="even:bg-slate-50">
                            <td className="border border-slate-300 px-3 py-3 text-base font-black">
                              {eye.toUpperCase()}
                            </td>
                            <td className="border border-slate-300 px-3 py-3">
                              {data.pentacam[eye].k1 || "—"}
                            </td>
                            <td className="border border-slate-300 px-3 py-3">
                              {data.pentacam[eye].k2 || "—"}
                            </td>
                            <td className="border border-slate-300 px-3 py-3">
                              {data.pentacam[eye].axis || "—"}
                            </td>
                            <td className="border border-slate-300 px-3 py-3">
                              {data.pentacam[eye].thinnestLocation || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        <div
          className="grid items-stretch gap-4 md:grid-cols-2 print:grid-cols-2 print:gap-2 print:break-inside-avoid"
          dir="ltr"
        >
          {hasExaminationData ? (
            <section className="report-section rounded-xl border-2 border-slate-300 p-4">
              <h3 className="mb-3 border-b-2 border-slate-200 pb-2 text-xl font-black text-blue-950">
                Examination
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-300 p-4">
                  <p className="text-xs font-bold text-slate-500">
                    Muscle Action
                  </p>
                  <p className="mt-1 text-lg font-black">
                    {finalExam.muscleAbnormal
                      ? "Abnormal"
                      : finalExam.muscleNormal
                        ? "Normal"
                        : "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-300 p-4">
                  <p className="text-xs font-bold text-slate-500">Fundus</p>
                  <p className="mt-1 text-lg font-black">
                    {finalExam.fundusAbnormal
                      ? "Abnormal"
                      : finalExam.fundusNormal
                        ? "Normal"
                        : "—"}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-300 p-4">
                  <p className="text-sm font-black text-blue-900">
                    Other Abnormalities
                  </p>
                  <p className="mt-1 text-base" dir="rtl">
                    {finalExam.otherAbnormalities || "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-300 p-4">
                  <p className="text-sm font-black text-blue-900">
                    External Appearance
                  </p>
                  <p className="mt-1 text-base">
                    Ptosis: {finalExam.externalPtosis ? "Present" : "Absent"} |
                    Squint: {finalExam.externalSquint ? "Present" : "Absent"}
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          <section className="rounded-xl border-2 border-slate-300 p-4">
            <h3 className="mb-2 text-lg font-black text-blue-950">Diagnosis</h3>
            <div className="space-y-2 print:hidden" dir="rtl">
              <CatalogSearchSelect
                label="Diagnosis"
                placeholder="ابحث عن التشخيص..."
                searchText={diseaseSearchText}
                onSearchTextChange={setDiseaseSearchText}
                items={diseaseItems}
                selectedIds={selectedDiseaseIds}
                onToggle={toggleDisease}
                isLoading={diseasesQuery.isLoading}
                isError={diseasesQuery.isError}
                errorText="تعذر تحميل التشخيصات"
              />
              <Textarea
                value={data.consultant.diagnosis}
                onChange={(event) =>
                  update("consultant", {
                    ...data.consultant,
                    diagnosis: event.target.value,
                  })
                }
                className="min-h-20"
                placeholder="اكتب التشخيص..."
              />
            </div>
            <p className="hidden text-sm print:block" dir="rtl">
              {data.consultant.diagnosis || diagnosisSummary || "—"}
            </p>
          </section>
        </div>

        <section
          className="grid items-stretch gap-4 lg:grid-cols-3 print:grid-cols-3 print:gap-2 print:break-inside-avoid"
          dir="ltr"
        >
          <div className="flex flex-col gap-4 lg:col-span-1 print:col-span-1 print:gap-2">
            <div className="rounded-xl border-2 border-slate-300 p-4">
              <h3 className="text-lg font-black text-blue-950">
                Tests &amp; Rays
              </h3>
              <div className="mt-2 space-y-2 print:hidden" dir="rtl">
                {renderReadyTemplateMenus(
                  testTemplatesQuery.data as Record<string, any> | undefined,
                  READY_TEST_TABS,
                  "tests",
                )}
                <CatalogSearchSelect
                  label="Tests & Rays"
                  placeholder="ابحث عن التحاليل والأشعة..."
                  searchText={testSearchText}
                  onSearchTextChange={setTestSearchText}
                  items={testItems}
                  selectedIds={selectedTestIds}
                  onToggle={toggleTest}
                  isLoading={testsQuery.isLoading}
                  isError={testsQuery.isError}
                  errorText="تعذر تحميل التحاليل"
                  selectedItemsLast
                />
              </div>
              <p className="mt-2 hidden text-sm print:block" dir="rtl">
                {testsRaysSummary || "—"}
              </p>
            </div>
          </div>
          <div className="flex h-full min-h-[260px] flex-col rounded-xl border-2 border-slate-300 p-5 lg:col-span-2 print:col-span-2 print:min-h-0 print:p-3">
            <h3 className="text-xl font-black text-blue-950">Prescription</h3>
            <div className="mt-3 space-y-3 print:hidden" dir="rtl">
              {renderReadyTemplateMenus(
                prescriptionTemplatesQuery.data as
                  Record<string, any> | undefined,
                READY_PRESCRIPTION_TABS,
                "prescription",
              )}
              <CatalogSearchSelect
                label="Prescription"
                placeholder="ابحث عن الأدوية..."
                searchText={medicationSearchText}
                onSearchTextChange={setMedicationSearchText}
                items={medicationItems}
                selectedIds={selectedMedicationIds}
                onToggle={toggleMedication}
                isLoading={medicationsQuery.isLoading}
                isError={medicationsQuery.isError}
                errorText="تعذر تحميل الأدوية"
                selectedItemsLast
              />
            </div>
            <p
              className="mt-3 hidden flex-1 whitespace-pre-line text-base leading-7 print:block"
              dir="ltr"
            >
              {prescriptionSummary || "—"}
            </p>
          </div>
        </section>
        <section className="rounded-xl border-2 border-slate-300 p-4 print:break-inside-avoid print:p-3">
          <h3 className="text-lg font-black text-blue-950">Final Decision</h3>
          <Textarea
            value={data.consultant.finalDecision}
            onChange={(event) =>
              update("consultant", {
                ...data.consultant,
                finalDecision: event.target.value,
              })
            }
            className="mt-2 min-h-20 print:hidden"
            dir="rtl"
            placeholder="اكتب القرار النهائي..."
          />
          <p className="mt-2 hidden text-sm print:block" dir="rtl">
            {data.consultant.finalDecision || finalDecisionSummary || "—"}
          </p>
        </section>
        <footer className="flex flex-col justify-between gap-2 border-t-2 border-slate-200 pt-4 text-sm font-semibold text-slate-500 sm:flex-row">
          <span>Report Date: {selectedDate}</span>
          <span>SELRS — Digital Medical Workflow</span>
        </footer>
      </div>
    );

    const sectionContent: Record<WorkflowSectionId, ReactNode> = {
      measurements: (
        <MedicalFilePanel
          patientId={selectedLivePatient.id}
          embedded
          hubVisitId={workflowVisitId ?? selectedLivePatient.visitId}
          hubVisitDate={selectedDate}
          initialMedicalTab="data"
          initialMeasurementView="autoref"
          workflowMeasurementsOnly
          workflowMeasurementViews={["autoref", "after"]}
          workflowStackMeasurementViews
          onHubVisitIdChange={setWorkflowVisitId}
          onSaved={advanceLiveVisitAfterSave}
        />
      ),
      examination: (
        <ConsultantSheet
          embedded
          embeddedMode="examination"
          patientId={selectedLivePatient.id}
          visitId={workflowVisitId ?? selectedLivePatient.visitId}
          sheetType="consultant"
        />
      ),
      diagnosis: (
        <MedicalFilePanel
          patientId={selectedLivePatient.id}
          embedded
          hubVisitId={workflowVisitId ?? selectedLivePatient.visitId}
          hubVisitDate={selectedDate}
          initialMedicalTab="plan"
          workflowPlanOnly
          onSaved={advanceLiveVisitAfterSave}
        />
      ),
      consultantSheet: (
        <ConsultantSheet
          embedded
          patientId={selectedLivePatient.id}
          visitId={workflowVisitId ?? selectedLivePatient.visitId}
          sheetType={selectedFileSheetType}
        />
      ),
      pentacam: (
        <MedicalFilePanel
          patientId={selectedLivePatient.id}
          embedded
          hubVisitId={workflowVisitId ?? selectedLivePatient.visitId}
          hubVisitDate={selectedDate}
          initialMedicalTab="data"
          initialMeasurementView="pentacam"
          workflowMeasurementsOnly
          workflowMeasurementViews={["pentacam"]}
          onHubVisitIdChange={setWorkflowVisitId}
          onSaved={advanceLiveVisitAfterSave}
        />
      ),
      tests: (
        <Panel title="Tests & Rays" subtitle="Optional" icon={FileText} active>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => printWorkflowItems("tests")}
            >
              <Printer className="h-4 w-4" />
              طباعة
            </Button>
          </div>
          <CatalogSearchSelect
            label="Tests & Rays"
            placeholder="Search tests and rays..."
            searchText={testSearchText}
            onSearchTextChange={setTestSearchText}
            items={testItems}
            selectedIds={selectedTestIds}
            onToggle={toggleTest}
            isLoading={testsQuery.isLoading}
            isError={testsQuery.isError}
            errorText="Failed to load tests"
          />
          {renderReadyTemplateMenus(
            testTemplatesQuery.data as Record<string, any> | undefined,
            READY_TEST_TABS,
            "tests",
          )}
        </Panel>
      ),
      prescription: (
        <Panel
          title="Prescription"
          subtitle="Optional"
          icon={ClipboardList}
          active
        >
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => printWorkflowItems("prescription")}
            >
              <Printer className="h-4 w-4" />
              طباعة
            </Button>
          </div>
          <CatalogSearchSelect
            label="Prescription"
            placeholder="Search medications..."
            searchText={medicationSearchText}
            onSearchTextChange={setMedicationSearchText}
            items={medicationItems}
            selectedIds={selectedMedicationIds}
            onToggle={toggleMedication}
            isLoading={medicationsQuery.isLoading}
            isError={medicationsQuery.isError}
            errorText="Failed to load medications"
          />
          {renderReadyTemplateMenus(
            prescriptionTemplatesQuery.data as Record<string, any> | undefined,
            READY_PRESCRIPTION_TABS,
            "prescription",
          )}
        </Panel>
      ),
      final: renderDigitalFinal(),
    };

    return (
      <div className="space-y-2">
        <div
          className="grid w-full gap-2 rounded-xl bg-white p-2 shadow-sm print:hidden"
          dir="rtl"
        >
          <div className="flex min-w-0 flex-wrap items-end justify-between gap-2 border-b border-border/60 pb-2">
            {renderLivePatientPicker()}
            <div className="flex shrink-0 items-center gap-1">
              {sidebarOpen ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 shrink-0 gap-1 px-3 text-xs"
                  onClick={() => {
                    const next = workflowSectionMeta.find(
                      (item) => item.optional && !optionalSet.has(item.id),
                    );
                    if (next) addOptional(next.id);
                    else toast.info("كل الأقسام الاختيارية مضافة");
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Section
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setSidebarOpen((open) => !open)}
                aria-label="Toggle visit sections"
                title="Toggle visit sections"
              >
                {sidebarOpen ? (
                  <ChevronLeft className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <div
            className="flex min-w-0 flex-wrap items-center gap-1 pb-0.5"
            dir="rtl"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeSection === tab.id;
              return (
                <div key={tab.id} className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant={active ? "default" : "ghost"}
                    className={
                      (sidebarOpen ? "gap-2 px-3" : "px-2") +
                      " h-8 shrink-0 " +
                      (active ? "bg-blue-900 text-white" : "")
                    }
                    onClick={() => {
                      setActiveSection(tab.id);
                      setEmbeddedSheetPath(null);
                    }}
                    title={tab.label}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {sidebarOpen ? (
                      <span className="whitespace-nowrap">{tab.label}</span>
                    ) : null}
                  </Button>
                  {sidebarOpen && tab.optional ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => removeOptional(tab.id)}
                      aria-label={"Remove " + tab.label}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
        <main className="min-w-0 bg-[#f7f9fc] p-0 print:bg-white">
          <div className="p-3 pb-6 print:p-0" dir="ltr">
            {sectionContent[activeSection]}
          </div>
        </main>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-900" dir="rtl">
      <main className="mx-auto max-w-[1500px] space-y-2 px-2 py-0 lg:px-3">
        {selectedLivePatient
          ? renderLiveWorkspace()
          : renderLivePatientPicker()}
      </main>
    </div>
  );
}
