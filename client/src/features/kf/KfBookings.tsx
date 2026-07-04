import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DateInput } from "@/components/ui/date-input";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { CalendarPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const BOOKING_TYPE_AR: Record<string, string> = {
  consultant: "كشف",
  specialist: "أخصائي",
  lasik: "ليزك",
  external: "خارجي",
  followup: "متابعة",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "border-warning/30 bg-warning/5 text-warning",
  confirmed: "border-primary/30 bg-primary/5 text-primary",
  cancelled: "border-destructive/30 bg-destructive/5 text-destructive",
  completed: "border-success/30 bg-success/5 text-success",
};

const STATUS_AR: Record<string, string> = {
  pending: "بانتظار التأكيد",
  confirmed: "مؤكد",
  cancelled: "ملغي",
  completed: "مكتمل",
};

export default function KfBookings() {
  const [dateFilter, setDateFilter] = useState("");
  const utils = trpc.useUtils();

  const bookingsQuery = (trpc as any).patientPortal.listBookings.useQuery(
    { date: dateFilter || undefined, branch: "kfs", limit: 200 },
    { staleTime: 30_000 },
  );

  const del = (trpc as any).patientPortal.deleteBooking.useMutation({
    onSuccess: async () => {
      await (utils as any).patientPortal.listBookings.invalidate();
      toast.success("تم حذف الحجز");
    },
    onError: () => toast.error("تعذر الحذف"),
  });

  const bookings = (bookingsQuery.data ?? []) as any[];

  return (
    <section dir="rtl" className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white">
          <CalendarPlus className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">حجوزات فرع كفر الشيخ</h1>
          <p className="text-sm text-muted-foreground">
            حجوزات بوابة المرضى الخاصة بفرع كفر الشيخ فقط
          </p>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200/60 dark:border-slate-800/60">
        <CardHeader className="py-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-800/50 rounded-t-xl">
          <CardTitle className="text-sm font-semibold">تصفية بالتاريخ</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4 items-end pt-4">
          <div className="space-y-1 flex-1 max-w-xs">
            <label htmlFor="kfBookingDate" className="text-xs text-muted-foreground font-medium">
              التاريخ
            </label>
            <DateInput
              id="kfBookingDate"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
          {dateFilter ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setDateFilter("")}>
              كل التواريخ
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {bookingsQuery.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center px-4 py-12 text-center text-sm text-muted-foreground">
          لا توجد حجوزات لفرع كفر الشيخ
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bookings.map((booking) => {
            const name = booking.patientName ?? booking.guestName ?? "—";
            const code = booking.patientCode ?? (booking.isGuest ? "زائر" : "جديد");
            const type = BOOKING_TYPE_AR[booking.bookingType] ?? booking.typeLabel ?? booking.bookingType;
            const stStyle = STATUS_STYLE[booking.status] ?? STATUS_STYLE.completed;
            const stAr = STATUS_AR[booking.status] ?? booking.status;
            return (
              <div key={booking.id} className={cn("rounded-xl border p-3 shadow-sm", stStyle)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {code} · {type} · {new Date(booking.requestedDate).toLocaleDateString("ar-EG")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", stStyle)}>
                      {stAr}
                    </span>
                    <button
                      type="button"
                      disabled={del.isPending}
                      onClick={() => del.mutate({ id: booking.id })}
                      className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                      aria-label="حذف الحجز"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {booking.staffNotes ? (
                  <p className="mt-2 truncate text-xs text-muted-foreground">{booking.staffNotes}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
