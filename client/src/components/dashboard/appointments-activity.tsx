import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, getTrpcErrorMessage } from "@/lib/utils";
import { toast } from "sonner";
import { Calendar, Check, CheckCircle2, Clock, Syringe, Users } from "lucide-react";
import { queueStatusLabelsAr, serviceTypeLabels } from "@/lib/dashboard-data";
import { useTodayQueuePatientsMerged, type TodayQueuePatient } from "@/hooks/useTodayQueuePatientsMerged";
import type { QueueStatus } from "@/lib/dashboard-data";
import { trpc } from "@/lib/trpc";
import { TodayPatientShortcutsDialog } from "@/components/today/TodayPatientShortcutsDialog";

type MainTab = "patients" | "operations";
type QueueFilter = "all" | QueueStatus;

const QUEUE_FILTERS: { value: QueueFilter; label: string }[] = [
  { value: "all", label: "الكل" },
  { value: "checkedIn", label: "تسجيل" },
  { value: "next", label: "التالي" },
  { value: "clinic", label: "عيادة" },
  { value: "treated", label: "معالج" },
];

const queueStatusStyles: Record<QueueStatus, string> = {
  checkedIn: "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary",
  next: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  clinic: "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300",
  treated: "bg-secondary/15 text-secondary dark:bg-secondary/25 dark:text-secondary",
};

const serviceTypeStyles: Record<string, string> = {
  consultant: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  specialist: "bg-secondary/15 text-secondary dark:bg-secondary/25 dark:text-secondary",
  lasik: "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300",
  external: "bg-gray-100 text-gray-600 dark:bg-gray-800/60 dark:text-gray-400",
  surgery: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
};

function coercePositiveInt(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return Math.trunc(v);
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

function formatTimeAr(dateString: string | Date | null | undefined) {
  if (dateString == null) return "—";
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

function appointmentTypeAr(t: string | null | undefined) {
  if (t === "examination") return "فحص";
  if (t === "surgery") return "جراحة";
  if (t === "followup") return "متابعة";
  return "موعد";
}

function appointmentStatusAr(s: string | null | undefined) {
  if (s === "completed") return "مكتمل";
  if (s === "cancelled") return "ملغي";
  if (s === "no_show") return "لم يحضر";
  return "مجدول";
}

const TODAY_PATIENTS_DATE_KEY = "selrs:today-patients-date";

function isYmd(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function readStoredTodayPatientsDate(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TODAY_PATIENTS_DATE_KEY);
    return raw && isYmd(raw) ? raw : null;
  } catch {
    return null;
  }
}

function initialTodayPatientsDate() {
  return readStoredTodayPatientsDate() ?? new Date().toISOString().split("T")[0];
}

export function AppointmentsSection({
  onOpenMeasurementsMedicalFile,
}: {
  onOpenMeasurementsMedicalFile?: (patientId: number) => void;
} = {}) {
  const [shortcutPatient, setShortcutPatient] = useState<TodayQueuePatient | null>(null);
  const [selectedDate, setSelectedDate] = useState(initialTodayPatientsDate);

  const setTodayPatientsDate = (ymd: string) => {
    if (!isYmd(ymd)) return;
    setSelectedDate(ymd);
    try {
      localStorage.setItem(TODAY_PATIENTS_DATE_KEY, ymd);
    } catch {
      /* ignore quota / private mode */
    }
  };

  const [mainTab, setMainTab] = useState<MainTab>("patients");
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");

  const { merged, isLoading, byStatus } = useTodayQueuePatientsMerged(selectedDate);

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

  const appointmentsQuery = trpc.medical.getAppointments.useQuery(undefined, {
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const todayAppointments = useMemo(() => {
    const rows = (appointmentsQuery.data ?? []) as Array<{
      appointmentDate?: string | Date | null;
      id?: number;
      patientId?: number;
      patientName?: string | null;
      patientCode?: string | null;
      appointmentType?: string | null;
      status?: string | null;
      branch?: string | null;
    }>;
    return rows
      .filter((apt) => {
        if (!apt.appointmentDate) return false;
        const day = new Date(apt.appointmentDate as string).toISOString().split("T")[0];
        return day === selectedDate;
      })
      .sort((a, b) => {
        const ta = a.appointmentDate ? new Date(a.appointmentDate as string).getTime() : 0;
        const tb = b.appointmentDate ? new Date(b.appointmentDate as string).getTime() : 0;
        return ta - tb;
      });
  }, [appointmentsQuery.data, selectedDate]);

  const surgeryTodayCount = useMemo(
    () => todayAppointments.filter((a) => a.appointmentType === "surgery").length,
    [todayAppointments],
  );

  const counts = useMemo(
    () => ({
      all: merged.length,
      checkedIn: byStatus.checkedIn.length,
      next: byStatus.next.length,
      clinic: byStatus.clinic.length,
      treated: byStatus.treated.length,
    }),
    [merged.length, byStatus.checkedIn.length, byStatus.next.length, byStatus.clinic.length, byStatus.treated.length],
  );

  const filteredPatients = useMemo(() => {
    if (queueFilter === "all") return merged;
    return merged.filter((p) => p.queueStatus === queueFilter);
  }, [queueFilter, merged]);

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
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4" dir="rtl">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="font-semibold text-foreground">تاريخ مرضى اليوم</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setTodayPatientsDate(e.target.value)}
              className="h-9 w-[11.5rem] shrink-0 font-mono text-sm"
              dir="ltr"
              aria-label="تاريخ مرضى اليوم — تعديل"
            />
            <p className="max-w-full min-w-0 text-xs text-muted-foreground sm:max-w-[min(100%,28rem)] sm:text-sm">
              {formatDateLongAr(selectedDate)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground sm:text-sm">
          <span>
            <span className="font-semibold text-foreground tabular-nums">{merged.length.toLocaleString("ar-EG")}</span>{" "}
            مريض
          </span>
          <span className="text-border">|</span>
          <span>
            <span className="font-semibold text-foreground tabular-nums">
              {surgeryTodayCount > 0
                ? surgeryTodayCount.toLocaleString("ar-EG")
                : todayAppointments.length.toLocaleString("ar-EG")}
            </span>{" "}
            {surgeryTodayCount > 0 ? "عملية" : "موعد"}
          </span>
        </div>
      </div>

      <div className="flex gap-1 rounded-xl border border-border/80 bg-muted/30 p-1 sm:inline-flex sm:w-auto">
        <Button
          type="button"
          variant={mainTab === "patients" ? "default" : "ghost"}
          size="sm"
          className={cn("flex-1 gap-2 rounded-lg sm:flex-none", mainTab === "patients" && "shadow-sm")}
          onClick={() => setMainTab("patients")}
        >
          <Users className="h-4 w-4" />
          مرضى اليوم
        </Button>
        <Button
          type="button"
          variant={mainTab === "operations" ? "default" : "ghost"}
          size="sm"
          className={cn("flex-1 gap-2 rounded-lg sm:flex-none", mainTab === "operations" && "shadow-sm")}
          onClick={() => setMainTab("operations")}
        >
          <Syringe className="h-4 w-4" />
          العمليات
        </Button>
      </div>

      {mainTab === "patients" ? (
        <>
          <div className="flex flex-wrap gap-2">
            {QUEUE_FILTERS.map(({ value, label }) => {
              const n = counts[value];
              const active = queueFilter === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setQueueFilter(value)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm",
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  {label}{" "}
                  <span className="tabular-nums opacity-90">({n.toLocaleString("ar-EG")})</span>
                </button>
              );
            })}
          </div>

          {isLoading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">جاري التحميل…</p>
          ) : filteredPatients.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/10 px-4 py-12 text-center text-sm text-muted-foreground">
              لا يوجد مرضى في هذه الفئة
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 xl:grid-cols-5">
              {filteredPatients.map((patient) => (
                <QueuePatientCard
                  key={`${patient.id}-${patient.queueStatus}`}
                  patient={patient}
                  onSelectPatient={() => setShortcutPatient(patient)}
                  markVisitTreatedPendingVisitId={
                    markVisitTreated.isPending ? markVisitTreated.variables?.visitId ?? null : null
                  }
                  onMarkVisitTreated={(visitId) => {
                    markVisitTreated.mutate({
                      visitId,
                      queueStatus: "treated",
                      patientId: patient.id,
                      date: selectedDate,
                    });
                  }}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {appointmentsQuery.isLoading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">جاري التحميل…</p>
          ) : todayAppointments.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/10 px-4 py-12 text-center text-sm text-muted-foreground">
              لا توجد مواعيد في هذا اليوم
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {todayAppointments.map((apt, idx) => (
                <OperationDayCard key={apt.id ?? `${apt.patientId}-${idx}`} appointment={apt} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function QueuePatientCard({
  patient,
  onSelectPatient,
  onMarkVisitTreated,
  markVisitTreatedPendingVisitId,
}: {
  patient: TodayQueuePatient;
  onSelectPatient: () => void;
  onMarkVisitTreated: (visitId: number) => void;
  markVisitTreatedPendingVisitId: number | null;
}) {
  const st = patient.queueStatus as QueueStatus;
  const visitId = coercePositiveInt((patient as { visitId?: unknown }).visitId);
  const canMarkTreated = st !== "treated" && visitId != null;
  const markingThis = markVisitTreatedPendingVisitId != null && markVisitTreatedPendingVisitId === visitId;

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
      className={cn(
        "rounded-xl border border-border bg-card p-3 shadow-sm transition-all hover:shadow-md sm:p-4",
        "border-s-4",
        st === "checkedIn" && "border-s-primary",
        st === "next" && "border-s-amber-500",
        st === "clinic" && "border-s-orange-500",
        st === "treated" && "border-s-emerald-600",
        "cursor-pointer",
      )}
    >
      <div className="flex items-start justify-between gap-1.5">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-xs font-semibold leading-snug sm:text-sm">{patient.fullName ?? "—"}</p>
          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground sm:text-xs">{patient.doctorName ?? "—"}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {st === "treated" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
          ) : null}
          <Badge className={cn("max-w-full truncate text-[10px] sm:text-xs", queueStatusStyles[st])}>
            {queueStatusLabelsAr[st] ?? st}
          </Badge>
        </div>
      </div>
      <div className="mt-2.5 flex flex-col gap-1.5 border-t border-border/50 pt-2 text-xs sm:mt-3 sm:flex-row sm:items-center sm:justify-between">
        <Badge variant="outline" className={cn("w-fit max-w-full truncate text-[10px]", serviceTypeStyles[patient.serviceType ?? ""])}>
          {serviceTypeLabels[patient.serviceType ?? ""] ?? patient.serviceType ?? "—"}
        </Badge>
        <div className="flex items-center gap-1.5">
          {canMarkTreated ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={markingThis}
              title="معالج"
              className="h-7 w-7 shrink-0 border-secondary/30 bg-secondary/10 p-0 text-secondary hover:border-secondary/50 hover:bg-secondary/15 dark:border-secondary/40 dark:bg-secondary/20 dark:hover:border-secondary/60 dark:hover:bg-secondary/25"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (visitId != null) onMarkVisitTreated(visitId);
              }}
            >
              <Check className="h-3.5 w-3.5" aria-hidden />
            </Button>
          ) : null}
          <span className="flex items-center gap-1 tabular-nums text-muted-foreground">
            <Clock className="h-3 w-3 shrink-0" />
            {patient.checkedInTime ?? "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

function OperationDayCard({
  appointment,
}: {
  appointment: {
    patientName?: string | null;
    patientCode?: string | null;
    appointmentDate?: string | Date | null;
    appointmentType?: string | null;
    status?: string | null;
    branch?: string | null;
  };
}) {
  const t = appointment.appointmentType ?? "";
  const accent =
    t === "surgery"
      ? "border-s-rose-500"
      : t === "followup"
        ? "border-s-amber-500"
        : "border-s-primary";

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-3 shadow-sm transition-all hover:shadow-md sm:p-4",
        "border-s-4",
        accent,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-snug">{appointment.patientName ?? "مريض"}</p>
          {appointment.patientCode ? (
            <p className="mt-0.5 text-xs text-muted-foreground">رقم: {appointment.patientCode}</p>
          ) : null}
        </div>
        <Badge variant="outline" className="shrink-0 text-[10px] sm:text-xs">
          {appointmentStatusAr(appointment.status)}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2 text-xs">
        <Badge className="bg-primary/10 text-[10px] text-primary sm:text-xs">{appointmentTypeAr(t)}</Badge>
        <span className="flex items-center gap-1 tabular-nums text-muted-foreground">
          <Clock className="h-3 w-3 shrink-0" />
          {formatTimeAr(appointment.appointmentDate)}
        </span>
      </div>
      {appointment.branch ? (
        <p className="mt-1.5 text-[10px] text-muted-foreground">الفرع: {appointment.branch}</p>
      ) : null}
    </div>
  );
}
