import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FlaskConical,
  Link2,
  MessageSquareWarning,
  Microscope,
  Pill,
  Save,
  Trash2,
  Edit2,
  Upload,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { ServicesHubNav } from "@/components/shared/ServicesHubNav";
import { SearchBar } from "@/components/shared/SearchBar";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { getTrpcErrorMessage } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { loadXlsx } from "@/lib/xlsx";

type MedicationType = "tablet" | "drops" | "ointment" | "injection" | "suspension" | "other";
type TestType = "examination" | "lab" | "imaging" | "other";

const REGISTRY_TAB_VALUES = ["medications", "tests", "diseases", "symptoms"] as const;
type RegistryTab = (typeof REGISTRY_TAB_VALUES)[number];

function tabFromSearch(search: string): RegistryTab | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const t = params.get("tab");
  return REGISTRY_TAB_VALUES.includes(t as RegistryTab) ? (t as RegistryTab) : null;
}

function medicationTypeLabel(type: string | undefined | null): string {
  const m: Record<string, string> = {
    drops: "قطرة",
    tablet: "أقراص",
    ointment: "مرهم",
    injection: "حقن",
    suspension: "معلق",
    other: "أخرى",
  };
  return m[String(type ?? "")] ?? String(type ?? "—");
}

function testTypeLabel(type: string | undefined | null): string {
  const m: Record<string, string> = {
    examination: "فحص",
    lab: "تحاليل",
    imaging: "أشعة",
    other: "أخرى",
  };
  return m[String(type ?? "")] ?? String(type ?? "—");
}

export default function MedicationsManagement() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const testsFileRef = useRef<HTMLInputElement>(null);
  const diseasesFileRef = useRef<HTMLInputElement>(null);
  const symptomsFileRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const MEDICATIONS_TABS_PERSIST_KEY = "medications-management";
  const [activeTab, setActiveTab] = useState<RegistryTab>(() => {
    if (typeof window !== "undefined") {
      const fromUrl = tabFromSearch(window.location.search);
      if (fromUrl) return fromUrl;
    }
    try {
      const stored = localStorage.getItem(`tabs:${MEDICATIONS_TABS_PERSIST_KEY}`) || "";
      if (stored === "medications" || stored === "tests" || stored === "diseases" || stored === "symptoms") {
        return stored;
      }
    } catch {
      // ignore
    }
    return "medications";
  });

  const [medListSearch, setMedListSearch] = useState("");
  const [testListSearch, setTestListSearch] = useState("");
  const [diseaseListSearch, setDiseaseListSearch] = useState("");
  const [symptomListSearch, setSymptomListSearch] = useState("");

  const userStateQuery = trpc.medical.getUserPageState.useQuery({ page: "medications" }, { refetchOnWindowFocus: false });
  const saveUserStateMutation = trpc.medical.saveUserPageState.useMutation();
  const userStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didHydrateUserStateRef = useRef(false);

  const [newMedication, setNewMedication] = useState<{
    name: string;
    type: MedicationType;
    strength: string;
  }>({
    name: "",
    type: "drops",
    strength: "",
  });

  const [newTest, setNewTest] = useState<{
    name: string;
    type: TestType;
    category: string;
  }>({
    name: "",
    type: "examination",
    category: "",
  });
  const [editingTestId, setEditingTestId] = useState<number | null>(null);

  const [newDisease, setNewDisease] = useState({ name: "", branch: "", abbrev: "" });
  const [editingDiseaseId, setEditingDiseaseId] = useState<number | null>(null);

  const [newSymptom, setNewSymptom] = useState({ name: "" });
  const [editingSymptomId, setEditingSymptomId] = useState<string | null>(null);
  const [delConfirmMed, setDelConfirmMed] = useState<number | null>(null);
  const [delConfirmTest, setDelConfirmTest] = useState<number | null>(null);
  const [delConfirmDisease, setDelConfirmDisease] = useState<number | null>(null);
  const [delConfirmSymptom, setDelConfirmSymptom] = useState<string | null>(null);

  const medicationsQuery = trpc.medical.getAllMedications.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const testsQuery = trpc.medical.getAllTests.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const diseasesQuery = trpc.medical.getAllDiseases.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const symptomsQuery = trpc.medical.getAllSymptoms.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const createMedicationMutation = trpc.medical.createMedication.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة الدواء بنجاح");
      medicationsQuery.refetch();
    },
    onError: (error: unknown) => {
      toast.error(getTrpcErrorMessage(error, "فشل في إضافة الدواء"));
    },
  });

  const updateMedicationMutation = trpc.medical.updateMedication.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الدواء بنجاح");
      medicationsQuery.refetch();
    },
    onError: (error: unknown) => {
      toast.error(getTrpcErrorMessage(error, "فشل في تحديث الدواء"));
    },
  });

  const deleteMedicationMutation = trpc.medical.deleteMedication.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الدواء بنجاح");
      medicationsQuery.refetch();
    },
    onError: (error: unknown) => {
      toast.error(getTrpcErrorMessage(error, "فشل في حذف الدواء"));
    },
  });

  const createTestMutation = trpc.medical.createTest.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة الفحص بنجاح");
      testsQuery.refetch();
    },
    onError: (error: unknown) => {
      toast.error(getTrpcErrorMessage(error, "فشل في إضافة الفحص"));
    },
  });

  const updateTestMutation = trpc.medical.updateTest.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الفحص بنجاح");
      testsQuery.refetch();
    },
    onError: (error: unknown) => {
      toast.error(getTrpcErrorMessage(error, "فشل في تحديث الفحص"));
    },
  });

  const deleteTestMutation = trpc.medical.deleteTest.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الفحص بنجاح");
      testsQuery.refetch();
    },
    onError: (error: unknown) => {
      toast.error(getTrpcErrorMessage(error, "فشل في حذف الفحص"));
    },
  });

  const createDiseaseMutation = trpc.medical.createDisease.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة المرض بنجاح");
      diseasesQuery.refetch();
    },
    onError: (error: unknown) => {
      toast.error(getTrpcErrorMessage(error, "فشل في إضافة المرض"));
    },
  });

  const updateDiseaseMutation = trpc.medical.updateDisease.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث المرض بنجاح");
      diseasesQuery.refetch();
    },
    onError: (error: unknown) => {
      toast.error(getTrpcErrorMessage(error, "فشل في تحديث المرض"));
    },
  });

  const deleteDiseaseMutation = trpc.medical.deleteDisease.useMutation({
    onSuccess: () => {
      toast.success("تم حذف المرض بنجاح");
      diseasesQuery.refetch();
    },
    onError: (error: unknown) => {
      toast.error(getTrpcErrorMessage(error, "فشل في حذف المرض"));
    },
  });

  const createSymptomMutation = trpc.medical.createSymptom.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة العرض بنجاح");
      symptomsQuery.refetch();
    },
    onError: (error: unknown) => {
      toast.error(getTrpcErrorMessage(error, "فشل في إضافة العرض"));
    },
  });

  const updateSymptomMutation = trpc.medical.updateSymptom.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث العرض بنجاح");
      symptomsQuery.refetch();
    },
    onError: (error: unknown) => {
      toast.error(getTrpcErrorMessage(error, "فشل في تحديث العرض"));
    },
  });

  const deleteSymptomMutation = trpc.medical.deleteSymptom.useMutation({
    onSuccess: () => {
      toast.success("تم حذف العرض بنجاح");
      symptomsQuery.refetch();
    },
    onError: (error: unknown) => {
      toast.error(getTrpcErrorMessage(error, "فشل في حذف العرض"));
    },
  });

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    if (tabFromSearch(typeof window !== "undefined" ? window.location.search : "")) return;
    const raw = localStorage.getItem("user_state_medications");
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data.activeTab === "medications" || data.activeTab === "tests" || data.activeTab === "diseases" || data.activeTab === "symptoms") {
        setActiveTab(data.activeTab);
      }
    } catch {
      // ignore bad cache
    }
  }, []);

  useEffect(() => {
    if (tabFromSearch(typeof window !== "undefined" ? window.location.search : "")) {
      didHydrateUserStateRef.current = true;
      return;
    }
    const data = (userStateQuery.data as { data?: { activeTab?: string } })?.data;
    if (!data) return;
    if (didHydrateUserStateRef.current) return;
    if (data.activeTab === "medications" || data.activeTab === "tests" || data.activeTab === "diseases" || data.activeTab === "symptoms") {
      setActiveTab(data.activeTab as typeof activeTab);
    }
    didHydrateUserStateRef.current = true;
  }, [userStateQuery.data]);

  /** Deep links: `/medications/registry?tab=diseases` — keep tab in sync with the address bar */
  useEffect(() => {
    const fromUrl = tabFromSearch(search);
    if (fromUrl) setActiveTab(fromUrl);
  }, [search]);

  const handleRegistryTabChange = (v: string) => {
    const tab = v as RegistryTab;
    setActiveTab(tab);
    setLocation(`/medications/registry?tab=${tab}`, { replace: true });
  };

  useEffect(() => {
    const payload = { activeTab };
    localStorage.setItem("user_state_medications", JSON.stringify(payload));
    if (userStateTimerRef.current) clearTimeout(userStateTimerRef.current);
    userStateTimerRef.current = setTimeout(() => {
      saveUserStateMutation.mutate({ page: "medications", data: payload });
    }, 800);
    return () => {
      if (userStateTimerRef.current) clearTimeout(userStateTimerRef.current);
    };
  }, [activeTab, saveUserStateMutation]);

  const medications = (medicationsQuery.data ?? []) as any[];
  const tests = (testsQuery.data ?? []) as any[];
  const diseases = (diseasesQuery.data ?? []) as any[];
  const symptoms = (symptomsQuery.data ?? []) as Array<{ id: string; name: string }>;

  const filteredMedications = useMemo(() => {
    const q = medListSearch.trim().toLowerCase();
    if (!q) return medications;
    return medications.filter((med) =>
      `${med.name ?? ""} ${med.strength ?? ""} ${med.type ?? ""}`.toLowerCase().includes(q),
    );
  }, [medications, medListSearch]);

  const filteredTests = useMemo(() => {
    const q = testListSearch.trim().toLowerCase();
    if (!q) return tests;
    return tests.filter((test) =>
      `${test.name ?? ""} ${test.category ?? ""} ${test.type ?? ""}`.toLowerCase().includes(q),
    );
  }, [tests, testListSearch]);

  const filteredDiseases = useMemo(() => {
    const q = diseaseListSearch.trim().toLowerCase();
    if (!q) return diseases;
    return diseases.filter((disease) =>
      `${disease.name ?? ""} ${disease.branch ?? ""} ${disease.abbrev ?? ""}`.toLowerCase().includes(q),
    );
  }, [diseases, diseaseListSearch]);

  const filteredSymptoms = useMemo(() => {
    const q = symptomListSearch.trim().toLowerCase();
    if (!q) return symptoms;
    return symptoms.filter((s) => `${s.name ?? ""}`.toLowerCase().includes(q));
  }, [symptoms, symptomListSearch]);

  if (!isAuthenticated) return null;

  const resetMedForm = () => {
    setNewMedication({
      name: "",
      type: "drops",
      strength: "",
    });
  };

  const resetTestForm = () => {
    setNewTest({
      name: "",
      type: "examination",
      category: "",
    });
  };

  const handleSaveMedication = async () => {
    if (!newMedication.name.trim()) {
      toast.error("يرجى إدخال اسم الدواء");
      return;
    }

    if (editingId) {
      await updateMedicationMutation.mutateAsync({
        medicationId: editingId,
        updates: {
          name: newMedication.name.trim(),
          type: newMedication.type,
          strength: newMedication.strength.trim(),
        },
      });
      setEditingId(null);
    } else {
      await createMedicationMutation.mutateAsync({ ...newMedication, name: newMedication.name.trim() });
    }

    resetMedForm();
  };

  const handleEditMedication = (medication: any) => {
    setNewMedication({
      name: medication.name ?? "",
      type: medication.type ?? "drops",
      strength: medication.strength ?? "",
    });
    setEditingId(medication.id);
  };

  const handleDeleteMedication = async (id: number) => {
    await deleteMedicationMutation.mutateAsync({ medicationId: id });
  };

  const handleImportExcel = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result as ArrayBuffer;
          const XLSX = await loadXlsx();
          const workbook = XLSX.read(data, { type: "array" });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          for (const row of jsonData as any[]) {
            const name = row["Name"] || row["name"] || row["اسم الدواء"] || "";
            if (!String(name).trim()) continue;
            const form = row["Form"] || row["form"] || row["النوع"] || "drops";
            const category = row["Category"] || row["category"] || row["التصنيف"] || "";
            await createMedicationMutation.mutateAsync({
              name: String(name).trim(),
              type: String(form || "drops") as MedicationType,
              strength: String(category || "").trim(),
            });
          }
          toast.success("تم استيراد الأدوية بنجاح");
          if (fileInputRef.current) fileInputRef.current.value = "";
        } catch {
          toast.error("خطأ في استيراد الملف");
        }
      };
      reader.readAsArrayBuffer(file);
    } catch {
      toast.error("خطأ في استيراد الملف");
    }
  };

  const handleImportTests = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result as ArrayBuffer;
          const XLSX = await loadXlsx();
          const workbook = XLSX.read(data, { type: "array" });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          for (const row of jsonData as any[]) {
            const name = row["Name"] || row["name"] || row["اسم الفحص"] || "";
            if (!String(name).trim()) continue;
            const form = row["Form"] || row["form"] || row["النوع"] || "examination";
            await createTestMutation.mutateAsync({
              name: String(name).trim(),
              type: String(form || "examination") as TestType,
              category: String(row["تصنيف"] || row["category"] || "").trim() || undefined,
            });
          }
          toast.success("تم استيراد الفحوصات بنجاح");
          if (testsFileRef.current) testsFileRef.current.value = "";
        } catch {
          toast.error("خطأ في استيراد الملف");
        }
      };
      reader.readAsArrayBuffer(file);
    } catch {
      toast.error("خطأ في استيراد الملف");
    }
  };

  const handleSaveTest = async () => {
    if (!newTest.name.trim()) {
      toast.error("يرجى إدخال اسم الفحص");
      return;
    }
    const category = newTest.category.trim();
    if (editingTestId) {
      await updateTestMutation.mutateAsync({
        testId: editingTestId,
        updates: {
          name: newTest.name.trim(),
          type: newTest.type,
          ...(category ? { category } : { category: "" }),
        },
      });
      setEditingTestId(null);
    } else {
      await createTestMutation.mutateAsync({
        name: newTest.name.trim(),
        type: newTest.type,
        category: category || undefined,
      });
    }
    resetTestForm();
  };

  const handleEditTest = (test: any) => {
    setNewTest({
      name: test.name ?? "",
      type: test.type ?? "examination",
      category: test.category ?? "",
    });
    setEditingTestId(test.id);
  };

  const handleDeleteTest = async (id: number) => {
    await deleteTestMutation.mutateAsync({ testId: id });
  };

  const handleSaveDisease = async () => {
    if (!newDisease.name.trim()) {
      toast.error("يرجى إدخال اسم المرض");
      return;
    }
    if (editingDiseaseId) {
      await updateDiseaseMutation.mutateAsync({
        diseaseId: editingDiseaseId,
        name: newDisease.name.trim(),
        branch: newDisease.branch.trim() || undefined,
        abbrev: newDisease.abbrev.trim() || undefined,
      });
      setEditingDiseaseId(null);
    } else {
      await createDiseaseMutation.mutateAsync({
        name: newDisease.name.trim(),
        branch: newDisease.branch.trim() || undefined,
        abbrev: newDisease.abbrev.trim() || undefined,
      });
    }
    setNewDisease({ name: "", branch: "", abbrev: "" });
  };

  const handleEditDisease = (disease: any) => {
    setNewDisease({ name: disease.name ?? "", branch: disease.branch ?? "", abbrev: disease.abbrev ?? "" });
    setEditingDiseaseId(disease.id);
  };

  const handleDeleteDisease = async (id: number) => {
    await deleteDiseaseMutation.mutateAsync({ diseaseId: id });
  };

  const handleImportDiseases = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result as ArrayBuffer;
          const XLSX = await loadXlsx();
          const workbook = XLSX.read(data, { type: "array" });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          let imported = 0;
          let failed = 0;
          let lastError: unknown = null;
          for (const row of jsonData as any[]) {
            const name =
              row["Name"] ||
              row["name"] ||
              row["اسم المرض"] ||
              row["Disease"] ||
              row["disease"] ||
              "";
            if (!String(name).trim()) continue;
            const branch =
              row["Branch"] ||
              row["branch"] ||
              row["الفرع"] ||
              row["branch_en"] ||
              "";
            const abbrev =
              row["Abbrev"] ||
              row["abbrev"] ||
              row["اختصار"] ||
              row["اختصارات"] ||
              "";
            try {
              await createDiseaseMutation.mutateAsync({
                name: String(name).trim(),
                branch: String(branch || "").trim() || undefined,
                abbrev: String(abbrev || "").trim() || undefined,
              });
              imported += 1;
            } catch (err) {
              failed += 1;
              lastError = err;
            }
          }
          if (imported > 0) {
            toast.success(`تم استيراد ${imported} مرض`);
          }
          if (failed > 0) {
            const message = getTrpcErrorMessage(lastError, "فشل في استيراد بعض الأمراض");
            toast.error(`${message} (فشل: ${failed})`);
          }
          if (diseasesFileRef.current) diseasesFileRef.current.value = "";
        } catch {
          toast.error("خطأ في استيراد الملف");
        }
      };
      reader.readAsArrayBuffer(file);
    } catch {
      toast.error("خطأ في استيراد الملف");
    }
  };

  const handleSaveSymptom = async () => {
    if (!newSymptom.name.trim()) {
      toast.error("يرجى إدخال اسم العرض");
      return;
    }
    if (editingSymptomId) {
      await updateSymptomMutation.mutateAsync({
        symptomId: editingSymptomId,
        name: newSymptom.name.trim(),
      });
      setEditingSymptomId(null);
    } else {
      await createSymptomMutation.mutateAsync({
        name: newSymptom.name.trim(),
      });
    }
    setNewSymptom({ name: "" });
  };

  const handleEditSymptom = (symptom: { id: string; name: string }) => {
    setNewSymptom({ name: symptom.name ?? "" });
    setEditingSymptomId(symptom.id);
  };

  const handleDeleteSymptom = async (symptomId: string) => {
    await deleteSymptomMutation.mutateAsync({ symptomId });
  };

  const handleImportSymptoms = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result as ArrayBuffer;
          const XLSX = await loadXlsx();
          const workbook = XLSX.read(data, { type: "array" });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          let imported = 0;
          for (const row of jsonData as any[]) {
            const name = row["Name"] || row["name"] || row["اسم العرض"] || row["Symptom"] || row["symptom"] || "";
            if (!String(name).trim()) continue;
            await createSymptomMutation.mutateAsync({ name: String(name).trim() });
            imported += 1;
          }
          toast.success(`تم استيراد ${imported} عرض`);
          if (symptomsFileRef.current) symptomsFileRef.current.value = "";
        } catch {
          toast.error("خطأ في استيراد الملف");
        }
      };
      reader.readAsArrayBuffer(file);
    } catch {
      toast.error("خطأ في استيراد الملف");
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-4" dir="rtl">
      <PageHeader
        title="إدارة الأدوية والمراجع"
        subtitle="إضافة وتعديل وحذف الأدوية والفحوصات والأمراض والأعراض"
        icon={<Pill className="h-5 w-5" />}
      />

      <ServicesHubNav active="registry" className="mb-4" />

      <Tabs value={activeTab} onValueChange={handleRegistryTabChange} persistKey="medications-management" className="w-full">
        <TabsList className="mb-6 grid h-auto w-full grid-cols-2 gap-2 rounded-xl border border-border bg-muted/30 p-1.5 sm:grid-cols-4">
          <TabsTrigger value="medications" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            الأدوية
          </TabsTrigger>
          <TabsTrigger value="tests" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            الفحوصات
          </TabsTrigger>
          <TabsTrigger value="diseases" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            الأمراض
          </TabsTrigger>
          <TabsTrigger value="symptoms" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            الأعراض
          </TabsTrigger>
        </TabsList>

        <TabsContent value="medications" className="mt-0">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <CardHeader className="space-y-1 border-b border-border/80 bg-muted/20 pb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Link2 className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-lg">{editingId ? "تعديل دواء" : "إضافة دواء"}</CardTitle>
                </div>
                <CardDescription>أضف أو حدّث بيانات الدواء ثم احفظ</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">اسم الدواء</label>
                  <Input
                    value={newMedication.name}
                    onChange={(e) => setNewMedication({ ...newMedication, name: e.target.value })}
                    placeholder="مثال: توباماكس"
                    className="text-right"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">نوع الدواء</label>
                  <Select
                    value={newMedication.type}
                    onValueChange={(value) => setNewMedication({ ...newMedication, type: value as MedicationType })}
                  >
                    <SelectTrigger className="w-full rounded-lg">
                      <SelectValue placeholder="اختر النوع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="drops">قطرة</SelectItem>
                      <SelectItem value="ointment">مرهم</SelectItem>
                      <SelectItem value="tablet">أقراص</SelectItem>
                      <SelectItem value="injection">حقن</SelectItem>
                      <SelectItem value="suspension">معلق</SelectItem>
                      <SelectItem value="other">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">التركيز / القوة</label>
                  <Input
                    value={newMedication.strength}
                    onChange={(e) => setNewMedication({ ...newMedication, strength: e.target.value })}
                    placeholder="مثال: 0.25%"
                    className="text-right"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => void handleSaveMedication()}
                    className="selrs-gradient-btn min-w-[8rem] flex-1 gap-2 text-primary-foreground sm:flex-none"
                    disabled={createMedicationMutation.isPending || updateMedicationMutation.isPending}
                  >
                    <Save className="h-4 w-4" />
                    {editingId ? "تحديث" : "حفظ"}
                  </Button>
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImportExcel} className="hidden" />
                  <Button type="button" variant="outline" className="gap-2 border-dashed rounded-lg" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4" />
                    رفع Excel
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <CardHeader className="border-b border-border/80 py-4">
                <CardTitle className="text-base">قائمة الأدوية</CardTitle>
                <CardDescription>{medications.length} دواء مسجّل</CardDescription>
                <SearchBar value={medListSearch} onChange={setMedListSearch} placeholder="بحث في الأدوية…" className="mt-3" />
              </CardHeader>
              <CardContent className="max-h-[min(520px,70vh)] space-y-2 overflow-y-auto pt-4">
                {medicationsQuery.isLoading ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">جاري التحميل…</p>
                ) : filteredMedications.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">لا توجد نتائج.</p>
                ) : (
                  filteredMedications.map((med: any) => {
                    const sub = [medicationTypeLabel(med.type), String(med.strength ?? "").trim()].filter(Boolean).join(" · ");
                    return (
                      <div
                        key={med.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-border/80 p-3 transition-colors hover:bg-muted/40"
                      >
                        <div className="min-w-0 flex-1 text-right">
                          <div className="font-semibold leading-snug">{med.name}</div>
                          {sub ? <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div> : null}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button type="button" size="icon" variant="outline" className="h-9 w-9 rounded-lg" title="تعديل" aria-label="تعديل الدواء" onClick={() => handleEditMedication(med)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          {delConfirmMed === med.id ? (
                            <div className="flex items-center gap-1">
                              <button type="button" aria-label="تأكيد الحذف"
                                className="rounded bg-destructive text-destructive-foreground hover:bg-destructive/80"
                                onClick={() => { void handleDeleteMedication(med.id); setDelConfirmMed(null); }}>
                                تأكيد
                              </button>
                              <button type="button" aria-label="إلغاء الحذف"
                                className="rounded bg-muted text-muted-foreground hover:bg-border"
                                onClick={() => setDelConfirmMed(null)}>
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button type="button" aria-label="حذف الدواء"
                              className="inline-flex h-9 w-9 items-center justify-center rounded text-destructive bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                              onClick={() => setDelConfirmMed(med.id)}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tests" className="mt-0">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <CardHeader className="space-y-1 border-b border-border/80 bg-muted/20 pb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/[0.07]0/10 text-primary">
                    <FlaskConical className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-lg">{editingTestId ? "تعديل فحص" : "إضافة فحص"}</CardTitle>
                </div>
                <CardDescription>اسم الفحص والنوع والتصنيف</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">اسم الفحص</label>
                  <Input
                    value={newTest.name}
                    onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
                    placeholder="مثال: فحص النظر"
                    className="text-right"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">نوع الفحص</label>
                  <Select value={newTest.type} onValueChange={(value) => setNewTest({ ...newTest, type: value as TestType })}>
                    <SelectTrigger className="w-full rounded-lg">
                      <SelectValue placeholder="اختر النوع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="examination">فحص</SelectItem>
                      <SelectItem value="lab">تحاليل</SelectItem>
                      <SelectItem value="imaging">أشعة</SelectItem>
                      <SelectItem value="other">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">التصنيف</label>
                  <Input
                    value={newTest.category}
                    onChange={(e) => setNewTest({ ...newTest, category: e.target.value })}
                    placeholder="مثال: بصريات"
                    className="text-right"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => void handleSaveTest()}
                    className="selrs-gradient-btn min-w-[8rem] flex-1 gap-2 text-primary-foreground sm:flex-none"
                    disabled={createTestMutation.isPending || updateTestMutation.isPending}
                  >
                    <Save className="h-4 w-4" />
                    {editingTestId ? "تحديث" : "حفظ"}
                  </Button>
                  <input ref={testsFileRef} type="file" accept=".xlsx,.xls" onChange={handleImportTests} className="hidden" />
                  <Button type="button" variant="outline" className="gap-2 border-dashed rounded-lg" onClick={() => testsFileRef.current?.click()}>
                    <Upload className="h-4 w-4" />
                    رفع Excel
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <CardHeader className="border-b border-border/80 py-4">
                <CardTitle className="text-base">قائمة الفحوصات</CardTitle>
                <CardDescription>{tests.length} فحص مسجّل</CardDescription>
                <SearchBar value={testListSearch} onChange={setTestListSearch} placeholder="بحث في الفحوصات…" className="mt-3" />
              </CardHeader>
              <CardContent className="max-h-[min(520px,70vh)] space-y-2 overflow-y-auto pt-4">
                {testsQuery.isLoading ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">جاري التحميل…</p>
                ) : filteredTests.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">لا توجد نتائج.</p>
                ) : (
                  filteredTests.map((test: any) => (
                    <div
                      key={test.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-border/80 p-3 transition-colors hover:bg-muted/40"
                    >
                      <div className="min-w-0 flex-1 text-right">
                        <div className="font-semibold leading-snug">{test.name}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {[test.category, testTypeLabel(test.type)].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button type="button" size="icon" variant="outline" className="h-9 w-9 rounded-lg" title="تعديل" aria-label="تعديل الفحص" onClick={() => handleEditTest(test)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {delConfirmTest === test.id ? (
                          <div className="flex items-center gap-1">
                            <button type="button" aria-label="تأكيد الحذف"
                              className="rounded bg-destructive text-destructive-foreground hover:bg-destructive/80"
                              onClick={() => { void handleDeleteTest(test.id); setDelConfirmTest(null); }}>
                              تأكيد
                            </button>
                            <button type="button" aria-label="إلغاء الحذف"
                              className="rounded bg-muted text-muted-foreground hover:bg-border"
                              onClick={() => setDelConfirmTest(null)}>
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button type="button" aria-label="حذف الفحص"
                            className="inline-flex h-9 w-9 items-center justify-center rounded text-destructive bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                            onClick={() => setDelConfirmTest(test.id)}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="diseases" className="mt-0">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <CardHeader className="space-y-1 border-b border-border/80 bg-muted/20 pb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/[0.07]0/10 text-secondary">
                    <Microscope className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-lg">{editingDiseaseId ? "تعديل مرض" : "إضافة مرض"}</CardTitle>
                </div>
                <CardDescription>الاسم والفرع والاختصار</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">اسم المرض</label>
                  <Input
                    value={newDisease.name}
                    onChange={(e) => setNewDisease({ ...newDisease, name: e.target.value })}
                    placeholder="اسم المرض"
                    className="text-right"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">الفرع</label>
                  <Input
                    value={newDisease.branch}
                    onChange={(e) => setNewDisease({ ...newDisease, branch: e.target.value })}
                    placeholder="الفرع (اختياري)"
                    className="text-right"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">الاختصار</label>
                  <Input
                    value={newDisease.abbrev}
                    onChange={(e) => setNewDisease({ ...newDisease, abbrev: e.target.value })}
                    placeholder="اختصار (اختياري)"
                    className="text-right"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => void handleSaveDisease()}
                    className="selrs-gradient-btn min-w-[8rem] flex-1 gap-2 text-primary-foreground sm:flex-none"
                    disabled={createDiseaseMutation.isPending || updateDiseaseMutation.isPending}
                  >
                    <Save className="h-4 w-4" />
                    {editingDiseaseId ? "تحديث" : "حفظ"}
                  </Button>
                  <input ref={diseasesFileRef} type="file" accept=".xlsx,.xls" onChange={handleImportDiseases} className="hidden" />
                  <Button type="button" variant="outline" className="gap-2 border-dashed rounded-lg" onClick={() => diseasesFileRef.current?.click()}>
                    <Upload className="h-4 w-4" />
                    رفع Excel
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <CardHeader className="border-b border-border/80 py-4">
                <CardTitle className="text-base">قائمة الأمراض</CardTitle>
                <CardDescription>{diseases.length} مرض مسجّل</CardDescription>
                <SearchBar value={diseaseListSearch} onChange={setDiseaseListSearch} placeholder="بحث في الأمراض…" className="mt-3" />
              </CardHeader>
              <CardContent className="max-h-[min(520px,70vh)] space-y-2 overflow-y-auto pt-4">
                {diseasesQuery.isLoading ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">جاري التحميل…</p>
                ) : filteredDiseases.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">لا توجد نتائج.</p>
                ) : (
                  filteredDiseases.map((disease: any) => (
                    <div
                      key={disease.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-border/80 p-3 transition-colors hover:bg-muted/40"
                    >
                      <div className="min-w-0 flex-1 text-right">
                        <div className="font-semibold leading-snug">{disease.name}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {[disease.branch, disease.abbrev].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button type="button" size="icon" variant="outline" className="h-9 w-9 rounded-lg" title="تعديل" aria-label="تعديل المرض" onClick={() => handleEditDisease(disease)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {delConfirmDisease === disease.id ? (
                          <div className="flex items-center gap-1">
                            <button type="button" aria-label="تأكيد الحذف"
                              className="rounded bg-destructive text-destructive-foreground hover:bg-destructive/80"
                              onClick={() => { void handleDeleteDisease(disease.id); setDelConfirmDisease(null); }}>
                              تأكيد
                            </button>
                            <button type="button" aria-label="إلغاء الحذف"
                              className="rounded bg-muted text-muted-foreground hover:bg-border"
                              onClick={() => setDelConfirmDisease(null)}>
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button type="button" aria-label="حذف المرض"
                            className="inline-flex h-9 w-9 items-center justify-center rounded text-destructive bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                            onClick={() => setDelConfirmDisease(disease.id)}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="symptoms" className="mt-0">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <CardHeader className="space-y-1 border-b border-border/80 bg-muted/20 pb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/100/10 text-warning">
                    <MessageSquareWarning className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-lg">{editingSymptomId ? "تعديل عرض" : "إضافة عرض"}</CardTitle>
                </div>
                <CardDescription>عرض مرجعي للاستخدام في السجلات</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">اسم العرض</label>
                  <Input
                    value={newSymptom.name}
                    onChange={(e) => setNewSymptom({ name: e.target.value })}
                    placeholder="اسم العرض"
                    className="text-right"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => void handleSaveSymptom()}
                    className="selrs-gradient-btn min-w-[8rem] flex-1 gap-2 text-primary-foreground sm:flex-none"
                    disabled={createSymptomMutation.isPending || updateSymptomMutation.isPending}
                  >
                    <Save className="h-4 w-4" />
                    {editingSymptomId ? "تحديث" : "حفظ"}
                  </Button>
                  <input ref={symptomsFileRef} type="file" accept=".xlsx,.xls" onChange={handleImportSymptoms} className="hidden" />
                  <Button type="button" variant="outline" className="gap-2 border-dashed rounded-lg" onClick={() => symptomsFileRef.current?.click()}>
                    <Upload className="h-4 w-4" />
                    رفع Excel
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <CardHeader className="border-b border-border/80 py-4">
                <CardTitle className="text-base">قائمة الأعراض</CardTitle>
                <CardDescription>{symptoms.length} عرض مسجّل</CardDescription>
                <SearchBar value={symptomListSearch} onChange={setSymptomListSearch} placeholder="بحث في الأعراض…" className="mt-3" />
              </CardHeader>
              <CardContent className="max-h-[min(520px,70vh)] space-y-2 overflow-y-auto pt-4">
                {symptomsQuery.isLoading ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">جاري التحميل…</p>
                ) : filteredSymptoms.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">لا توجد نتائج.</p>
                ) : (
                  filteredSymptoms.map((symptom) => (
                    <div
                      key={symptom.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-border/80 p-3 transition-colors hover:bg-muted/40"
                    >
                      <div className="min-w-0 flex-1 text-right">
                        <div className="font-semibold leading-snug">{symptom.name}</div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button type="button" size="icon" variant="outline" className="h-9 w-9 rounded-lg" title="تعديل" aria-label="تعديل العرض" onClick={() => handleEditSymptom(symptom)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {delConfirmSymptom === symptom.id ? (
                          <div className="flex items-center gap-1">
                            <button type="button" aria-label="تأكيد الحذف"
                              className="rounded bg-destructive text-destructive-foreground hover:bg-destructive/80"
                              onClick={() => { void handleDeleteSymptom(symptom.id); setDelConfirmSymptom(null); }}>
                              تأكيد
                            </button>
                            <button type="button" aria-label="إلغاء الحذف"
                              className="rounded bg-muted text-muted-foreground hover:bg-border"
                              onClick={() => setDelConfirmSymptom(null)}>
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button type="button" aria-label="حذف العرض"
                            className="inline-flex h-9 w-9 items-center justify-center rounded text-destructive bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                            onClick={() => setDelConfirmSymptom(symptom.id)}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
