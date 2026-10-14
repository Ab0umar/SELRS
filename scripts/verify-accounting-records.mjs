import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { inspectLayout } from './lib/layout-scan.mjs';
const output = 'outputs/accounting-records';
await mkdir(output, { recursive: true });
const name = 'مريض تجريبي باسم طويل للتحقق من التفاف النص داخل الصف المدمج';
const receipt = { sectionCode: 15, trTy: 1, trNo: '999999', patientCode: '999999', patientName: name, transactionDate: '2026-10-13', total: 123456.75, discount: 50, paidValue: 123406.75, enteredBy: 'اختبار' };
const line = { ...receipt, lineNo: 1, serviceCode: '1586', serviceName: 'خدمة تجريبية باسم طويل', quantity: 2, price: 123456.75, discountValue: 50, paidValue: 123406.75, companyValue: 0, entryDate: '2026-10-13' };
const daily = { date: '2026-10-13', totalReceipts: 2, totalGross: 123456.75, totalDiscount: 50, totalCash: 123406.75, totalPaid: 123406.75, netAfterDiscount: 123406.75 };
const totals = { totalGross: 123456.75, totalDiscount: 50, totalPaid: 123406.75, rowCount: 2 };
const fixtures = {
  'accounting.dashboardSummary': { totalRevenueToday: 123456.75, totalReceiptsToday: 2, totalRevenueThisMonth: 123456.75, totalReceiptsThisMonth: 2 },
  'accounting.accLedgerSummary': { totalIncome: 123456.75, totalExpense: 50, currentBalance: 123406.75 },
  'accounting.transactions': [receipt, { ...receipt, trNo: '999998' }],
  'accounting.receiptsInquiry': [receipt, { ...receipt, trNo: '999998' }],
  'accounting.receiptDetail': { header: receipt, lines: [line, { ...line, lineNo: 2, serviceCode: '1502' }], totals },
  'accounting.lasikServices': [line, { ...line, serviceCode: '1502' }],
  'accounting.dailyRevenue': { rows: [daily], totals: daily },
  'accounting.accLedger': { rows: [{ id: 999991, txDate: '2026-10-13', notes: name, income: 123456.75, expense: 50, balance: 123406.75 }], total: 1 },
  'accounting.serviceEntryCatalog': { doctors: [], services: [] },
  'accounting.serviceRevenue': { sections: [{ sectionCode: 15, sectionName: 'المركز', subtotal: totals, services: [{ serviceCode: '1586', serviceName: line.serviceName, ...totals, details: [{ trNo: receipt.trNo, trDate: '2026-10-13', patientCode: receipt.patientCode, patientName: name, quantity: 2, price: 123456.75, patientShare: 123406.75, discount: 50, patientTotal: 123406.75, companyTotal: 0 }] }] }], grandTotal: totals },
};
const paths = ['/accounting', '/accounting/cashbook', '/accounting/daily-revenue', '/accounting/service-revenue', '/accounting/services', '/accounting/receipts', '/accounting/patients-inquiry', '/accounting/receipts/15/1/999999'];
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || 'C:/Users/SELRS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
let count = 0;
try {
  for (const theme of ['light', 'dark']) for (const width of [320, 390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(value => localStorage.setItem('theme', value), theme);
    await page.route('**/api/**', async route => {
      assert.equal(route.request().method(), 'GET', 'Do not write financial data');
      const url = new URL(route.request().url());
      const responses = (url.pathname.split('/api/trpc/')[1]?.split(',') || []).map(method => ({ result: { data: { json: method === 'auth.me' ? { id: 999999, role: 'admin', name: 'اختبار' } : method.includes('getSystemSetting') ? null : fixtures[method] || [] } } }));
      await route.fulfill({ json: url.searchParams.has('batch') ? responses : responses[0] || {} });
    });
    const check = async route => {
      const layout = await inspectLayout(page);
      assert.equal(layout.overflow, false, route);
      assert.deepEqual(layout.collisions, [], `${route}: text overlaps`);
      assert.deepEqual(layout.fieldCollisions, [], `${route}: field overlaps`);
      assert.deepEqual(layout.clippedButtons, [], `${route}: clipped controls`);
      assert.deepEqual(errors, [], route);
    };
    let frameWidth;
    let recordWidth;
    let recordParents;
    for (const route of paths) {
      await page.goto(`${process.env.DESIGN_PREVIEW_URL || 'http://127.0.0.1:5186'}${route}`);
      await page.locator('[data-operational-module="accounting"] #module-content').waitFor();
      await page.waitForTimeout(500);
      await page.evaluate(() => document.fonts.ready);
      const frame = await page.locator('#module-content').boundingBox();
      if (frameWidth === undefined) frameWidth = frame.width;
      assert(Math.abs(frame.width - frameWidth) <= 1, `${route}: inconsistent content width`);
      assert.equal(await page.getByText('An Unexpected Error Occurred.', { exact: true }).count(), 0, route);
      await check(route);
      const record = page.locator('.accounting-compact-record:visible').first();
      if (width < 640 && route !== '/accounting') {
        await record.waitFor();
        await record.scrollIntoViewIfNeeded();
        const bounds = await record.boundingBox();
        if (recordWidth === undefined) recordWidth = bounds.width;
        const parents = await record.evaluate(node => { const result = []; for (let p = node.parentElement; p && result.length < 6; p = p.parentElement) { const css = getComputedStyle(p); result.push({ class: p.className, width: p.getBoundingClientRect().width, padding: css.padding, margin: css.margin }); } return result; });
        if (recordParents === undefined) recordParents = parents;
        assert(Math.abs(bounds.width - recordWidth) <= 1, `${route}: inconsistent record width (${bounds.width} vs ${recordWidth}): ${JSON.stringify({ previous: recordParents, current: parents })}`);
        const summary = record.locator(':scope > .accounting-record-summary');
        assert.equal(await summary.getAttribute('aria-expanded'), 'false');
        await summary.click();
        assert.equal(await summary.getAttribute('aria-expanded'), 'true');
        await record.locator(':scope > .accounting-record-details').waitFor();
        await check(route);
        await page.screenshot({ path: `${output}/${route.replaceAll('/', '_')}-${theme}-${width}.png`, fullPage: true });
        await summary.click();
        assert.equal(await summary.getAttribute('aria-expanded'), 'false');
      } else await page.screenshot({ path: `${output}/${route.replaceAll('/', '_')}-${theme}-${width}.png`, fullPage: true });
      count++;
    }
    await page.close();
  }
  console.log(`Passed ${count} accounting route/theme/viewport cases: equal content widths, populated records, disclosure states and text geometry. No financial writes.`);
} finally { await browser.close(); }
