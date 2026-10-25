import { afterEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import {
  whatsappCopyInput,
  whatsappOfferFacts,
  generateWhatsAppCopy,
} from "../services/ai/whatsappCopy";
import { marketingRouter } from "../routers/marketing";
import { makeCallerAs } from "./helpers/auth";
afterEach(() => vi.unstubAllEnvs());
describe("WhatsApp drafting boundaries", () => {
  it("accepts only public campaign fields, never recipients or patient text", () => {
    expect(
      whatsappCopyInput.safeParse({
        requestId: randomUUID(),
        kind: "reminder",
        transcript: "patient",
      }).success,
    ).toBe(false);
    expect(
      whatsappCopyInput.safeParse({
        requestId: randomUUID(),
        kind: "lasik",
        phone: "01012345678",
      }).success,
    ).toBe(false);
  });
  it("requires explicit center days only for specialist examination offers", () => {
    expect(
      whatsappCopyInput.safeParse({ requestId: randomUUID(), kind: "exam" })
        .success,
    ).toBe(false);
    expect(
      whatsappCopyInput.safeParse({
        requestId: randomUUID(),
        kind: "exam",
        days: ["الاثنين"],
      }).success,
    ).toBe(false);
    const input = whatsappCopyInput.parse({
      requestId: randomUUID(),
      kind: "exam",
      days: ["الأحد", "الأحد", "الخميس"],
    });
    expect(whatsappOfferFacts(input)).toBe(
      "الكشف مع الأخصائي فقط أيام الأحد والخميس بـ200ج بدلًا من 260ج.",
    );
  });
  it("preserves exact offer qualifications outside model-generated text", () => {
    expect(
      whatsappOfferFacts({ requestId: randomUUID(), kind: "lasik" }),
    ).toContain("يصل إلى 15%");
    expect(
      whatsappOfferFacts({ requestId: randomUUID(), kind: "cataract" }),
    ).toContain("لحامل بطاقة التأمين الصحي");
  });
  it("keeps generation off behind the central management flag", async () => {
    vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "false");
    await expect(
      generateWhatsAppCopy({ requestId: randomUUID(), kind: "reminder" }, 1),
    ).rejects.toThrow("disabled");
  });
  it.each(["doctor", "reception", "viewer"])(
    "rejects %s before generating",
    async (role) => {
      await expect(
        marketingRouter
          .createCaller(makeCallerAs(role))
          .generateWhatsAppCopy({ requestId: randomUUID(), kind: "reminder" }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    },
  );
});
