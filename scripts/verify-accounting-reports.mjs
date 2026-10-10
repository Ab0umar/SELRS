import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const base = process.env.DESIGN_PREVIEW_URL || "http://127.0.0.1:5174";
const output = "outputs/accounting-report-verification";
await mkdir(output, { recursive: true });
const name = "اسم اختبار معزول طويل للتحقق من عرض اسم المريض والخدمة بالكامل دون قص";
const header = { sectionCode: 15, trTy: 1, trNo: "999999", transactionDate: "2026-10-02", patientCode: "000999", patientName: name, total: 1200, discount: 100, paidValue: 1100, enteredBy: "999" };
const line = { ...header, serviceCode: "1600", serviceName: name, doctorCode: "900", doctorName: name, quantity: 2, price: 1200, discountValue: 100, paidValue: 1100, companyValue: 0, entryDate: "2026-10-02", lineNo: 1 };
const daily = { date: "2026-10-02", totalReceipts: 1, totalGross: 1200, totalDiscount: 100, totalCash: 1100, totalPaid: 1100, netAfterDiscount: 1100 };
const total = { totalGross: 1200, totalPaid: 1100, totalDiscount: 100, rowCount: 1 };
const section = { sectionCode: 15, sectionName: "قسم اختبار معزول", subtotal: total, services: [{ serviceCode: "1600", serviceName: name, ...total, details: [{ trNo: "999999", trDate: "2026-10-02", patientCode: "000999", patientName: name, quantity: 2, price: 1200, patientShare: 1100, discount: 100, patientTotal: 1100, companyTotal: 0 }] }] };
const views = [
  { slug: "daily-revenue", title: "الإيراد اليومي", query: "dailyRevenue", data: { rows: [daily], totals: daily }, empty: { rows: [], totals: { ...daily, totalReceipts: 0, totalGross: 0, totalDiscount: 0, totalCash: 0, totalPaid: 0, netAfterDiscount: 0 } } },
  { slug: "service-revenue", title: "إيراد الخدمات", query: "serviceRevenue", data: { sections: [section], grandTotal: total }, empty: { sections: [], grandTotal: { totalGross: 0, totalPaid: 0, totalDiscount: 0, rowCount: 0 } } },
  { slug: "services", title: "الخدمات", query: "lasikServices", data: [{ serviceCode: "1600", serviceName: name, quantity: 2, price: 1200 }], empty: [] },
  { slug: "receipts", title: "الإيصالات", query: "receiptsInquiry", data: [header], empty: [] },
  { slug: "receipts/15/1/999999", title: "تفاصيل الإيصال", query: "receiptDetail", data: { header, lines: [line] }, empty: { header: null, lines: [] } },
];
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const results = [];
try {
  for (const theme of ["light", "dark"]) for (const width of (process.env.ACCOUNTING_WIDTHS || "1024,1440,1920").split(',').map(Number)) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    await context.addInitScript(theme => localStorage.setItem("theme", theme), theme);
    const page = await context.newPage();
    const errors = [], mutations = [], requests = [];
    let failed = "", empty = "", held = "", release;
    page.on("pageerror", e => errors.push(e.message));
    await page.route("**/api/**", async route => {
      if (route.request().method() !== "GET") { mutations.push(route.request().url()); await route.abort(); return; }
      const url = new URL(route.request().url());
      const methods = url.pathname.split("/api/trpc/")[1]?.split(",") ?? [];
      const input = JSON.parse(url.searchParams.get("input") || "{}");
      if (methods.includes(held)) await new Promise(resolve => { release = resolve; });
      const responses = methods.map((method, index) => {
        requests.push({ method, input: input[index]?.json ?? input.json });
        if (method === failed) return { error: { json: { message: "Isolated test failure", code: -32603, data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 } } } };
        const view = views.find(view => method === "accounting." + view.query);
        const data = view ? (method === empty ? view.empty : view.data)
          : method === "auth.me" ? { id: 999999, role: "admin", name: "اختبار التصميم" }
          : method === "accounting.serviceEntryCatalog" ? { doctors: [{ code: "900", name }], services: [{ code: "1600", name, price: 600 }] }
          : method.endsWith("Lookup") ? { code: "000999", name }
          : method === "accounting.dashboardSummary" ? { totalRevenueToday: 1200, totalReceiptsToday: 1 }
          : method === "accounting.accLedgerSummary" ? { totalIncome: 1200, totalExpense: 100, currentBalance: 1100 } : [];
        return { result: { data: { json: data } } };
      });
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(url.searchParams.has("batch") ? responses : responses[0]) });
    });
    for (const view of views) {
      await page.goto(base + "/accounting/" + view.slug);
      await page.locator(".accounting-report h1").getByText(view.title, { exact: true }).waitFor();
      if (width < 640) {
        await page.locator('.accounting-report table tbody tr').last().waitFor({ state: 'attached' });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${view.slug}: mobile overflow`);
        await page.screenshot({ path: `${output}/${view.query}-${theme}-${width}.png`, fullPage: true });
        assert.deepEqual(errors, []); assert.deepEqual(mutations, []);
        results.push({ view: view.slug, theme, width, mobileLayout: 'PASS', writes: 0 });
        console.log(JSON.stringify(results.at(-1)));
        continue;
      }
      await page.locator(".accounting-report table tbody tr").last().waitFor();
      await page.evaluate(() => document.fonts.ready);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), view.slug + " page overflow");
      assert.equal(await page.locator(".accounting-report button button").count(), 0);
      assert.equal(await page.locator('.accounting-report [data-slot="card"]').first().evaluate(node => getComputedStyle(node).borderInlineStartWidth), "0px");
      if (view.query === "serviceRevenue") {
        const trigger = page.getByRole("button", { name: "الطبيب", exact: true });
        await trigger.click();
        await page.getByRole("checkbox", { name: "900 - " + name }).check();
        await page.keyboard.press("Escape");
        await page.getByRole("checkbox").waitFor({ state: "hidden" });
        await page.waitForTimeout(150);
        assert.ok(await trigger.evaluate(node => node === document.activeElement));
        await page.getByRole("button", { name: "تطبيق", exact: true }).click();
        await page.waitForTimeout(300);
        assert.ok(requests.some(r => r.method === "accounting.serviceRevenue" && r.input?.doctorCodes?.includes("900")));
      }
      if (view.query === "receiptsInquiry") {
        await page.locator("#receipt-patient-code").fill("000999");
        await page.getByRole("button", { name: "تطبيق", exact: true }).click();
        await page.waitForTimeout(400);
        assert.ok(requests.some(r => r.method === "accounting.receiptsInquiry" && r.input?.patientCode === "000999"));
      }
      if (view.query === "receiptDetail") {
        await page.getByRole("button", { name: "تعديل السطر", exact: true }).click();
        assert.equal(await page.getByRole("textbox", { name: "كود الخدمة", exact: true }).inputValue(), "1600");
        assert.equal(await page.getByRole("spinbutton", { name: "السعر", exact: true }).inputValue(), "600.00");
        await page.getByRole("button", { name: "إلغاء", exact: true }).click();
        assert.equal(await page.getByRole("textbox", { name: "كود الخدمة", exact: true }).count(), 0);
      }
      await page.screenshot({ path: output + "/" + view.query + "-" + theme + "-" + width + ".png", fullPage: true });
      let states = "not run at this width";
      if (width === 1440) {
        held = "accounting." + view.query;
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.getByRole("status").filter({ hasText: /جارٍ تحميل/ }).waitFor();
        held = ""; release();
        await page.locator(".accounting-report table tbody tr").last().waitFor();
        failed = "accounting." + view.query;
        await page.reload();
        await page.locator(".accounting-report").getByRole("alert").waitFor({ timeout: 30000 });
        assert.equal(await page.locator(".accounting-report table tbody tr").count(), 0);
        failed = "";
        await page.getByRole("button", { name: view.query === "receiptDetail" ? "تحديث تفاصيل الإيصال" : "إعادة المحاولة", exact: true }).click();
        await page.locator(".accounting-report table tbody tr").last().waitFor();
        empty = "accounting." + view.query;
        await page.reload();
        await page.locator(".accounting-report").getByText(/لا توجد|لم يتم العثور/).last().waitFor();
        empty = "";
        states = "loading, error, retry, empty PASS";
      }
      assert.deepEqual(errors, []);
      assert.deepEqual(mutations, []);
      results.push({ view: view.slug, theme, width, states, overflow: false, writes: 0 });
      await writeFile(output + "/results.json", JSON.stringify(results, null, 2));
      console.log(JSON.stringify(results.at(-1)));
    }
    await context.close();
  }
} finally { await browser.close(); }
