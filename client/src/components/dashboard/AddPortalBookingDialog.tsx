import { useRef, useState } from "react";
import { Search, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { DateInput } from "@/components/ui/date-input";
import { useIsMobile } from "@/hooks/useMobile";

const STAFF_BOOKING_TYPES = [
  { value: "consultant" as const, label: "إستشاري" },
  { value: "specialist" as const, label: "أخصائي" },
  { value: "pentacam" as const, label: "بنتاكام" },
  { value: "followup" as const, label: "متابعة" },
];

type BookingType = "consultant" | "specialist" | "pentacam" | "followup";

type Branch = "tanta" | "kfs";

const BRANCHES: { value: Branch; label: string }[] = [
  { value: "tanta", label: "طنطا" },
  { value: "kfs", label: "كفرالشيخ" },
];

type PatientType = "existing" | "new" | "guest";

export function AddPortalBookingDialog({
  open,
  onOpenChange,
  inlineOnDesktop = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inlineOnDesktop?: boolean;
}) {
  const isMobile = useIsMobile();
  const [patientType, setPatientType] = useState<PatientType>("existing");
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<{
    id: number;
    name: string;
    code: string;
  } | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [branch, setBranch] = useState<Branch | null>(null);
  const [bookingType, setBookingType] = useState<BookingType>("consultant");
  const [requestedDate, setRequestedDate] = useState("");
  const [confirmedDate, setConfirmedDate] = useState("");
  const [staffNotes, setStaffNotes] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const { data: searchResults } = trpc.medical.searchPatients.useQuery(
    { searchTerm: search },
    { enabled: search.trim().length >= 2 },
  );

  const utils = trpc.useUtils();

  const createStaff = trpc.patientPortal.createStaffBooking.useMutation({
    onSuccess: async () => {
      await (utils as any).patientPortal.listBookings.invalidate();
      toast.success("تم إضافة الحجز بنجاح");
      reset();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const createNew = (
    trpc as any
  ).patientPortal.createStaffGuestBooking.useMutation({
    onSuccess: async () => {
      await (utils as any).patientPortal.listBookings.invalidate();
      toast.success("تم إضافة الحجز بنجاح");
      reset();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const isPending = createStaff.isPending || createNew.isPending;

  const canSubmit =
    !!requestedDate &&
    !!branch &&
    !isPending &&
    (patientType === "existing"
      ? !!selectedPatient
      : !!guestName.trim() && !!guestPhone.trim());

  function reset() {
    setPatientType("existing");
    setSearch("");
    setSelectedPatient(null);
    setGuestName("");
    setGuestPhone("");
    setGuestEmail("");
    setBranch(null);
    setRequestedDate("");
    setConfirmedDate("");
    setStaffNotes("");
    setShowDropdown(false);
    setBookingType("consultant");
  }

  function handleOpenChange(val: boolean) {
    if (!val) reset();
    onOpenChange(val);
  }

  const formContent = (
    <>
      <div
        className="mobile-booking-form mx-auto w-full max-w-3xl space-y-5 bg-background p-4"
        dir="rtl"
      >
        <div className="grid grid-cols-2 gap-3" dir="rtl">
          {/* Patient type */}
          <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground block text-right">
            نوع الزيارة
          </label>
          <div className="flex gap-2 flex-wrap">
            {(
              [
                { value: "existing", label: "مريض مسجل" },
                { value: "new", label: "مريض جديد" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setPatientType(opt.value);
                  setSelectedPatient(null);
                  setSearch("");
                  setGuestName("");
                  setGuestPhone("");
                }}
                className={cn(
                  "h-8 px-3.5 rounded-lg text-xs font-bold border transition-all cursor-pointer",
                  patientType === opt.value
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-background text-muted-foreground border-border hover:bg-muted/40",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          </div>

          {/* Branch */}
          <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground block text-right">
            الفرع
          </label>
          <div className="flex gap-2">
            {BRANCHES.map((b) => (
              <button
                key={b.value}
                type="button"
                onClick={() => setBranch(b.value)}
                className={cn(
                  "h-9 px-3.5 rounded-xl border text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                  branch === b.value
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-background text-muted-foreground border-border hover:bg-muted/40",
                )}
              >
                {b.label}
              </button>
            ))}
          </div>
          </div>
        </div>

        <div
          className="mobile-booking-fields grid gap-4 items-start lg:grid-cols-[1fr_148px]"
          dir="rtl"
        >
          {/* Right column: fields */}
          <div className="flex flex-col gap-3">
            {/* Patient search / name, next to the date */}
            <div className="grid grid-cols-2 gap-3 items-start" dir="rtl">
            <div className="relative min-w-0 space-y-1.5" ref={searchRef}>
              <label className="text-xs font-medium text-muted-foreground block text-right">
                {patientType === "existing" ? "المريض" : "الاسم"}
              </label>
              {patientType === "existing" ? (
                selectedPatient ? (
                  <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPatient(null);
                        setSearch("");
                      }}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="إزالة المريض المختار"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {selectedPatient.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedPatient.code}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
                        placeholder="اسم المريض أو الكود أو الموبايل..."
                        dir="rtl"
                        className="h-10 rounded-xl pr-9 text-sm"
                      />
                    </div>
                    {showDropdown &&
                      searchResults &&
                      searchResults.length > 0 && (
                        <div className="absolute top-full z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-border bg-background shadow-lg">
                          {(searchResults as any[]).slice(0, 8).map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              className="flex w-full items-center justify-between px-3 py-2.5 text-right transition-colors hover:bg-muted/40"
                              onClick={() => {
                                setSelectedPatient({
                                  id: p.id,
                                  name: p.fullName,
                                  code: p.patientCode ?? "",
                                });
                                setSearch("");
                                setShowDropdown(false);
                              }}
                            >
                              <span className="text-xs text-muted-foreground">
                                {p.patientCode}
                              </span>
                              <span className="text-sm font-medium">
                                {p.fullName}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                  </>
                )
              ) : (
                <Input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="الاسم بالكامل..."
                  dir="rtl"
                  className="h-10 rounded-xl text-sm"
                />
              )}
            </div>

            <div className="min-w-0 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground block text-right">
                التاريخ
              </label>
              <DateInput
                value={requestedDate}
                onChange={(e) => setRequestedDate(e.target.value)}
                className="h-10 w-full min-w-0 rounded-xl text-sm"
              />
            </div>
            </div>

            {/* Contact details for a new patient */}
            {patientType !== "existing" ? (
              <div className="grid grid-cols-2 gap-3" dir="rtl">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground block text-right">
                    الموبايل
                  </label>
                  <Input
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="01xxxxxxxxx"
                    dir="rtl"
                    className="h-10 rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground block text-right">
                    البريد الإلكتروني
                  </label>
                  <Input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="h-10 rounded-xl text-sm"
                    dir="ltr"
                  />
                </div>
              </div>
            ) : null}

            {/* Staff notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground block text-right">
                ملاحظات{" "}
                <span className="font-normal opacity-60">(اختياري)</span>
              </label>
              <textarea
                value={staffNotes}
                onChange={(e) => setStaffNotes(e.target.value)}
                rows={2}
                placeholder="ملاحظات للمريض..."
                dir="rtl"
                className="w-full resize-none rounded-xl border border-border bg-muted/10 px-3 py-2.5 text-sm leading-6 outline-none transition-shadow focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Left column: booking type */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground block text-right">
              الخدمة
            </label>
            <div className="grid grid-cols-2 gap-2 w-fit" dir="rtl">
              {STAFF_BOOKING_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setBookingType(t.value)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-xs font-medium text-center transition-colors whitespace-nowrap",
                    bookingType === t.value
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        className="mobile-booking-actions flex items-center gap-2 border-t bg-muted/10 px-4 py-3"
        dir="rtl"
      >
        <Button
          type="button"
          disabled={!canSubmit}
          onClick={() => {
            if (patientType === "existing") {
              createStaff.mutate({
                patientId: selectedPatient!.id,
                bookingType,
                branch: branch ?? undefined,
                requestedDate,
                confirmedDate: confirmedDate || undefined,
                status: "confirmed",
                staffNotes: staffNotes || undefined,
              });
            } else {
              createNew.mutate({
                guestName: guestName.trim(),
                guestPhone: guestPhone.trim(),
                guestEmail: guestEmail.trim() || undefined,
                bookingType,
                branch: branch ?? undefined,
                requestedDate,
              });
            }
          }}
          className="h-9 rounded-xl px-6 font-bold text-sm"
        >
          {isPending ? "جاري الحفظ…" : "حفظ الحجز"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-9 text-sm"
          onClick={() => handleOpenChange(false)}
        >
          إلغاء
        </Button>
      </div>
    </>
  );

  if (inlineOnDesktop && !isMobile) {
    return (
      <section
        className="overflow-hidden rounded-lg border border-border bg-background"
        dir="rtl"
      >
        {formContent}
      </section>
    );
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="top"
        dir="rtl"
        className="mobile-booking-sheet max-h-[92dvh] w-full gap-0 overflow-x-hidden overflow-y-auto p-0"
      >
        {/* Header */}
        <SheetHeader className="mobile-booking-header p-4 border-b bg-muted/20" dir="rtl">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Plus className="h-4 w-4 text-primary" />
            </div>
            <div className="text-right">
              <SheetTitle className="text-base font-bold">
                إضافة حجز للمريض
              </SheetTitle>
              <SheetDescription className="text-[11px]">
                ابحث عن المريض، حدد نوع الخدمة والتاريخ، ثم احفظ الحجز مباشرةً.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>
        {formContent}

      </SheetContent>
    </Sheet>
  );
}
