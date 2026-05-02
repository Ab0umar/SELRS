import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchBar } from "@/components/shared/SearchBar";
import { FilterBar } from "@/components/shared/FilterBar";
import { StatCard, STAT_CARDS_MOBILE_ROW } from "@/components/shared/StatCard";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OfflinePageState } from "@/components/OfflinePageState";
import { CheckCircle2, Clock, Eye, Pill, Plus, XCircle } from "lucide-react";
type RxStatus = "active" | "completed" | "expired";

const statusTabs = [
  { value: "all", label: "الكل" },
  { value: "active", label: "فعالة" },
  { value: "completed", label: "مكتملة" },
  { value: "expired", label: "منتهية" },
];

const ACTIVE_DAYS = 30;
const EXPIRED_AFTER_DAYS = 120;

function classifyPrescription(dateInput: unknown): RxStatus {
  const d = dateInput ? new Date(String(dateInput)) : null;
  if (!d || Number.isNaN(d.getTime())) return "completed";
  const days = (Date.now() - d.getTime()) / 86_400_000;
  if (days <= ACTIVE_DAYS) return "active";
  if (days > EXPIRED_AFTER_DAYS) return "expired";
  return "completed";
}

function statusBadge(st: RxStatus) {
  if (st === "active") {
    return <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">فعال</span>;
  }
  if (st === "expired") {
    return <span className="text-xs font-semibold text-muted-foreground">منتهي</span>;
  }
  return <span className="text-xs font-semibold text-emerald-700/90 dark:text-emerald-400/90">مكتمل</span>;
}

export default function PrescriptionsList() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  const overviewQuery = trpc.medical.getPrescriptionsOverview.useQuery(undefined, {
    enabled: Boolean(isAuthenticated),
    refetchOnWindowFocus: false,
  });

  const rows = (overviewQuery.data ?? []) as Array<{
    id: number;
    patientId: number;
    prescriptionDate: string | Date | null;
    notes: string | null;
    doctorId: number | null;
    doctorName: string | null;
    patientName: string | null;
    patientCode: string | null;
    itemCount: number;
  }>;

  const stats = useMemo(() => {
    let active = 0;
    let completed = 0;
    let expired = 0;
    for (const r of rows) {
      const s = classifyPrescription(r.prescriptionDate);
      if (s === "active") active += 1;
      else if (s === "expired") expired += 1;
      else completed += 1;
    }
    return { total: rows.length, active, completed, expired };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const st = classifyPrescription(r.prescriptionDate);
      if (tab !== "all" && st !== tab) return false;
      if (!q) return true;
      const hay = [
        r.patientName,
        r.patientCode,
        r.doctorName,
        r.notes,
        String(r.itemCount),
        String(r.id),
      ]
        .map((x) => String(x ?? "").toLowerCase())
        .join(" ");
      return hay.includes(q);
    });
  }, [rows, search, tab]);

  if (!isAuthenticated) return null;

  return (
    <div className="mx-auto w-full max-w-[1280px]" dir="rtl">
      <PageHeader
        title="الروشتات"
        subtitle="إدارة الوصفات الطبية"
        icon={<Pill className="h-5 w-5" />}
        action={
          <Button type="button" size="sm" className="selrs-gradient-btn gap-2 text-white" onClick={() => setLocation("/prescription")}>
            <Plus className="h-4 w-4" />
            <span className="text-xs sm:text-sm">روشتة جديدة</span>
          </Button>
        }
      />

      {overviewQuery.isError ? (
        <div className="mb-4">
          <OfflinePageState
            title="تعذر تحميل قائمة الروشتات"
            body="تحقق من الاتصال ثم أعد المحاولة."
            onRetry={() => void overviewQuery.refetch()}
          />
        </div>
      ) : null}

      <div className={cn(STAT_CARDS_MOBILE_ROW, "mb-4 gap-2 sm:mb-6 sm:grid sm:grid-cols-3 sm:gap-4")}>
        <StatCard
          title="روشتات فعالة"
          value={stats.active}
          icon={Clock}
          description={`آخر ${ACTIVE_DAYS} يومًا`}
          iconColor="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
        />
        <StatCard
          title="مكتملة"
          value={stats.completed}
          icon={CheckCircle2}
          description="بعد فترة السريان وحتى انتهاء المدة"
          iconColor="bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400"
        />
        <StatCard
          title="منتهية"
          value={stats.expired}
          icon={XCircle}
          description={`أقدم من ${EXPIRED_AFTER_DAYS} يومًا`}
          iconColor="bg-muted text-muted-foreground"
        />
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:w-80">
          <SearchBar value={search} onChange={setSearch} placeholder="بحث بالاسم أو الدواء أو الملاحظات..." />
        </div>
        <FilterBar filters={statusTabs} selected={tab} onSelect={setTab} className="sm:justify-end" />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {overviewQuery.isLoading ? (
          <div className="p-12 text-center text-muted-foreground">جاري التحميل…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            {rows.length === 0 ? "لا توجد روشتات مسجلة بعد." : "لا توجد روشتات مطابقة للتصفية."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-right text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 font-semibold">المريض</th>
                  <th className="px-4 py-3 font-semibold">الطبيب</th>
                  <th className="px-4 py-3 font-semibold">التاريخ</th>
                  <th className="px-4 py-3 font-semibold">الأدوية</th>
                  <th className="px-4 py-3 font-semibold">الحالة</th>
                  <th className="w-24 px-4 py-3 text-center font-semibold">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const st = classifyPrescription(r.prescriptionDate);
                  const dt =
                    r.prescriptionDate instanceof Date ? r.prescriptionDate : new Date(String(r.prescriptionDate ?? ""));
                  const dateLabel = Number.isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("ar-EG");
                  const noteSnippet = String(r.notes ?? "").trim().slice(0, 80);

                  return (
                    <tr
                      key={r.id}
                      className="border-b border-border/70 transition-colors hover:bg-primary/[0.06]"
                    >
                      <td className="px-4 py-3 align-top">
                        <div className="font-semibold">{r.patientName || `مريض #${r.patientId}`}</div>
                        {noteSnippet ? <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{noteSnippet}</div> : null}
                      </td>
                      <td className="px-4 py-3 align-top text-muted-foreground">{r.doctorName || "—"}</td>
                      <td className="px-4 py-3 align-top whitespace-nowrap" dir="ltr">
                        <Badge variant="outline" className="font-normal">
                          {dateLabel}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className="tabular-nums font-medium">{r.itemCount}</span>
                        <span className="text-muted-foreground"> دواء</span>
                      </td>
                      <td className="px-4 py-3 align-top">{statusBadge(st)}</td>
                      <td className="px-4 py-3 text-center align-top">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-9 w-9 p-0"
                          title="عرض وتعديل"
                          onClick={() => setLocation(`/prescription/${r.patientId}`)}
                        >
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
      </div>
    </div>
  );
}
