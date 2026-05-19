import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { PatientMedicalStatusStrip, type PatientMedicalStatus } from "@/components/patients/PatientMedicalStatusBadges";
import { TodayPatientShortcutsDialog } from "@/components/today/TodayPatientShortcutsDialog";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { trpc } from "@/lib/trpc";
import { cn, getTrpcErrorMessage } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowUpRight,
  CalendarDays,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Stethoscope,
  Syringe,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getLocalDateIso } from "@/hooks/operations/operationsShared";
import { queueStatusLabelsAr, serviceTypeLabels } from "@/lib/dashboard-data";
import type { QueueStatus } from "@/lib/dashboard-data";
import type { TodayQueuePatient } from "@/hooks/useTodayQueuePatientsMerged";
import { useTodayQueuePatientsMerged } from "@/hooks/useTodayQueuePatientsMerged";
import { TodayOperationListItemCard } from "./TodayOperationListItemCard";

type QueueStage = QueueStatus;
type QueueFilter = QueueStage | "bookings";

const STAGES: QueueStage[] = ["checkedIn", "next", "clinic", "treated"];

const QUEUE_FILTERS: { value: QueueFilter; label: string }[] = [
  { value: "bookings", label: "حجز" },
  { value: "checkedIn", label: "تسجيل" },
  { value: "next", label: "التالي" },
  { value: "clinic", label: "عيادة" },
  { value: "treated", label: "معالج" },
];

const STAGE_META: Record<
  QueueStage,
  { label: string; icon: LucideIcon; tone: string; softTone: string; accent: string }
> = {
  checkedIn: {
    label: "تسجيل",
    icon: Users,
    tone: "text-info",
    softTone: "bg-info/10 text-info",
    accent: "border-info/30 bg-info/5",
  },
  next: {
    label: "التالي",
    icon: ArrowUpRight,
    tone: "text-card-foreground",
    softTone: "bg-warning text-warning-foreground",
    accent: "border-warning/35 bg-warning/5",
  },
  clinic: {
    label: "عيادة",
    icon: Stethoscope,
    tone: "text-card-foreground",
    softTone: "bg-primary text-primary-foreground",
    accent: "border-primary/30 bg-primary/5",
  },
  treated: {
    label: "معالج",
    icon: CheckCircle2,
    tone: "text-card-foreground",
    softTone: "bg-success text-success-foreground",
    accent: "border-success/30 bg-success/5",
  },
};

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
  });
}

function isYmd(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

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

function getQueueInstant(patient: TodayQueuePatient, selectedDate: string) {
  const raw =
    (patient as { checkedInAt?: string | null }).checkedInAt ??
    (patient as { visitDate?: string | null }).visitDate ??
    patient.checkedInTime ??
    null;
  if (!raw) return null;
  const text = String(raw).trim();
  if (!text) return null;

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return parsed.getTime();

  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(text) && isYmd(selectedDate)) {
    const hhmm = text.length === 5 ? `${text}:00` : text;
    const local = new Date(`${selectedDate}T${hhmm}`);
    if (!Number.isNaN(local.getTime())) return local.getTime();
  }

  return null;
}

function formatWaitLabel(minutes: number) {
  if (minutes <= 0) return "أقل من دقيقة";
  return `${minutes.toLocaleString("ar-EG")} د`;
}

function getWaitMinutes(patient: TodayQueuePatient, selectedDate: string, nowMs: number) {
  const instant = getQueueInstant(patient, selectedDate);
  if (instant == null) return null;
  return Math.max(0, Math.floor((nowMs - instant) / 60000));
}

function averageWaitLabel(minutes: Array<number | null>) {
  const values = minutes.filter((v): v is number => typeof v === "number");
  if (values.length === 0) return "—";
  const avg = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  return `${avg.toLocaleString("ar-EG")} د`;
}

function sortByWaitDesc(
  patients: TodayQueuePatient[],
  selectedDate: string,
  nowMs: number,
) {
  return [...patients].sort((a, b) => {
    const aWait = getWaitMinutes(a, selectedDate, nowMs) ?? -1;
    const bWait = getWaitMinutes(b, selectedDate, nowMs) ?? -1;
    if (aWait !== bWait) return bWait - aWait;
    const aTime = getQueueInstant(a, selectedDate) ?? 0;
    const bTime = getQueueInstant(b, selectedDate) ?? 0;
    return aTime - bTime;
  });
}

function getPatientLabel(patient: TodayQueuePatient) {
  return String(patient.fullName ?? "").trim() || "—";
}

function getServiceLabel(serviceType?: string) {
  return serviceTypeLabels[serviceType ?? ""] ?? serviceType ?? "—";
}

function getBottleneckStage(
  counts: Record<QueueStage, number>,
  waitSnapshot: Record<QueueStage, number | null>,
) {
  const candidates: QueueStage[] = ["checkedIn", "next", "clinic"];
  let best: QueueStage = "checkedIn";
  let bestScore = -1;
  for (const stage of candidates) {
    const count = counts[stage];
    const wait = waitSnapshot[stage] ?? 0;
    const score = count * 1000 + wait;
    if (score > bestScore) {
      bestScore = score;
      best = stage;
    }
  }
  return best;
}

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0);
}

function dateToIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function CompactPatientCard({
  patient,
  medicalStatus,
  onSelectPatient,
  onMarkVisitTreated,
  markVisitTreatedPendingVisitId,
  isReadOnly,
}: {
  patient: TodayQueuePatient;
  medicalStatus?: PatientMedicalStatus;
  onSelectPatient: () => void;
  onMarkVisitTreated: (visitId: number) => void;
  markVisitTreatedPendingVisitId: number | null;
  isReadOnly?: boolean;
}) {
  const st = patient.queueStatus as QueueStage;
  const meta = STAGE_META[st];
  const visitId = coercePositiveInt((patient as { visitId?: unknown }).visitId);
  const canMarkTreated = !isReadOnly && st !== "treated" && visitId != null;
  const markingThis = markVisitTreatedPendingVisitId != null && markVisitTreatedPendingVisitId === visitId;
  const doctorText = String(patient.doctorName ?? "").trim();
  const serviceText = getServiceLabel(patient.serviceType);

  return (
    <div className={cn("rounded-lg border text-right transition-[border-color,box-shadow]", meta.accent)}>
      <PatientMedicalStatusStrip status={medicalStatus} />
      <button
        type="button"
        onClick={onSelectPatient}
        className="w-full px-3 py-2.5 text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        aria-label={`فتح اختصارات ${getPatientLabel(patient)}`}
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-snug text-foreground">
              {getPatientLabel(patient)}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {serviceText}
              {doctorText ? ` · ${doctorText}` : ""}
            </p>
          </div>
        </div>
      </button>
      {canMarkTreated ? (
        <div className="flex justify-end border-t border-border/40 px-2.5 pb-2 pt-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={markingThis}
            aria-label={`تسجيل ${getPatientLabel(patient)} كمعالج`}
            className="h-7 gap-1.5 border-success/30 bg-success text-success-foreground hover:bg-success/15"
            onClick={(e) => {
              e.stopPropagation();
              if (visitId != null) onMarkVisitTreated(visitId);
            }}
          >
            <Check className="h-3 w-3" aria-hidden />
            معالج
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function GridPatientCard({
  patient,
  medicalStatus,
  onSelectPatient,
  onMarkVisitTreated,
  markVisitTreatedPendingVisitId,
  isReadOnly,
}: {
  patient: TodayQueuePatient;
  medicalStatus?: PatientMedicalStatus;
  onSelectPatient: () => void;
  onMarkVisitTreated: (visitId: number) => void;
  markVisitTreatedPendingVisitId: number | null;
  isReadOnly?: boolean;
}) {
  const st = patient.queueStatus as QueueStage;
  const meta = STAGE_META[st];
  const visitId = coercePositiveInt((patient as { visitId?: unknown }).visitId);
  const canMarkTreated = !isReadOnly && st !== "treated" && visitId != null;
  const markingThis = markVisitTreatedPendingVisitId != null && markVisitTreatedPendingVisitId === visitId;
  const doctorText = String(patient.doctorName ?? "").trim() || "—";
  const serviceText = getServiceLabel(patient.serviceType);
  const timeText = String(patient.checkedInTime ?? "").trim() || "—";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelectPatient}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelectPatient();
        }
      }}
      aria-label={`فتح اختصارات المريض ${getPatientLabel(patient)}`}
      className={cn(
        "cursor-pointer overflow-hidden rounded-xl border bg-card shadow-sm transition-[border-color,box-shadow] duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        meta.accent,
      )}
    >
      <PatientMedicalStatusStrip status={medicalStatus} />
      <div className="px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
        <div className="flex items-start justify-between gap-1.5">
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-xs font-semibold leading-snug text-foreground sm:text-sm">
              {getPatientLabel(patient)}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {st === "treated" ? (
              <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
            ) : null}
            <Badge className={cn("max-w-full truncate text-[10px] sm:text-xs", meta.softTone)}>
              {meta.label}
            </Badge>
          </div>
        </div>
        <div className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 border-t border-border/50 pt-2 text-xs">
          <span className="text-muted-foreground">الطبيب</span>
          <span className="break-words text-right text-foreground">{doctorText}</span>
          <span className="text-muted-foreground">الخدمة</span>
          <span className="text-right">
            <Badge variant="outline" className="max-w-full truncate text-[10px]">{serviceText}</Badge>
          </span>
          <span className="text-muted-foreground">الوقت</span>
          <span className="tabular-nums text-right text-foreground">{timeText}</span>
        </div>
        {canMarkTreated ? (
          <div className="mt-2 flex justify-end sm:mt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={markingThis}
              aria-label={`تسجيل ${getPatientLabel(patient)} كمعالج`}
              className="h-11 w-11 shrink-0 border-success/30 bg-success text-success-foreground hover:border-success/50 hover:bg-success/15"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (visitId != null) onMarkVisitTreated(visitId);
              }}
            >
              <Check className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

type VisitScheduleRequestRow = {
  id: number;
  fullName: string;
  age?: number | null;
  visitDate?: string | Date | null;
  phone?: string | null;
  service?: string | null;
};

function formatScheduleRequestDate(value: VisitScheduleRequestRow["visitDate"]) {
  if (!value) return "—";
  const text = value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
  return text || "—";
}

function BookingRequestCard({
  request,
  removing,
  isReadOnly,
  onRemove,
}: {
  request: VisitScheduleRequestRow;
  removing: boolean;
  isReadOnly?: boolean;
  onRemove: () => void;
}) {
  const serviceText = serviceTypeLabels[String(request.service ?? "")] ?? request.service ?? "—";

  return (
    <div className="rounded-xl border border-warning/25 bg-warning/5 p-3 text-right shadow-sm">
      <div className="flex items-start gap-3">
        <label className="mt-1 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-warning/30 bg-background text-card-foreground transition-colors hover:bg-warning/10">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={removing}
            disabled={removing || isReadOnly}
            aria-label={`إزالة ${request.fullName} من حجز`}
            onChange={(event) => {
              if (event.target.checked) onRemove();
            }}
          />
        </label>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{request.fullName || "—"}</p>
          <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs">
            <span className="text-muted-foreground">الخدمة</span>
            <span className="text-right text-foreground">{serviceText}</span>
            <span className="text-muted-foreground">التاريخ</span>
            <span className="text-right tabular-nums text-foreground" dir="ltr">{formatScheduleRequestDate(request.visitDate)}</span>
            <span className="text-muted-foreground">الهاتف</span>
            <span className="truncate text-right tabular-nums text-foreground" dir="ltr">{request.phone || "—"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({
  stage,
  patients,
  medicalStatuses,
  selectedDate,
  nowMs,
  isBottleneck,
  isLoading,
  hasDivider,
  onSelectPatient,
  onMarkVisitTreated,
  markVisitTreatedPendingVisitId,
  isReadOnly,
}: {
  stage: QueueStage;
  patients: TodayQueuePatient[];
  medicalStatuses?: Record<number, PatientMedicalStatus>;
  selectedDate: string;
  nowMs: number;
  isBottleneck: boolean;
  isLoading: boolean;
  hasDivider: boolean;
  onSelectPatient: (patient: TodayQueuePatient) => void;
  onMarkVisitTreated: (visitId: number, patient: TodayQueuePatient) => void;
  markVisitTreatedPendingVisitId: number | null;
  isReadOnly?: boolean;
}) {
  const meta = STAGE_META[stage];
  const Icon = meta.icon;
  const ordered = useMemo(
    () => sortByWaitDesc(patients, selectedDate, nowMs),
    [patients, selectedDate, nowMs],
  );
  const avg = useMemo(
    () => averageWaitLabel(ordered.map((p) => getWaitMinutes(p, selectedDate, nowMs))),
    [ordered, selectedDate, nowMs],
  );

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col",
        hasDivider && "border-s border-border/60",
      )}
    >
      {/* Column header */}
      <div
        className={cn(
          "shrink-0 border-b border-border/60 px-3 py-3",
          isBottleneck ? meta.accent : "",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                meta.softTone,
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </div>
            <span className="text-sm font-semibold text-foreground">{meta.label}</span>
          </div>
          <Badge className={cn("tabular-nums text-xs font-semibold", meta.softTone)}>
            {patients.length.toLocaleString("ar-EG")}
          </Badge>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock3 className="h-3 w-3 shrink-0" aria-hidden />
          <span>متوسط {avg}</span>
          {isBottleneck ? (
            <span className={cn("mr-auto font-medium", meta.tone)}>· الأولوية</span>
          ) : null}
        </div>
      </div>

      {/* Cards */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3 scrollbar-none">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))
        ) : ordered.length === 0 ? (
          <div className="flex min-h-[120px] items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/10 text-center text-xs text-muted-foreground">
            لا يوجد مرضى في هذه المرحلة
          </div>
        ) : (
          ordered.map((patient, idx) => (
            <CompactPatientCard
              key={`${patient.id}-${patient.queueStatus}-${idx}`}
              patient={patient}
              medicalStatus={medicalStatuses?.[patient.id]}
              onSelectPatient={() => onSelectPatient(patient)}
              onMarkVisitTreated={(visitId) => onMarkVisitTreated(visitId, patient)}
              markVisitTreatedPendingVisitId={markVisitTreatedPendingVisitId}
              isReadOnly={isReadOnly}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function TodayBottleneckBoard({
  onOpenAddPatient,
  onOpenMeasurementsMedicalFile,
  onOpenMeasurementsPicker,
  onOpenOperationsBooking,
  onOpenScheduleVisit,
  selectedDate: controlledSelectedDate,
  onSelectedDateChange,
}: {
  onOpenAddPatient?: () => void;
  onOpenMeasurementsMedicalFile?: (patientId: number) => void;
  onOpenMeasurementsPicker?: () => void;
  onOpenOperationsBooking?: () => void;
  onOpenScheduleVisit?: () => void;
  selectedDate?: string;
  onSelectedDateChange?: (date: string) => void;
} = {}) {
  const [shortcutPatient, setShortcutPatient] = useState<TodayQueuePatient | null>(null);
  const [internalSelectedDate, setInternalSelectedDate] = useState(getLocalDateIso);
  const selectedDate = controlledSelectedDate ?? internalSelectedDate;
  const liveDate = getLocalDateIso();
  const isHistoricalDate = selectedDate !== liveDate;
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [activeTab, setActiveTab] = useState<"queue" | "operations">("queue");
  const [quickActionsExpanded, setQuickActionsExpanded] = useState(false);
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("checkedIn");
  const [mobileStage, setMobileStage] = useState<QueueStage>("checkedIn");
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const setTodayPatientsDate = (ymd: string) => {
    if (!isYmd(ymd)) return;
    if (onSelectedDateChange) onSelectedDateChange(ymd);
    else setInternalSelectedDate(ymd);
  };

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

  const todayOperationListsQuery = trpc.medical.getTodayOperationLists.useQuery(
    { date: selectedDate },
    { staleTime: 60_000, refetchOnWindowFocus: false },
  );
  const visitScheduleRequestsQuery = trpc.patient.getVisitScheduleRequests.useQuery(
    { date: selectedDate },
    { staleTime: 60_000, refetchOnWindowFocus: false },
  );
  const removeScheduleRequest = trpc.patient.removeVisitScheduleRequest.useMutation({
    onSuccess: async () => {
      await utils.patient.getVisitScheduleRequests.invalidate();
      toast.success("تم إزالة الحجز");
    },
    onError: (error: unknown) => {
      toast.error(getTrpcErrorMessage(error, "تعذر إزالة الحجز"));
    },
  });
  const doctorsDirectoryQuery = trpc.medical.getDoctors.useQuery(undefined, {
    staleTime: 5 * 60_000,
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

  const todayPatientIds = useMemo(() => merged.map((p) => p.id).filter(Boolean), [merged]);
  const medicalStatusQuery = trpc.medical.getPatientMedicalStatusBatch.useQuery(
    { patientIds: todayPatientIds },
    { enabled: todayPatientIds.length > 0, staleTime: 120_000, refetchOnWindowFocus: false },
  );
  const medicalStatuses = medicalStatusQuery.data as Record<number, PatientMedicalStatus> | undefined;

  const counts = useMemo(
    () => ({
      bookings: visitScheduleRequestsQuery.data?.length ?? 0,
      checkedIn: byStatus.checkedIn.length,
      next: byStatus.next.length,
      clinic: byStatus.clinic.length,
      treated: byStatus.treated.length,
    }),
    [
      visitScheduleRequestsQuery.data?.length,
      byStatus.checkedIn.length,
      byStatus.next.length,
      byStatus.clinic.length,
      byStatus.treated.length,
    ],
  );

  const waitSnapshot = useMemo(() => {
    const out: Record<QueueStage, number | null> = {
      checkedIn: null,
      next: null,
      clinic: null,
      treated: null,
    };
    for (const stage of STAGES) {
      const ordered = sortByWaitDesc(byStatus[stage], selectedDate, nowMs);
      out[stage] = ordered.length > 0 ? getWaitMinutes(ordered[0], selectedDate, nowMs) : null;
    }
    return out;
  }, [byStatus, nowMs, selectedDate]);

  const bottleneckStage = useMemo(() => getBottleneckStage(counts, waitSnapshot), [counts, waitSnapshot]);

  const filteredPatients = useMemo(() => {
    const source = queueFilter === "bookings" ? [] : byStatus[queueFilter];
    return sortByWaitDesc(source, selectedDate, nowMs);
  }, [queueFilter, byStatus, selectedDate, nowMs]);

  const markVisitTreatedPendingVisitId = markVisitTreated.isPending
    ? markVisitTreated.variables?.visitId ?? null
    : null;

  const handleMarkVisitTreated = (visitId: number, patient: TodayQueuePatient) => {
    markVisitTreated.mutate({
      visitId,
      queueStatus: "treated",
      patientId: patient.id,
      date: selectedDate,
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col" dir="rtl">
      {/* Page header */}
      <div className="shrink-0 border-b border-border/70 bg-background px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold text-foreground">مرضى اليوم</h1>
            <Badge
              variant={isHistoricalDate ? "outline" : "secondary"}
              className={cn(
                "text-[10px] font-semibold tabular-nums",
                isHistoricalDate
                  ? "border-warning/30 bg-warning text-warning-foreground"
                  : "bg-muted/70 text-muted-foreground",
              )}
            >
              {isHistoricalDate ? "عرض تاريخي" : "مباشر"}
            </Badge>
          </div>

          {/* Date popover */}
          <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-sm"
                aria-label="تغيير تاريخ اليوم"
              >
                <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="hidden sm:inline">{formatDateLongAr(selectedDate)}</span>
                <span className="sm:hidden tabular-nums" dir="ltr">{selectedDate}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start" dir="rtl">
              <Calendar
                mode="single"
                selected={isoToDate(selectedDate)}
                onSelect={(date) => {
                  if (date) {
                    setTodayPatientsDate(dateToIso(date));
                    setDatePopoverOpen(false);
                  }
                }}
                defaultMonth={isoToDate(selectedDate)}
              />
            </PopoverContent>
          </Popover>

          {isHistoricalDate ? (
            <Badge variant="outline" className="border-border/70 bg-muted/30 text-xs text-muted-foreground">
              قراءة فقط
            </Badge>
          ) : null}

          <div className="flex-1" />

          {/* Tab toggle */}
          <div className="inline-flex items-center rounded-lg border border-border/70 bg-muted/20 p-0.5">
            <button
              type="button"
              onClick={() => setActiveTab("queue")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                activeTab === "queue"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              الطابور
              {merged.length > 0 ? (
                <Badge className="bg-muted/80 text-[10px] tabular-nums text-muted-foreground">
                  {merged.length.toLocaleString("ar-EG")}
                </Badge>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("operations")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                activeTab === "operations"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              العمليات
              {todayOperationsFlat.length > 0 ? (
                <Badge variant="outline" className="text-[10px] tabular-nums">
                  {todayOperationsFlat.length.toLocaleString("ar-EG")}
                </Badge>
              ) : null}
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => {
                if (isHistoricalDate) return;
                onOpenAddPatient?.();
              }}
              className="gap-2"
              size="sm"
              disabled={isHistoricalDate || !onOpenAddPatient}
              title={isHistoricalDate ? "متاح فقط للتاريخ المباشر" : undefined}
            >
              <UserPlus className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">تسجيل مريض</span>
              <span className="sm:hidden">تسجيل</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                if (isHistoricalDate) return;
                onOpenScheduleVisit?.();
              }}
              disabled={isHistoricalDate || !onOpenScheduleVisit}
              title={isHistoricalDate ? "متاح فقط للتاريخ المباشر" : undefined}
            >
              <CalendarPlus className="h-4 w-4 shrink-0" aria-hidden />
              <span className="hidden sm:inline">حجز موعد</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                if (isHistoricalDate) return;
                onOpenOperationsBooking?.();
              }}
              disabled={isHistoricalDate || !onOpenOperationsBooking}
              title={isHistoricalDate ? "متاح فقط للتاريخ المباشر" : undefined}
            >
              <Syringe className="h-4 w-4 shrink-0" aria-hidden />
              <span className="hidden sm:inline">حجز عملية</span>
            </Button>
          </div>
        </div>

        {isHistoricalDate ? (
          <div className="mt-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
            هذا التاريخ للقراءة فقط. يمكنك مراجعة الطابور والعمليات، لكن إجراءات التسجيل والحجز متوقفة.
          </div>
        ) : null}
      </div>

      {/* Quick Actions collapsible */}
      <div className="shrink-0 border-b border-border/70 bg-card/50">
        <button
          type="button"
          onClick={() => setQuickActionsExpanded((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          aria-expanded={quickActionsExpanded}
        >
          <span className="flex items-center gap-2 font-medium">
            <Zap className="h-3.5 w-3.5" aria-hidden />
            إجراءات سريعة
          </span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200",
              quickActionsExpanded && "rotate-180",
            )}
            aria-hidden
          />
        </button>
        {quickActionsExpanded ? (
          <div className="space-y-2 px-4 pb-3">
            {isHistoricalDate ? (
              <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border/70 bg-muted/10 p-3 text-sm text-muted-foreground">
                <p>إجراءات اليوم المباشرة متوقفة في العرض التاريخي.</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setTodayPatientsDate(liveDate)}>
                    العودة إلى اليوم
                  </Button>
                </div>
              </div>
            ) : (
              <QuickActions
                onOpenMeasurementsMedicalFile={onOpenMeasurementsPicker}
                onOpenOperationsBooking={onOpenOperationsBooking}
              />
            )}
          </div>
        ) : null}
      </div>

      {/* Queue tab — grid mode */}
      {activeTab === "queue" ? (
        <>
          {/* Filter chips */}
          <div className="shrink-0 border-b border-border/70 bg-background px-4 py-2.5">
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
                        : "border-border bg-card text-foreground",
                    )}
                  >
                    {label}{" "}
                    <span className="tabular-nums opacity-90">({n.toLocaleString("ar-EG")})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid */}
          <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
            {isLoading ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 xl:grid-cols-5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 rounded-xl" />
                ))}
              </div>
            ) : queueFilter === "bookings" ? (
              visitScheduleRequestsQuery.isLoading ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 xl:grid-cols-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 rounded-xl" />
                  ))}
                </div>
              ) : (visitScheduleRequestsQuery.data ?? []).length === 0 ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/10 px-4 py-12 text-center text-sm text-muted-foreground">
                  لا توجد حجوزات لهذا التاريخ
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 xl:grid-cols-5">
                  {((visitScheduleRequestsQuery.data ?? []) as VisitScheduleRequestRow[]).map((request) => (
                    <BookingRequestCard
                      key={request.id}
                      request={request}
                      removing={removeScheduleRequest.isPending && removeScheduleRequest.variables?.requestId === request.id}
                      isReadOnly={isHistoricalDate}
                      onRemove={() => removeScheduleRequest.mutate({ requestId: request.id })}
                    />
                  ))}
                </div>
              )
            ) : filteredPatients.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/10 px-4 py-12 text-center text-sm text-muted-foreground">
                لا يوجد مرضى في هذه الفئة
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 xl:grid-cols-5">
                {filteredPatients.map((patient, idx) => (
                  <GridPatientCard
                    key={`${patient.id}-${patient.queueStatus}-${idx}`}
                    patient={patient}
                    medicalStatus={medicalStatuses?.[patient.id]}
                    onSelectPatient={() => setShortcutPatient(patient)}
                    onMarkVisitTreated={(visitId) => {
                      if (!isHistoricalDate) handleMarkVisitTreated(visitId, patient);
                    }}
                    markVisitTreatedPendingVisitId={markVisitTreatedPendingVisitId}
                    isReadOnly={isHistoricalDate}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}

      {/* Operations tab */}
      {activeTab === "operations" ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {todayOperationListsQuery.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-xl" />
              ))}
            </div>
          ) : todayOperationListsQuery.isError ? (
            <div
              className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-destructive/25 bg-destructive text-destructive-foreground"
              role="alert"
            >
              {getTrpcErrorMessage(todayOperationListsQuery.error, "تعذر تحميل قائمة العمليات")}
            </div>
          ) : todayOperationsFlat.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/10 px-4 py-12 text-center text-sm text-muted-foreground">
              لا توجد عمليات مسجّلة لهذا اليوم
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {todayOperationsFlat.map((row) => (
                <TodayOperationListItemCard key={row.key} row={row} doctorNameByCode={doctorNameByCode} />
              ))}
            </div>
          )}
        </div>
      ) : null}

      <TodayPatientShortcutsDialog
        open={shortcutPatient != null}
        onOpenChange={(next) => {
          if (!next) setShortcutPatient(null);
        }}
        patientId={shortcutPatient?.id ?? 0}
        patientName={shortcutPatient?.fullName}
        onOpenMeasurementsMedicalFile={onOpenMeasurementsMedicalFile}
        readOnly={isHistoricalDate}
      />
    </div>
  );
}
