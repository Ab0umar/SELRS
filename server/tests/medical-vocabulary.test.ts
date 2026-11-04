import { describe, expect, it, vi } from "vitest";
vi.mock("../db", () => ({
  getAllMedications: vi.fn().mockResolvedValue([
    { name: "TOBRIN", description: "توبرين 0.3% إيي | Route: EYE | Source: Egyptian Drug Database (CC0)" },
  ]),
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
import { promptFor } from "../services/ai/medical";
describe("medical catalog vocabulary", () => {
  it("keeps diseases and tests in the prompt when medications exceed the cap", () => {
    const entries = [
      ...Array.from({ length: 3000 }, (_, i) => ({
        kind: "medication",
        name: `Drug ${i}`,
        abbreviation: "",
      })),
      { kind: "disease", name: "Keratoconus", abbreviation: "KC" },
      { kind: "lab", name: "CBC", abbreviation: "" },
    ];
    const prompt = promptFor(
      { kind: "field", label: "Complaints", transcript: "مثال" },
      entries,
    );
    const catalog = JSON.parse(
      prompt.match(/CATALOG_VOCABULARY_JSON: (.*)/)![1],
    ) as Record<string, unknown[]>;
    expect(catalog.disease).toEqual([["Keratoconus", "KC"]]);
    expect(catalog.lab).toEqual(["CBC"]);
    expect(catalog.medication).toHaveLength(1498);
  });
  it("includes names and disease abbreviations but excludes inactive tests", async () => {
    const result = await readMedicalVocabulary();
    // Arabic trade name travels with the English catalog name.
    expect(result.entries[0]).toEqual({ kind: "medication", name: "TOBRIN", abbreviation: "توبرين" });
    expect(result.phrases).toEqual([
      "TOBRIN",
      "توبرين",
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
