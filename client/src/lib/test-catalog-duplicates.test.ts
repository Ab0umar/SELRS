import { describe, expect, it } from "vitest";
import {
  planTestCatalogMerges,
  remapTemplateTestIds,
  type MergeableTest,
} from "../../../shared/test-catalog-duplicates";

const original: MergeableTest = {
  id: 198,
  name: "HbA1c",
  type: "lab",
  category: "lab",
  normalRange: "4.0 - 5.6",
  unit: "%",
  description: "المصدر الأصلي",
  priceEgp: null,
  durationMinutes: null,
  isActive: 1,
};

describe("catalog duplicate merging", () => {
  it("keeps existing references and combines notes while removing only exact-name copies", () => {
    const copy = {
      ...original,
      id: 314,
      category: "",
      description: "ملاحظة إضافية",
    };
    const { merges, conflicts } = planTestCatalogMerges([
      original,
      copy,
      { ...copy, id: 400, name: "HbA1c variant" },
    ]);
    expect(conflicts).toEqual([]);
    expect(merges).toMatchObject([
      {
        keepId: 198,
        removeIds: [314],
        updates: {
          normalRange: "4.0 - 5.6",
          unit: "%",
          description: "المصدر الأصلي\n\nملاحظة إضافية",
        },
      },
    ]);
  });
  it.each([
    { unit: "mmol/mol" },
    { normalRange: "4 - 6" },
    { priceEgp: "100" },
    { type: "other" },
    { isActive: 0 },
  ])(
    "does not delete clinically or operationally conflicting copies: %j",
    (conflict) => {
      const { merges, conflicts } = planTestCatalogMerges([
        original,
        { ...original, id: 314, ...conflict },
      ]);
      expect(merges).toEqual([]);
      expect(conflicts).toMatchObject([{ ids: [198, 314] }]);
    },
  );
  it("keeps the imaging entry when the same scan was also imported under examinations", () => {
    const scan = {
      ...original,
      name: "OCT Macula",
      type: "imaging",
      normalRange: "",
      unit: "",
      category: "imaging",
    };
    const { merges } = planTestCatalogMerges([
      scan,
      { ...scan, id: 303, type: "examination", category: "" },
    ]);
    expect(merges).toMatchObject([
      { keepId: 198, removeIds: [303], updates: { type: "imaging" } },
    ]);
  });
  it("corrects the known ultrasound import misclassification while merging its copies", () => {
    const scan = {
      ...original,
      name: "Occular Sonar",
      normalRange: "",
      unit: "",
      category: "",
    };
    expect(
      planTestCatalogMerges([scan, { ...scan, id: 301, type: "examination" }])
        .merges,
    ).toMatchObject([{ updates: { type: "imaging" } }]);
  });
  it("remaps template test IDs without altering notes, names or unrelated IDs", () => {
    const templates = {
      tests: {
        example: {
          testItems: [{ testId: 314, testName: "HbA1c", notes: "314" }],
          id: 314,
        },
      },
      prescription: {},
    };
    expect(remapTemplateTestIds(templates, new Map([[314, 198]]))).toEqual({
      tests: {
        example: {
          testItems: [{ testId: 198, testName: "HbA1c", notes: "314" }],
          id: 314,
        },
      },
      prescription: {},
    });
    expect(templates.tests.example.testItems[0]?.testId).toBe(314);
  });
});
