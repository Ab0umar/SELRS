import { describe, expect, it } from "vitest";
import {
  autoReplySettingsSchema,
  handoffReopenPresets,
  presetChoices,
  presetCustomLabels,
  presetLabel,
  replyLengthPresets,
  staffReplyPausePresets,
} from "../../shared/auto-reply";
import { describeReplySources } from "../services/auto-reply/policy";
import {
  importTarget,
  planKnowledgeImport,
  readKnowledgeFile,
} from "../services/auto-reply/knowledgeImport";
import { knowledgeImportHeaders } from "../../shared/auto-reply";


describe("auto-reply setting presets", () => {
  const shape = autoReplySettingsSchema.shape;
  it.each([
    ["maxReplyChars", replyLengthPresets],
    ["handoffReopenHours", handoffReopenPresets],
    ["staffReplyPauseMinutes", staffReplyPausePresets],
  ] as const)("keeps every %s preset inside the schema range", (key, presets) => {
    for (const [value] of presets)
      expect(shape[key].safeParse(value).success).toBe(true);
  });

  it("maps the reply lengths to fixed character limits", () => {
    expect(replyLengthPresets.map(([value]) => value)).toEqual([300, 600, 1200]);
  });

  it("offers the schema defaults as presets", () => {
    const defaults = autoReplySettingsSchema.parse({});
    const values = (presets: typeof replyLengthPresets) =>
      presets.map(([value]) => value);
    expect(values(replyLengthPresets)).toContain(defaults.maxReplyChars);
    expect(values(handoffReopenPresets)).toContain(defaults.handoffReopenHours);
    expect(values(staffReplyPausePresets)).toContain(
      defaults.staffReplyPauseMinutes,
    );
  });

  it("keeps a stored value outside the presets as its own choice", () => {
    const choices = presetChoices(
      replyLengthPresets,
      450,
      presetCustomLabels.replyLength,
    );
    expect(choices.map((choice) => choice.value)).toEqual([300, 450, 600, 1200]);
    expect(choices.find((choice) => choice.value === 450)).toMatchObject({
      custom: true,
      label: "450 حرف (قيمة محفوظة)",
    });
    expect(
      presetLabel(replyLengthPresets, 450, presetCustomLabels.replyLength),
    ).toBe("450 حرف (قيمة محفوظة)");
  });

  it("adds nothing when the stored value is a preset", () => {
    expect(
      presetChoices(handoffReopenPresets, 24, presetCustomLabels.handoffReopen)
        .length,
    ).toBe(handoffReopenPresets.length);
    expect(
      presetLabel(staffReplyPausePresets, 0, presetCustomLabels.staffReplyPause),
    ).toBe("يرجع مع أول رسالة من العميل");
  });
});

describe("describeReplySources", () => {
  const knowledge = [
    { id: 7, title: "أسعار الكشف" },
    { id: 9, title: "مواعيد العيادة" },
  ];
  const instructions = [{ text: "رد باختصار" }, { text: "اذكر الفرع" }];

  it("names cited entries, instructions and the booking link", () => {
    expect(
      describeReplySources([9, -2, -1000], knowledge, instructions),
    ).toEqual([
      { id: 9, kind: "knowledge", title: "مواعيد العيادة" },
      { id: -2, kind: "instruction", title: "تعليمة 2: اذكر الفرع" },
      { id: -1000, kind: "booking", title: "رابط الحجز الإلكتروني" },
    ]);
  });

  it("returns nothing for a reply that cited nothing", () => {
    expect(describeReplySources([], knowledge, instructions)).toEqual([]);
  });

  it("drops repeated ids and labels an entry it cannot find by number", () => {
    expect(describeReplySources([7, 7, 40], knowledge, instructions)).toEqual([
      { id: 7, kind: "knowledge", title: "أسعار الكشف" },
      { id: 40, kind: "knowledge", title: "معلومة رقم 40" },
    ]);
  });
});


describe("knowledge import", () => {
  const pages = [{ accountId: "111" }, { accountId: "222" }];
  const header = [...knowledgeImportHeaders];
  const empty = { knowledge: [], instructions: [] };

  it("reads UTF-8 CSV with and without a BOM", () => {
    const csv = `${header.join(",")}\nمواعيد,"من 9, لـ 5",,,\n`;
    for (const text of [csv, `\uFEFF${csv}`]) {
      const file = readKnowledgeFile(
        "a.csv",
        Buffer.from(text, "utf8").toString("base64"),
      );
      expect(file).toEqual({
        rows: [header, ["مواعيد", "من 9, لـ 5", "", "", ""]],
      });
    }
  });

  it.each([
    ["", "all"],
    ["الكل", "all"],
    ["واتساب", "whatsapp"],
    ["صفحة المركز", "111"],
    ["واتساب + صفحة العيادة", "whatsapp,222"],
    ["صفحة المركز + صفحة العيادة", "facebook"],
    ["واتساب + صفحة المركز + صفحة العيادة", "all"],
  ])("maps the channel %s to %s", (value, target) => {
    expect(importTarget(value, pages)).toEqual({ target });
  });

  it("rejects an unknown channel and a page missing on the server", () => {
    expect(importTarget("تليجرام", pages).error).toContain("مش معروفة");
    expect(importTarget("صفحة العيادة", [{ accountId: "111" }]).error).toContain(
      "مش متعرّفة",
    );
  });

  it("requires the header row in order", () => {
    expect(
      planKnowledgeImport([["النص", "العنوان"]], empty, pages),
    ).toHaveProperty("error");
  });

  it("splits rules from information, applies defaults and reports bad rows", () => {
    const plan = planKnowledgeImport(
      [
        header,
        ["الأسعار", "الكشف 300", "", "", ""],
        ["الأسلوب", "رد باختصار", "نعم", "واتساب", "لا"],
        ["", "بدون عنوان", "", "", ""],
        ["طويل", "x".repeat(1000), "نعم", "", ""],
        ["قيمة", "نص", "ممكن", "", ""],
      ],
      empty,
      pages,
    );
    expect(plan).toMatchObject({
      knowledge: [
        { title: "الأسعار", content: "الكشف 300", targetPage: "all", enabled: true },
      ],
      instructions: [
        { text: "الأسلوب\nرد باختصار", targetPage: "whatsapp", enabled: false },
      ],
      rejected: [
        { row: 4, reason: "العنوان فاضي" },
        { row: 5, reason: expect.stringContaining("1000") },
        { row: 6, reason: expect.stringContaining("نعم أو لا") },
      ],
    });
  });

  it("skips rows that match an existing entry and never touches it", () => {
    const plan = planKnowledgeImport(
      [header, ["الأسعار", "الكشف 300", "", "", ""], ["قاعدة", "اختصر", "نعم", "", ""]],
      {
        knowledge: [{ title: "الأسعار", content: "الكشف 300" }],
        instructions: [{ text: "قاعدة\nاختصر" }],
      },
      pages,
    );
    expect(plan).toMatchObject({
      knowledge: [],
      instructions: [],
      skipped: [{ row: 2 }, { row: 3 }],
    });
  });

  it("caps the row count", () => {
    const rows = [header, ...Array.from({ length: 501 }, (_, i) => [`t${i}`, "x"])];
    expect(planKnowledgeImport(rows, empty, pages)).toHaveProperty("error");
  });
});
