import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
const mocks = vi.hoisted(() => ({ target: vi.fn() }));
vi.mock("../services/marketing/page.service", () => ({
  getMarketingPageTarget: mocks.target,
}));
import {
  readMarketingPageBranding,
  composeMarketingPageLogo,
  marketingContactFooter,
} from "../services/marketing/pageBranding";
let sequence = 100000;
beforeEach(() => {
  sequence += 2;
  mocks.target.mockImplementation(async (role: string) => ({
    pageId: String(sequence + (role === "doctor" ? 1 : 0)),
    connected: true,
    accessToken: "fixture-secret",
    pageName: role,
  }));
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: URL | string, options: RequestInit) => {
      expect(options.method ?? "GET").toBe("GET");
      expect(String(url)).not.toContain("fixture-secret");
      const doctor = String(url).includes(String(sequence + 1));
      return Response.json({
        name: doctor ? "صفحة الدكتور" : "صفحة المركز",
        phone: doctor ? "doctor-phone" : "center-phone",
        location: { street: doctor ? "عنوان العيادة" : "عنوان المركز" },
      });
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
describe("exact marketing page identity", () => {
  it("uses the supplied doctor logo and isolates each page's address and phone", async () => {
    const center = await readMarketingPageBranding("center");
    const doctor = await readMarketingPageBranding("doctor");
    const original = await fs.readFile(
      path.resolve("client/public/marketing/doctor-logo.png"),
    );
    const expected = await sharp(original)
      .flatten({ background: "white" })
      .resize(240, 240, { fit: "contain", background: "white" })
      .png()
      .toBuffer();
    expect(doctor.logo.equals(expected)).toBe(true);
    expect(center.logo.equals(doctor.logo)).toBe(false);
    expect(marketingContactFooter(doctor)).toContain("عنوان العيادة");
    expect(marketingContactFooter(doctor)).not.toContain("center-phone");
    expect(marketingContactFooter(center)).toContain("center-phone");
    expect(marketingContactFooter(center)).not.toContain("عنوان العيادة");
  });
  it("composites the real logo without changing the medical subject at the image centre", async () => {
    const branding = await readMarketingPageBranding("doctor");
    const source = await sharp({
      create: { width: 1024, height: 1024, channels: 3, background: "#234567" },
    })
      .png()
      .toBuffer();
    const output = await composeMarketingPageLogo(source, branding.logo);
    expect(
      output.equals(
        await composeMarketingPageLogo(source, branding.logo, "اسم الصفحة"),
      ),
    ).toBe(true);
    expect((await sharp(output).metadata()).width).toBe(1024);
    expect((await sharp(output).metadata()).height).toBe(1024);
    const height = 0;
    const recovered = await sharp(output)
      .extract({ left: 0, top: height + 200, width: 1024, height: 824 })
      .ensureAlpha()
      .raw()
      .toBuffer();
    expect(
      recovered.equals(
        await sharp(source)
          .extract({ left: 0, top: 200, width: 1024, height: 824 })
          .ensureAlpha()
          .raw()
          .toBuffer(),
      ),
    ).toBe(true);
    const pixel = await sharp(output)
      .extract({ left: 512, top: 512, width: 1, height: 1 })
      .removeAlpha()
      .raw()
      .toBuffer();
    expect([...pixel]).toEqual([35, 69, 103]);
    expect(output.equals(source)).toBe(false);
  });
  it("does not fabricate contact details if the connected page has none", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ name: "Incomplete page" })),
    );
    await expect(readMarketingPageBranding("doctor")).rejects.toThrow(
      "عنوان الصفحة",
    );
  });
});
