import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Filter, FolderPlus, Plus, RotateCcw, Save, Search, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type Eye = "OD" | "OS" | "either" | "both";
type RangeCriterion = {
  id: string;
  kind: "refraction" | "pentacam";
  metric: "sphere" | "cylinder" | "axis" | "k1" | "k2" | "thickness";
  eye: Eye;
  min?: number;
  max?: number;
};
type TextCriterion = {
  id: string;
  kind: "diagnosis";
  field: "diagnosis" | "diseases" | "symptoms" | "any";
  text: string;
};
type OperationCriterion = { id: string; kind: "operation"; text: string };
type Criterion = RangeCriterion | TextCriterion | OperationCriterion;
type SavedReference = { id: string; name: string; mode: "and" | "or"; criteria: Criterion[] };
type QueryCriterion =
  | { kind: "refraction"; metric: "sphere" | "cylinder" | "axis"; eye: Eye; range: { min?: number; max?: number } }
  | { kind: "pentacam"; metric: "k1" | "k2" | "thickness"; eye: Eye; range: { min?: number; max?: number } }
  | { kind: "diagnosis"; field: TextCriterion["field"]; text: string }
  | { kind: "operation"; text: string };
type MedicalReferenceRow = {
  id: number; patientCode: string; fullName: string; lastVisit: Date | string | null;
  sphereOD: string | null; cylinderOD: string | null; axisOD: string | null;
  sphereOS: string | null; cylinderOS: string | null; axisOS: string | null;
  k1OD: string | null; k2OD: string | null; thicknessOD: string | null;
  k1OS: string | null; k2OS: string | null; thicknessOS: string | null;
  diagnosis: string | null; operationType: string | null;
};

const STORAGE_KEY = "selrs_medical_reference_filters_v1";
const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const defaultCriterion = (): Criterion => ({
  id: newId(), kind: "refraction", metric: "sphere", eye: "either", min: undefined, max: -0.25,
});

const kindLabels = { refraction: "الانكسار", pentacam: "Pentacam", diagnosis: "التشخيص والأعراض", operation: "نوع العملية" };
const eyeLabels = { OD: "اليمنى OD", OS: "اليسرى OS", either: "أي عين", both: "العينان" };
const metricLabels: Record<string, string> = {
  sphere: "Sphere", cylinder: "Cylinder", axis: "Axis", k1: "K1", k2: "K2", thickness: "Thickness",
};

function formatResultDate(value: Date | string | null): string {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) return String(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function readSaved(): SavedReference[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as SavedReference[]; } catch { return []; }
}

export default function MedicalReference() {
  const [mode, setMode] = useState<"and" | "or">("and");
  const [search, setSearch] = useState("");
  const [criteria, setCriteria] = useState<Criterion[]>([defaultCriterion()]);
  const [saved, setSaved] = useState<SavedReference[]>(readSaved);
  const [saveName, setSaveName] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [mode, search, criteria]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); }, [saved]);

  const validCriteria = useMemo<QueryCriterion[]>(() => {
    const result: QueryCriterion[] = [];
    for (const criterion of criteria) {
      if (criterion.kind === "diagnosis") {
        if (criterion.text.trim()) result.push({ kind: "diagnosis", field: criterion.field, text: criterion.text.trim() });
      } else if (criterion.kind === "operation") {
        if (criterion.text.trim()) result.push({ kind: "operation", text: criterion.text.trim() });
      } else if (criterion.min != null || criterion.max != null) {
        result.push({ kind: criterion.kind, metric: criterion.metric as never, eye: criterion.eye, range: { min: criterion.min, max: criterion.max } } as QueryCriterion);
      }
    }
    return result;
  }, [criteria]);

  const query = trpc.medical.searchMedicalReference.useQuery({
    mode, search, criteria: validCriteria, page, pageSize: 25,
  }, {
    staleTime: 0,
    refetchOnMount: "always",
  });

  const update = (id: string, patch: Partial<Criterion>) =>
    setCriteria((current) => current.map((item) => item.id === id ? ({ ...item, ...patch } as Criterion) : item));

  const changeKind = (id: string, kind: Criterion["kind"]) => {
    const replacement: Criterion = kind === "refraction"
      ? { id, kind, metric: "sphere", eye: "either" }
      : kind === "pentacam"
        ? { id, kind, metric: "k1", eye: "either" }
        : kind === "diagnosis"
          ? { id, kind, field: "any", text: "" }
          : { id, kind, text: "" };
    setCriteria((current) => current.map((item) => item.id === id ? replacement : item));
  };

  const saveCurrent = () => {
    const name = saveName.trim();
    if (!name) return toast.error("اكتب اسم التصنيف الطبي");
    setSaved((current) => [{ id: newId(), name, mode, criteria }, ...current]);
    setSaveName("");
    toast.success("تم حفظ التصنيف");
  };

  const totalPages = Math.max(1, Math.ceil((query.data?.total ?? 0) / 25));

  return (
    <div className="space-y-6" dir="rtl">
      <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-primary">
            <Filter className="h-5 w-5" aria-hidden />
            <span className="text-sm font-semibold">البحث السريري المتقدم</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">المرجع الطبي وتصنيف المرضى</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">ابحث في قياسات الانكسار وPentacam والتشخيصات والعمليات، منفردة أو مجتمعة.</p>
        </div>
        <div className="relative w-full lg:max-w-sm">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="اسم المريض أو رقم الملف" className="h-11 pr-9" />
        </div>
      </header>

      <section className="overflow-hidden rounded-lg border border-border bg-background">
        <div className="flex flex-col gap-3 border-b border-border bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">طريقة المطابقة</span>
            <div className="flex rounded-md border border-border bg-background p-1">
              {(["and", "or"] as const).map((value) => (
                <button key={value} type="button" onClick={() => setMode(value)} className={`min-h-9 rounded px-3 text-xs font-semibold ${mode === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                  {value === "and" ? "كل الشروط AND" : "أي شرط OR"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setCriteria([{ id: newId(), kind: "refraction", metric: "sphere", eye: "either", max: -0.25 }])}>قصر نظر</Button>
            <Button variant="outline" size="sm" onClick={() => setCriteria([{ id: newId(), kind: "refraction", metric: "sphere", eye: "either", min: 0.25 }])}>طول نظر</Button>
            <Button variant="ghost" size="sm" onClick={() => setCriteria([defaultCriterion()])}><RotateCcw className="ml-1 h-4 w-4" />مسح</Button>
          </div>
        </div>

        <div className="divide-y divide-border">
          {criteria.map((criterion, index) => (
            <div key={criterion.id} className="grid gap-3 px-4 py-4 lg:grid-cols-[2rem_10rem_minmax(0,1fr)_3rem] lg:items-center">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</span>
              <select aria-label="نوع الفلتر" value={criterion.kind} onChange={(event) => changeKind(criterion.id, event.target.value as Criterion["kind"])} className="h-10 rounded-md border border-border bg-background px-3 text-sm">
                {Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>

              {(criterion.kind === "refraction" || criterion.kind === "pentacam") ? (
                <div className="grid gap-2 sm:grid-cols-4">
                  <select value={criterion.metric} onChange={(event) => update(criterion.id, { metric: event.target.value } as any)} className="h-10 rounded-md border border-border bg-background px-3 text-sm">
                    {(criterion.kind === "refraction" ? ["sphere", "cylinder", "axis"] : ["k1", "k2", "thickness"]).map((metric) => <option key={metric} value={metric}>{metricLabels[metric]}</option>)}
                  </select>
                  <select value={criterion.eye} onChange={(event) => update(criterion.id, { eye: event.target.value as Eye })} className="h-10 rounded-md border border-border bg-background px-3 text-sm">
                    {Object.entries(eyeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <Input type="number" step="0.01" value={criterion.min ?? ""} onChange={(event) => update(criterion.id, { min: event.target.value === "" ? undefined : Number(event.target.value) })} placeholder="من" />
                  <Input type="number" step="0.01" value={criterion.max ?? ""} onChange={(event) => update(criterion.id, { max: event.target.value === "" ? undefined : Number(event.target.value) })} placeholder="إلى" />
                </div>
              ) : criterion.kind === "diagnosis" ? (
                <div className="grid gap-2 sm:grid-cols-[11rem_1fr]">
                  <select value={criterion.field} onChange={(event) => update(criterion.id, { field: event.target.value } as any)} className="h-10 rounded-md border border-border bg-background px-3 text-sm">
                    <option value="any">الكل</option><option value="diagnosis">التشخيص</option><option value="diseases">الأمراض</option><option value="symptoms">الأعراض</option>
                  </select>
                  <Input value={criterion.text} onChange={(event) => update(criterion.id, { text: event.target.value })} placeholder="اكتب مرضاً أو عرضاً أو تشخيصاً" />
                </div>
              ) : (
                <Input value={(criterion as OperationCriterion).text} onChange={(event) => update(criterion.id, { text: event.target.value })} placeholder="اكتب نوع العملية" />
              )}

              <Button variant="ghost" size="icon" aria-label="حذف الشرط" disabled={criteria.length === 1} onClick={() => setCriteria((current) => current.filter((item) => item.id !== criterion.id))} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outline" onClick={() => setCriteria((current) => [...current, defaultCriterion()])}><Plus className="ml-2 h-4 w-4" />إضافة شرط</Button>
          <div className="flex w-full gap-2 sm:w-auto">
            <Input value={saveName} onChange={(event) => setSaveName(event.target.value)} placeholder="اسم التصنيف للحفظ" className="sm:w-56" />
            <Button onClick={saveCurrent}><Save className="ml-2 h-4 w-4" />حفظ</Button>
          </div>
        </div>
      </section>

      {saved.length > 0 && (
        <section aria-label="التصنيفات المحفوظة" className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-sm font-semibold"><FolderPlus className="h-4 w-4" />محفوظ:</span>
          {saved.map((item) => (
            <div key={item.id} className="inline-flex items-center rounded-full border border-border bg-background">
              <button type="button" className="min-h-9 px-3 text-sm hover:text-primary" onClick={() => { setMode(item.mode); setCriteria(item.criteria); }}>{item.name}</button>
              <button type="button" aria-label={`حذف ${item.name}`} className="min-h-9 px-2 text-muted-foreground hover:text-destructive" onClick={() => setSaved((current) => current.filter((savedItem) => savedItem.id !== item.id))}><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </section>
      )}

      <section className="overflow-hidden rounded-lg border border-border bg-background">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div><h2 className="text-lg font-semibold">المرضى المطابقون</h2><p className="text-xs text-muted-foreground">القيم المعروضة هي أحدث قراءة مسجلة</p></div>
          <Badge variant="secondary">{(query.data?.total ?? 0).toLocaleString("en-US")} مريض</Badge>
        </div>
        {query.isLoading ? <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)}</div> : query.error ? (
          <p className="p-8 text-center text-sm text-destructive">تعذر تحميل النتائج: {query.error.message}</p>
        ) : query.data?.rows.length === 0 ? (
          <p className="p-12 text-center text-sm text-muted-foreground">لا توجد نتائج مطابقة. عدّل الحدود أو طريقة المطابقة.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="bg-info/10 text-foreground"><tr>{["المريض", "OD Refraction", "OS Refraction", "OD Pentacam", "OS Pentacam", "التشخيص", "العملية", "آخر زيارة"].map((label) => <th key={label} className="px-3 py-3 text-center font-semibold">{label}</th>)}</tr></thead>
              <tbody className="divide-y divide-border [&_td]:align-middle [&_td]:text-center">
                {(query.data?.rows as MedicalReferenceRow[] | undefined)?.map((row) => (
                  <tr key={row.id} className="hover:bg-info/5">
                    <td className="px-3 py-3"><Link href={`/patients/${row.id}`} className="font-semibold text-primary hover:underline">{row.fullName}</Link><div className="text-xs text-muted-foreground" dir="ltr">{row.patientCode}</div></td>
                    <td className="px-3 py-3 tabular-nums" dir="ltr">{[row.sphereOD, row.cylinderOD, row.axisOD].filter(Boolean).join(" / ") || "-"}</td>
                    <td className="px-3 py-3 tabular-nums" dir="ltr">{[row.sphereOS, row.cylinderOS, row.axisOS].filter(Boolean).join(" / ") || "-"}</td>
                    <td className="px-3 py-3 tabular-nums" dir="ltr">{[row.k1OD, row.k2OD, row.thicknessOD].filter(Boolean).join(" / ") || "-"}</td>
                    <td className="px-3 py-3 tabular-nums" dir="ltr">{[row.k1OS, row.k2OS, row.thicknessOS].filter(Boolean).join(" / ") || "-"}</td>
                    <td className="max-w-56 px-3 py-3"><span className="line-clamp-2" title={row.diagnosis ?? ""}>{row.diagnosis || "-"}</span></td>
                    <td className="px-3 py-3">{row.operationType || "-"}</td>
                    <td className="px-3 py-3 tabular-nums" dir="ltr">{formatResultDate(row.lastVisit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>السابق</Button>
          <span className="text-xs text-muted-foreground">صفحة {page} من {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>التالي</Button>
        </div>
      </section>
    </div>
  );
}
