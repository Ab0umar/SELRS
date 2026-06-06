import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { arEG } from "date-fns/locale";
import { CalendarDays, ClipboardList, RefreshCw, ShieldAlert, UserRound } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { BrandLogo } from "@/components/BrandLogo";
import {
  PortalEmptyState,
  PortalLoadingRows,
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
  { value: "followup" as const, label: "متابعة" },
];

const TYPE_HINTS: Record<(typeof TYPES)[number]["value"], string> = {
  consultant: "ا.د محمد السعدني غرابه",
  specialist: "كشف او مقاس نظاره",
  lasik: "الفحوصات الخاصه بعمليات تصحيح الابصار",
  external: "",
  followup: "لمراجعة ما بعد الزيارة",
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

export default function PatientGuestBook() {
  const [, navigate] = useLocation();
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [bookingType, setBookingType] = useState<(typeof TYPES)[number]["value"]>("consultant");
  const [selectedDate, setSelectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  const { data: schedule, isLoading: loadingDates, error, refetch } = trpc.patientPortal.getAvailableDates.useQuery({
    bookingType,
  });

  const createGuestBooking = trpc.patientPortal.createGuestBooking.useMutation({
    onSuccess: () => {
      toast.success("تم إرسال طلب الحجز بنجاح");
      navigate("/my/login");
    },
    onError: (e) => toast.error(e.message),
  });

  const availableDates = useMemo(() => schedule?.dates ?? [], [schedule]);
  const availableDateSet = useMemo(() => new Set(availableDates), [availableDates]);
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
    if (!guestName.trim()) {
      toast.error("اكتب الاسم الكامل");
      return;
    }
    if (guestPhone.trim().length < 8) {
      toast.error("اكتب رقم موبايل صحيح");
      return;
    }
    if (!selectedDate) {
      toast.error("اختر تاريخ الحجز");
      return;
    }
    createGuestBooking.mutate({
      guestName: guestName.trim(),
      guestPhone: guestPhone.trim(),
      bookingType,
      requestedDate: selectedDate,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-[#f6f9fd] text-foreground" dir="rtl">
      <div className="mx-auto min-h-screen w-full max-w-none px-0 py-0">
        <div className="overflow-hidden rounded-none border-0 bg-white shadow-none sm:rounded-[2rem] sm:border sm:border-[#dce9f5] sm:shadow-[0_20px_60px_rgba(28,64,104,0.08)]">
          <div className="bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.24),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_28%),linear-gradient(180deg,#002A63_0%,#0F4E93_38%,#DDEAF7_79%,#F8FAFC_100%)] px-4 pb-24 pt-5 text-white sm:px-6 sm:pb-28 lg:px-10 lg:pb-32">
            <div className="mx-auto flex max-w-2xl items-center justify-center gap-4 rounded-[1.5rem] border border-white/10 bg-[#0b3d78]/22 px-5 py-3 text-center text-white shadow-[0_14px_30px_rgba(0,0,0,0.12)] backdrop-blur-[2px]">
              <BrandLogo className="size-10 shrink-0 drop-shadow-[0_4px_10px_rgba(0,0,0,0.16)] sm:size-12" />
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold leading-none sm:text-3xl">مركز عيون الشروق</h1>
                <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.28em] text-white/80">SELRS</p>
              </div>
            </div>
          </div>

          <div className="-mt-20 px-4 pb-6 sm:px-6 sm:pb-8 lg:-mt-24 lg:px-10">
            <div className="mx-auto grid max-w-7xl gap-4">
        <PortalShell
          title="حجز موعد كزائر"
          subtitle="لمن لا يملك ملفاً حالياً، مع نفس تجربة الحجز الواضحة الموجودة داخل البوابة."
        >
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <PortalPanel
                title="بيانات الزائر"
                description="الاسم ورقم الموبايل هما وسيلتا التواصل الأساسيان."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="block text-sm font-medium text-foreground">الاسم الكامل</label>
                    <Input
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="الاسم كما هو في البطاقة"
                      dir="rtl"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="block text-sm font-medium text-foreground">رقم الموبايل</label>
                    <Input
                      type="tel"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      dir="ltr"
                      className="text-left"
                      autoComplete="tel"
                    />
                  </div>
                </div>
              </PortalPanel>

              <PortalPanel
                title="نوع الحجز"
                description="اختر الخدمة الأقرب لطلبك، ثم انتقل للتاريخ المتاح."
              >
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
                            {TYPE_HINTS[item.value] && <p className="mt-1 text-xs leading-5">{TYPE_HINTS[item.value]}</p>}
                          </div>
                          {active && <PortalStatusBadge status="confirmed" label="محدد" className="bg-primary text-primary-foreground" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </PortalPanel>

              <PortalPanel
                title="التاريخ المتاح"
                description="اختر اليوم المناسب من التواريخ المتاحة لهذا النوع من الحجز."
              >
                {loadingDates && <PortalLoadingRows rows={3} />}

                {error && (
                  <PortalEmptyState
                    icon={<ShieldAlert className="size-5" />}
                    title="تعذر تحميل التواريخ"
                    description={error.message}
                    action={
                      <Button onClick={() => void refetch()} className="gap-2">
                        <RefreshCw className="size-4" />
                        إعادة المحاولة
                      </Button>
                    }
                  />
                )}

                {!loadingDates && schedule && schedule.dates.length === 0 && (
                  <PortalEmptyState
                    icon={<CalendarDays className="size-5" />}
                    title="لا توجد مواعيد متاحة حالياً"
                    description="يمكنك تغيير نوع الحجز أو العودة لاحقاً."
                  />
                )}

                {!loadingDates && schedule && schedule.dates.length > 0 && (
                  <div className="space-y-3">
                    <div className="w-full overflow-hidden rounded-[1.25rem] border border-[#dbe7f4] bg-[#f8fbff] p-2 sm:p-3">
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
                        className="w-full p-1 [--cell-size:clamp(2rem,12vw,2.5rem)] sm:p-2 sm:[--cell-size:clamp(2.2rem,6vw,2.75rem)]"
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

              <PortalPanel
                title="ملاحظات إضافية"
                description="اختياري، ويمكن أن يساعد الاستقبال في تجهيز الطلب."
              >
                <Textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أي ملاحظات إضافية..."
                  className="resize-none"
                  dir="rtl"
                />
              </PortalPanel>
            </div>

            <div className="space-y-4">
              <PortalPanel title="ملخص الطلب" description="راجع البيانات قبل الإرسال.">
                <div className="space-y-2" dir="rtl">
                  {[
                    { label: "الاسم", value: guestName || "غير مدخل" },
                    { label: "رقم الموبايل", value: guestPhone || "غير مدخل" },
                    { label: "الخدمة", value: schedule?.label ?? bookingType },
                    { label: "اليوم", value: selectedLabel ? formatArabicDate(selectedLabel) : "لم يتم اختيار يوم" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-2.5">
                      <span className="text-sm text-muted-foreground">{label}</span>
                      <span className="text-sm font-semibold text-foreground">{value}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 rounded-xl border border-border bg-muted/20 p-3" dir="rtl">
                  <div className="flex items-start gap-3">
                    <UserRound className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">حالة الإرسال</p>
                      <p className="text-sm leading-6 text-muted-foreground">
                        بعد الإرسال، سيُسجل الطلب كموعد جديد بحالة قيد المراجعة.
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  className="mt-4 h-11 w-full gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  onClick={handleSubmit}
                  disabled={!selectedDate || createGuestBooking.isPending}
                >
                  {createGuestBooking.isPending ? "جاري الإرسال..." : "إرسال طلب الحجز"}
                </Button>
              </PortalPanel>

              <PortalEmptyState
                icon={<ClipboardList className="size-5" />}
                title="الخطوة التالية"
                description="بعد إرسال الطلب، يمكن متابعة الحالة من صفحة المواعيد إذا تم ربطه بملفك لاحقاً."
              />
            </div>
          </div>
          </PortalShell>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
