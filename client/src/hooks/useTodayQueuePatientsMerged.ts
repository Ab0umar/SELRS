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
  locationType?: string | null;
  doctorName?: string | null;
  visitType?: string | null;
  queueStatus:
    "checkedIn" | "next" | "clinic1" | "clinic2" | "pentacam" | "treated";
  checkedInTime?: string | null;
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

/** Today's clinic queue: 3 columns — عيادة 1, عيادة 2, معالج */
export function useTodayQueuePatientsMerged(
  dateIso?: string,
  options: { includeExternal?: boolean } = {},
) {
  const includeExternal = options.includeExternal ?? false;
  const todayIso = useMemo(() => dateIso ?? localISODate(), [dateIso]);

  const checkedIn = trpc.medical.getTodayPatientsByQueueStatus.useQuery(
    { date: todayIso, queueStatus: "checkedIn" },
    { refetchInterval: 10000, refetchOnWindowFocus: true },
  );
  const next = trpc.medical.getTodayPatientsByQueueStatus.useQuery(
    { date: todayIso, queueStatus: "next" },
    { refetchInterval: 10000, refetchOnWindowFocus: true },
  );
  const clinic1 = trpc.medical.getTodayPatientsByQueueStatus.useQuery(
    { date: todayIso, queueStatus: "clinic1" },
    { refetchInterval: 10000, refetchOnWindowFocus: true },
  );
  const clinic2 = trpc.medical.getTodayPatientsByQueueStatus.useQuery(
    { date: todayIso, queueStatus: "clinic2" },
    { refetchInterval: 10000, refetchOnWindowFocus: true },
  );
  const pentacam = trpc.medical.getTodayPatientsByQueueStatus.useQuery(
    { date: todayIso, queueStatus: "pentacam" },
    { refetchInterval: 10000, refetchOnWindowFocus: true },
  );
  const treated = trpc.medical.getTodayPatientsByQueueStatus.useQuery(
    { date: todayIso, queueStatus: "treated" },
    { refetchInterval: 10000, refetchOnWindowFocus: true },
  );

  const merged = useMemo(() => {
    const map = new Map<number, TodayQueuePatient>();
    const ordered = [
      ...(treated.data ?? []),
      ...(clinic1.data ?? []),
      ...(clinic2.data ?? []),
      ...(pentacam.data ?? []),
      ...(next.data ?? []),
      ...(checkedIn.data ?? []),
    ];
    for (const p of ordered) {
      const row = p as TodayQueuePatient;
      if (
        typeof row?.id === "number" &&
        (includeExternal || isCenterQueuePatient(row)) &&
        !map.has(row.id)
      ) {
        map.set(row.id, row);
      }
    }
    return sortTodayQueuePatients([...map.values()]);
  }, [
    checkedIn.data,
    next.data,
    clinic1.data,
    clinic2.data,
    pentacam.data,
    treated.data,
    includeExternal,
  ]);

  const visiblePatients = (rows: TodayQueuePatient[] | undefined) =>
    (rows ?? []).filter(
      (patient) => includeExternal || isCenterQueuePatient(patient),
    );

  const isLoading =
    checkedIn.isLoading ||
    next.isLoading ||
    clinic1.isLoading ||
    clinic2.isLoading ||
    pentacam.isLoading ||
    treated.isLoading;

  return {
    todayIso,
    merged,
    isLoading,
    byStatus: {
      checkedIn: visiblePatients(checkedIn.data as TodayQueuePatient[]),
      next: visiblePatients(next.data as TodayQueuePatient[]),
      clinic: visiblePatients([
        ...(clinic1.data ?? []),
        ...(clinic2.data ?? []),
        ...(pentacam.data ?? []),
      ] as TodayQueuePatient[]),
      clinic1: visiblePatients(clinic1.data as TodayQueuePatient[]),
      clinic2: visiblePatients(clinic2.data as TodayQueuePatient[]),
      pentacam: visiblePatients(pentacam.data as TodayQueuePatient[]),
      treated: visiblePatients(treated.data as TodayQueuePatient[]),
    },
  };
}
