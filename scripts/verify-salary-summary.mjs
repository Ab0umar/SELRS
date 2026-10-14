import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { inspectLayout } from './lib/layout-scan.mjs';

await mkdir('outputs/salary-summary', { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Users/SELRS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
let cases = 0;
try {
  for (const theme of ['light', 'dark']) for (const width of [320, 390, 768, 1440]) for (const state of ['empty', 'populated', 'error']) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    await page.addInitScript(theme => localStorage.setItem('theme', theme), theme);
    await page.route('**/api/**', async route => {
      assert.equal(route.request().method(), 'GET', 'Summary verification must not write payroll data');
      const url = new URL(route.request().url());
      const responses = (url.pathname.split('/api/trpc/')[1]?.split(',') || []).map(method => {
        if (method === 'salary.monthSummary' && state === 'error') return { error: { json: { message: 'Summary unavailable', code: -32603, data: { code: 'INTERNAL_SERVER_ERROR', httpStatus: 500 } } } };
        const section = { totalPay: state === 'empty' ? 0 : 123456.75, totalCommissions: 12500, totalPenalties: 500, staffCount: state === 'empty' ? 0 : 23, finalCount: 5 };
        return { result: { data: { json: method === 'auth.me' ? { id: 999999, role: 'admin', name: 'اختبار' } : method === 'salary.monthSummary' ? { ...section, center: section, clinic: section } : method.includes('getSystemSetting') ? null : [] } } };
      });
      await route.fulfill({ json: url.searchParams.has('batch') ? responses : responses[0] });
    });
    await page.goto(`${process.env.DESIGN_PREVIEW_URL || 'http://127.0.0.1:5186'}/salary`);
    await page.locator('.salary-home-status').getByText(state === 'error' ? 'تعذر تحميل ملخص الشهر' : state === 'empty' ? 'لا يوجد موظفون في كشف هذا الشهر' : 'الكشف مسودة', { exact: true }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    const layout = await inspectLayout(page);
    assert.equal(layout.overflow, false, `${width} ${state}: overflow`);
    assert.deepEqual(layout.collisions, [], `${width} ${state}: text overlap`);
    assert.deepEqual(layout.clippedButtons, [], `${width} ${state}: clipped controls`);
    for (const pane of await page.locator('.salary-home-pane').all()) {
      const box = await pane.boundingBox();
      assert(box.height <= (state === 'populated' ? 230 : 200), `${width} ${state}: oversized summary ${box.height}px ${JSON.stringify(await pane.evaluate(node => [...node.children].map(child => ({ text: child.textContent, height: child.getBoundingClientRect().height, css: getComputedStyle(child).gridColumn }))))}`);
    }
    await page.screenshot({ path: `outputs/salary-summary/${theme}-${width}-${state}.png`, fullPage: true });
    await page.close();
    cases++;
  }
} finally { await browser.close(); }
console.log(`Passed ${cases} salary summary theme/viewport/state cases. No financial writes.`);
