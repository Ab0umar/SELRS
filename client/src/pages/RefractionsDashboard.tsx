import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Activity, AlertTriangle, CheckCircle2, Eye, FolderSearch, Plus } from "lucide-react";
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
type RefractionStatus = "all" | "complete" | "partial";

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

type RefractionRow = {
  id: number;
  visitId: number;
  patientId: number;
  visitDate: string | Date | null;
  patientName: string | null;
  patientCode: string | null;
  locationType: "center" | "external" | null;
  doctorName: string | null;
  ucvaOD: string | null;
  ucvaOS: string | null;
  bcvaOD: string | null;
  bcvaOS: string | null;
  sphereOD: string | null;
  sphereOS: string | null;
  cylinderOD: string | null;
  cylinderOS: string | null;
  axisOD: string | null;
  axisOS: string | null;
  iopOD: string | null;
  iopOS: string | null;
  glassesData: string | null;
  airPuffOD: string | null;
  airPuffOS: string | null;
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

function formatStatus(row: RefractionRow): RefractionStatus {
  const hasRight = [
    row.ucvaOD,
    row.bcvaOD,
    row.sphereOD,
    row.cylinderOD,
    row.axisOD,
    row.iopOD,
    row.airPuffOD,
  ].some(hasValue);
  const hasLeft = [
    row.ucvaOS,
    row.bcvaOS,
    row.sphereOS,
    row.cylinderOS,
    row.axisOS,
    row.iopOS,
    row.airPuffOS,
  ].some(hasValue);
  return hasRight && hasLeft ? "complete" : "partial";
}

function formatEyeLabel(label: "RT" | "LT", row: RefractionRow) {
  const isRight = label === "RT";
  const ucva = isRight ? row.ucvaOD : row.ucvaOS;
  const bcva = isRight ? row.bcvaOD : row.bcvaOS;
  const sphere = isRight ? row.sphereOD : row.sphereOS;
  const cylinder = isRight ? row.cylinderOD : row.cylinderOS;
  const axis = isRight ? row.axisOD : row.axisOS;
  const iop = isRight ? row.iopOD : row.iopOS;

  return (
    <div className="space-y-1">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="text-xs font-semibold text-foreground">{formatTriplet(sphere, cylinder, axis)}</div>
      <div className="text-[11px] text-muted-foreground">
        UCVA {hasValue(ucva) ? ucva : "—"} / BCVA {hasValue(bcva) ? bcva : "—"} / IOP {hasValue(iop) ? iop : "—"}
      </div>
    </div>
  );
}

function statusBadge(status: RefractionStatus) {
  if (status === "complete") {
    return <span className="rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-semibold text-success">مكتمل</span>;
  }
  return <span className="rounded-full bg-warning/20 px-2.5 py-1 text-[11px] font-semibold text-warning/90">ناقص</span>;
}

export default function RefractionsDashboard() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState<LocationType>("all");
  const [statusFilter, setStatusFilter] = useState<RefractionStatus>("all");
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [dismissedReviews, setDismissedReviews] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    setPage(1);
  }, [search, locationFilter, statusFilter]);

  const overviewQuery = trpc.medical.getRefractionsOverview.useQuery(
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

  const rows = (overviewQuery.data?.rows ?? []) as RefractionRow[];
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
        title="لوحة الانكسارات"
        subtitle="استعراض سريع لسجلات الانكسار عبر المرضى"
        icon={<Eye className="h-5 w-5" />}
        action={
          <Button type="button" size="sm" className="gap-2" onClick={() => setLocation("/refraction")}>
            <Plus className="h-4 w-4" />
            <span>فتح الانكسار</span>
          </Button>
        }
      />

      {overviewQuery.isError ? (
        <div className="mb-4">
          <OfflinePageState
            title="تعذر تحميل لوحة الانكسارات"
            body="تحقق من الاتصال ثم أعد المحاولة."
            onRetry={() => void overviewQuery.refetch()}
          />
        </div>
      ) : null}

      <div className={cn(STAT_CARDS_MOBILE_ROW, "mb-4 gap-2 sm:mb-6 sm:grid sm:grid-cols-3 sm:gap-4")}>
        <StatCard title="إجمالي السجلات" value={stats.total} icon={Activity} description="السجلات المتاحة" />
        <StatCard title="مكتمل" value={stats.complete} icon={Eye} description="RT و LT موجودان" iconColor="bg-success/15 text-success" />
        <StatCard title="ناقص" value={stats.partial} icon={AlertTriangle} description="مراجعة أو استكمال" iconColor="bg-warning/20 text-warning/90" />
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="w-full lg:max-w-md">
          <SearchBar value={search} onChange={setSearch} placeholder="بحث بالاسم أو الكود أو الطبيب..." />
        </div>
        <div className="flex flex-col gap-2 lg:items-end">
          <FilterBar filters={locationTabs} selected={locationFilter} onSelect={(value) => setLocationFilter(value as LocationType)} />
          <FilterBar filters={statusTabs} selected={statusFilter} onSelect={(value) => setStatusFilter(value as RefractionStatus)} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {overviewQuery.isLoading ? (
            <div className="p-12 text-center text-muted-foreground">جاري تحميل سجلات الانكسار…</div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              {total === 0 ? "لا توجد سجلات انكسار بعد." : "لا توجد سجلات مطابقة للتصفية."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1160px] text-right text-sm">
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
                        <td className="px-4 py-3 align-top">{formatEyeLabel("RT", row)}</td>
                        <td className="px-4 py-3 align-top">{formatEyeLabel("LT", row)}</td>
                        <td className="px-4 py-3 align-top">{statusBadge(status)}</td>
                        <td className="px-4 py-3 text-center align-top">
                          <Button type="button" variant="ghost" size="sm" className="h-11 w-11 p-0" aria-label={`فتح سجل الانكسار للمريض ${row.patientName ?? row.patientId}`} onClick={() => setLocation(`/refraction/${row.patientId}`)}>
                            <FolderSearch className="h-4 w-4" />
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
            <div className="mb-3 text-sm font-semibold">سجلات تحتاج مراجعة</div>
            {reviewList.length === 0 ? (
              <div className="text-sm text-muted-foreground">لا توجد سجلات ناقصة ضمن التصفية الحالية.</div>
            ) : (
              <div className="space-y-3">
                {reviewList.map((row) => (
                  <div key={row.id} className="rounded-xl border border-border/80 bg-muted/20 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setLocation(`/refraction/${row.patientId}`)}
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
