import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { localISODate } from "@/lib/utils";

/** One row per patient for today across all queue stages (matches `getTodayPatientsByQueueStatus` output shape). */
export type TodayQueuePatient = {
  id: number;
  /** زيارة اليوم المرتبطة بالطابور (مطلوب لتحديث الحالة إلى معالج). */
  visitId?: number;
  patientCode?: string | null;
  fullName?: string | null;
  phone?: string | null;
  serviceType?: string;
  serviceCode?: string | null;
  serviceCodes?: string[];
  locationType?: string | null;
  doctorName?: string | null;
  visitType?: string | null;
  queueStatus:
    "checkedIn" | "next" | "clinic1" | "clinic2" | "pentacam" | "treated";
  checkedInTime?: string | null;
  treatedByUserId?: number | null;
  treatedByName?: string | null;
  hasQueueCompletionData?: boolean;
};

function sortTodayQueuePatients(list: TodayQueuePatient[]) {
  return [...list].sort((a, b) => {
    const aTime =
      typeof (a as { checkedInAt?: string }).checkedInAt === "string"
        ? new Date((a as { checkedInAt?: string }).checkedInAt!).getTime()
        : typeof (a as { visitDate?: string }).visitDate === "string"
          ? new Date((a as { visitDate?: string }).visitDate!).getTime()
          : 0;
    const bTime =
      typeof (b as { checkedInAt?: string }).checkedInAt === "string"
        ? new Date((b as { checkedInAt?: string }).checkedInAt!).getTime()
        : typeof (b as { visitDate?: string }).visitDate === "string"
          ? new Date((b as { visitDate?: string }).visitDate!).getTime()
          : 0;
    return aTime - bTime;
  });
}

const EXTERNAL_SERVICE_TYPES = new Set([
  "external",
  "pentacam_ex",
  "pentacam_external",
  "surgery_external",
]);

function isCenterQueuePatient(patient: TodayQueuePatient) {
  const locationType = String(patient.locationType ?? "")
    .trim()
    .toLowerCase();
  const serviceType = String(patient.serviceType ?? "")
    .trim()
    .toLowerCase();
  return (
    !["external", "خارجي", "outside", "out"].includes(locationType) &&
    !EXTERNAL_SERVICE_TYPES.has(serviceType)
  );
}

/** Derive stage lists and the existing one-row-per-patient priority from one response. */
export function buildTodayQueueSnapshot(
  rows: TodayQueuePatient[],
  includeExternal = false,
) {
  const visible = rows.filter(
    (row) => includeExternal || isCenterQueuePatient(row),
  );
  const byStatus = {
    checkedIn: visible.filter((row) => row.queueStatus === "checkedIn"),
    next: visible.filter((row) => row.queueStatus === "next"),
    clinic1: visible.filter((row) => row.queueStatus === "clinic1"),
    clinic2: visible.filter((row) => row.queueStatus === "clinic2"),
    pentacam: visible.filter((row) => row.queueStatus === "pentacam"),
    treated: visible.filter((row) => row.queueStatus === "treated"),
    clinic: [] as TodayQueuePatient[],
  };
  byStatus.clinic = [
    ...byStatus.clinic1,
    ...byStatus.clinic2,
    ...byStatus.pentacam,
  ];
  const unique = new Map<number, TodayQueuePatient>();
  for (const row of [
    ...byStatus.treated,
    ...byStatus.clinic,
    ...byStatus.next,
    ...byStatus.checkedIn,
  ]) {
    if (typeof row.id === "number" && !unique.has(row.id))
      unique.set(row.id, row);
  }
  return { merged: sortTodayQueuePatients([...unique.values()]), byStatus };
}

const EMPTY_QUEUE: TodayQueuePatient[] = [];

/** Today's queue across reception, examination clinics, Pentacam, and completion. */
export function useTodayQueuePatientsMerged(
  dateIso?: string,
  options: { includeExternal?: boolean } = {},
) {
  const includeExternal = options.includeExternal ?? false;
  const todayIso = dateIso ?? localISODate();
  const query = trpc.medical.getTodayPatientsByQueueStatus.useQuery(
    { date: todayIso },
    {
      staleTime: 10000,
      refetchInterval: 10000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
    },
  );
  const snapshot = useMemo(
    () => buildTodayQueueSnapshot(query.data ?? EMPTY_QUEUE, includeExternal),
    [query.data, includeExternal],
  );
  return {
    todayIso,
    ...snapshot,
    isLoading: query.isLoading,
    isError: query.isError,
    hasData: query.data !== undefined,
    isFetching: query.isFetching,
    dataUpdatedAt: query.dataUpdatedAt,
    refetch: query.refetch,
  };
}
