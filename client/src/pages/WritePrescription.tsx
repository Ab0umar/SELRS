import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import {
  Trash2,
  Printer,
  Save,
  Pencil,
  Upload,
  Pill,
  UserRound,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Sparkles,
  History,
  FileText,
  Stethoscope,
  Clock,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { toast } from "sonner";
import { cn, formatDateLabel, getTrpcErrorMessage } from "@/lib/utils";
import PatientPicker from "@/components/PatientPicker";
import KfPatientPicker, {
  type KfPatientOption,
} from "@/features/kf/KfPatientPicker";
import { trpc } from "@/lib/trpc";
import { READY_PRESCRIPTION_TEMPLATES } from "@/data/readyPrescriptionTemplates";
import { usePrintMode } from "@/hooks/usePrintMode";
import PrintPreviewBanner from "@/components/PrintPreviewBanner";
import { printOrExportPdf } from "@/lib/nativePdf";
import { loadXlsx } from "@/lib/xlsx";
import { buildRowLookup, getRowValue } from "@/lib/importUtils";
import { DateInput } from "@/components/ui/date-input";

interface PrescriptionItem {
  id: string;
  medicationId: number;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export type WritePrescriptionProps = {
  hidePageChrome?: boolean;
  /** من مركز المريض — يطبَّق على تاريخ الروشتة */
  hubVisitDate?: string;
  embeddedInPatientHub?: boolean;
  /** مركز المريض: عرض فقط */
  patientHubReadOnly?: boolean;
  patientHubViewOnlyHint?: string;
};

export default function WritePrescription({
  hidePageChrome,
  hubVisitDate,
  embeddedInPatientHub,
  patientHubReadOnly,
  patientHubViewOnlyHint = "العرض فقط داخل المركز",
}: WritePrescriptionProps = {}) {
  const { isAuthenticated, user } = useAuth();
  const [location, setLocation] = useLocation();
  const [, prescriptionParams] = useRoute("/prescription/:id");
  const [, prescriptionsParams] = useRoute("/prescriptions/:id");
  const [, hubPrescriptionParams] = useRoute("/patient-hub/prescription/:id");
  const [, kfPrescriptionParams] = useRoute("/kf/prescription/:id");
  const params =
    prescriptionParams ??
    prescriptionsParams ??
    hubPrescriptionParams ??
    kfPrescriptionParams;
  const isKfRoute = location.startsWith("/kf/prescription");
  const draftScope = isKfRoute ? "kf-prescription" : "prescription";
  const isAdmin = user?.role === "admin";
  const canDeletePrescriptions = ["admin", "manager"].includes(
    user?.role || "",
  );
  const isReadOnly = user?.role === "reception" || user?.role === "accountant";
  const editingForbidden = isReadOnly || Boolean(patientHubReadOnly);
  const canImportReadyTemplates = isAdmin;
  const initialPatientId = params?.id ? Number(params.id) : 0;
  const routeVisitDate =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("visitDate") || ""
      : "";
  const requestedVisitDate =
    hubVisitDate && /^\d{4}-\d{2}-\d{2}$/.test(hubVisitDate)
      ? hubVisitDate
      : /^\d{4}-\d{2}-\d{2}$/.test(routeVisitDate)
        ? routeVisitDate
        : "";

  const [patientId, setPatientId] = useState<number | null>(
    initialPatientId > 0 ? initialPatientId : null,
  );
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientCode, setPatientCode] = useState("");
  const [prescriptionDate, setPrescriptionDate] = useState(
    requestedVisitDate || new Date().toISOString().split("T")[0],
  );
  const [locationTypeFilter, setLocationTypeFilter] = useState<
    "all" | "center" | "external"
  >("all");
  const [diagnosis, setDiagnosis] = useState("");

  useEffect(() => {
    if (requestedVisitDate) {
      setPrescriptionDate(requestedVisitDate);
    }
  }, [requestedVisitDate]);

  const toDateInputValue = (value: unknown) => {
    const date = new Date(String(value ?? ""));
    if (Number.isNaN(date.valueOf())) return "";
    return date.toISOString().split("T")[0];
  };

  const [prescriptionItems, setPrescriptionItems] = useState<
    PrescriptionItem[]
  >([]);
  const [generalNotes, setGeneralNotes] = useState("");
  const [medicationSearch, setMedicationSearch] = useState("");
  const [medicationsOpen, setMedicationsOpen] = useState(true);
  const preOpInstructions = [
    "عدم استخدام العدسات اللاصقة لمدة لا تقل عن أسبوع ويمكن أن تزيد.",
    "عدم وضع أي مساحيق بالعين أو الوجه يوم العملية وبعدها حسب ما يحدده الطبيب.",
    "الاستحمام قبل العملية ويوم العملية والتأكد من أن الملابس ليس بها أي عطر سابق.",
    "غسل الوجه جيداً يوم العملية.",
    "استخدام القطرات كما هو موضح بالروشتة قبل العملية.",
  ];
  const postOpInstructions = [
    "عدم لمس العين بالأيدي أو الحك أو نزول البحر أو حمام السباحة.",
    "عدم دخول الماء داخل العين لمدة أسبوع بعد العملية مباشرة.",
    "استخدام النظارة الشمسية وقت التعرض لأشعة الشمس فقط.",
    "الابتعاد عن أماكن التراب والغبار.",
    "الالتزام بأخذ العلاج كما وصفه الطبيب.",
    "الالتزام بمواعيد المتابعة بعد العملية.",
  ];
  const patientStateQuery = trpc.medical.getPatientPageState.useQuery(
    { patientId: patientId ?? 0, page: "prescription" },
    {
      enabled:
        Boolean(patientId) &&
        !initialPatientId &&
        !editingForbidden &&
        !isKfRoute,
      refetchOnWindowFocus: false,
    },
  );
  const { mutate: savePatientPageState } =
    trpc.medical.savePatientPageState.useMutation({
      onSuccess: () => {
        const key = patientId
          ? `selrs:patient-draft:${draftScope}:${patientId}`
          : `selrs:patient-draft:${draftScope}:temp`;
        try {
          window.localStorage.removeItem(key);
          window.sessionStorage.removeItem(key);
        } catch (e) {
          // Ignore storage failures.
        }
      },
    });
  const templateOverridesQuery =
    trpc.medical.getReadyTemplateOverrides.useQuery(
      { scope: "prescription" },
      { refetchOnWindowFocus: false },
    );
  const upsertTemplateOverrideMutation =
    trpc.medical.upsertReadyTemplateOverride.useMutation({
      onSuccess: async () => {
        await templateOverridesQuery.refetch();
      },
    });
  const importReadyTemplateOverridesMutation =
    trpc.medical.importReadyTemplateOverrides.useMutation({
      onSuccess: async () => {
        await templateOverridesQuery.refetch();
      },
    });
  const importReadyTemplateOverridesFromFileMutation =
    trpc.medical.importReadyTemplateOverridesFromFile.useMutation({
      onSuccess: async () => {
        await templateOverridesQuery.refetch();
      },
    });
  const patientStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const localDraftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAppliedDraftRef = useRef<string | null>(null);
  const hydratedPatientStateRef = useRef<number | null>(null);
  const importInputId = "ready-prescriptions-import";
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const importPollRef = useRef<number | null>(null);
  const [importStatus, setImportStatus] = useState<string>("");
  const [importPath, setImportPath] = useState(
    "E:\\selrs.cc\\روشتات\\ready_prescriptions_multish1eet_import_with_dosages.xlsx",
  );

  const readDraft = (keys: string[]) => {
    for (const key of keys) {
      try {
        const raw = window.localStorage.getItem(key);
        if (raw) {
          if ((window as any).__selrsDraftDebug) {
            console.warn("[draft] read localStorage", key);
          }
          return raw;
        }
      } catch {
        // Ignore localStorage failures.
      }
      try {
        const raw = window.sessionStorage.getItem(key);
        if (raw) {
          if ((window as any).__selrsDraftDebug) {
            console.warn("[draft] read sessionStorage", key);
          }
          return raw;
        }
      } catch {
        // Ignore sessionStorage failures.
      }
      try {
        const name = window.name || "";
        if (name.startsWith("selrs:")) {
          const parsed = JSON.parse(name.slice(6)) as Record<string, string>;
          if (parsed && parsed[key]) {
            if ((window as any).__selrsDraftDebug) {
              console.warn("[draft] read window.name", key);
            }
            return parsed[key];
          }
        }
      } catch {
        // Ignore window.name failures.
      }
    }
    return null;
  };

  const writeDraft = (key: string, draft: { updatedAt: string; data: any }) => {
    const raw = JSON.stringify(draft);
    try {
      window.localStorage.setItem(key, raw);
      if ((window as any).__selrsDraftDebug) {
        console.warn("[draft] wrote localStorage", key);
      }
      return true;
    } catch {
      // Ignore localStorage failures.
    }
    try {
      window.sessionStorage.setItem(key, raw);
      if ((window as any).__selrsDraftDebug) {
        console.warn("[draft] wrote sessionStorage", key);
      }
      return true;
    } catch {
      // Ignore sessionStorage failures.
    }
    try {
      const name = window.name || "";
      const parsed = name.startsWith("selrs:")
        ? (JSON.parse(name.slice(6)) as Record<string, string>)
        : {};
      parsed[key] = raw;
      window.name = `selrs:${JSON.stringify(parsed).slice(0, 150000)}`;
      if ((window as any).__selrsDraftDebug) {
        console.warn("[draft] wrote window.name", key);
      }
      return true;
    } catch {
      // Ignore window.name failures.
    }
    return false;
  };

  const medicationsQuery = trpc.medical.getAllMedications.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const referenceMedicationsQuery =
    trpc.medical.searchEgyptianDrugReference.useQuery(
      { query: medicationSearch.trim(), limit: 20 },
      {
        enabled: medicationsOpen && medicationSearch.trim().length >= 2,
        refetchOnWindowFocus: false,
        staleTime: 10 * 60 * 1000,
      },
    );
  const patientQuery = trpc.patient.getPatient.useQuery(patientId ?? 0, {
    enabled: Boolean(patientId) && !isKfRoute,
    refetchOnWindowFocus: false,
  });
  const kfPatientQuery = trpc.kf.getPatient.useQuery(
    { kfId: patientId ?? 0 },
    {
      enabled: Boolean(patientId) && isKfRoute,
      refetchOnWindowFocus: false,
    },
  );

  const createPrescriptionMutation =
    trpc.medical.createPrescriptionWithItems.useMutation({
      onSuccess: () => {
        toast.success("تم حفظ الروشتة بنجاح");
      },
      onError: (error: unknown) => {
        toast.error(getTrpcErrorMessage(error, "فشل في حفظ الروشتة."));
      },
    });

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    let hadDark = false;
    const handleBeforePrint = () => {
      hadDark =
        root.classList.contains("dark") || body.classList.contains("dark");
      root.classList.remove("dark");
      body.classList.remove("dark");
    };
    const handleAfterPrint = () => {
      if (hadDark) {
        root.classList.add("dark");
        body.classList.add("dark");
      }
    };
    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  useEffect(() => {
    const fromRoute = Number(params?.id ?? 0);
    if (Number.isFinite(fromRoute) && fromRoute > 0) {
      setPatientId(fromRoute);
    }
  }, [params?.id]);

  useEffect(() => {
    hydratedPatientStateRef.current = null;
  }, [patientId]);

  useEffect(() => {
    const patient = patientQuery.data as any;
    if (!patient) return;
    setPatientName(patient.fullName ?? "");
    setPatientAge(patient.age != null ? String(patient.age) : "");
    setPatientCode(String(patient.patientCode ?? "").trim());
  }, [patientQuery.data]);

  useEffect(() => {
    const patient = kfPatientQuery.data as any;
    if (!patient || !isKfRoute) return;
    setPatientName(patient.fullName ?? "");
    setPatientAge(patient.age != null ? String(patient.age) : "");
    setPatientCode(String(patient.kfCode ?? "").trim());
  }, [kfPatientQuery.data, isKfRoute]);

  useEffect(() => {
    if (editingForbidden) return;
    const data = (patientStateQuery.data as any)?.data;
    if (!data) return;
    if (hydratedPatientStateRef.current === patientId) return;
    if (data.prescriptionDate) setPrescriptionDate(data.prescriptionDate);
    if (data.generalNotes !== undefined)
      setGeneralNotes(data.generalNotes ?? "");
    if (data.medicationSearch !== undefined)
      setMedicationSearch(data.medicationSearch ?? "");
    if (data.diagnosis !== undefined)
      setDiagnosis(data.diagnosis ?? "");
    if (Array.isArray(data.prescriptionItems))
      setPrescriptionItems(data.prescriptionItems);
    hydratedPatientStateRef.current = patientId;
  }, [patientStateQuery.data, editingForbidden, patientId]);

  useEffect(() => {
    if (!patientId || editingForbidden) return;
    if (isKfRoute) return;
    if (patientStateTimerRef.current)
      clearTimeout(patientStateTimerRef.current);
    const payload = {
      prescriptionDate,
      generalNotes,
      medicationSearch,
      prescriptionItems,
      diagnosis,
    };
    patientStateTimerRef.current = setTimeout(() => {
      savePatientPageState({ patientId, page: "prescription", data: payload });
    }, 800);
    return () => {
      if (patientStateTimerRef.current)
        clearTimeout(patientStateTimerRef.current);
    };
  }, [
    patientId,
    editingForbidden,
    prescriptionDate,
    generalNotes,
    medicationSearch,
    prescriptionItems,
    diagnosis,
    savePatientPageState,
    isKfRoute,
  ]);

  useEffect(() => {
    if (editingForbidden) return;
    if (localDraftTimerRef.current) clearTimeout(localDraftTimerRef.current);
    const payload = {
      prescriptionDate,
      generalNotes,
      medicationSearch,
      prescriptionItems,
      diagnosis,
    };
    localDraftTimerRef.current = setTimeout(() => {
      const key = patientId
        ? `selrs:patient-draft:${draftScope}:${patientId}`
        : `selrs:patient-draft:${draftScope}:temp`;
      const draft = {
        updatedAt: new Date().toISOString(),
        data: payload,
      };
      writeDraft(key, draft);
    }, 400);
    return () => {
      if (localDraftTimerRef.current) clearTimeout(localDraftTimerRef.current);
    };
  }, [
    patientId,
    editingForbidden,
    prescriptionDate,
    generalNotes,
    medicationSearch,
    prescriptionItems,
    diagnosis,
    draftScope,
  ]);

  useEffect(() => {
    if (editingForbidden) return;
    const persistNow = () => {
      const payload = {
        prescriptionDate,
        generalNotes,
        medicationSearch,
        prescriptionItems,
        diagnosis,
      };
      const draft = {
        updatedAt: new Date().toISOString(),
        data: payload,
      };
      const key = patientId
        ? `selrs:patient-draft:${draftScope}:${patientId}`
        : `selrs:patient-draft:${draftScope}:temp`;
      writeDraft(key, draft);
    };
    const handleVisibility = () => {
      if (document.hidden) persistNow();
    };
    window.addEventListener("beforeunload", persistNow);
    window.addEventListener("pagehide", persistNow);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("beforeunload", persistNow);
      window.removeEventListener("pagehide", persistNow);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [
    patientId,
    editingForbidden,
    prescriptionDate,
    generalNotes,
    medicationSearch,
    prescriptionItems,
    diagnosis,
  ]);

  if (!isAuthenticated) return null;

  const templateOverrides = (templateOverridesQuery.data ?? {}) as Record<
    string,
    {
      name?: string;
      prescriptionItems?: Array<{
        medicationName: string;
        dosage: string;
        frequency: string;
        duration: string;
        instructions: string;
      }>;
    }
  >;
  const READY_TABS = [
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
  const READY_TABS_PERSIST_KEY = "ready-prescriptions";
  const [readyTab, setReadyTab] = useState(() => {
    if (typeof window === "undefined") return "أخرى 1";
    try {
      const stored =
        localStorage.getItem(`tabs:${READY_TABS_PERSIST_KEY}`) || "";
      if (READY_TABS.includes(stored)) return stored;
    } catch {
      // ignore
    }
    return "أخرى 1";
  });
  const deletePrescriptionMutation =
    trpc.medical.deletePrescription.useMutation({
      onSuccess: async () => {
        toast.success("تم حذف الروشتة");
        await historyQuery.refetch();
      },
      onError: (error: unknown) => {
        toast.error(getTrpcErrorMessage(error, "فشل حذف الروشتة."));
      },
    });
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [moveReadyTabTarget, setMoveReadyTabTarget] = useState("Tracoma");
  const [showTemplateManagement, setShowTemplateManagement] = useState(false);

  const stripTemplateCategory = (value: string) =>
    String(value ?? "")
      .replace(/^\[(.+?)\]\s*/, "")
      .trim();

  const readTemplateCategory = (value: string) => {
    const match = String(value ?? "").match(/^\[(.+?)\]\s*/);
    if (!match) return "";
    return READY_TABS.includes(match[1]) ? match[1] : "";
  };

  const getTemplateRawName = (templateId: string, fallbackName: string) => {
    const overrideName = templateOverrides[templateId]?.name;
    return overrideName && overrideName.trim() ? overrideName : fallbackName;
  };

  const getTemplateCategory = (templateId: string, fallbackName: string) => {
    const raw = getTemplateRawName(templateId, fallbackName);
    return readTemplateCategory(raw) || "أخرى 1";
  };

  const readyTemplates = [
    ...READY_PRESCRIPTION_TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      items: t.items,
    })),
    ...Object.keys(templateOverrides)
      .filter((id) => !READY_PRESCRIPTION_TEMPLATES.some((t) => t.id === id))
      .map((id) => ({
        id,
        name: templateOverrides[id]?.name?.trim() || id,
        items: templateOverrides[id]?.prescriptionItems ?? [],
      })),
  ];
  const filteredReadyTemplates = readyTemplates.filter(
    (template) => getTemplateCategory(template.id, template.name) === readyTab,
  );
  const filteredReadyTemplateIds = filteredReadyTemplates.map(
    (template) => template.id,
  );
  const allFilteredReadyTemplatesSelected =
    filteredReadyTemplateIds.length > 0 &&
    filteredReadyTemplateIds.every((id) => selectedTemplateIds.includes(id));

  const handleSelectPatient = (patient: {
    id: number;
    fullName: string;
    age?: number | null;
  }) => {
    setPatientId(patient.id);
    setPatientName(patient.fullName ?? "");
    setPatientAge(patient.age != null ? String(patient.age) : "");
    setLocation(
      embeddedInPatientHub
        ? `/patient-hub/prescription/${patient.id}`
        : isKfRoute
          ? `/kf/prescription/${patient.id}`
          : `/prescription/${patient.id}`,
    );
  };

  const handleSelectKfPatient = (patient: KfPatientOption) => {
    setPatientId(patient.kfId);
    setPatientName(patient.fullName ?? "");
    setPatientAge(patient.age != null ? String(patient.age) : "");
    setPatientCode(String(patient.kfCode ?? "").trim());
    setLocation(`/kf/prescription/${patient.kfId}`);
  };

  const historyQuery = trpc.medical.getPrescriptionsWithItemsByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId) && !isKfRoute, refetchOnWindowFocus: false },
  );
  useEffect(() => {
    if (!editingForbidden && !initialPatientId) return;
    const history = (historyQuery.data ?? []) as any[];
    if (!history.length) {
      setPrescriptionItems([]);
      return;
    }
    const latest = requestedVisitDate
      ? history.find(
          (item) =>
            toDateInputValue(item.prescriptionDate) === requestedVisitDate,
        )
      : history[0];
    if (!latest) {
      setPrescriptionItems([]);
      setGeneralNotes("");
      if (requestedVisitDate) setPrescriptionDate(requestedVisitDate);
      return;
    }
    const items = (latest.items ?? []).map((item: any) => ({
      id: String(item.id ?? Date.now()),
      medicationId: item.medicationId ?? 0,
      medicationName: item.medicationName ?? "",
      dosage: item.dosage ?? "",
      frequency: item.frequency ?? "",
      duration: item.duration ?? "",
      instructions: item.instructions ?? "",
    }));
    setPrescriptionItems(items);
    if (requestedVisitDate) {
      setPrescriptionDate(requestedVisitDate);
    } else if (latest.prescriptionDate) {
      const dateValue = toDateInputValue(latest.prescriptionDate);
      if (dateValue) setPrescriptionDate(dateValue);
    }
  }, [
    historyQuery.data,
    editingForbidden,
    initialPatientId,
    requestedVisitDate,
  ]);

  // Auto-print (triggered by usePrintMode below) must wait for the patient
  // and their prescription history to actually load — otherwise the print
  // dialog opens on the very first render, before any data has arrived,
  // producing a blank prescription/lab-request printout.
  const printDataReady = !initialPatientId
    ? true
    : isKfRoute
      ? !kfPatientQuery.isLoading
      : !patientQuery.isLoading && !historyQuery.isLoading;
  const printMode = usePrintMode({ ready: printDataReady });

  const handleRemoveItem = (id: string) => {
    if (editingForbidden) return;
    setPrescriptionItems(prescriptionItems.filter((item) => item.id !== id));
    toast.success("تم حذف الدواء من الروشتة");
  };

  const handleSave = async () => {
    if (editingForbidden) {
      toast.error(
        patientHubReadOnly
          ? patientHubViewOnlyHint
          : "التعديل متاح للأدمن فقط.",
      );
      return;
    }
    if (!patientId) {
      toast.error("يرجى اختيار المريض أولاً.");
      return;
    }
    if (isKfRoute) {
      toast.error("الحفظ داخل KF منفصل عن جداول الروشتة العامة حالياً.");
      return;
    }
    const itemsToSave = prescriptionItems.filter(
      (item) =>
        (typeof item.medicationId === "number" && item.medicationId > 0) ||
        Boolean(item.medicationName && item.medicationName.trim()),
    );
    if (itemsToSave.length === 0) {
      toast.error("يرجى إضافة دواء واحد على الأقل.");
      return;
    }
    await createPrescriptionMutation.mutateAsync({
      patientId,
      date: prescriptionDate,
      notes: generalNotes,
      items: itemsToSave.map((item) => ({
        medicationId: item.medicationId,
        medicationName: item.medicationName,
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        instructions: item.instructions,
      })),
    });
    if (patientId) {
      await historyQuery.refetch();
    }
  };

  const handlePrint = () => {
    void printOrExportPdf(
      `${String(patientName || patientId || "prescription").trim()}.pdf`,
    );
  };

  const filteredItems = prescriptionItems.filter((item) => {
    const term = medicationSearch.trim().toLowerCase();
    if (!term) return true;
    return [
      item.medicationName,
      item.dosage,
      item.frequency,
      item.duration,
      item.instructions,
    ]
      .join(" ")
      .toLowerCase()
      .includes(term);
  });

  const availableMedications = useMemo(() => {
    const meds = (medicationsQuery.data ?? []) as any[];
    const term = medicationSearch.trim().toLowerCase();
    if (!term) return meds;
    return meds.filter((med) =>
      `${med.name} ${med.type} ${med.strength} ${med.manufacturer} ${med.activeIngredient}`
        .toLowerCase()
        .includes(term),
    );
  }, [medicationsQuery.data, medicationSearch]);

  const handleToggleMedication = (med: any) => {
    if (editingForbidden) return;
    const exists = prescriptionItems.find(
      (item) => item.medicationId === med.id,
    );
    if (exists) {
      handleRemoveItem(exists.id);
      return;
    }
    setPrescriptionItems([
      ...prescriptionItems,
      {
        id: Date.now().toString(),
        medicationId: med.id,
        medicationName: med.name ?? "",
        dosage: "",
        frequency: "",
        duration: "",
        instructions: "",
      },
    ]);
  };

  const handleAddReferenceMedication = (drug: {
    commercialNameEn: string;
    commercialNameAr: string;
    scientificName: string;
  }) => {
    if (editingForbidden) return;
    const name = drug.commercialNameEn.trim();
    if (!name) return;
    if (
      prescriptionItems.some(
        (item) =>
          item.medicationName.trim().toLowerCase() === name.toLowerCase(),
      )
    ) {
      toast.info("الدواء مضاف بالفعل إلى الروشتة");
      return;
    }
    setPrescriptionItems((current) => [
      ...current,
      {
        id: `reference-${Date.now()}`,
        medicationId: 0,
        medicationName: name,
        dosage: "",
        frequency: "",
        duration: "",
        instructions: "",
      },
    ]);
    toast.success(`تمت إضافة ${drug.commercialNameAr || name}`);
  };

  const formatItemDetails = (item: PrescriptionItem) => {
    const parts = [
      item.dosage,
      item.frequency,
      item.duration,
      item.instructions,
    ]
      .map((p) => String(p ?? "").trim())
      .filter(Boolean);
    return parts.join(" • ");
  };

  const normalizeTemplateId = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\p{L}\p{N}\-_]/gu, "")
      .slice(0, 64);

  const importFromFile = async (file: File) => {
    try {
      toast.info(`جارٍ استيراد الملف: ${file.name}`);
      setImportStatus(`تم اختيار الملف: ${file.name}`);
      const buffer = await file.arrayBuffer();
      const XLSX = await loadXlsx();
      const workbook = XLSX.read(buffer, { type: "array" });
      if (!workbook.SheetNames.length) {
        toast.error("Excel file has no sheets.");
        setImportStatus("فشل: الملف لا يحتوي على شيتات");
        return;
      }
      const rows = workbook.SheetNames.flatMap((sheetName, sheetIndex) => {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) return [] as Array<Record<string, unknown>>;
        return XLSX.utils
          .sheet_to_json<Record<string, unknown>>(sheet, { defval: "" })
          .map((row) => ({
            ...row,
            __sheetName: sheetName,
            __sheetIndex: sheetIndex,
          }));
      });

      const grouped = new Map<
        string,
        {
          templateId: string;
          name?: string;
          prescriptionItems: Array<{
            medicationName: string;
            dosage: string;
            frequency: string;
            duration: string;
            instructions: string;
          }>;
        }
      >();

      const templateIdUsage = new Map<string, number>();

      for (const row of rows) {
        const lookup = buildRowLookup(row);
        const templateIdRaw = String(
          getRowValue(
            lookup,
            "templateId",
            "template_id",
            "template id",
            "كود القالب",
          ) ?? "",
        );
        const templateNameRaw = String(
          getRowValue(
            lookup,
            "templateName",
            "template_name",
            "template name",
            "اسم القالب",
          ) ?? "",
        );
        const templateKeyRaw = String(
          getRowValue(lookup, "templateKey", "template_key", "template key") ??
            "",
        );
        const sheetNameRaw = String((row as any).__sheetName ?? "");
        const sheetIndexRaw = Number((row as any).__sheetIndex ?? -1);
        const medicationName = String(
          getRowValue(
            lookup,
            "medicationName",
            "medication_name",
            "medication name",
            "اسم الدواء",
          ) ?? "",
        ).trim();
        const dosage = String(
          getRowValue(lookup, "dosage", "الجرعة", "جرعة") ?? "",
        ).trim();
        const frequency = String(
          getRowValue(lookup, "frequency", "التكرار") ?? "",
        ).trim();
        const duration = String(
          getRowValue(lookup, "duration", "المدة") ?? "",
        ).trim();
        const instructions = String(
          getRowValue(lookup, "instructions", "التعليمات") ?? "",
        ).trim();

        const normalizedBaseId =
          normalizeTemplateId(templateKeyRaw) ||
          normalizeTemplateId(
            templateIdRaw && sheetIndexRaw >= 0
              ? `${templateIdRaw}__s${sheetIndexRaw}`
              : "",
          ) ||
          normalizeTemplateId(templateIdRaw) ||
          normalizeTemplateId(
            templateNameRaw && sheetIndexRaw >= 0
              ? `${templateNameRaw}__s${sheetIndexRaw}`
              : "",
          ) ||
          normalizeTemplateId(templateNameRaw) ||
          normalizeTemplateId(sheetNameRaw) ||
          "";
        let normalizedId = normalizedBaseId;
        if (normalizedId) {
          const currentCount = templateIdUsage.get(normalizedId) ?? 0;
          if (!grouped.has(normalizedId) && currentCount > 0) {
            normalizedId = `${normalizedId}-${currentCount + 1}`;
          }
          templateIdUsage.set(normalizedBaseId, currentCount + 1);
        }
        if (!normalizedId || !medicationName) continue;

        if (!grouped.has(normalizedId)) {
          grouped.set(normalizedId, {
            templateId: normalizedId,
            name: templateNameRaw.trim() || undefined,
            prescriptionItems: [],
          });
        }
        grouped.get(normalizedId)!.prescriptionItems.push({
          medicationName,
          dosage,
          frequency,
          duration,
          instructions,
        });
      }

      const templates = Array.from(grouped.values()).filter(
        (t) => t.prescriptionItems.length > 0,
      );
      if (templates.length === 0) {
        toast.error("No valid templates found in file.");
        setImportStatus("فشل: لم يتم العثور على قوالب صالحة");
        return;
      }
      setImportStatus(`تم تحليل الملف: ${templates.length} قالب`);

      await importReadyTemplateOverridesMutation.mutateAsync({
        scope: "prescription",
        templates,
      });
      toast.success(`Imported ${templates.length} templates`);
      setImportStatus(`تم الاستيراد: ${templates.length} قالب`);
    } catch (error) {
      console.error("[importReadyPrescriptions] failed", error);
      toast.error(getTrpcErrorMessage(error, "Failed to import templates."));
      setImportStatus("فشل: راجع الـ Console");
    } finally {
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
    }
  };

  const handleImportReadyPrescriptions = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    await importFromFile(file);
  };

  const startFilePick = () => {
    setImportStatus("تم الضغط على الاستيراد");
    importInputRef.current?.click();
    if (importPollRef.current) window.clearInterval(importPollRef.current);
    const startedAt = Date.now();
    importPollRef.current = window.setInterval(() => {
      const file = importInputRef.current?.files?.[0];
      if (file) {
        window.clearInterval(importPollRef.current!);
        importPollRef.current = null;
        void importFromFile(file);
        return;
      }
      if (Date.now() - startedAt > 5_000) {
        window.clearInterval(importPollRef.current!);
        importPollRef.current = null;
        setImportStatus("لم يتم اختيار ملف");
      }
    }, 200);
  };

  const handleImportFromPath = async () => {
    const trimmed = importPath.trim();
    if (!trimmed) {
      setImportStatus("اكتب مسار الملف أولاً");
      return;
    }
    try {
      setImportStatus(`جاري الاستيراد من المسار`);
      const result =
        await importReadyTemplateOverridesFromFileMutation.mutateAsync({
          scope: "prescription",
          filePath: trimmed,
        });
      setImportStatus(`تم الاستيراد: ${result.count} قالب`);
    } catch (error) {
      setImportStatus(getTrpcErrorMessage(error, "فشل الاستيراد من المسار."));
    }
  };

  const handleApplyReadyPrescription = (templateId: string) => {
    const template = readyTemplates.find((t) => t.id === templateId);
    if (!template) return;
    const sourceItems =
      templateOverrides[templateId]?.prescriptionItems ?? template.items;
    setPrescriptionItems(
      sourceItems.map((item, idx) => ({
        id: `ready-${templateId}-${idx}-${Date.now()}`,
        medicationId: 0,
        medicationName: item.medicationName,
        dosage: item.dosage ?? "",
        frequency: item.frequency ?? "",
        duration: item.duration ?? "",
        instructions: item.instructions ?? "",
      })),
    );
  };

  const handleSaveTemplateContent = async (templateId: string) => {
    const items = prescriptionItems
      .map((item) => ({
        medicationName: String(item.medicationName ?? "").trim(),
        dosage: String(item.dosage ?? "").trim(),
        frequency: String(item.frequency ?? "").trim(),
        duration: String(item.duration ?? "").trim(),
        instructions: String(item.instructions ?? "").trim(),
      }))
      .filter((item) => item.medicationName);

    try {
      await upsertTemplateOverrideMutation.mutateAsync({
        scope: "prescription",
        templateId,
        prescriptionItems: items,
      });
      toast.success("Template content saved");
    } catch (error) {
      toast.error(
        getTrpcErrorMessage(error, "Failed to save template content."),
      );
    }
  };

  const getTemplateDisplayName = (templateId: string, fallbackName: string) =>
    stripTemplateCategory(getTemplateRawName(templateId, fallbackName));

  const handleRenameTemplate = async (
    templateId: string,
    fallbackName: string,
  ) => {
    const currentRaw = getTemplateRawName(templateId, fallbackName);
    const currentCategory = readTemplateCategory(currentRaw);
    const currentName = stripTemplateCategory(currentRaw) || fallbackName;
    const nextName = window.prompt("Rename template", currentName);
    if (nextName === null) return;

    const clean = nextName.trim();
    try {
      if (!clean && currentCategory) {
        await upsertTemplateOverrideMutation.mutateAsync({
          scope: "prescription",
          templateId,
          name: `[${currentCategory}] ${fallbackName}`,
        });
      } else {
        const nameWithCategory = currentCategory
          ? `[${currentCategory}] ${clean || fallbackName}`
          : clean;
        await upsertTemplateOverrideMutation.mutateAsync({
          scope: "prescription",
          templateId,
          name:
            !clean || clean === fallbackName
              ? currentCategory
                ? nameWithCategory
                : ""
              : nameWithCategory,
        });
      }
      toast.success("Template name updated");
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "Failed to rename template."));
    }
  };

  const handleSetTemplateCategory = async (
    templateId: string,
    fallbackName: string,
    category: string,
  ) => {
    const raw = getTemplateRawName(templateId, fallbackName);
    const baseName = stripTemplateCategory(raw) || fallbackName || templateId;
    try {
      await upsertTemplateOverrideMutation.mutateAsync({
        scope: "prescription",
        templateId,
        name: `[${category}] ${baseName}`,
      });
    } catch (error) {
      toast.error(
        getTrpcErrorMessage(error, "Failed to update template category."),
      );
    }
  };

  const handleMoveSelectedTemplates = async () => {
    const idsToMove = selectedTemplateIds.filter((id) =>
      filteredReadyTemplateIds.includes(id),
    );
    if (idsToMove.length === 0) {
      toast.error("اختر روشتة جاهزة واحدة على الأقل");
      return;
    }

    try {
      for (const templateId of idsToMove) {
        const template = readyTemplates.find((item) => item.id === templateId);
        if (!template) continue;
        const raw = getTemplateRawName(templateId, template.name);
        const baseName =
          stripTemplateCategory(raw) || template.name || templateId;
        await upsertTemplateOverrideMutation.mutateAsync({
          scope: "prescription",
          templateId,
          name: `[${moveReadyTabTarget}] ${baseName}`,
        });
      }
      await templateOverridesQuery.refetch();
      setSelectedTemplateIds((prev) =>
        prev.filter((id) => !idsToMove.includes(id)),
      );
      toast.success(`تم نقل ${idsToMove.length} روشتة`);
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "فشل نقل الروشتات الجاهزة."));
    }
  };

  const handleDeleteTemplateOverride = async (templateId: string) => {
    try {
      await upsertTemplateOverrideMutation.mutateAsync({
        scope: "prescription",
        templateId,
        name: "",
        prescriptionItems: [],
      });
      toast.success("Template override deleted");
    } catch (error) {
      toast.error(
        getTrpcErrorMessage(error, "Failed to delete template override."),
      );
    }
  };
  return (
    <div
      className={cn(
        "prescription-root bg-[#f5f7fb] text-[#172033]",
        hidePageChrome ? "min-h-0" : "min-h-screen",
      )}
      dir="rtl"
      style={{ direction: "rtl" }}
    >
      <main
        data-mobile-pdf-root
        className={cn(
          "w-full max-w-none print:p-0",
          hidePageChrome ? "px-2 pb-4 pt-1" : "px-4 pb-8 pt-3 md:px-6",
          printMode.printView ? "px-3 py-3" : "",
        )}
      >
        {printMode.printView ? (
          <PrintPreviewBanner
            title="طباعة الروشتة"
            subtitle={patientName || undefined}
            onPrint={handlePrint}
          />
        ) : null}
        <div
          className={
            editingForbidden
              ? "space-y-6"
              : "grid grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]"
          }
        >
          <div className="space-y-4">
            <Card className="overflow-hidden border-[#d9e2ef] shadow-none print:hidden">
              <CardHeader className="border-b border-[#e5ebf3] bg-[#f8fafc] px-4 py-3">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-[#1e3a66]">
                  <UserRound className="h-4 w-4" />
                  بيانات المريض
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2 space-y-2">
                    {isKfRoute ? (
                      <KfPatientPicker
                        initialKfPatientId={patientId ?? undefined}
                        onSelect={handleSelectKfPatient}
                      />
                    ) : (
                      <>
                        <Select
                          value={locationTypeFilter}
                          onValueChange={(v) => setLocationTypeFilter(v as any)}
                        >
                          <SelectTrigger className="h-9 rounded-lg text-sm">
                            <SelectValue placeholder="مكان الخدمة" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">الكل</SelectItem>
                            <SelectItem value="center">مركز</SelectItem>
                            <SelectItem value="external">خارجي</SelectItem>
                          </SelectContent>
                        </Select>
                        <PatientPicker
                          initialPatientId={patientId ?? undefined}
                          onSelect={handleSelectPatient}
                          locationType={
                            locationTypeFilter === "all"
                              ? undefined
                              : locationTypeFilter
                          }
                        />
                      </>
                    )}
                  </div>
                  <div className="space-y-1">
                    <DateInput
                      value={prescriptionDate}
                      onChange={(e) => setPrescriptionDate(e.target.value)}
                      disabled={editingForbidden}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {formatDateLabel(prescriptionDate)}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 mt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600">التشخيص (Diagnosis)</label>
                    <Input
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      placeholder="اكتب التشخيص هنا..."
                      disabled={editingForbidden}
                      className="h-9 border-[#dbe4f0] bg-[#f8fafc] text-right font-medium"
                      dir="rtl"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            {!editingForbidden && (
              <Card className="overflow-hidden border-[#d9e2ef] shadow-none print:hidden">
                <div className="flex items-center gap-3 border-b border-[#e5ebf3] bg-[#f8fafc] px-4 py-3 flex-nowrap">
                  <div className="flex shrink-0 items-center gap-2 text-sm font-bold text-[#1e3a66]">
                    <Pill className="h-4 w-4" />
                    الأدوية
                  </div>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Input
                      value={medicationSearch}
                      onChange={(e) => setMedicationSearch(e.target.value)}
                      placeholder="ابحث في الأدوية"
                      className="w-full max-w-none text-right"
                      dir="rtl"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setMedicationsOpen((prev) => !prev)}
                      title={medicationsOpen ? "إخفاء الأدوية" : "عرض الأدوية"}
                      aria-label={
                        medicationsOpen ? "إخفاء الأدوية" : "عرض الأدوية"
                      }
                    >
                      {medicationsOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                {medicationsOpen ? (
                  <CardContent className="space-y-2 max-h-[52vh] overflow-y-auto p-3">
                    <Button
                      className="w-full bg-[#ff6b35] text-white hover:bg-[#e85f2f]"
                      onClick={() => {
                        const name = window.prompt("اسم الدواء");
                        if (!name) return;
                        setPrescriptionItems((prev) => [
                          ...prev,
                          {
                            id: Date.now().toString(),
                            medicationId: 0,
                            medicationName: name,
                            dosage: "",
                            frequency: "",
                            duration: "",
                            instructions: "",
                          },
                        ]);
                      }}
                    >
                      إضافة دواء
                    </Button>
                    {medicationSearch.trim().length >= 2 ? (
                      <div className="space-y-2 border-b border-[#d9e2ef] pb-3">
                        <div className="flex items-center justify-between gap-2 text-xs font-bold text-[#1e3a66]">
                          <span>مرجع الأدوية المصرية</span>
                          <span className="font-normal text-muted-foreground">
                            {referenceMedicationsQuery.data?.total ?? 0} نتيجة
                          </span>
                        </div>
                        {referenceMedicationsQuery.isLoading ? (
                          <p className="py-2 text-center text-xs text-muted-foreground">
                            جاري البحث في المرجع...
                          </p>
                        ) : (
                          (referenceMedicationsQuery.data?.items ?? []).map(
                            (drug, index) => (
                              <button
                                key={`${drug.commercialNameEn}-${index}`}
                                type="button"
                                onClick={() =>
                                  handleAddReferenceMedication(drug)
                                }
                                className="flex w-full items-center justify-between gap-3 rounded-md border border-[#dbe5f2] bg-[#f8fbff] px-3 py-2 text-left hover:border-[#2563eb]"
                                dir="ltr"
                              >
                                <span className="min-w-0">
                                  <span className="block text-sm font-bold text-[#172033]">
                                    {drug.commercialNameEn}
                                  </span>
                                  <span className="block truncate text-xs text-muted-foreground">
                                    {drug.scientificName || drug.manufacturer}
                                  </span>
                                </span>
                                <span
                                  className="shrink-0 text-xs font-semibold text-primary"
                                  dir="rtl"
                                >
                                  {drug.commercialNameAr || "إضافة"}
                                </span>
                              </button>
                            ),
                          )
                        )}
                      </div>
                    ) : null}
                    {availableMedications.map((med) => {
                      const checked = prescriptionItems.some(
                        (item) => item.medicationId === med.id,
                      );
                      return (
                        <label
                          key={med.id}
                          className={cn(
                            "flex items-center justify-between gap-2 rounded-md border px-3 py-2 transition-colors",
                            checked
                              ? "border-[#2563eb] bg-[#eef5ff]"
                              : "border-[#e2e8f0] bg-white hover:bg-[#f8fafc]",
                          )}
                          dir="ltr"
                        >
                          <span className="text-sm font-medium text-left text-[#172033]">
                            {med.name}
                          </span>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleToggleMedication(med)}
                          />
                        </label>
                      );
                    })}
                    {availableMedications.length === 0 && (
                      <p className="text-center text-muted-foreground">
                        لا توجد أدوية
                      </p>
                    )}
                  </CardContent>
                ) : null}
              </Card>
            )}
          </div>
          <div className="space-y-4">
            {!editingForbidden && (
              <Card className="overflow-hidden border-[#d9e2ef] shadow-none print:hidden">
                <CardHeader className="border-b border-[#e5ebf3] bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-bold text-[#1e3a66]">
                      <ClipboardList className="h-4 w-4" />
                      روشتات جاهزة
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs text-[#1e3a66] hover:bg-slate-100 h-8"
                        onClick={() => setShowTemplateManagement((p) => !p)}
                      >
                        {showTemplateManagement
                          ? "إخفاء الإدارة"
                          : "إدارة الروشتات"}
                      </Button>
                      {canImportReadyTemplates && showTemplateManagement ? (
                        <div className="flex items-center gap-2">
                          <input
                            ref={importInputRef}
                            id={importInputId}
                            type="file"
                            accept=".xlsx,.xls"
                            className="sr-only"
                            onChange={(e) =>
                              void handleImportReadyPrescriptions(e)
                            }
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={startFilePick}
                          >
                            <Upload className="h-4 w-4 ml-1" />
                            Import Excel
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap gap-2 items-center">
                    {READY_TABS.map((tab) => {
                      const templatesInTab = readyTemplates.filter(
                        (t) => getTemplateCategory(t.id, t.name) === tab,
                      );
                      return (
                        <DropdownMenu key={tab}>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="bg-[#f0f4fa] text-[#1e3a66] hover:bg-[#e0eaf7] border-[#d9e2ef] font-semibold text-xs h-8 px-3 rounded-md flex items-center gap-1"
                            >
                              <span>{tab}</span>
                              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="start"
                            className="max-h-[300px] overflow-y-auto min-w-[160px]"
                          >
                            {templatesInTab.length === 0 ? (
                              <div className="text-center text-xs text-muted-foreground p-2">
                                لا توجد روشتات
                              </div>
                            ) : (
                              templatesInTab.map((template) => (
                                <DropdownMenuItem
                                  key={template.id}
                                  className="text-right text-xs cursor-pointer hover:bg-[#eef5ff] pr-4 py-2"
                                  onClick={() =>
                                    handleApplyReadyPrescription(template.id)
                                  }
                                >
                                  {getTemplateDisplayName(
                                    template.id,
                                    template.name,
                                  )}
                                </DropdownMenuItem>
                              ))
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      );
                    })}
                  </div>

                  {showTemplateManagement && (
                    <>
                      {canImportReadyTemplates ? (
                        <>
                          <div className="text-xs text-muted-foreground">
                            استيراد مباشر من مسار السيرفر
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Input
                              value={importPath}
                              onChange={(e) => setImportPath(e.target.value)}
                              placeholder="E:\\path\\to\\file.xlsx"
                              className="text-left"
                              dir="ltr"
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={handleImportFromPath}
                            >
                              استيراد من المسار
                            </Button>
                          </div>
                          {importStatus ? (
                            <div className="text-xs text-muted-foreground">
                              {importStatus}
                            </div>
                          ) : null}
                        </>
                      ) : null}
                      <Tabs
                        value={readyTab}
                        onValueChange={setReadyTab}
                        persistKey={READY_TABS_PERSIST_KEY}
                        dir="rtl"
                      >
                        <TabsList className="w-full justify-start gap-1 overflow-x-auto flex-nowrap bg-[#f3f6fb] p-1">
                          {READY_TABS.map((tab) => (
                            <TabsTrigger
                              key={tab}
                              value={tab}
                              className="whitespace-nowrap rounded-md px-3 text-xs data-[state=active]:bg-white data-[state=active]:text-[#1e3a66] data-[state=active]:shadow-sm"
                            >
                              {tab}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </Tabs>
                      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-2">
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={allFilteredReadyTemplatesSelected}
                            onCheckedChange={(checked) => {
                              if (Boolean(checked)) {
                                setSelectedTemplateIds((prev) =>
                                  Array.from(
                                    new Set([
                                      ...prev,
                                      ...filteredReadyTemplateIds,
                                    ]),
                                  ),
                                );
                                return;
                              }
                              setSelectedTemplateIds((prev) =>
                                prev.filter(
                                  (id) =>
                                    !filteredReadyTemplateIds.includes(id),
                                ),
                              );
                            }}
                          />
                          تحديد الكل
                        </label>
                        <Select
                          value={moveReadyTabTarget}
                          onValueChange={setMoveReadyTabTarget}
                        >
                          <SelectTrigger className="w-[220px]">
                            <SelectValue placeholder="نقل إلى تاب" />
                          </SelectTrigger>
                          <SelectContent>
                            {READY_TABS.map((tab) => (
                              <SelectItem key={`move-${tab}`} value={tab}>
                                {tab}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void handleMoveSelectedTemplates()}
                          disabled={selectedTemplateIds.length === 0}
                        >
                          نقل المحدد
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
                {showTemplateManagement && (
                  <CardContent className="grid max-h-[34vh] grid-cols-1 gap-2 overflow-y-auto border-t border-[#eef2f7] p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredReadyTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="flex items-center gap-1 rounded-lg border border-[#e2e8f0] bg-white p-1"
                      >
                        <Checkbox
                          checked={selectedTemplateIds.includes(template.id)}
                          onCheckedChange={(checked) =>
                            setSelectedTemplateIds((prev) =>
                              Boolean(checked)
                                ? Array.from(new Set([...prev, template.id]))
                                : prev.filter((id) => id !== template.id),
                            )
                          }
                        />
                        <Button
                          variant="outline"
                          type="button"
                          className="h-8 flex-1 justify-start border-0 bg-transparent px-2 text-xs shadow-none hover:bg-[#eef5ff]"
                          onClick={() =>
                            handleApplyReadyPrescription(template.id)
                          }
                        >
                          {getTemplateDisplayName(template.id, template.name)}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          onClick={() => handleSaveTemplateContent(template.id)}
                          title="Save template content"
                          aria-label="Save template content"
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          onClick={() =>
                            handleRenameTemplate(template.id, template.name)
                          }
                          title="Rename"
                          aria-label="Rename template"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          onClick={() =>
                            handleDeleteTemplateOverride(template.id)
                          }
                          title="Delete override"
                          aria-label="Delete template override"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {filteredReadyTemplates.length === 0 ? (
                      <div className="col-span-full text-center text-xs text-muted-foreground py-6">
                        لا توجد روشتات في هذا التاب
                      </div>
                    ) : null}
                  </CardContent>
                )}
              </Card>
            )}

            <div
              className="prescription-print-content prescription-paper"
              data-print-prescription-content
              dir="ltr"
            >
              <div className="prescription-paper-header">
                <div
                  className="prescription-patient-grid"
                  dir="rtl"
                >
                  <div className="prescription-patient-field">
                    <span className="prescription-patient-label">الاسم:</span>
                    <span className="prescription-patient-value">{patientName || "غير محدد"}</span>
                  </div>
                  <div className="prescription-patient-field">
                    <span className="prescription-patient-label">الكود:</span>
                    <span className="prescription-patient-value" dir="ltr">
                      {patientCode || (patientId != null ? String(patientId) : "")}
                    </span>
                  </div>
                  <div className="prescription-patient-field">
                    <span className="prescription-patient-label">التاريخ:</span>
                    <span className="prescription-patient-value" dir="ltr">
                      {formatDateLabel(prescriptionDate)}
                    </span>
                  </div>
                  <div className="prescription-patient-diagnosis">
                    <span className="prescription-patient-label">التشخيص:</span>
                    <span className="prescription-patient-value font-bold mr-1">{diagnosis || "غير محدد"}</span>
                  </div>
                </div>
              </div>

              <Card className="border-0 bg-transparent shadow-none print:[direction:ltr] print:border-0 print:shadow-none">
                <CardHeader className="hidden print:hidden" />
                <CardContent className="prescription-print-rx p-0">
                  <div className="rx-mark text-2xl font-black tracking-tight text-[#1e3a66]">
                    RX :
                  </div>
                  {editingForbidden ? (
                    prescriptionItems.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-[#cbd5e1] py-10 text-center text-muted-foreground">
                        لا توجد روشتة مسجلة لهذا المريض
                      </p>
                    ) : (
                      prescriptionItems.map((item) => (
                        <div
                          key={item.id}
                          className="prescription-item border rounded-lg p-3 print:border-0 print:rounded-none"
                        >
                          <div
                            className="prescription-medication-name font-bold text-left"
                            dir="ltr"
                          >
                            {item.medicationName}
                          </div>
                          {formatItemDetails(item) ? (
                            <div
                              className="prescription-medication-instructions mt-1 text-sm whitespace-pre-line text-right"
                              dir="rtl"
                            >
                              {formatItemDetails(item)}
                            </div>
                          ) : null}
                        </div>
                      ))
                    )
                  ) : prescriptionItems.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] py-12 text-center text-sm text-muted-foreground">
                      لا توجد أدوية بعد
                    </p>
                  ) : (
                    filteredItems.map((item) => (
                      <div
                        key={item.id}
                        className="prescription-item rounded-xl border border-[#dbe4f0] bg-white p-3 print:border-0 print:rounded-none"
                      >
                        <div
                          className="flex items-start justify-between gap-3"
                          dir="ltr"
                        >
                          <div className="flex-1 space-y-2">
                            <Input
                              value={item.medicationName}
                              onChange={(e) =>
                                setPrescriptionItems((prev) =>
                                  prev.map((p) =>
                                    p.id === item.id
                                      ? { ...p, medicationName: e.target.value }
                                      : p,
                                  ),
                                )
                              }
                              placeholder="Medication name"
                              className="h-9 border-[#dbe4f0] bg-[#f8fafc] text-left font-semibold print:hidden"
                              dir="ltr"
                            />
                            <div className="prescription-medication-name hidden print:block font-bold text-left">
                              {item.medicationName}
                            </div>
                            {formatItemDetails(item) ? (
                              <div
                                className="prescription-medication-instructions hidden print:block mt-1 text-sm whitespace-pre-line text-right"
                                dir="rtl"
                              >
                                {formatItemDetails(item)}
                              </div>
                            ) : null}
                            <div
                              className="grid grid-cols-1 gap-2 sm:grid-cols-3 print:hidden"
                              dir="rtl"
                            >
                              <Input
                                value={item.dosage}
                                onChange={(e) =>
                                  setPrescriptionItems((prev) =>
                                    prev.map((p) =>
                                      p.id === item.id
                                        ? { ...p, dosage: e.target.value }
                                        : p,
                                    ),
                                  )
                                }
                                placeholder="الجرعة"
                                className="h-9 border-[#dbe4f0] bg-[#f8fafc] text-right"
                              />
                              <Input
                                value={item.frequency}
                                onChange={(e) =>
                                  setPrescriptionItems((prev) =>
                                    prev.map((p) =>
                                      p.id === item.id
                                        ? { ...p, frequency: e.target.value }
                                        : p,
                                    ),
                                  )
                                }
                                placeholder="التكرار"
                                className="h-9 border-[#dbe4f0] bg-[#f8fafc] text-right"
                              />
                              <Input
                                value={item.duration}
                                onChange={(e) =>
                                  setPrescriptionItems((prev) =>
                                    prev.map((p) =>
                                      p.id === item.id
                                        ? { ...p, duration: e.target.value }
                                        : p,
                                    ),
                                  )
                                }
                                placeholder="المدة"
                                className="h-9 border-[#dbe4f0] bg-[#f8fafc] text-right"
                              />
                            </div>
                            <Textarea
                              value={item.instructions}
                              onChange={(e) =>
                                setPrescriptionItems((prev) =>
                                  prev.map((p) =>
                                    p.id === item.id
                                      ? { ...p, instructions: e.target.value }
                                      : p,
                                  ),
                                )
                              }
                              placeholder="تعليمات إضافية"
                              className="min-h-14 w-full border-[#dbe4f0] bg-[#f8fafc] text-center print:hidden"
                            />
                          </div>
                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => handleRemoveItem(item.id)}
                            className="print:hidden"
                            aria-label="حذف"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
              <div className="hidden print:block print-signature-section">
                توقيع الطبيب: ................................
              </div>
            </div>
            <section
              className="hidden print:block prescription-print-backside"
              dir="rtl"
            >
              <div className="space-y-6 text-[14px] leading-7">
                <div className="print-instruction-panel">
                  <h3 className="mb-2 font-bold">قبل العملية</h3>
                  <ul className="space-y-1 pr-5 list-disc">
                    {preOpInstructions.map((line, idx) => (
                      <li key={`pre-${idx}`}>{line}</li>
                    ))}
                  </ul>
                </div>
                <div className="print-instruction-panel">
                  <h3 className="mb-2 font-bold">بعد العملية</h3>
                  <ul className="space-y-1 pr-5 list-disc">
                    {postOpInstructions.map((line, idx) => (
                      <li key={`post-${idx}`}>{line}</li>
                    ))}
                  </ul>
                </div>
                <p className="text-center font-semibold pt-4">
                  مع تمنياتنا لكم الشفاء العاجل
                </p>
              </div>
            </section>
            <div
              className={`print:hidden mt-4 ${printMode.printView ? "hidden" : ""}`}
            >
              {patientId ? (
                <Card>
                  <CardHeader>
                    <CardTitle>الروشتات السابقة</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {historyQuery.isLoading ? (
                      <p className="text-center text-muted-foreground">
                        جاري التحميل...
                      </p>
                    ) : (historyQuery.data ?? []).filter(
                        (rx: any) => (rx.items ?? []).length > 0,
                      ).length === 0 ? (
                      <p className="text-center text-muted-foreground">
                        لا توجد روشتات سابقة
                      </p>
                    ) : (
                      (historyQuery.data ?? [])
                        .filter((rx: any) => (rx.items ?? []).length > 0)
                        .map((rx: any) => (
                          <div key={rx.id} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between gap-2 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">التاريخ</span>
                                <span>
                                  {rx.prescriptionDate
                                    ? formatDateLabel(rx.prescriptionDate)
                                    : ""}
                                </span>
                              </div>
                              {canDeletePrescriptions && !editingForbidden ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  onClick={async () => {
                                    if (
                                      !window.confirm(
                                        "هل أنت متأكد من حذف الروشتة؟",
                                      )
                                    )
                                      return;
                                    await deletePrescriptionMutation.mutateAsync(
                                      { prescriptionId: Number(rx.id) },
                                    );
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 ml-1" />
                                  حذف
                                </Button>
                              ) : null}
                            </div>
                            <div className="mt-2 space-y-2">
                              {(rx.items ?? []).length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  لا توجد أدوية
                                </p>
                              ) : (
                                (rx.items ?? []).map((item: any) => (
                                  <div key={item.id} className="text-sm">
                                    <span className="font-semibold">
                                      {item.medicationName ||
                                        `#${item.medicationId ?? ""}`}
                                    </span>
                                    {formatItemDetails({
                                      id: String(item.id ?? ""),
                                      medicationId: item.medicationId ?? 0,
                                      medicationName: item.medicationName ?? "",
                                      dosage: item.dosage ?? "",
                                      frequency: item.frequency ?? "",
                                      duration: item.duration ?? "",
                                      instructions: item.instructions ?? "",
                                    }) ? (
                                      <div className="text-xs text-muted-foreground">
                                        {formatItemDetails({
                                          id: String(item.id ?? ""),
                                          medicationId: item.medicationId ?? 0,
                                          medicationName:
                                            item.medicationName ?? "",
                                          dosage: item.dosage ?? "",
                                          frequency: item.frequency ?? "",
                                          duration: item.duration ?? "",
                                          instructions: item.instructions ?? "",
                                        })}
                                      </div>
                                    ) : null}
                                  </div>
                                ))
                              )}
                            </div>
                            {rx.notes ? (
                              <div className="mt-2 text-xs text-muted-foreground">
                                {rx.notes}
                              </div>
                            ) : null}
                          </div>
                        ))
                    )}
                  </CardContent>
                </Card>
              ) : (
                <p className="text-center text-muted-foreground">
                  اختر مريضاً لعرض الروشتات السابقة
                </p>
              )}
            </div>
            <div
              className={`print:hidden sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white/90 p-3.5 shadow-lg backdrop-blur-md transition-all ${printMode.printView ? "hidden" : ""}`}
            >
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium px-2">
                <Pill className="h-4 w-4 text-[#2563eb]" />
                <span>الروشتة العلاجية</span>
              </div>
              <div className="flex items-center gap-2">
                {!editingForbidden && (
                  <Button
                    className="bg-[#2563eb] text-white hover:bg-[#1d4ed8] font-bold shadow-sm h-9 px-5 rounded-xl"
                    onClick={handleSave}
                    type="button"
                  >
                    <Save className="h-4 w-4 ml-1.5" />
                    حفظ الروشتة
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handlePrint}
                  type="button"
                  className="border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold h-9 px-4 rounded-xl"
                >
                  <Printer className="h-4 w-4 ml-1.5 text-slate-600" />
                  طباعة
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <style>{`
          .prescription-paper {
            min-height: 620px;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            background: #ffffff;
            padding: 24px;
            box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.05);
          }
          .prescription-paper-header {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            background: #f8fafc;
            padding: 14px 16px;
          }
          .rx-mark {
            width: max-content;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 2px;
          }
          .prescription-item {
            transition: all 150ms ease-out;
          }
          .prescription-item:focus-within {
            border-color: #2563eb;
            background: #f8fbff;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
          }
          @media print {
            .prescription-root,
            .prescription-root * {
              color: #000 !important;
              background: transparent !important;
              background-image: none !important;
              box-shadow: none !important;
              text-shadow: none !important;
              filter: none !important;
            }
            .prescription-root {
              background: #fff !important;
              color-scheme: light !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .prescription-root main,
            .prescription-root [data-print-prescription-content],
            .prescription-root [data-slot="card"],
            .prescription-root .card,
            .prescription-root .prescription-print-rx > div,
            .prescription-root .prescription-print-rx > p {
              background: #fff !important;
            }
            @page {
              size: A5;
              margin: 0;
            }
          .prescription-root {
            min-height: auto !important;
          }
          .prescription-root,
          .prescription-root body {
            width: auto !important;
          }
          .prescription-root [data-print-prescription-content] {
            margin: 35mm auto 0 !important;
            width: 132mm !important;
            max-width: 132mm !important;
          }
          .prescription-root main,
          .prescription-root [data-print-prescription-content] {
            display: block !important;
            overflow: visible !important;
          }
          .prescription-root .prescription-paper {
            min-height: auto !important;
            border: 0 !important;
            border-radius: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          .prescription-root .prescription-paper-header {
            border: none !important;
            border-bottom: 1px solid #17468f !important;
            border-radius: 0 !important;
            padding: 0 0 2.4mm 0 !important;
            margin-bottom: 3mm !important;
          }
          .prescription-root .prescription-patient-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 2mm 5mm !important;
            align-items: center !important;
            direction: rtl !important;
            font-size: 9.5pt !important;
            line-height: 1.25 !important;
          }
          .prescription-root .prescription-patient-field {
            display: inline-flex !important;
            min-width: 0 !important;
            gap: 1.5mm !important;
            align-items: baseline !important;
            justify-content: flex-start !important;
            white-space: nowrap !important;
          }
          .prescription-root .prescription-patient-diagnosis {
            grid-column: 1 / -1 !important;
            border-top: 1px solid #d1d5db !important;
            padding-top: 1.5mm !important;
            text-align: center !important;
            font-size: 9.5pt !important;
          }
          .prescription-root .prescription-patient-label,
          .prescription-root .prescription-patient-value {
            font-size: inherit !important;
            line-height: inherit !important;
          }
          .prescription-root .prescription-patient-value {
            font-weight: 700 !important;
          }
          .prescription-root [data-print-prescription-content] .card-header {
            display: none !important;
          }
          .prescription-root [data-print-prescription-content] [data-slot="card-header"],
          .prescription-root [data-print-prescription-content] [data-slot="card-title"] {
            display: none !important;
          }
          .prescription-root [data-print-prescription-content] [data-slot="card"] {
            margin: 0 !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
            break-inside: avoid-page;
            page-break-inside: avoid;
          }
          .prescription-root .prescription-print-rx {
            direction: ltr !important;
            text-align: left !important;
            margin-top: 3mm !important;
            border: 1px solid #e5e5e5 !important;
            font-size: 10pt !important;
            line-height: 1.3 !important;
          }
          .prescription-root .rx-mark {
            display: block !important;
            width: 100% !important;
            border-bottom: 1px solid #e5e5e5 !important;
            font-size: 12pt !important;
            line-height: 1.25 !important;
            margin: 0 !important;
            padding: 2.5mm 2mm !important;
            font-weight: 800 !important;
            text-align: left !important;
          }
          .prescription-root .prescription-print-rx > div,
          .prescription-root .prescription-print-rx > p {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .prescription-root .prescription-item {
            display: block !important;
            min-height: 11.3mm !important;
            margin: 0 !important;
            padding: 2.2mm 2mm !important;
          }
          .prescription-root .prescription-medication-name {
            font-size: 9.8pt !important;
            line-height: 1.25 !important;
            font-weight: 800 !important;
            text-transform: uppercase !important;
            text-align: left !important;
          }
          .prescription-root .prescription-medication-instructions {
            margin: 0 !important;
            font-size: 9pt !important;
            line-height: 1.35 !important;
            font-weight: 700 !important;
            text-align: right !important;
            white-space: pre-line !important;
          }
          .prescription-root .prescription-print-backside {
            display: none !important;
          }
          .prescription-root .print-instruction-panel {
            border: 1px solid #000 !important;
            padding: 4mm !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
