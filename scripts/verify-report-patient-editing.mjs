import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const browser = await chromium.launch({ channel: "msedge" });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    assert.equal(route.request().method(), "GET", "Verification must not write patient data");
    const methods = url.pathname.split("/api/trpc/")[1]?.split(",") ?? [];
    const responses = methods.map((method) => ({ result: { data: { json: method === "auth.me" ? { id: 999999, role: "admin", name: "اختبار التقارير" } : [] } } }));
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(url.searchParams.has("batch") ? responses : responses[0]) });
  });
  for (const tab of ["referral", "condition", "offdays", "pre-post-op", "clinical", "medical-report"]) {
    await page.goto(`http://127.0.0.1:5186/reports?tab=${tab}`);
    await page.locator('[role="tabpanel"][data-state="active"]').waitFor();
    const panel = page.locator('[role="tabpanel"][data-state="active"]');
    const field = tab === "clinical"
      ? panel.locator('input').first()
      : tab === "medical-report"
        ? panel.locator('input').filter({ visible: true }).first()
        : panel.getByRole("textbox", { name: "اسم المريض:", exact: true });
    await field.fill("اختبار بيانات يدوي");
    assert.equal(await field.evaluate((node) => node.value ?? node.textContent), "اختبار بيانات يدوي", tab);
    if (!["clinical", "medical-report"].includes(tab)) {
      const phone = panel.getByRole("textbox", { name: "موبايل:", exact: true });
      await phone.fill("01012345678");
      await panel.getByLabel("تاريخ الميلاد:", { exact: true }).filter({ visible: true }).fill("1990-01-02");
      await page.emulateMedia({ media: "print" });
      assert.ok(await panel.getByText("اختبار بيانات يدوي", { exact: true }).filter({ visible: true }).count() > 0, `${tab}: printed name`);
      assert.ok(await panel.getByText("01012345678", { exact: true }).filter({ visible: true }).count() > 0, `${tab}: printed phone`);
      assert.ok(await panel.getByText("1990-01-02", { exact: true }).filter({ visible: true }).count() > 0, `${tab}: printed birth date`);
      await page.emulateMedia({ media: "screen" });
    }
    console.log(`${tab}: manual patient entry passed`);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
