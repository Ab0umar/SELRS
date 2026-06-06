import { CalendarDays, ClipboardList, RefreshCw, ShieldAlert, Sparkles, TicketCheck } from "lucide-react";
import { useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import PatientLayout from "./PatientLayout";
import {
  PortalEmptyState,
  PortalLoadingRows,
  PortalMetric,
  PortalPanel,
  PortalShell,
  PortalStatusBadge,
  formatArabicDate,
} from "./portal-ui";

const STATUS_META: Record<string, { label: string; tone: "pending" | "confirmed" | "cancelled" | "completed" }> = {
  pending: { label: "قيد المراجعة", tone: "pending" },
  confirmed: { label: "مؤكد", tone: "confirmed" },
  cancelled: { label: "ملغي", tone: "cancelled" },
  completed: { label: "مكتمل", tone: "completed" },
};

export default function PatientBookings() {
  const { data, isLoading, error, refetch } = trpc.patientPortal.getMyBookings.useQuery();

  const summary = useMemo(() => {
    const bookings = data ?? [];
    return {
      total: bookings.length,
      pending: bookings.filter((item) => item.status === "pending").length,
      confirmed: bookings.filter((item) => item.status === "confirmed").length,
      completed: bookings.filter((item) => item.status === "completed").length,
    };
  }, [data]);

  return (
    <PatientLayout>
      <PortalShell
        title="مواعيدي"
        subtitle="سجل الحجز هنا يظهر الحالة الحالية، الموعد المؤكد إن وُجد، وأي ملاحظات من الاستقبال."
      >
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <PortalPanel title="ملخص سريع" description="نظرة مختصرة على حالة الحجوزات الحالية.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <PortalMetric label="إجمالي الحجوزات" value={summary.total} tone="neutral" />
              <PortalMetric label="قيد المراجعة" value={summary.pending} tone="orange" />
              <PortalMetric label="مؤكدة" value={summary.confirmed} tone="blue" />
              <PortalMetric label="مكتملة" value={summary.completed} tone="neutral" />
            </div>

            <div className="mt-4 rounded-xl border border-border bg-muted/20 p-3">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 size-4 text-primary" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">حجز جديد</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    إذا لم تجد الموعد المطلوب، يمكنك إرسال طلب جديد بسرعة.
                  </p>
                </div>
              </div>
              <Button asChild className="mt-4 w-full gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90">
                <Link href="/my/book">
                  <CalendarDays className="size-4" />
                  حجز موعد جديد
                </Link>
              </Button>
            </div>
          </PortalPanel>

          <PortalPanel title="السجل الكامل" description="آخر الحجوزات أولاً، مع الحالة والتفاصيل المهمة لكل طلب.">
            {isLoading && <PortalLoadingRows rows={4} />}

            {error && (
              <PortalEmptyState
                icon={<ShieldAlert className="size-5" />}
                title="تعذر تحميل المواعيد"
                description={error.message}
                action={
                  <Button onClick={() => void refetch()} className="gap-2">
                    <RefreshCw className="size-4" />
                    إعادة المحاولة
                  </Button>
                }
              />
            )}

            {data && data.length === 0 && (
              <PortalEmptyState
                icon={<TicketCheck className="size-5" />}
                title="لا توجد حجوزات سابقة"
                description="يمكنك إرسال طلب جديد من زر الحجز الموجود في الملخص."
              />
            )}

            {data && data.length > 0 && (
              <div className="space-y-3">
                {data.map((item) => {
                  const meta = STATUS_META[item.status] ?? STATUS_META.pending;
                  return (
                    <div key={item.id} className="rounded-xl border border-border bg-background p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{item.typeLabel}</p>
                            <PortalStatusBadge status={item.status} label={meta.label} />
                          </div>
                          <div className="grid gap-1 text-sm text-muted-foreground">
                            <p>تاريخ الطلب: {formatArabicDate(item.requestedDate)}</p>
                            {item.confirmedDate && <p>الموعد المؤكد: {formatArabicDate(item.confirmedDate)}</p>}
                          </div>
                        </div>
                        <div className="shrink-0 text-left text-xs text-muted-foreground">
                          <p>آخر تحديث</p>
                          <p>{formatArabicDate(item.updatedAt ?? item.createdAt)}</p>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-xl bg-muted/25 p-3">
                          <p className="text-xs text-muted-foreground">الحالة</p>
                          <p className="mt-1 text-sm font-medium text-foreground">{meta.label}</p>
                        </div>
                        <div className="rounded-xl bg-muted/25 p-3">
                          <p className="text-xs text-muted-foreground">ملاحظتك</p>
                          <p className="mt-1 text-sm leading-6 text-foreground">
                            {item.notes || "لا توجد ملاحظات"}
                          </p>
                        </div>
                      </div>

                      {item.staffNotes && (
                        <div className="mt-3 rounded-xl bg-secondary/10 p-3">
                          <div className="flex items-start gap-2">
                            <ClipboardList className="mt-0.5 size-4 shrink-0 text-secondary" />
                            <div>
                              <p className="text-xs font-medium text-foreground">ملاحظة الاستقبال</p>
                              <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.staffNotes}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </PortalPanel>
        </div>
      </PortalShell>
    </PatientLayout>
  );
}
