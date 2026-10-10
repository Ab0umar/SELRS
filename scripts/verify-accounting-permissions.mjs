import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const base = process.env.DESIGN_PREVIEW_URL || "http://127.0.0.1:5175";
const output = "outputs/accounting-permission-verification";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const results = [];
try {
  for (const theme of ["light", "dark"]) {
    for (const scenario of ["cashbook-only", "loans-only", "admin"]) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      await context.addInitScript(theme => localStorage.setItem("theme", theme), theme);
      const page = await context.newPage();
      const errors = [], mutations = [];
      page.on("pageerror", error => errors.push(error.message));
      const path = scenario === "loans-only" ? "/accounting/loans" : "/accounting/cashbook";
      await page.route("**/api/**", async route => {
        if (route.request().method() !== "GET") {
          mutations.push(route.request().url());
          await route.abort();
          return;
        }
        const url = new URL(route.request().url());
        const fixtures = {
          "auth.me": { id: 999999, role: scenario === "admin" ? "admin" : "user", name: "اختبار صلاحيات معزول" },
          "medical.getMyPermissions": [path + ":r"],
          "accounting.dashboardSummary": { totalRevenueToday: 1200, totalReceiptsToday: 1 },
          "accounting.accLedgerSummary": { totalIncome: 1200, totalExpense: 200, currentBalance: 1000 },
          "accounting.accLedger": { total: 0, rows: [] },
          "accounting.accLoansLedger": { total: 0, rows: [] },
          "accounting.accReports": { loans: [], advances: [] },
        };
        const responses = (url.pathname.split("/api/trpc/")[1]?.split(",") ?? []).map(method => ({ result: { data: { json: fixtures[method] ?? [] } } }));
        await route.fulfill({ contentType: "application/json", body: JSON.stringify(url.searchParams.has("batch") ? responses : responses[0]) });
      });
      await page.goto(base + path);
      const nav = page.getByRole("navigation", { name: "أقسام الوحدة" });
      await nav.waitFor();
      await page.waitForTimeout(500);
      const select = nav.getByRole("combobox", { name: "الحسابات الفرعية" });
      const links = await nav.locator("a").evaluateAll(nodes => nodes.map(node => node.getAttribute("href")));
      let children = [];
      if (scenario === "cashbook-only") {
        assert.equal(await select.count(), 0);
        assert.deepEqual(links, [path]);
      } else {
        children = await select.locator("option[value]:not([value=''])").evaluateAll(nodes => nodes.map(node => node.value));
        assert.deepEqual(children, scenario === "admin" ? ["/accounting/advances", "/accounting/loans", "/accounting/instapay", "/accounting/home-fund", "/accounting/dr-saadany", "/accounting/expenses"] : [path]);
        await select.focus();
        assert.equal(await select.evaluate(node => document.activeElement === node), true);
        await select.selectOption("/accounting/loans");
        await page.waitForURL(url => url.pathname === "/accounting/loans");
      }
      assert.deepEqual(errors, []);
      assert.deepEqual(mutations, []);
      await page.screenshot({ path: `${output}/${scenario}-${theme}.png`, fullPage: true });
      results.push({ scenario, theme, links, children, errors, mutations });
      await context.close();
    }
  }
} finally {
  await browser.close();
}
await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
console.log(`Passed ${results.length} isolated accounting navigation permission cases.`);
