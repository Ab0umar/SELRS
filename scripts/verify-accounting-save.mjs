import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const output = "outputs/accounting-save-verification";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const results = [];
try {
  for (const theme of ["light", "dark"]) for (const kind of ["ledger", "service", "loan"]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(theme => localStorage.setItem("theme", theme), theme);
    const page = await context.newPage();
    const errors = [], calls = [];
    page.on("pageerror", error => errors.push(error.message));
    let release;
    let fail = true;
    await page.route("**/api/**", async route => {
      const url = new URL(route.request().url());
      if (route.request().method() !== "GET") {
        calls.push({ url: url.pathname, body: route.request().postDataJSON() });
        const method = { ledger: "addAccEntry", service: "addPatientServices", loan: "addAccLoan" }[kind];
        assert.ok(url.pathname.endsWith("accounting." + method), "Only the expected isolated save is allowed");
        await new Promise(resolve => { release = resolve; });
        const response = fail
          ? { error: { json: { message: "Isolated save failure", code: -32603, data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 } } } }
          : { result: { data: { json: { success: true, id: 999999 } } } };
        await route.fulfill({ contentType: "application/json", body: JSON.stringify(url.searchParams.has("batch") ? [response] : response) });
        return;
      }
      const fixtures = {
        "auth.me": { id: 999999, role: "admin", name: "اختبار حفظ معزول" },
        "accounting.accLedgerSummary": { totalIncome: 0, totalExpense: 0, currentBalance: 0 },
        "accounting.dashboardSummary": { totalRevenueToday: 0, totalReceiptsToday: 0 },
        "accounting.accEmployeesList": [{ id: 999999, name: "موظف اختبار" }],
        "accounting.accLoansSummary": { byPerson: [] },
        "accounting.serviceEntryCatalog": { doctors: [], services: [{ code: "1600", name: "خدمة اختبار", price: 123 }] },
        "accounting.patientNameLookup": { patientName: "مريض اختبار" },
      };
      const responses = (url.pathname.split("/api/trpc/")[1]?.split(",") ?? []).map(method => ({ result: { data: { json: fixtures[method] ?? [] } } }));
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(url.searchParams.has("batch") ? responses : responses[0]) });
    });
    await page.goto((process.env.DESIGN_PREVIEW_URL || "http://127.0.0.1:5175") + "/accounting");
    if (kind !== "ledger") await page.getByRole("button", { name: kind === "service" ? "خدمة" : "قرض", exact: true }).first().click();
    const form = page.locator("form");
    const income = form.getByLabel(kind === "ledger" ? "الإيراد" : kind === "loan" ? "القرض" : "السعر 1", { exact: true });
    const notes = form.getByLabel(kind === "ledger" ? "البيان" : kind === "loan" ? "ملاحظات" : "كود المريض", { exact: true });
    await income.waitFor();
    if (kind === "loan") await form.getByLabel("الموظف", { exact: true }).selectOption("موظف اختبار");
    if (kind === "service") await form.getByLabel("الخدمة 1", { exact: true }).selectOption("1600");
    await income.fill("123");
    const draft = kind === "service" ? "000999" : "اختبار حفظ معزول";
    await notes.fill(draft);
    await form.getByRole("button", { name: "حفظ", exact: true }).click();
    await page.waitForFunction(() => document.querySelector("form")?.getAttribute("aria-busy") === "true");
    assert.equal(await income.isDisabled(), true);
    assert.equal(await form.getByRole("button", { name: "جديد", exact: true }).isDisabled(), true);
    await form.evaluate(node => node.requestSubmit());
    await page.waitForTimeout(250);
    assert.equal(calls.length, 1, "Repeated submit must not send another mutation");
    assert.ok(release);
    release();
    await page.waitForTimeout(500);
    await form.getByRole("alert").waitFor();
    assert.equal(await income.inputValue(), "123");
    assert.equal(await notes.inputValue(), draft);
    assert.equal(await income.isDisabled(), false);
    await page.waitForTimeout(1500);
    assert.equal(calls.length, 1, "A failed financial save must not retry automatically");
    const payload = Object.values(calls[0].body)[0].json;
    if (kind === "service") {
      assert.equal(payload.patientCode, "000999");
      assert.equal(payload.lines[0].price, 123);
      assert.equal(payload.lines[0].serviceCode, "1600");
    } else assert.equal(kind === "loan" ? payload.amount : payload.income, 123);
    await page.screenshot({ path: `${output}/${kind}-failure-${theme}.png`, fullPage: true });
    fail = false;
    release = undefined;
    await form.getByRole("button", { name: "حفظ", exact: true }).click();
    await page.waitForTimeout(250);
    assert.equal(calls.length, 2);
    assert.ok(release);
    release();
    await form.getByRole("button", { name: "تم الحفظ", exact: true }).waitFor();
    assert.equal(await notes.inputValue(), "");
    assert.equal(await income.inputValue(), "");
    assert.equal(await form.getByRole("alert").count(), 0);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `${output}/${kind}-success-${theme}.png`, fullPage: true });
    if (kind === "loan") {
      await form.getByLabel("الموظف", { exact: true }).selectOption("موظف اختبار");
      assert.equal(await form.getByRole("button", { name: "تم الحفظ", exact: true }).count(), 0);
    }
    results.push({ kind, theme, calls, errors, pendingLocked: true, repeatedSubmitBlocked: true, failedDraftRetained: true, successCleared: true });
    await context.close();
  }
} finally { await browser.close(); }
await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
console.log(`Passed ${results.length} isolated save workflows.`);
