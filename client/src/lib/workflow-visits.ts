import type { TodayQueuePatient } from "@/hooks/useTodayQueuePatientsMerged";

export function workflowVisits(
  patients: TodayQueuePatient[],
  _selectedDate?: string,
  _today?: string,
) {
  return patients.filter((patient) => {
    const serviceType = String(patient.serviceType ?? "").trim().toLowerCase();
    const locationType = String(patient.locationType ?? "").trim().toLowerCase();
    return (
      locationType === "center" &&
      ["specialist", "consultant", "lasik"].includes(serviceType)
    );
  });
}
