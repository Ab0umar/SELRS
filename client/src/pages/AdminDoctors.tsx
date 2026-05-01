import { type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Activity, CheckCircle2, MoreVertical, Plus, Stethoscope, Trash2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
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
    return "bg-amber-100 text-amber-900 dark:bg-amber-950/55 dark:text-amber-100 border-0 font-semibold";
  if (t === "external")
    return "bg-muted text-muted-foreground border border-border font-semibold";
  return "bg-sky-100 text-sky-900 dark:bg-sky-950/55 dark:text-sky-50 border-0 font-semibold";
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const doctorsQuery = trpc.medical.getDoctorDirectory.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const updateDoctorsMutation = trpc.medical.updateDoctorDirectory.useMutation();

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
    if (!window.confirm("حذف هذا الطبيب من القائمة؟")) return;
    setDoctors((prev) => prev.filter((d) => d.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const formFieldsUi = (
    draft: NewDoctorDraft,
    setDraft: Dispatch<SetStateAction<NewDoctorDraft>>,
    idPrefix: string,
  ) => (
    <>
      <div className="space-y-2 sm:col-span-2 lg:col-span-1">
        <label htmlFor={`${idPrefix}-code`} className="text-xs font-semibold text-muted-foreground">
          الكود (اختياري)
        </label>
        <Input
          id={`${idPrefix}-code`}
          placeholder="يُولَّد تلقائياً إن تركت فارغاً"
          value={draft.code}
          onChange={(e) => setDraft((prev) => ({ ...prev, code: e.target.value }))}
          dir="ltr"
        />
      </div>
      <div className="space-y-2 sm:col-span-2 lg:col-span-2">
        <label htmlFor={`${idPrefix}-name`} className="text-xs font-semibold text-muted-foreground">
          اسم الطبيب
        </label>
        <Input
          id={`${idPrefix}-name`}
          placeholder="الاسم الظاهر في النظام"
          value={draft.name}
          onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
        />
      </div>
      <div className="space-y-2 sm:col-span-2 lg:col-span-1">
        <span className="text-xs font-semibold text-muted-foreground">المقر</span>
        <Select
          value={draft.locationType}
          onValueChange={(value) =>
            setDraft((prev) => ({ ...prev, locationType: value as "center" | "external" }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="center">المركز</SelectItem>
            <SelectItem value="external">خارجي</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2 sm:col-span-2 lg:col-span-1">
        <span className="text-xs font-semibold text-muted-foreground">النوع</span>
        <Select
          value={draft.doctorType}
          onValueChange={(value) =>
            setDraft((prev) => ({
              ...prev,
              doctorType: value as "consultant" | "specialist" | "external",
            }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="consultant">استشاري</SelectItem>
            <SelectItem value="specialist">أخصائي</SelectItem>
            <SelectItem value="external">طبيب خارجي</SelectItem>
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
        icon={<Stethoscope className="h-5 w-5" />}
        action={
          <Button type="button" size="sm" className="selrs-gradient-btn gap-2 text-white" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            <span className="text-xs sm:text-sm">إضافة طبيب</span>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
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
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
            <div className="w-full lg:max-w-md">
              <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="بحث عن طبيب أو كود..." />
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <Button type="button" onClick={() => void saveDoctors()} disabled={updateDoctorsMutation.isPending}>
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
              <Button type="button" variant="outline" disabled={isImporting} onClick={() => fileInputRef.current?.click()}>
                استيراد CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-dashed text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  if (
                    doctors.length === 0 ||
                    window.confirm("مسح كل الأطباء من القائمة المحلية؟ (لن يُحدَّث الخادم حتى تحفظ قائمة فارغة.)")
                  ) {
                    setDoctors([]);
                  }
                }}
              >
                مسح الكل
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {doctorsQuery.isLoading ? (
        <div className="rounded-xl border border-dashed bg-muted/20 py-14 text-center text-sm text-muted-foreground">
          جاري التحميل…
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 py-14 text-center text-sm text-muted-foreground">
          لا توجد نتائج مطابقة.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredDoctors.map((doctor) => (
            <Card
              key={doctor.id}
              className={cn(
                "overflow-hidden rounded-xl border border-border/90 bg-card shadow-sm transition-shadow hover:shadow-md",
                !doctor.isActive && "border-dashed bg-muted/25 opacity-90",
              )}
              dir="rtl"
            >
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <Avatar className="h-12 w-12 shrink-0 border border-border/60 bg-primary/10 text-sm font-black text-primary">
                      <AvatarFallback className="bg-primary/10 text-primary">{doctorArabicInitials(doctor.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <CardTitle className="truncate text-base font-black leading-snug">{doctor.name}</CardTitle>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Badge className={cn("text-[11px]", doctorTypeBadgeClass(doctor.doctorType))}>
                          {doctorTypeLabel(doctor.doctorType)}
                        </Badge>
                        {!doctor.isActive ? (
                          <Badge variant="outline" className="border-red-400/60 text-[11px] font-semibold text-red-700">
                            غير فعال
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-emerald-500/50 text-[11px] font-semibold text-emerald-800">
                            فعّال
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {locationLabel(doctor.locationType)}
                        <span className="mx-1 opacity-60">·</span>
                        <span dir="ltr" className="tabular-nums">
                          {doctor.code}
                        </span>
                      </p>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" title="مزيد">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[10rem]">
                      <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => setExpandedId((id) => (id === doctor.id ? null : doctor.id))}>
                        {expandedId === doctor.id ? "إخفاء التحرير" : "تحرير الحقول"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                        onClick={() => removeDoctor(doctor.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        حذف من القائمة
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold">
                    <Checkbox
                      checked={doctor.isActive}
                      onCheckedChange={(checked) =>
                        setDoctors((prev) =>
                          prev.map((d) => (d.id === doctor.id ? { ...d, isActive: Boolean(checked) } : d)),
                        )
                      }
                    />
                    نشط في النظام
                  </label>
                </div>

                {expandedId === doctor.id && (
                  <div className="space-y-3 rounded-lg border border-border/80 bg-muted/15 p-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                        <span className="text-xs font-semibold text-muted-foreground">الكود</span>
                        <Input
                          value={doctor.code}
                          dir="ltr"
                          onChange={(e) =>
                            setDoctors((prev) =>
                              prev.map((d) => (d.id === doctor.id ? { ...d, code: e.target.value } : d)),
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                        <span className="text-xs font-semibold text-muted-foreground">الاسم</span>
                        <Input
                          value={doctor.name}
                          onChange={(e) =>
                            setDoctors((prev) =>
                              prev.map((d) => (d.id === doctor.id ? { ...d, name: e.target.value } : d)),
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <span className="text-xs font-semibold text-muted-foreground">المقر</span>
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
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="center">المركز</SelectItem>
                            <SelectItem value="external">خارجي</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <span className="text-xs font-semibold text-muted-foreground">النوع</span>
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
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="consultant">استشاري</SelectItem>
                            <SelectItem value="specialist">أخصائي</SelectItem>
                            <SelectItem value="external">خارجي</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open)
            setNewDoctor({ code: "", name: "", locationType: "center", doctorType: "consultant" });
        }}
      >
        <DialogContent className="max-w-lg text-right sm:max-w-xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة طبيب</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {formFieldsUi(newDoctor, setNewDoctor, "add")}
          </div>
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              إلغاء
            </Button>
            <Button type="button" className="selrs-gradient-btn gap-2 text-white" onClick={addDoctor}>
              <Plus className="h-4 w-4" />
              إدراج في القائمة
            </Button>
          </DialogFooter>
          <p className="text-xs text-muted-foreground">بعد الإضافة استخدم «حفظ التغييرات» في الصفحة لتطبيقها على الخادم.</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
