import { describe, expect, it } from "vitest";
import { deduplicateOperationHistory } from "../lib/operationHistory";

describe("operation history source precedence", () => {
  const row = (
    source: string,
    operationDate: string,
    operationType = "Lasik",
  ) => ({ patientId: 1, source, operationDate, operationType });

  it("prefers service codes over lists with a different date while preserving repeat service dates", () => {
    const first = row("service_code", "2026-01-01");
    const second = row("service_code", "2026-02-01");
    expect(
      deduplicateOperationHistory([
        row("operation_list", "2026-01-03", "ليزك"),
        first,
        second,
      ]),
    ).toEqual([first, second]);
  });

  it("retains lists without matching services and does not conflate unknown operation types", () => {
    const rows = [
      row("operation_list", "2026-01-01", "YAG"),
      row("service_code", "2026-01-01", "Fundus"),
      row("operation_list", "2026-02-01", "PRK"),
    ];
    expect(deduplicateOperationHistory(rows)).toEqual(rows);
  });

  it("deduplicates canonical aliases on the same day with service priority", () => {
    const service = row("service_code", "2026-01-01");
    expect(
      deduplicateOperationHistory([
        row("sheet", "2026-01-01", "ليزك"),
        service,
      ]),
    ).toEqual([service]);
  });

  it("suppresses sheets, surgeries and followups even when their dates differ", () => {
    const service = row("service_code", "2026-01-01");
    expect(
      deduplicateOperationHistory([
        service,
        row("sheet", "2026-01-03", "ليزك"),
        row("surgery", "2026-01-04"),
        row("followup", "2026-01-05"),
      ]),
    ).toEqual([service]);
  });

  it("prefers a saved list to sheets when no service code exists", () => {
    const list = row("operation_list", "2026-01-02");
    expect(
      deduplicateOperationHistory([
        row("sheet", "2026-01-01"),
        list,
        row("followup", "2026-01-03"),
      ]),
    ).toEqual([list]);
  });
});
