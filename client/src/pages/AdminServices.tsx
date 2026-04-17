import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { getTrpcErrorMessage } from "@/lib/utils";

type ServiceType = "consultant" | "specialist" | "lasik" | "surgery" | "external";
type ServiceCategory = "examination" | "radiology" | "operations" | "miscellaneous";
type SheetType = ServiceType | "pentacam" | "surgery_center" | "surgery_external" | "pentacam_center" | "pentacam_external";

type ServiceEntry = {
  id: string;
  code: string;
  name: string;
  category?: ServiceCategory;
  serviceType: ServiceType;
  srvTyp: "1" | "2";
  defaultSheet: SheetType;
  isActive: boolean;
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
  value === "pentacam_external";

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
  if (raw === "surgery") return "surgery_center";
  if (raw === "external") return "external";
  return isSheetType(raw) ? (raw as SheetType) : inferred;
};

const normalizeSrvTyp = (value: unknown, serviceType: ServiceType, defaultSheet: SheetType): "1" | "2" => {
  const raw = String(value ?? "").trim();
  if (raw === "1" || raw === "2") return raw;
  if (
    serviceType === "external" ||
    defaultSheet === "external" ||
    defaultSheet === "surgery_external" ||
    defaultSheet === "pentacam_external"
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
];

export default function AdminServices() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const [services, setServices] = useState<ServiceEntry[]>([]);
  const [activeCategory, setActiveCategory] = useState<ServiceCategory>("examination");
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

  const servicesQuery = trpc.medical.getSystemSetting.useQuery({ key: "service_directory" }, {
    refetchOnWindowFocus: false,
    staleTime: 0,  // Always consider data stale
    gcTime: 0,  // Don't cache
  });
  const utils = trpc.useUtils();
  const updateServicesMutation = trpc.medical.updateSystemSetting.useMutation({
    onSuccess: async () => {
      await utils.medical.getSystemSetting.invalidate({ key: "service_directory" });
    },
  });
  const syncPatientsMutation = trpc.medical.syncPatientsFromMssql.useMutation();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  // Load services from backend (only on first load, never again)
  useEffect(() => {
    if (isInitialized || !servicesQuery.data) return;

    const raw = (servicesQuery.data as any)?.value;
    const rows = Array.isArray(raw) ? raw : [];
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
      } as ServiceEntry;
    });
    setServices(normalized);
    setIsInitialized(true);
  }, [servicesQuery.data, isInitialized]);

  const sortedServices = useMemo(
    () => [...services].sort((a, b) => String(a.code ?? "").localeCompare(String(b.code ?? ""), "en", { numeric: true })),
    [services]
  );

  const groupedServices = useMemo(() => {
    return sortedServices.filter((service) => (service.category || "examination") === activeCategory);
  }, [activeCategory, sortedServices]);

  const visibleIds = useMemo(() => groupedServices.map((s) => s.id), [groupedServices]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

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

    const newEntry: ServiceEntry = {
      id: makeId(),
      code,
      name,
      category: newService.category,
      serviceType: newService.serviceType,
      srvTyp: "1",
      defaultSheet: newService.defaultSheet,
      isActive: true,
    };

    setServices((prev) => [...prev, newEntry]);
    setNewService({ code: "", name: "", category: "examination", serviceType: "consultant", defaultSheet: "consultant" });
    toast.success("تم إضافة الخدمة");
  };

  const updateService = (id: string, updates: Partial<ServiceEntry>) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const deleteService = (id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
    setSelectedIds((prev) => prev.filter((sid) => sid !== id));
    toast.success("تم حذف الخدمة");
  };

  const saveServices = async () => {
    try {
      await updateServicesMutation.mutateAsync({ key: "service_directory", value: services });
      toast.success("تم حفظ دليل الخدمات بنجاح ✓");
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "فشل حفظ دليل الخدمات"));
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
    const updated = services.map((s) => {
      const inferred = categorizeService(s.code, s.name, s.serviceType);
      return { ...s, category: inferred };
    });
    setServices(updated);
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

  return (
    <div className="container mx-auto px-4 py-8 text-right" dir="rtl">
      {/* Add Service Card */}
      <Card className="mb-6 border-slate-200/80 bg-white/95 shadow-sm">
        <CardHeader>
          <CardTitle>إضافة خدمة جديدة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
            <Input placeholder="كود الخدمة" value={newService.code} onChange={(e) => setNewService((prev) => ({ ...prev, code: e.target.value }))} dir="ltr" />
            <Input placeholder="اسم الخدمة" value={newService.name} onChange={(e) => setNewService((prev) => ({ ...prev, name: e.target.value }))} />
            <Select value={newService.category} onValueChange={(v) => setNewService((prev) => ({ ...prev, category: v as ServiceCategory }))}>
              <SelectTrigger>
                <SelectValue placeholder="الفئة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="examination">🏥 كشف</SelectItem>
                <SelectItem value="radiology">📹 اشعه</SelectItem>
                <SelectItem value="operations">⚕️ عمليات</SelectItem>
                <SelectItem value="miscellaneous">💼 متنوعه</SelectItem>
              </SelectContent>
            </Select>
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
            <Button onClick={addService}>إضافة</Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={saveServices} disabled={updateServicesMutation.isPending}>
              💾 حفظ الدليل
            </Button>
            <Button onClick={syncPatients} disabled={syncPatientsMutation.isPending}>
              🔄 مزامنة المرضى
            </Button>
            <Button variant="secondary" onClick={autoRecategorize} disabled={updateServicesMutation.isPending}>
              🔄 إعادة تصنيف تلقائي
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
                  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
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
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              📥 استيراد CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Services List by Category */}
      <Card>
        <CardHeader>
          <CardTitle>إدارة الخدمات ({sortedServices.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Category Tabs */}
          <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as ServiceCategory)} persistKey="admin-services-categories">
            <TabsList className="grid w-full grid-cols-4 rounded-3xl border border-slate-200/80 bg-white/90 p-2 shadow-sm">
              <TabsTrigger className="rounded-2xl" value="examination">🏥 كشف</TabsTrigger>
              <TabsTrigger className="rounded-2xl" value="radiology">📹 اشعه</TabsTrigger>
              <TabsTrigger className="rounded-2xl" value="operations">⚕️ عمليات</TabsTrigger>
              <TabsTrigger className="rounded-2xl" value="miscellaneous">💼 متنوعه</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Select All Checkbox and Move Controls */}
          <div className="space-y-2 rounded border border-slate-200 bg-slate-50 p-3">
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
              <span className="text-sm font-medium">تحديد الكل ({visibleIds.length})</span>
            </div>

            {selectedIds.length > 0 && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 pl-6">
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
                  <span className="text-xs text-slate-600">({selectedIds.length} محدد)</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 pl-6">
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

          {/* Services Grid */}
          <div className="grid gap-3">
            {groupedServices.length === 0 ? (
              <div className="rounded border border-dashed border-slate-300 bg-slate-50 py-8 text-center text-slate-500">
                لا توجد خدمات في هذه الفئة
              </div>
            ) : (
              groupedServices.map((service) => (
                <div key={service.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  {/* Row 1: Code, Name, Category, Status */}
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex flex-1 items-center gap-3">
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
                      <div className="flex-1">
                        <div className="font-bold text-slate-900">{service.name}</div>
                        <div className="text-xs text-slate-500" dir="ltr">
                          Code: {service.code}
                        </div>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        {getCategoryEmoji(service.category || "examination")} {getCategoryLabel(service.category || "examination")}
                      </span>
                      <Checkbox
                        checked={service.isActive}
                        onCheckedChange={(checked) => updateService(service.id, { isActive: Boolean(checked) })}
                        title="نشط"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteService(service.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Row 2: Sheet Type + Location */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-slate-600">نوع الشيت</label>
                      <Select value={service.defaultSheet} onValueChange={(v) => updateService(service.id, { defaultSheet: v as SheetType })}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
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

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-xs">
                        <Checkbox
                          checked={service.srvTyp === "1"}
                          onCheckedChange={(checked) => {
                            if (Boolean(checked)) {
                              updateService(service.id, { srvTyp: "1" });
                            } else if (service.srvTyp === "1") {
                              updateService(service.id, { srvTyp: "2" });
                            }
                          }}
                        />
                        <span>مركز</span>
                      </label>

                      <label className="flex items-center gap-2 text-xs">
                        <Checkbox
                          checked={service.srvTyp === "2"}
                          onCheckedChange={(checked) => {
                            if (Boolean(checked)) {
                              updateService(service.id, { srvTyp: "2" });
                            } else if (service.srvTyp === "2") {
                              updateService(service.id, { srvTyp: "1" });
                            }
                          }}
                        />
                        <span>خارجي</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
