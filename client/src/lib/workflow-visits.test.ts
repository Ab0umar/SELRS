import { describe, expect, it } from "vitest";
import { workflowVisits } from "./workflow-visits";
import type { TodayQueuePatient } from "@/hooks/useTodayQueuePatientsMerged";

const completed: TodayQueuePatient = {
  id: 1,
  visitId: 10,
  queueStatus: "treated",
  locationType: "center",
  serviceType: "consultant",
};

describe("workflow historical visit selection", () => {
  it("retains completed visits when reviewing a previous day", () => {
    expect(workflowVisits([completed], "2026-10-28", "2026-10-29")).toEqual([completed]);
  });
  it("keeps treated visits in the current day list", () => {
    expect(workflowVisits([completed], "2026-10-29", "2026-10-29")).toEqual([completed]);
    const active = { ...completed, queueStatus: "clinic1" as const };
    expect(workflowVisits([active], "2026-10-29", "2026-10-29")).toEqual([active]);
  });
  it("keeps external services outside the medical workflow", () => {
    expect(workflowVisits([{ ...completed, serviceType: "external" }], "2026-10-28", "2026-10-29")).toEqual([]);
  });
});
