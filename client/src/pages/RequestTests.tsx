import { useAuth } from "@/hooks/useAuth";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardList,
  FileText,
  Printer,
  Save,
  Trash2,
  UserRound,
  Upload,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatDateLabel, getTrpcErrorMessage } from "@/lib/utils";
import PatientPicker from "@/components/PatientPicker";
import KfPatientPicker, {
  type KfPatientOption,
} from "@/features/kf/KfPatientPicker";
import { trpc } from "@/lib/trpc";
import PageHeader from "@/components/PageHeader";
import { usePrintMode } from "@/hooks/usePrintMode";
import PrintPreviewBanner from "@/components/PrintPreviewBanner";
import { printOrExportPdf } from "@/lib/nativePdf";
import { loadXlsx } from "@/lib/xlsx";
import { buildRowLookup, getRowValue } from "@/lib/importUtils";
import { DateInput } from "@/components/ui/date-input";
import { READY_TEST_TEMPLATES } from "@/data/readyTestTemplates";

interface TestItem {
  id: number;
  name: string;
  category: string;
  selected: boolean;
  notes: string;
  isCustom?: boolean;
}

export type RequestTestsProps = {
  hidePageChrome?: boolean;
  hubVisitDate?: string;
  embeddedInPatientHub?: boolean;
  patientHubReadOnly?: boolean;
  patientHubViewOnlyHint?: string;
};

export default function RequestTests({
  hidePageChrome,
  hubVisitDate,
  embeddedInPatientHub,
  patientHubReadOnly,
  patientHubViewOnlyHint = "العرض فقط داخل المركز",
}: RequestTestsProps = {}) {
  const { isAuthenticated, user } = useAuth();
  const [location, setLocation] = useLocation();
  const [, params] = useRoute("/request-tests/:id");
  const [, kfParams] = useRoute("/kf/request-tests/:id");
  const [, hubParams] = useRoute("/patient-hub/request-tests/:id");
  const mergedParams = params ?? kfParams ?? hubParams;
  const isKfRoute = location.startsWith("/kf/request-tests");
  const draftScope = isKfRoute ? "kf-request-tests" : "request-tests";
  const printMode = usePrintMode();
  const initialPatientId = mergedParams?.id ? Number(mergedParams.id) : 0;

  const isAdmin = user?.role === "admin";
  const isReadOnly = !isAdmin;
  const editingForbidden = isReadOnly || Boolean(patientHubReadOnly);
  const canImportReadyTemplates = isAdmin;
  const importInputId = "ready-tests-import";
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const importPollRef = useRef<number | null>(null);
  const [importStatus, setImportStatus] = useState<string>("");
  const [importPath, setImportPath] = useState("");

  const [patientId, setPatientId] = useState<number | null>(
    initialPatientId > 0 ? initialPatientId : null,
  );
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientCode, setPatientCode] = useState("");
  const [requestDate, setRequestDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [locationTypeFilter, setLocationTypeFilter] = useState<
    "all" | "center" | "external"
  >("all");

  useEffect(() => {
    if (hubVisitDate && /^\d{4}-\d{2}-\d{2}$/.test(hubVisitDate)) {
      setRequestDate(hubVisitDate);
    }
  }, [hubVisitDate]);

  const [selectedTests, setSelectedTests] = useState<TestItem[]>([]);
  const [generalNotes, setGeneralNotes] = useState("");
  const patientStateQuery = trpc.medical.getPatientPageState.useQuery(
    { patientId: patientId ?? 0, page: "request-tests" },
    {
      enabled: Boolean(patientId) && !editingForbidden && !isKfRoute,
      refetchOnWindowFocus: false,
    },
  );
  const savePatientStateMutation =
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
  const templateOverridesQuery = trpc.medical.getReadyTemplateOverrides.useQuery(
    { scope: "tests" },
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

  const createRequestMutation = trpc.medical.createTestRequest.useMutation({
    onSuccess: () => {
      toast.success("Test request saved successfully.");
    },
    onError: (error: unknown) => {
      toast.error(getTrpcErrorMessage(error, "Failed to save test request."));
    },
  });

  useEffect(() => {
    if (editingForbidden) return;
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
    const data = (patientStateQuery.data as any)?.data;
    if (!data) return;
    if (hydratedPatientStateRef.current === patientId) return;
    if (data.requestDate) setRequestDate(data.requestDate);
    if (data.generalNotes !== undefined)
      setGeneralNotes(data.generalNotes ?? "");
    if (Array.isArray(data.selectedTests)) setSelectedTests(data.selectedTests);
    hydratedPatientStateRef.current = patientId;
  }, [patientStateQuery.data, patientId]);

  useEffect(() => {
    if (editingForbidden || printMode.printView) return;
    const patientKey = patientId
      ? `selrs:patient-draft:${draftScope}:${patientId}`
      : null;
    const tempKey = `selrs:patient-draft:${draftScope}:temp`;
    const keysToCheck = patientKey ? [patientKey, tempKey] : [tempKey];
    try {
      const raw = readDraft(keysToCheck);
      if (raw) {
        const key =
          keysToCheck.find((k) => raw && readDraft([k]) === raw) ??
          keysToCheck[0];
        const parsed = JSON.parse(raw) as {
          updatedAt?: string;
          data?: any;
        } | null;
        if (!parsed?.data) return;
        const draftUpdatedAt = Date.parse(parsed.updatedAt ?? "");
        const serverUpdatedAt = Date.parse(
          (patientStateQuery.data as any)?.updatedAt ?? "",
        );
        if (!Number.isFinite(draftUpdatedAt)) return;
        if (
          Number.isFinite(serverUpdatedAt) &&
          draftUpdatedAt <= serverUpdatedAt
        )
          return;
        const signature = `${key}:${parsed.updatedAt ?? ""}`;
        if (lastAppliedDraftRef.current === signature) return;
        lastAppliedDraftRef.current = signature;
        if (parsed.data.requestDate) setRequestDate(parsed.data.requestDate);
        if (parsed.data.generalNotes !== undefined)
          setGeneralNotes(parsed.data.generalNotes ?? "");
        if (Array.isArray(parsed.data.selectedTests))
          setSelectedTests(parsed.data.selectedTests);
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
      }
    } catch {
      // Ignore invalid local draft.
    }
  }, [patientId, patientStateQuery.data, draftScope, editingForbidden, printMode.printView]);

  useEffect(() => {
    if (!patientId || editingForbidden) return;
    if (isKfRoute) return;
    if (patientStateTimerRef.current)
      clearTimeout(patientStateTimerRef.current);
    const payload = {
      requestDate,
      generalNotes,
      selectedTests,
    };
    patientStateTimerRef.current = setTimeout(() => {
      savePatientStateMutation.mutate({
        patientId,
        page: "request-tests",
        data: payload,
      });
    }, 800);
    return () => {
      if (patientStateTimerRef.current)
        clearTimeout(patientStateTimerRef.current);
    };
  }, [
    patientId,
    editingForbidden,
    requestDate,
    generalNotes,
    selectedTests,
    savePatientStateMutation,
    isKfRoute,
  ]);

  useEffect(() => {
    if (editingForbidden) return;
    if (localDraftTimerRef.current) clearTimeout(localDraftTimerRef.current);
    const payload = {
      requestDate,
      generalNotes,
      selectedTests,
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
    requestDate,
    generalNotes,
    selectedTests,
    draftScope,
  ]);

  useEffect(() => {
    if (editingForbidden) return;
    const persistNow = () => {
      const payload = {
        requestDate,
        generalNotes,
        selectedTests,
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
    requestDate,
    generalNotes,
    selectedTests,
    draftScope,
  ]);

  if (!isAuthenticated) return null;

  const templateOverrides = (templateOverridesQuery.data ?? {}) as Record<
    string,
    {
      name?: string;
      testItems?: Array<{
        testId: number;
        testName?: string;
        notes?: string;
      }>;
    }
  >;
  const READY_TABS = ["مياه بيضاء", "ليزك", "زراعة عدسات", "اخري"];
  const READY_TABS_PERSIST_KEY = "ready-tests";
  const [readyTab, setReadyTab] = useState(() => {
    if (typeof window === "undefined") return "اخري";
    try {
      const stored =
        localStorage.getItem(`tabs:${READY_TABS_PERSIST_KEY}`) || "";
      if (READY_TABS.includes(stored)) return stored;
    } catch {
      // ignore
    }
    return "اخري";
  });
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [moveReadyTabTarget, setMoveReadyTabTarget] = useState("مياه بيضاء");

  const normalizeTemplateId = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\p{L}\p{N}\-_]/gu, "")
      .slice(0, 64);

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
    return readTemplateCategory(raw) || "اخري";
  };

  const readyTemplates = [
    ...READY_TEST_TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      items: t.items,
    })),
    ...Object.keys(templateOverrides)
      .filter((id) => !READY_TEST_TEMPLATES.some((t) => t.id === id))
      .map((id) => ({
        id,
        name: templateOverrides[id]?.name?.trim() || id,
        items: templateOverrides[id]?.testItems ?? [],
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

  const getTemplateDisplayName = (templateId: string, fallbackName: string) =>
    stripTemplateCategory(getTemplateRawName(templateId, fallbackName));

  const handleApplyReadyTestTemplate = (templateId: string) => {
    if (editingForbidden) return;
    const template = readyTemplates.find((t) => t.id === templateId);
    if (!template) return;
    const sourceItems =
      templateOverrides[templateId]?.testItems ?? template.items;
    setSelectedTests(
      sourceItems.map((item) => ({
        id: item.testId,
        name: item.testName || "",
        category: "",
        selected: true,
        notes: item.notes ?? "",
      })),
    );
  };

  const handleSaveTemplateContent = async (templateId: string) => {
    const items = selectedTests
      .map((t) => ({
        testId: t.id,
        testName: t.name,
        notes: t.notes ?? "",
      }))
      .filter((item) => item.testId > 0);
    try {
      await upsertTemplateOverrideMutation.mutateAsync({
        scope: "tests",
        templateId,
        testItems: items,
      });
      toast.success("تم حفظ محتوى القالب");
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "فشل حفظ محتوى القالب."));
    }
  };

  const handleRenameTemplate = async (
    templateId: string,
    fallbackName: string,
  ) => {
    const currentRaw = getTemplateRawName(templateId, fallbackName);
    const currentCategory = readTemplateCategory(currentRaw);
    const currentName = stripTemplateCategory(currentRaw) || fallbackName;
    const nextName = window.prompt("إعادة تسمية القالب", currentName);
    if (nextName === null) return;

    const clean = nextName.trim();
    try {
      if (!clean && currentCategory) {
        await upsertTemplateOverrideMutation.mutateAsync({
          scope: "tests",
          templateId,
          name: `[${currentCategory}] ${fallbackName}`,
        });
      } else {
        const nameWithCategory = currentCategory
          ? `[${currentCategory}] ${clean || fallbackName}`
          : clean;
        await upsertTemplateOverrideMutation.mutateAsync({
          scope: "tests",
          templateId,
          name:
            !clean || clean === fallbackName
              ? currentCategory
                ? nameWithCategory
                : ""
              : nameWithCategory,
        });
      }
      toast.success("تم تحديث اسم القالب");
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "فشل إعادة تسمية القالب."));
    }
  };

  const handleMoveSelectedTemplates = async () => {
    const idsToMove = selectedTemplateIds.filter((id) =>
      filteredReadyTemplateIds.includes(id),
    );
    if (idsToMove.length === 0) {
      toast.error("اختر قالب واحد على الأقل");
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
          scope: "tests",
          templateId,
          name: `[${moveReadyTabTarget}] ${baseName}`,
        });
      }
      await templateOverridesQuery.refetch();
      setSelectedTemplateIds((prev) =>
        prev.filter((id) => !idsToMove.includes(id)),
      );
      toast.success(`تم نقل ${idsToMove.length} قالب`);
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "فشل نقل القوالب."));
    }
  };

  const handleDeleteTemplateOverride = async (templateId: string) => {
    try {
      await upsertTemplateOverrideMutation.mutateAsync({
        scope: "tests",
        templateId,
        name: "",
        testItems: [],
      });
      toast.success("تم حذف القالب");
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "فشل حذف القالب."));
    }
  };

  const importFromFile = async (file: File) => {
    try {
      toast.info(`جارٍ استيراد الملف: ${file.name}`);
      setImportStatus(`تم اختيار الملف: ${file.name}`);
      const buffer = await file.arrayBuffer();
      const XLSX = await loadXlsx();
      const workbook = XLSX.read(buffer, { type: "array" });
      if (!workbook.SheetNames.length) {
        toast.error("الملف لا يحتوي على شيتات.");
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
          testItems: Array<{ testId: number; testName: string; notes: string }>;
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
        const testIdRaw = String(
          getRowValue(lookup, "testId", "test_id", "test id", "كود الفحص") ?? "",
        ).trim();
        const testNameRaw = String(
          getRowValue(lookup, "testName", "test_name", "test name", "اسم الفحص") ??
            "",
        ).trim();
        const notesRaw = String(
          getRowValue(lookup, "notes", "ملاحظات") ?? "",
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
        const testId = Number(testIdRaw) || 0;
        if (!normalizedId || (!testId && !testNameRaw)) continue;

        if (!grouped.has(normalizedId)) {
          grouped.set(normalizedId, {
            templateId: normalizedId,
            name: templateNameRaw.trim() || undefined,
            testItems: [],
          });
        }
        grouped.get(normalizedId)!.testItems.push({
          testId,
          testName: testNameRaw,
          notes: notesRaw,
        });
      }

      const templates = Array.from(grouped.values()).filter(
        (t) => t.testItems.length > 0,
      );
      if (templates.length === 0) {
        toast.error("لم يتم العثور على قوالب صالحة في الملف.");
        setImportStatus("فشل: لم يتم العثور على قوالب صالحة");
        return;
      }
      setImportStatus(`تم تحليل الملف: ${templates.length} قالب`);

      await importReadyTemplateOverridesMutation.mutateAsync({
        scope: "tests",
        templates,
      });
      toast.success(`تم استيراد ${templates.length} قالب`);
      setImportStatus(`تم الاستيراد: ${templates.length} قالب`);
    } catch (error) {
      console.error("[importReadyTestTemplates] failed", error);
      toast.error(getTrpcErrorMessage(error, "فشل استيراد القوالب."));
      setImportStatus("فشل: راجع الـ Console");
    } finally {
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
    }
  };

  const handleImportReadyTests = async (event: ChangeEvent<HTMLInputElement>) => {
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
          scope: "tests",
          filePath: trimmed,
        });
      setImportStatus(`تم الاستيراد: ${result.count} قالب`);
    } catch (error) {
      setImportStatus(getTrpcErrorMessage(error, "فشل الاستيراد من المسار."));
    }
  };

  const handleUpdateTestNotes = (testId: number, notes: string) => {
    if (editingForbidden) return;
    setSelectedTests(
      selectedTests.map((t) => (t.id === testId ? { ...t, notes } : t)),
    );
  };

  const handleRemoveTest = (testId: number) => {
    if (editingForbidden) return;
    setSelectedTests(selectedTests.filter((t) => t.id !== testId));
    toast.success("Test removed from request.");
  };

  const handleSaveRequest = async () => {
    if (editingForbidden) {
      toast.error(
        patientHubReadOnly
          ? patientHubViewOnlyHint
          : "التعديل متاح للأدمن فقط.",
      );
      return;
    }
    if (!patientId) {
      toast.error("Please select a patient first.");
      return;
    }
    if (isKfRoute) {
      toast.error("الحفظ داخل KF منفصل عن جداول طلبات الفحوصات العامة حالياً.");
      return;
    }
    if (selectedTests.length === 0) {
      toast.error("لا توجد فحوصات مسجّلة لحفظها.");
      return;
    }
    const validItems = selectedTests.filter((t) => t.id > 0);
    const skippedCount = selectedTests.length - validItems.length;
    if (validItems.length === 0) {
      toast.error(
        "لا توجد معرّفات فحوصات صالحة للحفظ (يلزم وجود الرقم في النظام).",
      );
      return;
    }
    if (skippedCount > 0) {
      toast.warning(
        `تم تجاهل ${skippedCount} فحص غير موجود بالنظام أثناء الحفظ.`,
      );
    }
    await createRequestMutation.mutateAsync({
      patientId,
      date: requestDate,
      notes: generalNotes,
      items: validItems.map((t) => ({ testId: t.id, notes: t.notes })),
    });
  };

  const handlePrint = () => {
    void printOrExportPdf(
      `${String(patientName || patientId || "request-tests").trim()}.pdf`,
    );
  };

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
        ? `/patient-hub/request-tests/${patient.id}`
        : isKfRoute
          ? `/kf/request-tests/${patient.id}`
          : `/request-tests/${patient.id}`,
    );
  };

  const handleSelectKfPatient = (patient: KfPatientOption) => {
    setPatientId(patient.kfId);
    setPatientName(patient.fullName ?? "");
    setPatientAge(patient.age != null ? String(patient.age) : "");
    setPatientCode(String(patient.kfCode ?? "").trim());
    setLocation(`/kf/request-tests/${patient.kfId}`);
  };

  return (
    <div
      className={cn(
        "request-tests-root bg-[#f5f7fb] text-[#172033]",
        hidePageChrome ? "min-h-0" : "min-h-screen",
      )}
      dir="rtl"
      style={{ direction: "rtl" }}
    >
      {printMode.printView ? null : hidePageChrome ? null : (
        <div className="print:hidden">
          <PageHeader backTo="/patients" />
        </div>
      )}

      <main
        data-mobile-pdf-root
        className={cn(
          "mx-auto print:p-0",
          hidePageChrome
            ? "max-w-none px-2 pb-4 pt-1"
            : "max-w-[1360px]",
          printMode.printView ? "px-3 py-3" : hidePageChrome ? "" : "px-4 py-8",
        )}
      >
        {printMode.printView ? (
          <PrintPreviewBanner
            title="طباعة طلب التحاليل"
            subtitle={patientName || undefined}
            onPrint={handlePrint}
          />
        ) : null}
        <div
          className={cn(
            "mx-auto grid gap-5",
            editingForbidden
              ? "max-w-4xl"
              : "max-w-[1360px] xl:grid-cols-[360px_minmax(0,1fr)]",
          )}
        >
          {/* Patient Selection (Hidden when embedded or printing) */}
          <aside className="space-y-4 print:hidden">
            {!embeddedInPatientHub && !printMode.printView && (
              <Card className="overflow-hidden border-[#d9e2ef] shadow-none">
                <CardHeader className="border-b border-[#e5ebf3] bg-[#f8fafc] px-4 py-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-bold text-[#1e3a66]">
                    <UserRound className="h-4 w-4" />
                    بيانات المريض
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-4">
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
                </CardContent>
              </Card>
            )}

            <Card className="overflow-hidden border-[#d9e2ef] shadow-none">
              <CardHeader className="border-b border-[#e5ebf3] bg-white px-4 py-3">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-[#1e3a66]">
                  <FileText className="h-4 w-4" />
                  بيانات الطلب
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="mb-1 block text-xs text-muted-foreground">
                      الاسم
                    </span>
                    <span className="font-semibold text-foreground">
                      {patientName || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="mb-1 block text-xs text-muted-foreground">
                      السن
                    </span>
                    <span className="font-semibold text-foreground">
                      {patientAge || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="mb-1 block text-xs text-muted-foreground">
                      الكود
                    </span>
                    <span className="font-semibold text-foreground" dir="ltr">
                      {patientCode || patientId || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="mb-1 block text-xs text-muted-foreground">
                      عدد الفحوصات
                    </span>
                    <span className="font-semibold text-foreground" dir="ltr">
                      {selectedTests.length}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="mb-1 block text-xs text-muted-foreground">
                    التاريخ
                  </span>
                  <DateInput
                    value={requestDate}
                    readOnly={editingForbidden}
                    onChange={(e) => setRequestDate(e.target.value)}
                    className="h-9 text-xs font-semibold"
                  />
                </div>
              </CardContent>
            </Card>

            {!editingForbidden && !printMode.printView && (
              <Card className="overflow-hidden border-[#d9e2ef] shadow-none print:hidden">
                <CardHeader className="border-b border-[#e5ebf3] bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-bold text-[#1e3a66]">
                      <ClipboardList className="h-4 w-4" />
                      فحوصات جاهزة
                    </CardTitle>
                    {canImportReadyTemplates ? (
                      <div className="flex items-center gap-2">
                        <input
                          ref={importInputRef}
                          id={importInputId}
                          type="file"
                          accept=".xlsx,.xls"
                          className="sr-only"
                          onChange={(e) => void handleImportReadyTests(e)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={startFilePick}
                        >
                          <Upload className="h-4 w-4 ml-1" />
                          استيراد Excel
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 p-4">
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
                                new Set([...prev, ...filteredReadyTemplateIds]),
                              ),
                            );
                            return;
                          }
                          setSelectedTemplateIds((prev) =>
                            prev.filter(
                              (id) => !filteredReadyTemplateIds.includes(id),
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
                </CardContent>
                <CardContent className="grid max-h-[34vh] grid-cols-1 gap-2 overflow-y-auto border-t border-[#eef2f7] p-3 sm:grid-cols-2">
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
                        onClick={() => handleApplyReadyTestTemplate(template.id)}
                      >
                        {getTemplateDisplayName(template.id, template.name)}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        onClick={() => handleSaveTemplateContent(template.id)}
                        title="حفظ محتوى القالب"
                        aria-label="حفظ محتوى القالب"
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
                        title="إعادة تسمية"
                        aria-label="إعادة تسمية القالب"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        onClick={() => handleDeleteTemplateOverride(template.id)}
                        title="حذف القالب"
                        aria-label="حذف القالب"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {filteredReadyTemplates.length === 0 ? (
                    <div className="col-span-full text-center text-xs text-muted-foreground py-6">
                      لا توجد فحوصات جاهزة في هذا التاب
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )}

            {!printMode.printView && (
              <Card className="overflow-hidden border-[#d9e2ef] shadow-none">
                <CardHeader className="border-b border-[#e5ebf3] bg-white px-4 py-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-bold text-[#1e3a66]">
                    <ClipboardList className="h-4 w-4" />
                    ملاحظات عامة
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <Textarea
                    value={generalNotes}
                    readOnly={editingForbidden}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                    placeholder="ملاحظات إضافية..."
                    className="min-h-28 border-[#dbe4f0] bg-[#f8fafc] text-right text-sm"
                  />
                </CardContent>
              </Card>
            )}
          </aside>

          {/* Test List & Notes (Single Column) */}
          <div className="request-tests-print-content request-tests-paper space-y-5">
            <div className="request-tests-paper-header">
              <div
                className="flex flex-wrap items-center justify-between gap-3 text-sm"
                dir="rtl"
              >
                <span className="inline-flex min-w-[12rem] items-center gap-1" dir="rtl">
                  <span className="font-bold text-[#1e3a66]">الاسم</span>
                  <span className="font-semibold">{patientName || "غير محدد"}</span>
                </span>
                <span className="inline-flex items-center gap-1" dir="rtl">
                  <span className="font-bold text-[#1e3a66]">التاريخ</span>
                  <span className="font-semibold" dir="ltr">
                    {formatDateLabel(requestDate)}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1" dir="rtl">
                  <span className="font-bold text-[#1e3a66]">الكود</span>
                  <span className="font-semibold" dir="ltr">
                    {patientCode ||
                      (patientId != null ? String(patientId) : "")}
                  </span>
                </span>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-[#dbe4f0] bg-white shadow-none request-tests-print-list">
              <div className="flex items-center justify-between border-b border-[#e5ebf3] bg-[#f8fafc] px-4 py-3 text-sm font-bold text-[#1e3a66] print:hidden">
                <span className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  الفحوصات المطلوبة
                </span>
                <span className="rounded-md bg-[#eef5ff] px-2 py-1 text-xs" dir="ltr">
                  {selectedTests.length}
                </span>
              </div>
              <div className="divide-y divide-[#e5ebf3] p-4">
                {selectedTests.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] py-12 text-center text-sm text-muted-foreground">
                    لا توجد فحوصات مسجّلة لهذا الطلب بعد.
                  </p>
                ) : (
                  selectedTests.map((test, index) => (
                    <div
                      key={test.id}
                      className="request-test-item flex flex-col gap-2 py-3 first:pt-0 last:pb-0 print:py-2"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm font-bold text-foreground">
                            <span dir="ltr">{index + 1}.</span> {test.name}
                          </p>
                        </div>
                        {editingForbidden ? null : (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveTest(test.id)}
                            className="print:hidden h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="print:hidden">
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          Notes / ملاحظات
                        </label>
                        <Textarea
                          value={test.notes}
                          readOnly={editingForbidden}
                          onChange={(e) =>
                            handleUpdateTestNotes(test.id, e.target.value)
                          }
                          placeholder="ملاحظات خاصة بهذا الفحص..."
                          className="min-h-12 text-sm text-right"
                        />
                      </div>
                      {test.notes && (
                        <div className="mt-1 hidden text-sm print:block">
                          <span className="font-medium">Notes</span>{" "}
                          {test.notes}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
            {generalNotes ? (
              <div className="request-tests-general-note rounded-xl border border-[#dbe4f0] bg-white p-4 text-sm">
                <div className="mb-1 font-bold text-[#1e3a66] print:text-black">
                  ملاحظات عامة
                </div>
                <div className="whitespace-pre-line">{generalNotes}</div>
              </div>
            ) : null}
          </div>
          <div
            className={`print:hidden sticky bottom-3 z-10 flex justify-end gap-2 rounded-xl border border-[#d9e2ef] bg-white/95 p-3 shadow-sm xl:col-start-2 ${printMode.printView ? "hidden" : ""}`}
          >
            {!editingForbidden ? (
              <Button
                className="bg-[#ff6b35] text-white hover:bg-[#e85f2f]"
                onClick={handleSaveRequest}
                disabled={createRequestMutation.isPending}
                type="button"
              >
                <Save className="h-4 w-4 ml-2" />
                حفظ الطلب
              </Button>
            ) : patientHubReadOnly ? (
              <span className="self-center text-xs text-muted-foreground">
                {patientHubViewOnlyHint}
              </span>
            ) : null}
            <Button variant="outline" onClick={handlePrint} type="button">
              <Printer className="h-4 w-4 ml-2" />
              طباعة
            </Button>
          </div>
        </div>
      </main>
      <style>{`
          .request-tests-paper {
            min-height: 620px;
            border: 1px solid #d9e2ef;
            border-radius: 14px;
            background: #fbfcfe;
            padding: 22px;
            box-shadow: 0 12px 30px rgba(37, 99, 235, 0.06);
          }
          .request-tests-paper-header {
            border: 1px solid #dbe4f0;
            border-radius: 12px;
            background: #ffffff;
            padding: 12px 14px;
          }
          .request-test-item {
            transition: background-color 150ms ease-out;
          }
          .request-test-item:focus-within {
            background: #f8fbff;
          }
          @media print {
            /* print fidelity: black ink, white paper for physical output */
            .request-tests-root,
            .request-tests-root * {
              color: #000 !important;
              background: transparent !important;
              background-image: none !important;
              box-shadow: none !important;
              text-shadow: none !important;
              filter: none !important;
            }
            .request-tests-root {
              background: #fff !important;
              color-scheme: light !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .request-tests-root main,
            .request-tests-root [data-slot="card"],
            .request-tests-root .card {
              background: #fff !important;
            }
            @page {
              size: A5;
              margin: 9mm 9mm 8mm;
            }
          .request-tests-print-content {
            margin-top: 25mm !important;
          }
          .request-tests-root {
            min-height: auto !important;
          }
          .request-tests-root main,
          .request-tests-root .request-tests-print-content {
            display: block !important;
            overflow: visible !important;
          }
          .request-tests-root .request-tests-paper {
            min-height: auto !important;
            border: 0 !important;
            border-radius: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          .request-tests-root .request-tests-paper-header {
            border: 0 !important;
            border-bottom: 1px solid #000 !important;
            border-radius: 0 !important;
            padding: 0 0 3mm !important;
          }
          .request-tests-root .request-tests-print-list {
            border: 0 !important;
            border-radius: 0 !important;
            margin-top: 5mm !important;
          }
          .request-tests-root .request-tests-print-list > div {
            padding: 0 !important;
          }
          .request-tests-root .request-test-item {
            break-inside: avoid;
            page-break-inside: avoid;
            padding: 2.5mm 0 !important;
          }
          .request-tests-root .request-test-item p {
            font-size: 13pt !important;
            line-height: 1.4 !important;
          }
          .request-tests-root .request-tests-general-note {
            border: 1px solid #000 !important;
            border-radius: 0 !important;
            margin-top: 6mm !important;
            padding: 3mm !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
