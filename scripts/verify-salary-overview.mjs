import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
const output = 'outputs/salary-overview';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
let cases = 0;
try {
  for (const theme of ['light', 'dark']) for (const width of [320, 360, 768, 1024, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    await context.addInitScript(theme => localStorage.setItem('theme', theme), theme);
    const page = await context.newPage();
    const errors = [], queries = [];
    let state = 'populated';
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', async route => {
      assert.equal(route.request().method(), 'GET', 'Salary overview must not write financial data');
      const url = new URL(route.request().url());
      if (url.pathname.includes('salary.monthSummary')) queries.push(url.searchParams.get('input'));
      const responses = (url.pathname.split('/api/trpc/')[1]?.split(',') ?? []).map(method => {
        if (method === 'salary.monthSummary' && state === 'error') return { error: { json: { message: 'Fixture failure', code: -32603, data: { code: 'INTERNAL_SERVER_ERROR', httpStatus: 500 } } } };
        return { result: { data: { json: method === 'auth.me' ? { id: 999999, role: 'admin', name: 'اختبار الرواتب' }
          : method === 'salary.monthSummary' ? { staffCount: state === 'empty' ? 0 : 15, finalCount: state === 'final' ? 15 : 3, center: { staffCount: state === 'empty' ? 0 : 10, finalCount: state === 'final' ? 10 : 2, totalPay: 83421.75, totalCommissions: 12421.5, totalPenalties: 875.25 }, clinic: { staffCount: state === 'empty' ? 0 : 5, finalCount: state === 'final' ? 5 : 1, totalPay: 41578.25, totalCommissions: 2578.5, totalPenalties: 124.75 } }
          : method.includes('getSystemSetting') ? null : [] } } };
      });
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(url.searchParams.has('batch') ? responses : responses[0]) });
    });
    for (state of ['populated', 'final', 'empty', 'error']) {
      await page.goto(`${process.env.DESIGN_PREVIEW_URL || 'http://127.0.0.1:5177'}/salary`);
      await page.locator('.salary-home-focused').waitFor();
      if (state === 'error') await page.getByRole('button', { name: 'إعادة المحاولة', exact: true }).waitFor();
      else await page.getByText(state === 'empty' ? 'لا يوجد موظفون في كشف هذا الشهر' : state === 'final' ? 'الكشف معتمد نهائياً' : 'الكشف مسودة', { exact: true }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      assert.equal(await page.locator('a button').count(), 0);
      assert.equal(await page.locator('.salary-home-payroll').count(), 1);
      assert.equal(await page.locator('.salary-overview dd.rounded-full').count(), 0);
      assert.equal(await page.getByRole('heading', { name: 'ملخص الرواتب', exact: true }).isVisible(), true);
      const contrast = await page.evaluate(() => {
        const luminance = color => {
          const channels = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => {
            const channel = value / 255;
            return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
          });
          return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
        };
        return ['.salary-home-eyebrow', '.salary-home-net', '.salary-home-payroll', 'nav[aria-label="أقسام الوحدة"] a[aria-current="page"]'].map(selector => {
          const node = document.querySelector(selector);
          const foreground = getComputedStyle(node).color;
          let parent = node;
          let background = getComputedStyle(parent).backgroundColor;
          while (background === 'rgba(0, 0, 0, 0)' && parent.parentElement) {
            parent = parent.parentElement;
            background = getComputedStyle(parent).backgroundColor;
          }
          const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
          return { selector, ratio: (values[0] + 0.05) / (values[1] + 0.05) };
        });
      });
      assert(contrast.every(pair => pair.ratio >= 4.5), JSON.stringify(contrast));
      await page.locator('#salary-summary-month').focus();
      assert.equal(await page.locator('#salary-summary-month').evaluate(node => getComputedStyle(node).outlineStyle), 'solid');
      const placement = await page.locator('.salary-home-focused').evaluate(root => ({
        status: root.querySelector('section[aria-live]').getBoundingClientRect().top,
        totals: root.querySelector('.salary-home-ledger').getBoundingClientRect().top,
      }));
      assert(placement.status < placement.totals, 'Status must precede totals');
      const link = await page.locator('.salary-home-payroll').boundingBox();
      assert(link.y + link.height < 1000, 'Payroll action must appear in first viewport');
      await page.screenshot({ path: `${output}/${state}-${theme}-${width}.png`, fullPage: true });
      if (state === 'populated') {
        await page.getByLabel('الشهر', { exact: true }).fill('2026-08');
        await page.waitForFunction(() => document.querySelector('#salary-totals-center')?.textContent.includes('8/2026'));
        await page.waitForTimeout(250);
        assert.ok(queries.some(input => input?.includes('2026') && input.includes('8')));
      }
      if (state === 'error') {
        state = 'populated';
        await page.getByRole('button', { name: 'إعادة المحاولة', exact: true }).click();
        await page.getByText('الكشف مسودة', { exact: true }).waitFor();
      }
      cases++;
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
} finally { await browser.close(); }
console.log(`Passed ${cases} salary overview state/theme/viewport cases.`);
