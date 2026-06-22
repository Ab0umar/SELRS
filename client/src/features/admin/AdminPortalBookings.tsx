import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  SlidersHorizontal,
  Trash2,
  X,
  XCircle,
  BanIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { DateInput } from "@/components/ui/date-input";

const STATUS_OPTS = [
  { value: "", label: "الكل" },
  { value: "pending", label: "قيد المراجعة" },
  { value: "confirmed", label: "مؤكد" },
  { value: "cancelled", label: "ملغي" },
  { value: "completed", label: "مكتمل" },
] as const;

const STATUS_META: Record<
  string,
  { label: string; className: string; icon: typeof Clock3 }
> = {
  pending: {
    label: "قيد المراجعة",
    className: "border-warning/30 bg-warning/10 text-warning",
    icon: Clock3,
  },
  confirmed: {
    label: "مؤكد",
    className: "border-primary/30 bg-primary/10 text-primary",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "ملغي",
    className: "border-destructive/30 bg-destructive/10 text-destructive",
    icon: XCircle,
  },
  completed: {
    label: "مكتمل",
    className: "border-border bg-muted/40 text-muted-foreground",
    icon: CheckCircle2,
  },
};

const BOOKING_TYPES: Record<string, string> = {
  consultant: "كشف استشاري",
  specialist: "كشف أخصائي",
  lasik: "فحوصات الليزك",
  external: "أشعة خارجي",
  followup: "متابعة",
};

const DAY_NAMES = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];
const DAYS_AR = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];
const DAY_BITS = [1, 2, 4, 8, 16, 32, 64];

type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";
type StatusFilter = "" | BookingStatus;
type BookingType =
  | "consultant"
  | "specialist"
  | "lasik"
  | "external"
  | "followup";

type BookingRow = {
  id: number;
  patientId: number | null;
  bookingType: BookingType;
  requestedDate: string | Date;
  confirmedDate: string | Date | null;
  status: BookingStatus;
  staffNotes: string | null;
  notes: string | null;
  guestName: string | null;
  guestPhone: string | null;
  typeLabel: string;
  patientName: string | null;
  patientCode: string | null;
  patientPhone: string | null;
  isGuest: boolean;
  createdAt: string | Date;
};

type ScheduleRow = {
  bookingType: BookingType;
  label: string;
  weekdayMask: number;
  isActive: boolean;
  id: number | null;
  branch?: string;
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = new Date(
    value instanceof Date ? value.toISOString().slice(0, 10) : value,
  );
  return `${DAY_NAMES[date.getDay()]} ${date.toLocaleDateString("ar-EG")}`;
}

function formatDateKey(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = new Date(
    value instanceof Date ? value.toISOString().slice(0, 10) : value,
  );
  return date.toISOString().slice(0, 10);
}

function BookingCard({
  booking,
  onUpdated,
}: {
  booking: BookingRow;
  onUpdated: () => void;
}) {
  const [expanded, setExpanded] = useState(booking.status === "pending");
  const [status, setStatus] = useState<BookingStatus>(booking.status);
  const [staffNotes, setStaffNotes] = useState(booking.staffNotes ?? "");
  const [confirmedDate, setConfirmedDate] = useState(
    formatDateKey(booking.confirmedDate),
  );

  const updateBooking = trpc.patientPortal.updateBooking.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الحجز");
      onUpdated();
      setExpanded(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteBooking = trpc.patientPortal.deleteBooking.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الحجز");
      onUpdated();
    },
    onError: (error) => toast.error(error.message),
  });

  const save = () => {
    updateBooking.mutate({
      id: booking.id,
      status,
      staffNotes: staffNotes || undefined,
      confirmedDate: confirmedDate || undefined,
    });
  };

  const reqDate = formatDate(booking.requestedDate);
  const meta = STATUS_META[booking.status] ?? STATUS_META.completed;
  const StatusIcon = meta.icon;
  const displayName = booking.patientName ?? booking.guestName ?? "—";
  const displayPhone = booking.patientPhone ?? booking.guestPhone ?? "";
  const codeLabel = booking.patientCode ?? (booking.isGuest ? "زائر" : "جديد");

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <button
        type="button"
        className="flex w-full items-start gap-4 px-4 py-4 text-right transition-colors hover:bg-muted/20"
        onClick={() => setExpanded((value) => !value)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">
              {displayName}
            </p>
            {booking.isGuest && (
              <span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
                زائر
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{codeLabel}</span>
            <span className="text-muted-foreground/50">•</span>
            <span>{booking.typeLabel}</span>
            <span className="text-muted-foreground/50">•</span>
            <span>{reqDate}</span>
            {booking.branch ? (
              <>
                <span className="text-muted-foreground/50">•</span>
                <span className="font-medium text-primary">
                  {booking.branch === "tanta" ? "طنطا" : booking.branch === "kfs" ? "كفرالشيخ" : booking.branch}
                </span>
              </>
            ) : null}
          </div>
          {displayPhone ? (
            <p className="mt-1 text-xs text-muted-foreground">{displayPhone}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
              meta.className,
            )}
          >
            <StatusIcon className="size-3.5" />
            {meta.label}
          </span>
          <span className="text-xs text-muted-foreground">
            {expanded ? "إخفاء" : "تفاصيل"}
          </span>
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-border bg-muted/30 px-4 py-4">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    الحالة
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {STATUS_OPTS.filter((opt) => opt.value !== "").map(
                      (opt) => {
                        const active = status === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                              setStatus(opt.value as BookingStatus)
                            }
                            className={cn(
                              "min-h-10 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                              active
                                ? "border-primary/30 bg-primary/10 text-primary"
                                : "border-border bg-white text-muted-foreground hover:bg-muted/40",
                            )}
                          >
                            {opt.label}
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    تاريخ مؤكد
                  </label>
                  <DateInput
                    value={confirmedDate}
                    onChange={(e) => setConfirmedDate(e.target.value)}
                    dir="ltr"
                    className="h-10 rounded-xl border-border bg-white text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  ملاحظات الموظف
                </label>
                <textarea
                  value={staffNotes}
                  onChange={(e) => setStaffNotes(e.target.value)}
                  rows={3}
                  className="min-h-24 w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-6 text-foreground outline-none transition-shadow focus:ring-2 focus:ring-primary/30"
                  placeholder="ملاحظات تُعرض للمريض..."
                />
              </div>

              {booking.notes ? (
                <div className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2.5 text-sm leading-6 text-warning">
                  <p className="mb-1 text-xs font-medium text-warning">
                    ملاحظة المريض
                  </p>
                  {booking.notes}
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-white px-4 py-4">
                <p className="text-xs font-medium text-muted-foreground">ملخص سريع</p>
                <div className="mt-3 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">المريض</span>
                    <span className="max-w-[70%] font-medium text-foreground">
                      {displayName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">النوع</span>
                    <span className="font-medium text-foreground">
                      {booking.typeLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">التاريخ المطلوب</span>
                    <span className="font-medium text-foreground">
                      {reqDate}
                    </span>
                  </div>
                  {confirmedDate ? (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">التاريخ المؤكد</span>
                      <span className="font-medium text-foreground">
                        {formatDate(confirmedDate)}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={save}
                  disabled={updateBooking.isPending}
                  className="min-w-24 rounded-xl bg-primary text-white hover:bg-primary/90"
                >
                  {updateBooking.isPending ? "جاري الحفظ..." : "حفظ"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setExpanded(false)}
                  className="rounded-xl border-border bg-white text-foreground hover:bg-muted/40"
                >
                  إغلاق
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (confirm("حذف هذا الحجز نهائياً؟")) {
                      deleteBooking.mutate({ id: booking.id });
                    }
                  }}
                  disabled={deleteBooking.isPending}
                  className="rounded-xl border-destructive/30 bg-background text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function ScheduleRowCard({
  row,
  branch,
  onSaved,
}: {
  row: ScheduleRow;
  branch?: string;
  onSaved: () => void;
}) {
  const [local, setLocal] = useState({
    weekdayMask: row.weekdayMask,
    isActive: row.isActive,
  });
  const [dirty, setDirty] = useState(false);

  const updateSchedule = trpc.patientPortal.updateSchedule.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ الجدول");
      onSaved();
      setDirty(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const toggleDay = (bit: number) => {
    setLocal((prev) => ({ ...prev, weekdayMask: prev.weekdayMask ^ bit }));
    setDirty(true);
  };

  const toggleActive = () => {
    setLocal((prev) => ({ ...prev, isActive: !prev.isActive }));
    setDirty(true);
  };

  const save = () => {
    updateSchedule.mutate({
      bookingType: row.bookingType,
      branch: branch ?? "",
      weekdayMask: local.weekdayMask,
      isActive: local.isActive,
    });
  };

  return (
    <article className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={toggleActive}
            className={cn(
              "relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors focus:outline-none",
              local.isActive
                ? "border-primary/30 bg-primary"
                : "border-border bg-muted",
            )}
            aria-label={local.isActive ? "تعطيل الجدول" : "تفعيل الجدول"}
          >
            <span
              className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                local.isActive ? "translate-x-5" : "translate-x-0.5",
              )}
            />
          </button>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-foreground">
                {row.label}
              </p>
              <span
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                  local.isActive
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-border bg-muted/40 text-muted-foreground",
                )}
              >
                {local.isActive ? "مفعل" : "متوقف"}
              </span>
            </div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {local.isActive
                ? "الأيام المختارة هنا هي الأيام التي ستظهر للمريض عند الحجز."
                : "الجدول متوقف حالياً ولن تظهر له مواعيد متاحة."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start">
          {dirty ? (
            <Button
              size="sm"
              onClick={save}
              disabled={updateSchedule.isPending}
              className="rounded-xl bg-primary text-white hover:bg-primary/90"
            >
              {updateSchedule.isPending ? "..." : "حفظ"}
            </Button>
          ) : null}
          <span className="text-xs text-muted-foreground">
            {dirty ? "تغييرات غير محفوظة" : "محفوظ"}
          </span>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <SlidersHorizontal className="size-3.5" />
          <span>الأيام</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {DAYS_AR.map((day, index) => {
            const bit = DAY_BITS[index];
            const active = (local.weekdayMask & bit) !== 0;
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(bit)}
                disabled={!local.isActive}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  !local.isActive
                    ? "cursor-not-allowed border-border bg-muted/60 text-muted-foreground"
                    : active
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-white text-muted-foreground hover:bg-muted/40",
                )}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    </article>
  );
}

const STAFF_BOOKING_TYPES = [
  { value: "consultant" as const, label: "كشف استشاري" },
  { value: "specialist" as const, label: "كشف أخصائي" },
  { value: "lasik" as const, label: "فحوصات الليزك" },
  { value: "external" as const, label: "أشعة خارجي" },
  { value: "followup" as const, label: "متابعة" },
];

function AddStaffBookingForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<{
    id: number;
    name: string;
    code: string;
  } | null>(null);
  const [bookingType, setBookingType] = useState<BookingType>("consultant");
  const [branch, setBranch] = useState<"tanta" | "kfs" | "">("");
  const [requestedDate, setRequestedDate] = useState("");
  const [confirmedDate, setConfirmedDate] = useState("");
  const [staffNotes, setStaffNotes] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const { data: searchResults } = trpc.medical.searchPatients.useQuery(
    { searchTerm: search },
    { enabled: search.trim().length >= 2 },
  );

  const create = trpc.patientPortal.createStaffBooking.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة الحجز");
      setOpen(false);
      setSearch("");
      setSelectedPatient(null);
      setRequestedDate("");
      setConfirmedDate("");
      setStaffNotes("");
      onCreated();
    },
    onError: (e) => toast.error(e.message),
  });

  const canSubmit = !!selectedPatient && !!requestedDate && !!branch && !create.isPending;

  const reset = () => {
    setOpen(false);
    setSearch("");
    setSelectedPatient(null);
    setBranch("");
    setRequestedDate("");
    setConfirmedDate("");
    setStaffNotes("");
  };

  if (!open) {
    return (
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className="h-9 gap-1.5 rounded-xl"
      >
        <Plus className="size-4" />
        إضافة حجز
      </Button>
    );
  }

  return (
    <article
      className="rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-sm"
      dir="rtl"
    >
      <div className="mb-4 flex items-center justify-between">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 rounded-lg p-0"
          onClick={reset}
        >
          <X className="size-3.5" />
        </Button>
        <p className="text-sm font-semibold text-foreground">إضافة حجز للمريض</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Patient search */}
        <div className="relative space-y-1.5" ref={searchRef}>
          <label className="text-xs font-medium text-muted-foreground">المريض</label>
          {selectedPatient ? (
            <div className="flex items-center justify-between rounded-xl border border-border bg-white px-3 py-2.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedPatient(null);
                  setSearch("");
                }}
                className="text-muted-foreground hover:text-muted-foreground"
              >
                <X className="size-3.5" />
              </button>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">
                  {selectedPatient.name}
                </p>
                <p className="text-xs text-muted-foreground">{selectedPatient.code}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="اسم المريض أو الكود أو الموبايل..."
                  className="h-10 rounded-xl border-border bg-white pr-9 text-sm"
                />
              </div>
              {showDropdown && searchResults && searchResults.length > 0 && (
                <div className="absolute top-full z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-border bg-white shadow-lg">
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
                      <span className="text-sm font-medium text-foreground">
                        {p.fullName}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Branch */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">الفرع</label>
          <div className="flex gap-2">
            {([{ value: "tanta", label: "طنطا" }, { value: "kfs", label: "كفرالشيخ" }] as const).map((b) => (
              <button
                key={b.value}
                type="button"
                onClick={() => setBranch(b.value)}
                className={cn(
                  "flex-1 h-9 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                  branch === b.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white text-muted-foreground border-border hover:bg-muted/40",
                )}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Booking type */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            نوع الحجز
          </label>
          <div className="grid grid-cols-2 gap-2">
            {STAFF_BOOKING_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setBookingType(t.value)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
                  bookingType === t.value
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-white text-muted-foreground hover:bg-muted/40",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            تاريخ الموعد
          </label>
          <DateInput
            value={requestedDate}
            onChange={(e) => setRequestedDate(e.target.value)}
            className="h-10 rounded-xl border-border bg-white text-sm"
            dir="ltr"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            تاريخ مؤكد (اختياري)
          </label>
          <DateInput
            value={confirmedDate}
            onChange={(e) => setConfirmedDate(e.target.value)}
            className="h-10 rounded-xl border-border bg-white text-sm"
            dir="ltr"
          />
        </div>

        {/* Notes */}
        <div className="space-y-1.5 lg:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">
            ملاحظات للمريض (اختياري)
          </label>
          <textarea
            value={staffNotes}
            onChange={(e) => setStaffNotes(e.target.value)}
            rows={2}
            placeholder="تُعرض للمريض في البوابة..."
            className="w-full resize-none rounded-xl border border-border bg-white px-3 py-2.5 text-sm leading-6 text-foreground outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Button
          size="sm"
          disabled={!canSubmit}
          onClick={() =>
            create.mutate({
              patientId: selectedPatient!.id,
              bookingType,
              branch: branch || undefined,
              requestedDate,
              confirmedDate: confirmedDate || undefined,
              status: "confirmed",
              staffNotes: staffNotes || undefined,
            })
          }
          className="rounded-xl"
        >
          {create.isPending ? "جاري الحفظ..." : "حفظ الحجز"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={reset}
          className="rounded-xl border-border"
        >
          إلغاء
        </Button>
      </div>
    </article>
  );
}

const CLOSURE_TYPES = [
  { value: "", label: "كل الأنواع" },
  { value: "consultant", label: "كشف استشاري" },
  { value: "specialist", label: "كشف أخصائي" },
  { value: "lasik", label: "فحوصات الليزك" },
  { value: "external", label: "أشعة خارجي" },
  { value: "followup", label: "متابعة" },
];

function ClosuresPanel() {
  const [label, setLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [bookingType, setBookingType] = useState<"" | BookingType>("");
  const [adding, setAdding] = useState(false);

  const { data: closures, refetch } =
    trpc.patientPortal.listClosures.useQuery();

  const add = trpc.patientPortal.addClosure.useMutation({
    onSuccess: () => {
      toast.success("تمت إضافة فترة الإغلاق");
      setLabel("");
      setStartDate("");
      setEndDate("");
      setBookingType("");
      setAdding(false);
      void refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const del = trpc.patientPortal.deleteClosure.useMutation({
    onSuccess: () => {
      toast.success("تم الحذف");
      void refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const fmt = (d: string | Date | null) => {
    if (!d) return "—";
    const s =
      typeof d === "string" ? d : (d as Date).toISOString().slice(0, 10);
    return new Date(s + "T00:00:00").toLocaleDateString("ar-EG", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">
            فترات الإجازة والإغلاق
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            التواريخ المحددة هنا لن تظهر للمرضى كمواعيد متاحة.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/40"
        >
          <Plus className="size-3.5" />
          إضافة فترة
        </button>
      </div>

      {adding && (
        <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                الوصف (مثل: إجازة د. أحمد)
              </label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="وصف فترة الإغلاق..."
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                نوع الحجز المتأثر
              </label>
              <div className="flex flex-wrap gap-2">
                {CLOSURE_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setBookingType(t.value as BookingType)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      bookingType === t.value
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border bg-white text-muted-foreground hover:bg-muted/40",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">من</label>
              <DateInput
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 rounded-xl text-sm"
                dir="ltr"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">إلى</label>
              <DateInput
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 rounded-xl text-sm"
                dir="ltr"
              />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <Button
                size="sm"
                disabled={!label || !startDate || !endDate || add.isPending}
                onClick={() =>
                  add.mutate({
                    label,
                    startDate,
                    endDate,
                    bookingType: bookingType || null,
                  })
                }
                className="rounded-xl"
              >
                {add.isPending ? "..." : "حفظ"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl"
                onClick={() => setAdding(false)}
              >
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      )}

      {!closures || closures.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">
          لا توجد فترات إغلاق مضافة.
        </p>
      ) : (
        <div className="space-y-2">
          {closures.map((c: any) => {
            const start =
              typeof c.startDate === "string"
                ? c.startDate
                : (c.startDate as Date).toISOString().slice(0, 10);
            const end =
              typeof c.endDate === "string"
                ? c.endDate
                : (c.endDate as Date).toISOString().slice(0, 10);
            const today = new Date().toISOString().slice(0, 10);
            const isActive = today >= start && today <= end;
            const isPast = today > end;
            return (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2.5"
              >
                <BanIcon
                  className={cn(
                    "size-4 shrink-0",
                    isActive
                      ? "text-destructive"
                      : isPast
                        ? "text-muted-foreground/50"
                        : "text-warning",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        isPast
                          ? "text-muted-foreground line-through"
                          : "text-foreground",
                      )}
                    >
                      {c.label}
                    </p>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                        c.bookingType
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border bg-muted/60 text-muted-foreground",
                      )}
                    >
                      {c.bookingType
                        ? CLOSURE_TYPES.find((t) => t.value === c.bookingType)
                            ?.label
                        : "كل الأنواع"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground" dir="ltr">
                    {fmt(c.startDate)} → {fmt(c.endDate)}
                  </p>
                </div>
                {isActive && (
                  <span className="rounded-full border border-destructive/20 bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                    الآن
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => del.mutate({ id: c.id })}
                  disabled={del.isPending}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LoadingQueue() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl border border-border bg-white p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="h-4 w-40 rounded-full bg-muted/60" />
              <div className="h-3 w-56 rounded-full bg-muted/60" />
              <div className="h-3 w-24 rounded-full bg-muted/60" />
            </div>
            <div className="h-8 w-24 rounded-full bg-muted/60" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ScheduleLoading() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl border border-border bg-white p-4 shadow-sm"
        >
          <div className="h-5 w-44 rounded-full bg-muted/60" />
          <div className="mt-3 h-4 w-full rounded-full bg-muted/60" />
          <div className="mt-3 flex gap-2">
            {Array.from({ length: 5 }).map((__, chipIndex) => (
              <div
                key={chipIndex}
                className="h-8 w-16 rounded-full bg-muted/60"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const SCHEDULE_BRANCHES = [
  { value: "", label: "الافتراضي (كل الفروع)" },
  { value: "tanta", label: "طنطا" },
  { value: "kfs", label: "كفرالشيخ" },
] as const;

export default function AdminPortalBookings() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [dateFilter, setDateFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [branchFilter, setBranchFilter] = useState<"" | "tanta" | "kfs">("");
  const [activeTab, setActiveTab] = useState<"bookings" | "schedule">(
    "bookings",
  );
  const [scheduleBranch, setScheduleBranch] = useState<"" | "tanta" | "kfs">("");

  const bookingsQuery = trpc.patientPortal.listBookings.useQuery({
    status: statusFilter || undefined,
    date: dateFilter || undefined,
    branch: branchFilter || undefined,
    limit: 100,
  });

  useEffect(() => {
    const handler = () => void bookingsQuery.refetch();
    window.addEventListener("booking-update", handler);
    return () => window.removeEventListener("booking-update", handler);
  }, [bookingsQuery]);

  const scheduleQuery = trpc.patientPortal.getSchedule.useQuery(
    { branch: scheduleBranch },
    { enabled: activeTab === "schedule", refetchOnWindowFocus: false },
  );

  const bookingData = bookingsQuery.data ?? [];
  const filteredBookings = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return bookingData;
    return bookingData.filter((booking: any) => {
      const haystack = [
        booking.patientName ?? "",
        booking.guestName ?? "",
        booking.patientCode ?? "",
        booking.patientPhone ?? "",
        booking.guestPhone ?? "",
        booking.typeLabel ?? "",
        booking.staffNotes ?? "",
        booking.notes ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [bookingData, searchTerm]);

  const stats = useMemo(
    () => ({
      total: filteredBookings.length,
      pending: filteredBookings.filter((item: any) => item.status === "pending")
        .length,
      confirmed: filteredBookings.filter((item: any) => item.status === "confirmed")
        .length,
      cancelled: filteredBookings.filter((item: any) => item.status === "cancelled")
        .length,
    }),
    [filteredBookings],
  );

  return (
    <div dir="rtl" className="space-y-4 text-right">
      <PageHeader
        title="حجوزات البوابة"
        subtitle="إدارة طلبات الحجز وجدول أوقات البوابة."
        icon={<CalendarDays className="h-5 w-5 text-primary" />}
        actions={
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              void bookingsQuery.refetch();
              if (activeTab === "schedule") void scheduleQuery.refetch();
            }}
            className="h-9 rounded-xl px-3 text-sm"
          >
            <RefreshCw className="size-4" />
            تحديث
          </Button>
        }
      />

      <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "الإجمالي", value: stats.total },
              { label: "قيد المراجعة", value: stats.pending },
              { label: "مؤكد", value: stats.confirmed },
              { label: "ملغي", value: stats.cancelled },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-border bg-muted/40 px-4 py-3"
              >
                <p className="text-[11px] font-medium text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div className="flex w-full flex-col gap-2 lg:max-w-2xl lg:items-end">
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="بحث بالاسم أو الكود أو الهاتف"
                  className="h-10 rounded-xl border-border bg-white pr-10 text-sm"
                />
              </div>

              <DateInput
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-10 w-full rounded-xl border-border bg-white text-sm sm:w-44"
                dir="ltr"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="inline-flex rounded-2xl border border-border bg-muted/40 p-1">
                {[
                  { key: "bookings", label: "الحجوزات", icon: CalendarDays },
                  { key: "schedule", label: "جدول الأوقات", icon: Settings2 },
                ].map(({ key, label, icon: Icon }) => {
                  const active = activeTab === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveTab(key as typeof activeTab)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-white text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                      {label}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                {[
                  { value: "" as const, label: "كل الفروع" },
                  { value: "tanta" as const, label: "طنطا" },
                  { value: "kfs" as const, label: "كفرالشيخ" },
                ].map((b) => (
                  <button
                    key={b.value}
                    type="button"
                    onClick={() => setBranchFilter(b.value)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      branchFilter === b.value
                        ? "border-secondary/40 bg-secondary/10 text-secondary"
                        : "border-border bg-white text-muted-foreground hover:bg-muted/40",
                    )}
                  >
                    {b.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                {STATUS_OPTS.map((option) => {
                  const active = statusFilter === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setStatusFilter(option.value as StatusFilter)
                      }
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        active
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border bg-white text-muted-foreground hover:bg-muted/40",
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {dateFilter || statusFilter || searchTerm ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-3 py-1">
              <SlidersHorizontal className="size-3.5" />
              فلاتر مفعلة
            </span>
            {searchTerm ? (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                بحث: {searchTerm}
              </span>
            ) : null}
            {dateFilter ? (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                تاريخ: {dateFilter}
              </span>
            ) : null}
            {statusFilter ? (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                {STATUS_OPTS.find((item) => item.value === statusFilter)?.label}
              </span>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 rounded-full px-2.5 text-xs"
              onClick={() => {
                setSearchTerm("");
                setDateFilter("");
                setStatusFilter("");
              }}
            >
              مسح الفلاتر
            </Button>
          </div>
        ) : null}
      </section>

      {activeTab === "bookings" ? (
        <section className="space-y-3">
          <AddStaffBookingForm onCreated={() => void bookingsQuery.refetch()} />

          {bookingsQuery.isLoading ? <LoadingQueue /> : null}

          {bookingsQuery.error ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-5 text-right text-destructive shadow-sm">
              <p className="text-sm font-semibold">تعذر تحميل الحجوزات</p>
              <p className="mt-1 text-sm leading-6 text-destructive">
                {bookingsQuery.error.message}
              </p>
            </div>
          ) : null}

          {!bookingsQuery.isLoading &&
          !bookingsQuery.error &&
          filteredBookings.length === 0 ? (
            <div className="rounded-2xl border border-border bg-white px-6 py-10 text-center shadow-sm">
              <CalendarDays className="mx-auto size-10 text-muted-foreground/50" />
              <h3 className="mt-4 text-base font-semibold text-foreground">
                لا توجد حجوزات مطابقة
              </h3>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                جرّب توسيع الفلاتر أو مسح البحث. إذا كان الهدف مراجعة الجدول،
                انتقل إلى تبويب جدول الأوقات.
              </p>
            </div>
          ) : null}

          {!bookingsQuery.isLoading && !bookingsQuery.error
            ? filteredBookings.map((booking: any) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onUpdated={() => void bookingsQuery.refetch()}
                />
              ))
            : null}
        </section>
      ) : null}

      {activeTab === "schedule" ? (
        <section className="space-y-3">
          {scheduleQuery.isLoading ? <ScheduleLoading /> : null}

          {scheduleQuery.error ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-5 text-right text-destructive shadow-sm">
              <p className="text-sm font-semibold">تعذر تحميل الجدول</p>
              <p className="mt-1 text-sm leading-6 text-destructive">
                {scheduleQuery.error.message}
              </p>
            </div>
          ) : null}

          {!scheduleQuery.isLoading &&
          !scheduleQuery.error &&
          scheduleQuery.data ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-border bg-white px-4 py-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      جدول الأوقات
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      الأيام النشطة هنا تتحكم مباشرة في ما يظهر للمريض داخل
                      بوابة الحجز.
                    </p>
                  </div>
                  <span className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                    {scheduleQuery.data.filter((row) => row.isActive).length}{" "}
                    مفعل
                  </span>
                </div>
                {/* Branch selector */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {SCHEDULE_BRANCHES.map((b) => (
                    <button
                      key={b.value}
                      type="button"
                      onClick={() => { setScheduleBranch(b.value as typeof scheduleBranch); }}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                        scheduleBranch === b.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:bg-muted/40",
                      )}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {scheduleQuery.data.map((row) => (
                <ScheduleRowCard
                  key={row.bookingType}
                  row={row}
                  branch={scheduleBranch}
                  onSaved={() => void scheduleQuery.refetch()}
                />
              ))}

              <ClosuresPanel />
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
