import { getAllMedications, getAllDiseases, getAllTests } from "../db";
import type { Medication, Disease, Test } from "../../drizzle/schema";

export async function readMedicalVocabulary() {
  const [medications, diseases, tests] = await Promise.all([
    getAllMedications(),
    getAllDiseases(),
    getAllTests(),
  ]);
  const entries = [
    ...medications.map((row: Medication) => ({
      kind: "medication",
      name: row.name,
      abbreviation: "",
    })),
    ...diseases.map((row: Disease) => ({
      kind: "disease",
      name: row.name,
      abbreviation: row.abbrev ?? "",
    })),
    ...tests
      .filter((row: Test) => row.isActive)
      .map((row: Test) => ({ kind: row.type, name: row.name, abbreviation: "" })),
  ];
  const phrases = [
    ...new Set(
      entries
        .flatMap((row) => [row.name.trim(), row.abbreviation.trim()])
        .filter(Boolean),
    ),
  ].slice(0, 500);
  return { entries, phrases };
}
