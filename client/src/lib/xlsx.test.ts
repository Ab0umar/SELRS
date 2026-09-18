import { describe, expect, it } from "vitest";
import { loadXlsx } from "./xlsx";

describe("spreadsheet import/export compatibility", () => {
  it.each(["xlsx", "biff8"] as const)(
    "preserves Arabic text, codes, numeric values, and sheets in %s files",
    async (bookType) => {
      const XLSX = await loadXlsx();
      const medications = [
        { Name: "قطرة العين", Code: "00123", Strength: "0.5%", Quantity: 12 },
        { Name: "دواء آخر", Code: "00456", Strength: "10 mg", Quantity: 0 },
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(medications),
        "الأدوية",
      );
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet([
          ["Name", "Dose"],
          ["قطرة العين", "مرتين يومياً"],
        ]),
        "Doses",
      );

      const bytes = XLSX.write(workbook, { bookType, type: "array" });
      const imported = XLSX.read(bytes, { type: "array" });
      expect(imported.SheetNames).toEqual(["الأدوية", "Doses"]);
      expect(XLSX.utils.sheet_to_json(imported.Sheets["الأدوية"])).toEqual(
        medications,
      );
      expect(XLSX.utils.sheet_to_json(imported.Sheets.Doses)).toEqual([
        { Name: "قطرة العين", Dose: "مرتين يومياً" },
      ]);
    },
  );
});
