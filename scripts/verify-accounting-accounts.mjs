import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

const base = process.env.DESIGN_PREVIEW_URL || "http://127.0.0.1:5175";
const output = "outputs/accounting-account-verification";
await mkdir(output, { recursive: true });
const name = "اسم اختبار معزول طويل لقراءة بيانات المريض والطبيب والخدمة دون قص";
const header = { sectionCode: 15, trTy: 1, trNo: "999999", transactionDate: "2026-10-02", patientCode: "000999", patientName: name, total: 1200, discount: 100, paidValue: 1100, enteredBy: "999" };
const line = { ...header, serviceCode: "1600", serviceName: name, doctorCode: "900", doctorName: name, quantity: 2, price: 1200, discountValue: 100, paidValue: 1100, companyValue: 0, entryDate: "2026-10-02", lineNo: 1 };
const total = { totalGross: 1200, totalPaid: 1100, totalDiscount: 100, rowCount: 1 };
const revenue = { sections: [{ sectionCode: 15, sectionName: name, subtotal: total, services: [{ serviceCode: "1600", serviceName: name, ...total, details: [] }] }], grandTotal: total };
const patient = { patientCode: "000999", patientName: name, receipts: [header], services: [line], totals: { totalReceipts: 1, totalServices: 1, totalGross: 1200, totalDiscount: 100, totalPaid: 1100, totalPatientAmount: 1100, totalCompanyAmount: 0, lastTransactionDate: "2026-10-02" } };
const cost = { period: "month", fromDate: "", toDate: "", revenue: { totalGross: 1200, totalDiscount: 100, netAfterDiscount: 1100, totalPaid: 1100, serviceRows: 1, operationCount: 2 }, expenses: { cashbookExpense: 700, excludedExpense: 100, includedRows: 1, excludedRows: 1 }, stock: { stockValue: 100, itemCount: 1, unpricedItemCount: 0 }, cost: { totalCost: 600, costPerOperation: 300, profitOnPaid: 500, profitPerOperation: 250 } };
const views = [
  { slug: "patients", title: "استعلام المرضى والإيصالات", query: "receiptsInquiry", empty: [] },
  { slug: "patient/000999", title: "حساب مريض", query: "patientLasikSummary", empty: { ...patient, receipts: [], services: [] } },
  { slug: "doctor/900", title: "حساب طبيب", query: "serviceRevenue", empty: { sections: [], grandTotal: { ...total, rowCount: 0 } } },
  { slug: "lasik-cost", title: "تكلفة الليزك", query: "lasikCostSummary", empty: null },
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
        const args = input[index]?.json ?? input.json;
        requests.push({ method, input: args });
        if (method === failed) return { error: { json: { message: "Isolated test failure", code: -32603, data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 } } } };
        const view = views.find(view => method === "accounting." + view.query);
        const data = method === empty ? view?.empty
          : method === "auth.me" ? { id: 999999, role: "admin", name: "اختبار التصميم" }
          : method === "accounting.receiptsInquiry" ? [header]
          : method === "accounting.patientLasikSummary" ? patient
          : method === "accounting.serviceRevenue" ? revenue
          : method === "accounting.receiptDetail" ? { header, lines: [line] }
          : method === "accounting.lasikCostSummary" ? { ...cost, fromDate: args.fromDate, toDate: args.toDate }
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
      assert.equal(await page.locator('.accounting-report [data-slot="card"]').first().evaluate(node => getComputedStyle(node).borderInlineStartWidth), "0px");
      if (view.query === "patientLasikSummary") assert.ok(requests.some(r => r.method === "accounting.patientLasikSummary" && r.input?.patientCode === "000999"));
      if (view.query === "serviceRevenue") assert.ok(requests.some(r => r.method === "accounting.serviceRevenue" && r.input?.doctorCodes?.includes("900")));
      if (view.query === "lasikCostSummary") {
        await page.getByRole("button", { name: "٣ شهور", exact: true }).click();
        assert.equal(await page.getByRole("button", { name: "٣ شهور", exact: true }).getAttribute("aria-pressed"), "true");
        await page.getByRole("tab", { name: "الربحية", exact: true }).click();
        await page.getByText("صافي ربح النشاط:", { exact: true }).waitFor();
        await page.waitForTimeout(200);
        assert.ok(requests.some(r => r.method === "accounting.lasikCostSummary" && r.input?.period === "quarter"));
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
        await page.getByRole("button", { name: "إعادة المحاولة", exact: true }).click();
        await page.locator(".accounting-report table tbody tr").last().waitFor();
        empty = "accounting." + view.query;
        await page.reload();
        await page.locator(".accounting-report").getByText(/لا توجد/).last().waitFor();
        empty = "";
        states = "loading, error, retry, empty PASS";
      }
      assert.deepEqual(errors, []); assert.deepEqual(mutations, []);
      results.push({ view: view.slug, theme, width, states, overflow: false, writes: 0 });
      await writeFile(output + "/results.json", JSON.stringify(results, null, 2));
      console.log(JSON.stringify(results.at(-1)));
    }
    if (width === 1440) {
      await page.goto(base + "/accounting/patients");
      const row = page.locator(".accounting-report tbody tr").last();
      await row.waitFor(); await row.focus(); await page.keyboard.press("Enter");
      await page.locator(".accounting-report h1").getByText("تفاصيل الإيصال").waitFor();
      await page.getByRole("button", { name: "طباعة الإيصال", exact: true }).click();
      await page.locator("[data-accounting-print-root] tbody tr").first().waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: output + "/receipt-preview-" + theme + ".png", fullPage: true });
      await page.emulateMedia({ media: "print" });
      await page.screenshot({ path: output + "/receipt-print-" + theme + ".png", fullPage: true });
      const bytes = await page.pdf({ path: output + "/receipt-" + theme + ".pdf", preferCSSPageSize: true, printBackground: true });
      const pdf = await PDFDocument.load(bytes);
      assert.equal(pdf.getPageCount(), 1);
      const size = pdf.getPage(0).getSize();
      assert.ok(Math.abs(size.width - 595.28) < 2 && Math.abs(size.height - 841.89) < 2);
      assert.ok(bytes.length > 10000);
      await page.emulateMedia({ media: "screen" });
      await page.goto(base + "/accounting/print");
      await page.getByRole("alert").getByText("لا توجد بيانات للمعاينة.", { exact: true }).waitFor();
      assert.deepEqual(errors, []); assert.deepEqual(mutations, []);
      await writeFile(output + "/print-" + theme + ".json", JSON.stringify({ receiptNavigation: "keyboard PASS", receiptPdf: "one A4 page PASS", missingPayload: "PASS", writes: 0 }, null, 2));
    }
    await context.close();
  }
} finally { await browser.close(); }
