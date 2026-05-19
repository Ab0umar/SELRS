import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Activity, AlertTriangle, CheckCircle2, ScanSearch, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchBar } from "@/components/shared/SearchBar";
import { FilterBar } from "@/components/shared/FilterBar";
import { StatCard, STAT_CARDS_MOBILE_ROW } from "@/components/shared/StatCard";
import { OfflinePageState } from "@/components/OfflinePageState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatDateLabel } from "@/lib/utils";
import { PaginationBar } from "@/components/shared/PaginationBar";

type LocationType = "all" | "center" | "external";
type AutoStatus = "all" | "complete" | "partial";

const locationTabs = [
  { value: "all", label: "الكل" },
  { value: "center", label: "المركز" },
  { value: "external", label: "الخارجي" },
];

const statusTabs = [
  { value: "all", label: "الكل" },
  { value: "complete", label: "مكتمل" },
  { value: "partial", label: "ناقص" },
];

type AutoRow = {
  id: number;
  examinationId: number;
  patientId: number;
  visitDate: string | Date | null;
  patientName: string | null;
  patientCode: string | null;
  locationType: "center" | "external" | null;
  doctorName: string | null;
  sphereOD: string | null;
  cylinderOD: string | null;
  axisOD: string | null;
  ucvaOD: string | null;
  bcvaOD: string | null;
  iopOD: string | null;
  sphereOS: string | null;
  cylinderOS: string | null;
  axisOS: string | null;
  ucvaOS: string | null;
  bcvaOS: string | null;
  iopOS: string | null;
};

function hasValue(value: unknown) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return false;
  return !/^0+(?:\.0+)?$/.test(normalized);
}

function formatTriplet(s: string | null, c: string | null, a: string | null) {
  return [s, c, a]
    .map((value) => (hasValue(value) ? String(value).trim() : "—"))
    .join(" / ");
}

function toDateLabel(value: string | Date | null | undefined) {
  if (!value) return "—";
  const normalized = value instanceof Date ? value.toISOString() : String(value);
  return formatDateLabel(normalized.split("T")[0] || normalized);
}

function formatStatus(row: AutoRow): AutoStatus {
  const hasRight = [row.sphereOD, row.cylinderOD, row.axisOD, row.ucvaOD, row.bcvaOD, row.iopOD].some(hasValue);
  const hasLeft = [row.sphereOS, row.cylinderOS, row.axisOS, row.ucvaOS, row.bcvaOS, row.iopOS].some(hasValue);
  return hasRight && hasLeft ? "complete" : "partial";
}

function statusBadge(status: AutoStatus) {
  if (status === "complete") {
    return <span className="rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-semibold text-success">مكتمل</span>;
  }
  return <span className="rounded-full bg-warning/20 px-2.5 py-1 text-[11px] font-semibold text-warning/90">ناقص</span>;
}

export default function AutorefsDashboard() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState<LocationType>("all");
  const [statusFilter, setStatusFilter] = useState<AutoStatus>("all");
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [dismissedReviews, setDismissedReviews] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    setPage(1);
  }, [search, locationFilter, statusFilter]);

  const overviewQuery = trpc.medical.getAutorefractometryOverview.useQuery(
    {
      page,
      pageSize,
      search,
      statusFilter,
      locationType: locationFilter === "center" || locationFilter === "external" ? locationFilter : undefined,
    },
    {
      enabled: Boolean(isAuthenticated),
      refetchOnWindowFocus: false,
    }
  );

  const rows = (overviewQuery.data?.rows ?? []) as AutoRow[];
  const total = overviewQuery.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const stats = useMemo(() => {
    let complete = 0;
    let partial = 0;
    for (const row of rows) {
      if (formatStatus(row) === "complete") complete += 1;
      else partial += 1;
    }
    return { total: rows.length, complete, partial };
  }, [rows]);

  const reviewList = useMemo(
    () => rows.filter((row) => formatStatus(row) === "partial" && !dismissedReviews.has(row.id)).slice(0, 5),
    [rows, dismissedReviews],
  );

  if (!isAuthenticated) return null;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-6 lg:px-8" dir="rtl">
      <PageHeader
        title="لوحة Autoref"
        subtitle="مراجعة سجلات الانكسار الآلي والضغط"
        icon={<Activity className="h-5 w-5" />}
        action={
          <Button type="button" size="sm" className="gap-2" onClick={() => setLocation("/examination")}>
            <Plus className="h-4 w-4" />
            <span>فتح الفحص</span>
          </Button>
        }
      />

      {overviewQuery.isError ? (
        <div className="mb-4">
          <OfflinePageState
            title="تعذر تحميل لوحة Autoref"
            body="تحقق من الاتصال ثم أعد المحاولة."
            onRetry={() => void overviewQuery.refetch()}
          />
        </div>
      ) : null}

      <div className={cn(STAT_CARDS_MOBILE_ROW, "mb-4 gap-2 sm:mb-6 sm:grid sm:grid-cols-3 sm:gap-4")}>
        <StatCard title="إجمالي السجلات" value={stats.total} icon={Activity} description="السجلات المتاحة" />
        <StatCard title="مكتمل" value={stats.complete} icon={ScanSearch} description="RT و LT موجودان" iconColor="bg-primary/10 text-primary" />
        <StatCard title="ناقص" value={stats.partial} icon={AlertTriangle} description="يحتاج مراجعة" iconColor="bg-warning/20 text-warning/90" />
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="w-full lg:max-w-md">
          <SearchBar value={search} onChange={setSearch} placeholder="بحث بالاسم أو الكود أو الطبيب..." />
        </div>
        <div className="flex flex-col gap-2 lg:items-end">
          <FilterBar filters={locationTabs} selected={locationFilter} onSelect={(value) => setLocationFilter(value as LocationType)} />
          <FilterBar filters={statusTabs} selected={statusFilter} onSelect={(value) => setStatusFilter(value as AutoStatus)} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {overviewQuery.isLoading ? (
            <div className="p-12 text-center text-muted-foreground">جاري تحميل سجلات Autoref…</div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              {total === 0 ? "لا توجد سجلات Autoref بعد." : "لا توجد سجلات مطابقة للتصفية."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] text-right text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 font-semibold">المريض</th>
                    <th className="px-4 py-3 font-semibold">التاريخ</th>
                    <th className="px-4 py-3 font-semibold">الطبيب</th>
                    <th className="px-4 py-3 font-semibold">RT</th>
                    <th className="px-4 py-3 font-semibold">LT</th>
                    <th className="px-4 py-3 font-semibold">الحالة</th>
                    <th className="w-24 px-4 py-3 text-center font-semibold">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const status = formatStatus(row);
                    const dateLabel = toDateLabel(row.visitDate);
                    return (
                      <tr key={row.id} className="border-b border-border/70 transition-colors hover:bg-primary/[0.05]">
                        <td className="px-4 py-3 align-top">
                          <div className="font-semibold">{row.patientName || `مريض #${row.patientId}`}</div>
                          <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                            <span dir="ltr">{row.patientCode || "—"}</span>
                            <span>•</span>
                            <span>{row.locationType === "external" ? "خارجي" : "المركز"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top whitespace-nowrap" dir="ltr">
                          <Badge variant="outline" className="font-normal">
                            {dateLabel}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 align-top text-muted-foreground">{row.doctorName || "—"}</td>
                        <td className="px-4 py-3 align-top">
                          <div className="space-y-1">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">RT</div>
                            <div className="text-xs font-semibold text-foreground">{formatTriplet(row.sphereOD, row.cylinderOD, row.axisOD)}</div>
                            <div className="text-[11px] text-muted-foreground">
                              UCVA {hasValue(row.ucvaOD) ? row.ucvaOD : "—"} / BCVA {hasValue(row.bcvaOD) ? row.bcvaOD : "—"} / IOP {hasValue(row.iopOD) ? row.iopOD : "—"}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="space-y-1">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">LT</div>
                            <div className="text-xs font-semibold text-foreground">{formatTriplet(row.sphereOS, row.cylinderOS, row.axisOS)}</div>
                            <div className="text-[11px] text-muted-foreground">
                              UCVA {hasValue(row.ucvaOS) ? row.ucvaOS : "—"} / BCVA {hasValue(row.bcvaOS) ? row.bcvaOS : "—"} / IOP {hasValue(row.iopOS) ? row.iopOS : "—"}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">{statusBadge(status)}</td>
                        <td className="px-4 py-3 text-center align-top">
                          <Button type="button" variant="ghost" size="sm" className="h-11 w-11 p-0" aria-label={`فتح فحص Autoref للمريض ${row.patientName ?? row.patientId}`} onClick={() => setLocation(`/examination/${row.patientId}`)}>
                            <ScanSearch className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <PaginationBar page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPageChange={setPage} />
        </section>

        <aside className="space-y-4 lg:sticky lg:top-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 text-sm font-semibold">يحتاج مراجعة</div>
            {reviewList.length === 0 ? (
              <div className="text-sm text-muted-foreground">لا توجد سجلات ناقصة ضمن التصفية الحالية.</div>
            ) : (
              <div className="space-y-3">
                {reviewList.map((row) => (
                  <div key={row.id} className="rounded-xl border border-border/80 bg-muted/20 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setLocation(`/examination/${row.patientId}`)}
                        className="min-w-0 flex-1 text-right"
                      >
                        <div className="font-semibold">{row.patientName || `مريض #${row.patientId}`}</div>
                        <div className="mt-1 text-[11px] text-muted-foreground" dir="ltr">
                          {row.patientCode || "—"}
                        </div>
                      </button>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="rounded-full bg-warning/20 px-2.5 py-1 text-[11px] font-semibold text-warning-foreground">ناقص</span>
                        <button
                          type="button"
                          aria-label="تجاهل التنبيه"
                          onClick={() => setDismissedReviews((prev) => new Set(prev).add(row.id))}
                          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground/50 transition-colors hover:bg-success/10 hover:text-success"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                      <div>RT {formatTriplet(row.sphereOD, row.cylinderOD, row.axisOD)}</div>
                      <div>LT {formatTriplet(row.sphereOS, row.cylinderOS, row.axisOS)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
