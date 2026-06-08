import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { arEG } from "date-fns/locale";
import { CalendarDays, ClipboardList, RefreshCw, ShieldAlert, ArrowLeft } from "lucide-react";
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
  specialist: "كشف أو مقاس نظارة",
  lasik: "الفحوصات الخاصة بعمليات تصحيح الإبصار",
  external: "أشعة بنتاكام للقرنية",
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
    <div className="min-h-screen flex flex-col bg-[#F4F8FB] text-foreground font-sans selection:bg-secondary/20 selection:text-secondary-foreground" dir="rtl">
      
      {/* Sticky top header bar */}
      <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-[#e2edf7] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          
          {/* Logo & Portal title */}
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-[#F4F8FB] border border-[#e2edf7] rounded-xl">
              <BrandLogo className="size-8 object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-primary leading-tight">مركز عيون الشروق</h1>
              <p className="text-[10px] font-semibold text-secondary uppercase tracking-wider">بوابة المرضى الإلكترونية</p>
            </div>
          </div>

          {/* Back to login button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/my/login")}
            className="rounded-xl hover:bg-muted/50 text-muted-foreground cursor-pointer flex items-center gap-2 h-10 px-3.5"
          >
            <ArrowLeft className="size-4" />
            <span>العودة للدخول</span>
          </Button>
        </div>
      </header>

      {/* Main layout container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 md:py-8 flex flex-col gap-6">
        
        {/* Title bar */}
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-primary">حجز موعد كزائر جديد 📅</h2>
          <p className="text-xs text-muted-foreground">لمن لا يملك ملفاً طبياً مسجلاً حالياً بالمركز، يمكنك تقديم طلب الحجز مباشرة.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          
          {/* Form Content Column */}
          <div className="space-y-4">
            
            {/* 1. Guest Personal Details */}
            <div className="bg-white border border-[#dbe7f4] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="border-b border-[#f0f5fa] pb-2">
                <h3 className="text-sm font-bold text-foreground">1. البيانات الشخصية للزائر</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">الاسم الكامل للزائر</label>
                  <Input
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="الاسم كما هو في البطاقة"
                    className="h-11 rounded-xl border-[#d7e2ee] focus-visible:ring-primary/10"
                    dir="rtl"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">رقم الموبايل للتواصل</label>
                  <Input
                    type="tel"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="h-11 rounded-xl border-[#d7e2ee] focus-visible:ring-primary/10 text-left font-medium tracking-wide"
                    dir="ltr"
                    autoComplete="tel"
                  />
                </div>
              </div>
            </div>

            {/* 2. Booking Type */}
            <div className="bg-white border border-[#dbe7f4] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="border-b border-[#f0f5fa] pb-2">
                <h3 className="text-sm font-bold text-foreground">2. نوع الحجز والخدمة</h3>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
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
                        "rounded-xl border px-3.5 py-3 text-right transition-all duration-200 cursor-pointer",
                        active
                          ? "border-primary bg-primary/5 text-foreground shadow-xs"
                          : "border-border bg-background text-muted-foreground hover:bg-muted/30 hover:text-foreground",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-foreground">{item.label}</p>
                          <p className="text-[10px] text-muted-foreground leading-normal">{TYPE_HINTS[item.value]}</p>
                        </div>
                        {active && <PortalStatusBadge status="confirmed" label="محدد" className="bg-primary text-primary-foreground text-[10px]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Available Calendar Dates */}
            <div className="bg-white border border-[#dbe7f4] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="border-b border-[#f0f5fa] pb-2">
                <h3 className="text-sm font-bold text-foreground">3. تاريخ الحجز المفضل</h3>
              </div>

              {loadingDates && <PortalLoadingRows rows={3} />}

              {error && (
                <PortalEmptyState
                  icon={<ShieldAlert className="size-5" />}
                  title="تعذر تحميل المواعيد المتاحة"
                  description={error.message}
                  action={
                    <Button onClick={() => void refetch()} className="gap-2 cursor-pointer">
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
                  description="يمكنك تغيير نوع الفحص أو مراجعة الاستقبال هاتفياً."
                />
              )}

              {!loadingDates && schedule && availableCount > 0 && (
                <div className="space-y-4">
                  <div className="mx-auto w-full max-w-full overflow-hidden rounded-2xl border border-[#dbe7f4] bg-[#f8fbff] p-2 sm:max-w-[22rem] sm:p-4">
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
                  <div className="flex items-center justify-center gap-2.5 text-xs font-semibold">
                    {bookingType === "consultant" && (
                      <>
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700 ring-1 ring-red-200">كفرالشيخ</span>
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700 ring-1 ring-blue-200">طنطا</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 4. Notes */}
            <div className="bg-white border border-[#dbe7f4] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="border-b border-[#f0f5fa] pb-2">
                <h3 className="text-sm font-bold text-foreground">4. ملاحظات وتوجيهات إضافية</h3>
              </div>
              <Textarea
                rows={4}
                value={notes}
                placeholder="أكتب أي تفاصيل أخرى أو شكوى طبية تريد إبلاغ العيادة بها..."
                onChange={(e) => setNotes(e.target.value)}
                className="resize-none rounded-xl border-[#d7e2ee] focus-visible:ring-primary/10"
              />
            </div>

          </div>

          {/* Booking Summary Sidebar Column */}
          <div className="space-y-4">
            <div className="bg-white border border-[#dbe7f4] rounded-2xl p-5 shadow-xs space-y-4">
              
              <div className="border-b border-[#f0f5fa] pb-2">
                <h3 className="text-sm font-bold text-foreground">ملخص طلب الحجز كزائر</h3>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#f0f5fa] py-2 last:border-0">
                  <span className="text-xs text-muted-foreground font-semibold">الاسم</span>
                  <span className="text-xs font-bold text-foreground truncate max-w-[150px]">{guestName.trim() || "غير مدخل"}</span>
                </div>
                <div className="flex items-center justify-between border-b border-[#f0f5fa] py-2 last:border-0">
                  <span className="text-xs text-muted-foreground font-semibold">رقم الموبايل</span>
                  <span className="text-xs font-bold text-foreground tracking-wide">{guestPhone.trim() || "غير مدخل"}</span>
                </div>
                <div className="flex items-center justify-between border-b border-[#f0f5fa] py-2 last:border-0">
                  <span className="text-xs text-muted-foreground font-semibold">نوع الحجز</span>
                  <span className="text-xs font-bold text-foreground">{schedule?.label ?? bookingType}</span>
                </div>
                <div className="flex items-center justify-between border-b border-[#f0f5fa] py-2 last:border-0">
                  <span className="text-xs text-muted-foreground font-semibold">تاريخ اليوم المختار</span>
                  <span className="text-xs font-bold text-primary">{selectedLabel ? formatArabicDate(selectedLabel) : "لم يتم الاختيار بعد"}</span>
                </div>
              </div>

              {notes.trim() && (
                <div className="rounded-xl border border-border bg-[#F4F8FB]/30 p-3.5 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-muted-foreground">
                    <ClipboardList className="size-4 shrink-0 text-primary" />
                    <span>ملاحظتك المرفقة:</span>
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">{notes.trim()}</p>
                </div>
              )}

              <div className="rounded-xl border border-[#e2edf7] bg-[#F4F8FB]/60 p-3.5 text-xs text-muted-foreground space-y-1 leading-5">
                <p className="font-semibold text-primary">تنبيه هام:</p>
                <p>بعد إرسال طلب الحجز بنجاح، سيتواصل معك الاستقبال هاتفياً لتأكيد وتحديد توقيت الزيارة بدقة وتسجيل ملفك الطبي الجديد.</p>
              </div>

              <Button
                className="w-full h-12 text-base font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-colors rounded-xl shadow-xs cursor-pointer gap-2 mt-4"
                onClick={handleSubmit}
                disabled={!selectedDate || !guestName.trim() || guestPhone.trim().length < 8 || createGuestBooking.isPending}
              >
                {createGuestBooking.isPending ? "جاري إرسال الحجز..." : "تأكيد وإرسال طلب الحجز"}
              </Button>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
