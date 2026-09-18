import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  CheckCircle2,
  Edit2,
  MoreVertical,
  Plus,
  RefreshCw,
  Stethoscope,
  Trash2,
  XCircle,
} from "lucide-react";
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
    const code = String(doctor.code || "")
      .trim()
      .toUpperCase();
    const match = code.match(/(\d+)$/);
    if (!match) continue;
    const n = Number(match[1]);
    if (Number.isFinite(n) && n > maxNum) maxNum = n;
  }
  const next = String(maxNum + 1).padStart(3, "0");
  return `DR${next}`;
};

const doctorCodeSortValue = (code: string) => {
  const raw = String(code ?? "")
    .trim()
    .toUpperCase();
  const match = raw.match(/(\d+)$/);
  const num = match ? Number(match[1]) : Number.NaN;
  return Number.isFinite(num) ? num : Number.MAX_SAFE_INTEGER;
};

function doctorArabicInitials(fullName: string) {
  const n = fullName
    .trim()
    .replace(/^د\.?\s*/u, "")
    .replace(/^dr\.?\s*/i, "");
  const words = n.split(/\s+/).filter(Boolean);
  if (words.length >= 2)
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  return words[0]?.slice(0, 2).toUpperCase() || "DR";
}

function doctorTypeLabel(t: DoctorEntry["doctorType"]) {
  if (t === "specialist") return "أخصائي";
  if (t === "external") return "خارجي";
  return "استشاري";
}

function doctorTypeBadgeClass(t: DoctorEntry["doctorType"]) {
  if (t === "specialist")
    return "bg-warning/10 text-warning/90 border-0 font-bold";
  if (t === "external")
    return "bg-muted text-muted-foreground border-0 font-bold";
  return "bg-primary/10 text-primary border-0 font-bold";
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
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
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
  const updateDoctorsMutation =
    trpc.medical.updateDoctorDirectory.useMutation();
  const syncRegistrationCatalogMutation =
    trpc.medical.syncRegistrationCatalogFromMssql.useMutation({
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
    const normalized: DoctorEntry[] = (doctorsQuery.data as DoctorEntry[]).map(
      (doctor) => ({
        ...doctor,
        locationType:
          doctor.locationType === "external" ? "external" : "center",
        doctorType:
          doctor.doctorType === "specialist"
            ? "specialist"
            : doctor.doctorType === "external"
              ? "external"
              : "consultant",
      }),
    );
    setDoctors(normalized);
  }, [doctorsQuery.data]);

  if (!isAuthenticated || user?.role !== "admin") return null;

  const sortedDoctors = useMemo(
    () =>
      [...doctors].sort((a, b) => {
        const an = doctorCodeSortValue(a.code);
        const bn = doctorCodeSortValue(b.code);
        if (an !== bn) return an - bn;
        return String(a.code ?? "").localeCompare(String(b.code ?? ""), "en", {
          numeric: true,
        });
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
  const selectedDoctor =
    filteredDoctors.find((doctor) => doctor.id === selectedDoctorId) ??
    filteredDoctors[0] ??
    null;

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
    setNewDoctor({
      code: "",
      name: "",
      locationType: "center",
      doctorType: "consultant",
    });
    setAddOpen(false);
    toast.success(
      "تمت إضافة الطبيب إلى القائمة — اضغط «حفظ التغييرات» لمزامنة الخادم.",
    );
  };

  const parseCsvLine = (line: string) => {
    const out: string[] = [];
    let current = "";
    let quote: '"' | "'" | null = null;
    const sep: "," | ";" | "\t" = line.includes(";")
      ? ";"
      : line.includes("\t")
        ? "\t"
        : ",";
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
        const typeRaw = String(parts[2] ?? "")
          .trim()
          .toLowerCase();
        const doctorType: "consultant" | "specialist" | "external" =
          typeRaw === "specialist" ||
          typeRaw === "اخصائي" ||
          typeRaw === "أخصائي"
            ? "specialist"
            : typeRaw === "external" ||
                typeRaw === "خارجي" ||
                typeRaw === "outside" ||
                typeRaw === "out"
              ? "external"
              : "consultant";
        if (!code || !name) continue;
        if (
          /^(code|doctor[_\s-]*code)$/i.test(code) &&
          /^(name|doctor[_\s-]*name)$/i.test(name)
        )
          continue;
        const exists = next.some(
          (d) =>
            d.code.trim().toLowerCase() === code.toLowerCase() ||
            d.name.trim().toLowerCase() === name.toLowerCase(),
        );
        if (exists) continue;
        next.push({
          id: makeId(),
          code,
          name,
          isActive: true,
          locationType: "center",
          doctorType,
        });
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
        locationType:
          doctor.locationType === "external" ? "external" : "center",
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
    if (selectedDoctorId === id) setSelectedDoctorId(null);
  };

  const updateDoctor = (id: string, patch: Partial<DoctorEntry>) => {
    setDoctors((prev) =>
      prev.map((doctor) =>
        doctor.id === id ? { ...doctor, ...patch } : doctor,
      ),
    );
  };

  const formFieldsUi = (
    draft: NewDoctorDraft,
    setDraft: Dispatch<SetStateAction<NewDoctorDraft>>,
    idPrefix: string,
  ) => (
    <>
      <div className="space-y-1.5">
        <label
          htmlFor={`${idPrefix}-code`}
          className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider"
        >
          الكود (اختياري)
        </label>
        <Input
          id={`${idPrefix}-code`}
          placeholder="تلقائي"
          value={draft.code}
          onChange={(e) =>
            setDraft((prev) => ({ ...prev, code: e.target.value }))
          }
          dir="ltr"
          className="h-9 text-xs font-mono"
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <label
          htmlFor={`${idPrefix}-name`}
          className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider"
        >
          اسم الطبيب
        </label>
        <Input
          id={`${idPrefix}-name`}
          placeholder="الاسم الكامل…"
          value={draft.name}
          onChange={(e) =>
            setDraft((prev) => ({ ...prev, name: e.target.value }))
          }
          className="h-9 text-sm font-medium"
        />
      </div>
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
          المقر
        </span>
        <Select
          value={draft.locationType}
          onValueChange={(value) =>
            setDraft((prev) => ({
              ...prev,
              locationType: value as "center" | "external",
            }))
          }
        >
          <SelectTrigger className="h-9 text-xs bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="center" className="text-xs">
              المركز
            </SelectItem>
            <SelectItem value="external" className="text-xs">
              خارجي
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
          النوع
        </span>
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
            <SelectItem value="consultant" className="text-xs">
              استشاري
            </SelectItem>
            <SelectItem value="specialist" className="text-xs">
              أخصائي
            </SelectItem>
            <SelectItem value="external" className="text-xs">
              طبيب خارجي
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );

  return (
    <div
      className="mx-auto w-full max-w-[1440px] space-y-5 pb-4 text-right"
      dir="rtl"
    >
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
              <RefreshCw
                className={cn(
                  "h-4 w-4 text-primary",
                  syncRegistrationCatalogMutation.isPending && "animate-spin",
                )}
              />
              <span className="text-[11px] font-bold uppercase tracking-tight">
                {syncRegistrationCatalogMutation.isPending
                  ? "جاري…"
                  : "مزامنة السجل"}
              </span>
            </Button>
            <Button
              type="button"
              size="sm"
              className="selrs-gradient-btn gap-2 text-primary-foreground h-9 px-4 rounded-lg shadow-sm"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="h-4 w-4" />
              <span className="text-xs sm:text-sm font-bold">إضافة طبيب</span>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-card px-4 py-3.5 shadow-[var(--bento-shadow-soft)]">
          <p className="text-xs font-medium text-muted-foreground">الإجمالي</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
            {doctorsTotal}
          </p>
        </div>
        <div className="rounded-2xl border border-success/20 bg-success/5 px-4 py-3.5">
          <p className="flex items-center gap-1.5 text-xs font-medium text-success">
            <span className="size-1.5 rounded-full bg-success" /> نشط
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
            {doctorsActive}
          </p>
        </div>
        <div className="rounded-2xl border border-destructive/15 bg-destructive/5 px-4 py-3.5">
          <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
            <span className="size-1.5 rounded-full bg-destructive" /> معطّل
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
            {doctorsInactive}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[var(--bento-shadow-soft)]">
        <div className="flex flex-col gap-3 border-b border-border/60 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full lg:max-w-sm">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="بحث عن طبيب أو كود…"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-9 gap-2 text-xs"
              onClick={() => void saveDoctors()}
              disabled={updateDoctorsMutation.isPending}
            >
              {updateDoctorsMutation.isPending ? "جاري الحفظ…" : "حفظ التغييرات"}
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
            <Button
              type="button"
              variant="outline"
              className="h-9 text-xs"
              disabled={isImporting}
              onClick={() => fileInputRef.current?.click()}
            >
              استيراد CSV
            </Button>
            {confirmClearAll ? (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setDoctors([]);
                    setConfirmClearAll(false);
                  }}
                >
                  تأكيد المسح
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmClearAll(false)}
                >
                  إلغاء
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 text-destructive hover:bg-destructive/10"
                disabled={doctors.length === 0}
                onClick={() => setConfirmClearAll(true)}
              >
                مسح الكل
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-[860px] text-right" dir="rtl">
            <TableHeader>
              <TableRow className="border-b-border/60 hover:bg-transparent">
                <TableHead className="h-11 text-right font-semibold text-muted-foreground">
                  الطبيب
                </TableHead>
                <TableHead className="h-11 text-right font-semibold text-muted-foreground">
                  الكود
                </TableHead>
                <TableHead className="h-11 text-right font-semibold text-muted-foreground">
                  النوع
                </TableHead>
                <TableHead className="h-11 text-right font-semibold text-muted-foreground">
                  المقر
                </TableHead>
                <TableHead className="h-11 text-center font-semibold text-muted-foreground">
                  الحالة
                </TableHead>
                <TableHead className="h-11 w-14" />
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/50">
              {doctorsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center">
                    <div className="mx-auto max-w-sm space-y-2">
                      {[0, 1, 2, 3].map((row) => (
                        <div
                          key={row}
                          className="h-8 animate-pulse rounded-md bg-muted"
                        />
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}
              {!doctorsQuery.isLoading && filteredDoctors.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-16 text-center text-sm text-muted-foreground"
                  >
                    لا توجد نتائج مطابقة لبحثك.
                  </TableCell>
                </TableRow>
              ) : null}
              {filteredDoctors.map((doctor) => (
                <TableRow
                  key={doctor.id}
                  onClick={() => setSelectedDoctorId(doctor.id)}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-primary/5",
                    !doctor.isActive && "opacity-60",
                  )}
                >
                  <TableCell className="py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9 shrink-0 border border-border/60">
                        <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                          {doctorArabicInitials(doctor.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {doctor.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                    {doctor.code}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        "border-0 text-[10px] font-bold",
                        doctorTypeBadgeClass(doctor.doctorType),
                      )}
                    >
                      {doctorTypeLabel(doctor.doctorType)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {locationLabel(doctor.locationType)}
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                        doctor.isActive
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          doctor.isActive
                            ? "bg-success"
                            : "bg-muted-foreground/50",
                        )}
                      />
                      {doctor.isActive ? "نشط" : "معطّل"}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0"
                      aria-label={`تعديل ${doctor.name}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedDoctorId(doctor.id);
                      }}
                    >
                      <Edit2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Sheet
        open={!!selectedDoctor}
        onOpenChange={(open) => {
          if (!open) setSelectedDoctorId(null);
        }}
      >
        <SheetContent
          side="left"
          className="w-full overflow-y-auto p-0 sm:max-w-lg"
        >
          {selectedDoctor ? (
            <>
              <SheetHeader className="space-y-3 border-b border-border/60 px-6 pb-5 pt-6 text-right">
                <div className="flex items-center gap-3">
                  <Avatar className="size-12 border border-border/60">
                    <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
                      {doctorArabicInitials(selectedDoctor.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <SheetTitle className="truncate text-lg font-bold">
                      {selectedDoctor.name}
                    </SheetTitle>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {selectedDoctor.code}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={cn(
                      "border-0 text-[10px] font-bold",
                      doctorTypeBadgeClass(selectedDoctor.doctorType),
                    )}
                  >
                    {doctorTypeLabel(selectedDoctor.doctorType)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {locationLabel(selectedDoctor.locationType)}
                  </span>
                </div>
              </SheetHeader>

              <div className="space-y-6 px-6 py-6">
                <section className="space-y-4">
                  <h3 className="text-sm font-bold">بيانات الطبيب</h3>
                  <div className="space-y-1.5">
                    <Label htmlFor="sheet-doctor-name">اسم الطبيب</Label>
                    <Input
                      id="sheet-doctor-name"
                      value={selectedDoctor.name}
                      onChange={(event) =>
                        updateDoctor(selectedDoctor.id, {
                          name: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sheet-doctor-code">الكود</Label>
                    <Input
                      id="sheet-doctor-code"
                      dir="ltr"
                      className="font-mono"
                      value={selectedDoctor.code}
                      onChange={(event) =>
                        updateDoctor(selectedDoctor.id, {
                          code: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>النوع</Label>
                      <Select
                        value={selectedDoctor.doctorType}
                        onValueChange={(value) =>
                          updateDoctor(selectedDoctor.id, {
                            doctorType: value as DoctorEntry["doctorType"],
                          })
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
                    <div className="space-y-1.5">
                      <Label>المقر</Label>
                      <Select
                        value={selectedDoctor.locationType}
                        onValueChange={(value) =>
                          updateDoctor(selectedDoctor.id, {
                            locationType: value as DoctorEntry["locationType"],
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="center">المركز</SelectItem>
                          <SelectItem value="external">خارج المركز</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 pt-1 text-sm font-medium">
                    <Checkbox
                      checked={selectedDoctor.isActive}
                      onCheckedChange={(checked) =>
                        updateDoctor(selectedDoctor.id, {
                          isActive: Boolean(checked),
                        })
                      }
                    />
                    {selectedDoctor.isActive ? "الحساب نشط" : "الحساب معطّل"}
                  </label>
                </section>

                <section className="space-y-3 border-t border-border/60 pt-5">
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => void saveDoctors()}
                    disabled={updateDoctorsMutation.isPending}
                  >
                    {updateDoctorsMutation.isPending
                      ? "جاري الحفظ…"
                      : "حفظ التغييرات"}
                  </Button>
                  <p className="text-xs leading-5 text-muted-foreground">
                    الحفظ يزامن كامل الدليل — الحذف يُطبق بعد الحفظ.
                  </p>
                  {delConfirmDoctor === selectedDoctor.id ? (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                      <p className="text-sm font-bold text-destructive">
                        حذف {selectedDoctor.name}؟
                      </p>
                      <div className="mt-3 flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            removeDoctor(selectedDoctor.id);
                            setDelConfirmDoctor(null);
                          }}
                        >
                          تأكيد الحذف
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setDelConfirmDoctor(null)}
                        >
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2 text-destructive hover:bg-destructive/10"
                      onClick={() => setDelConfirmDoctor(selectedDoctor.id)}
                    >
                      <Trash2 className="size-4" />
                      حذف الطبيب
                    </Button>
                  )}
                </section>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open)
            setNewDoctor({
              code: "",
              name: "",
              locationType: "center",
              doctorType: "consultant",
            });
        }}
      >
        <DialogContent
          className="max-w-lg text-right sm:max-w-xl p-0 overflow-hidden border-none shadow-2xl"
          dir="rtl"
        >
          <DialogHeader className="p-5 border-b bg-muted/10">
            <DialogTitle className="text-lg font-bold">
              إضافة طبيب جديد
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 bg-background space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2">
              {formFieldsUi(newDoctor, setNewDoctor, "add")}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed italic bg-muted/20 p-2 rounded-lg border border-dashed">
              * ملاحظة: بعد الإضافة إلى القائمة المحلية، يجب الضغط على «حفظ
              التغييرات» في الصفحة الرئيسية لمزامنة البيانات مع السيرفر بشكل
              دائم.
            </p>
          </div>
          <DialogFooter className="p-4 bg-muted/5 border-t flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:items-center">
            <Button
              type="button"
              variant="ghost"
              className="h-9 text-xs font-bold"
              onClick={() => setAddOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              className="selrs-gradient-btn text-primary-foreground gap-2 h-9 px-6 rounded-lg font-bold"
              onClick={addDoctor}
            >
              <Plus className="h-4 w-4" />
              إدراج في القائمة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
