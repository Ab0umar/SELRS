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
  doctorName?: string | null;
  visitType?: string | null;
  queueStatus: "checkedIn" | "next" | "clinic" | "treated";
  clinicNo?: number | null;
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

/** Today's clinic queue: 3 columns — عيادة 1, عيادة 2, معالج */
export function useTodayQueuePatientsMerged(dateIso?: string) {
  const todayIso = useMemo(
    () => dateIso ?? localISODate(),
    [dateIso],
  );

  const clinic1 = trpc.medical.getTodayPatientsByQueueStatus.useQuery(
    { date: todayIso, queueStatus: "clinic", clinicNo: 1 },
    { refetchInterval: 10000, refetchOnWindowFocus: true },
  );
  const clinic2 = trpc.medical.getTodayPatientsByQueueStatus.useQuery(
    { date: todayIso, queueStatus: "clinic", clinicNo: 2 },
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
    ];
    for (const p of ordered) {
      const row = p as TodayQueuePatient;
      if (typeof row?.id === "number" && !map.has(row.id)) map.set(row.id, row);
    }
    return sortTodayQueuePatients([...map.values()]);
  }, [clinic1.data, clinic2.data, treated.data]);

  const isLoading = clinic1.isLoading || clinic2.isLoading || treated.isLoading;

  return {
    todayIso,
    merged,
    isLoading,
    byStatus: {
      checkedIn: [] as TodayQueuePatient[],
      next: [] as TodayQueuePatient[],
      clinic: [...(clinic1.data ?? []), ...(clinic2.data ?? [])] as TodayQueuePatient[],
      clinic1: clinic1.data as TodayQueuePatient[] ?? [],
      clinic2: clinic2.data as TodayQueuePatient[] ?? [],
      treated: treated.data as TodayQueuePatient[] ?? [],
    },
  };
}
