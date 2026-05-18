import { type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState, Fragment } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Activity, CheckCircle2, Edit2, MoreVertical, Plus, RefreshCw, Settings, Stethoscope, Trash2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard, STAT_CARDS_MOBILE_ROW } from "@/components/shared/StatCard";
import { SearchBar } from "@/components/shared/SearchBar";
import { cn } from "@/lib/utils";

type DoctorEntry = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  locationType: "center" | "external";
  doctorType: "consultant" | "specialist" | "external";
};

type NewDoctorDraft = {
  code: string;
  name: string;
  locationType: "center" | "external";
  doctorType: "consultant" | "specialist" | "external";
};

const makeId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `doc-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const nextDoctorCode = (existing: DoctorEntry[]) => {
  let maxNum = 0;
  for (const doctor of existing) {
    const code = String(doctor.code || "").trim().toUpperCase();
    const match = code.match(/(\d+)$/);
    if (!match) continue;
    const n = Number(match[1]);
    if (Number.isFinite(n) && n > maxNum) maxNum = n;
  }
  const next = String(maxNum + 1).padStart(3, "0");
  return `DR${next}`;
};

const doctorCodeSortValue = (code: string) => {
  const raw = String(code ?? "").trim().toUpperCase();
  const match = raw.match(/(\d+)$/);
  const num = match ? Number(match[1]) : Number.NaN;
  return Number.isFinite(num) ? num : Number.MAX_SAFE_INTEGER;
};

function doctorArabicInitials(fullName: string) {
  const n = fullName.trim().replace(/^د\.?\s*/u, "").replace(/^dr\.?\s*/i, "");
  const words = n.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  return words[0]?.slice(0, 2).toUpperCase() || "DR";
}

function doctorTypeLabel(t: DoctorEntry["doctorType"]) {
  if (t === "specialist") return "أخصائي";
  if (t === "external") return "خارجي";
  return "استشاري";
}

function doctorTypeBadgeClass(t: DoctorEntry["doctorType"]) {
  if (t === "specialist")
    return "bg-amber-50 text-amber-700 border-0 font-bold";
  if (t === "external")
    return "bg-muted text-muted-foreground border-0 font-bold";
  return "bg-sky-50 text-sky-700 border-0 font-bold";
}

function locationLabel(lt: DoctorEntry["locationType"]) {
  return lt === "external" ? "خارج المركز" : "المركز";
}

export default function AdminDoctors() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [doctors, setDoctors] = useState<DoctorEntry[]>([]);
  const [newDoctor, setNewDoctor] = useState<NewDoctorDraft>({
    code: "",
    name: "",
    locationType: "center",
    doctorType: "consultant",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [delConfirmDoctor, setDelConfirmDoctor] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const doctorsQuery = trpc.medical.getDoctorDirectory.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const utils = trpc.useUtils();
  const updateDoctorsMutation = trpc.medical.updateDoctorDirectory.useMutation();
  const syncRegistrationCatalogMutation = trpc.medical.syncRegistrationCatalogFromMssql.useMutation({
    onSuccess: async (data) => {
      toast.success(`تمت المزامنة: ${data.doctorsUpserted} طبيب`);
      await Promise.all([
        utils.medical.getDoctorDirectory.invalidate(),
        utils.medical.getRegistrationCatalog.invalidate(),
      ]);
      void doctorsQuery.refetch();
    },
    onError: (error) => {
      toast.error("فشلت المزامنة: " + (error.message || "خطأ غير معروف"));
    },
  });

  useEffect(() => {
    if (!isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    if (!doctorsQuery.data) return;
    const normalized: DoctorEntry[] = (doctorsQuery.data as DoctorEntry[]).map((doctor) => ({
      ...doctor,
      locationType: doctor.locationType === "external" ? "external" : "center",
      doctorType:
        doctor.doctorType === "specialist"
          ? "specialist"
          : doctor.doctorType === "external"
            ? "external"
            : "consultant",
    }));
    setDoctors(normalized);
  }, [doctorsQuery.data]);

  if (!isAuthenticated || user?.role !== "admin") return null;

  const sortedDoctors = useMemo(
    () =>
      [...doctors].sort((a, b) => {
        const an = doctorCodeSortValue(a.code);
        const bn = doctorCodeSortValue(b.code);
        if (an !== bn) return an - bn;
        return String(a.code ?? "").localeCompare(String(b.code ?? ""), "en", { numeric: true });
      }),
    [doctors],
  );
  const filteredDoctors = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return sortedDoctors;
    return sortedDoctors.filter((doctor) => {
      const code = String(doctor.code ?? "").toLowerCase();
      const name = String(doctor.name ?? "").toLowerCase();
      return code.includes(term) || name.includes(term);
    });
  }, [sortedDoctors, searchTerm]);

  const addDoctor = () => {
    const typedCode = newDoctor.code.trim();
    const name = newDoctor.name.trim();
    if (!name) {
      toast.error("يرجى إدخال اسم الطبيب.");
      return;
    }
    const code = typedCode || nextDoctorCode(doctors);
    const exists = doctors.some(
      (d) =>
        d.code.trim().toLowerCase() === code.toLowerCase() ||
        d.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (exists) {
      toast.error("الطبيب موجود مسبقاً.");
      return;
    }
    setDoctors((prev) => [
      ...prev,
      {
        id: makeId(),
        code,
        name,
        isActive: true,
        locationType: newDoctor.locationType,
        doctorType: newDoctor.doctorType,
      },
    ]);
    setNewDoctor({ code: "", name: "", locationType: "center", doctorType: "consultant" });
    setAddOpen(false);
    toast.success("تمت إضافة الطبيب إلى القائمة — اضغط «حفظ التغييرات» لمزامنة الخادم.");
  };

  const parseCsvLine = (line: string) => {
    const out: string[] = [];
    let current = "";
    let quote: '"' | "'" | null = null;
    const sep: "," | ";" | "\t" = line.includes(";") ? ";" : line.includes("\t") ? "\t" : ",";
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if ((ch === '"' || ch === "'") && (!quote || quote === ch)) {
        quote = quote === ch ? null : (ch as '"' | "'");
        continue;
      }
      if (!quote && ch === sep) {
        out.push(current.trim());
        current = "";
        continue;
      }
      current += ch;
    }
    out.push(current.trim());
    return out.map((v) => v.replace(/^\uFEFF/, "").trim());
  };

  const importDoctorsCsv = async (file: File) => {
    setIsImporting(true);
    try {
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      if (lines.length === 0) {
        toast.error("ملف CSV فارغ.");
        return;
      }
      const next = [...doctors];
      let imported = 0;
      for (let i = 0; i < lines.length; i += 1) {
        const parts = parseCsvLine(lines[i]);
        if (parts.length < 2) continue;
        const code = String(parts[0] ?? "").trim();
        const name = String(parts[1] ?? "").trim();
        const typeRaw = String(parts[2] ?? "").trim().toLowerCase();
        const doctorType: "consultant" | "specialist" | "external" =
          typeRaw === "specialist" || typeRaw === "اخصائي" || typeRaw === "أخصائي"
            ? "specialist"
            : typeRaw === "external" || typeRaw === "خارجي" || typeRaw === "outside" || typeRaw === "out"
              ? "external"
              : "consultant";
        if (!code || !name) continue;
        if (/^(code|doctor[_\s-]*code)$/i.test(code) && /^(name|doctor[_\s-]*name)$/i.test(name)) continue;
        const exists = next.some(
          (d) =>
            d.code.trim().toLowerCase() === code.toLowerCase() ||
            d.name.trim().toLowerCase() === name.toLowerCase(),
        );
        if (exists) continue;
        next.push({ id: makeId(), code, name, isActive: true, locationType: "center", doctorType });
        imported += 1;
      }
      setDoctors(next);
      if (imported === 0)
        toast.error("لم يُستورد أي صف — التنسيق: code,name[,type]");
      else toast.success(`تم استيراد ${imported} طبيباً`);
    } catch {
      toast.error("تعذر استيراد الملف.");
    } finally {
      setIsImporting(false);
    }
  };

  const saveDoctors = async () => {
    try {
      const normalized = doctors.map((doctor) => ({
        ...doctor,
        locationType: doctor.locationType === "external" ? "external" : "center",
        doctorType:
          doctor.doctorType === "specialist"
            ? "specialist"
            : doctor.doctorType === "external"
              ? "external"
              : "consultant",
      }));
      await updateDoctorsMutation.mutateAsync({ doctors: normalized });
      toast.success("تم حفظ الأطباء.");
      void doctorsQuery.refetch();
    } catch {
      toast.error("تعذر حفظ التغييرات.");
    }
  };

  const doctorsTotal = sortedDoctors.length;
  const doctorsActive = sortedDoctors.filter((d) => d.isActive).length;
  const doctorsInactive = doctorsTotal - doctorsActive;

  const removeDoctor = (id: string) => {
    setDoctors((prev) => prev.filter((d) => d.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const formFieldsUi = (
    draft: NewDoctorDraft,
    setDraft: Dispatch<SetStateAction<NewDoctorDraft>>,
    idPrefix: string,
  ) => (
    <>
      <div className="space-y-1.5">
        <label htmlFor={`${idPrefix}-code`} className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          الكود (اختياري)
        </label>
        <Input
          id={`${idPrefix}-code`}
          placeholder="تلقائي"
          value={draft.code}
          onChange={(e) => setDraft((prev) => ({ ...prev, code: e.target.value }))}
          dir="ltr"
          className="h-9 text-xs font-mono"
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <label htmlFor={`${idPrefix}-name`} className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          اسم الطبيب
        </label>
        <Input
          id={`${idPrefix}-name`}
          placeholder="الاسم الكامل..."
          value={draft.name}
          onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
          className="h-9 text-sm font-medium"
        />
      </div>
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">المقر</span>
        <Select
          value={draft.locationType}
          onValueChange={(value) =>
            setDraft((prev) => ({ ...prev, locationType: value as "center" | "external" }))
          }
        >
          <SelectTrigger className="h-9 text-xs bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="center" className="text-xs">المركز</SelectItem>
            <SelectItem value="external" className="text-xs">خارجي</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">النوع</span>
        <Select
          value={draft.doctorType}
          onValueChange={(value) =>
            setDraft((prev) => ({
              ...prev,
              doctorType: value as "consultant" | "specialist" | "external",
            }))
          }
        >
          <SelectTrigger className="h-9 text-xs bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="consultant" className="text-xs">استشاري</SelectItem>
            <SelectItem value="specialist" className="text-xs">أخصائي</SelectItem>
            <SelectItem value="external" className="text-xs">طبيب خارجي</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-4 text-right" dir="rtl">
      <PageHeader
        title="الأطباء"
        subtitle="ربط الأطباء بالخدمات والمواعيد — بدون إنشاء مستخدم نظام"
        icon={<Stethoscope className="h-5 w-5 text-primary" />}
        action={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2 h-9 rounded-lg border-border/60 hover:bg-background"
              onClick={() => syncRegistrationCatalogMutation.mutate()}
              disabled={syncRegistrationCatalogMutation.isPending}
            >
              <RefreshCw className={cn("h-4 w-4 text-primary", syncRegistrationCatalogMutation.isPending && "animate-spin")} />
              <span className="text-[11px] font-bold uppercase tracking-tight">{syncRegistrationCatalogMutation.isPending ? "جاري..." : "مزامنة السجل"}</span>
            </Button>
            <Button type="button" size="sm" className="selrs-gradient-btn gap-2 text-white h-9 px-4 rounded-lg shadow-sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              <span className="text-xs sm:text-sm font-bold">إضافة طبيب</span>
            </Button>
          </div>
        }
      />

      <div className={cn(STAT_CARDS_MOBILE_ROW, "gap-2 sm:grid sm:grid-cols-3 sm:gap-4")}>
        <StatCard
          title="إجمالي السجلات"
          value={doctorsTotal}
          icon={Activity}
          iconColor="bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
        />
        <StatCard
          title="نشط"
          value={doctorsActive}
          icon={CheckCircle2}
          iconColor="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
        />
        <StatCard
          title="معطّل"
          value={doctorsInactive}
          icon={XCircle}
          iconColor="bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400"
        />
      </div>

      <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <CardContent className="space-y-4 p-4 sm:p-5 lg:p-6 bg-muted/5">
          <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
            <div className="w-full lg:max-w-md">
              <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="بحث عن طبيب أو كود..." />
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <Button type="button" variant="secondary" className="h-9 px-5 font-bold text-xs" onClick={() => void saveDoctors()} disabled={updateDoctorsMutation.isPending}>
                حفظ التغييرات
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
                  await importDoctorsCsv(file);
                }}
              />
              <Button type="button" variant="outline" className="h-9 text-xs border-border/60" disabled={isImporting} onClick={() => fileInputRef.current?.click()}>
                استيراد CSV
              </Button>
              {confirmClearAll ? (
                <div className="flex items-center gap-1">
                  <button type="button" aria-label="تأكيد"
                    className="rounded bg-destructive px-2 py-1 text-xs font-medium text-white hover:bg-destructive/80"
                    onClick={() => { setDoctors([]); setConfirmClearAll(false); }}>
                    تأكيد
                  </button>
                  <button type="button" aria-label="إلغاء"
                    className="rounded bg-muted px-2 py-1 text-xs font-medium text-foreground hover:bg-border"
                    onClick={() => setConfirmClearAll(false)}>
                    إلغاء
                  </button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 border-dashed text-destructive hover:bg-destructive/10 hover:text-destructive text-[11px] font-bold"
                  disabled={doctors.length === 0}
                  onClick={() => setConfirmClearAll(true)}
                >
                  مسح الكل
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-hidden">
            <Table className="min-w-[900px] text-right" dir="rtl">
              <TableHeader className="sticky top-0 z-10 bg-sky-50/90 backdrop-blur-sm shadow-sm">
                <TableRow className="hover:bg-transparent border-b-primary/10 h-12">
                  <TableHead className="text-right font-bold text-sky-900">الطبيب والتخصص</TableHead>
                  <TableHead className="text-right font-bold text-sky-900">الكود</TableHead>
                  <TableHead className="text-right font-bold text-sky-900">النوع</TableHead>
                  <TableHead className="text-right font-bold text-sky-900">المقر</TableHead>
                  <TableHead className="text-right font-bold text-sky-900">الحالة</TableHead>
                  <TableHead className="w-[120px] text-center font-bold text-sky-900">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doctorsQuery.isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-20 text-center text-muted-foreground animate-pulse">
                      جاري تحميل بيانات الأطباء…
                    </TableCell>
                  </TableRow>
                )}
                {!doctorsQuery.isLoading && filteredDoctors.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-20 text-center text-muted-foreground bg-muted/20">
                      لا توجد نتائج مطابقة لبحثك.
                    </TableCell>
                  </TableRow>
                )}
                {filteredDoctors.map((doctor, idx) => {
                  const initials = doctorArabicInitials(doctor.name);
                  return (
                    <Fragment key={doctor.id}>
                      <TableRow className={cn(
                        "group transition-colors hover:bg-primary/[0.03]",
                        idx % 2 === 0 ? "bg-background" : "bg-muted/10",
                        !doctor.isActive && "opacity-60 bg-muted/5 grayscale-[0.3]"
                      )}>
                        <TableCell className="align-middle py-3">
                          <div className="flex items-center justify-end gap-3">
                            <div className="min-w-0 text-right">
                              <div className="font-bold text-sm leading-tight text-foreground/90 group-hover:text-primary transition-colors">
                                {doctor.name}
                              </div>
                              <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground font-medium">
                                <span>{doctorTypeLabel(doctor.doctorType)}</span>
                              </div>
                            </div>
                            <Avatar className="h-9 w-9 shrink-0 border border-border/60 bg-primary/10 text-[11px] font-black text-primary shadow-inner">
                              <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
                            </Avatar>
                          </div>
                        </TableCell>
                        <TableCell className="align-middle whitespace-nowrap text-[11px] font-mono font-medium text-muted-foreground tabular-nums py-3">
                          {doctor.code}
                        </TableCell>
                        <TableCell className="align-middle whitespace-nowrap py-3">
                          <Badge className={cn("font-bold text-[10px] px-2 py-0.5 shadow-none border-0", doctorTypeBadgeClass(doctor.doctorType))}>
                            {doctorTypeLabel(doctor.doctorType)}
                          </Badge>
                        </TableCell>
                        <TableCell className="align-middle whitespace-nowrap text-[11px] font-semibold text-muted-foreground py-3">
                          {locationLabel(doctor.locationType)}
                        </TableCell>
                        <TableCell className="align-middle whitespace-nowrap py-3">
                          <div className="flex items-center justify-end gap-2">
                            <span className={cn("text-[10px] font-bold", doctor.isActive ? "text-emerald-600" : "text-muted-foreground")}>
                              {doctor.isActive ? "نشط" : "معطل"}
                            </span>
                            <Checkbox
                              className="h-3.5 w-3.5"
                              checked={doctor.isActive}
                              onCheckedChange={(checked) =>
                                setDoctors((prev) =>
                                  prev.map((d) => (d.id === doctor.id ? { ...d, isActive: Boolean(checked) } : d)),
                                )
                              }
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-center align-middle py-3">
                          <div className="flex justify-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary"
                              onClick={() => setExpandedId((id) => (id === doctor.id ? null : doctor.id))}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            {delConfirmDoctor === doctor.id ? (
                              <div className="flex items-center gap-1">
                                <button type="button" aria-label="تأكيد الحذف"
                                  className="rounded bg-destructive px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-destructive/80"
                                  onClick={() => { removeDoctor(doctor.id); setDelConfirmDoctor(null); }}>
                                  تأكيد
                                </button>
                                <button type="button" aria-label="إلغاء الحذف"
                                  className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground hover:bg-border"
                                  onClick={() => setDelConfirmDoctor(null)}>
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button type="button" aria-label="حذف الطبيب"
                                className="inline-flex h-9 w-9 items-center justify-center rounded text-destructive opacity-40 hover:opacity-100 hover:bg-destructive/10 transition-colors"
                                onClick={() => setDelConfirmDoctor(doctor.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedId === doctor.id && (
                        <TableRow key={`${doctor.id}-edit`} className="bg-primary/[0.02] border-b shadow-inner">
                          <TableCell colSpan={6} className="py-4 px-12">
                            <div className="rounded-xl border border-primary/20 bg-background p-5 shadow-lg space-y-4">
                              <div className="flex items-center gap-2 mb-2">
                                <Settings className="h-4 w-4 text-primary" />
                                <span className="text-xs font-bold text-primary">تعديل بيانات الطبيب</span>
                              </div>
                              <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 items-end">
                                <div className="space-y-1.5">
                                  <span className="text-[11px] font-bold text-muted-foreground/70 block px-1">الكود</span>
                                  <Input
                                    value={doctor.code}
                                    dir="ltr"
                                    className="h-9 text-xs font-mono bg-muted/20"
                                    onChange={(e) =>
                                      setDoctors((prev) =>
                                        prev.map((d) => (d.id === doctor.id ? { ...d, code: e.target.value } : d)),
                                      )
                                    }
                                  />
                                </div>
                                <div className="space-y-1.5 sm:col-span-1">
                                  <span className="text-[11px] font-bold text-muted-foreground/70 block px-1">الاسم</span>
                                  <Input
                                    value={doctor.name}
                                    className="h-9 text-sm font-medium"
                                    onChange={(e) =>
                                      setDoctors((prev) =>
                                        prev.map((d) => (d.id === doctor.id ? { ...d, name: e.target.value } : d)),
                                      )
                                    }
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <span className="text-[11px] font-bold text-muted-foreground/70 block px-1">المقر</span>
                                  <Select
                                    value={doctor.locationType}
                                    onValueChange={(value) =>
                                      setDoctors((prev) =>
                                        prev.map((d) =>
                                          d.id === doctor.id ? { ...d, locationType: value as "center" | "external" } : d,
                                        ),
                                      )
                                    }
                                  >
                                    <SelectTrigger className="h-9 bg-background text-xs border-primary/10">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="center" className="text-xs">المركز</SelectItem>
                                      <SelectItem value="external" className="text-xs">خارجي</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1.5">
                                  <span className="text-[11px] font-bold text-muted-foreground/70 block px-1">النوع</span>
                                  <Select
                                    value={doctor.doctorType}
                                    onValueChange={(value) =>
                                      setDoctors((prev) =>
                                        prev.map((d) =>
                                          d.id === doctor.id
                                            ? { ...d, doctorType: value as "consultant" | "specialist" | "external" }
                                            : d,
                                        ),
                                      )
                                    }
                                  >
                                    <SelectTrigger className="h-9 bg-background text-xs border-primary/10">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="consultant" className="text-xs">استشاري</SelectItem>
                                      <SelectItem value="specialist" className="text-xs">أخصائي</SelectItem>
                                      <SelectItem value="external" className="text-xs">طبيب خارجي</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="flex justify-end gap-2 pt-2 border-t border-dashed mt-2">
                                <Button variant="ghost" size="sm" className="h-8 text-[11px] font-bold text-muted-foreground" onClick={() => setExpandedId(null)}>إلغاء</Button>
                                <Button size="sm" className="h-8 text-[11px] font-bold bg-primary text-white shadow-sm" onClick={() => setExpandedId(null)}>تم التعديل محلياً</Button>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open)
            setNewDoctor({ code: "", name: "", locationType: "center", doctorType: "consultant" });
        }}
      >
        <DialogContent className="max-w-lg text-right sm:max-w-xl p-0 overflow-hidden border-none shadow-2xl" dir="rtl">
          <DialogHeader className="p-5 border-b bg-muted/10">
            <DialogTitle className="text-lg font-bold">إضافة طبيب جديد</DialogTitle>
          </DialogHeader>
          <div className="p-6 bg-background space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2">
              {formFieldsUi(newDoctor, setNewDoctor, "add")}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed italic bg-muted/20 p-2 rounded-lg border border-dashed">
              * ملاحظة: بعد الإضافة إلى القائمة المحلية، يجب الضغط على «حفظ التغييرات» في الصفحة الرئيسية لمزامنة البيانات مع السيرفر بشكل دائم.
            </p>
          </div>
          <DialogFooter className="p-4 bg-muted/5 border-t flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:items-center">
            <Button type="button" variant="ghost" className="h-9 text-xs font-bold" onClick={() => setAddOpen(false)}>
              إلغاء
            </Button>
            <Button type="button" className="selrs-gradient-btn text-white gap-2 h-9 px-6 rounded-lg font-bold" onClick={addDoctor}>
              <Plus className="h-4 w-4" />
              إدراج في القائمة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
