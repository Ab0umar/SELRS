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
  GitBranch,
  Pill,
  Printer,
  Syringe,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { queueStatusLabelsAr, serviceTypeLabels } from "@/lib/dashboard-data";
import {
  useTodayQueuePatientsMerged,
  type TodayQueuePatient,
} from "@/hooks/useTodayQueuePatientsMerged";
import {
  PatientMedicalStatusStrip,
  type PatientMedicalStatus,
} from "@/components/patients/PatientMedicalStatusBadges";
import type { QueueStatus } from "@/lib/dashboard-data";
import { trpc } from "@/lib/trpc";
import { TodayPatientShortcutsDialog } from "@/components/today/TodayPatientShortcutsDialog";
import { FollowupFormDialog } from "@/components/today/FollowupFormDialog";
import { getLocalDateIso } from "@/hooks/operations/operationsShared";
import { DateInput } from "@/components/ui/date-input";
import { buildPrintUrl } from "@/lib/print";
import { QuickPatientEntryDialog } from "@/components/dashboard/QuickPatientEntryDialog";

type QueueFilter = "bookings" | "confirmed" | "treated";
type BookingRegistrationTarget =
  { source: "schedule"; item: any } | { source: "portal"; item: any };

const PRINT_SHEET_TYPES = [
  { value: "consultant", label: "كشف" },
  { value: "specialist", label: "مقاس نظاره / اشعه خارجي" },
  { value: "lasik", label: "تصحيح ابصار" },
  { value: "external", label: "د.الصواف" },
] as const;

const QUEUE_FILTERS: { value: QueueFilter; label: string }[] = [
  { value: "bookings", label: "حجز" },
  { value: "confirmed", label: "مؤكد" },
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
  const userRole = String((user as any)?.role ?? "").toLowerCase();
  const canDeletePatient = userRole === "admin";
  const canManageTreated = ["reception", "admin"].includes(userRole);
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

  const [queueFilter, setQueueFilter] = useState<QueueFilter>("confirmed");
  const [showExternal, setShowExternal] = useState(false);
  const [activeSection, setActiveSection] = useState<"patients" | "operations">(
    "patients",
  );
  const [registrationTarget, setRegistrationTarget] =
    useState<BookingRegistrationTarget | null>(null);

  const { merged, isLoading, byStatus } = useTodayQueuePatientsMerged(
    selectedDate,
    { includeExternal: showExternal },
  );
  const todayPatientIds = useMemo(
    () => merged.map((patient) => patient.id).filter(Boolean),
    [merged],
  );
  const medicalStatusQuery = trpc.medical.getPatientMedicalStatusBatch.useQuery(
    { patientIds: todayPatientIds },
    {
      enabled: todayPatientIds.length > 0,
      staleTime: 120_000,
      refetchOnWindowFocus: false,
    },
  );
  const medicalStatuses = medicalStatusQuery.data as
    Record<number, PatientMedicalStatus> | undefined;

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
  const removeRegisteredScheduleRequest =
    trpc.patient.removeVisitScheduleRequest.useMutation();
  const confirmRegisteredPortalBooking = (
    trpc as any
  ).patientPortal.updateBooking.useMutation();

  const handleBookingRegistrationSaved = async ({
    patientId,
  }: {
    patientId: number;
  }) => {
    if (!registrationTarget) return;
    if (registrationTarget.source === "schedule") {
      await removeRegisteredScheduleRequest.mutateAsync({
        requestId: registrationTarget.item.id,
      });
    } else {
      await confirmRegisteredPortalBooking.mutateAsync({
        id: registrationTarget.item.id,
        patientId,
        status: "confirmed",
        confirmedDate: selectedDate,
      });
    }
    await Promise.all([
      utils.patient.getVisitScheduleRequests.invalidate(),
      (utils as any).patientPortal.listBookings.invalidate(),
      utils.medical.getTodayPatientsByQueueStatus.invalidate(),
    ]);
    setRegistrationTarget(null);
  };
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
      confirmed:
        byStatus.checkedIn.length +
        byStatus.next.length +
        byStatus.clinic1.length +
        byStatus.clinic2.length +
        byStatus.pentacam.length,
      treated: byStatus.treated.length,
    }),
    [
      byStatus.checkedIn.length,
      byStatus.next.length,
      byStatus.clinic1.length,
      byStatus.clinic2.length,
      byStatus.pentacam.length,
      byStatus.treated.length,
    ],
  );

  const filteredPatients = useMemo(() => {
    if (queueFilter === "confirmed") {
      return merged.filter((patient) => patient.queueStatus !== "treated");
    }
    if (queueFilter === "treated") return byStatus.treated;
    return [];
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
        className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-border/60 bg-muted/30 p-1"
        role="tablist"
        aria-label="مسار اليوم والعمليات"
      >
        {(
          [
            { id: "patients", label: "مسار اليوم", icon: Users },
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

            <div className="flex min-h-9 flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {QUEUE_FILTERS.map(({ value, label }) => {
                  const n =
                    value === "bookings"
                      ? bookingsForDate.length +
                        (scheduleRequestsQuery.data?.length ?? 0)
                      : ((counts as Record<string, number>)[value] ?? 0);
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
              <label
                className={cn(
                  "cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground",
                  queueFilter === "bookings" ? "hidden" : "flex",
                )}
              >
                <Checkbox
                  checked={showExternal}
                  onCheckedChange={(checked) =>
                    setShowExternal(checked === true)
                  }
                />
                إظهار حالات الخارج
              </label>
            </div>

            {queueFilter === "bookings" ? null : isLoading ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                جاري التحميل…
              </p>
            ) : filteredPatients.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center px-4 py-12 text-center text-sm text-muted-foreground">
                لا يوجد مرضى في هذه الفئة
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 min-[520px]:grid-cols-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {filteredPatients.map((patient) => (
                  <QueuePatientCard
                    key={`${patient.id}-${patient.queueStatus}`}
                    patient={patient}
                    medicalStatus={medicalStatuses?.[patient.id]}
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
                    canManageTreated={canManageTreated}
                    canDelete={canDeletePatient}
                    onRequestDelete={() => setDeleteTarget(patient)}
                    visitDate={selectedDate}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === "patients" && queueFilter === "bookings" && (
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
                <div className="space-y-3">
                  {(scheduleRequestsQuery.data?.length ?? 0) > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        مواعيد الاستقبال (
                        {scheduleRequestsQuery.data?.length ?? 0})
                      </p>
                      <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                        {(scheduleRequestsQuery.data ?? []).map((r: any) => (
                          <ScheduleRequestCard
                            key={r.id}
                            r={r}
                            onRegister={() =>
                              setRegistrationTarget({
                                source: "schedule",
                                item: r,
                              })
                            }
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {bookingsForDate.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        حجوزات البوابة ({bookingsForDate.length})
                      </p>
                      <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                        {bookingsForDate.map((booking) => (
                          <BookingCard
                            key={booking.id}
                            booking={booking}
                            visitDate={selectedDate}
                            onRegister={() =>
                              setRegistrationTarget({
                                source: "portal",
                                item: booking,
                              })
                            }
                          />
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
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
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
      <QuickPatientEntryDialog
        open={registrationTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRegistrationTarget(null);
        }}
        initialData={
          registrationTarget
            ? {
                patientId:
                  registrationTarget.source === "portal"
                    ? registrationTarget.item.patientId
                    : null,
                patientCode:
                  registrationTarget.source === "portal"
                    ? registrationTarget.item.patientCode
                    : null,
                fullName:
                  registrationTarget.item.fullName ??
                  registrationTarget.item.patientName ??
                  registrationTarget.item.guestName,
                age: registrationTarget.item.age,
                phone:
                  registrationTarget.item.phone ??
                  registrationTarget.item.patientPhone ??
                  registrationTarget.item.guestPhone,
                email:
                  registrationTarget.item.patientEmail ??
                  registrationTarget.item.guestEmail,
                visitDate: selectedDate,
                serviceType:
                  registrationTarget.item.service ??
                  registrationTarget.item.bookingType,
              }
            : undefined
        }
        onSaved={handleBookingRegistrationSaved}
      />
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
  consultant: "إستشاري",
  specialist: "أخصائي",
  pentacam: "بنتاكام",
  external: "أشعة",
  followup: "متابعة",
};

function ScheduleRequestCard({
  r,
  onRegister,
}: {
  r: any;
  onRegister: () => void;
}) {
  const utils = trpc.useUtils();
  const remove = trpc.patient.removeVisitScheduleRequest.useMutation({
    onSuccess: async () => {
      await utils.patient.getVisitScheduleRequests.invalidate();
      toast.success("تم حذف الموعد");
    },
    onError: () => toast.error("تعذر الحذف"),
  });
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5">
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold">{r.fullName}</p>
        <p className="truncate text-[10px] text-muted-foreground">
          {serviceTypeLabels[r.service as string] ?? r.service}
          {r.phone ? ` · ${r.phone}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          size="sm"
          className="h-7 gap-1 px-2 text-[10px]"
          onClick={onRegister}
        >
          <UserPlus className="h-3.5 w-3.5" aria-hidden />
          تأكيد وتسجيل
        </Button>
        <button
          type="button"
          disabled={remove.isPending}
          onClick={() => remove.mutate({ requestId: r.id })}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
          aria-label="حذف الموعد"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

function BookingCard({
  booking,
  onRegister,
  visitDate,
}: {
  booking: any;
  onRegister: () => void;
  visitDate: string;
}) {
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
    <div className={cn("rounded-lg border px-2.5 py-1.5", stStyle)}>
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
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
          <Button
            type="button"
            size="sm"
            className="h-7 gap-1 px-2 text-[10px]"
            onClick={onRegister}
          >
            <UserPlus className="h-3.5 w-3.5" aria-hidden />
            تأكيد وتسجيل
          </Button>
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
                    buildPrintUrl(
                      `/prescription/${booking.patientId}?visitDate=${encodeURIComponent(visitDate)}`,
                    ),
                    "_blank",
                  )
                }
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="طباعة روشتة"
              >
                <Pill className="h-3.5 w-3.5" aria-hidden />
              </button>
              <button
                type="button"
                title="طباعة طلب تحاليل"
                onClick={() =>
                  window.open(
                    buildPrintUrl(
                      `/request-tests/${booking.patientId}?visitDate=${encodeURIComponent(visitDate)}`,
                    ),
                    "_blank",
                  )
                }
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="طباعة طلب تحاليل"
              >
                <FlaskConical className="h-3.5 w-3.5" aria-hidden />
              </button>
              <button
                type="button"
                title="طباعة مقاس النظارة"
                onClick={() =>
                  window.open(
                    buildPrintUrl(
                      `/refraction/${booking.patientId}?visitDate=${encodeURIComponent(visitDate)}`,
                    ),
                    "_blank",
                  )
                }
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="طباعة مقاس النظارة"
              >
                <Glasses className="h-3.5 w-3.5" aria-hidden />
              </button>
            </>
          ) : null}
          <button
            type="button"
            disabled={del.isPending}
            onClick={() => del.mutate({ id: booking.id })}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
            aria-label="حذف الحجز"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

function QueuePatientCard({
  patient,
  medicalStatus,
  onSelectPatient,
  onMarkVisitTreated,
  markVisitTreatedPendingVisitId,
  canManageTreated,
  canDelete,
  onRequestDelete,
  visitDate,
}: {
  patient: TodayQueuePatient;
  medicalStatus?: PatientMedicalStatus;
  onSelectPatient: () => void;
  onMarkVisitTreated: (visitId: number) => void;
  markVisitTreatedPendingVisitId: number | null;
  canManageTreated: boolean;
  canDelete?: boolean;
  onRequestDelete?: () => void;
  visitDate: string;
}) {
  const st = patient.queueStatus as QueueStatus;
  const visitId = coercePositiveInt((patient as { visitId?: unknown }).visitId);
  const canMarkTreated =
    canManageTreated &&
    ["clinic1", "clinic2", "pentacam"].includes(st) &&
    patient.hasQueueCompletionData === true &&
    visitId != null;
  const markingThis =
    markVisitTreatedPendingVisitId != null &&
    markVisitTreatedPendingVisitId === visitId;
  const serviceTypeText =
    serviceTypeLabels[patient.serviceType ?? ""] ?? patient.serviceType ?? "—";
  const doctorText = String(patient.doctorName ?? "").trim() || "—";
  const timeText = String(patient.checkedInTime ?? "").trim() || "—";
  const withVisitDate = (path: string) => {
    const url = new URL(path, window.location.origin);
    url.searchParams.set("visitDate", visitDate);
    return `${url.pathname}${url.search}`;
  };

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
        "overflow-hidden rounded-lg border bg-card transition-[border-color,box-shadow,background-color] duration-200 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        queueCardStyles[st],
        "cursor-pointer",
      )}
    >
      <PatientMedicalStatusStrip status={medicalStatus} />
      <div className="p-2">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <p className="min-w-0 flex-1 truncate text-xs font-bold text-foreground">
                {patient.fullName ?? "—"}
              </p>
              {(patient as { visitType?: string }).visitType === "followup" ? (
                <Badge className="h-5 border-info/20 bg-info/15 px-1.5 text-[10px] text-info">
                  متابعة
                </Badge>
              ) : null}
            </div>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-[10px] leading-4 text-muted-foreground">
              <Badge
                className={cn("h-5 px-1.5 text-[10px]", queueStatusStyles[st])}
              >
                {queueStatusLabelsAr[st] ?? st}
              </Badge>
              {["clinic1", "clinic2", "pentacam"].includes(st) ? (
                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                  {st === "clinic1"
                    ? "عيادة 1"
                    : st === "clinic2"
                      ? "عيادة 2"
                      : "الأشعة - بنتاكام"}
                </Badge>
              ) : null}
              <span className="min-w-0 max-w-full truncate">
                الطبيب: {doctorText}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "h-5 max-w-full truncate px-1.5 text-[10px]",
                  serviceTypeStyles[patient.serviceType ?? ""],
                )}
              >
                {serviceTypeText}
              </Badge>
              <span className="shrink-0 text-foreground tabular-nums">
                {timeText}
              </span>
              {visitId != null ? (
                <button
                  type="button"
                  title="فتح مسار الزيارة"
                  aria-label="فتح مسار الزيارة"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const query = new URLSearchParams({
                      visitId: String(visitId),
                      visitDate,
                    });
                    window.location.assign(
                      `/workflow-prototype?${query.toString()}`,
                    );
                  }}
                >
                  <GitBranch className="h-5 w-5" aria-hidden />
                </button>
              ) : null}
              {st === "treated" && patient.treatedByName ? (
                <span className="min-w-0 max-w-full truncate font-medium text-success">
                  تم بواسطة: {patient.treatedByName}
                </span>
              ) : null}
            </div>
          </div>

          {canMarkTreated ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={markingThis}
              className="h-7 shrink-0 gap-1 border-success/35 px-2 text-[11px] text-success hover:bg-success/10"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (visitId != null) onMarkVisitTreated(visitId);
              }}
            >
              <Check className="h-3.5 w-3.5" aria-hidden />
              معالج
            </Button>
          ) : st === "treated" ? (
            <CheckCircle2
              className="mt-1 h-4 w-4 shrink-0 text-success"
              aria-hidden
            />
          ) : null}
        </div>

        <div className="mt-1.5 flex items-center justify-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title="طباعة الشيتات والتقارير"
                aria-label="طباعة الشيتات والتقارير"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
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
                    const query = new URLSearchParams({ original: "1" });
                    query.set("visitDate", visitDate);
                    if ((patient as any).visitType === "followup") {
                      query.set("includeFollowups", "1");
                    }
                    window.open(
                      `/sheets/${value}/${patient.id}?${query.toString()}`,
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
                  window.open(
                    withVisitDate(`/sheets/referral/${patient.id}`),
                    "_blank",
                  );
                }}
              >
                خطاب تحويل
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(
                    withVisitDate(`/clinical-report/${patient.id}`),
                    "_blank",
                  );
                }}
              >
                التقرير السريري الشامل
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(
                    withVisitDate(`/pre-post-op-report/${patient.id}`),
                    "_blank",
                  );
                }}
              >
                تقرير ما قبل/بعد العملية
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(
                    withVisitDate(`/post-op-offdays/${patient.id}`),
                    "_blank",
                  );
                }}
              >
                إجازة ما بعد العملية
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(
                    withVisitDate(`/medical-condition-report/${patient.id}`),
                    "_blank",
                  );
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
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              window.open(
                buildPrintUrl(
                  `/prescription/${patient.id}?visitDate=${encodeURIComponent(visitDate)}`,
                ),
                "_blank",
              );
            }}
          >
            <Pill className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            title="طباعة طلب تحاليل"
            aria-label="طباعة طلب تحاليل"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              window.open(
                buildPrintUrl(
                  `/request-tests/${patient.id}?visitDate=${encodeURIComponent(visitDate)}`,
                ),
                "_blank",
              );
            }}
          >
            <FlaskConical className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            title="طباعة مقاس النظارة"
            aria-label="طباعة مقاس النظارة"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              window.open(
                buildPrintUrl(
                  `/refraction/${patient.id}?visitDate=${encodeURIComponent(visitDate)}`,
                ),
                "_blank",
              );
            }}
          >
            <Glasses className="h-4 w-4" aria-hidden />
          </button>
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
    <div className={cn("rounded-lg border px-3 py-2", stStyle)}>
      <div className="flex min-h-8 flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {row.item.name?.trim() || "مريض"}
          </p>
          <p className="truncate text-xs leading-4 text-muted-foreground">
            {row.item.code ?? "—"} · {operationLabel}
            {row.item.eye ? ` · ${row.item.eye}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          {row.item.hospital || row.listTime ? (
            <span className="max-w-48 truncate">
              {[row.item.hospital, row.listTime].filter(Boolean).join(" · ")}
            </span>
          ) : null}
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4",
              stStyle,
            )}
          >
            {doctorDisplay}
          </span>
        </div>
      </div>
    </div>
  );
}
