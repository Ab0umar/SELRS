import { useMemo } from "react";
import { trpc } from "@/lib/trpc";

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
  queueStatus: "checkedIn" | "next" | "clinic" | "treated";
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

/** Today’s clinic queue: merges all stages so tabs / KPIs reflect live DB state (not checked-in-only). */
export function useTodayQueuePatientsMerged(dateIso?: string) {
  const todayIso = useMemo(() => dateIso ?? new Date().toISOString().split("T")[0], [dateIso]);

  const checkedIn = trpc.medical.getTodayPatientsByQueueStatus.useQuery({
    date: todayIso,
    queueStatus: "checkedIn",
  });
  const next = trpc.medical.getTodayPatientsByQueueStatus.useQuery({
    date: todayIso,
    queueStatus: "next",
  });
  const clinic = trpc.medical.getTodayPatientsByQueueStatus.useQuery({
    date: todayIso,
    queueStatus: "clinic",
  });
  const treated = trpc.medical.getTodayPatientsByQueueStatus.useQuery({
    date: todayIso,
    queueStatus: "treated",
  });

  const merged = useMemo(() => {
    const map = new Map<number, TodayQueuePatient>();
    // Prefer the most advanced queue stage if the same patient id appears in multiple lists.
    const ordered = [
      ...(treated.data ?? []),
      ...(clinic.data ?? []),
      ...(next.data ?? []),
      ...(checkedIn.data ?? []),
    ];
    for (const p of ordered) {
      const row = p as TodayQueuePatient;
      if (typeof row?.id === "number" && !map.has(row.id)) map.set(row.id, row);
    }
    return sortTodayQueuePatients([...map.values()]);
  }, [checkedIn.data, next.data, clinic.data, treated.data]);

  const isLoading =
    checkedIn.isLoading || next.isLoading || clinic.isLoading || treated.isLoading;

  return {
    todayIso,
    merged,
    isLoading,
    byStatus: {
      checkedIn: checkedIn.data ?? [],
      next: next.data ?? [],
      clinic: clinic.data ?? [],
      treated: treated.data ?? [],
    },
  };
}
