import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Search,
  Settings,
  ShieldAlert,
  Users,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface RateForm {
  r3: string;
  r5: string;
  r7: string;
  r10: string;
}

const TIERS = [
  { key: "r3" as const, label: "≤ 3 أيام إجازة" },
  { key: "r5" as const, label: "≤ 5 أيام إجازة" },
  { key: "r7" as const, label: "≤ 7 أيام إجازة" },
  { key: "r10" as const, label: "≤ 10 أيام إجازة" },
];

function DeductionsControl() {
  const enabledQ = (trpc as any).salary.getDeductionsEnabled.useQuery();
  const setEnabledMut = (trpc as any).salary.setDeductionsEnabled.useMutation({
    onSuccess: (_result: unknown, input: { enabled: boolean }) => {
      enabledQ.refetch();
      toast.success(
        input.enabled
          ? "تم تفعيل نظام الخصومات"
          : "تم إلغاء تأثير الخصومات على المرتبات والعمولات",
      );
    },
    onError: (err: any) =>
      toast.error(err.message ?? "خطأ في تعديل نظام الخصومات"),
  });
  const enabled = enabledQ.data ?? true;

  return (
    <Card className="border-border/60 bg-card/30 shadow-sm">
      <CardContent className="flex items-center justify-between gap-4 py-5">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-bold">نظام خصومات المرتبات</p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              يشمل الغياب والتأخير والانصراف المبكر والجزاءات والسلف. عند
              الإلغاء تُوقف هذه الخصومات مع بقاء خصم التأمين طبيعيًا، وتظل
              العمولات غير متأثرة مع الاحتفاظ بالسجلات.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs font-bold">
            {enabled ? "مفعّل" : "ملغي"}
          </span>
          <Switch
            checked={enabled}
            disabled={enabledQ.isLoading || setEnabledMut.isPending}
            onCheckedChange={(checked) =>
              setEnabledMut.mutate({ enabled: checked })
            }
            aria-label="تفعيل نظام خصومات المرتبات"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function GlobalRates() {
  const [form, setForm] = useState<RateForm>({
    r3: "",
    r5: "",
    r7: "",
    r10: "",
  });
  const [saving, setSaving] = useState(false);

  const ratesQ = (trpc as any).salary.getAttendanceRates.useQuery();
  const setRatesMut = (trpc as any).salary.setAttendanceRates.useMutation({
    onSuccess: () => {
      ratesQ.refetch();
      toast.success("تم حفظ النسب العامة بنجاح");
    },
    onError: (err: any) => toast.error(err.message ?? "خطأ في حفظ النسب"),
    onSettled: () => setSaving(false),
  });

  useEffect(() => {
    if (!ratesQ.data) return;
    const d = ratesQ.data;
    setForm({
      r3: String(Math.round(d.rate3 * 100)),
      r5: String(Math.round(d.rate5 * 100)),
      r7: String(Math.round(d.rate7 * 100)),
      r10: String(Math.round(d.rate10 * 100)),
    });
  }, [ratesQ.data]);

  function save() {
    const r3 = parseFloat(form.r3) / 100;
    const r5 = parseFloat(form.r5) / 100;
    const r7 = parseFloat(form.r7) / 100;
    const r10 = parseFloat(form.r10) / 100;
    if ([r3, r5, r7, r10].some(isNaN)) {
      toast.error("أدخل قيمًا صحيحة للنسب");
      return;
    }
    setSaving(true);
    setRatesMut.mutate({ rate3: r3, rate5: r5, rate7: r7, rate10: r10 });
  }

  return (
    <Card className="border-border/60 bg-card/30 backdrop-blur-sm shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-sm font-bold">
              نسب الحضور العامة (المركز)
            </CardTitle>
            <CardDescription className="text-[11px]">
              تُطبَّق هذه النسب تلقائياً على كل موظف ليس لديه نسبة حضور خاصة.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TIERS.map(({ key, label }) => (
            <div
              key={key}
              className="flex flex-col gap-1.5 rounded-lg border border-border/40 p-3 bg-muted/10"
            >
              <span className="text-[10px] font-semibold text-muted-foreground">
                {label}
              </span>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={form[key]}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs pr-7 text-right outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">
                  %
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-border/40 pt-4">
          <span className="text-[10px] text-muted-foreground/80">
            * الغياب الأكثر من 10 أيام يُحسب بنسبة 0% تلقائياً.
          </span>
          <Button
            onClick={save}
            disabled={saving || ratesQ.isLoading}
            size="sm"
            className="h-8 text-xs font-semibold"
          >
            {saving ? "جاري الحفظ…" : "حفظ النسب"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmployeeSettingsGrid() {
  const [sectionTab, setSectionTab] = useState<"مركز" | "عيادة">("مركز");
  const empsQ = (trpc as any).salary.listEmployees.useQuery({
    section: sectionTab,
  });
  const shiftStaffQ = (trpc as any).salary.listShiftStaff.useQuery();
  const updateMut = (trpc as any).salary.setEmployeeSectionSettings.useMutation(
    {
      onError: (err: any) =>
        toast.error(err.message ?? "خطأ في حفظ إعدادات الموظف"),
    },
  );
  const flagsMut = (trpc as any).salary.setCommissionFlags.useMutation({
    onError: (err: any) =>
      toast.error(err.message ?? "خطأ في تعديل العمولات والبدلات"),
    onSuccess: () => empsQ.refetch(),
  });

  const [rates, setRates] = useState<Record<string, string>>({});
  const [multipliers, setMultipliers] = useState<Record<string, string>>({});
  const [salaryTypes, setSalaryTypes] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [centerTab, setCenterTab] = useState<"رواتب" | "شفتات">("رواتب");
  const [selectedEmpCds, setSelectedEmpCds] = useState<Set<string>>(new Set());
  const [bulkRateMode, setBulkRateMode] = useState<
    "keep" | "general" | "custom"
  >("keep");
  const [bulkRate, setBulkRate] = useState("25");
  const [bulkMultiplierMode, setBulkMultiplierMode] = useState<
    "keep" | "automatic" | "custom"
  >("keep");
  const [bulkMultiplier, setBulkMultiplier] = useState("100");
  const [bulkFlags, setBulkFlags] = useState({
    commAttendance: "keep",
    commExam: "keep",
    commPentacam: "keep",
    commDay10: "keep",
    commOvertime: "keep",
  });
  const allEmps: any[] = empsQ.data ?? [];
  const shiftEmpCds = new Set(
    (shiftStaffQ.data ?? [])
      .filter((staff: any) => staff.active !== false && staff.empCd)
      .map((staff: any) => String(staff.empCd)),
  );
  const scopedEmps = allEmps.filter((emp) => {
    const isBoth = emp.department === "المركز والعيادة";
    if (sectionTab === "عيادة") return emp.department === "عيادة" || isBoth;
    if (emp.department !== "مركز" && !isBoth) return false;
    return centerTab === "شفتات"
      ? shiftEmpCds.has(emp.empCd)
      : !shiftEmpCds.has(emp.empCd);
  });
  const filteredEmps = scopedEmps.filter((emp) =>
    `${emp.fullName} ${emp.empCd} ${emp.salaryType ?? ""}`
      .toLocaleLowerCase("ar")
      .includes(search.trim().toLocaleLowerCase("ar")),
  );
  const allFilteredSelected =
    filteredEmps.length > 0 &&
    filteredEmps.every((emp) => selectedEmpCds.has(emp.empCd));
  const hasBulkChange =
    bulkRateMode !== "keep" ||
    bulkMultiplierMode !== "keep" ||
    Object.values(bulkFlags).some((state) => state !== "keep");

  const bulkMut = (
    trpc as any
  ).salary.setEmployeeCommissionSettingsBulk.useMutation({
    onSuccess: (result: { updated: number }) => {
      empsQ.refetch();
      setSelectedEmpCds(new Set());
      toast.success(`تم تطبيق الإعدادات على ${result.updated} موظف`);
    },
    onError: (err: any) =>
      toast.error(err.message ?? "خطأ في تطبيق الإعدادات الجماعية"),
  });

  useEffect(() => {
    if (!empsQ.data) return;
    const initRates: Record<string, string> = {};
    const initMults: Record<string, string> = {};
    const initSalaryTypes: Record<string, string> = {};
    for (const emp of empsQ.data) {
      initSalaryTypes[emp.empCd] = emp.salaryType ?? "";
      initRates[emp.empCd] =
        emp.attendanceCommissionRate != null
          ? String(Math.round(Number(emp.attendanceCommissionRate) * 100))
          : "";
      initMults[emp.empCd] =
        emp.attendanceLeaveMultiplier != null
          ? String(Math.round(Number(emp.attendanceLeaveMultiplier) * 100))
          : "";
    }
    setRates(initRates);
    setMultipliers(initMults);
    setSalaryTypes(initSalaryTypes);
  }, [empsQ.data]);

  function saveEmpSettings(emp: any) {
    const rawRate = rates[emp.empCd] ?? "";
    const rate = rawRate === "" ? null : parseFloat(rawRate) / 100;
    if (rate !== null && isNaN(rate)) {
      toast.error("قيمة نسبة الحضور غير صحيحة");
      return;
    }

    const rawMult = multipliers[emp.empCd] ?? "";
    const multiplier = rawMult === "" ? null : parseFloat(rawMult) / 100;
    if (multiplier !== null && isNaN(multiplier)) {
      toast.error("قيمة معامل الحضور غير صحيحة");
      return;
    }

    updateMut.mutate(
      {
        empCd: emp.empCd,
        section: sectionTab,
        salaryType: salaryTypes[emp.empCd] || null,
        attendanceCommissionRate: rate,
        attendanceLeaveMultiplier: multiplier,
      },
      {
        onSuccess: () => {
          empsQ.refetch();
          toast.success(`تم حفظ إعدادات الموظف: ${emp.fullName}`);
        },
      },
    );
  }

  function toggleFlag(
    emp: any,
    key:
      | "commAttendance"
      | "commExam"
      | "commPentacam"
      | "commDay10"
      | "commOvertime",
  ) {
    const attendanceEnabled = emp.commAttendance !== false;
    const examEnabled = emp.commExam !== false;
    const pentacamEnabled = emp.commPentacam !== false;
    const day10Enabled = emp.commDay10 !== false;
    const overtimeEnabled = emp.commOvertime !== false;

    flagsMut.mutate({
      empCd: emp.empCd,
      section: sectionTab,
      commAttendance:
        key === "commAttendance" ? !attendanceEnabled : attendanceEnabled,
      commExam: key === "commExam" ? !examEnabled : examEnabled,
      commPentacam: key === "commPentacam" ? !pentacamEnabled : pentacamEnabled,
      commDay10: key === "commDay10" ? !day10Enabled : day10Enabled,
      commOvertime:
        key === "commOvertime" ? !overtimeEnabled : overtimeEnabled,
    });
  }

  function toggleEmployeeSelection(empCd: string) {
    setSelectedEmpCds((current) => {
      const next = new Set(current);
      if (next.has(empCd)) next.delete(empCd);
      else next.add(empCd);
      return next;
    });
  }

  function toggleAllFiltered() {
    setSelectedEmpCds((current) => {
      const next = new Set(current);
      if (allFilteredSelected) {
        filteredEmps.forEach((emp) => next.delete(emp.empCd));
      } else {
        filteredEmps.forEach((emp) => next.add(emp.empCd));
      }
      return next;
    });
  }

  function applyBulkSettings() {
    if (selectedEmpCds.size === 0) {
      toast.error("حدد موظفًا واحدًا على الأقل");
      return;
    }
    if (!hasBulkChange) {
      toast.error("اختر إعدادًا واحدًا على الأقل للتطبيق");
      return;
    }
    if (
      (bulkRateMode === "custom" &&
        (!Number.isFinite(Number(bulkRate)) ||
          Number(bulkRate) < 0 ||
          Number(bulkRate) > 100)) ||
      (bulkMultiplierMode === "custom" &&
        (!Number.isFinite(Number(bulkMultiplier)) ||
          Number(bulkMultiplier) < 0 ||
          Number(bulkMultiplier) > 100))
    ) {
      toast.error("النسب يجب أن تكون بين 0 و100");
      return;
    }
    const input: Record<string, unknown> = {
      empCds: Array.from(selectedEmpCds),
      section: sectionTab,
    };
    if (bulkRateMode !== "keep") {
      input.attendanceCommissionRate =
        bulkRateMode === "general" ? null : Number(bulkRate) / 100;
    }
    if (bulkMultiplierMode !== "keep") {
      input.attendanceLeaveMultiplier =
        bulkMultiplierMode === "automatic"
          ? null
          : Number(bulkMultiplier) / 100;
    }
    for (const [field, state] of Object.entries(bulkFlags)) {
      if (state !== "keep") input[field] = state === "on";
    }
    bulkMut.mutate(input);
  }

  if (empsQ.isLoading) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-6 space-y-3">
          <Skeleton className="h-6 w-1/3 animate-pulse" />
          <Skeleton className="h-20 w-full animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (allEmps.length === 0) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-8 text-center text-xs text-muted-foreground font-medium">
          لا يوجد موظفون مسجلون في النظام حالياً.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 bg-card/30 backdrop-blur-sm shadow-sm overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <div>
            <div>
              <CardTitle className="text-sm font-bold">
                إعدادات الموظفين الخاصة
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                إعداد الموظف الخاص هو الأساس ويغطي الإعداد العام. يُستخدم العام
                أو التلقائي فقط عند ترك القيمة الخاصة فارغة.
              </p>
            </div>
            <CardDescription className="text-[11px]">
              تعديل النسب الخاصة ومعامل الحضور الإضافي وتفعيل عمولات
              الحضور، الكشف، البنتاكام، وبدلات يوم 10.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-4 border-t border-border/40 bg-muted/15 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex w-fit rounded-md border border-border bg-background p-1">
              {(["مركز", "عيادة"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setSectionTab(tab);
                    setSelectedEmpCds(new Set());
                  }}
                  className={`min-h-9 rounded px-5 text-xs font-semibold ${
                    sectionTab === tab
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            {sectionTab === "مركز" && (
              <div className="inline-flex w-fit rounded-md bg-muted p-1">
                {(["رواتب", "شفتات"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setCenterTab(tab);
                      setSelectedEmpCds(new Set());
                    }}
                    className={`min-h-8 rounded px-4 text-xs font-semibold ${
                      centerTab === tab
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-sm">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="بحث بالاسم أو الكود أو النوع"
                className="h-10 w-full rounded-md border border-input bg-background pr-9 pl-3 text-sm outline-none focus:border-primary/50"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleAllFiltered}
              >
                {allFilteredSelected ? "إلغاء تحديد الظاهر" : "تحديد كل الظاهر"}
              </Button>
              <span className="text-xs font-semibold text-primary">
                المحدد: {selectedEmpCds.size}
              </span>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground">
                نسبة الحضور
              </span>
              <div className="flex gap-2">
                <select
                  value={bulkRateMode}
                  onChange={(event) =>
                    setBulkRateMode(event.target.value as typeof bulkRateMode)
                  }
                  className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="keep">بدون تغيير</option>
                  <option value="general">استخدام العام</option>
                  <option value="custom">قيمة موحدة</option>
                </select>
                {bulkRateMode === "custom" && (
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={bulkRate}
                    onChange={(event) => setBulkRate(event.target.value)}
                    className="h-9 w-20 rounded-md border border-input bg-background px-2 text-center text-xs"
                  />
                )}
              </div>
            </label>

            <label className="space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground">
                معامل الحضور
              </span>
              <div className="flex gap-2">
                <select
                  value={bulkMultiplierMode}
                  onChange={(event) =>
                    setBulkMultiplierMode(
                      event.target.value as typeof bulkMultiplierMode,
                    )
                  }
                  className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="keep">بدون تغيير</option>
                  <option value="automatic">تلقائي</option>
                  <option value="custom">قيمة موحدة</option>
                </select>
                {bulkMultiplierMode === "custom" && (
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={bulkMultiplier}
                    onChange={(event) => setBulkMultiplier(event.target.value)}
                    className="h-9 w-20 rounded-md border border-input bg-background px-2 text-center text-xs"
                  />
                )}
              </div>
            </label>

            {[
              ["commAttendance", "عمولة الحضور"],
              ["commExam", "عمولة الكشف"],
              ["commPentacam", "البنتاكام"],
              ["commDay10", "بدلات يوم 10"],
              ["commOvertime", "الإضافي"],
            ].map(([field, label]) => (
              <label key={field} className="space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {label}
                </span>
                <select
                  value={bulkFlags[field as keyof typeof bulkFlags]}
                  onChange={(event) =>
                    setBulkFlags((current) => ({
                      ...current,
                      [field]: event.target.value,
                    }))
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="keep">بدون تغيير</option>
                  <option value="on">تفعيل</option>
                  <option value="off">إلغاء</option>
                </select>
              </label>
            ))}
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              disabled={
                selectedEmpCds.size === 0 || !hasBulkChange || bulkMut.isPending
              }
              onClick={applyBulkSettings}
            >
              تطبيق على المحددين
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="border-t border-b border-border bg-muted/40 text-muted-foreground font-bold">
                <th className="px-6 py-3 font-semibold">الموظف</th>
                <th className="w-12 px-2 py-3 text-center font-semibold">
                  تحديد
                </th>
                <th className="px-4 py-3 font-semibold text-center w-24">
                  النوع
                </th>
                <th className="px-4 py-3 font-semibold text-center w-[240px]">
                  النسب والمعاملات الخاصة
                </th>
                <th className="px-6 py-3 font-semibold text-center w-80">
                  تفعيل العمولات والبدلات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredEmps.map((emp) => {
                const attendanceEnabled = emp.commAttendance !== false;
                const examEnabled = emp.commExam !== false;
                const pentacamEnabled = emp.commPentacam !== false;
                const day10Enabled = emp.commDay10 !== false;
                const overtimeEnabled = emp.commOvertime !== false;

                return (
                  <tr
                    key={emp.empCd}
                    className="hover:bg-muted/10 transition-colors"
                  >
                    <td className="px-6 py-3 font-bold text-foreground">
                      {emp.fullName}
                    </td>
                    <td className="px-2 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedEmpCds.has(emp.empCd)}
                        onChange={() => toggleEmployeeSelection(emp.empCd)}
                        aria-label={`تحديد ${emp.fullName}`}
                        className="h-4 w-4 accent-primary"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <select
                        value={salaryTypes[emp.empCd] ?? ""}
                        onChange={(event) =>
                          setSalaryTypes((current) => ({
                            ...current,
                            [emp.empCd]: event.target.value,
                          }))
                        }
                        aria-label={`نوع عمولة الكشف للموظف ${emp.fullName}`}
                        className="h-8 w-24 rounded-md border border-input bg-background px-1 text-[10px] font-semibold outline-none focus:border-primary/50"
                      >
                        <option value="">بدون</option>
                        <option value="استشاري">استشاري</option>
                        <option value="أخصائي">أخصائي</option>
                        <option value="الاثنين">الاثنين</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 justify-center">
                        {/* att% Input */}
                        <div className="flex flex-col items-center gap-1 w-20">
                          <span className="text-[9px] font-bold text-muted-foreground whitespace-nowrap">
                            عمولة الحضور %
                          </span>
                          <div className="relative w-full">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={1}
                              placeholder="عام"
                              value={rates[emp.empCd] ?? ""}
                              onChange={(e) =>
                                setRates((r) => ({
                                  ...r,
                                  [emp.empCd]: e.target.value,
                                }))
                              }
                              className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs pr-6 text-right outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                            />
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground">
                              %
                            </span>
                          </div>
                        </div>

                        {/* Multiplier Input */}
                        <div className="flex flex-col items-center gap-1 w-20">
                          <span className="text-[9px] font-bold text-muted-foreground whitespace-nowrap">
                            المعامل %
                          </span>
                          <div className="relative w-full">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={1}
                              placeholder="تلقائي"
                              value={multipliers[emp.empCd] ?? ""}
                              onChange={(e) =>
                                setMultipliers((m) => ({
                                  ...m,
                                  [emp.empCd]: e.target.value,
                                }))
                              }
                              className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs pr-6 text-right outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                            />
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground">
                              %
                            </span>
                          </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex flex-col items-center gap-1 pt-4 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updateMut.isPending}
                            onClick={() => saveEmpSettings(emp)}
                            className="h-7 px-2 text-[10px] font-bold"
                          >
                            حفظ
                          </Button>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-4 justify-center">
                        {/* عمولة الحضور */}
                        <div className="flex flex-col items-center gap-1.5 w-16">
                          <span className="text-[9px] font-bold text-muted-foreground whitespace-nowrap">
                            عمولة الحضور
                          </span>
                          <button
                            type="button"
                            disabled={flagsMut.isPending}
                            onClick={() => toggleFlag(emp, "commAttendance")}
                            className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors focus-visible:outline-none disabled:opacity-50 ${attendanceEnabled ? "bg-primary" : "bg-input"}`}
                            role="switch"
                            aria-checked={attendanceEnabled}
                          >
                            <span
                              className={`pointer-events-none inline-block h-3 w-3 rounded-full bg-white shadow-sm ring-0 transition-transform ${attendanceEnabled ? "translate-x-3.5" : "translate-x-0"}`}
                            />
                          </button>
                        </div>

                        {/* معامل الكشف */}
                        <div className="flex flex-col items-center gap-1.5 w-16">
                          <span className="text-[9px] font-bold text-muted-foreground whitespace-nowrap">
                            معامل الكشف
                          </span>
                          <button
                            type="button"
                            disabled={flagsMut.isPending}
                            onClick={() => toggleFlag(emp, "commExam")}
                            className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors focus-visible:outline-none disabled:opacity-50 ${examEnabled ? "bg-primary" : "bg-input"}`}
                            role="switch"
                            aria-checked={examEnabled}
                          >
                            <span
                              className={`pointer-events-none inline-block h-3 w-3 rounded-full bg-white shadow-sm ring-0 transition-transform ${examEnabled ? "translate-x-3.5" : "translate-x-0"}`}
                            />
                          </button>
                        </div>

                        {/* معامل البنتاكام */}
                        <div className="flex flex-col items-center gap-1.5 w-16">
                          <span className="text-[9px] font-bold text-muted-foreground whitespace-nowrap">
                            البنتاكام
                          </span>
                          <button
                            type="button"
                            disabled={flagsMut.isPending}
                            onClick={() => toggleFlag(emp, "commPentacam")}
                            className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors focus-visible:outline-none disabled:opacity-50 ${pentacamEnabled ? "bg-primary" : "bg-input"}`}
                            role="switch"
                            aria-checked={pentacamEnabled}
                          >
                            <span
                              className={`pointer-events-none inline-block h-3 w-3 rounded-full bg-white shadow-sm ring-0 transition-transform ${pentacamEnabled ? "translate-x-3.5" : "translate-x-0"}`}
                            />
                          </button>
                        </div>

                        {/* بدلات يوم 10 */}
                        <div className="flex flex-col items-center gap-1.5 w-16">
                          <span className="text-[9px] font-bold text-muted-foreground whitespace-nowrap">
                            بدلات يوم 10
                          </span>
                          <button
                            type="button"
                            disabled={flagsMut.isPending}
                            onClick={() => toggleFlag(emp, "commDay10")}
                            className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors focus-visible:outline-none disabled:opacity-50 ${day10Enabled ? "bg-primary" : "bg-input"}`}
                            role="switch"
                            aria-checked={day10Enabled}
                          >
                            <span
                              className={`pointer-events-none inline-block h-3 w-3 rounded-full bg-white shadow-sm ring-0 transition-transform ${day10Enabled ? "translate-x-3.5" : "translate-x-0"}`}
                            />
                          </button>
                        </div>

                        {/* الإضافي */}
                        <div className="flex flex-col items-center gap-1.5 w-16">
                          <span className="text-[9px] font-bold text-muted-foreground whitespace-nowrap">
                            الإضافي
                          </span>
                          <button
                            type="button"
                            disabled={flagsMut.isPending}
                            onClick={() => toggleFlag(emp, "commOvertime")}
                            className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors focus-visible:outline-none disabled:opacity-50 ${overtimeEnabled ? "bg-primary" : "bg-input"}`}
                            role="switch"
                            aria-label={`تفعيل الإضافي للموظف ${emp.fullName}`}
                            aria-checked={overtimeEnabled}
                          >
                            <span
                              className={`pointer-events-none inline-block h-3 w-3 rounded-full bg-white shadow-sm ring-0 transition-transform ${overtimeEnabled ? "translate-x-3.5" : "translate-x-0"}`}
                            />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredEmps.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-xs text-muted-foreground"
                  >
                    لا يوجد موظفون في هذا التصنيف.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

interface LateTier {
  minMin: number;
  maxMin: number | null;
  type?: "linear";
  dayFraction?: number;
}

const DEFAULT_LATE_TIERS: LateTier[] = [
  { minMin: 1, maxMin: 14, type: "linear" },
  { minMin: 15, maxMin: 29, dayFraction: 0.25 },
  { minMin: 30, maxMin: 59, dayFraction: 0.5 },
  { minMin: 60, maxMin: 119, dayFraction: 1 },
  { minMin: 120, maxMin: null, dayFraction: 2 },
];

function tierLabel(t: LateTier): string {
  if (t.type === "linear") return "خطي (دقيقة × معدل)";
  if (t.dayFraction === 0.25) return "ربع يوم (¼)";
  if (t.dayFraction === 0.5) return "نصف يوم (½)";
  if (t.dayFraction === 1) return "يوم كامل (1)";
  if (t.dayFraction === 2) return "يومان (2)";
  return String(t.dayFraction ?? "");
}

function LateTiersCard() {
  const tiersQ = (trpc as any).salary.getLateTiers.useQuery();
  const setTiersMut = (trpc as any).salary.setLateTiers.useMutation({
    onSuccess: () => {
      tiersQ.refetch();
      toast.success("تم حفظ شرائح التأخير بنجاح");
    },
    onError: (err: any) => toast.error(err.message ?? "خطأ في حفظ الشرائح"),
  });
  const [tiers, setTiers] = useState<LateTier[]>(DEFAULT_LATE_TIERS);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (tiersQ.data) setTiers(tiersQ.data);
  }, [tiersQ.data]);

  function setTierField(
    idx: number,
    field: keyof LateTier,
    val: string | null,
  ) {
    setTiers((prev) => {
      const next = [...prev];
      const t = { ...next[idx] };
      if (field === "maxMin") {
        t.maxMin = val === null || val === "" ? null : parseInt(val);
        if (t.maxMin !== null && next[idx + 1]) {
          next[idx + 1] = { ...next[idx + 1], minMin: t.maxMin + 1 };
        }
      } else if (field === "minMin") {
        t.minMin = parseInt(val as string) || 0;
        if (idx > 0) {
          next[idx - 1] = {
            ...next[idx - 1],
            maxMin: Math.max(0, t.minMin - 1),
          };
        }
      } else if (field === "dayFraction") {
        t.dayFraction = parseFloat(val as string);
      }
      next[idx] = t;
      return next;
    });
  }

  function save() {
    setTiersMut.mutate(tiers);
  }

  return (
    <Card className="border-border/60 bg-card/30 backdrop-blur-sm shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-sm font-bold">
                شرائح خصم التأخير (لكل يوم)
              </CardTitle>
              <CardDescription className="text-[11px]">
                الشريحة الخطية تتصاعد أسبوعيًا داخل دورة المرتب: الأولى بالدقيقة، الثانية ×2، الثالثة ×3، والرابعة فأكثر ×4. تبدأ الدورة يوم 26 من كل شهر.
              </CardDescription>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setEditing((current) => !current)}
          >
            {editing ? (
              <ChevronUp className="ml-1 h-4 w-4" />
            ) : (
              <ChevronDown className="ml-1 h-4 w-4" />
            )}
            {editing ? "إغلاق" : "تعديل الشرائح"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {tiersQ.isLoading ? (
          <Skeleton className="h-20 w-full animate-pulse" />
        ) : editing ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-muted-foreground">
                  <th className="px-3 py-2 font-semibold">من (دقيقة)</th>
                  <th className="px-3 py-2 font-semibold">إلى (دقيقة)</th>
                  <th className="px-3 py-2 font-semibold">الخصم</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((t, i) => (
                  <tr
                    key={i}
                    className="border-b border-border/30 hover:bg-muted/10"
                  >
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        value={t.minMin}
                        onChange={(e) =>
                          setTierField(i, "minMin", e.target.value)
                        }
                        className="w-20 rounded border border-input bg-background px-2 py-1 text-xs text-right outline-none focus:border-primary/50"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        value={t.maxMin ?? ""}
                        placeholder="∞"
                        onChange={(e) =>
                          setTierField(i, "maxMin", e.target.value)
                        }
                        className="w-20 rounded border border-input bg-background px-2 py-1 text-xs text-right outline-none focus:border-primary/50"
                      />
                    </td>
                    <td className="px-3 py-2 font-semibold text-primary">
                      {tierLabel(t)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tiers.map((tier) => (
              <span
                key={`${tier.minMin}-${tier.maxMin ?? "plus"}`}
                className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px]"
              >
                {tier.minMin} إلى {tier.maxMin ?? "∞"} دقيقة:{" "}
                <strong>{tierLabel(tier)}</strong>
              </span>
            ))}
          </div>
        )}
        {editing && (
          <div className="flex justify-end border-t border-border/40 pt-3">
            <Button
              onClick={save}
              disabled={setTiersMut.isPending || tiersQ.isLoading}
              size="sm"
              className="h-8 text-xs font-semibold"
            >
              {setTiersMut.isPending ? "جاري الحفظ…" : "حفظ الشرائح"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SalarySettings() {
  return (
    <div className="w-full space-y-6">
      <DeductionsControl />
      <Tabs defaultValue="global" dir="rtl" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-3 rounded-xl bg-muted/60 p-1">
          <TabsTrigger value="global">نسب الحضور العامة (المركز)</TabsTrigger>
          <TabsTrigger value="late">شرائح خصم التأخير (لكل يوم)</TabsTrigger>
          <TabsTrigger value="employees">إعدادات الموظفين الخاصة</TabsTrigger>
        </TabsList>
        <TabsContent value="global" className="m-0">
          <GlobalRates />
        </TabsContent>
        <TabsContent value="late" className="m-0">
          <LateTiersCard />
        </TabsContent>
        <TabsContent value="employees" className="m-0">
          <EmployeeSettingsGrid />
        </TabsContent>
      </Tabs>
    </div>
  );
}
