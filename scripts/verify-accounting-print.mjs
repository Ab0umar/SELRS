import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

const base = process.env.DESIGN_PREVIEW_URL || "http://127.0.0.1:5175";
const output = "outputs/accounting-print-verification";
await mkdir(output, { recursive: true });
const name = "بيان اختبار معزول طويل للتحقق من التفاف النص داخل تقارير الحسابات متعددة الصفحات";
const daily = { date: "2026-10-02", totalReceipts: 1, totalGross: 1200, totalDiscount: 100, totalCash: 1100, totalPaid: 1100, netAfterDiscount: 1100 };
const detail = { trNo: "999999", trDate: "2026-10-02", patientCode: "000999", patientName: name, quantity: 2, price: 1200, patientShare: 1100, discount: 100, patientTotal: 1100, companyTotal: 0 };
const total = { totalGross: 1200, totalDiscount: 100, totalPaid: 1100, rowCount: 1 };
const views = [
  { slug: "daily-revenue", query: "dailyRevenue", printClass: "print-daily-revenue" },
  { slug: "service-revenue", query: "serviceRevenue", printClass: "print-service-revenue" },
];
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const results = [];
try {
  for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(theme => localStorage.setItem("theme", theme), theme);
    const page = await context.newPage();
    const errors = [], mutations = [];
    let mode = "single", failed = "";
    page.on("pageerror", e => errors.push(e.message));
    await page.route("**/api/**", async route => {
      if (route.request().method() !== "GET") { mutations.push(route.request().url()); await route.abort(); return; }
      const url = new URL(route.request().url());
      const methods = url.pathname.split("/api/trpc/")[1]?.split(",") ?? [];
      const count = mode === "long" ? 80 : mode === "empty" ? 0 : 1;
      const responses = methods.map(method => {
        if (method === failed) return { error: { json: { message: "Isolated failure", code: -32603, data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 } } } };
        const data = method === "auth.me" ? { id: 999999, role: "admin", name: "اختبار التصميم" }
          : method === "accounting.dailyRevenue" ? { rows: Array.from({ length: count }, (_, i) => ({ ...daily, date: new Date(Date.UTC(2026, 6, 1 + i)).toISOString().slice(0, 10) })), totals: Object.fromEntries(Object.entries(daily).filter(([k]) => k !== "date").map(([k, v]) => [k, v * count])) }
          : method === "accounting.serviceRevenue" ? { sections: count ? [{ sectionCode: 15, sectionName: name, subtotal: { ...total, rowCount: count }, services: [{ serviceCode: "1600", serviceName: name, ...total, rowCount: count, details: Array.from({ length: count }, (_, i) => ({ ...detail, trNo: String(999000 + i) })) }] }] : [], grandTotal: { ...total, rowCount: count } }
          : method === "accounting.serviceEntryCatalog" ? { doctors: [], services: [] }
          : method === "accounting.dashboardSummary" ? { totalRevenueToday: 1200, totalReceiptsToday: 1 }
          : method === "accounting.accLedgerSummary" ? { totalIncome: 1200, totalExpense: 100, currentBalance: 1100 } : [];
        return { result: { data: { json: data } } };
      });
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(url.searchParams.has("batch") ? responses : responses[0]) });
    });
    async function recordPdf(id, expectedMulti) {
      await page.screenshot({ path: output + "/" + id + ".png", fullPage: true });
      const bytes = await page.pdf({ path: output + "/" + id + ".pdf", preferCSSPageSize: true, printBackground: true });
      const pdf = await PDFDocument.load(bytes);
      assert.ok(bytes.length > 10000, id + " PDF content");
      assert.ok(expectedMulti ? pdf.getPageCount() > 1 : pdf.getPageCount() === 1, id + " pagination: " + pdf.getPageCount());
      for (const p of pdf.getPages()) {
        const size = p.getSize();
        assert.ok(Math.abs(size.width - 595.28) < 2 && Math.abs(size.height - 841.89) < 2, id + " A4");
      }
      results.push({ id, pages: pdf.getPageCount(), format: "A4", writes: 0 });
      await writeFile(output + "/results.json", JSON.stringify(results, null, 2));
      console.log(JSON.stringify(results.at(-1)));
    }
    for (const view of views) for (const length of ["single", "long"]) {
      mode = length;
      await page.goto(base + "/accounting/" + view.slug);
      const print = page.locator('button[aria-label="طباعة"]');
      await print.waitFor();
      await page.waitForFunction(() => !document.querySelector('button[aria-label="طباعة"]').disabled);
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => {
        window.__printCalls = 0;
        window.print = () => {
          window.__printCalls++;
          const timeout = window.setTimeout;
          window.setTimeout = (callback, delay, ...args) => {
            window.setTimeout = timeout;
            // Browser print blocks until dismissal; hold cleanup during PDF capture.
            if (delay === 1000) return 0;
            return timeout(callback, delay, ...args);
          };
        };
      });
      await print.click();
      assert.equal(await page.evaluate(() => window.__printCalls), 1);
      assert.ok(await page.evaluate(cls => document.body.classList.contains(cls), view.printClass));
      await page.emulateMedia({ media: "print" });
      // Hold the existing print scope after its browser-dialog cleanup timeout.
      await page.evaluate(cls => document.body.classList.add(cls), view.printClass);
      await recordPdf(view.slug + "-" + length + "-" + theme, length === "long");
      await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
      assert.ok(await page.evaluate(cls => !document.body.classList.contains(cls), view.printClass));
      await page.emulateMedia({ media: "screen" });
      mode = "empty";
      await page.reload();
      await page.locator(".accounting-report").getByText(/لا توجد بيانات/).last().waitFor();
      assert.ok(await print.isDisabled());
      failed = "accounting." + view.query;
      mode = "single";
      await page.reload();
      await page.locator(".accounting-report").getByRole("alert").waitFor({ timeout: 30000 });
      assert.ok(await print.isDisabled());
      failed = "";
    }
    for (const groups of [[], ["service"], ["doctor", "service"]]) {
      await page.goto(base + "/accounting");
      const payload = { title: "تقرير اختبار معزول متعدد الصفحات", meta: { clinicName: "SRV100", fromDate: "2026-07-01", toDate: "2026-10-02" }, groupBy: groups,
        columns: [{ key: "doctorName", label: "الطبيب" }, { key: "serviceName", label: "الخدمة" }, { key: "patientName", label: "المريض" }, { key: "price", label: "المبلغ", align: "right" }],
        rows: Array.from({ length: 100 }, (_, i) => ({ doctorCode: String(900 + Math.floor(i / 50)), doctorName: name, serviceCode: String(1600 + Math.floor(i / 25)), serviceName: name, patientName: name, price: 1200 })),
        totals: [{ label: "الإجمالي", values: { price: 120000 } }] };
      await page.evaluate(payload => sessionStorage.setItem("isolated-print", JSON.stringify(payload)), payload);
      await page.goto(base + "/accounting/print?payloadId=isolated-print");
      await page.locator("[data-accounting-print-root] tbody tr").last().waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.emulateMedia({ media: "print" });
      await recordPdf("preview-" + (groups.join("-") || "plain") + "-" + theme, true);
      await page.emulateMedia({ media: "screen" });
    }
    assert.deepEqual(errors, []); assert.deepEqual(mutations, []);
    await context.close();
  }
} finally { await browser.close(); }
