import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const output = "outputs/accounting-register-save-verification";
await mkdir(output, { recursive: true });
const row = { id: 999999, txDate: "2026-10-03", name: "اختبار معزول", employee: "اختبار معزول", notes: "مسودة معزولة", income: 123, expense: 0, amount: 123, repayment: 0, balance: 123, remaining: 123 };
const cases = [
  { slug: "cashbook", method: "updateAccEntry", field: "#entry-income", notes: "#entry-notes", drawer: "تعديل القيد", save: "تحديث القيد" },
  { slug: "loans", method: "updateAccLoan", field: "#loan-amount", notes: "#loan-notes", drawer: "تعديل القرض", save: "تحديث القرض" },
  { slug: "advances", method: "addAccAdvance", field: "#advances-advance", notes: "#advances-notes", employee: "#advances-employee", save: "إضافة سلفة" },
  { slug: "instapay", method: "addAccInstapay", field: "#instapay-in", notes: "#instapay-notes", save: "إضافة حركة انستاباي" },
  { slug: "home-fund", method: "addAccHome", field: "#home-in", notes: "#homefund-notes", save: "إضافة حركة البيت" },
  { slug: "dr-saadany", method: "addAccSaadany", field: "#saadany-withdrawals", notes: "#saadany-notes", save: "إضافة حركة د. السعدني" },
];
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const results = [];
try {
  for (const theme of ["light", "dark"]) for (const scenario of cases) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(theme => localStorage.setItem("theme", theme), theme);
    const page = await context.newPage();
    const errors = [], calls = [];
    let release, fail = true;
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/api/**", async route => {
      const url = new URL(route.request().url());
      if (route.request().method() !== "GET") {
        assert.ok(url.pathname.endsWith("accounting." + scenario.method));
        calls.push(route.request().postDataJSON());
        await new Promise(resolve => { release = resolve; });
        const response = fail ? { error: { json: { message: "فشل اختبار معزول", code: -32603, data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 } } } } : { result: { data: { json: { success: true, id: 999999 } } } };
        await route.fulfill({ contentType: "application/json", body: JSON.stringify(url.searchParams.has("batch") ? [response] : response) });
        return;
      }
      const fixtures = {
        "auth.me": { id: 999999, role: "admin", name: "اختبار معزول" },
        "accounting.dashboardSummary": { totalRevenueToday: 123, totalReceiptsToday: 1 },
        "accounting.accLedgerSummary": { totalIncome: 123, totalExpense: 0, currentBalance: 123 },
        "accounting.accEmployeesList": [{ id: 999999, name: row.name }],
        "accounting.accReports": { advances: [], loans: [], instapay: { totalIn: 123, totalOut: 0, net: 123 }, home: { totalIn: 123, totalOut: 0, net: 123 }, saadany: { totalWithdrawals: 123, totalRepaid: 0, remaining: 123 } },
      };
      for (const method of ["accLedger", "accLoansLedger", "accAdvancesLedger", "accInstapayLedger", "accHomeLedger", "accSaadanyLedger"]) fixtures["accounting." + method] = { total: 1, rows: [row] };
      const responses = (url.pathname.split("/api/trpc/")[1]?.split(",") ?? []).map(method => ({ result: { data: { json: fixtures[method] ?? [] } } }));
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(url.searchParams.has("batch") ? responses : responses[0]) });
    });
    await page.goto((process.env.DESIGN_PREVIEW_URL || "http://127.0.0.1:5175") + "/accounting/" + scenario.slug);
    if (scenario.slug === "cashbook") await page.getByRole("button", { name: "تعديل القيد", exact: true }).last().click();
    if (scenario.slug === "loans") {
      const entry = page.locator(".accounting-history tbody tr[role=button]").last();
      await entry.focus(); await page.keyboard.press("Enter");
    }
    const scope = scenario.drawer ? page.getByRole("dialog", { name: scenario.drawer }) : page.locator(".accounting-entry");
    await scope.waitFor();
    const field = scope.locator(scenario.field), notes = scope.locator(scenario.notes);
    await field.fill("123"); await notes.fill("مسودة معزولة");
    if (scenario.employee) { await scope.locator(scenario.employee).fill(row.name); await page.keyboard.press("Escape"); }
    const save = scope.getByRole("button", { name: scenario.save, exact: true });
    await save.click();
    await page.waitForTimeout(250);
    assert.ok(release); assert.equal(await field.isDisabled(), true);
    await save.evaluate(node => node.click());
    assert.equal(calls.length, 1);
    release();
    await page.waitForTimeout(1800);
    assert.equal(await field.isDisabled(), false);
    assert.equal(await field.inputValue(), "123"); assert.equal(await notes.inputValue(), "مسودة معزولة");
    assert.equal(calls.length, 1);
    assert.ok((await page.locator('[role="alert"],[data-sonner-toast]').allTextContents()).some(text => /فشل|تعذر/.test(text)));
    await page.screenshot({ path: `${output}/${scenario.slug}-${theme}.png`, fullPage: true });
    fail = false; release = undefined;
    await save.click(); await page.waitForTimeout(250); assert.ok(release); release();
    await page.waitForTimeout(600);
    assert.equal(calls.length, 2); assert.deepEqual(errors, []);
    if (scenario.drawer) assert.equal(await scope.isVisible(), false);
    else assert.equal(await field.inputValue(), "");
    results.push({ slug: scenario.slug, theme, retainedDraft: true, pendingLocked: true, manualRetry: true, calls, errors });
    await context.close();
  }
} finally { await browser.close(); }
await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
console.log(`Passed ${results.length} isolated register save cases.`);
