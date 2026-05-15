import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, CheckCircle2, Edit2, Plus, Settings, Trash2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard, STAT_CARDS_MOBILE_ROW } from "@/components/shared/StatCard";
import { SearchBar } from "@/components/shared/SearchBar";
import { FilterBar } from "@/components/shared/FilterBar";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn, getTrpcErrorMessage } from "@/lib/utils";

type ServiceType = "consultant" | "specialist" | "lasik" | "surgery" | "external";
type ServiceCategory = "examination" | "radiology" | "operations" | "miscellaneous";
type SheetType =
  | ServiceType
  | "pentacam"
  | "surgery_center"
  | "surgery_external"
  | "pentacam_center"
  | "pentacam_external"
  | "pentacam_c"
  | "pentacam_ex"
  | "pentacam_ex_c";
type DoctorType = "consultant" | "specialist" | "external";

type ServiceEntry = {
  id: string;
  code: string;
  name: string;
  category?: ServiceCategory;
  serviceType: ServiceType;
  srvTyp: "1" | "2";
  defaultSheet: SheetType;
  isActive: boolean;
  price?: number;
};

type DoctorEntry = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  locationType: "center" | "external";
  doctorType: DoctorType;
};

type DoctorServiceSheetMatch = {
  id: string;
  doctorCode: string;
  doctorName?: string;
  serviceCode: string;
  serviceName?: string;
  sheetType: SheetType;
  isActive: boolean;
  createdAt: string;
};

const makeId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `srv-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const isServiceType = (value: unknown): value is ServiceType =>
  value === "consultant" || value === "specialist" || value === "lasik" || value === "surgery" || value === "external";

const isSheetType = (value: unknown): value is SheetType =>
  isServiceType(value) ||
  value === "pentacam" ||
  value === "surgery_center" ||
  value === "surgery_external" ||
  value === "pentacam_center" ||
  value === "pentacam_external" ||
  value === "pentacam_c" ||
  value === "pentacam_ex" ||
  value === "pentacam_ex_c";

const categorizeService = (code: string, name: string, serviceType: ServiceType): ServiceCategory => {
  const hay = `${String(code ?? "").toLowerCase()} ${String(name ?? "").toLowerCase()}`;

  // Check for radiology keywords
  if (
    hay.includes("اشعه") ||
    hay.includes("اشعة") ||
    hay.includes("radiology") ||
    hay.includes("xray") ||
    hay.includes("x-ray") ||
    hay.includes("scan") ||
    hay.includes("oct") ||
    hay.includes("bscan") ||
    hay.includes("ultrasound") ||
    hay.includes("echo") ||
    hay.includes("tomography")
  ) {
    return "radiology";
  }

  // Check for operations keywords
  if (
    hay.includes("عمليه") ||
    hay.includes("عملية") ||
    hay.includes("عمليات") ||
    hay.includes("surgery") ||
    hay.includes("operation") ||
    hay.includes("phaco") ||
    hay.includes("prk") ||
    hay.includes("lasik laser")
  ) {
    return "operations";
  }

  // External services go to miscellaneous
  if (serviceType === "external") {
    return "miscellaneous";
  }

  // Default based on serviceType
  if (serviceType === "specialist") return "examination";
  if (serviceType === "consultant") return "examination";
  if (serviceType === "lasik") return "examination";

  return "miscellaneous";
};

const normalizeStoredDefaultSheet = (value: unknown, inferred: SheetType): SheetType => {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return inferred;
  if (raw === "pentacam" || raw === "radiology_center") return "pentacam_center";
  if (raw === "radiology_external") return "pentacam_external";
  if (raw === "pentacam_c") return "pentacam_c";
  if (raw === "pentacam_ex") return "pentacam_ex";
  if (raw === "pentacam_ex_c") return "pentacam_ex_c";
  if (raw === "surgery") return "surgery_center";
  if (raw === "external") return "external";
  if (raw === "pentacam_center") return "pentacam_c";
  if (raw === "pentacam_external") return "pentacam_ex";
  return isSheetType(raw) ? (raw as SheetType) : inferred;
};

const normalizeSrvTyp = (value: unknown, serviceType: ServiceType, defaultSheet: SheetType): "1" | "2" => {
  const raw = String(value ?? "").trim();
  if (raw === "1" || raw === "2") return raw;
  if (
    serviceType === "external" ||
    defaultSheet === "external" ||
    defaultSheet === "surgery_external" ||
    defaultSheet === "pentacam_external" ||
    defaultSheet === "pentacam_ex" ||
    defaultSheet === "pentacam_ex_c"
  ) {
    return "2";
  }
  return "1";
};

const sheetOptions: Array<{ value: SheetType; label: string }> = [
  { value: "consultant", label: "استشاري" },
  { value: "specialist", label: "اخصائي" },
  { value: "lasik", label: "فحوصات الليزك" },
  { value: "external", label: "خارجي" },
  { value: "pentacam_c", label: "Pentacam C" },
  { value: "pentacam_ex", label: "Pentacam Ex" },
  { value: "pentacam_ex_c", label: "Pentacam Ex.C" },
];

const HUB_STATUS_FILTERS = [
  { value: "all", label: "الكل" },
  { value: "active", label: "فعالة" },
  { value: "inactive", label: "معطلة" },
] as const;

const HUB_CATEGORY_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "كل الفئات" },
  { value: "examination", label: "كشف" },
  { value: "radiology", label: "أشعة" },
  { value: "operations", label: "عمليات" },
  { value: "miscellaneous", label: "متنوعة" },
];

function sheetOptionLabel(sheet: SheetType): string {
  return sheetOptions.find((o) => o.value === sheet)?.label ?? String(sheet);
}

export default function AdminServices() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const [services, setServices] = useState<ServiceEntry[]>([]);
  const [hubSearch, setHubSearch] = useState("");
  const [hubStatus, setHubStatus] = useState<"all" | "active" | "inactive">("all");
  const [hubCategory, setHubCategory] = useState<ServiceCategory | "all">("all");
  const [addOpen, setAddOpen] = useState(false);
  const [expandServiceId, setExpandServiceId] = useState<string | null>(null);
  const [newService, setNewService] = useState<{ code: string; name: string; category: ServiceCategory; serviceType: ServiceType; defaultSheet: SheetType }>({
    code: "",
    name: "",
    category: "examination",
    serviceType: "consultant",
    defaultSheet: "consultant",
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [moveTarget, setMoveTarget] = useState<ServiceCategory>("examination");
  const [sheetTarget, setSheetTarget] = useState<SheetType>("consultant");
  const [isInitialized, setIsInitialized] = useState(false);
  const [servicesPage, setServicesPage] = useState(1);
  const [doctorSearchTerm, setDoctorSearchTerm] = useState("");
  const [serviceSearchTerm, setServiceSearchTerm] = useState("");
  const [mappingSheetType, setMappingSheetType] = useState<SheetType>("consultant");
  const [selectedDoctorCodes, setSelectedDoctorCodes] = useState<string[]>([]);
  const [selectedServiceCodes, setSelectedServiceCodes] = useState<string[]>([]);
  const [doctorServiceMatches, setDoctorServiceMatches] = useState<DoctorServiceSheetMatch[]>([]);
  const [isMappingsInitialized, setIsMappingsInitialized] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia("(max-width: 639px)").matches
  );
  const [showMappingsSection, setShowMappingsSection] = useState(false);

  const servicesQuery = trpc.medical.getServicesFromDb.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const doctorDirectoryQuery = trpc.medical.getDoctorDirectory.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const mappingsQuery = trpc.medical.getSystemSetting.useQuery(
    { key: "doctor_service_sheet_match_v1" },
    { refetchOnWindowFocus: false, staleTime: 0, gcTime: 0 }
  );
  const utils = trpc.useUtils();
  const updateServiceInDbMutation = trpc.medical.updateServiceInDb.useMutation({
    onError: (err) => toast.error("فشل حفظ الخدمة: " + (err.message || "خطأ")),
  });
  const saveMappingsMutation = trpc.medical.updateSystemSetting.useMutation({
    onSuccess: async () => {
      await utils.medical.getSystemSetting.invalidate({ key: "doctor_service_sheet_match_v1" });
    },
  });
  const syncPatientsMutation = trpc.medical.syncPatientsFromMssql.useMutation();
  const updateMssqlPriceMutation = trpc.medical.updateServicePriceInMssql.useMutation({
    onError: (err) => toast.error("فشل تحديث السعر في MSSQL: " + (err.message || "خطأ")),
  });

  const syncCatalogMutation = trpc.medical.syncRegistrationCatalogFromMssql.useMutation({
    onSuccess: (data) => {
      toast.success(`تم مزامنة: ${data.servicesUpserted} خدمة، ${data.doctorsUpserted} طبيب (MSSQL: ${(data as any).mssqlServicesRows ?? "?"} خدمة، ${(data as any).mssqlDoctorsRows ?? "?"} طبيب)`);
      void servicesQuery.refetch();
    },
    onError: (err) => {
      toast.error("فشلت المزامنة: " + (err.message || "خطأ غير معروف"));
    },
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 639px)");
    const apply = () => setIsMobileViewport(mq.matches);
    apply();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
    mq.addListener(apply);
    return () => mq.removeListener(apply);
  }, []);

  // Load services from DB table
  useEffect(() => {
    if (servicesQuery.error) {
      toast.error("خطأ في تحميل الخدمات: " + (servicesQuery.error.message || "خطأ غير معروف"));
      setIsInitialized(true);
      return;
    }
    if (!servicesQuery.data) return;
    const rows = servicesQuery.data;
    const normalized = rows.map((item: any) => {
      const code = String(item?.code ?? "").trim();
      const name = String(item?.name ?? "").trim();
      const storedServiceType = isServiceType(item?.serviceType) ? item.serviceType : "consultant";
      const inferred = categorizeService(code, name, storedServiceType);
      const storedCategory = item?.category === "examination" || item?.category === "radiology" || item?.category === "operations" || item?.category === "miscellaneous"
        ? item.category
        : inferred;
      const storedDefaultSheet = normalizeStoredDefaultSheet(item?.defaultSheet, "consultant");
      const storedSrvTyp = normalizeSrvTyp(item?.srvTyp, storedServiceType, storedDefaultSheet);
      return {
        id: String(item?.id ?? makeId()),
        code,
        name,
        category: storedCategory,
        serviceType: storedServiceType,
        defaultSheet: storedDefaultSheet,
        srvTyp: storedSrvTyp,
        isActive: item?.isActive !== false,
        price: item?.price != null ? Number(item.price) : undefined,
      } as ServiceEntry;
    });
    setServices(normalized);
    setIsInitialized(true);
  }, [servicesQuery.data, servicesQuery.error]);

  useEffect(() => {
    if (isMappingsInitialized || !mappingsQuery.data) return;
    const raw = (mappingsQuery.data as any)?.value;
    const rows = Array.isArray(raw) ? raw : [];
    const normalized = rows
      .map((row: any) => {
        const doctorCode = String(row?.doctorCode ?? "").trim();
        const serviceCode = String(row?.serviceCode ?? "").trim();
        const sheetTypeRaw = String(row?.sheetType ?? "").trim().toLowerCase();
        if (!doctorCode || !serviceCode || !isSheetType(sheetTypeRaw)) return null;
        return {
          id: String(row?.id ?? makeId()),
          doctorCode,
          doctorName: String(row?.doctorName ?? "").trim(),
          serviceCode,
          serviceName: String(row?.serviceName ?? "").trim(),
          sheetType: sheetTypeRaw as SheetType,
          isActive: row?.isActive !== false,
          createdAt: String(row?.createdAt ?? new Date().toISOString()),
        } satisfies DoctorServiceSheetMatch;
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
    setDoctorServiceMatches(normalized);
    setIsMappingsInitialized(true);
  }, [isMappingsInitialized, mappingsQuery.data]);

  const doctors = useMemo(() => {
    const rows = (doctorDirectoryQuery.data ?? []) as DoctorEntry[];
    return rows
      .filter((doctor) => doctor.isActive !== false)
      .sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? ""), "ar"));
  }, [doctorDirectoryQuery.data]);

  const sortedServices = useMemo(
    () => [...services].sort((a, b) => String(a.code ?? "").localeCompare(String(b.code ?? ""), "en", { numeric: true })),
    [services]
  );

  const hubFilteredServices = useMemo(() => {
    const term = hubSearch.trim().toLowerCase();
    return sortedServices.filter((service) => {
      if (hubCategory !== "all" && (service.category || "examination") !== hubCategory) return false;
      if (hubStatus === "active" && !service.isActive) return false;
      if (hubStatus === "inactive" && service.isActive) return false;
      if (!term) return true;
      const code = String(service.code ?? "").toLowerCase();
      const name = String(service.name ?? "").toLowerCase();
      return code.includes(term) || name.includes(term);
    });
  }, [sortedServices, hubSearch, hubStatus, hubCategory]);

  const filteredDoctors = useMemo(() => {
    const term = doctorSearchTerm.trim().toLowerCase();
    if (!term) return doctors;
    return doctors.filter((doctor) => {
      const name = String(doctor.name ?? "").toLowerCase();
      const code = String(doctor.code ?? "").toLowerCase();
      return name.includes(term) || code.includes(term);
    });
  }, [doctorSearchTerm, doctors]);

  const filteredServicesForMapping = useMemo(() => {
    const term = serviceSearchTerm.trim().toLowerCase();
    const base = sortedServices.filter((service) => service.isActive !== false);
    if (!term) return base;
    return base.filter((service) => {
      const name = String(service.name ?? "").toLowerCase();
      const code = String(service.code ?? "").toLowerCase();
      return name.includes(term) || code.includes(term);
    });
  }, [serviceSearchTerm, sortedServices]);

  const SERVICES_PAGE_SIZE = 40;
  const servicesTotalPages = Math.max(1, Math.ceil(hubFilteredServices.length / SERVICES_PAGE_SIZE));
  useEffect(() => {
    setServicesPage(1);
  }, [hubSearch, hubStatus, hubCategory]);
  useEffect(() => {
    if (servicesPage > servicesTotalPages) setServicesPage(servicesTotalPages);
  }, [servicesPage, servicesTotalPages]);
  const pagedHubServices = useMemo(() => {
    const start = (servicesPage - 1) * SERVICES_PAGE_SIZE;
    return hubFilteredServices.slice(start, start + SERVICES_PAGE_SIZE);
  }, [hubFilteredServices, servicesPage]);

  const visibleIds = useMemo(() => pagedHubServices.map((s) => s.id), [pagedHubServices]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const visibleDoctorCodes = useMemo(() => filteredDoctors.map((doctor) => doctor.code), [filteredDoctors]);
  const allVisibleDoctorsSelected =
    visibleDoctorCodes.length > 0 && visibleDoctorCodes.every((code) => selectedDoctorCodes.includes(code));
  const visibleServiceCodes = useMemo(
    () => filteredServicesForMapping.map((service) => service.code),
    [filteredServicesForMapping]
  );
  const allVisibleServicesSelected =
    visibleServiceCodes.length > 0 && visibleServiceCodes.every((code) => selectedServiceCodes.includes(code));

  const addServiceInDbMutation = trpc.medical.addServiceInDb.useMutation({
    onSuccess: () => utils.medical.getServicesFromDb.invalidate(),
    onError: (err) => toast.error("فشل إضافة الخدمة: " + (err.message || "خطأ")),
  });

  const addService = () => {
    const code = newService.code.trim();
    const name = newService.name.trim();
    if (!code || !name) {
      toast.error("Code and name are required");
      return;
    }
    if (services.some((s) => s.code.trim().toLowerCase() === code.toLowerCase())) {
      toast.error("Service code already exists");
      return;
    }
    const id = makeId();
    addServiceInDbMutation.mutate({
      id,
      code,
      name,
      category: newService.category,
      serviceType: newService.serviceType,
      srvTyp: "1",
      defaultSheet: newService.defaultSheet,
    });
    setNewService({ code: "", name: "", category: "examination", serviceType: "consultant", defaultSheet: "consultant" });
    setAddOpen(false);
    toast.success("تم إضافة الخدمة");
  };

  const updateService = (id: string, updates: Partial<ServiceEntry>) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    const dbUpdates: Record<string, any> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.category !== undefined) dbUpdates.category = updates.category ?? null;
    if (updates.serviceType !== undefined) dbUpdates.serviceType = updates.serviceType;
    if (updates.srvTyp !== undefined) dbUpdates.srvTyp = updates.srvTyp ?? null;
    if (updates.defaultSheet !== undefined) dbUpdates.defaultSheet = updates.defaultSheet;
    if (updates.isActive !== undefined) dbUpdates.isActive = updates.isActive;
    if (updates.price !== undefined) dbUpdates.price = String(updates.price);
    if (Object.keys(dbUpdates).length > 0) {
      updateServiceInDbMutation.mutate({ id, ...dbUpdates });
    }
  };

  const deleteService = (id: string) => {
    updateServiceInDbMutation.mutate({ id, isActive: false });
    setServices((prev) => prev.filter((s) => s.id !== id));
    setSelectedIds((prev) => prev.filter((sid) => sid !== id));
    toast.success("تم حذف الخدمة");
  };

  const saveServices = async () => {
    toast.success("التغييرات تحفظ تلقائياً في الجدول ✓");
  };

  const saveDoctorServiceMatches = async () => {
    try {
      // Persist compact rows to keep payload below MySQL TEXT limit.
      const compact = doctorServiceMatches.map((row) => ({
        id: row.id,
        doctorCode: row.doctorCode,
        serviceCode: row.serviceCode,
        sheetType: row.sheetType,
        isActive: row.isActive !== false,
        createdAt: row.createdAt || new Date().toISOString(),
      }));
      await saveMappingsMutation.mutateAsync({
        key: "doctor_service_sheet_match_v1",
        value: compact,
      });
      toast.success("تم حفظ مطابقات الأطباء والخدمات ✓");
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "فشل حفظ المطابقات"));
    }
  };

  const syncPatients = async () => {
    try {
      const sync = await syncPatientsMutation.mutateAsync({ dryRun: false, incremental: true });
      toast.success(`مزامنة: تم جلب ${sync?.fetched ?? 0}، تحديث ${sync?.updated ?? 0}، إدراج ${sync?.inserted ?? 0}`);
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "فشل بدء المزامنة"));
    }
  };

  const autoRecategorize = () => {
    const updated = services.map((s) => ({
      ...s,
      category: categorizeService(s.code, s.name, s.serviceType) as ServiceCategory,
    }));
    setServices(updated);
    updated.forEach((s) =>
      updateServiceInDbMutation.mutate({ id: s.id, category: s.category ?? null }),
    );
    toast.success(`تم إعادة تصنيف ${updated.length} خدمة`);
  };

  const moveSelectedToCategory = () => {
    const selectedVisible = selectedIds.filter((id) => visibleIds.includes(id));
    if (selectedVisible.length === 0) {
      toast.error("لا توجد خدمات محددة للنقل");
      return;
    }
    setServices((prev) => prev.map((s) => (selectedVisible.includes(s.id) ? { ...s, category: moveTarget } : s)));
    setSelectedIds((prev) => prev.filter((id) => !selectedVisible.includes(id)));
    toast.success(`تم نقل ${selectedVisible.length} خدمة إلى ${getCategoryLabel(moveTarget)}`);
  };

  const changeSelectedSheet = () => {
    const selectedVisible = selectedIds.filter((id) => visibleIds.includes(id));
    if (selectedVisible.length === 0) {
      toast.error("لا توجد خدمات محددة لتغيير الشيت");
      return;
    }
    setServices((prev) => prev.map((s) => (selectedVisible.includes(s.id) ? { ...s, defaultSheet: sheetTarget } : s)));
    setSelectedIds((prev) => prev.filter((id) => !selectedVisible.includes(id)));
    toast.success(`تم تغيير الشيت لـ ${selectedVisible.length} خدمة`);
  };

  const addDoctorServiceMatches = () => {
    if (selectedDoctorCodes.length === 0) {
      toast.error("اختر طبيب واحد على الأقل");
      return;
    }
    if (selectedServiceCodes.length === 0) {
      toast.error("اختر خدمة واحدة على الأقل");
      return;
    }

    const doctorByCode = new Map(doctors.map((doctor) => [doctor.code, doctor]));
    const serviceByCode = new Map(sortedServices.map((service) => [service.code, service]));
    const existingKey = new Set(
      doctorServiceMatches.map((item) => `${item.doctorCode}::${item.serviceCode}`)
    );

    const additions: DoctorServiceSheetMatch[] = [];
    for (const doctorCode of selectedDoctorCodes) {
      const doctor = doctorByCode.get(doctorCode);
      if (!doctor) continue;
      for (const serviceCode of selectedServiceCodes) {
        const service = serviceByCode.get(serviceCode);
        if (!service) continue;
        const key = `${doctorCode}::${serviceCode}`;
        if (existingKey.has(key)) continue;
        existingKey.add(key);
        additions.push({
          id: makeId(),
          doctorCode,
          doctorName: doctor.name,
          serviceCode,
          serviceName: service.name,
          sheetType: mappingSheetType,
          isActive: true,
          createdAt: new Date().toISOString(),
        });
      }
    }

    if (additions.length === 0) {
      toast.error("كل المطابقات المحددة موجودة بالفعل");
      return;
    }

    setDoctorServiceMatches((prev) => [...prev, ...additions]);
    toast.success(`تمت إضافة ${additions.length} مطابقة`);
  };

  const removeMatch = (id: string) => {
    setDoctorServiceMatches((prev) => prev.filter((item) => item.id !== id));
  };

  const deduplicateMatches = () => {
    const seen = new Set<string>();
    const next: DoctorServiceSheetMatch[] = [];
    let removed = 0;

    for (const row of doctorServiceMatches) {
      const key = `${String(row.doctorCode).trim()}::${String(row.serviceCode).trim()}`;
      if (seen.has(key)) {
        removed += 1;
        continue;
      }
      seen.add(key);
      next.push(row);
    }

    if (removed === 0) {
      toast.success("لا توجد تكرارات");
      return;
    }

    setDoctorServiceMatches(next);
    toast.success(`تم حذف ${removed} تكرار`);
  };

  const deleteAllMatches = async () => {
    if (doctorServiceMatches.length === 0) {
      toast.success("لا توجد مطابقات للحذف");
      return;
    }
    const confirmed = window.confirm("حذف كل مطابقات الأطباء والخدمات؟ لا يمكن التراجع.");
    if (!confirmed) return;
    try {
      await saveMappingsMutation.mutateAsync({
        key: "doctor_service_sheet_match_v1",
        value: [],
      });
      setDoctorServiceMatches([]);
      setSelectedDoctorCodes([]);
      setSelectedServiceCodes([]);
      toast.success("تم حذف كل المطابقات");
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "فشل حذف كل المطابقات"));
    }
  };

  const getCategoryLabel = (cat: ServiceCategory): string => {
    const labels: Record<ServiceCategory, string> = {
      examination: "كشف",
      radiology: "اشعه",
      operations: "عمليات",
      miscellaneous: "ايرادات متنوعه",
    };
    return labels[cat];
  };

  const getCategoryEmoji = (cat: ServiceCategory): string => {
    const emojis: Record<ServiceCategory, string> = {
      examination: "🏥",
      radiology: "📹",
      operations: "⚕️",
      miscellaneous: "💼",
    };
    return emojis[cat];
  };

  if (!isAuthenticated || user?.role !== "admin") return null;

  const doctorNameByCode = new Map(doctors.map((doctor) => [doctor.code, doctor.name]));
  const serviceNameByCode = new Map(sortedServices.map((service) => [service.code, service.name]));
  const servicesTotal = sortedServices.length;
  const servicesActive = sortedServices.filter((s) => s.isActive).length;
  const servicesInactive = servicesTotal - servicesActive;

  const newServiceFields = (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
      <div className="space-y-2">
        <span className="text-sm font-semibold text-foreground">كود الخدمة</span>
        <Input
          placeholder="كود الخدمة"
          value={newService.code}
          onChange={(e) => setNewService((prev) => ({ ...prev, code: e.target.value }))}
          dir="ltr"
        />
      </div>
      <div className="space-y-2">
        <span className="text-sm font-semibold text-foreground">اسم الخدمة</span>
        <Input
          placeholder="اسم الخدمة"
          value={newService.name}
          onChange={(e) => setNewService((prev) => ({ ...prev, name: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <span className="text-sm font-semibold text-foreground">الفئة</span>
        <Select value={newService.category} onValueChange={(v) => setNewService((prev) => ({ ...prev, category: v as ServiceCategory }))}>
          <SelectTrigger>
            <SelectValue placeholder="الفئة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="examination">كشف</SelectItem>
            <SelectItem value="radiology">اشعه</SelectItem>
            <SelectItem value="operations">عمليات</SelectItem>
            <SelectItem value="miscellaneous">متنوعه</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <span className="text-sm font-semibold text-foreground">نوع الخدمة</span>
        <Select value={newService.serviceType} onValueChange={(v) => setNewService((prev) => ({ ...prev, serviceType: v as ServiceType }))}>
          <SelectTrigger>
            <SelectValue placeholder="النوع" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="consultant">استشاري</SelectItem>
            <SelectItem value="specialist">اخصائي</SelectItem>
            <SelectItem value="lasik">ليزك</SelectItem>
            <SelectItem value="external">خارجي</SelectItem>
            <SelectItem value="surgery">عمليات</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <span className="text-xs font-semibold text-muted-foreground">الشيت الافتراضي</span>
        <Select value={newService.defaultSheet} onValueChange={(v) => setNewService((prev) => ({ ...prev, defaultSheet: v as SheetType }))}>
          <SelectTrigger>
            <SelectValue placeholder="الشيت" />
          </SelectTrigger>
          <SelectContent>
            {sheetOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 px-2 pb-4 text-right sm:px-4 lg:px-6" dir="rtl">
      <PageHeader
        title="الخدمات"
        subtitle="إدارة خدمات المركز الطبي"
        icon={<Settings className="h-5 w-5" />}
        action={
          <Button type="button" size="sm" className="selrs-gradient-btn gap-2 text-white" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            <span className="text-xs sm:text-sm">إضافة خدمة</span>
          </Button>
        }
      />
      <div className={cn(STAT_CARDS_MOBILE_ROW, "gap-2 sm:grid sm:grid-cols-3 sm:gap-4")}>
        <StatCard
          title="إجمالي الخدمات"
          value={servicesTotal}
          icon={Activity}
          iconColor="bg-secondary/10 text-secondary dark:bg-secondary/20 dark:text-secondary"
        />
        <StatCard
          title="فعالة"
          value={servicesActive}
          icon={CheckCircle2}
          iconColor="bg-green-100 text-green-600 dark:bg-green-950/60 dark:text-green-400"
        />
        <StatCard
          title="معطلة"
          value={servicesInactive}
          icon={XCircle}
          iconColor="bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400"
        />
      </div>

      <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <CardContent className="space-y-6 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:flex-wrap xl:items-start xl:justify-between">
            <div className="w-full xl:max-w-sm">
              <label className="mb-2 block text-sm font-medium text-foreground">البحث</label>
              <SearchBar value={hubSearch} onChange={setHubSearch} placeholder="بحث عن خدمة أو كود…" aria-label="بحث عن خدمة أو كود" />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <FilterBar
                filters={[...HUB_STATUS_FILTERS]}
                selected={hubStatus}
                onSelect={(v) => setHubStatus(v as typeof hubStatus)}
                className="sm:justify-end"
              />
              <FilterBar
                filters={HUB_CATEGORY_FILTERS}
                selected={hubCategory}
                onSelect={(v) => setHubCategory(v as ServiceCategory | "all")}
                className="max-w-full sm:max-w-[560px] sm:justify-end"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
            <Button type="button" variant="secondary" onClick={() => void saveServices()} disabled={updateServiceInDbMutation.isPending}>
              حفظ التغييرات
            </Button>
            <Button type="button" variant="outline" onClick={() => void syncPatients()} disabled={syncPatientsMutation.isPending}>
              مزامنة المرضى
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => syncCatalogMutation.mutate()}
              disabled={syncCatalogMutation.isPending}
            >
              {syncCatalogMutation.isPending ? "جاري..." : "مزامنة الخدمات والأسعار"}
            </Button>
            <Button type="button" variant="outline" onClick={autoRecategorize} disabled={updateServiceInDbMutation.isPending}>
              إعادة تصنيف تلقائي
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.currentTarget.value = "";
                if (!file) return;
                try {
                  const text = await file.text();
                  const lines = text
                    .split(/\r?\n/)
                    .map((line) => line.trim())
                    .filter(Boolean);
                  const next = [...services];
                  let imported = 0;
                  for (const line of lines) {
                    const parts = line.includes(";") ? line.split(";") : line.split(",");
                    if (parts.length < 2) continue;
                    const code = String(parts[0] ?? "").trim();
                    const name = String(parts[1] ?? "").trim();
                    if (!code || !name) continue;
                    if (/^(srv[_\s-]*cd|code)$/i.test(code) && /^(name|service)$/i.test(name)) continue;
                    if (next.some((s) => s.code.trim().toLowerCase() === code.toLowerCase())) continue;

                    const category = categorizeService(code, name, "consultant");
                    next.push({
                      id: makeId(),
                      code,
                      name,
                      category,
                      serviceType: "consultant",
                      srvTyp: "1",
                      defaultSheet: "consultant",
                      isActive: true,
                    });
                    imported += 1;
                  }
                  setServices(next);
                  toast.success(imported > 0 ? `تم استيراد ${imported} خدمة` : "لم يتم استيراد صفوف");
                } catch {
                  toast.error("فشل استيراد CSV");
                }
              }}
            />
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
              📥 استيراد CSV
            </Button>
          </div>

          <div className="space-y-2 rounded-lg border border-border/80 bg-muted/15 p-3">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allVisibleSelected}
                onCheckedChange={(checked) => {
                  if (Boolean(checked)) {
                    setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
                  } else {
                    setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
                  }
                }}
              />
              <span className="text-sm font-medium">تحديد الكل في النتائج ({visibleIds.length})</span>
            </div>

            {selectedIds.length > 0 && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 pr-6">
                  <Select value={moveTarget} onValueChange={(v) => setMoveTarget(v as ServiceCategory)}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="نقل إلى" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="examination">🏥 كشف</SelectItem>
                      <SelectItem value="radiology">📹 اشعه</SelectItem>
                      <SelectItem value="operations">⚕️ عمليات</SelectItem>
                      <SelectItem value="miscellaneous">💼 ايرادات متنوعه</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={moveSelectedToCategory} size="sm" variant="default">
                    ➡️ نقل المحدد
                  </Button>
                  <span className="text-xs text-muted-foreground">({selectedIds.length} محدد)</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 pr-6">
                  <Select value={sheetTarget} onValueChange={(v) => setSheetTarget(v as SheetType)}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="تغيير الشيت" />
                    </SelectTrigger>
                    <SelectContent>
                      {sheetOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={changeSelectedSheet} size="sm" variant="default">
                    📋 تغيير الشيت
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border/70">
          <CardTitle className="text-base">قائمة الخدمات ({hubFilteredServices.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          {isMobileViewport ? (
            <div className="space-y-2 p-3">
              {!isInitialized ? (
                <div className="py-10 text-center text-muted-foreground">جاري التحميل…</div>
              ) : hubFilteredServices.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">لا توجد خدمات مطابقة للتصفية.</div>
              ) : (
                pagedHubServices.map((service) => (
                <div key={service.id} className="rounded-xl border border-border/80 bg-card p-3" dir="rtl">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setExpandServiceId((id) => (id === service.id ? null : service.id))}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => deleteService(service.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={cn(
                          "h-8 text-xs font-semibold",
                          service.isActive
                            ? "border-emerald-500/45 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30"
                            : "border-muted text-muted-foreground",
                        )}
                        onClick={() => updateService(service.id, { isActive: !service.isActive })}
                      >
                        {service.isActive ? "فعال" : "غير فعال"}
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="font-semibold leading-tight">{service.name}</div>
                        <div className="mt-0.5 text-[11px] tabular-nums text-muted-foreground" dir="ltr">{service.code}</div>
                      </div>
                      <Checkbox
                        checked={selectedIds.includes(service.id)}
                        onCheckedChange={(checked) => {
                          if (Boolean(checked)) setSelectedIds((prev) => [...prev, service.id]);
                          else setSelectedIds((prev) => prev.filter((id) => id !== service.id));
                        }}
                      />
                    </div>
                  </div>
                  <div className="mt-2.5 grid grid-cols-2 gap-x-2 gap-y-1.5 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-xs">
                    <div className="text-muted-foreground">الفئة</div>
                    <div className="text-right">
                      <Badge variant="secondary" className="text-[10px] font-medium">
                        {getCategoryEmoji(service.category || "examination")} {getCategoryLabel(service.category || "examination")}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground">نوع الشيت</div>
                    <div className="text-right">
                      <Select
                        value={service.defaultSheet}
                        onValueChange={(v) => updateService(service.id, { defaultSheet: v as SheetType })}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {sheetOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="text-muted-foreground">السعر</div>
                    <div className="text-right">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        className="h-7 w-24 text-center tabular-nums text-xs"
                        defaultValue={service.price ?? 0}
                        key={service.id + "-price-m"}
                        onBlur={(e) => {
                          const val = Number(e.target.value);
                          if (val === (service.price ?? 0)) return;
                          updateService(service.id, { price: val });
                          updateMssqlPriceMutation.mutate({ code: service.code, price: val });
                        }}
                      />
                    </div>
                    <div className="text-muted-foreground">المركز / خارجي</div>
                    <div className="flex items-center gap-3 text-right">
                      <label className="flex items-center gap-1 whitespace-nowrap text-xs">
                        <Checkbox
                          checked={service.srvTyp === "1"}
                          onCheckedChange={(checked) => {
                            if (Boolean(checked)) updateService(service.id, { srvTyp: "1" });
                            else if (service.srvTyp === "1") updateService(service.id, { srvTyp: "2" });
                          }}
                        />
                        مركز
                      </label>
                      <label className="flex items-center gap-1 whitespace-nowrap text-xs">
                        <Checkbox
                          checked={service.srvTyp === "2"}
                          onCheckedChange={(checked) => {
                            if (Boolean(checked)) updateService(service.id, { srvTyp: "2" });
                            else if (service.srvTyp === "2") updateService(service.id, { srvTyp: "1" });
                          }}
                        />
                        خارجي
                      </label>
                    </div>
                  </div>
                  {expandServiceId === service.id ? (
                    <div className="mt-2 rounded-xl border border-border bg-muted/20 px-3 py-2 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">نوع الخدمة:</span>
                        <Select
                          value={service.serviceType}
                          onValueChange={(v) => updateService(service.id, { serviceType: v as ServiceType })}
                        >
                          <SelectTrigger className="h-8 w-[160px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="consultant">استشاري</SelectItem>
                            <SelectItem value="specialist">اخصائي</SelectItem>
                            <SelectItem value="lasik">ليزك</SelectItem>
                            <SelectItem value="external">خارجي</SelectItem>
                            <SelectItem value="surgery">عمليات</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : null}
                </div>
                ))
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/80 bg-background">
              <Table dir="rtl" className="min-w-[1000px] text-right">
                <TableHeader className="sticky top-0 z-10 bg-sky-50/90 backdrop-blur-sm">
                  <TableRow className="hover:bg-transparent border-b-primary/10">
                    <TableHead className="w-12 px-3 h-11" />
                    <TableHead className="font-bold text-sky-900 h-11">اسم الخدمة والرمز</TableHead>
                    <TableHead className="font-bold text-sky-900 h-11">الفئة</TableHead>
                    <TableHead className="font-bold text-sky-900 h-11">نوع النموذج (الشيت)</TableHead>
                    <TableHead className="font-bold text-sky-900 h-11">المركز / خارجي</TableHead>
                    <TableHead className="font-bold text-sky-900 h-11">السعر (EGP)</TableHead>
                    <TableHead className="font-bold text-sky-900 h-11">الحالة</TableHead>
                    <TableHead className="w-[120px] text-center font-bold text-sky-900 h-11">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!isInitialized ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center text-muted-foreground animate-pulse">
                        جاري تحميل قائمة الخدمات…
                      </TableCell>
                    </TableRow>
                  ) : hubFilteredServices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center text-muted-foreground bg-muted/20">
                        لا توجد خدمات تطابق اختياراتك الحالية.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedHubServices.map((service, idx) => (
                      <Fragment key={service.id}>
                        <TableRow className={cn(
                          "group transition-colors hover:bg-primary/[0.03]",
                          idx % 2 === 0 ? "bg-white" : "bg-muted/10"
                        )}>
                          <TableCell className="px-3 align-middle">
                            <Checkbox
                              checked={selectedIds.includes(service.id)}
                              onCheckedChange={(checked) => {
                                if (Boolean(checked)) {
                                  setSelectedIds((prev) => [...prev, service.id]);
                                } else {
                                  setSelectedIds((prev) => prev.filter((id) => id !== service.id));
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="align-middle py-3">
                            <div className="font-bold text-sm text-foreground/90 group-hover:text-primary transition-colors">
                              {service.name}
                            </div>
                            <div className="text-[10px] tabular-nums font-mono text-muted-foreground/80 mt-0.5" dir="ltr">
                              {service.code}
                            </div>
                          </TableCell>
                          <TableCell className="align-middle whitespace-nowrap py-3">
                            <Badge variant="secondary" className="font-bold text-[10px] px-2 py-0.5 shadow-none bg-muted/50 border-0">
                              {getCategoryEmoji(service.category || "examination")}{" "}
                              {getCategoryLabel(service.category || "examination")}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[180px] align-middle py-3">
                            <Select
                              value={service.defaultSheet}
                              onValueChange={(v) => updateService(service.id, { defaultSheet: v as SheetType })}
                            >
                              <SelectTrigger className="h-8 text-[11px] font-medium border-muted-foreground/20 bg-background/50">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {sheetOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="align-middle py-3">
                            <div className="flex items-center gap-3 text-[11px] font-semibold text-muted-foreground">
                              <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground">
                                <Checkbox
                                  className="h-3.5 w-3.5"
                                  checked={service.srvTyp === "1"}
                                  onCheckedChange={(checked) => {
                                    if (Boolean(checked)) updateService(service.id, { srvTyp: "1" });
                                    else if (service.srvTyp === "1") updateService(service.id, { srvTyp: "2" });
                                  }}
                                />
                                مركز
                              </label>
                              <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground">
                                <Checkbox
                                  className="h-3.5 w-3.5"
                                  checked={service.srvTyp === "2"}
                                  onCheckedChange={(checked) => {
                                    if (Boolean(checked)) updateService(service.id, { srvTyp: "2" });
                                    else if (service.srvTyp === "2") updateService(service.id, { srvTyp: "1" });
                                  }}
                                />
                                خارجي
                              </label>
                            </div>
                          </TableCell>
                          <TableCell className="align-middle py-3">
                            <div className="relative group/input max-w-[100px]">
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                className="h-8 text-center tabular-nums text-xs font-bold border-muted-foreground/20 focus:border-primary/50"
                                defaultValue={service.price ?? 0}
                                key={service.id + "-price"}
                                onBlur={(e) => {
                                  const val = Number(e.target.value);
                                  if (val === (service.price ?? 0)) return;
                                  updateService(service.id, { price: val });
                                  updateMssqlPriceMutation.mutate({ code: service.code, price: val });
                                }}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="align-middle whitespace-nowrap py-3">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className={cn(
                                "h-7 text-[10px] font-bold px-3 transition-all",
                                service.isActive
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  : "border-muted text-muted-foreground",
                              )}
                              onClick={() => updateService(service.id, { isActive: !service.isActive })}
                            >
                              {service.isActive ? "فعال" : "غير فعال"}
                            </Button>
                          </TableCell>
                          <TableCell className="text-center align-middle py-3">
                            <div className="flex justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary"
                                onClick={() => setExpandServiceId((id) => (id === service.id ? null : service.id))}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
                                onClick={() => deleteService(service.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {expandServiceId === service.id ? (
                          <TableRow key={`${service.id}-detail`} className="border-b bg-primary/[0.02]">
                            <TableCell colSpan={8} className="py-4 px-12">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-4 rounded-xl border border-primary/10 bg-background/60 shadow-inner">
                                <div className="space-y-1.5 flex-1 min-w-[200px]">
                                  <span className="text-[11px] font-bold text-muted-foreground/70 block px-1">نوع الخدمة (تصنيف النظام)</span>
                                  <Select
                                    value={service.serviceType}
                                    onValueChange={(v) => updateService(service.id, { serviceType: v as ServiceType })}
                                  >
                                    <SelectTrigger className="h-9 w-full sm:w-[220px] bg-white">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="consultant">استشاري</SelectItem>
                                      <SelectItem value="specialist">اخصائي</SelectItem>
                                      <SelectItem value="lasik">ليزك</SelectItem>
                                      <SelectItem value="external">خارجي</SelectItem>
                                      <SelectItem value="surgery">عمليات</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1 text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg border">
                                  <div className="font-bold text-foreground/70">تفاصيل النموذج الحالية</div>
                                  <div>{sheetOptionLabel(service.defaultSheet)}</div>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-primary font-medium italic">
                                  <Settings className="h-3.5 w-3.5" />
                                  سيتم تطبيق التغييرات على الفحوصات الجديدة فوراً.
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/10 px-3 py-2 text-xs sm:text-sm">
        <span className="text-muted-foreground">
          صفحة {servicesPage} من {servicesTotalPages}
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => setServicesPage((p) => Math.max(1, p - 1))}
            disabled={servicesPage === 1}
          >
            السابق
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => setServicesPage((p) => Math.min(servicesTotalPages, p + 1))}
            disabled={servicesPage >= servicesTotalPages}
          >
            التالي
          </Button>
        </div>
      </div>

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open)
            setNewService({
              code: "",
              name: "",
              category: "examination",
              serviceType: "consultant",
              defaultSheet: "consultant",
            });
        }}
      >
        <DialogContent className="max-w-lg text-right sm:max-w-xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة خدمة جديدة</DialogTitle>
          </DialogHeader>
          {newServiceFields}
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              إلغاء
            </Button>
            <Button type="button" className="selrs-gradient-btn text-white gap-2" onClick={addService}>
              <Plus className="h-4 w-4" />
              إدراج الخدمة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>مطابقة الأطباء مع الخدمات والشيت</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowMappingsSection((v) => !v)}
            >
              {showMappingsSection ? "إخفاء" : "إظهار"}
            </Button>
          </div>
        </CardHeader>
        {showMappingsSection ? (
        <CardContent className="space-y-4">
          <p className="text-sm text-foreground leading-relaxed">
            اختر أكثر من طبيب وأكثر من خدمة، ثم اضغط "مطابقة" لإنشاء كل التركيبات. نفس الخدمة يمكن مشاركتها بين أطباء متعددين.
          </p>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
              <h3 className="font-semibold text-foreground">الأطباء</h3>
              <div className="flex items-center justify-between gap-2">
                <Input
                  placeholder="بحث طبيب (اسم / كود)"
                  value={doctorSearchTerm}
                  onChange={(e) => setDoctorSearchTerm(e.target.value)}
                  aria-label="بحث الأطباء"
                />
                <label className="flex items-center gap-2 whitespace-nowrap text-sm font-medium">
                  <Checkbox
                    checked={allVisibleDoctorsSelected}
                    onCheckedChange={(checked) => {
                      if (Boolean(checked)) {
                        setSelectedDoctorCodes((prev) => Array.from(new Set([...prev, ...visibleDoctorCodes])));
                      } else {
                        setSelectedDoctorCodes((prev) =>
                          prev.filter((code) => !visibleDoctorCodes.includes(code))
                        );
                      }
                    }}
                  />
                  تحديد الكل
                </label>
              </div>
              <div className="max-h-64 space-y-1 overflow-auto">
                {filteredDoctors.map((doctor) => (
                  <label key={doctor.code} className="flex items-center justify-between gap-2 rounded-md border border-border bg-card p-2 text-sm transition-colors hover:bg-muted/50">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground">{doctor.name}</div>
                      <div className="text-xs text-muted-foreground" dir="ltr">{doctor.code}</div>
                    </div>
                    <Checkbox
                      checked={selectedDoctorCodes.includes(doctor.code)}
                      onCheckedChange={(checked) => {
                        if (Boolean(checked)) {
                          setSelectedDoctorCodes((prev) => Array.from(new Set([...prev, doctor.code])));
                        } else {
                          setSelectedDoctorCodes((prev) => prev.filter((code) => code !== doctor.code));
                        }
                      }}
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
              <h3 className="font-semibold text-foreground">الخدمات</h3>
              <div className="flex items-center justify-between gap-2">
                <Input
                  placeholder="بحث خدمة (اسم / كود)"
                  value={serviceSearchTerm}
                  onChange={(e) => setServiceSearchTerm(e.target.value)}
                  aria-label="بحث الخدمات"
                />
                <label className="flex items-center gap-2 whitespace-nowrap text-sm font-medium">
                  <Checkbox
                    checked={allVisibleServicesSelected}
                    onCheckedChange={(checked) => {
                      if (Boolean(checked)) {
                        setSelectedServiceCodes((prev) => Array.from(new Set([...prev, ...visibleServiceCodes])));
                      } else {
                        setSelectedServiceCodes((prev) =>
                          prev.filter((code) => !visibleServiceCodes.includes(code))
                        );
                      }
                    }}
                  />
                  تحديد الكل
                </label>
              </div>
              <div className="max-h-64 space-y-1 overflow-auto">
                {filteredServicesForMapping.map((service) => (
                  <label key={service.code} className="flex items-center justify-between gap-2 rounded-md border border-border bg-card p-2 text-sm transition-colors hover:bg-muted/50">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground">{service.name}</div>
                      <div className="text-xs text-muted-foreground" dir="ltr">{service.code}</div>
                    </div>
                    <Checkbox
                      checked={selectedServiceCodes.includes(service.code)}
                      onCheckedChange={(checked) => {
                        if (Boolean(checked)) {
                          setSelectedServiceCodes((prev) => Array.from(new Set([...prev, service.code])));
                        } else {
                          setSelectedServiceCodes((prev) =>
                            prev.filter((code) => code !== service.code)
                          );
                        }
                      }}
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={mappingSheetType} onValueChange={(v) => setMappingSheetType(v as SheetType)}>
              <SelectTrigger className="w-full sm:w-[220px]" aria-label="اختر نوع الشيت">
                <SelectValue placeholder="الشيت" />
              </SelectTrigger>
              <SelectContent>
                {sheetOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button onClick={addDoctorServiceMatches}>مطابقة المحدد</Button>
              <Button type="button" variant="outline" onClick={deduplicateMatches}>
                حذف التكرارات
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void deleteAllMatches()}
                disabled={saveMappingsMutation.isPending}
              >
                حذف الكل
              </Button>
              <Button variant="secondary" onClick={saveDoctorServiceMatches} disabled={saveMappingsMutation.isPending}>
                حفظ المطابقات
              </Button>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              أطباء محددين: {selectedDoctorCodes.length} | خدمات محددة: {selectedServiceCodes.length}
            </span>
          </div>

          <div className="rounded-lg border border-border">
            <div className="grid grid-cols-[1.2fr_1.4fr_1fr_auto] gap-2 border-b bg-blue-50 px-4 py-3 text-sm font-semibold text-foreground">
              <div>الطبيب</div>
              <div>الخدمة</div>
              <div>الشيت</div>
              <div />
            </div>
            <div className="max-h-72 overflow-auto">
              {doctorServiceMatches.length === 0 ? (
                <div className="p-3 text-sm text-slate-500">لا توجد مطابقات محفوظة</div>
              ) : (
                doctorServiceMatches.map((match) => (
                  <div key={match.id} className="grid grid-cols-[1.2fr_1.4fr_1fr_auto] gap-2 border-b px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate">
                        {doctorNameByCode.get(match.doctorCode) || match.doctorName || match.doctorCode}
                      </div>
                      <div className="text-xs text-slate-500" dir="ltr">{match.doctorCode}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="truncate">
                        {serviceNameByCode.get(match.serviceCode) || match.serviceName || match.serviceCode}
                      </div>
                      <div className="text-xs text-slate-500" dir="ltr">{match.serviceCode}</div>
                    </div>
                    <div>{match.sheetType}</div>
                    <div>
                      <Button variant="ghost" size="sm" onClick={() => removeMatch(match.id)} className="text-red-600">
                        حذف
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
        ) : (
          <CardContent>
            <p className="text-sm text-muted-foreground">تم إخفاء القسم لتحسين الأداء. اضغط "إظهار" عند الحاجة.</p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
