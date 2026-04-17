import { useAuth } from "@/hooks/useAuth";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Printer, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { formatDateLabel, getTrpcErrorMessage } from "@/lib/utils";
import PatientPicker from "@/components/PatientPicker";
import { trpc } from "@/lib/trpc";
import PageHeader from "@/components/PageHeader";
import { READY_PRESCRIPTION_TEMPLATES } from "@/data/readyPrescriptionTemplates";
import { usePrintMode } from "@/hooks/usePrintMode";
import PrintPreviewBanner from "@/components/PrintPreviewBanner";
import { printOrExportPdf } from "@/lib/nativePdf";
import { loadXlsx } from "@/lib/xlsx";
import { buildRowLookup, getRowValue } from "@/lib/importUtils";

interface TestItem {
  id: number;
  name: string;
  category: string;
  selected: boolean;
  notes: string;
  isCustom?: boolean;
}

export default function RequestTests() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/request-tests/:id");
  const printMode = usePrintMode();
  const initialPatientId = params?.id ? Number(params.id) : 0;

  const isAdmin = user?.role === "admin";
  const isReadOnly = !isAdmin;
  const canImportTestTemplates = isAdmin;

  const [patientId, setPatientId] = useState<number | null>(initialPatientId > 0 ? initialPatientId : null);
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientCode, setPatientCode] = useState("");
  const [requestDate, setRequestDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [selectedTests, setSelectedTests] = useState<TestItem[]>([]);
  const [generalNotes, setGeneralNotes] = useState("");
  const [availableSearch, setAvailableSearch] = useState("");
  const [availableTab, setAvailableTab] = useState("lab");
  const patientStateQuery = trpc.medical.getPatientPageState.useQuery(
    { patientId: patientId ?? 0, page: "request-tests" },
    { enabled: Boolean(patientId) && !isReadOnly, refetchOnWindowFocus: false }
  );
  const savePatientStateMutation = trpc.medical.savePatientPageState.useMutation();
  const templateOverridesQuery = trpc.medical.getReadyTemplateOverrides.useQuery(
    { scope: "tests" },
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
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const importPollRef = useRef<number | null>(null);
  const [importStatus, setImportStatus] = useState("");
  const [importPath, setImportPath] = useState(
    "E:\\SELRS.cc\\روشتات\\tests_import_template.xlsx"
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

  const testsQuery = trpc.medical.getAllTests.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const patientQuery = trpc.patient.getPatient.useQuery(
    patientId ?? 0,
    { enabled: Boolean(patientId), refetchOnWindowFocus: false }
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
    if (isReadOnly) return;
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
    const data = (patientStateQuery.data as any)?.data;
    if (!data) return;
    if (hydratedPatientStateRef.current === patientId) return;
    if (data.requestDate) setRequestDate(data.requestDate);
    if (data.generalNotes !== undefined) setGeneralNotes(data.generalNotes ?? "");
    if (data.availableSearch !== undefined) setAvailableSearch(data.availableSearch ?? "");
    if (Array.isArray(data.selectedTests)) setSelectedTests(data.selectedTests);
    hydratedPatientStateRef.current = patientId;
  }, [patientStateQuery.data, patientId]);

  useEffect(() => {
    const patientKey = patientId ? `selrs:patient-draft:request-tests:${patientId}` : null;
    const tempKey = "selrs:patient-draft:request-tests:temp";
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
        if (parsed.data.requestDate) setRequestDate(parsed.data.requestDate);
        if (parsed.data.generalNotes !== undefined) setGeneralNotes(parsed.data.generalNotes ?? "");
        if (parsed.data.availableSearch !== undefined) setAvailableSearch(parsed.data.availableSearch ?? "");
        if (Array.isArray(parsed.data.selectedTests)) setSelectedTests(parsed.data.selectedTests);
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
  }, [patientId, patientStateQuery.data]);

  useEffect(() => {
    if (!patientId || isReadOnly) return;
    if (patientStateTimerRef.current) clearTimeout(patientStateTimerRef.current);
    const payload = {
      requestDate,
      generalNotes,
      availableSearch,
      selectedTests,
    };
    patientStateTimerRef.current = setTimeout(() => {
      savePatientStateMutation.mutate({ patientId, page: "request-tests", data: payload });
    }, 800);
    return () => {
      if (patientStateTimerRef.current) clearTimeout(patientStateTimerRef.current);
    };
  }, [patientId, isReadOnly, requestDate, generalNotes, availableSearch, selectedTests, savePatientStateMutation]);

  useEffect(() => {
    if (isReadOnly) return;
    if (localDraftTimerRef.current) clearTimeout(localDraftTimerRef.current);
    const payload = {
      requestDate,
      generalNotes,
      availableSearch,
      selectedTests,
    };
    localDraftTimerRef.current = setTimeout(() => {
      const key = patientId
        ? `selrs:patient-draft:request-tests:${patientId}`
        : "selrs:patient-draft:request-tests:temp";
      const draft = {
        updatedAt: new Date().toISOString(),
        data: payload,
      };
      writeDraft(key, draft);
    }, 400);
    return () => {
      if (localDraftTimerRef.current) clearTimeout(localDraftTimerRef.current);
    };
  }, [patientId, isReadOnly, requestDate, generalNotes, availableSearch, selectedTests]);

  useEffect(() => {
    const persistNow = () => {
      const payload = {
        requestDate,
        generalNotes,
        availableSearch,
        selectedTests,
      };
      const draft = {
        updatedAt: new Date().toISOString(),
        data: payload,
      };
      const key = patientId
        ? `selrs:patient-draft:request-tests:${patientId}`
        : "selrs:patient-draft:request-tests:temp";
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
  }, [patientId, isReadOnly, requestDate, generalNotes, availableSearch, selectedTests]);

  if (!isAuthenticated) return null;

  const templateOverrides = (templateOverridesQuery.data ?? {}) as Record<
    string,
    {
      name?: string;
      testItems?: Array<{ testId?: number; testName?: string; notes: string }>;
    }
  >;

  const availableTests = (testsQuery.data ?? []).map((t: any) => ({
    id: t.id,
    name: t.name,
    category: t.category || "Uncategorized",
    type: t.type || "other",
  })) as Array<{ id: number; name: string; category: string; type: string }>;

  const classifyTest = (test: { type?: string; category?: string }) => {
    const type = String(test.type ?? "").trim().toLowerCase();
    if (type === "lab") return "lab";
    if (type === "imaging") return "imaging";
    if (type === "report") return "report";
    if (type === "other") return "report";
    const category = String(test.category ?? "").trim().toLowerCase();
    if (category.includes("اشع") || category.includes("تصوير") || category.includes("radiology") || category.includes("imaging")) {
      return "imaging";
    }
    if (category.includes("تحليل") || category.includes("lab")) return "lab";
    if (category.includes("تقرير") || category.includes("report")) return "report";
    return "report";
  };

  const groupedTests = useMemo(() => {
    const term = availableSearch.trim().toLowerCase();
    const base = availableTests.filter((test) => classifyTest(test) === availableTab);
    const filtered = term
      ? base.filter((test) =>
          `${test.name} ${test.category}`.toLowerCase().includes(term)
        )
      : base;
    return filtered.reduce((acc, test) => {
      if (!acc[test.category]) acc[test.category] = [];
      acc[test.category].push(test);
      return acc;
    }, {} as Record<string, Array<{ id: number; name: string; category: string }>>);
  }, [availableTests, availableSearch, availableTab]);

  const blankTestTemplates = useMemo(() => {
    const base = READY_PRESCRIPTION_TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
    }));
    const extra = Object.keys(templateOverrides)
      .filter((id) => !base.some((t) => t.id === id))
      .map((id) => ({
        id,
        name: templateOverrides[id]?.name?.trim() || id,
      }));
    return [...base, ...extra];
  }, [templateOverrides]);

  const handleSelectTest = (test: { id: number; name: string; category: string }) => {
    if (isReadOnly) {
      toast.error("التعديل متاح للأدمن فقط.");
      return;
    }
    const isSelected = selectedTests.some((t) => t.id === test.id);
    if (isSelected) {
      setSelectedTests(selectedTests.filter((t) => t.id !== test.id));
    } else {
      setSelectedTests([...selectedTests, { ...test, selected: true, notes: "" }]);
    }
  };

  const handleUpdateTestNotes = (testId: number, notes: string) => {
    if (isReadOnly) return;
    setSelectedTests(
      selectedTests.map((t) => (t.id === testId ? { ...t, notes } : t))
    );
  };

  const handleRemoveTest = (testId: number) => {
    if (isReadOnly) return;
    setSelectedTests(selectedTests.filter((t) => t.id !== testId));
    toast.success("Test removed from request.");
  };
  const normalizeTemplateId = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\p{L}\p{N}\-_]/gu, "")
      .slice(0, 64);

  const importFromFile = async (file: File) => {
    if (!isAdmin) {
      toast.error("الاستيراد متاح للأدمن فقط.");
      return;
    }
    try {
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
          .sheet_to_json<Record<string, unknown>>(sheet, {
            defval: "",
          })
          .map((row) => ({ ...row, __sheetName: sheetName, __sheetIndex: sheetIndex }));
      });

      const byName = new Map(
        availableTests.map((test) => [String(test.name ?? "").trim().toLowerCase(), test.id])
      );
      const grouped = new Map<
        string,
        {
          templateId: string;
          name?: string;
          testItems: Array<{ testId: number; testName?: string; notes: string }>;
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
        const testIdRaw = Number(
          getRowValue(lookup, "testId", "test_id", "test id", "كود الفحص") ?? 0
        );
        const testNameRaw = String(
          getRowValue(lookup, "testName", "test_name", "test name", "اسم الفحص") ?? ""
        ).trim();
        const notes = String(getRowValue(lookup, "notes", "ملاحظات", "الملاحظات") ?? "").trim();

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
        if (!normalizedId) continue;

        let testId = Number.isFinite(testIdRaw) && testIdRaw > 0 ? testIdRaw : 0;
        let testName = testNameRaw;
        if (!testId && testName) {
          testId = byName.get(testName.toLowerCase()) ?? 0;
        }
        if (!testId && !testName) continue;

        if (!grouped.has(normalizedId)) {
          grouped.set(normalizedId, {
            templateId: normalizedId,
            name: templateNameRaw.trim() || undefined,
            testItems: [],
          });
        }
        grouped.get(normalizedId)!.testItems.push({ testId, testName, notes });
      }

      const templates = Array.from(grouped.values()).filter((t) => t.testItems.length > 0);
      if (templates.length === 0) {
        toast.error("No valid test templates found in file.");
        setImportStatus("فشل: لم يتم العثور على قوالب صالحة");
        return;
      }

      await importReadyTemplateOverridesMutation.mutateAsync({
        scope: "tests",
        templates,
      });
      toast.success(`Imported ${templates.length} test templates`);
      setImportStatus(`تم الاستيراد: ${templates.length} قالب`);
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "Failed to import test templates."));
      setImportStatus("فشل: راجع الـ Console");
    } finally {
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
    }
  };

  const handleImportTestTemplates = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) {
      toast.error("الاستيراد متاح للأدمن فقط.");
      return;
    }
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await importFromFile(file);
  };

  const handleImportFromPath = async () => {
    if (!isAdmin) {
      toast.error("الاستيراد متاح للأدمن فقط.");
      return;
    }
    const trimmed = importPath.trim();
    if (!trimmed) {
      toast.error("يرجى إدخال مسار الملف أولاً.");
      return;
    }
    try {
      setImportStatus(`جاري الاستيراد من المسار: ${trimmed}`);
      const result = await importReadyTemplateOverridesFromFileMutation.mutateAsync({
        scope: "tests",
        filePath: trimmed,
      });
      toast.success(`Imported ${result.count} test templates`);
      setImportStatus(`تم الاستيراد: ${result.count} قالب`);
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "Failed to import test templates."));
      setImportStatus("فشل: راجع الـ Console");
    }
  };

  const startFilePick = () => {
    if (!isAdmin) {
      toast.error("الاستيراد متاح للأدمن فقط.");
      return;
    }
    setImportStatus("تم الضغط على الاستيراد");
    importInputRef.current?.click();
    if (importPollRef.current) window.clearInterval(importPollRef.current);
    const startAt = Date.now();
    importPollRef.current = window.setInterval(() => {
      const file = importInputRef.current?.files?.[0];
      if (file) {
        window.clearInterval(importPollRef.current!);
        importPollRef.current = null;
        void importFromFile(file);
        return;
      }
      if (Date.now() - startAt > 5000) {
        window.clearInterval(importPollRef.current!);
        importPollRef.current = null;
        setImportStatus("لم يتم اختيار ملف");
      }
    }, 200);
  };

  const handleApplyBlankTemplate = (templateId: string) => {
    if (isReadOnly) {
      toast.error("التعديل متاح للأدمن فقط.");
      return;
    }
    const saved = templateOverrides[templateId]?.testItems ?? [];
    if (!saved.length) {
      setSelectedTests([]);
      return;
    }

    const byId = new Map(availableTests.map((t) => [t.id, t]));
    const byName = new Map(
      availableTests.map((t) => [String(t.name ?? "").trim().toLowerCase(), t])
    );
    const missingNames: string[] = [];
    const hashName = (value: string) => {
      let hash = 0;
      for (let i = 0; i < value.length; i += 1) {
        hash = (hash << 5) - hash + value.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash || value.length);
    };
    const next = saved.reduce<TestItem[]>((items, entry) => {
        const testId = Number(entry.testId ?? 0);
        const nameKey = String(entry.testName ?? "").trim().toLowerCase();
        const test =
          (testId > 0 ? byId.get(testId) : undefined) ||
          (nameKey ? byName.get(nameKey) : undefined);
        if (!test) {
          const rawName = String(entry.testName ?? "").trim();
          if (!rawName) return items;
          items.push({
            id: -hashName(rawName),
            name: rawName,
            category: "Imported",
            selected: true,
            notes: entry.notes ?? "",
            isCustom: true,
          });
          return items;
        }
        items.push({
          id: Number(test.id),
          name: String(test.name ?? ""),
          category: String(test.category ?? ""),
          selected: true,
          notes: entry.notes ?? "",
        });
        return items;
      }, []);

    for (const entry of saved) {
      const testId = Number(entry.testId ?? 0);
      const nameKey = String(entry.testName ?? "").trim();
      const resolved =
        (testId > 0 && byId.has(testId)) || (nameKey && byName.has(nameKey.toLowerCase()));
      if (!resolved && nameKey) missingNames.push(nameKey);
    }

    if (missingNames.length) {
      toast.warning(`لم يتم العثور على بعض الفحوصات وتم إضافتها كفحوصات مخصصة`);
    }

    setSelectedTests(next);
  };

  const handleSaveTemplateContent = async (templateId: string) => {
    if (isReadOnly) {
      toast.error("التعديل متاح للأدمن فقط.");
      return;
    }
    const payload = selectedTests.map((t) => ({
      testId: t.id,
      notes: t.notes ?? "",
    }));
    try {
      await upsertTemplateOverrideMutation.mutateAsync({
        scope: "tests",
        templateId,
        testItems: payload,
      });
      toast.success("Template content saved");
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "Failed to save template content."));
    }
  };

  const getTemplateDisplayName = (templateId: string, fallbackName: string) => {
    const overrideName = templateOverrides[templateId]?.name;
    return overrideName && overrideName.trim() ? overrideName : fallbackName;
  };

  const handleRenameTemplate = async (templateId: string, fallbackName: string) => {
    if (isReadOnly) {
      toast.error("التعديل متاح للأدمن فقط.");
      return;
    }
    const currentName = getTemplateDisplayName(templateId, fallbackName);
    const nextName = window.prompt("Rename template", currentName);
    if (nextName === null) return;

    const clean = nextName.trim();
    try {
      await upsertTemplateOverrideMutation.mutateAsync({
        scope: "tests",
        templateId,
        name: !clean || clean === fallbackName ? "" : clean,
      });
      toast.success("Template name updated");
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "Failed to rename template."));
    }
  };

  const handleDeleteTemplateOverride = async (templateId: string) => {
    if (isReadOnly) {
      toast.error("التعديل متاح للأدمن فقط.");
      return;
    }
    try {
      await upsertTemplateOverrideMutation.mutateAsync({
        scope: "tests",
        templateId,
        name: "",
        testItems: [],
      });
      toast.success("Template override deleted");
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "Failed to delete template override."));
    }
  };


  const handleSaveRequest = async () => {
    if (isReadOnly) {
      toast.error("التعديل متاح للأدمن فقط.");
      return;
    }
    if (!patientId) {
      toast.error("Please select a patient first.");
      return;
    }
    if (selectedTests.length === 0) {
      toast.error("Please select tests.");
      return;
    }
    const validItems = selectedTests.filter((t) => t.id > 0);
    const skippedCount = selectedTests.length - validItems.length;
    if (validItems.length === 0) {
      toast.error("No valid tests found to save. الرجاء اختيار فحوصات موجودة بالنظام.");
      return;
    }
    if (skippedCount > 0) {
      toast.warning(`تم تجاهل ${skippedCount} فحص غير موجود بالنظام أثناء الحفظ.`);
    }
    await createRequestMutation.mutateAsync({
      patientId,
      date: requestDate,
      notes: generalNotes,
      items: validItems.map((t) => ({ testId: t.id, notes: t.notes })),
    });
  };

  const handlePrint = () => {
    void printOrExportPdf(`${String(patientName || patientId || "request-tests").trim()}.pdf`);
  };

  const handleSelectPatient = (patient: {
    id: number;
    fullName: string;
    age?: number | null;
  }) => {
    setPatientId(patient.id);
    setPatientName(patient.fullName ?? "");
    setPatientAge(patient.age != null ? String(patient.age) : "");
    setLocation(`/request-tests/${patient.id}`);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl" style={{ direction: "rtl" }}>
      {printMode.printView ? null : <PageHeader backTo="/patients" />}

      <main data-mobile-pdf-root className={`container mx-auto print:p-0 ${printMode.printView ? "px-3 py-3" : "px-4 py-8"}`}>
        {printMode.printView ? (
          <PrintPreviewBanner
            title="طباعة طلب التحاليل"
            subtitle={patientName || undefined}
            onPrint={handlePrint}
          />
        ) : null}
        <div className="grid grid-cols-1 lg:grid-cols-[0.65fr_1.35fr] gap-6">
          <div className="space-y-6">
            <Card className={`print:hidden ${printMode.printView ? "hidden" : ""}`}>
              <CardHeader>
                <CardTitle>Patient Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <PatientPicker initialPatientId={patientId ?? undefined} onSelect={handleSelectPatient} />
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Name</label>
                    <Input value={patientName} readOnly placeholder="Patient name" className="text-center" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Age</label>
                    <Input value={patientAge} readOnly placeholder="Age" className="text-center" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Date</label>
                    <div className="space-y-1">
                      <Input type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)} />
                      <span className="text-[10px] text-muted-foreground">{formatDateLabel(requestDate)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className={`print:hidden ${printMode.printView ? "hidden" : ""}`}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>Available Tests</CardTitle>
                  <Input
                    value={availableSearch}
                    onChange={(e) => setAvailableSearch(e.target.value)}
                    placeholder="Search by test name or category..."
                    className="max-w-xs text-right"
                    dir="rtl"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs
                  value={availableTab}
                  onValueChange={setAvailableTab}
                  persistKey="request-tests-available"
                  showSwipeHint={false}
                >
                  <TabsList className="w-full justify-start">
                    <TabsTrigger value="lab">تحاليل</TabsTrigger>
                    <TabsTrigger value="imaging">أشعة</TabsTrigger>
                    <TabsTrigger value="report">تقارير</TabsTrigger>
                  </TabsList>
                  <TabsContent value={availableTab} className="max-h-96 overflow-y-auto">
                    {Object.entries(groupedTests).map(([category, tests]) => (
                      <div key={category}>
                        <h3 className="font-bold text-sm mb-2 text-primary">{category}</h3>
                        <div className="space-y-2">
                          {tests.map((test) => (
                            <div key={test.id} className="flex items-center space-x-2 space-x-reverse p-2 hover:bg-gray-100 rounded">
                              <Checkbox
                                id={String(test.id)}
                                checked={selectedTests.some((t) => t.id === test.id)}
                                onCheckedChange={() => handleSelectTest(test)}
                                disabled={isReadOnly}
                              />
                              <label htmlFor={String(test.id)} className="text-sm cursor-pointer flex-1 text-center">
                                {test.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {Object.keys(groupedTests).length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">لا توجد فحوصات في هذا القسم</p>
                    ) : null}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 request-tests-print-content">
            <Card className={`print:hidden ${printMode.printView ? "hidden" : ""}`}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>Blank Templates</CardTitle>
                  {canImportTestTemplates ? (
                    <div className="flex items-center gap-2">
                      <input
                        ref={importInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        className="sr-only"
                        onChange={(e) => void handleImportTestTemplates(e)}
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
              </CardHeader>
              {canImportTestTemplates ? (
                <CardContent className="space-y-2">
                  <div className="flex flex-col gap-2">
                    <Input
                      value={importPath}
                      onChange={(e) => setImportPath(e.target.value)}
                      placeholder="مسار ملف الاكسل"
                      dir="ltr"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleImportFromPath}
                      disabled={importReadyTemplateOverridesFromFileMutation.isPending}
                    >
                      استيراد من المسار
                    </Button>
                    {importStatus ? (
                      <div className="text-xs text-muted-foreground">{importStatus}</div>
                    ) : null}
                  </div>
                </CardContent>
              ) : null}
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {blankTestTemplates.map((template) => (
                <div key={template.id} className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      type="button"
                      className="justify-start flex-1"
                      onClick={() => handleApplyBlankTemplate(template.id)}
                    >
                      {getTemplateDisplayName(template.id, template.name)}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      title="Save template content"
                      aria-label="Save template content"
                      onClick={() => handleSaveTemplateContent(template.id)}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      title="Rename"
                      aria-label="Rename template"
                      onClick={() => handleRenameTemplate(template.id, template.name)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      title="Delete override"
                      aria-label="Delete template override"
                      onClick={() => handleDeleteTemplateOverride(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="hidden print:block request-tests-print-header">
              <div className="pt-2 flex items-center justify-between gap-4 text-sm" dir="rtl">
                <span className="inline-flex items-center gap-1" dir="rtl">
                  <span className="font-medium">الاسم:</span> {patientName}
                </span>
                <span className="inline-flex items-center gap-1" dir="rtl">
                  <span className="font-medium">التاريخ:</span>{" "}
                  <span dir="ltr">{formatDateLabel(requestDate)}</span>
                </span>
                <span className="inline-flex items-center gap-1" dir="rtl">
                  <span className="font-medium">الكود:</span>{" "}
                  <span dir="ltr">{patientCode || (patientId != null ? String(patientId) : "")}</span>
                </span>
              </div>
            </div>

            <Card className="request-tests-print-list">
              <CardHeader className="print:hidden">
                <CardTitle>Selected Tests ({selectedTests.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedTests.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No tests selected yet.</p>
                ) : (
                  selectedTests.map((test, index) => (
                    <div key={test.id} className="border rounded-lg p-4 print:border-0 print:rounded-none print:p-2">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-bold">{index + 1}. {test.name}</p>
                        </div>
                        <Button variant="destructive" size="sm" onClick={() => handleRemoveTest(test.id)} className="print:hidden">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="print:hidden">
                        <label className="block text-sm font-medium mb-1">Notes</label>
                        <Textarea
                          value={test.notes}
                          onChange={(e) => handleUpdateTestNotes(test.id, e.target.value)}
                          placeholder="Notes for this test"
                          className="min-h-16 text-xs text-center"
                        />
                      </div>
                      {test.notes && (
                        <div className="hidden print:block text-sm mt-2">
                          <span className="font-medium">Notes:</span> {test.notes}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className={`print:hidden ${printMode.printView ? "hidden" : ""}`}>
              <CardHeader>
                <CardTitle>General Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  placeholder="Additional notes"
                  className="min-h-24 text-center"
                />
              </CardContent>
            </Card>
          </div>
        </div>
        <div className={`print:hidden mt-4 flex justify-end gap-2 ${printMode.printView ? "hidden" : ""}`}>
          <Button
            variant="outline"
            onClick={handleSaveRequest}
            disabled={createRequestMutation.isPending}
            type="button"
          >
            <Save className="h-4 w-4 ml-2" />
            Save Request
          </Button>
          <Button variant="outline" onClick={handlePrint} type="button">
            <Printer className="h-4 w-4 ml-2" />
            Print
          </Button>
        </div>
      </main>
        <style>{`
          @media print {
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
              margin: 10mm;
            }
          .request-tests-print-content {
            margin-top: 30mm !important;
          }
        }
      `}</style>
    </div>
  );
}



