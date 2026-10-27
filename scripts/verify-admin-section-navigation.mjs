import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
const base = process.env.DESIGN_PREVIEW_URL || "http://127.0.0.1:5201";
const browser = await chromium.launch({ executablePath: "C:/Users/SELRS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe" });
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/api/**", async route => {
      assert.equal(route.request().method(), "GET", "Navigation cannot write medical or doctor data");
      const url = new URL(route.request().url());
      const results = (url.pathname.split("/api/trpc/")[1]?.split(",") ?? []).map(method => ({ result: { data: { json:
        method === "auth.me" ? { id: 999999, role: "admin", name: "Fixture admin" } : []
      } } }));
      await route.fulfill({ json: url.searchParams.has("batch") ? results : results[0] ?? {} });
    });
    await page.goto(`${base}/admin-hub/external-doctors`);
    const navigation = page.getByRole("navigation", { name: "أقسام الأطباء الخارجيين" });
    await navigation.getByRole("link", { name: "حسابات الأطباء", exact: true }).waitFor();
    assert.equal(await navigation.getByRole("link").count(), 2);
    await navigation.getByRole("link", { name: "الحالات والإحالات", exact: true }).click();
    await page.getByRole("heading", { name: "إحالات المرضى", exact: true }).waitFor();
    assert.equal(await navigation.getByRole("link", { name: "الحالات والإحالات", exact: true }).getAttribute("aria-current"), "page");
    await page.goto(`${base}/admin-hub/external-doctors/referrals`);
    await page.getByRole("heading", { name: "إحالات المرضى", exact: true }).waitFor();
    await page.goto(`${base}/admin-hub/op-history`);
    await page.getByRole("tab", { name: "العمليات", exact: true }).waitFor();
    assert.equal(await page.getByRole("tab", { name: "العمليات", exact: true }).getAttribute("aria-selected"), "true");
    await page.getByRole("tab", { name: "المرضى", exact: true }).click();
    assert.equal(await page.getByRole("tab", { name: "المرضى", exact: true }).getAttribute("aria-selected"), "true");
    await page.goto(`${base}/admin-hub/legacy-patients`);
    await page.getByRole("tab", { name: "المرضى", exact: true }).waitFor();
    assert.equal(await page.getByRole("tab", { name: "المرضى", exact: true }).getAttribute("aria-selected"), "true");
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log("Passed mobile/desktop section navigation: external doctor accounts/referrals, nested legacy link, record/operation tabs and old URLs. No writes.");
} finally { await browser.close(); }
