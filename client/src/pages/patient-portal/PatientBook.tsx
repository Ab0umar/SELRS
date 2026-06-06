import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { arEG } from "date-fns/locale";
import { CalendarDays, ClipboardList, RefreshCw, ShieldAlert } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
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

const TYPES = [
  { value: "consultant" as const, label: "كشف استشاري" },
  { value: "specialist" as const, label: "كشف أخصائي" },
  { value: "lasik" as const, label: "فحوصات الليزك" },
  { value: "external" as const, label: "أشعة بنتاكام" },
];

const TYPE_HELP: Record<(typeof TYPES)[number]["value"], string> = {
  consultant: "ا.د محمد السعدني غرابه",
  specialist: "كشف او مقاس نظاره",
  lasik: "فحوصات الليزك فقط",
  external: "اشعة بنتاكام فقط",
};

const ARABIC_CALENDAR_FORMATTERS = {
  formatCaption: (date: Date) => date.toLocaleDateString("ar-EG", { month: "long", year: "numeric" }),
  formatDay: (date: Date) => date.toLocaleDateString("ar-EG", { day: "numeric" }),
  formatWeekdayName: (date: Date) => date.toLocaleDateString("ar-EG", { weekday: "short" }),
};

const MOBILE_SAFE_CALENDAR_CLASS_NAMES = {
  root: "w-full max-w-full",
  month: "flex w-full flex-col gap-3",
  months: "flex w-full flex-col",
  table: "w-full border-collapse table-fixed",
  weekdays: "grid w-full grid-cols-7",
  weekday: "min-w-0 text-center text-[0.68rem] min-[380px]:text-xs",
  week: "grid w-full grid-cols-7 gap-0.5 min-[380px]:gap-1",
  day: "min-w-0",
};

function isConsultantTantaDay(date: Date) {
  return [0, 2, 3].includes(date.getDay());
}

function isoToDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function dateToIso(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function PatientBook() {
  const [, navigate] = useLocation();
  const [bookingType, setBookingType] = useState<(typeof TYPES)[number]["value"]>("consultant");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  const { data: schedule, isLoading: loadingDates, error, refetch } = trpc.patientPortal.getAvailableDates.useQuery({
    bookingType,
  });

  const createBooking = trpc.patientPortal.createBooking.useMutation({
    onSuccess: () => {
      toast.success("تم إرسال طلب الحجز بنجاح");
      navigate("/my/bookings");
    },
    onError: (e) => toast.error(e.message),
  });

  const availableDates = useMemo(() => schedule?.dates ?? [], [schedule]);
  const availableDateSet = useMemo(() => new Set(availableDates), [availableDates]);
  const availableCount = availableDates.length;
  const selectedLabel = useMemo(() => availableDates.find((d) => d === selectedDate), [availableDates, selectedDate]);
  const minDate = useMemo(() => (availableDates[0] ? isoToDate(availableDates[0]) : undefined), [availableDates]);
  const maxDate = useMemo(() => {
    const last = availableDates[availableDates.length - 1];
    return last ? isoToDate(last) : undefined;
  }, [availableDates]);

  useEffect(() => {
    if (selectedDate) {
      setCalendarMonth(isoToDate(selectedDate));
      return;
    }
    if (availableDates[0]) {
      setCalendarMonth(isoToDate(availableDates[0]));
    }
  }, [availableDates, selectedDate]);

  const handleSubmit = () => {
    if (!selectedDate) {
      toast.error("اختر تاريخ الحجز");
      return;
    }
    createBooking.mutate({ bookingType, requestedDate: selectedDate, notes: notes.trim() || undefined });
  };

  return (
    <PatientLayout>
      <PortalShell title="حجز موعد جديد">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <PortalPanel title="1. نوع الحجز">
              <div className="grid gap-2 sm:grid-cols-2">
                {TYPES.map((item) => {
                  const active = bookingType === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => {
                        setBookingType(item.value);
                        setSelectedDate("");
                      }}
                      className={[
                        "rounded-xl border px-3 py-3 text-right transition-colors",
                        active
                          ? "border-primary bg-primary/5 text-foreground shadow-sm"
                          : "border-border bg-background text-muted-foreground hover:bg-muted/30 hover:text-foreground",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{item.label}</p>
                          <p className="mt-1 text-xs leading-5">{TYPE_HELP[item.value]}</p>
                        </div>
                        {active && <PortalStatusBadge status="confirmed" label="محدد" className="bg-primary text-primary-foreground" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </PortalPanel>

            <PortalPanel>
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-foreground">2. التاريخ المتاح</h2>
              </div>
              {loadingDates && <PortalLoadingRows rows={3} />}

              {error && (
                <PortalEmptyState
                  icon={<ShieldAlert className="size-5" />}
                  title="تعذر تحميل المواعيد المتاحة"
                  description={error.message}
                  action={
                    <Button onClick={() => void refetch()} className="gap-2">
                      <RefreshCw className="size-4" />
                      إعادة المحاولة
                    </Button>
                  }
                />
              )}

              {!loadingDates && schedule && availableCount === 0 && (
                <PortalEmptyState
                  icon={<CalendarDays className="size-5" />}
                  title="لا توجد مواعيد متاحة حالياً"
                />
              )}

              {!loadingDates && schedule && availableCount > 0 && (
                <div className="space-y-3">
                  <div className="mx-auto w-full max-w-full overflow-hidden rounded-[1.25rem] border border-[#dbe7f4] bg-[#f8fbff] p-1 sm:max-w-[21rem] sm:p-3">
                    <Calendar
                      mode="single"
                      dir="rtl"
                      locale={arEG}
                      formatters={ARABIC_CALENDAR_FORMATTERS}
                      classNames={MOBILE_SAFE_CALENDAR_CLASS_NAMES}
                      month={calendarMonth}
                      defaultMonth={calendarMonth}
                      selected={selectedDate ? isoToDate(selectedDate) : undefined}
                      onMonthChange={setCalendarMonth}
                      onSelect={(date) => {
                        if (!date) {
                          setSelectedDate("");
                          return;
                        }
                        const next = dateToIso(date);
                        if (availableDateSet.has(next)) setSelectedDate(next);
                      }}
                      disabled={(date) => !availableDateSet.has(dateToIso(date))}
                      modifiers={{
                        monday: (date) => bookingType === "consultant" && date.getDay() === 1,
                        consultantTanta: (date) => bookingType === "consultant" && isConsultantTantaDay(date),
                      }}
                      modifiersClassNames={{
                        monday: "bg-red-50 text-red-700 [&>button]:bg-red-50 [&>button]:text-red-700 [&>button]:ring-1 [&>button]:ring-red-200",
                        consultantTanta: "bg-blue-50 text-blue-700 [&>button]:bg-blue-50 [&>button]:text-blue-700 [&>button]:ring-1 [&>button]:ring-blue-200",
                      }}
                      fromDate={minDate}
                      toDate={maxDate}
                      className="mx-auto w-full max-w-full p-1 [--cell-size:clamp(1.65rem,8.1vw,2.05rem)] min-[390px]:[--cell-size:clamp(1.85rem,8.4vw,2.2rem)] sm:p-2 sm:[--cell-size:--spacing(7)]"
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs font-medium">
                    {bookingType === "consultant" && (
                      <>
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700 ring-1 ring-red-200">كفرالشيخ</span>
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700 ring-1 ring-blue-200">طنطا</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </PortalPanel>

            <PortalPanel title="3. ملاحظاتك">
              <Textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="resize-none"
              />
            </PortalPanel>
          </div>

          <div className="space-y-4">
            <PortalPanel title="ملخص الحجز">
              <div className="space-y-3">
                <PortalMetric label="نوع الحجز" value={schedule?.label ?? bookingType} tone="orange" />
                <PortalMetric label="اليوم المحدد" value={selectedLabel ? formatArabicDate(selectedLabel) : "لم يتم اختيار تاريخ"} tone="blue" />
                <PortalMetric label="عدد الأيام المتاحة" value={availableCount || "0"} tone="neutral" />
              </div>

              <div className="mt-4 rounded-xl border border-border bg-muted/20 p-3">
                <div className="flex items-start gap-3">
                  <ClipboardList className="mt-0.5 size-4 text-primary" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">الملاحظات</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {notes.trim() || "لا توجد ملاحظات مضافة"}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                className="mt-4 h-11 w-full gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                onClick={handleSubmit}
                disabled={!selectedDate || createBooking.isPending}
              >
                {createBooking.isPending ? "جاري الإرسال..." : "إرسال طلب الحجز"}
              </Button>
            </PortalPanel>
          </div>
        </div>
      </PortalShell>
    </PatientLayout>
  );
}
