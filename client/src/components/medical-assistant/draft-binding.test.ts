import { describe, expect, it } from "vitest";
import {
  prepareDraftAdditions,
  assertDraftUndo,
  type DraftBinding,
} from "./draft-binding";
import { resolveTestNames, testNameCandidates } from "./catalog-tests";
describe("state-bound medical draft filling", () => {
  const binding: DraftBinding = {
    values: { complaint: "موجود", diagnosis: "" },
    destinations: {
      complaints: "complaint",
      symptoms: "complaint",
      diagnosis: "diagnosis",
    },
    change: () => {},
  };
  it("fills closed fields without DOM access and combines shared destinations", () => {
    const receipt = prepareDraftAdditions(binding, [
      { field: "complaints", text: "صداع" },
      { field: "symptoms", text: "زغللة" },
      { field: "diagnosis", text: "Cataract" },
      { field: "history", text: "سكر" },
    ]);
    expect(receipt.after).toEqual({
      complaint: "موجود\nصداع\nزغللة",
      diagnosis: "Cataract",
    });
    expect(receipt.skipped).toEqual(["history"]);
    expect(binding.values.complaint).toBe("موجود");
  });
  it("does not overwrite doctor edits during undo", () => {
    expect(() =>
      assertDraftUndo(binding, { complaint: "موجود\nصداع" }),
    ).toThrow();
  });
  it("uses unique exact test names only", () => {
    const tests = [
      { id: 1, name: "OCT Macula", type: "imaging" },
      { id: 2, name: "CBC", type: "lab" },
    ];
    expect(resolveTestNames("CBC", tests, "labs")).toEqual([2]);
    expect(() => resolveTestNames("اطلب CBC", tests, "labs")).toThrow();
    expect(resolveTestNames("OCT Macula", tests, "labs")).toEqual([1]);
    expect(resolveTestNames("", tests)).toEqual([]);
  });
  it("offers OCT variants across categories without automatically selecting one", () => {
    const tests = [
      { id: 1, name: "OCT Macula", type: "examination" },
      { id: 2, name: "OCT Nerve", type: "imaging" },
      { id: 3, name: "OCT inactive", type: "imaging", isActive: false },
      { id: 4, name: "CBC", type: "lab" },
    ];
    expect(testNameCandidates("OCT", tests).map((item) => item.id)).toEqual([
      1, 2,
    ]);
    expect(() => resolveTestNames("OCT", tests, "imaging")).toThrow();
    expect(resolveTestNames("OCT Macula", tests, "imaging")).toEqual([1]);
  });
});
