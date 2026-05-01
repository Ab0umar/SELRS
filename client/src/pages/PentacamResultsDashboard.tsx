import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchBar } from "@/components/shared/SearchBar";
import { FilterBar } from "@/components/shared/FilterBar";
import { StatCard } from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { evaluateMedicalReference, findMedicalReference, medicalReferenceClass, type MedicalReference } from "@/lib/medical-reference";
import { Activity, AlertTriangle, Eye, Upload } from "lucide-react";

const filterTabs = [
  { value: "all", label: "الكل" },
  { value: "OD", label: "يمين" },
  { value: "OS", label: "يسار" },
  { value: "accepted", label: "مقبول" },
  { value: "repeat", label: "يحتاج تكرار" },
];

function formatVisitDateAr(value: Date | string | null | undefined): string {
  if (value == null) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "long", year: "numeric" }).format(d);
  } catch {
    return d.toLocaleDateString("ar-EG");
  }
}

function parseInitialQuery(): {
  visitId?: number;
  resultId?: number;
  patientId?: number;
  fromDate?: string;
  toDate?: string;
} {
  try {
    const qs = new URLSearchParams(window.location.search);
    const visitRaw = qs.get("visitId");
    const resultRaw = qs.get("resultId");
    const patientRaw = qs.get("patientId");
    const fromDate = qs.get("fromDate") ?? qs.get("date") ?? undefined;
    const toDate = qs.get("toDate") ?? undefined;
    const visitId = visitRaw != null && visitRaw !== "" ? Number(visitRaw) : undefined;
    const resultId = resultRaw != null && resultRaw !== "" ? Number(resultRaw) : undefined;
    const patientId = patientRaw != null && patientRaw !== "" ? Number(patientRaw) : undefined;
    return {
      visitId: Number.isFinite(visitId) ? visitId : undefined,
      resultId: Number.isFinite(resultId) && (resultId ?? 0) > 0 ? resultId : undefined,
      patientId: Number.isFinite(patientId) && (patientId ?? 0) > 0 ? patientId : undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    };
  } catch {
    return {};
  }
}

export default function PentacamResultsDashboard() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const initial = useMemo(() => parseInitialQuery(), []);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [visitId, setVisitId] = useState<string>(initial.visitId != null ? String(initial.visitId) : "");
  const [resultId, setResultId] = useState<string>(initial.resultId != null ? String(initial.resultId) : "");
  const [patientId, setPatientId] = useState<string>(initial.patientId != null ? String(initial.patientId) : "");
  const [fromDate, setFromDate] = useState<string>(initial.fromDate ?? "");
  const [toDate, setToDate] = useState<string>(initial.toDate ?? "");

  const eyeFilter = useMemo(() => {
    if (activeFilter === "OD" || activeFilter === "OS") return activeFilter as "OD" | "OS";
    return "all" as const;
  }, [activeFilter]);

  const qualityFilter = useMemo(() => {
    if (activeFilter === "accepted" || activeFilter === "repeat") return activeFilter as "accepted" | "repeat";
    return "all" as const;
  }, [activeFilter]);

  const listInput = useMemo(
    () => ({
      search: search.trim() || undefined,
      visitId: visitId.trim() ? Number(visitId) : undefined,
      resultId: resultId.trim() ? Number(resultId) : undefined,
      patientId: patientId.trim() ? Number(patientId) : undefined,
      fromDate: fromDate.trim() || undefined,
      toDate: toDate.trim() || undefined,
      eye: eyeFilter,
      quality: qualityFilter,
      limit: 200,
      offset: 0,
    }),
    [search, visitId, resultId, patientId, fromDate, toDate, eyeFilter, qualityFilter],
  );

  const listQuery = trpc.medical.listPentacamDashboard.useQuery(listInput, {
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
  });

  const statsQuery = trpc.medical.getPentacamDashboardStats.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
  });

  const refsQuery = trpc.medical.getAllTests.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  const trendDelta = useMemo(() => {
    const t = statsQuery.data?.examsToday ?? 0;
    const y = statsQuery.data?.examsYesterday ?? 0;
    return t - y;
  }, [statsQuery.data?.examsToday, statsQuery.data?.examsYesterday]);

  const pentacamRefs = useMemo(() => {
    const rows = ((refsQuery.data ?? []) as Record<string, unknown>[]);
    return {
      k1: findMedicalReference(rows, ["K1", "Pentacam K1", "بنتاكام K1"]),
      k2: findMedicalReference(rows, ["K2", "Pentacam K2", "بنتاكام K2"]),
      thinnest: findMedicalReference(rows, ["Thinnest", "Thinnest Point", "CCT", "بنتاكام Thinnest"]),
    };
  }, [refsQuery.data]);

  const RefValue = ({ value, reference, suffix = "" }: { value: unknown; reference: MedicalReference | null; suffix?: string }) => {
    const state = evaluateMedicalReference(value, reference);
    const empty = value == null || value === "";
    return (
      <span
        className={cn("inline-flex rounded px-1.5 py-0.5", medicalReferenceClass(state))}
        title={state === "low" || state === "high" ? `خارج الطبيعي: ${reference?.min} - ${reference?.max} ${reference?.unit}` : undefined}
      >
        {empty ? "—" : `${value}${suffix}`}
      </span>
    );
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto max-w-[1400px] px-3 sm:px-4 py-6 sm:py-8" dir="rtl">
        <PageHeader
          title="بنتكام"
          description="نتائج فحص البنتكام"
          icon={<Eye className="h-5 w-5 text-primary" />}
          action={
            <Button variant="default" size="sm" className="gap-1.5 font-semibold" asChild>
              <Link href="/sheets/pentacam">
                <Upload className="h-4 w-4" />
                استيراد نتائج
              </Link>
            </Button>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-5">
          <StatCard
            title="فحوصات اليوم"
            value={statsQuery.isLoading ? "…" : (statsQuery.data?.examsToday ?? 0)}
            icon={Activity}
            iconColor="bg-emerald-500/10 text-emerald-600"
            trend={trendDelta >= 0 ? "up" : "down"}
            change={statsQuery.isLoading ? "…" : `${Math.abs(trendDelta)} مقارنة بالأمس`}
          />
          <StatCard
            title="بحاجة لتكرار"
            value={statsQuery.isLoading ? "…" : (statsQuery.data?.needsRepeatEyes ?? 0)}
            icon={AlertTriangle}
            iconColor="bg-amber-500/10 text-amber-600"
            description="جودة غير مقبولة"
          />
        </div>

        <div className="rounded-xl border bg-card p-3 sm:p-4 shadow-sm space-y-4 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">رقم السجل (ID)</Label>
              <Input
                dir="ltr"
                className="h-9 text-sm"
                placeholder="pentacam result id"
                value={resultId}
                onChange={(e) => setResultId(e.target.value.replace(/[^\d]/g, ""))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">رقم الزيارة</Label>
              <Input
                dir="ltr"
                className="h-9 text-sm"
                placeholder="visit id"
                value={visitId}
                onChange={(e) => setVisitId(e.target.value.replace(/[^\d]/g, ""))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">من تاريخ</Label>
              <Input type="date" className="h-9 text-sm" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">إلى تاريخ</Label>
              <Input type="date" className="h-9 text-sm" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">المريض (اختياري)</Label>
            <Input
              dir="ltr"
              className="h-9 text-sm"
              placeholder="patient id"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value.replace(/[^\d]/g, ""))}
            />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between mb-4">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="بحث باسم المريض أو الطبيب..."
            className="lg:max-w-xl w-full"
          />
          <FilterBar
            filters={filterTabs}
            selected={activeFilter}
            onSelect={setActiveFilter}
            className="lg:justify-end"
          />
        </div>

        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right min-w-[960px]">
              <thead>
                <tr className="border-b bg-muted/40 text-[11px] sm:text-xs font-semibold text-muted-foreground">
                  <th className="p-2.5 whitespace-nowrap">المريض</th>
                  <th className="p-2.5 whitespace-nowrap">الطبيب</th>
                  <th className="p-2.5 whitespace-nowrap">التاريخ</th>
                  <th className="p-2.5 whitespace-nowrap">العين</th>
                  <th className="p-2.5 whitespace-nowrap">K1</th>
                  <th className="p-2.5 whitespace-nowrap">K2</th>
                  <th className="p-2.5 whitespace-nowrap">Axis</th>
                  <th className="p-2.5 whitespace-nowrap">Thinnest</th>
                  <th className="p-2.5 whitespace-nowrap">الجودة</th>
                  <th className="p-2.5 whitespace-nowrap w-14">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {listQuery.isLoading ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-muted-foreground">
                      جاري التحميل…
                    </td>
                  </tr>
                ) : listQuery.data?.rows?.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-muted-foreground">
                      لا توجد نتائج مطابقة.
                    </td>
                  </tr>
                ) : (
                  listQuery.data?.rows?.map((row, idx) => (
                    <tr key={`${row.resultId}-${row.eye}-${idx}`} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-2.5 font-semibold whitespace-nowrap max-w-[200px] truncate">{row.patientName}</td>
                      <td className="p-2.5 text-muted-foreground whitespace-nowrap max-w-[180px] truncate">
                        {row.doctorName || "—"}
                      </td>
                      <td className="p-2.5 whitespace-nowrap tabular-nums">{formatVisitDateAr(row.visitDate)}</td>
                      <td className="p-2.5">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            row.eye === "OD"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200"
                              : "bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-200",
                          )}
                        >
                          {row.eye === "OD" ? "يمين" : "يسار"}
                        </span>
                      </td>
                      <td className="p-2.5 tabular-nums font-mono text-xs">
                        <RefValue value={row.k1} reference={pentacamRefs.k1} />
                      </td>
                      <td className="p-2.5 tabular-nums font-mono text-xs">
                        <RefValue value={row.k2} reference={pentacamRefs.k2} />
                      </td>
                      <td className="p-2.5 tabular-nums font-mono text-xs">
                        {row.axis != null && row.axis !== "" ? `${row.axis}°` : "—"}
                      </td>
                      <td className="p-2.5 tabular-nums font-mono text-xs">
                        <RefValue value={row.thinnest} reference={pentacamRefs.thinnest} suffix=" µm" />
                      </td>
                      <td className="p-2.5">
                        <span
                          className={cn(
                            "text-xs font-semibold",
                            row.quality === "accepted"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-amber-600 dark:text-amber-400",
                          )}
                        >
                          {row.quality === "accepted" ? "مقبول" : "يحتاج تكرار"}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="عرض">
                          <Link href={`/sheets/pentacam/${row.patientId}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {listQuery.error ? (
          <p className="mt-3 text-sm text-destructive text-center">{String(listQuery.error.message)}</p>
        ) : null}
      </div>
    </div>
  );
}
