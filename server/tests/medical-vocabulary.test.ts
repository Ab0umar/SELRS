import { describe, expect, it, vi } from "vitest";
vi.mock("../db", () => ({
  getAllMedications: vi.fn().mockResolvedValue([{ name: "TOBRIN" }]),
  getAllDiseases: vi
    .fn()
    .mockResolvedValue([{ name: "Keratoconus", abbrev: "KC" }]),
  getAllTests: vi.fn().mockResolvedValue([
    { name: "OCT Macula", type: "imaging", isActive: true },
    { name: "CBC", type: "lab", isActive: true },
    { name: "Hidden", type: "lab", isActive: false },
  ]),
}));
import { readMedicalVocabulary } from "../services/medical-vocabulary";
describe("medical catalog vocabulary", () => {
  it("includes names and disease abbreviations but excludes inactive tests", async () => {
    const result = await readMedicalVocabulary();
    expect(result.phrases).toEqual([
      "TOBRIN",
      "Keratoconus",
      "KC",
      "OCT Macula",
      "CBC",
    ]);
    expect(result.entries.map((entry) => entry.kind)).toEqual([
      "medication",
      "disease",
      "imaging",
      "lab",
    ]);
  });
});
