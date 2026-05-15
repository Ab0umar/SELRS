import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, getTrpcErrorMessage } from "@/lib/utils";
import { toast } from "sonner";
import { Calendar, Check, CheckCircle2, Clock, Syringe, Users } from "lucide-react";
import { queueStatusLabelsAr, serviceTypeLabels } from "@/lib/dashboard-data";
import { useTodayQueuePatientsMerged, type TodayQueuePatient } from "@/hooks/useTodayQueuePatientsMerged";
import { PatientMedicalStatusStrip, type PatientMedicalStatus } from "@/components/patients/PatientMedicalStatusBadges";
import type { QueueStatus } from "@/lib/dashboard-data";
import { trpc } from "@/lib/trpc";
import { TodayPatientShortcutsDialog } from "@/components/today/TodayPatientShortcutsDialog";
import { getLocalDateIso } from "@/hooks/operations/operationsShared";

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
  checkedIn: "bg-info/10 text-info",
  next: "bg-warning/10 text-warning",
  clinic: "bg-primary/10 text-primary",
  treated: "bg-success/10 text-success",
};

const queueCardStyles: Record<QueueStatus, string> = {
  checkedIn: "border-info/30 bg-info/5",
  next: "border-warning/30 bg-warning/5",
  clinic: "border-primary/30 bg-primary/5",
  treated: "border-success/30 bg-success/5",
};

const serviceTypeStyles: Record<string, string> = {
  consultant: "bg-secondary/10 text-secondary",
  specialist: "bg-secondary/15 text-secondary",
  lasik: "bg-primary/10 text-primary",
  external: "bg-muted text-muted-foreground",
  surgery: "bg-error/10 text-error",
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

function localYmdFromInstant(value: string | Date | null | undefined) {
  if (value == null) return null;
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return null;
  }
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
  const [shortcutPatient, setShortcutPatient] = useState<TodayQueuePatient | null>(null);
  /** Same calendar-day default as Operations list (`getLocalDateIso`), not UTC midnight. */
  const [internalSelectedDate, setInternalSelectedDate] = useState(getLocalDateIso);
  const selectedDate = controlledSelectedDate ?? internalSelectedDate;

  const setTodayPatientsDate = (ymd: string) => {
    if (!isYmd(ymd)) return;
    if (onSelectedDateChange) onSelectedDateChange(ymd);
    else setInternalSelectedDate(ymd);
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
    const doctors = (doctorsDirectoryQuery.data ?? []) as Array<{ code?: string | null; name?: string | null }>;
    for (const doctor of doctors) {
      const code = String(doctor.code ?? "").trim().toLowerCase();
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
        const day = localYmdFromInstant(apt.appointmentDate as string | Date);
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

  const operationListItemCount = todayOperationsFlat.length;

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

  const todayPatientIds = useMemo(() => merged.map((p) => p.id).filter(Boolean), [merged]);
  const medicalStatusQuery = trpc.medical.getPatientMedicalStatusBatch.useQuery(
    { patientIds: todayPatientIds },
    { enabled: todayPatientIds.length > 0, staleTime: 120_000, refetchOnWindowFocus: false },
  );
  const medicalStatuses = medicalStatusQuery.data as Record<number, PatientMedicalStatus> | undefined;

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
              {operationListItemCount > 0
                ? operationListItemCount.toLocaleString("ar-EG")
                : surgeryTodayCount > 0
                  ? surgeryTodayCount.toLocaleString("ar-EG")
                  : todayAppointments.length.toLocaleString("ar-EG")}
            </span>{" "}
            {operationListItemCount > 0 || surgeryTodayCount > 0 ? "عملية" : "موعد"}
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
                  medicalStatus={medicalStatuses?.[patient.id]}
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
          {todayOperationListsQuery.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-xl" />
              ))}
            </div>
          ) : todayOperationListsQuery.isError ? (
            <div
              className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-12 text-center text-sm text-destructive"
              role="alert"
            >
              {getTrpcErrorMessage(todayOperationListsQuery.error, "تعذر تحميل قائمة العمليات")}
            </div>
          ) : todayOperationsFlat.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/10 px-4 py-12 text-center text-sm text-muted-foreground">
              لا توجد عمليات مسجّلة لهذا اليوم
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {todayOperationsFlat.map((row) => (
                <TodayOperationListItemCard key={row.key} row={row} doctorNameByCode={doctorNameByCode} />
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
  medicalStatus,
  onSelectPatient,
  onMarkVisitTreated,
  markVisitTreatedPendingVisitId,
}: {
  patient: TodayQueuePatient;
  medicalStatus?: PatientMedicalStatus;
  onSelectPatient: () => void;
  onMarkVisitTreated: (visitId: number) => void;
  markVisitTreatedPendingVisitId: number | null;
}) {
  const st = patient.queueStatus as QueueStatus;
  const visitId = coercePositiveInt((patient as { visitId?: unknown }).visitId);
  const canMarkTreated = st !== "treated" && visitId != null;
  const markingThis = markVisitTreatedPendingVisitId != null && markVisitTreatedPendingVisitId === visitId;
  const serviceTypeText = serviceTypeLabels[patient.serviceType ?? ""] ?? patient.serviceType ?? "—";
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
      <PatientMedicalStatusStrip status={medicalStatus} />
      <div className="px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
      <div className="flex items-start justify-between gap-1.5">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-xs font-semibold leading-snug text-foreground sm:text-sm">{patient.fullName ?? "—"}</p>
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
      <div className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 border-t border-border/50 pt-2 text-xs">
        <span className="text-muted-foreground">الطبيب</span>
        <span className="text-right text-foreground break-words">{doctorText}</span>
        <span className="text-muted-foreground">نوع الخدمة</span>
        <span className="text-right">
          <Badge variant="outline" className={cn("max-w-full text-[10px]", serviceTypeStyles[patient.serviceType ?? ""])}>
            {serviceTypeText}
          </Badge>
        </span>
        <span className="text-muted-foreground">الوقت</span>
        <span className="text-right text-foreground tabular-nums">{timeText}</span>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1.5 text-xs sm:mt-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5">
          {canMarkTreated ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={markingThis}
              title="معالج"
              aria-label={`تسجيل ${patient.fullName ?? "المريض"} كمعالج`}
              className="h-11 w-11 shrink-0 border-secondary/35 bg-secondary/10 p-0 text-secondary hover:border-secondary/50 hover:bg-secondary/15 dark:border-secondary/40 dark:bg-secondary/20 dark:hover:border-secondary/60 dark:hover:bg-secondary/25"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (visitId != null) onMarkVisitTreated(visitId);
              }}
            >
              <Check className="h-3.5 w-3.5" aria-hidden />
            </Button>
          ) : null}
        </div>
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
  const accent = row.isAutoFromMssql
    ? "border-violet-300 bg-violet-50/45 dark:bg-violet-950/20"
    : "border-rose-300 bg-rose-50/45 dark:bg-rose-950/20";
  const rawDoctor = String(row.item.doctor ?? row.listDoctorName ?? "").trim();
  const doctorDisplay = (() => {
    if (!rawDoctor) return "طبيب غير محدد";
    const byCode = doctorNameByCode.get(rawDoctor.toLowerCase());
    return byCode || rawDoctor;
  })();

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-3 shadow-sm transition-[border-color,box-shadow,background-color] duration-200 hover:shadow-md sm:p-4",
        accent,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-snug">{row.item.name?.trim() || "مريض"}</p>
          {row.item.code ? (
            <p className="mt-0.5 text-xs text-muted-foreground">رقم: {row.item.code}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {row.isAutoFromMssql ? (
            <Badge variant="outline" className="text-[10px] sm:text-xs">
              مزامنة
            </Badge>
          ) : null}
          <Badge variant="outline" className="max-w-[9rem] truncate text-[10px] sm:text-xs" title={doctorDisplay}>
            {doctorDisplay}
          </Badge>
        </div>
      </div>
      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
        {row.item.doctor ? <p>الطبيب: {row.item.doctor}</p> : row.listDoctorName ? <p>الطبيب: {row.listDoctorName}</p> : null}
        {row.item.operation ? (
          <p className="font-medium text-foreground">العملية: {row.item.operation}</p>
        ) : row.listOperationType ? (
          <p className="font-medium text-foreground">نوع القائمة: {row.listOperationType}</p>
        ) : null}
        {row.item.eye ? <p>العين: {row.item.eye}</p> : null}
        {row.item.hospital ? <p>المستشفى: {row.item.hospital}</p> : null}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2 text-xs">
        {row.item.payment ? (
          <Badge className="bg-amber-50 text-[10px] text-amber-800 sm:text-xs">{row.item.payment}</Badge>
        ) : (
          <span />
        )}
        {row.listTime ? (
          <span className="flex items-center gap-1 tabular-nums text-muted-foreground">
            <Clock className="h-3 w-3 shrink-0" />
            {row.listTime}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3 shrink-0" />
            —
          </span>
        )}
      </div>
    </div>
  );
}
