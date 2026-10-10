import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const base = process.env.DESIGN_PREVIEW_URL || "http://127.0.0.1:5174";
const output = "outputs/accounting-web-verification";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const results = [];
try {
  for (const theme of ["light", "dark"]) {
    for (const width of [1024, 1440, 1920]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 } });
      await context.addInitScript(theme => localStorage.setItem("theme", theme), theme);
      const page = await context.newPage();
      const errors = [], mutations = [], filters = [];
      let expenseError = false;
      page.on("pageerror", error => errors.push(error.message));
      await page.route("**/api/**", async route => {
        const request = route.request();
        if (request.method() !== "GET") mutations.push(request.url());
        const url = new URL(request.url());
        const methods = url.pathname.split("/api/trpc/")[1]?.split(",") ?? [];
        const input = JSON.parse(url.searchParams.get("input") || "{}");
        const responses = methods.map((method, index) => {
          if (method === "accounting.accExpenses") {
            filters.push(input[index]?.json ?? input.json);
            if (expenseError) return { error: { json: { message: "Isolated test failure", code: -32603, data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 } } } };
          }
          const data = method === "auth.me" ? { id: 999999, role: "admin", name: "اختبار التصميم" }
            : method === "accounting.dashboardSummary" ? { totalRevenueToday: 1200, totalReceiptsToday: 3 }
            : method === "accounting.accLedgerSummary" ? { currentBalance: 1000, totalIncome: 1200, totalExpense: 200 }
            : method === "accounting.accExpenses" ? { total: 51, totalExpense: 200, rows: [{ id: 999999, txDate: "2026-10-02", expense: 200, notes: "بيان اختبار معزول طويل للتحقق من عرض النص بالكامل داخل جدول المصروفات دون اقتطاع أو تغيير في التصنيف" }] }
            : method === "accounting.serviceEntryCatalog" ? { services: [], doctors: [] }
            : method === "accounting.accReports" ? {} : [];
          return { result: { data: { json: data } } };
        });
        await route.fulfill({ contentType: "application/json", body: JSON.stringify(url.searchParams.has("batch") ? responses : responses[0]) });
      });
      await page.goto(`${base}/accounting`);
      await page.getByRole("button", { name: "تحديث الأرصدة" }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.getByLabel("الإيراد", { exact: true }).fill("500");
      assert.equal(await page.getByLabel("الإيراد", { exact: true }).inputValue(), "500");
      await page.getByRole("button", { name: "جديد", exact: true }).click();
      assert.equal(await page.getByLabel("الإيراد", { exact: true }).inputValue(), "");
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: `${output}/ledger-${theme}-${width}.png`, fullPage: true });
      await page.goto(`${base}/accounting/expenses`);
      await page.locator("table tbody tr").waitFor();
      await page.getByRole("button", { name: "إيجار", exact: true }).click();
      await page.waitForTimeout(300);
      assert.ok(filters.some(filter => filter?.category === "rent"));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const statement = await page.locator("table tbody td").nth(1).evaluate(node => ({ width: node.clientWidth, content: node.scrollWidth }));
      assert.ok(statement.content <= statement.width + 1);
      await page.screenshot({ path: `${output}/expenses-${theme}-${width}.png`, fullPage: true });
      expenseError = true;
      await page.reload();
      await page.getByRole("alert").filter({ hasText: "تعذر تحميل المصروفات" }).waitFor({ timeout: 30000 });
      assert.equal(await page.locator("table").isVisible(), false);
      expenseError = false;
      await page.getByRole("button", { name: "إعادة المحاولة", exact: true }).click();
      await page.locator("table tbody tr").waitFor();
      assert.deepEqual(errors, []);
      assert.deepEqual(mutations, []);
      results.push({ theme, width, ledgerEntryAndReset: "PASS", expenseFilter: "PASS", errorRecovery: "PASS", pageOverflow: false, mutations });
      await context.close();
    }
  }
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
