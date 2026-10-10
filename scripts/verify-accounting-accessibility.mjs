import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const base = process.env.DESIGN_PREVIEW_URL || "http://127.0.0.1:5175";
const output = "outputs/accounting-accessibility-verification";
await mkdir(output, { recursive: true });
const name = "بيان اختبار معزول طويل للتحقق من عرض البيانات دون قص";
const row = { id: 999999, txDate: "2026-10-03", name, employee: name, notes: name, remarks: name, income: 1200, expense: 200, balance: 1000, total: 1000, inAmount: 500, outAmount: 200, withdrawals: 500, repayment: 100, advance: 500, amount: 500, remaining: 400, runningTotal: 400, category: "other", categoryLabel: "أخرى" };
const header = { sectionCode: 15, trTy: 1, trNo: "999999", transactionDate: "2026-10-03", patientCode: "000999", patientName: name, total: 1200, discount: 100, paidValue: 1100, enteredBy: "999" };
const line = { ...header, serviceCode: "1600", serviceName: name, doctorCode: "900", doctorName: name, quantity: 2, price: 1200, discountValue: 100, paidValue: 1100, companyValue: 0, entryDate: "2026-10-03", lineNo: 1 };
const total = { totalGross: 1200, totalDiscount: 100, totalPaid: 1100, rowCount: 1 };
const fixtures = {
  "auth.me": { id: 999999, role: "admin", name: "اختبار التصميم" },
  "accounting.accLedgerSummary": { totalIncome: 1200, totalExpense: 200, currentBalance: 1000 },
  "accounting.dashboardSummary": { totalRevenueToday: 1200, totalReceiptsToday: 1 },
  "accounting.accLedgerNavigator": [row],
  "accounting.accEmployeesList": [{ id: 999999, name }],
  "accounting.accReports": { advances: [{ employee: name, totalAdvance: 500, totalRepaid: 100, remaining: 400 }], loans: [{ name, totalLoan: 500, totalPaid: 100, remaining: 400 }], instapay: { totalIn: 500, totalOut: 200, net: 300 }, home: { totalIn: 500, totalOut: 200, net: 300 }, saadany: { totalWithdrawals: 500, totalRepaid: 100, remaining: 400 } },
  "accounting.accExpenses": { total: 1, rows: [row], totalExpense: 200 },
  "accounting.receiptsInquiry": [header],
  "accounting.receiptDetail": { header, lines: [line] },
  "accounting.lasikServices": [{ serviceCode: "1600", serviceName: name, quantity: 2, price: 1200 }],
  "accounting.serviceEntryCatalog": { doctors: [{ code: "900", name }], services: [{ code: "1600", name, price: 600 }] },
  "accounting.dailyRevenue": { rows: [{ date: "2026-10-03", totalReceipts: 1, totalGross: 1200, totalDiscount: 100, totalCash: 1100, totalPaid: 1100, netAfterDiscount: 1100 }], totals: { totalReceipts: 1, totalGross: 1200, totalDiscount: 100, totalCash: 1100, totalPaid: 1100, netAfterDiscount: 1100 } },
  "accounting.serviceRevenue": { sections: [{ sectionCode: 15, sectionName: name, subtotal: total, services: [{ serviceCode: "1600", serviceName: name, ...total, details: [{ trNo: "999999", trDate: "2026-10-03", patientCode: "000999", patientName: name, quantity: 2, price: 1200, patientShare: 1100, discount: 100, patientTotal: 1100, companyTotal: 0 }] }] }], grandTotal: total },
  "accounting.patientLasikSummary": { patientCode: "000999", patientName: name, receipts: [header], services: [line], totals: { totalReceipts: 1, totalServices: 1, totalGross: 1200, totalDiscount: 100, totalPaid: 1100, totalPatientAmount: 1100, totalCompanyAmount: 0, lastTransactionDate: "2026-10-03" } },
};
for (const method of ["accLedger", "accAdvancesLedger", "accLoansLedger", "accInstapayLedger", "accHomeLedger", "accSaadanyLedger"]) fixtures["accounting." + method] = { total: 1, rows: [row] };
const slugs = ["", "cashbook", "daily-revenue", "service-revenue", "services", "receipts", "patients-inquiry", "patient/000999", "doctor-account", "doctor/900", "lasik-cost", "advances", "loans", "instapay", "home-fund", "dr-saadany", "expenses"];
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const results = [];
try {
  for (const theme of ["light", "dark"]) for (const zoom of [1, 2]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(({ theme, zoom }) => { localStorage.setItem("theme", theme); document.addEventListener("DOMContentLoaded", () => { document.documentElement.style.zoom = String(zoom); }); }, { theme, zoom });
    const page = await context.newPage();
    const errors = [], mutations = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.route("**/api/**", async route => {
      if (route.request().method() !== "GET") { mutations.push(route.request().url()); await route.abort(); return; }
      const url = new URL(route.request().url()), input = JSON.parse(url.searchParams.get("input") || "{}");
      const responses = (url.pathname.split("/api/trpc/")[1]?.split(",") ?? []).map((method, i) => {
        const args = input[i]?.json ?? input.json;
        const data = method === "accounting.lasikCostSummary" ? { period: args.period, fromDate: args.fromDate, toDate: args.toDate, revenue: { totalGross: 1200, totalDiscount: 100, netAfterDiscount: 1100, totalPaid: 1100, serviceRows: 1, operationCount: 2 }, expenses: { cashbookExpense: 700, excludedExpense: 100, includedRows: 1, excludedRows: 1 }, stock: { stockValue: 100, itemCount: 1, unpricedItemCount: 0 }, cost: { totalCost: 600, costPerOperation: 300, profitOnPaid: 500, profitPerOperation: 250 } } : fixtures[method] ?? [];
        return { result: { data: { json: data } } };
      });
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(url.searchParams.has("batch") ? responses : responses[0]) });
    });
    await page.goto(base + "/accounting");
    for (const slug of slugs.filter(slug => !process.env.ACCOUNTING_AUDIT_VIEWS || process.env.ACCOUNTING_AUDIT_VIEWS.split(",").includes(slug))) {
      const target = "/accounting" + (slug ? "/" + slug : "");
      const nav = page.getByRole("navigation", { name: "أقسام الوحدة" });
      const link = nav.locator('a[href="' + target + '"]');
      const option = nav.locator('option[value="' + target + '"]');
      let navigation = "direct detail route";
      if (await link.count()) { await link.focus(); await page.keyboard.press("Enter"); navigation = "keyboard link"; }
      else if (await option.count()) { await nav.getByRole("combobox").selectOption(target); navigation = "native select"; }
      else await page.goto(base + target);
      await page.waitForURL(url => url.pathname === target);
      await page.locator('[aria-label="أقسام الوحدة"]').waitFor();
      await page.waitForTimeout(350);
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.evaluate(() => Number(getComputedStyle(document.documentElement).zoom)), zoom);
      if (slug === "advances") {
        const sort = page.getByRole("button", { name: "ترتيب الحركات حسب التاريخ", exact: true });
        await sort.focus();
        await page.keyboard.press("Enter");
        assert.equal(await sort.locator("..").getAttribute("aria-sort"), "ascending");
        const count = page.getByText("١ حركة", { exact: true });
        assert.ok(await count.evaluate(node => node.scrollWidth <= node.clientWidth + 1), "Advance counter fit");
      }
      const audit = await page.evaluate(() => {
        const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1;
        const ctx = canvas.getContext("2d");
        function rgba(color) { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data]; }
        function lum(rgb) { const c = rgb.slice(0, 3).map(v => { const s = v / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4; }); return c[0] * .2126 + c[1] * .7152 + c[2] * .0722; }
        const failures = [], skipped = [];
        let measured = 0;
        const root = document.querySelector('[aria-label="أقسام الوحدة"]').parentElement;
        for (const node of root.querySelectorAll("h1,h2,h3,p,span,label,td,th,a,button")) {
          if (!node.textContent.trim() || [...node.children].some(child => child.textContent.trim())) continue;
          const rect = node.getBoundingClientRect(), style = getComputedStyle(node);
          if (!rect.width || !rect.height || style.visibility === "hidden" || node.closest("[disabled]")) continue;
          const ancestors = []; for (let el = node; el; el = el.parentElement) ancestors.push(el);
          if (ancestors.some(el => getComputedStyle(el).backgroundImage !== "none" || Number(getComputedStyle(el).opacity) < 1)) { skipped.push(node.textContent.trim().slice(0, 60)); continue; }
          let bg = [255, 255, 255];
          for (const el of ancestors.reverse()) { const c = rgba(getComputedStyle(el).backgroundColor), a = c[3] / 255; bg = bg.map((v, i) => c[i] * a + v * (1 - a)); }
          const c = rgba(style.color), a = c[3] / 255, fg = bg.map((v, i) => c[i] * a + v * (1 - a));
          const ratio = (Math.max(lum(fg), lum(bg)) + .05) / (Math.min(lum(fg), lum(bg)) + .05);
          const large = parseFloat(style.fontSize) >= 24 || parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 700;
          measured++;
          if (ratio < (large ? 3 : 4.5)) failures.push({ text: node.textContent.trim().slice(0, 80), ratio: Math.round(ratio * 100) / 100, className: node.className });
        }
        const componentFailures = [];
        let focusedControls = 0, borderedFields = 0;
        const ratio = (a, b) => (Math.max(lum(a), lum(b)) + .05) / (Math.min(lum(a), lum(b)) + .05);
        for (const node of root.querySelectorAll('button,a[href],input,select,textarea,[role="button"],[tabindex="0"]')) {
          const rect = node.getBoundingClientRect();
          if (!rect.width || !rect.height || node.matches(':disabled') || getComputedStyle(node).visibility === 'hidden') continue;
          node.focus({ preventScroll: true });
          const style = getComputedStyle(node);
          const background = rgba(style.getPropertyValue('--background'));
          if (document.activeElement !== node || parseFloat(style.outlineWidth) < 2 || style.outlineStyle === 'none' || ratio(rgba(style.outlineColor), background) < 3) {
            componentFailures.push({ kind: 'focus', name: node.getAttribute('aria-label') || node.textContent.trim().slice(0, 60) || node.id });
          }
          focusedControls++;
          if (node.matches('input:not([type="checkbox"]):not([type="radio"]),textarea,select') && !node.closest('nav')) {
            const fieldBackground = rgba(style.backgroundColor);
            const fieldRatio = ratio(rgba(style.borderTopColor), fieldBackground[3] ? fieldBackground : background);
            if (parseFloat(style.borderTopWidth) > 0) {
              borderedFields++;
              if (fieldRatio < 3) componentFailures.push({ kind: 'border', name: node.id || node.getAttribute('aria-label'), ratio: fieldRatio });
            }
          }
        }
        return { overflow: document.documentElement.scrollWidth > innerWidth + 1, measured, contrastFailures: failures, skipped, focusedControls, borderedFields, componentFailures };
      });
      await page.screenshot({ path: output + "/" + (slug.replaceAll("/", "-") || "ledger") + "-" + theme + "-zoom" + zoom + ".png", fullPage: true });
      results.push({ slug, theme, cssZoom: zoom, navigation, ...audit });
      await writeFile(output + (process.env.ACCOUNTING_AUDIT_VIEWS ? "/focused-results.json" : "/results.json"), JSON.stringify(results, null, 2));
      console.log(JSON.stringify({ slug, theme, zoom, overflow: audit.overflow, measured: audit.measured, failures: audit.contrastFailures.length }));
    }
    assert.deepEqual(errors, []); assert.deepEqual(mutations, []);
    await context.close();
  }
} finally { await browser.close(); }
assert.ok(results.every(r => !r.overflow && r.contrastFailures.length === 0 && r.componentFailures.length === 0), "See results.json for layout/contrast/focus failures");
