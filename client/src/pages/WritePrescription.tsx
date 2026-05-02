import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Printer, Save, Pencil, Upload, Pill, CalendarDays, UserRound, ClipboardList, ChevronDown, ChevronUp } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { toast } from "sonner";
import { formatDateLabel, getTrpcErrorMessage } from "@/lib/utils";
import PatientPicker from "@/components/PatientPicker";
import { trpc } from "@/lib/trpc";
import { READY_PRESCRIPTION_TEMPLATES } from "@/data/readyPrescriptionTemplates";
import { usePrintMode } from "@/hooks/usePrintMode";
import PrintPreviewBanner from "@/components/PrintPreviewBanner";
import { printOrExportPdf } from "@/lib/nativePdf";
import { loadXlsx } from "@/lib/xlsx";
import { buildRowLookup, getRowValue } from "@/lib/importUtils";

interface PrescriptionItem {
  id: string;
  medicationId: number;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export default function WritePrescription() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const [, prescriptionParams] = useRoute("/prescription/:id");
  const [, prescriptionsParams] = useRoute("/prescriptions/:id");
  const params = prescriptionParams ?? prescriptionsParams;
  const isAdmin = user?.role === "admin";
  const canDeletePrescriptions = ["admin", "manager"].includes(user?.role || "");
  const isReadOnly = user?.role === "reception";
  const canImportReadyTemplates = isAdmin;
  const printMode = usePrintMode();
  const initialPatientId = params?.id ? Number(params.id) : 0;

  const [patientId, setPatientId] = useState<number | null>(initialPatientId > 0 ? initialPatientId : null);
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientCode, setPatientCode] = useState("");
  const [prescriptionDate, setPrescriptionDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const toDateInputValue = (value: unknown) => {
    const date = new Date(String(value ?? ""));
    if (Number.isNaN(date.valueOf())) return "";
    return date.toISOString().split("T")[0];
  };

  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([]);
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
    { enabled: Boolean(patientId) && !isReadOnly, refetchOnWindowFocus: false }
  );
  const { mutate: savePatientPageState } = trpc.medical.savePatientPageState.useMutation();
  const templateOverridesQuery = trpc.medical.getReadyTemplateOverrides.useQuery(
    { scope: "prescription" },
    { refetchOnWindowFocus: false }
  );
  const upsertTemplateOverrideMutation = trpc.medical.upsertReadyTemplateOverride.useMutation({
    onSuccess: async () => {
      await templateOverridesQuery.refetch();
    },
  });
  const importReadyTemplateOverridesMutation = trpc.medical.importReadyTemplateOverrides.useMutation({
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
  const patientStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localDraftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAppliedDraftRef = useRef<string | null>(null);
  const hydratedPatientStateRef = useRef<number | null>(null);
  const importInputId = "ready-prescriptions-import";
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const importPollRef = useRef<number | null>(null);
  const [importStatus, setImportStatus] = useState<string>("");
  const [importPath, setImportPath] = useState(
    "E:\\SELRS.cc\\روشتات\\ready_prescriptions_multisheet_import.xlsx"
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
  const patientQuery = trpc.patient.getPatient.useQuery(
    patientId ?? 0,
    { enabled: Boolean(patientId), refetchOnWindowFocus: false }
  );

  const createPrescriptionMutation = trpc.medical.createPrescriptionWithItems.useMutation({
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
      hadDark = root.classList.contains("dark") || body.classList.contains("dark");
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
    if (isReadOnly) return;
    const data = (patientStateQuery.data as any)?.data;
    if (!data) return;
    if (hydratedPatientStateRef.current === patientId) return;
    if (data.prescriptionDate) setPrescriptionDate(data.prescriptionDate);
    if (data.generalNotes !== undefined) setGeneralNotes(data.generalNotes ?? "");
    if (data.medicationSearch !== undefined) setMedicationSearch(data.medicationSearch ?? "");
    if (Array.isArray(data.prescriptionItems)) setPrescriptionItems(data.prescriptionItems);
    hydratedPatientStateRef.current = patientId;
  }, [patientStateQuery.data, isReadOnly, patientId]);

  useEffect(() => {
    if (isReadOnly) return;
    const patientKey = patientId ? `selrs:patient-draft:prescription:${patientId}` : null;
    const tempKey = "selrs:patient-draft:prescription:temp";
    const keysToCheck = patientKey ? [patientKey, tempKey] : [tempKey];
    try {
      const raw = readDraft(keysToCheck);
      if (raw) {
        const key = keysToCheck.find((k) => raw && readDraft([k]) === raw) ?? keysToCheck[0];
        const parsed = JSON.parse(raw) as { updatedAt?: string; data?: any } | null;
        if (!parsed?.data) return;
        const draftUpdatedAt = Date.parse(parsed.updatedAt ?? "");
        const serverUpdatedAt = Date.parse((patientStateQuery.data as any)?.updatedAt ?? "");
        if (!Number.isFinite(draftUpdatedAt)) return;
        if (Number.isFinite(serverUpdatedAt) && draftUpdatedAt <= serverUpdatedAt) return;
        const signature = `${key}:${parsed.updatedAt ?? ""}`;
        if (lastAppliedDraftRef.current === signature) return;
        lastAppliedDraftRef.current = signature;
        if (parsed.data.prescriptionDate) setPrescriptionDate(parsed.data.prescriptionDate);
        if (parsed.data.generalNotes !== undefined) setGeneralNotes(parsed.data.generalNotes ?? "");
        if (parsed.data.medicationSearch !== undefined) setMedicationSearch(parsed.data.medicationSearch ?? "");
        if (Array.isArray(parsed.data.prescriptionItems)) setPrescriptionItems(parsed.data.prescriptionItems);
        if (patientKey && key === tempKey) {
          writeDraft(patientKey, parsed as any);
          try {
            window.localStorage.removeItem(tempKey);
            window.sessionStorage.removeItem(tempKey);
          } catch {
            // Ignore storage failures.
          }
        }
        toast.info("تم استرجاع مسودة محفوظة تلقائياً");
        return;
      }
    } catch {
      // Ignore invalid local draft.
    }
  }, [patientId, isReadOnly, patientStateQuery.data]);

  useEffect(() => {
    if (!patientId || isReadOnly) return;
    if (patientStateTimerRef.current) clearTimeout(patientStateTimerRef.current);
    const payload = {
      prescriptionDate,
      generalNotes,
      medicationSearch,
      prescriptionItems,
    };
    patientStateTimerRef.current = setTimeout(() => {
      savePatientPageState({ patientId, page: "prescription", data: payload });
    }, 800);
    return () => {
      if (patientStateTimerRef.current) clearTimeout(patientStateTimerRef.current);
    };
  }, [patientId, isReadOnly, prescriptionDate, generalNotes, medicationSearch, prescriptionItems, savePatientPageState]);

  useEffect(() => {
    if (isReadOnly) return;
    if (localDraftTimerRef.current) clearTimeout(localDraftTimerRef.current);
    const payload = {
      prescriptionDate,
      generalNotes,
      medicationSearch,
      prescriptionItems,
    };
    localDraftTimerRef.current = setTimeout(() => {
      const key = patientId
        ? `selrs:patient-draft:prescription:${patientId}`
        : "selrs:patient-draft:prescription:temp";
      const draft = {
        updatedAt: new Date().toISOString(),
        data: payload,
      };
      writeDraft(key, draft);
    }, 400);
    return () => {
      if (localDraftTimerRef.current) clearTimeout(localDraftTimerRef.current);
    };
  }, [patientId, isReadOnly, prescriptionDate, generalNotes, medicationSearch, prescriptionItems]);

  useEffect(() => {
    if (isReadOnly) return;
    const persistNow = () => {
      const payload = {
        prescriptionDate,
        generalNotes,
        medicationSearch,
        prescriptionItems,
      };
      const draft = {
        updatedAt: new Date().toISOString(),
        data: payload,
      };
      const key = patientId
        ? `selrs:patient-draft:prescription:${patientId}`
        : "selrs:patient-draft:prescription:temp";
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
  }, [patientId, isReadOnly, prescriptionDate, generalNotes, medicationSearch, prescriptionItems]);

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
      const stored = localStorage.getItem(`tabs:${READY_TABS_PERSIST_KEY}`) || "";
      if (READY_TABS.includes(stored)) return stored;
    } catch {
      // ignore
    }
    return "أخرى 1";
  });
  const deletePrescriptionMutation = trpc.medical.deletePrescription.useMutation({
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

  const stripTemplateCategory = (value: string) =>
    String(value ?? "").replace(/^\[(.+?)\]\s*/, "").trim();

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
    (template) => getTemplateCategory(template.id, template.name) === readyTab
  );
  const filteredReadyTemplateIds = filteredReadyTemplates.map((template) => template.id);
  const allFilteredReadyTemplatesSelected =
    filteredReadyTemplateIds.length > 0 &&
    filteredReadyTemplateIds.every((id) => selectedTemplateIds.includes(id));

  const handleSelectPatient = (patient: { id: number; fullName: string; age?: number | null }) => {
    setPatientId(patient.id);
    setPatientName(patient.fullName ?? "");
    setPatientAge(patient.age != null ? String(patient.age) : "");
    setLocation(`/prescription/${patient.id}`);
  };

  const historyQuery = trpc.medical.getPrescriptionsWithItemsByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), refetchOnWindowFocus: false }
  );
  useEffect(() => {
    if (!isReadOnly) return;
    const history = (historyQuery.data ?? []) as any[];
    if (!history.length) {
      setPrescriptionItems([]);
      return;
    }
    const latest = history[0];
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
    if (latest.prescriptionDate) {
      const dateValue = toDateInputValue(latest.prescriptionDate);
      if (dateValue) setPrescriptionDate(dateValue);
    }
  }, [historyQuery.data, isReadOnly]);

  const handleRemoveItem = (id: string) => {
    if (isReadOnly) return;
    setPrescriptionItems(prescriptionItems.filter((item) => item.id !== id));
    toast.success("تم حذف الدواء من الروشتة");
  };

  const handleSave = async () => {
    if (isReadOnly) {
      toast.error("التعديل متاح للأدمن فقط.");
      return;
    }
    if (!patientId) {
      toast.error("يرجى اختيار المريض أولاً.");
      return;
    }
    const itemsToSave = prescriptionItems.filter(
      (item) =>
        (typeof item.medicationId === "number" && item.medicationId > 0) ||
        Boolean(item.medicationName && item.medicationName.trim())
    );
    if (itemsToSave.length === 0) {
      toast.error("يرجى إضافة دواء واحد على الأقل.");
      return;
    }
    console.log("Saving prescription items:", itemsToSave);
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
    void printOrExportPdf(`${String(patientName || patientId || "prescription").trim()}.pdf`);
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
        .includes(term)
    );
  }, [medicationsQuery.data, medicationSearch]);

  const handleToggleMedication = (med: any) => {
    if (isReadOnly) return;
    const exists = prescriptionItems.find((item) => item.medicationId === med.id);
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

  const formatItemDetails = (item: PrescriptionItem) => {
    if (item.instructions?.trim()) return item.instructions.trim();
    const parts = [item.dosage, item.frequency, item.duration]
      .map((p) => String(p ?? "").trim())
      .filter(Boolean);
    return parts.join(" ");
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
      console.log("[importReadyPrescriptions] file", {
        name: file.name,
        size: file.size,
        type: file.type,
      });
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
          .map((row) => ({ ...row, __sheetName: sheetName, __sheetIndex: sheetIndex }));
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
          getRowValue(lookup, "templateId", "template_id", "template id", "كود القالب") ?? ""
        );
        const templateNameRaw = String(
          getRowValue(lookup, "templateName", "template_name", "template name", "اسم القالب") ?? ""
        );
        const templateKeyRaw = String(
          getRowValue(lookup, "templateKey", "template_key", "template key") ?? ""
        );
        const sheetNameRaw = String((row as any).__sheetName ?? "");
        const sheetIndexRaw = Number((row as any).__sheetIndex ?? -1);
        const medicationName = String(
          getRowValue(lookup, "medicationName", "medication_name", "medication name", "اسم الدواء") ?? ""
        ).trim();
        const dosage = String(getRowValue(lookup, "dosage", "الجرعة", "جرعة") ?? "").trim();
        const frequency = String(getRowValue(lookup, "frequency", "التكرار") ?? "").trim();
        const duration = String(getRowValue(lookup, "duration", "المدة") ?? "").trim();
        const instructions = String(getRowValue(lookup, "instructions", "التعليمات") ?? "").trim();

        const normalizedBaseId =
          normalizeTemplateId(templateKeyRaw) ||
          normalizeTemplateId(
            templateIdRaw && sheetIndexRaw >= 0
              ? `${templateIdRaw}__s${sheetIndexRaw}`
              : ""
          ) ||
          normalizeTemplateId(templateIdRaw) ||
          normalizeTemplateId(
            templateNameRaw && sheetIndexRaw >= 0
              ? `${templateNameRaw}__s${sheetIndexRaw}`
              : ""
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

      const templates = Array.from(grouped.values()).filter((t) => t.prescriptionItems.length > 0);
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

  const handleImportReadyPrescriptions = async (event: ChangeEvent<HTMLInputElement>) => {
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
      const result = await importReadyTemplateOverridesFromFileMutation.mutateAsync({
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
    const sourceItems = templateOverrides[templateId]?.prescriptionItems ?? template.items;
    setPrescriptionItems(
      sourceItems.map((item, idx) => ({
        id: `ready-${templateId}-${idx}-${Date.now()}`,
        medicationId: 0,
        medicationName: item.medicationName,
        dosage: item.dosage ?? "",
        frequency: item.frequency ?? "",
        duration: item.duration ?? "",
        instructions: item.instructions ?? "",
      }))
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
      toast.error(getTrpcErrorMessage(error, "Failed to save template content."));
    }
  };

  const getTemplateDisplayName = (templateId: string, fallbackName: string) =>
    stripTemplateCategory(getTemplateRawName(templateId, fallbackName));

  const handleRenameTemplate = async (templateId: string, fallbackName: string) => {
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
          name: !clean || clean === fallbackName ? (currentCategory ? nameWithCategory : "") : nameWithCategory,
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
    category: string
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
      toast.error(getTrpcErrorMessage(error, "Failed to update template category."));
    }
  };

  const handleMoveSelectedTemplates = async () => {
    const idsToMove = selectedTemplateIds.filter((id) =>
      filteredReadyTemplateIds.includes(id)
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
        const baseName = stripTemplateCategory(raw) || template.name || templateId;
        await upsertTemplateOverrideMutation.mutateAsync({
          scope: "prescription",
          templateId,
          name: `[${moveReadyTabTarget}] ${baseName}`,
        });
      }
      await templateOverridesQuery.refetch();
      setSelectedTemplateIds((prev) => prev.filter((id) => !idsToMove.includes(id)));
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
      toast.error(getTrpcErrorMessage(error, "Failed to delete template override."));
    }
  };
  return (
    <div className="prescription-root min-h-screen bg-background" dir="rtl" style={{ direction: "rtl" }}>
      {printMode.printView ? null : (
        <div className="mx-auto max-w-[1280px] px-4 pt-4 md:px-6">
          <PageHeader title="كتابة الروشتة" subtitle="صف الأدوية والتعليمات قبل وبعد العملية" icon={<Pill className="h-5 w-5" />} />
        </div>
      )}

      <main data-mobile-pdf-root className={`mx-auto max-w-[1280px] print:p-0 ${printMode.printView ? "px-3 py-3" : "px-4 pb-8 pt-2 md:px-6"}`}>
        {printMode.printView ? (
          <PrintPreviewBanner
            title="طباعة الروشتة"
            subtitle={patientName || undefined}
            onPrint={handlePrint}
          />
        ) : null}
            <div className={isReadOnly ? "space-y-6" : "grid grid-cols-1 lg:grid-cols-[0.65fr_1.35fr] gap-6"}>
                <div className="space-y-6">
              <Card className="print:hidden">
                <CardContent className="space-y-4 pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <PatientPicker initialPatientId={patientId ?? undefined} onSelect={handleSelectPatient} />
                    </div>
                    <div className="space-y-1">
                      <Input
                        type="date"
                        value={prescriptionDate}
                        onChange={(e) => setPrescriptionDate(e.target.value)}
                        disabled={isReadOnly}
                      />
                      <span className="text-[10px] text-muted-foreground">{formatDateLabel(prescriptionDate)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {!isReadOnly && (
                <Card className="print:hidden">
                <div className="flex items-center gap-3 px-6 pt-6 flex-nowrap">
                  <div className="text-sm font-semibold shrink-0">الأدوية المتاحة</div>
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
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setMedicationsOpen((prev) => !prev)}
                      title={medicationsOpen ? "إخفاء الأدوية" : "عرض الأدوية"}
                      aria-label={medicationsOpen ? "إخفاء الأدوية" : "عرض الأدوية"}
                    >
                      {medicationsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                {medicationsOpen ? (
                  <CardContent className="space-y-2 max-h-80 overflow-y-auto">
                    <Button
                      className="w-full"
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
                    {availableMedications.map((med) => {
                      const checked = prescriptionItems.some((item) => item.medicationId === med.id);
                      return (
                        <label key={med.id} className="flex items-center justify-between gap-2 rounded border p-2" dir="ltr">
                          <span className="text-sm text-left">{med.name}</span>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleToggleMedication(med)}
                          />
                        </label>
                      );
                    })}
                    {availableMedications.length === 0 && (
                      <p className="text-center text-muted-foreground">لا توجد أدوية</p>
                    )}
                  </CardContent>
                ) : null}
                </Card>
              )}
              </div>
              <div className="space-y-6">
            {!isReadOnly && (
              <Card className="print:hidden">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>روشتات جاهزة</CardTitle>
                    {canImportReadyTemplates ? (
                      <div className="flex items-center gap-2">
                        <input
                          ref={importInputRef}
                          id={importInputId}
                          type="file"
                          accept=".xlsx,.xls"
                          className="sr-only"
                          onChange={(e) => void handleImportReadyPrescriptions(e)}
                        />
                        <Button type="button" variant="outline" size="sm" onClick={startFilePick}>
                          <Upload className="h-4 w-4 ml-1" />
                          Import Excel
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {canImportReadyTemplates ? (
                    <>
                      <div className="text-xs text-muted-foreground">استيراد مباشر من مسار السيرفر</div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Input
                          value={importPath}
                          onChange={(e) => setImportPath(e.target.value)}
                          placeholder="E:\\path\\to\\file.xlsx"
                          className="text-left"
                          dir="ltr"
                        />
                        <Button type="button" variant="secondary" size="sm" onClick={handleImportFromPath}>
                          استيراد من المسار
                        </Button>
                      </div>
                      {importStatus ? (
                        <div className="text-xs text-muted-foreground">{importStatus}</div>
                      ) : null}
                    </>
                  ) : null}
                  <Tabs value={readyTab} onValueChange={setReadyTab} persistKey={READY_TABS_PERSIST_KEY} dir="rtl">
                    <TabsList className="w-full justify-start gap-2 overflow-x-auto flex-nowrap">
                      {READY_TABS.map((tab) => (
                        <TabsTrigger key={tab} value={tab} className="text-xs whitespace-nowrap">
                          {tab}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                  <div className="flex flex-wrap items-center gap-2 rounded border p-2">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={allFilteredReadyTemplatesSelected}
                        onCheckedChange={(checked) => {
                          if (Boolean(checked)) {
                            setSelectedTemplateIds((prev) =>
                              Array.from(new Set([...prev, ...filteredReadyTemplateIds]))
                            );
                            return;
                          }
                          setSelectedTemplateIds((prev) =>
                            prev.filter((id) => !filteredReadyTemplateIds.includes(id))
                          );
                        }}
                      />
                      تحديد الكل
                    </label>
                    <Select value={moveReadyTabTarget} onValueChange={setMoveReadyTabTarget}>
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
                </CardContent>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 max-h-[55vh] overflow-y-auto">
                  {filteredReadyTemplates.map((template) => (
                    <div key={template.id} className="flex items-center gap-1">
                      <Checkbox
                        checked={selectedTemplateIds.includes(template.id)}
                        onCheckedChange={(checked) =>
                          setSelectedTemplateIds((prev) =>
                            Boolean(checked)
                              ? Array.from(new Set([...prev, template.id]))
                              : prev.filter((id) => id !== template.id)
                          )
                        }
                      />
                      <Button
                        variant="outline"
                        type="button"
                        className="justify-start flex-1 h-8 px-2 text-xs"
                        onClick={() => handleApplyReadyPrescription(template.id)}
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
                        onClick={() => handleRenameTemplate(template.id, template.name)}
                        title="Rename"
                        aria-label="Rename template"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        onClick={() => handleDeleteTemplateOverride(template.id)}
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
              </Card>
            )}

              <div className="prescription-print-content space-y-6" data-print-prescription-content>


            <div className="hidden print:block">
              <div className="pt-2 flex items-center justify-between gap-4 text-sm" dir="rtl">
                <span className="inline-flex items-center gap-1" dir="rtl">
                  <span className="font-semibold">الاسم:</span>
                  <span>{patientName}</span>
                </span>
                {prescriptionDate ? (
                  <span className="inline-flex items-center gap-1" dir="rtl">
                    <span className="font-semibold">التاريخ:</span>
                    <span dir="ltr">{formatDateLabel(prescriptionDate)}</span>
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1" dir="rtl">
                  <span className="font-semibold">الكود:</span>
                  <span dir="ltr">{patientCode || (patientId != null ? String(patientId) : "")}</span>
                </span>
              </div>
            </div>

            <Card className="print:[direction:ltr] print:border-0 print:shadow-none">
              <CardHeader className="hidden print:hidden" />
              <CardContent className="prescription-print-rx space-y-3 pt-3">
                <div className="text-base font-semibold">R/</div>
                {isReadOnly ? (
                  prescriptionItems.length === 0 ? (
                    <p className="text-center text-muted-foreground">لا توجد روشتة مسجلة لهذا المريض</p>
                ) : (
                  prescriptionItems.map((item) => (
                    <div key={item.id} className="border rounded-lg p-3 print:border-0 print:rounded-none">
                      <div className="font-bold">{item.medicationName}</div>
                      {item.instructions ? (
                        <div className="mt-1 text-sm whitespace-pre-line">{item.instructions}</div>
                      ) : null}
                    </div>
                  ))
                )
              ) : (
                  prescriptionItems.length === 0 ? (
                    <p className="text-center text-muted-foreground">لا توجد أدوية بعد</p>
                  ) : (
                    filteredItems.map((item) => (
                      <div key={item.id} className="border rounded-lg p-3 print:border-0 print:rounded-none">
                        <div className="flex items-start justify-between gap-3" dir="ltr">
                          <div className="flex-1 space-y-2">
                            <Input
                              value={item.medicationName}
                              onChange={(e) =>
                                setPrescriptionItems((prev) =>
                                  prev.map((p) =>
                                    p.id === item.id
                                      ? { ...p, medicationName: e.target.value }
                                      : p
                                  )
                                )
                              }
                              placeholder="Medication name"
                              className="print:hidden text-left"
                              dir="ltr"
                            />
                            <div className="hidden print:block font-bold text-left">{item.medicationName}</div>
                            {item.instructions ? (
                              <div className="hidden print:block mt-1 text-sm whitespace-pre-line text-right" dir="rtl">
                                {item.instructions}
                              </div>
                            ) : null}
                            <Textarea
                              value={item.instructions}
                              onChange={(e) =>
                                setPrescriptionItems((prev) =>
                                  prev.map((p) =>
                                    p.id === item.id
                                      ? { ...p, instructions: e.target.value }
                                      : p
                                  )
                                )
                              }
                              placeholder="الجرعة / التكرار / المدة / تعليمات"
                              className="min-h-12 text-center w-full print:hidden"
                            />
                          </div>
                          <Button size="icon" variant="destructive" onClick={() => handleRemoveItem(item.id)} className="print:hidden">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )
                )}
              </CardContent>
            </Card>
          </div>
          <section className="hidden print:block prescription-print-backside" dir="rtl">
          <div className="space-y-6 text-[14px] leading-7">
            <div>
              <h3 className="font-bold mb-2">قبل العملية</h3>
              <ul className="space-y-1 pr-5 list-disc">
                {preOpInstructions.map((line, idx) => (
                  <li key={`pre-${idx}`}>{line}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-2">بعد العملية</h3>
              <ul className="space-y-1 pr-5 list-disc">
                {postOpInstructions.map((line, idx) => (
                  <li key={`post-${idx}`}>{line}</li>
                ))}
              </ul>
            </div>
            <p className="text-center font-semibold pt-4">مع تمنياتنا لكم الشفاء العاجل</p>
          </div>
        </section>
        <div className={`print:hidden mt-4 ${printMode.printView ? "hidden" : ""}`}>
          {patientId ? (
            <Card>
              <CardHeader>
                <CardTitle>الروشتات السابقة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {historyQuery.isLoading ? (
                  <p className="text-center text-muted-foreground">جاري التحميل...</p>
                ) : (historyQuery.data ?? []).filter((rx: any) => (rx.items ?? []).length > 0).length === 0 ? (
                  <p className="text-center text-muted-foreground">لا توجد روشتات سابقة</p>
                ) : (
                  (historyQuery.data ?? [])
                    .filter((rx: any) => (rx.items ?? []).length > 0)
                    .map((rx: any) => (
                    <div key={rx.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">التاريخ</span>
                          <span>{rx.prescriptionDate ? formatDateLabel(rx.prescriptionDate) : ""}</span>
                        </div>
                        {canDeletePrescriptions ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={async () => {
                              if (!window.confirm("هل أنت متأكد من حذف الروشتة؟")) return;
                              await deletePrescriptionMutation.mutateAsync({ prescriptionId: Number(rx.id) });
                            }}
                          >
                            <Trash2 className="h-4 w-4 ml-1" />
                            حذف
                          </Button>
                        ) : null}
                      </div>
                      <div className="mt-2 space-y-2">
                        {(rx.items ?? []).length === 0 ? (
                          <p className="text-sm text-muted-foreground">لا توجد أدوية</p>
                        ) : (
                          (rx.items ?? []).map((item: any) => (
                            <div key={item.id} className="text-sm">
                              <span className="font-semibold">{item.medicationName || `#${item.medicationId ?? ""}`}</span>
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
                                    medicationName: item.medicationName ?? "",
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
                        <div className="mt-2 text-xs text-muted-foreground">{rx.notes}</div>
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ) : (
            <p className="text-center text-muted-foreground">اختر مريضاً لعرض الروشتات السابقة</p>
          )}
        </div>
        <div className={`print:hidden flex justify-end gap-2 mt-4 ${printMode.printView ? "hidden" : ""}`}>
          {!isReadOnly && (
            <Button
              variant="outline"
              onClick={handleSave}
              type="button"
            >
              <Save className="h-4 w-4 ml-2" />
              حفظ
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handlePrint}
            type="button"
          >
            <Printer className="h-4 w-4 ml-2" />
            طباعة
          </Button>
        </div>
              </div>
        </div>
      </main>
      <style>{`
        .prescription-root input[type="date"]::-webkit-calendar-picker-indicator {
          width: 14px;
          height: 14px;
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
              margin: 10mm;
            }
          .prescription-root {
            min-height: auto !important;
          }
          .prescription-root [data-print-prescription-content] {
            margin-top: 30mm !important;
          }
          .prescription-root main,
          .prescription-root [data-print-prescription-content] {
            display: block !important;
            overflow: visible !important;
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
            padding-top: 0 !important;
          }
          .prescription-root .prescription-print-rx > div,
          .prescription-root .prescription-print-rx > p {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .prescription-root .prescription-print-backside {
            page-break-before: always;
            break-before: page;
            padding-top: 6mm;
          }
        }
      `}</style>
    </div>
  );
}


