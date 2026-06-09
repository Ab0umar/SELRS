import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { arEG } from "date-fns/locale";
import {
  CalendarDays,
  ClipboardList,
  RefreshCw,
  ShieldAlert,
  ArrowLeft,
} from "lucide-react";
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
  formatCaption: (date: Date) =>
    date.toLocaleDateString("ar-EG", { month: "long", year: "numeric" }),
  formatDay: (date: Date) =>
    date.toLocaleDateString("ar-EG", { day: "numeric" }),
  formatWeekdayName: (date: Date) =>
    date.toLocaleDateString("ar-EG", { weekday: "short" }),
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
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [errors, setErrors] = useState<{
    guestName?: string;
    guestPhone?: string;
  }>({});
  const [bookingType, setBookingType] =
    useState<(typeof TYPES)[number]["value"]>("consultant");
  const [selectedDate, setSelectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  const {
    data: schedule,
    isLoading: loadingDates,
    error,
    refetch,
  } = trpc.patientPortal.getAvailableDates.useQuery({
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
  const availableDateSet = useMemo(
    () => new Set(availableDates),
    [availableDates],
  );
  const availableCount = availableDates.length;
  const selectedLabel = useMemo(
    () => availableDates.find((d) => d === selectedDate),
    [availableDates, selectedDate],
  );
  const minDate = useMemo(
    () => (availableDates[0] ? isoToDate(availableDates[0]) : undefined),
    [availableDates],
  );
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

  const handleNextStep1 = () => {
    const newErrors: typeof errors = {};
    if (!guestName.trim()) {
      newErrors.guestName = "يرجى كتابة الاسم الكامل كما بالبطاقة";
    }
    const cleanPhone = guestPhone.trim();
    if (!cleanPhone) {
      newErrors.guestPhone = "يرجى كتابة رقم الموبايل للتواصل";
    } else if (!/^01\d{9}$/.test(cleanPhone)) {
      newErrors.guestPhone =
        "يرجى إدخال رقم موبايل مصري صحيح من 11 رقماً يبدأ بـ 01";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("يرجى مراجعة وتصحيح البيانات الشخصية أولاً");
      return;
    }

    setStep(2);
  };

  const handleNextStep2 = () => {
    setStep(3);
  };

  const handleNextStep3 = () => {
    if (!selectedDate) {
      toast.error("يجب اختيار اليوم المفضل من التقويم للمتابعة");
      return;
    }
    setStep(4);
  };

  const handleSubmit = () => {
    if (!guestName.trim()) {
      toast.error("اكتب الاسم الكامل");
      setStep(1);
      return;
    }
    if (!/^01\d{9}$/.test(guestPhone.trim())) {
      toast.error("اكتب رقم موبايل صحيح");
      setStep(1);
      return;
    }
    if (!selectedDate) {
      toast.error("اختر تاريخ الحجز");
      setStep(3);
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
    <div
      className="min-h-screen flex flex-col bg-[#F4F8FB] text-foreground font-sans selection:bg-secondary/20 selection:text-secondary-foreground"
      dir="rtl"
    >
      {/* Sticky top header bar */}
      <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-[#e2edf7] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo & Portal title */}
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-[#F4F8FB] border border-[#e2edf7] rounded-xl">
              <BrandLogo className="size-8 object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-primary leading-tight">
                مركز عيون الشروق
              </h1>
              <p className="text-[10px] font-semibold text-secondary uppercase tracking-wider">
                بوابة المرضى الإلكترونية
              </p>
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

      {/* Committed Cover Banner */}
      <div className="w-full bg-gradient-to-r from-[#003D82] via-[#0b4e96] to-secondary/80 text-white py-6 px-4 shadow-xs">
        <div className="max-w-xl mx-auto text-center space-y-1">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            طلب حجز موعد كزائر جديد 📅
          </h2>
          <p className="text-[11px] text-white/80 max-w-md mx-auto leading-relaxed">
            لمن لا يملك ملفاً طبياً مسجلاً حالياً بالمركز، يمكنك حجز موعدك
            بسهولة.
          </p>
        </div>
      </div>

      {/* Main layout container */}
      <div className="flex-grow flex flex-col items-center">
        <div className="w-full max-w-xl px-4 py-6 md:py-8 space-y-5 flex flex-col items-stretch">
          {/* Progress Stepper */}
          <div className="space-y-2 bg-white border border-[#dbe7f4] rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
              <span>
                {step === 1 && "الخطوة 1 من 4: البيانات 👤"}
                {step === 2 && "الخطوة 2 من 4: الخدمة 🩺"}
                {step === 3 && "الخطوة 3 من 4: اليوم والوقت 📅"}
                {step === 4 && "الخطوة 4 من 4: مراجعة وملاحظات وإرسال 📝"}
              </span>
              <span
                className={step === 4 ? "text-emerald-600" : "text-primary"}
              >
                {step === 1 && "25% مكتمل"}
                {step === 2 && "50% مكتمل"}
                {step === 3 && "75% مكتمل"}
                {step === 4 && "100% مكتمل"}
              </span>
            </div>
            <div className="h-1.5 w-full bg-[#e2edf7] rounded-full overflow-hidden">
              <div
                className={`h-full bg-primary rounded-full transition-all duration-500 ${
                  step === 1
                    ? "w-1/4"
                    : step === 2
                      ? "w-1/2"
                      : step === 3
                        ? "w-3/4"
                        : "w-full bg-emerald-500"
                }`}
              />
            </div>
          </div>

          {step === 1 && (
            /* Step 1: Personal Details Card */
            <div className="bg-white border border-[#dbe7f4] rounded-2xl p-5 shadow-xs space-y-5">
              <div className="border-b border-[#f0f5fa] pb-2">
                <h3 className="text-sm font-bold text-foreground">
                  بيانات الزائر
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  يرجى كتابة الاسم ورقم الهاتف بشكل صحيح لتسجيل ملفك.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    الاسم الكامل للزائر
                  </label>
                  <Input
                    value={guestName}
                    onChange={(e) => {
                      setGuestName(e.target.value);
                      if (errors.guestName)
                        setErrors((prev) => ({
                          ...prev,
                          guestName: undefined,
                        }));
                    }}
                    placeholder="الاسم ثلاثي أو رباعي كما بالبطاقة"
                    className={`h-11 rounded-xl border-[#d7e2ee] focus-visible:ring-primary/10 transition-all ${
                      errors.guestName
                        ? "border-destructive focus-visible:ring-destructive/10 bg-destructive/5"
                        : guestName.trim()
                          ? "border-emerald-500 focus-visible:ring-emerald-500/10 bg-emerald-50/5"
                          : ""
                    }`}
                    dir="rtl"
                  />
                  {errors.guestName && (
                    <p className="text-xs text-destructive font-semibold mt-1">
                      {errors.guestName}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    رقم الموبايل للتواصل
                  </label>
                  <Input
                    type="tel"
                    value={guestPhone}
                    onChange={(e) => {
                      setGuestPhone(e.target.value);
                      if (errors.guestPhone)
                        setErrors((prev) => ({
                          ...prev,
                          guestPhone: undefined,
                        }));
                    }}
                    placeholder="01XXXXXXXXX"
                    className={`h-11 rounded-xl border-[#d7e2ee] focus-visible:ring-primary/10 text-left font-medium tracking-wide transition-all ${
                      errors.guestPhone
                        ? "border-destructive focus-visible:ring-destructive/10 bg-destructive/5"
                        : /^01\d{9}$/.test(guestPhone.trim())
                          ? "border-emerald-500 focus-visible:ring-emerald-500/10 bg-emerald-50/5"
                          : ""
                    }`}
                    dir="ltr"
                    autoComplete="tel"
                  />
                  {errors.guestPhone && (
                    <p className="text-xs text-destructive font-semibold mt-1">
                      {errors.guestPhone}
                    </p>
                  )}
                </div>
              </div>

              <Button
                className="w-full h-11 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-xl shadow-xs cursor-pointer mt-2"
                onClick={handleNextStep1}
              >
                التالي: الخدمة
              </Button>
            </div>
          )}

          {step === 2 && (
            /* Step 2: Service Selection Card */
            <div className="bg-white border border-[#dbe7f4] rounded-2xl p-5 shadow-xs space-y-5">
              <div className="border-b border-[#f0f5fa] pb-2">
                <h3 className="text-sm font-bold text-foreground">
                  الخدمة المطلوبة
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  اختر الفحص المطلوب لتحديد موعدك المناسب.
                </p>
              </div>

              <div className="grid gap-2.5">
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
                        "rounded-xl border px-4 py-3 text-right transition-all duration-200 cursor-pointer w-full",
                        active
                          ? "border-primary bg-primary/5 text-foreground shadow-xs font-bold"
                          : "border-border bg-background text-muted-foreground hover:bg-muted/30 hover:text-foreground",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-foreground">
                            {item.label}
                          </p>
                          <p className="text-[10px] text-muted-foreground leading-normal">
                            {TYPE_HINTS[item.value]}
                          </p>
                        </div>
                        {active && (
                          <PortalStatusBadge
                            status="confirmed"
                            label="محدد"
                            className="bg-primary text-primary-foreground text-[10px]"
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 h-11 text-xs font-bold border-[#d7e2ee] rounded-xl cursor-pointer"
                  onClick={() => setStep(1)}
                >
                  السابق
                </Button>
                <Button
                  className="flex-[2] h-11 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-xl shadow-xs cursor-pointer"
                  onClick={handleNextStep2}
                >
                  التالي: اليوم والوقت
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            /* Step 3: Date Picker Card */
            <div className="bg-white border border-[#dbe7f4] rounded-2xl p-5 shadow-xs space-y-5">
              <div className="border-b border-[#f0f5fa] pb-2">
                <h3 className="text-sm font-bold text-foreground">
                  اليوم والوقت
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  التواريخ المظللة باللون الفاتح هي المتاحة للحجز.
                </p>
              </div>

              {loadingDates && <PortalLoadingRows rows={3} />}

              {error && (
                <PortalEmptyState
                  icon={<ShieldAlert className="size-5" />}
                  title="تعذر تحميل المواعيد المتاحة"
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

              {!loadingDates && schedule && availableCount === 0 && (
                <PortalEmptyState
                  icon={<CalendarDays className="size-5" />}
                  title="لا توجد مواعيد متاحة حالياً"
                  description="يمكنك تغيير نوع الخدمة أو مراجعة الاستقبال هاتفياً."
                />
              )}

              {!loadingDates && schedule && availableCount > 0 && (
                <div className="space-y-4">
                  <div className="mx-auto w-full max-w-full overflow-hidden rounded-2xl border border-[#dbe7f4] bg-[#f8fbff] p-2 sm:max-w-[20rem]">
                    <Calendar
                      mode="single"
                      dir="rtl"
                      locale={arEG}
                      formatters={ARABIC_CALENDAR_FORMATTERS}
                      classNames={MOBILE_SAFE_CALENDAR_CLASS_NAMES}
                      month={calendarMonth}
                      defaultMonth={calendarMonth}
                      selected={
                        selectedDate ? isoToDate(selectedDate) : undefined
                      }
                      onMonthChange={setCalendarMonth}
                      onSelect={(date) => {
                        if (!date) {
                          setSelectedDate("");
                          return;
                        }
                        const next = dateToIso(date);
                        if (availableDateSet.has(next)) setSelectedDate(next);
                      }}
                      disabled={(date) =>
                        !availableDateSet.has(dateToIso(date))
                      }
                      modifiers={{
                        monday: (date) =>
                          bookingType === "consultant" && date.getDay() === 1,
                        consultantTanta: (date) =>
                          bookingType === "consultant" &&
                          isConsultantTantaDay(date),
                      }}
                      modifiersClassNames={{
                        monday:
                          "bg-red-50 text-red-700 [&>button]:bg-red-50 [&>button]:text-red-700 [&>button]:ring-1 [&>button]:ring-red-200",
                        consultantTanta:
                          "bg-blue-50 text-blue-700 [&>button]:bg-blue-50 [&>button]:text-blue-700 [&>button]:ring-1 [&>button]:ring-blue-200",
                      }}
                      fromDate={minDate}
                      toDate={maxDate}
                      className="mx-auto w-full max-w-full p-1 [--cell-size:clamp(1.65rem,8.1vw,2.05rem)] min-[390px]:[--cell-size:clamp(1.85rem,8.4vw,2.2rem)] sm:p-2 sm:[--cell-size:--spacing(7)]"
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs font-semibold">
                    {bookingType === "consultant" && (
                      <>
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700 ring-1 ring-red-200">
                          كفرالشيخ
                        </span>
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700 ring-1 ring-blue-200">
                          طنطا
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 h-11 text-xs font-bold border-[#d7e2ee] rounded-xl cursor-pointer"
                  onClick={() => setStep(2)}
                >
                  السابق
                </Button>
                <Button
                  className="flex-[2] h-11 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-xl shadow-xs cursor-pointer"
                  onClick={handleNextStep3}
                  disabled={!selectedDate}
                >
                  التالي: مراجعة وملاحظات وإرسال
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            /* Step 4: Summary, Notes, and Submission Card */
            <div className="bg-white border border-[#dbe7f4] rounded-2xl p-5 shadow-xs space-y-5">
              <div className="border-b border-[#f0f5fa] pb-2">
                <h3 className="text-sm font-bold text-foreground">
                  مراجعة وملاحظات وإرسال
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  يرجى التأكد من تفاصيل الحجز وإضافة أي ملاحظات قبل التأكيد.
                </p>
              </div>

              {/* Summary table */}
              <div className="space-y-2">
                {[
                  { label: "الاسم الكامل", value: guestName },
                  { label: "رقم الموبايل", value: guestPhone },
                  {
                    label: "نوع الخدمة",
                    value: schedule?.label ?? bookingType,
                  },
                  {
                    label: "اليوم المحدد",
                    value: selectedLabel
                      ? formatArabicDate(selectedLabel)
                      : "غير محدد",
                  },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-[#F4F8FB]/20 px-4 py-2.5"
                  >
                    <span className="text-xs text-muted-foreground font-semibold">
                      {label}
                    </span>
                    <span className="text-xs font-bold text-foreground truncate max-w-[200px]">
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Additional Notes Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  ملاحظات أو شكاوى إضافية (اختياري)
                </label>
                <Textarea
                  rows={3}
                  value={notes}
                  placeholder="أكتب أي تفاصيل أخرى أو شكوى طبية تريد إبلاغ الاستقبال بها..."
                  onChange={(e) => setNotes(e.target.value)}
                  className="resize-none rounded-xl border-[#d7e2ee] focus-visible:ring-primary/10 text-xs"
                />
              </div>

              <div className="rounded-xl border border-[#e2edf7] bg-[#F4F8FB]/60 p-3.5 text-xs text-muted-foreground space-y-1 leading-5">
                <p className="font-semibold text-primary">تنبيه هام:</p>
                <p>
                  بعد إرسال طلب الحجز بنجاح، سيتواصل معك الاستقبال هاتفياً
                  لتأكيد وتحديد توقيت الزيارة بدقة وتسجيل ملفك الطبي الجديد.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 h-11 text-xs font-bold border-[#d7e2ee] rounded-xl cursor-pointer"
                  onClick={() => setStep(3)}
                  disabled={createGuestBooking.isPending}
                >
                  السابق
                </Button>
                <Button
                  className="flex-[2] h-11 text-xs font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-colors rounded-xl shadow-xs cursor-pointer"
                  onClick={handleSubmit}
                  disabled={createGuestBooking.isPending}
                >
                  {createGuestBooking.isPending
                    ? "جاري الإرسال..."
                    : "تأكيد وإرسال طلب الحجز"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
