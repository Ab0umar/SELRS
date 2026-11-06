import { getAllMedications, getAllDiseases, getAllTests } from "../db";
import type { Medication, Disease, Test } from "../../drizzle/schema";
import { medicationArabicName } from "../../shared/clinical-catalog-items";

export async function readMedicalVocabulary() {
  const [medications, diseases, tests] = await Promise.all([
    getAllMedications(),
    getAllDiseases(),
    getAllTests(),
  ]);
  const entries = [
    // The Arabic trade name lets a medicine said in Arabic resolve to its English catalog name.
    ...medications.map((row: Medication) => ({
      kind: "medication",
      name: row.name,
      abbreviation: medicationArabicName(row.description),
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
  return { entries };
}
