import {
  CalendarDays,
  ClipboardList,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  TicketCheck,
  ArrowLeft,
} from "lucide-react";
import { useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import PatientLayout from "./PatientLayout";
import {
  PortalEmptyState,
  PortalLoadingRows,
  PortalStatusBadge,
  formatArabicDate,
} from "./portal-ui";

const STATUS_META: Record<
  string,
  { label: string; tone: "pending" | "confirmed" | "cancelled" | "completed" }
> = {
  pending: { label: "قيد المراجعة", tone: "pending" },
  confirmed: { label: "مؤكد", tone: "confirmed" },
  cancelled: { label: "ملغي", tone: "cancelled" },
  completed: { label: "مكتمل", tone: "completed" },
};

export default function PatientBookings() {
  const { data, isLoading, error, refetch } =
    trpc.patientPortal.getMyBookings.useQuery();

  const summary = useMemo(() => {
    const bookings = data ?? [];
    return {
      total: bookings.length,
      pending: bookings.filter((item: any) => item.status === "pending").length,
      confirmed: bookings.filter((item: any) => item.status === "confirmed").length,
      completed: bookings.filter((item: any) => item.status === "completed").length,
    };
  }, [data]);

  const handleBack = () => {
    window.location.href = "/my/file";
  };

  return (
    <PatientLayout>
      <div className="space-y-6">
        {/* Title Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-primary">
              مواعيدي وحجوزاتي 🗓️
            </h2>
            <p className="text-xs text-muted-foreground">
              تابع حالة طلبات الحجز الحالية وتاريخ زياراتك السابقة للمركز.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-[#d8e4f1] bg-white text-primary hover:bg-[#f7fbff] cursor-pointer"
            onClick={handleBack}
          >
            <ArrowLeft className="size-4" />
            رجوع
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_1.9fr]">
          {/* Summary Column */}
          <div className="space-y-4">
            {/* Quick Summary Card */}
            <div className="bg-white border border-[#dbe7f4] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="border-b border-[#f0f5fa] pb-2">
                <h3 className="text-sm font-bold text-foreground">
                  ملخص حالة الحجوزات
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-primary/8 border border-primary/15 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-primary font-bold">
                    الحجوزات المؤكدة
                  </p>
                  <p className="text-xl font-black text-foreground mt-1">
                    {summary.confirmed}
                  </p>
                </div>
                <div className="bg-secondary/8 border border-secondary/15 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-primary font-bold">
                    قيد الانتظار
                  </p>
                  <p className="text-xl font-black text-foreground mt-1">
                    {summary.pending}
                  </p>
                </div>
                <div className="bg-[#F4F8FB] border border-[#e2edf7] rounded-xl p-3 text-center col-span-2">
                  <p className="text-[10px] text-muted-foreground font-semibold">
                    إجمالي الزيارات والطلبات
                  </p>
                  <p className="text-lg font-black text-foreground mt-0.5">
                    {summary.total}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Booking Call-to-action */}
            <div className="bg-white border border-[#dbe7f4] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-start gap-3">
                <div className="size-9 rounded-xl bg-muted/40 text-muted-foreground flex items-center justify-center shrink-0">
                  <Sparkles className="size-4.5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">
                    حجز موعد جديد
                  </p>
                  <p className="text-xs leading-5 text-muted-foreground">
                    تصفح التواريخ المتاحة للأطباء والاستشاريين وارسل طلب حجز
                    فوري.
                  </p>
                </div>
              </div>
              <Button
                asChild
                className="w-full h-11 text-sm font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-colors rounded-xl shadow-xs cursor-pointer gap-2"
              >
                <Link href="/my/book">
                  <CalendarDays className="size-4.5" />
                  <span>البدء في طلب حجز موعد</span>
                </Link>
              </Button>
            </div>
          </div>

          {/* Bookings List Column */}
          <div className="space-y-4">
            {isLoading && <PortalLoadingRows rows={4} />}

            {error && (
              <PortalEmptyState
                icon={<ShieldAlert className="size-5" />}
                title="تعذر تحميل المواعيد"
                description={error.message}
                action={
                  <Button
                    onClick={() => void refetch()}
                    className="gap-2 cursor-pointer"
                  >
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
                description="لم تسجل أي طلبات حجز بعد في ملفك الطبي. يمكنك البدء بحجز موعد جديد."
              />
            )}

            {data && data.length > 0 && (
              <div className="space-y-4">
                {data.map((item: any) => {
                  const meta = STATUS_META[item.status] ?? STATUS_META.pending;
                  return (
                    <div
                      key={item.id}
                      className="bg-white border border-[#dbe7f4] rounded-2xl p-5 shadow-xs space-y-4"
                    >
                      {/* Top title & status badge */}
                      <div className="flex items-center justify-between border-b border-[#f0f5fa] pb-2">
                        <div className="space-y-0.5">
                          <h4 className="text-sm font-bold text-foreground">
                            {item.typeLabel}
                          </h4>
                          <p className="text-[10px] text-muted-foreground">
                            طلب حجز رقم #{item.id}
                          </p>
                        </div>
                        <PortalStatusBadge
                          status={item.status}
                          label={meta.label}
                        />
                      </div>

                      {/* Booking dates info grid */}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="bg-[#F4F8FB] border border-[#e2edf7] rounded-xl p-3 space-y-0.5">
                          <p className="text-[10px] text-muted-foreground font-semibold">
                            تاريخ الطلب المفضل
                          </p>
                          <p className="text-xs font-bold text-foreground">
                            {formatArabicDate(item.requestedDate)}
                          </p>
                        </div>

                        {item.confirmedDate ? (
                          <div className="bg-primary/8 border border-primary/15 rounded-xl p-3 space-y-0.5">
                            <p className="text-[10px] text-primary font-bold">
                              الموعد المؤكد النهائي
                            </p>
                            <p className="text-xs font-black text-foreground">
                              {formatArabicDate(item.confirmedDate)}
                            </p>
                          </div>
                        ) : (
                          <div className="bg-secondary/8 border border-secondary/15 rounded-xl p-3 space-y-0.5">
                            <p className="text-[10px] text-primary font-bold">
                              تأكيد الموعد
                            </p>
                            <p className="text-xs font-bold text-foreground font-sans">
                              بانتظار الاستقبال
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Notes & staff notes */}
                      <div className="space-y-2">
                        {item.notes && (
                          <div className="rounded-xl border border-border bg-[#F4F8FB]/30 p-3.5 text-xs leading-5">
                            <p className="font-bold text-foreground mb-0.5">
                              ملاحظتك للطلب:
                            </p>
                            <p className="text-muted-foreground">
                              {item.notes}
                            </p>
                          </div>
                        )}

                        {item.staffNotes && (
                          <div className="rounded-xl border border-secondary/20 bg-secondary/5 p-3.5 text-xs leading-5">
                            <div className="flex items-start gap-2 text-primary font-bold mb-1">
                              <ClipboardList className="size-4 shrink-0" />
                              <span>ملاحظة موظف الاستقبال:</span>
                            </div>
                            <p className="text-[#995C00] pr-6">
                              {item.staffNotes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </PatientLayout>
  );
}
