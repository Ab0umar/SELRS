import { describe, expect, it } from "vitest";
import { mapDoctorDirectoryRows, mapServiceDirectoryRows } from "../server/scripts/sync-doctors-services-location";

describe("registration lookup sync", () => {
  it("keeps doctor names when mapping MDTEAM rows", () => {
    const rows = mapDoctorDirectoryRows([
      { code: "D001", name: "Dr. A" },
      { code: "D002", name: " ب .د " },
    ]);

    expect(rows).toEqual([
      expect.objectContaining({ code: "D001", name: "Dr. A" }),
      expect.objectContaining({ code: "D002", name: "ب .د" }),
    ]);
  });

  it("keeps service names and prices while filtering to section 15 data", () => {
    const rows = mapServiceDirectoryRows([
      { code: "S001", name: "Service A", price: 120 },
      { code: "S002", name: "Service B", price: 250 },
    ]);

    expect(rows).toEqual([
      expect.objectContaining({ code: "S001", name: "Service A", price: 120 }),
      expect.objectContaining({ code: "S002", name: "Service B", price: 250 }),
    ]);
  });
});
