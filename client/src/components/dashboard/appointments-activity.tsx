import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, getTrpcErrorMessage } from "@/lib/utils";
import { toast } from "sonner";
import {
  Calendar,
  CalendarPlus,
  Check,
  CheckCircle2,
  Clock,
  FlaskConical,
  Glasses,
  Pill,
  Printer,
  Syringe,
  Trash2,
  Users,
} from "lucide-react";
import { queueStatusLabelsAr, serviceTypeLabels } from "@/lib/dashboard-data";
import {
  useTodayQueuePatientsMerged,
  type TodayQueuePatient,
} from "@/hooks/useTodayQueuePatientsMerged";
import type { QueueStatus } from "@/lib/dashboard-data";
import { trpc } from "@/lib/trpc";
import { TodayPatientShortcutsDialog } from "@/components/today/TodayPatientShortcutsDialog";
import { FollowupFormDialog } from "@/components/today/FollowupFormDialog";
import { getLocalDateIso } from "@/hooks/operations/operationsShared";
import { DateInput } from "@/components/ui/date-input";
import { buildPrintUrl } from "@/lib/print";

type QueueFilter = "all" | QueueStatus | "clinic1" | "clinic2";

const PRINT_SHEET_TYPES = [
  { value: "consultant", label: "كشف" },
  { value: "specialist", label: "مقاس نظاره / اشعه خارجي" },
  { value: "lasik", label: "تصحيح ابصار" },
  { value: "external", label: "د.الصواف" },
] as const;

const QUEUE_FILTERS: { value: QueueFilter; label: string }[] = [
  { value: "clinic1", label: "عيادة 1" },
  { value: "clinic2", label: "عيادة 2" },
  { value: "pentacam", label: "بنتاكام" },
  { value: "treated", label: "معالج" },
];

const queueStatusStyles: Record<QueueStatus, string> = {
  checkedIn: "bg-info/10 text-info",
  next: "bg-warning text-warning-foreground",
  clinic1: "bg-primary text-primary-foreground",
  clinic2: "bg-primary text-primary-foreground",
  pentacam: "bg-secondary text-secondary-foreground",
  treated: "bg-success text-success-foreground",
};

const queueCardStyles: Record<QueueStatus, string> = {
  checkedIn: "border-info/30 bg-info/5",
  next: "border-warning/30 bg-warning/5",
  clinic1: "border-primary/30 bg-primary/5",
  clinic2: "border-primary/30 bg-primary/5",
  pentacam: "border-secondary/30 bg-secondary/5",
  treated: "border-success/30 bg-success/5",
};

const serviceTypeStyles: Record<string, string> = {
  consultant: "bg-secondary text-secondary-foreground",
  specialist: "bg-secondary text-secondary-foreground",
  lasik: "bg-primary text-primary-foreground",
  external: "bg-muted text-muted-foreground",
  surgery: "bg-error/10 text-error",
};

function coercePositiveInt(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v) && v > 0)
    return Math.trunc(v);
  if (typeof v === "bigint") {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.trunc(n) : undefined;
  }
  if (typeof v === "string" && /^\d+$/.test(v.trim())) {
    const n = parseInt(v.trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }
  return undefined;
}

function formatDateLongAr(iso: string) {
  const parts = iso.split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) return iso;
  const dt = new Date(y, m - 1, d, 12, 0, 0, 0);
  return dt.toLocaleDateString("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function isYmd(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export function AppointmentsSection({
  onOpenMeasurementsMedicalFile,
  selectedDate: controlledSelectedDate,
  onSelectedDateChange,
}: {
  onOpenMeasurementsMedicalFile?: (patientId: number) => void;
  selectedDate?: string;
  onSelectedDateChange?: (date: string) => void;
} = {}) {
  const { user } = useAuth();
  const canDeletePatient =
    String((user as any)?.role ?? "").toLowerCase() === "admin";
  const [deleteTarget, setDeleteTarget] = useState<TodayQueuePatient | null>(
    null,
  );
  const [alsoDeleteMssql, setAlsoDeleteMssql] = useState(false);
  const [shortcutPatient, setShortcutPatient] =
    useState<TodayQueuePatient | null>(null);
  const [followupPatient, setFollowupPatient] =
    useState<TodayQueuePatient | null>(null);

  const handleSelectPatient = (patient: TodayQueuePatient) => {
    if ((patient as any).visitType === "followup") {
      setFollowupPatient(patient);
    } else {
      setShortcutPatient(patient);
    }
  };
  /** Same calendar-day default as Operations list (`getLocalDateIso`), not UTC midnight. */
  const [internalSelectedDate, setInternalSelectedDate] =
    useState(getLocalDateIso);
  const selectedDate = controlledSelectedDate ?? internalSelectedDate;

  const setTodayPatientsDate = (ymd: string) => {
    if (!isYmd(ymd)) return;
    if (onSelectedDateChange) onSelectedDateChange(ymd);
    else setInternalSelectedDate(ymd);
  };

  const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");
  const [activeSection, setActiveSection] = useState<
    "patients" | "bookings" | "operations"
  >("patients");

  const { merged, isLoading, byStatus } =
    useTodayQueuePatientsMerged(selectedDate);

  // ── Portal bookings for the selected date ───────────────────────────────
  const bookingsQuery = (trpc as any).patientPortal.listBookings.useQuery(
    { date: selectedDate, limit: 200 },
    { staleTime: 60_000, refetchOnWindowFocus: false },
  );
  const bookingsForDate = (bookingsQuery.data ?? []) as any[];

  // ── Schedule requests (from حجز موعد/كشف dialog) ────────────────────────
  const scheduleRequestsQuery = trpc.patient.getVisitScheduleRequests.useQuery(
    { date: selectedDate },
    { staleTime: 60_000, refetchOnWindowFocus: false },
  );

  useEffect(() => {
    const handler = () => {
      void (bookingsQuery as any).refetch();
      void scheduleRequestsQuery.refetch();
    };
    window.addEventListener("booking-update", handler);
    return () => window.removeEventListener("booking-update", handler);
  }, [bookingsQuery, scheduleRequestsQuery]);

  const utils = trpc.useUtils();
  const markVisitTreated = trpc.medical.updateVisitQueueStatus.useMutation({
    onSuccess: async () => {
      await utils.medical.getTodayPatientsByQueueStatus.invalidate();
      toast.success("تم تسجيل المريض كمعالج");
    },
    onError: (error: unknown) => {
      toast.error(getTrpcErrorMessage(error, "تعذر تحديث حالة الطابور"));
    },
  });

  const deleteFromMssql = trpc.medical.deletePatientFromMssql.useMutation();
  const deletePatientWithAllData =
    trpc.medical.deletePatientWithAllData.useMutation({
      onSuccess: async () => {
        await utils.medical.getTodayPatientsByQueueStatus.invalidate();
      },
    });

  const closeDeleteDialog = () => {
    setDeleteTarget(null);
    setAlsoDeleteMssql(false);
  };

  const confirmDeletePatient = async () => {
    if (!deleteTarget) return;
    const patientId = deleteTarget.id;
    const patientCode = deleteTarget.patientCode ?? undefined;
    try {
      if (alsoDeleteMssql) {
        await deleteFromMssql.mutateAsync({ patientId, patientCode });
      }
      await deletePatientWithAllData.mutateAsync({ patientId });
      toast.success("تم حذف المريض");
      closeDeleteDialog();
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "تعذر حذف المريض"));
    }
  };

  /** Same source as Operations page aggregates: saved lists + optional MSSQL surgery rows (`medical.getTodayOperationLists`). */
  const todayOperationListsQuery = trpc.medical.getTodayOperationLists.useQuery(
    { date: selectedDate },
    { staleTime: 60 * 1000, refetchOnWindowFocus: false },
  );
  const doctorsDirectoryQuery = trpc.medical.getDoctors.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const doctorNameByCode = useMemo(() => {
    const map = new Map<string, string>();
    const doctors = (doctorsDirectoryQuery.data ?? []) as Array<{
      code?: string | null;
      name?: string | null;
    }>;
    for (const doctor of doctors) {
      const code = String(doctor.code ?? "")
        .trim()
        .toLowerCase();
      const name = String(doctor.name ?? "").trim();
      if (code && name) map.set(code, name);
    }
    return map;
  }, [doctorsDirectoryQuery.data]);

  const todayOperationsFlat = useMemo(() => {
    type OpItem = {
      id?: number;
      name?: string | null;
      code?: string | null;
      doctor?: string | null;
      operation?: string | null;
      eye?: string | null;
      hospital?: string | null;
      payment?: string | null;
      phone?: string | null;
    };
    type OpListRow = {
      id?: number;
      doctorTab?: string | null;
      doctorName?: string | null;
      operationType?: string | null;
      listTime?: string | null;
      isAutoFromMssql?: boolean;
      items?: OpItem[];
    };
    const lists = (todayOperationListsQuery.data ?? []) as OpListRow[];
    const out: Array<{
      key: string;
      listId: number;
      doctorTab: string;
      listDoctorName: string | null;
      listOperationType: string | null;
      listTime: string | null;
      isAutoFromMssql: boolean;
      item: OpItem;
    }> = [];
    for (const list of lists) {
      const listId = Number(list.id ?? 0);
      const doctorTab = String(list.doctorTab ?? "").trim() || "—";
      const items = list.items ?? [];
      for (const item of items) {
        const itemId = Number(item.id ?? 0);
        out.push({
          key: `${listId}-${itemId}-${String(item.code ?? "").trim()}-${String(item.name ?? "").trim()}`,
          listId,
          doctorTab,
          listDoctorName: list.doctorName ?? null,
          listOperationType: list.operationType ?? null,
          listTime: list.listTime ?? null,
          isAutoFromMssql: Boolean(list.isAutoFromMssql),
          item,
        });
      }
    }
    return out;
  }, [todayOperationListsQuery.data]);

  const counts = useMemo(
    () => ({
      all: merged.length,
      clinic1: byStatus.clinic1.length,
      clinic2: byStatus.clinic2.length,
      pentacam: byStatus.pentacam.length,
      treated: byStatus.treated.length,
    }),
    [
      merged.length,
      byStatus.clinic1.length,
      byStatus.clinic2.length,
      byStatus.pentacam.length,
      byStatus.treated.length,
    ],
  );

  const filteredPatients = useMemo(() => {
    if (queueFilter === "all") return merged;
    if (queueFilter === "clinic1") return byStatus.clinic1;
    if (queueFilter === "clinic2") return byStatus.clinic2;
    if (queueFilter === "treated") return byStatus.treated;
    return merged.filter((p) => p.queueStatus === queueFilter);
  }, [queueFilter, merged, byStatus]);

  return (
    <div className="space-y-4">
      <TodayPatientShortcutsDialog
        open={shortcutPatient != null}
        onOpenChange={(next) => {
          if (!next) setShortcutPatient(null);
        }}
        patientId={shortcutPatient?.id ?? 0}
        patientName={shortcutPatient?.fullName}
        onOpenMeasurementsMedicalFile={onOpenMeasurementsMedicalFile}
      />
      <FollowupFormDialog
        open={followupPatient != null}
        onOpenChange={(next) => {
          if (!next) setFollowupPatient(null);
        }}
        patientId={followupPatient?.id ?? 0}
        patientName={followupPatient?.fullName}
        serviceType={(followupPatient as any)?.serviceType}
      />
      <Dialog
        open={deleteTarget != null}
        onOpenChange={(next) => {
          if (!next) closeDeleteDialog();
        }}
      >
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>حذف المريض</DialogTitle>
            <DialogDescription>
              سيتم حذف المريض{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.fullName ?? ""}
              </span>{" "}
              وكل بياناته من قاعدة البيانات نهائيًا. هذا الإجراء لا يمكن التراجع
              عنه.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 py-2">
            <Checkbox
              id="also-delete-mssql"
              checked={alsoDeleteMssql}
              onCheckedChange={(checked) =>
                setAlsoDeleteMssql(checked === true)
              }
            />
            <Label htmlFor="also-delete-mssql" className="cursor-pointer">
              حذف المريض من MSSQL أيضًا
            </Label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDeleteDialog}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              disabled={
                deleteFromMssql.isPending || deletePatientWithAllData.isPending
              }
              onClick={() => void confirmDeletePatient()}
            >
              {deleteFromMssql.isPending || deletePatientWithAllData.isPending
                ? "جاري الحذف..."
                : "حذف نهائي"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div
        className="mb-5 grid grid-cols-3 gap-1 rounded-xl border border-border/60 bg-muted/30 p-1"
        role="tablist"
        aria-label="قوائم المرضى والحجوزات والعمليات"
      >
        {(
          [
            { id: "patients", label: "مرضى اليوم", icon: Users },
            { id: "bookings", label: "حجز", icon: CalendarPlus },
            { id: "operations", label: "العمليات", icon: Syringe },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const selected = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveSection(tab.id)}
              className={cn(
                "flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                selected
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span>{tab.label}</span>
              {tab.id === "bookings" &&
                bookingsForDate.length +
                  (scheduleRequestsQuery.data?.length ?? 0) >
                  0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-warning px-1 text-[10px] font-bold text-warning-foreground tabular-nums">
                    {bookingsForDate.length +
                      (scheduleRequestsQuery.data?.length ?? 0)}
                  </span>
                )}
              {tab.id === "operations" && todayOperationsFlat.length > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold text-secondary-foreground tabular-nums">
                  {todayOperationsFlat.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {activeSection === "patients" && (
          <div className="xl:col-span-12 flex flex-col gap-3">
            <div
              className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4"
              dir="rtl"
            >
              <div className="flex items-center gap-2 text-sm">
                <Calendar
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <span className="font-semibold text-foreground">
                  مرضى اليوم
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <DateInput
                  value={selectedDate}
                  onChange={(e) => setTodayPatientsDate(e.target.value)}
                  className="h-9 w-[11.5rem] shrink-0 font-mono text-sm"
                  dir="ltr"
                  aria-label="تاريخ مرضى اليوم — تعديل"
                />
                <p className="max-w-full min-w-0 text-sm text-muted-foreground sm:max-w-[min(100%,28rem)]">
                  {formatDateLongAr(selectedDate)}
                </p>
              </div>
            </div>

            <div className="flex h-9 flex-wrap items-center gap-2">
              {QUEUE_FILTERS.map(({ value, label }) => {
                const n = (counts as Record<string, number>)[value] ?? 0;
                const active = queueFilter === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setQueueFilter(value)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-card text-foreground",
                    )}
                  >
                    {label}{" "}
                    <span className="tabular-nums opacity-90">
                      ({n.toLocaleString("ar-EG")})
                    </span>
                  </button>
                );
              })}
            </div>

            {isLoading ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                جاري التحميل…
              </p>
            ) : filteredPatients.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center px-4 py-12 text-center text-sm text-muted-foreground">
                لا يوجد مرضى في هذه الفئة
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                {filteredPatients.map((patient) => (
                  <QueuePatientCard
                    key={`${patient.id}-${patient.queueStatus}`}
                    patient={patient}
                    onSelectPatient={() => handleSelectPatient(patient)}
                    markVisitTreatedPendingVisitId={
                      markVisitTreated.isPending
                        ? (markVisitTreated.variables?.visitId ?? null)
                        : null
                    }
                    onMarkVisitTreated={(visitId) => {
                      markVisitTreated.mutate({
                        visitId,
                        queueStatus: "treated",
                        patientId: patient.id,
                        date: selectedDate,
                      });
                    }}
                    canDelete={canDeletePatient}
                    onRequestDelete={() => setDeleteTarget(patient)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === "bookings" && (
          <div className="xl:col-span-12 flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <div className="flex h-9 items-center gap-2 text-sm font-semibold text-foreground">
                <CalendarPlus className="h-4 w-4" />
                حجز
                {bookingsForDate.length +
                  (scheduleRequestsQuery.data?.length ?? 0) >
                  0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[10px] font-bold text-warning-foreground tabular-nums">
                    {bookingsForDate.length +
                      (scheduleRequestsQuery.data?.length ?? 0)}
                  </span>
                )}
              </div>
              {bookingsQuery.isLoading || scheduleRequestsQuery.isLoading ? (
                <div className="grid gap-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-xl" />
                  ))}
                </div>
              ) : bookingsForDate.length === 0 &&
                (scheduleRequestsQuery.data?.length ?? 0) === 0 ? (
                <div className="flex min-h-[120px] flex-col items-center justify-center px-4 py-8 text-center text-xs text-muted-foreground">
                  لا توجد حجوزات لهذا اليوم
                </div>
              ) : (
                <div className="space-y-4">
                  {(scheduleRequestsQuery.data?.length ?? 0) > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        مواعيد الاستقبال (
                        {scheduleRequestsQuery.data?.length ?? 0})
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {(scheduleRequestsQuery.data ?? []).map((r: any) => (
                          <ScheduleRequestCard key={r.id} r={r} />
                        ))}
                      </div>
                    </div>
                  )}
                  {bookingsForDate.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        حجوزات البوابة ({bookingsForDate.length})
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {bookingsForDate.map((booking) => (
                          <BookingCard key={booking.id} booking={booking} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeSection === "operations" && (
          <div className="xl:col-span-12 flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Syringe className="h-4 w-4" />
                العمليات
              </div>
              {todayOperationListsQuery.isLoading ? (
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-xl" />
                  ))}
                </div>
              ) : todayOperationListsQuery.isError ? (
                <div
                  className="flex min-h-[120px] flex-col items-center justify-center rounded-lg border border-destructive/25 bg-destructive text-destructive-foreground text-xs"
                  role="alert"
                >
                  {getTrpcErrorMessage(
                    todayOperationListsQuery.error,
                    "تعذر تحميل قائمة العمليات",
                  )}
                </div>
              ) : todayOperationsFlat.length === 0 ? (
                <div className="flex min-h-[120px] flex-col items-center justify-center px-4 py-8 text-center text-xs text-muted-foreground">
                  لا توجد عمليات مسجّلة لهذا اليوم
                </div>
              ) : (
                <div className="grid gap-2">
                  {todayOperationsFlat.map((row) => (
                    <TodayOperationListItemCard
                      key={row.key}
                      row={row}
                      doctorNameByCode={doctorNameByCode}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const BOOKING_STATUS_STYLE: Record<string, string> = {
  pending: "border-warning/30 bg-warning/5 text-warning",
  confirmed: "border-primary/30 bg-primary/5 text-primary",
  cancelled: "border-destructive/30 bg-destructive/5 text-destructive",
  completed: "border-border bg-muted/30 text-muted-foreground",
};
const BOOKING_STATUS_AR: Record<string, string> = {
  pending: "قيد المراجعة",
  confirmed: "مؤكد",
  cancelled: "ملغي",
  completed: "مكتمل",
};
const BOOKING_TYPES_AR: Record<string, string> = {
  consultant: "كشف استشاري",
  specialist: "كشف أخصائي",
  lasik: "فحوصات الليزك",
  external: "أشعة خارجي",
  followup: "متابعة",
};

function ScheduleRequestCard({ r }: { r: any }) {
  const utils = trpc.useUtils();
  const remove = trpc.patient.removeVisitScheduleRequest.useMutation({
    onSuccess: async () => {
      await utils.patient.getVisitScheduleRequests.invalidate();
      toast.success("تم حذف الموعد");
    },
    onError: () => toast.error("تعذر الحذف"),
  });
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5 flex items-start justify-between gap-2">
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-semibold truncate">{r.fullName}</p>
        <p className="text-xs text-muted-foreground">
          {serviceTypeLabels[r.service as string] ?? r.service}
          {r.phone ? ` · ${r.phone}` : ""}
        </p>
      </div>
      <button
        type="button"
        disabled={remove.isPending}
        onClick={() => remove.mutate({ requestId: r.id })}
        className="shrink-0 mt-0.5 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
        aria-label="حذف الموعد"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function BookingCard({ booking }: { booking: any }) {
  const utils = trpc.useUtils();
  const del = (trpc as any).patientPortal.deleteBooking.useMutation({
    onSuccess: async () => {
      await (utils as any).patientPortal.listBookings.invalidate();
      toast.success("تم حذف الحجز");
    },
    onError: () => toast.error("تعذر الحذف"),
  });
  const name = booking.patientName ?? booking.guestName ?? "—";
  const code = booking.patientCode ?? (booking.isGuest ? "زائر" : "جديد");
  const type =
    BOOKING_TYPES_AR[booking.bookingType] ??
    booking.typeLabel ??
    booking.bookingType;
  const stStyle =
    BOOKING_STATUS_STYLE[booking.status] ?? BOOKING_STATUS_STYLE.completed;
  const stAr = BOOKING_STATUS_AR[booking.status] ?? booking.status;
  const branchLabel =
    booking.branch === "tanta"
      ? "طنطا"
      : booking.branch === "kfs"
        ? "كفر الشيخ"
        : null;
  return (
    <div className={cn("rounded-lg border px-2.5 py-1.5 shadow-sm", stStyle)}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-foreground">
            {name}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">
            {code} · {type}
            {branchLabel ? ` · ${branchLabel}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1 shrink-0">
          <span
            className={cn(
              "rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
              stStyle,
            )}
          >
            {stAr}
          </span>
          {booking.patientId ? (
            <>
              <button
                type="button"
                title="طباعة روشتة"
                onClick={() =>
                  window.open(
                    `/prescription/${booking.patientId}?print=1`,
                    "_blank",
                  )
                }
                className="text-muted-foreground hover:text-error transition-colors"
                aria-label="طباعة روشتة"
              >
                <Pill className="h-3 w-3" />
              </button>
              <button
                type="button"
                title="طباعة طلب تحاليل"
                onClick={() =>
                  window.open(
                    `/request-tests/${booking.patientId}?print=1`,
                    "_blank",
                  )
                }
                className="text-muted-foreground hover:text-error transition-colors"
                aria-label="طباعة طلب تحاليل"
              >
                <FlaskConical className="h-3 w-3" />
              </button>
              <button
                type="button"
                title="طباعة مقاس النظارة"
                onClick={() =>
                  window.open(
                    buildPrintUrl(`/refraction/${booking.patientId}`),
                    "_blank",
                  )
                }
                className="text-muted-foreground hover:text-error transition-colors"
                aria-label="طباعة مقاس النظارة"
              >
                <Glasses className="h-3 w-3" />
              </button>
            </>
          ) : null}
          <button
            type="button"
            disabled={del.isPending}
            onClick={() => del.mutate({ id: booking.id })}
            className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
            aria-label="حذف الحجز"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function QueuePatientCard({
  patient,
  onSelectPatient,
  onMarkVisitTreated,
  markVisitTreatedPendingVisitId,
  canDelete,
  onRequestDelete,
}: {
  patient: TodayQueuePatient;
  onSelectPatient: () => void;
  onMarkVisitTreated: (visitId: number) => void;
  markVisitTreatedPendingVisitId: number | null;
  canDelete?: boolean;
  onRequestDelete?: () => void;
}) {
  const st = patient.queueStatus as QueueStatus;
  const visitId = coercePositiveInt((patient as { visitId?: unknown }).visitId);
  const canMarkTreated = st !== "treated" && visitId != null;
  const markingThis =
    markVisitTreatedPendingVisitId != null &&
    markVisitTreatedPendingVisitId === visitId;
  const serviceTypeText =
    serviceTypeLabels[patient.serviceType ?? ""] ?? patient.serviceType ?? "—";
  const doctorText = String(patient.doctorName ?? "").trim() || "—";
  const timeText = String(patient.checkedInTime ?? "").trim() || "—";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelectPatient()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelectPatient();
        }
      }}
      aria-label={`فتح اختصارات المريض ${patient.fullName ?? ""}`.trim()}
      className={cn(
        "overflow-hidden rounded-xl border bg-card shadow-sm transition-[border-color,box-shadow,background-color] duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        queueCardStyles[st],
        "cursor-pointer",
      )}
    >
      <div className="p-3">
        <div className="flex min-w-0 items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">
            {patient.fullName ?? "—"}
          </p>
          {canDelete ? (
            <button
              type="button"
              title="حذف المريض"
              aria-label={`حذف ${patient.fullName ?? "المريض"}`}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onRequestDelete?.();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <Badge className={cn("text-xs", queueStatusStyles[st])}>
            {queueStatusLabelsAr[st] ?? st}
          </Badge>
          {canMarkTreated ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={markingThis}
              className="h-8 gap-1 border-success/35 px-2 text-xs text-success hover:bg-success/10"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (visitId != null) onMarkVisitTreated(visitId);
              }}
            >
              <Check className="h-3.5 w-3.5" aria-hidden />
              معالج
            </Button>
          ) : (
            <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
          )}
        </div>

        <div className="mt-2 border-t border-border/50 pt-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-muted-foreground">الطبيب</span>
            <span className="min-w-0 flex-1 truncate text-foreground">
              {doctorText}
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 text-muted-foreground">الخدمة</span>
              <Badge
                variant="outline"
                className={cn(
                  "max-w-full truncate text-xs",
                  serviceTypeStyles[patient.serviceType ?? ""],
                )}
              >
                {serviceTypeText}
              </Badge>
            </div>
            <span className="shrink-0 text-foreground tabular-nums">
              {timeText}
            </span>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-center gap-2 border-t border-border/50 pt-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title="طباعة الشيتات والتقارير"
                aria-label="طباعة الشيتات والتقارير"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
              >
                <Printer className="h-4 w-4" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onClick={(e) => e.stopPropagation()}
              style={{ direction: "rtl" }}
            >
              {PRINT_SHEET_TYPES.map(({ value, label }) => (
                <DropdownMenuItem
                  key={value}
                  onClick={(e) => {
                    e.stopPropagation();
                    const suffix =
                      (patient as any).visitType === "followup"
                        ? "/followup"
                        : "";
                    window.open(
                      `/sheets/${value}/${patient.id}${suffix}?original=1`,
                      "_blank",
                    );
                  }}
                >
                  {label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`/sheets/referral/${patient.id}`, "_blank");
                }}
              >
                خطاب تحويل
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`/clinical-report/${patient.id}`, "_blank");
                }}
              >
                التقرير السريري الشامل
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`/pre-post-op-report/${patient.id}`, "_blank");
                }}
              >
                تقرير ما قبل/بعد العملية
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`/post-op-offdays/${patient.id}`, "_blank");
                }}
              >
                إجازة ما بعد العملية
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`/medical-condition-report/${patient.id}`, "_blank");
                }}
              >
                تقرير حالة طبية
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            title="طباعة روشتة"
            aria-label="طباعة روشتة"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              window.open(`/prescription/${patient.id}?print=1`, "_blank");
            }}
          >
            <Pill className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            title="طباعة طلب تحاليل"
            aria-label="طباعة طلب تحاليل"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              window.open(`/request-tests/${patient.id}?print=1`, "_blank");
            }}
          >
            <FlaskConical className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            title="طباعة مقاس النظارة"
            aria-label="طباعة مقاس النظارة"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              window.open(buildPrintUrl(`/refraction/${patient.id}`), "_blank");
            }}
          >
            <Glasses className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

function TodayOperationListItemCard({
  row,
  doctorNameByCode,
}: {
  row: {
    doctorTab: string;
    listDoctorName: string | null;
    listOperationType: string | null;
    listTime: string | null;
    isAutoFromMssql: boolean;
    item: {
      name?: string | null;
      code?: string | null;
      doctor?: string | null;
      operation?: string | null;
      eye?: string | null;
      hospital?: string | null;
      payment?: string | null;
    };
  };
  doctorNameByCode: Map<string, string>;
}) {
  const rawDoctor = String(row.item.doctor ?? row.listDoctorName ?? "").trim();
  const doctorDisplay = (() => {
    if (!rawDoctor) return "طبيب غير محدد";
    const byCode = doctorNameByCode.get(rawDoctor.toLowerCase());
    return byCode || rawDoctor;
  })();
  const operationLabel =
    row.item.operation?.trim() || row.listOperationType?.trim() || "عملية";
  const stStyle = row.isAutoFromMssql
    ? "border-secondary/30 bg-secondary/5 text-secondary"
    : "border-destructive/30 bg-destructive/5 text-destructive";

  return (
    <div className={cn("rounded-xl border p-3 shadow-sm", stStyle)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {row.item.name?.trim() || "مريض"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {row.item.code ?? "—"} · {operationLabel}
            {row.item.eye ? ` · ${row.item.eye}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px] font-medium",
              stStyle,
            )}
          >
            {doctorDisplay}
          </span>
        </div>
      </div>
      {row.item.hospital || row.listTime ? (
        <p className="mt-2 truncate text-xs text-muted-foreground">
          {[row.item.hospital, row.listTime].filter(Boolean).join(" · ")}
        </p>
      ) : null}
    </div>
  );
}
