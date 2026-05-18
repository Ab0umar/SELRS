import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Clock3, Eye, Pill, Plus, XCircle, CheckCircle2 } from "lucide-react";
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
type RxStatus = "all" | "active" | "completed" | "expired";

const locationTabs = [
  { value: "all", label: "الكل" },
  { value: "center", label: "المركز" },
  { value: "external", label: "الخارجي" },
];

const statusTabs = [
  { value: "all", label: "الكل" },
  { value: "active", label: "فعالة" },
  { value: "completed", label: "مكتملة" },
  { value: "expired", label: "منتهية" },
];

const ACTIVE_DAYS = 30;
const EXPIRED_AFTER_DAYS = 120;

type PrescriptionRow = {
  id: number;
  patientId: number;
  prescriptionDate: string | Date | null;
  notes: string | null;
  doctorId: number | null;
  doctorName: string | null;
  patientName: string | null;
  patientCode: string | null;
  locationType: "center" | "external" | null;
  itemCount: number;
};

function classifyPrescription(dateInput: unknown): Exclude<RxStatus, "all"> {
  const d = dateInput ? new Date(String(dateInput)) : null;
  if (!d || Number.isNaN(d.getTime())) return "completed";
  const days = (Date.now() - d.getTime()) / 86_400_000;
  if (days <= ACTIVE_DAYS) return "active";
  if (days > EXPIRED_AFTER_DAYS) return "expired";
  return "completed";
}

function statusBadge(status: Exclude<RxStatus, "all">) {
  if (status === "active") {
    return <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">فعالة</span>;
  }
  if (status === "expired") {
    return <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">منتهية</span>;
  }
  return <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-700">مكتملة</span>;
}

function toDateLabel(value: string | Date | null | undefined) {
  if (!value) return "—";
  const normalized = value instanceof Date ? value.toISOString() : String(value);
  return formatDateLabel(normalized.split("T")[0] || normalized);
}

export default function PrescriptionsDashboard() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState<LocationType>("all");
  const [statusFilter, setStatusFilter] = useState<RxStatus>("all");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    setPage(1);
  }, [search, locationFilter, statusFilter]);

  const overviewQuery = trpc.medical.getPrescriptionsOverview.useQuery(
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

  const rows = (overviewQuery.data?.rows ?? []) as PrescriptionRow[];
  const total = overviewQuery.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const stats = useMemo(() => {
    let active = 0;
    let completed = 0;
    let expired = 0;
    for (const row of rows) {
      const st = classifyPrescription(row.prescriptionDate);
      if (st === "active") active += 1;
      else if (st === "expired") expired += 1;
      else completed += 1;
    }
    return { total: rows.length, active, completed, expired };
  }, [rows]);

  const alertRows = useMemo(() => rows.filter((row) => classifyPrescription(row.prescriptionDate) === "expired").slice(0, 5), [rows]);

  if (!isAuthenticated) return null;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-6 lg:px-8" dir="rtl">
      <PageHeader
        title="لوحة الروشتات"
        subtitle="استعراض سريع للوصفات الطبية وحالتها"
        icon={<Pill className="h-5 w-5" />}
        action={
          <Button type="button" size="sm" className="gap-2" onClick={() => setLocation("/prescription")}>
            <Plus className="h-4 w-4" />
            <span>روشتة جديدة</span>
          </Button>
        }
      />

      {overviewQuery.isError ? (
        <div className="mb-4">
          <OfflinePageState
            title="تعذر تحميل لوحة الروشتات"
            body="تحقق من الاتصال ثم أعد المحاولة."
            onRetry={() => void overviewQuery.refetch()}
          />
        </div>
      ) : null}

      <div className={cn(STAT_CARDS_MOBILE_ROW, "mb-4 gap-2 sm:mb-6 sm:grid sm:grid-cols-4 sm:gap-4")}>
        <StatCard title="الإجمالي" value={stats.total} icon={Pill} description="الروشتات المتاحة" />
        <StatCard title="فعالة" value={stats.active} icon={Clock3} description={`آخر ${ACTIVE_DAYS} يومًا`} iconColor="bg-emerald-100 text-emerald-700" />
        <StatCard title="مكتملة" value={stats.completed} icon={CheckCircle2} description="خارج نافذة النشاط" iconColor="bg-sky-100 text-sky-700" />
        <StatCard title="منتهية" value={stats.expired} icon={XCircle} description={`أقدم من ${EXPIRED_AFTER_DAYS} يومًا`} iconColor="bg-muted text-foreground" />
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="w-full lg:max-w-md">
          <SearchBar value={search} onChange={setSearch} placeholder="بحث بالاسم أو الكود أو الطبيب أو الدواء..." />
        </div>
        <div className="flex flex-col gap-2 lg:items-end">
          <FilterBar filters={locationTabs} selected={locationFilter} onSelect={(value) => setLocationFilter(value as LocationType)} />
          <FilterBar filters={statusTabs} selected={statusFilter} onSelect={(value) => setStatusFilter(value as RxStatus)} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {overviewQuery.isLoading ? (
            <div className="p-12 text-center text-muted-foreground">جاري تحميل الروشتات…</div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              {total === 0 ? "لا توجد روشتات مسجلة بعد." : "لا توجد روشتات مطابقة للتصفية."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-right text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 font-semibold">المريض</th>
                    <th className="px-4 py-3 font-semibold">الطبيب</th>
                    <th className="px-4 py-3 font-semibold">التاريخ</th>
                    <th className="px-4 py-3 font-semibold">الأدوية</th>
                    <th className="px-4 py-3 font-semibold">الحالة</th>
                    <th className="w-24 px-4 py-3 text-center font-semibold">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const status = classifyPrescription(row.prescriptionDate);
                    const dateLabel = toDateLabel(row.prescriptionDate);
                    const noteSnippet = String(row.notes ?? "").trim().slice(0, 80);
                    return (
                      <tr key={row.id} className="border-b border-border/70 transition-colors hover:bg-primary/[0.05]">
                        <td className="px-4 py-3 align-top">
                          <div className="font-semibold">{row.patientName || `مريض #${row.patientId}`}</div>
                          <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                            <span dir="ltr">{row.patientCode || "—"}</span>
                            <span>•</span>
                            <span>{row.locationType === "external" ? "خارجي" : "المركز"}</span>
                          </div>
                          {noteSnippet ? <div className="mt-2 line-clamp-2 text-xs text-muted-foreground">{noteSnippet}</div> : null}
                        </td>
                        <td className="px-4 py-3 align-top text-muted-foreground">{row.doctorName || "—"}</td>
                        <td className="px-4 py-3 align-top whitespace-nowrap" dir="ltr">
                          <Badge variant="outline" className="font-normal">
                            {dateLabel}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span className="font-medium tabular-nums">{row.itemCount}</span>
                          <span className="text-muted-foreground"> دواء</span>
                        </td>
                        <td className="px-4 py-3 align-top">{statusBadge(status)}</td>
                        <td className="px-4 py-3 text-center align-top">
                          <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => setLocation(`/prescription/${row.patientId}`)}>
                            <Eye className="h-4 w-4" />
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
            <div className="mb-3 text-sm font-semibold">الروشتات المنتهية</div>
            {alertRows.length === 0 ? (
              <div className="text-sm text-muted-foreground">لا توجد روشتات منتهية ضمن التصفية الحالية.</div>
            ) : (
              <div className="space-y-3">
                {alertRows.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setLocation(`/prescription/${row.patientId}`)}
                    className="w-full rounded-xl border border-border/80 bg-muted/20 p-3 text-right transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{row.patientName || `مريض #${row.patientId}`}</div>
                        <div className="mt-1 text-[11px] text-muted-foreground" dir="ltr">
                          {row.patientCode || "—"}
                        </div>
                      </div>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">منتهية</span>
                    </div>
                    <div className="mt-3 text-[11px] text-muted-foreground">
                      {row.itemCount} دواء, {row.doctorName || "—"}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
