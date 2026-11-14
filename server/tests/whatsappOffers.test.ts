import { beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";

const settings = vi.hoisted(() => new Map<string, unknown>());
vi.mock("../db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../db")>()),
  getSystemSetting: async (key: string) =>
    settings.has(key) ? { value: JSON.stringify(settings.get(key)) } : null,
  updateSystemSettings: async (key: string, value: unknown) => {
    settings.set(key, value);
  },
}));

import {
  SEED_WHATSAPP_OFFERS,
  listWhatsAppOffers,
  saveWhatsAppOffer,
  setWhatsAppOfferEnabled,
} from "../services/whatsappOffers";
import {
  resolveWhatsAppOfferFacts,
  whatsappCopyInput,
  whatsappOfferFacts,
} from "../services/ai/whatsappCopy";
import { marketingRouter } from "../routers/marketing";
import { makeCallerAs } from "./helpers/auth";

beforeEach(() => settings.clear());

describe("editable WhatsApp offers", () => {
  it("starts from the offers that used to be hard-coded", async () => {
    const offers = await listWhatsAppOffers();
    expect(offers.map((offer) => offer.id)).toEqual([
      "lasik",
      "cataract",
      "exam",
    ]);
    for (const kind of ["lasik", "cataract"] as const)
      expect(offers.find((offer) => offer.id === kind)?.details).toBe(
        whatsappOfferFacts({ requestId: randomUUID(), kind }),
      );
  });

  it("adds, edits and disables an offer without losing the others", async () => {
    const added = await saveWhatsAppOffer({
      name: "عرض الصيف",
      details: "خصم 10% على الكشف.",
      endsOn: "2026-12-31",
      enabled: true,
    });
    await saveWhatsAppOffer({ ...added, details: "خصم 20% على الكشف." });
    await setWhatsAppOfferEnabled("lasik", false);
    const offers = await listWhatsAppOffers();
    expect(offers).toHaveLength(SEED_WHATSAPP_OFFERS.length + 1);
    expect(offers.find((offer) => offer.id === added.id)?.details).toBe(
      "خصم 20% على الكشف.",
    );
    expect(offers.find((offer) => offer.id === "lasik")?.enabled).toBe(false);
  });

  it("rejects editing an offer that does not exist", async () => {
    await expect(
      saveWhatsAppOffer({
        id: "missing",
        name: "اسم",
        details: "تفاصيل العرض",
        endsOn: null,
        enabled: true,
      }),
    ).rejects.toThrow("العرض غير موجود");
  });

  it("feeds only enabled, unexpired offers to the copy generator", async () => {
    const input = (offerId: string) =>
      whatsappCopyInput.parse({
        requestId: randomUUID(),
        kind: "offer",
        offerId,
      });
    expect(await resolveWhatsAppOfferFacts(input("cataract"))).toBe(
      SEED_WHATSAPP_OFFERS[1].details,
    );
    await setWhatsAppOfferEnabled("cataract", false);
    await expect(resolveWhatsAppOfferFacts(input("cataract"))).rejects.toThrow(
      "unavailable",
    );
    const expired = await saveWhatsAppOffer({
      name: "عرض قديم",
      details: "خصم 5% على الكشف.",
      endsOn: "2020-01-01",
      enabled: true,
    });
    await expect(resolveWhatsAppOfferFacts(input(expired.id))).rejects.toThrow(
      "unavailable",
    );
    const dated = await saveWhatsAppOffer({
      name: "عرض محدد",
      details: "خصم 5% على الكشف.",
      endsOn: "2999-01-31",
      enabled: true,
    });
    expect(await resolveWhatsAppOfferFacts(input(dated.id))).toBe(
      "خصم 5% على الكشف. العرض سارٍ حتى 31/01/2999.",
    );
  });

  it("requires an offer id exactly for offer messages", () => {
    expect(
      whatsappCopyInput.safeParse({ requestId: randomUUID(), kind: "offer" })
        .success,
    ).toBe(false);
    expect(
      whatsappCopyInput.safeParse({
        requestId: randomUUID(),
        kind: "reminder",
        offerId: "lasik",
      }).success,
    ).toBe(false);
  });

  it("validates offer fields on the server", async () => {
    const caller = marketingRouter.createCaller(makeCallerAs("admin"));
    await expect(
      caller.saveWhatsAppOffer({
        name: "x",
        details: "تفاصيل",
        endsOn: null,
        enabled: true,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.saveWhatsAppOffer({
        name: "عرض",
        details: "تفاصيل العرض",
        endsOn: "31/12/2026",
        enabled: true,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it.each(["doctor", "reception", "viewer"])(
    "keeps offers admin-only for %s",
    async (role) => {
      const caller = marketingRouter.createCaller(makeCallerAs(role));
      await expect(caller.whatsappOffers()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      await expect(
        caller.setWhatsAppOfferEnabled({ id: "lasik", enabled: false }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    },
  );
});
