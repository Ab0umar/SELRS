import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const output = "outputs/accounting-entry-tab-verification";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const results = [];
try {
  for (const theme of ["light", "dark"]) for (const width of [1024, 1440, 1920]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    await context.addInitScript(theme => localStorage.setItem("theme", theme), theme);
    const page = await context.newPage();
    const errors = [], mutations = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/api/**", async route => {
      if (route.request().method() !== "GET") { mutations.push(route.request().url()); await route.abort(); return; }
      const url = new URL(route.request().url());
      const fixtures = {
        "auth.me": { id: 999999, role: "admin", name: "اختبار تصميم معزول" },
        "accounting.dashboardSummary": { totalRevenueToday: 1200, totalReceiptsToday: 1 },
        "accounting.accLedgerSummary": { currentBalance: 1000, totalIncome: 1200, totalExpense: 200 },
        "accounting.accEmployeesList": [{ id: 999999, name: "موظف اختبار" }],
        "accounting.accLoansSummary": { byPerson: [{ name: "موظف اختبار", totalLoan: 500, totalPaid: 100, remaining: 400 }] },
        "accounting.serviceEntryCatalog": { doctors: [{ code: "900", name: "طبيب اختبار" }], services: [{ code: "1600", name: "خدمة اختبار", price: 600 }] },
        "accounting.patientNameLookup": { patientName: "مريض اختبار" },
        "accounting.serviceRevenue": { grandTotal: { rowCount: 1, totalPaid: 600 }, sections: [] },
      };
      const responses = (url.pathname.split("/api/trpc/")[1]?.split(",") ?? []).map(method => ({ result: { data: { json: fixtures[method] ?? [] } } }));
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(url.searchParams.has("batch") ? responses : responses[0]) });
    });
    await page.goto((process.env.DESIGN_PREVIEW_URL || "http://127.0.0.1:5175") + "/accounting");
    for (const tab of ["خدمة", "قرض"]) {
      await page.getByRole("button", { name: tab, exact: true }).first().click();
      const form = page.locator(".accounting-entry-workspace form");
      await form.waitFor();
      await page.waitForTimeout(200);
      assert.equal(await form.getByRole("button", { name: "حفظ", exact: true }).isDisabled(), true);
      if (tab === "خدمة") {
        await form.getByLabel("كود المريض", { exact: true }).fill("000999");
        await form.getByLabel("الخدمة 1", { exact: true }).selectOption("1600");
        await form.getByLabel("العدد 1", { exact: true }).fill("2");
        await form.getByLabel("الخصم 1", { exact: true }).fill("100");
        assert.ok((await form.innerText()).includes("١٬١٠٠"));
        await form.getByRole("button", { name: "خدمة", exact: true }).click();
        await form.getByLabel("حذف الخدمة 2", { exact: true }).click();
        assert.equal(await form.getByLabel("الخدمة 2", { exact: true }).count(), 0);
        await page.getByRole("button", { name: "خدمات اليوم", exact: true }).click();
        await page.getByRole("dialog").waitFor();
        await page.keyboard.press("Escape");
      } else {
        await form.getByLabel("الموظف", { exact: true }).selectOption("موظف اختبار");
        await form.getByLabel("القرض", { exact: true }).fill("500");
        await form.getByLabel("المسدد", { exact: true }).fill("100");
        assert.ok((await form.innerText()).includes("٤٠٠"));
      }
      assert.equal(await form.getByRole("button", { name: "حفظ", exact: true }).isDisabled(), false);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      assert.equal(overflow, false);
      await page.screenshot({ path: `${output}/${tab === "خدمة" ? "service" : "loan"}-${theme}-${width}.png`, fullPage: true });
      await form.getByRole("button", { name: "جديد", exact: true }).click();
      assert.equal(await form.getByRole("button", { name: "حفظ", exact: true }).isDisabled(), true);
      results.push({ tab, theme, width, overflow, inputAndReset: true });
    }
    assert.deepEqual(errors, []); assert.deepEqual(mutations, []);
    await context.close();
  }
} finally { await browser.close(); }
await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
console.log(`Passed ${results.length} entry tab cases without financial writes.`);
