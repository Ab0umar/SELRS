import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { arEG } from "date-fns/locale";
import { CalendarDays, RefreshCw, ShieldAlert } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { LoginShell, useLoginPalette } from "@/components/auth/LoginShell";
import { cn } from "@/lib/utils";
import { guestBookingContactSchema } from "@shared/guest-booking";
import {
  PortalEmptyState,
  PortalLoadingRows,
  PortalStatusBadge,
  formatArabicDate,
} from "./portal-ui";

const TYPES = [
  { value: "consultant" as const, label: "كشف استشاري" },
  { value: "specialist" as const, label: "كشف أخصائي" },
  { value: "pentacam" as const, label: "بنتاكام" },
  { value: "external" as const, label: "أشعة بنتاكام" },
  { value: "followup" as const, label: "متابعة" },
];

const TYPE_HINTS: Record<(typeof TYPES)[number]["value"], string> = {
  consultant: "ا.د محمد السعدني غرابه",
  specialist: "كشف أو مقاس نظارة",
  pentacam: "فحص البنتاكام",
  external: "أشعة بنتاكام للقرنية",
  followup: "لمراجعة ما بعد الزيارة",
};

const ARABIC_CALENDAR_FORMATTERS = {
  formatCaption: (date: Date) =>
    date.toLocaleDateString("ar-EG", { month: "long", year: "numeric" }),
  formatDay: (date: Date) =>
    date.toLocaleDateString("ar-EG", { day: "numeric" }),
  formatWeekdayName: (date: Date) =>
    ["أحد", "اثن", "ثلا", "أرب", "خمي", "جمع", "سبت"][date.getDay()],
};

const MOBILE_SAFE_CALENDAR_CLASS_NAMES = {
  root: "w-full max-w-full",
  month: "flex w-full flex-col gap-3",
  months: "relative flex w-full flex-col",
  month_grid:
    "block! w-full! min-w-0! max-w-full border-collapse [&_thead]:block [&_tbody]:block [&_th]:p-0! [&_td]:p-0!",
  weekdays: "grid w-full grid-cols-7",
  weekday: "min-w-0 text-center text-[0.68rem] min-[380px]:text-xs",
  week: "grid w-full grid-cols-7 gap-0.5 min-[380px]:gap-1",
  day: "min-w-0",
};

const BRANCHES = [
  { value: "tanta" as const, label: "طنطا" },
  { value: "kfs" as const, label: "كفرالشيخ" },
] as const;
type Branch = "tanta" | "kfs";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const { p, fieldRef, fieldClass } = useLoginPalette();
  const bookingFieldRef = (
    element: HTMLInputElement | HTMLTextAreaElement | null,
  ) => {
    fieldRef(element);
    if (!element) return;
    element.style.setProperty("width", "100%", "important");
    element.style.setProperty("max-width", "100%", "important");
    element.style.setProperty(
      "text-align",
      element.type === "email" ? "left" : "right",
      "important",
    );
  };
  const panelClass = cn("rounded-3xl p-5 sm:p-6 space-y-5", p.panel);
  const nextButtonClass = cn(
    "h-12 rounded-xl text-sm font-bold shadow-md cursor-pointer",
    p.cta,
  );
  const previousButtonClass = cn(
    "flex-1 h-12 rounded-xl text-xs font-bold cursor-pointer",
    p.seg,
    p.label,
  );
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [errors, setErrors] = useState<{
    guestName?: string;
    guestPhone?: string;
    guestEmail?: string;
  }>({});
  const [branch, setBranch] = useState<Branch | null>(null);
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
  } = trpc.patientPortal.getAvailableDates.useQuery(
    { bookingType, branch: branch ?? undefined },
    { enabled: !!branch },
  );

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
    const contact = guestBookingContactSchema.safeParse({
      guestName,
      guestPhone,
    });
    if (!contact.success) {
      newErrors.guestName = contact.error.issues.find(
        (issue) => issue.path[0] === "guestName",
      )?.message;
      newErrors.guestPhone = contact.error.issues.find(
        (issue) => issue.path[0] === "guestPhone",
      )?.message;
    }
    if (guestEmail.trim() && !EMAIL_PATTERN.test(guestEmail.trim())) {
      newErrors.guestEmail = "يرجى إدخال بريد إلكتروني صحيح";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("يرجى مراجعة وتصحيح البيانات الشخصية أولاً");
      return;
    }

    if (contact.success) {
      setGuestName(contact.data.guestName);
      setGuestPhone(contact.data.guestPhone);
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
    const contact = guestBookingContactSchema.safeParse({
      guestName,
      guestPhone,
    });
    if (!contact.success) {
      toast.error(contact.error.issues[0].message);
      setStep(1);
      return;
    }
    if (!selectedDate) {
      toast.error("اختر تاريخ الحجز");
      setStep(3);
      return;
    }
    createGuestBooking.mutate({
      ...contact.data,
      guestEmail: guestEmail.trim() || undefined,
      bookingType,
      branch: branch ?? undefined,
      requestedDate: selectedDate,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <LoginShell
      title="مركز عيون الشروق"
      subtitle="لأمراض القرنية وتصحيح الإبصار"
      headerLink={{ href: "/my/login", label: "العودة للدخول" }}
    >
      <div
        dir="rtl"
        className="patient-guest-booking flex min-w-0 flex-col gap-4 text-right [&_label]:block [&_input]:w-full! [&_textarea]:w-full!"
      >
        <div className="space-y-1">
          <h2 className={cn("m-0 text-xl font-extrabold", p.heading)}>
            طلب حجز موعد كزائر جديد
          </h2>
          <p className={cn("m-0 text-xs leading-relaxed", p.muted)}>
            لمن لا يملك ملفاً طبياً مسجلاً حالياً بالمركز، يمكنك حجز موعدك
            بسهولة.
          </p>
        </div>
        {/* Progress Stepper */}
        <div className={cn("space-y-2 rounded-2xl p-4", p.seg)}>
          <div
            className={cn(
              "flex flex-wrap items-center justify-between gap-2 text-xs font-bold",
              p.muted,
            )}
          >
            <span>
              {step === 1 && "الخطوة 1 من 4: البيانات"}
              {step === 2 && "الخطوة 2 من 4: الخدمة"}
              {step === 3 && "الخطوة 3 من 4: اليوم والوقت"}
              {step === 4 && "الخطوة 4 من 4: مراجعة وملاحظات وإرسال"}
            </span>
            <span className={p.accent}>
              {step === 1 && "25% مكتمل"}
              {step === 2 && "50% مكتمل"}
              {step === 3 && "75% مكتمل"}
              {step === 4 && "100% مكتمل"}
            </span>
          </div>
          <div
            className={cn("h-1.5 w-full rounded-full overflow-hidden", p.seg)}
          >
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                p.cta,
                step === 1
                  ? "w-1/4"
                  : step === 2
                    ? "w-1/2"
                    : step === 3
                      ? "w-3/4"
                      : "w-full",
              )}
            />
          </div>
        </div>

        {step === 1 && (
          /* Step 1: Personal Details Card */
          <div className={panelClass}>
            <div className="border-b border-border/40 pb-2">
              <h3 className={cn("text-sm font-bold", p.heading)}>
                بيانات الزائر
              </h3>
              <p className={cn("text-xs mt-0.5", p.muted)}>
                يرجى كتابة الاسم ورقم الهاتف بشكل صحيح لتسجيل ملفك.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex min-w-0 flex-col gap-1.5">
                <label
                  htmlFor="guest-name"
                  className={cn("text-xs font-bold text-right", p.label)}
                >
                  الاسم الكامل للزائر (بالعربية)
                </label>
                <Input
                  id="guest-name"
                  required
                  lang="ar"
                  maxLength={100}
                  ref={bookingFieldRef}
                  aria-label="الاسم ثلاثي أو رباعي كما بالبطاقة"
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
                  aria-invalid={!!errors.guestName}
                  className={cn(
                    fieldClass,
                    errors.guestName &&
                      "border-destructive focus-visible:ring-destructive/10",
                  )}
                  dir="rtl"
                />
                {errors.guestName && (
                  <p className="text-xs text-destructive font-semibold mt-1">
                    {errors.guestName}
                  </p>
                )}
              </div>

              <div className="flex min-w-0 flex-col gap-1.5">
                <label
                  htmlFor="guest-phone"
                  className={cn("text-xs font-bold text-right", p.label)}
                >
                  رقم الموبايل للتواصل (مطلوب)
                </label>
                <Input
                  id="guest-phone"
                  required
                  inputMode="numeric"
                  maxLength={11}
                  ref={bookingFieldRef}
                  aria-label="01XXXXXXXXX"
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
                  aria-invalid={!!errors.guestPhone}
                  className={cn(
                    fieldClass,
                    "text-right",
                    errors.guestPhone &&
                      "border-destructive focus-visible:ring-destructive/10",
                  )}
                  dir="ltr"
                  autoComplete="tel"
                />
                {errors.guestPhone && (
                  <p className="text-xs text-destructive font-semibold mt-1">
                    {errors.guestPhone}
                  </p>
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <label
                  htmlFor="guest-email"
                  className={cn("text-xs font-bold text-right", p.label)}
                >
                  البريد الإلكتروني{" "}
                  <span className={cn("font-normal", p.muted)}>(اختياري)</span>
                </label>
                <Input
                  id="guest-email"
                  ref={bookingFieldRef}
                  aria-label="name@example.com"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => {
                    setGuestEmail(e.target.value);
                    if (errors.guestEmail) {
                      setErrors((previous) => ({
                        ...previous,
                        guestEmail: undefined,
                      }));
                    }
                  }}
                  placeholder="name@example.com"
                  aria-invalid={!!errors.guestEmail}
                  className={cn(
                    fieldClass,
                    "text-left",
                    errors.guestEmail &&
                      "border-destructive focus-visible:ring-destructive/10",
                  )}
                  dir="ltr"
                  autoComplete="email"
                />
                {errors.guestEmail && (
                  <p className="text-xs text-destructive font-semibold mt-1">
                    {errors.guestEmail}
                  </p>
                )}
              </div>
            </div>

            <Button
              className={cn(nextButtonClass, "w-full mt-2")}
              onClick={handleNextStep1}
            >
              التالي: الخدمة
            </Button>
          </div>
        )}

        {step === 2 && (
          /* Step 2: Branch + Service Selection Card */
          <div className={panelClass}>
            <div className="border-b border-border/40 pb-2">
              <h3 className={cn("text-sm font-bold", p.heading)}>
                الفرع والخدمة المطلوبة
              </h3>
              <p className={cn("text-xs mt-0.5", p.muted)}>
                اختر الفرع ثم الفحص المطلوب لتحديد موعدك المناسب.
              </p>
            </div>

            {/* Branch selector */}
            <div className="space-y-2">
              <p className={cn("text-xs font-bold", p.label)}>الفرع</p>
              <div className="grid grid-cols-2 gap-2">
                {BRANCHES.map((b) => {
                  const active = branch === b.value;
                  return (
                    <Button
                      variant="bare"
                      key={b.value}
                      type="button"
                      onClick={() => {
                        setBranch(b.value);
                        setSelectedDate("");
                      }}
                      className={[
                        "rounded-xl border px-4 py-3 text-center text-sm font-bold transition-all duration-200 cursor-pointer w-full",
                        active ? p.tabOn : cn(p.tile, p.tabOff),
                      ].join(" ")}
                    >
                      {b.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-2.5">
              {TYPES.map((item) => {
                const active = bookingType === item.value;
                return (
                  <Button
                    variant="bare"
                    key={item.value}
                    type="button"
                    onClick={() => {
                      setBookingType(item.value);
                      setSelectedDate("");
                    }}
                    className={[
                      "rounded-xl border px-4 py-3 text-start transition-all duration-200 cursor-pointer w-full",
                      active ? p.tabOn : cn(p.tile, p.tabOff),
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-inherit">
                          {item.label}
                        </p>
                        <p
                          className={cn(
                            "text-[13px] leading-normal",
                            active ? "text-inherit opacity-80" : p.muted,
                          )}
                        >
                          {TYPE_HINTS[item.value]}
                        </p>
                      </div>
                      {active && (
                        <PortalStatusBadge
                          status="confirmed"
                          label="محدد"
                          className={cn("text-[13px]", p.cta)}
                        />
                      )}
                    </div>
                  </Button>
                );
              })}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className={previousButtonClass}
                onClick={() => setStep(1)}
              >
                السابق
              </Button>
              <Button
                className={cn(nextButtonClass, "flex-[2] whitespace-normal")}
                onClick={handleNextStep2}
                disabled={!branch}
              >
                التالي: اليوم والوقت
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          /* Step 3: Date Picker Card */
          <div className={panelClass}>
            <div className="border-b border-border/40 pb-2">
              <h3 className={cn("text-sm font-bold", p.heading)}>
                اليوم والوقت
              </h3>
              <p className={cn("text-xs mt-0.5", p.muted)}>
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
                <div
                  className={cn(
                    "mx-auto w-full max-w-full overflow-hidden rounded-2xl p-2 sm:max-w-[20rem]",
                    p.list,
                  )}
                >
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
                    disabled={(date) => !availableDateSet.has(dateToIso(date))}
                    modifiers={{
                      monday: (date) =>
                        bookingType === "consultant" && date.getDay() === 1,
                      consultantTanta: (date) =>
                        bookingType === "consultant" &&
                        isConsultantTantaDay(date),
                    }}
                    modifiersClassNames={{
                      monday:
                        "bg-destructive/10 text-destructive [&>button]:bg-destructive/10 [&>button]:text-destructive [&>button]:ring-1 [&>button]:ring-destructive/30",
                      consultantTanta:
                        "bg-primary/10 text-primary [&>button]:bg-primary/10 [&>button]:text-primary [&>button]:ring-1 [&>button]:ring-primary/30",
                    }}
                    fromDate={minDate}
                    toDate={maxDate}
                    className="mx-auto w-full max-w-full bg-transparent! p-1 [--cell-size:clamp(1.65rem,8.1vw,2.05rem)] min-[390px]:[--cell-size:clamp(1.85rem,8.4vw,2.2rem)] sm:p-2 sm:[--cell-size:--spacing(7)]"
                  />
                </div>
                <div className="flex items-center justify-center gap-2 text-xs font-semibold">
                  {bookingType === "consultant" && (
                    <>
                      <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-destructive ring-1 ring-destructive/30">
                        كفرالشيخ
                      </span>
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary ring-1 ring-primary/30">
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
                className={previousButtonClass}
                onClick={() => setStep(2)}
              >
                السابق
              </Button>
              <Button
                className={cn(nextButtonClass, "flex-[2] whitespace-normal")}
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
          <div className={panelClass}>
            <div className="border-b border-border/40 pb-2">
              <h3 className={cn("text-sm font-bold", p.heading)}>
                مراجعة وملاحظات وإرسال
              </h3>
              <p className={cn("text-xs mt-0.5", p.muted)}>
                يرجى التأكد من تفاصيل الحجز وإضافة أي ملاحظات قبل التأكيد.
              </p>
            </div>

            {/* Summary table */}
            <div className="space-y-2">
              {[
                { label: "الاسم الكامل", value: guestName },
                { label: "رقم الموبايل", value: guestPhone },
                { label: "البريد الإلكتروني", value: guestEmail || "—" },
                {
                  label: "الفرع",
                  value: branch
                    ? (BRANCHES.find((b) => b.value === branch)?.label ??
                      branch)
                    : "—",
                },
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
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2.5",
                    p.list,
                  )}
                >
                  <span className={cn("text-xs font-semibold", p.muted)}>
                    {label}
                  </span>
                  <span
                    className={cn(
                      "min-w-0 break-words text-xs font-bold",
                      p.heading,
                    )}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Additional Notes Field */}
            <div className="space-y-1.5">
              <label className={cn("text-xs font-bold", p.label)}>
                ملاحظات أو شكاوى إضافية (اختياري)
              </label>
              <Textarea
                ref={bookingFieldRef}
                aria-label="أكتب أي تفاصيل أخرى أو شكوى طبية تريد إبلاغ الاستقبال بها…"
                rows={3}
                value={notes}
                placeholder="أكتب أي تفاصيل أخرى أو شكوى طبية تريد إبلاغ الاستقبال بها…"
                onChange={(e) => setNotes(e.target.value)}
                className={cn(fieldClass, "h-auto resize-none text-xs")}
              />
            </div>

            <div
              className={cn(
                "rounded-xl p-3.5 text-xs space-y-1 leading-5",
                p.list,
                p.muted,
              )}
            >
              <p className={cn("font-semibold", p.accent)}>تنبيه هام:</p>
              <p>
                بعد إرسال طلب الحجز بنجاح، سيتواصل معك الاستقبال هاتفياً لتأكيد
                وتحديد توقيت الزيارة بدقة وتسجيل ملفك الطبي الجديد.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className={previousButtonClass}
                onClick={() => setStep(3)}
                disabled={createGuestBooking.isPending}
              >
                السابق
              </Button>
              <Button
                className={cn(nextButtonClass, "flex-[2] whitespace-normal")}
                onClick={handleSubmit}
                disabled={createGuestBooking.isPending}
              >
                {createGuestBooking.isPending
                  ? "جاري الإرسال…"
                  : "تأكيد وإرسال طلب الحجز"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </LoginShell>
  );
}
