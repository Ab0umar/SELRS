import { describe, expect, it } from "vitest";
import { marketingPreferenceFromInbound } from "../services/whatsappMarketing.service";

describe("WhatsApp marketing preference replies", () => {
  it.each([
    [{ buttonId: "marketing_continue" }, "subscribed"],
    [{ buttonId: "marketing_stop" }, "unsubscribed"],
    [{ text: "استمرار" }, "subscribed"],
    [{ text: "عروض" }, "subscribed"],
    [{ text: "إلغاء" }, "unsubscribed"],
  ] as const)("records %s as %s", (input, expected) => {
    expect(marketingPreferenceFromInbound(input)).toBe(expected);
  });

  it("ignores an unrelated inbound message", () => {
    expect(marketingPreferenceFromInbound({ text: "متى موعدي؟" })).toBeNull();
  });
});
