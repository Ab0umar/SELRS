import type { TodayQueuePatient } from "@/hooks/useTodayQueuePatientsMerged";

export function workflowVisits(
  patients: TodayQueuePatient[],
  selectedDate: string,
  today: string,
) {
  const historical = selectedDate < today;
  return patients.filter((patient) => {
    const serviceType = String(patient.serviceType ?? "").trim().toLowerCase();
    const locationType = String(patient.locationType ?? "").trim().toLowerCase();
    return (
      (historical || patient.queueStatus !== "treated") &&
      locationType === "center" &&
      ["specialist", "consultant", "lasik"].includes(serviceType)
    );
  });
}
