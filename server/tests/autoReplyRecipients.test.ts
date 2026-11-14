import { describe, expect, it } from "vitest";
import {
  autoReplySettingsSchema,
  isAutoReplyRecipientAllowed,
} from "../../shared/auto-reply";
import { recipientDecision } from "../services/auto-reply/recipients";

describe("WhatsApp reply recipients", () => {
  it.each([
    "01000000000",
    "+20 100 000 0000",
    "00201000000000",
    "٠١٠٠٠٠٠٠٠٠٠",
    "۰۱۰۰۰۰۰۰۰۰۰",
  ])("matches the same recipient entered as %s", (phone) => {
    const config = autoReplySettingsSchema.parse({
      whatsappRecipients: { mode: "include", phones: [phone] },
    });
    expect(
      isAutoReplyRecipientAllowed(config, "whatsapp", "201000000000"),
    ).toBe(true);
    expect(
      isAutoReplyRecipientAllowed(config, "whatsapp", "201111111111"),
    ).toBe(false);
  });

  it.each([
    ["all", [], true],
    ["include", [], false],
    ["exclude", [], true],
    ["include", ["201000000000"], true],
    ["exclude", ["201000000000"], false],
    ["exclude", ["201111111111"], true],
  ])("applies %s with list %j", (mode, phones, allowed) => {
    const config = autoReplySettingsSchema.parse({
      whatsappRecipients: { mode, phones },
    });
    expect(
      isAutoReplyRecipientAllowed(config, "whatsapp", "201000000000"),
    ).toBe(allowed);
    expect(
      isAutoReplyRecipientAllowed(config, "messenger", "201000000000"),
    ).toBe(true);
    expect(
      isAutoReplyRecipientAllowed(config, "facebook_comment", "201000000000"),
    ).toBe(true);
  });

  it.each([
    "123",
    "201000000000abc",
    "201000000000@g.us",
    "0",
    "1234567890123456",
  ])("rejects malformed list entry %s", (phone) => {
    expect(
      autoReplySettingsSchema.safeParse({
        whatsappRecipients: { mode: "include", phones: [phone] },
      }).success,
    ).toBe(false);
  });

  it("deduplicates equivalent numbers and keeps existing configurations open to everyone", () => {
    const config = autoReplySettingsSchema.parse({
      whatsappRecipients: {
        mode: "include",
        phones: ["01000000000", "+201000000000"],
      },
    });
    expect(config.whatsappRecipients.phones).toEqual(["201000000000"]);
    expect(
      isAutoReplyRecipientAllowed(
        autoReplySettingsSchema.parse({}),
        "whatsapp",
        "201000000000",
      ),
    ).toBe(true);
  });
  it("separates an unusable contact list from an excluded recipient", async () => {
    // No linked phone is configured here, so the contact list cannot be read.
    const db = {} as Parameters<typeof recipientDecision>[0];
    const to = {
      channel: "whatsapp" as const,
      accountId: "1",
      participantId: "201000000000",
    };
    const settings = (mode: string, phones: string[] = []) =>
      autoReplySettingsSchema.parse({ whatsappRecipients: { mode, phones } });
    expect(await recipientDecision(db, settings("except_contacts"), to)).toBe(
      "unavailable",
    );
    expect(await recipientDecision(db, settings("all"), to)).toBe("allowed");
    expect(await recipientDecision(db, settings("include"), to)).toBe(
      "excluded",
    );
    expect(
      await recipientDecision(db, settings("except_contacts"), {
        ...to,
        channel: "messenger",
      }),
    ).toBe("allowed");
  });
});
