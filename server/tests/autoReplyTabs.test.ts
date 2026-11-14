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
