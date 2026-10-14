import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { inspectLayout } from './lib/layout-scan.mjs';
const output = 'outputs/deduction-tabs';
await mkdir(output, { recursive: true });
const employee = { empCd: 'TEST001', empName: 'موظف اختبار الخصومات ذو الاسم الطويل', fullName: 'موظف اختبار الخصومات ذو الاسم الطويل', department: 'مركز' };
const event = { ...employee, workDate: '2026-09-01', lateMinutes: 35, earlyLeaveMin: 15 };
const record = { ...employee, id: 999991, amount: 100, penaltyDays: 1, penaltyDate: '2026-09-01', reason: 'سبب تجريبي طويل للتحقق من التفاف النص دون تداخل مع الأزرار', effectiveFrom: '2026-01-01', insuranceDeduction: 50 };
const fixtures = {
  'salary.listPenalties': [record], 'salary.listAdvances': [record], 'salary.getAbsentDays': [event],
  'salary.listLateDays': [event], 'salary.listEarlyLeaveDays': [event], 'salary.listMissingCheckoutDays': [event],
  'salary.listBasics': [record], 'salary.getPayroll': [{ ...record, netBasic: 1000, salaryType: 'موظف', totalDeductions: 100, netSalary: 900 }],
  'salary.getShiftSchedule': { attendance: [], staff: [] },
};
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || 'C:/Users/SELRS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
let count = 0;
try {
  for (const theme of ['light', 'dark']) for (const width of [320, 390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    let empty = false;
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(value => localStorage.setItem('theme', value), theme);
    await page.route('**/api/**', async route => {
      assert.equal(route.request().method(), 'GET', 'No financial writes during verification');
      const url = new URL(route.request().url());
      const responses = (url.pathname.split('/api/trpc/')[1]?.split(',') || []).map(method => ({ result: { data: { json:
        method === 'auth.me' ? { id: 999999, role: 'admin', name: 'اختبار' }
        : method === 'salary.listEmployees' ? [employee]
        : method.includes('getSystemSetting') ? null
        : empty && Array.isArray(fixtures[method]) ? [] : fixtures[method] || []
      } } }));
      await route.fulfill({ json: url.searchParams.has('batch') ? responses : responses[0] || {} });
    });
    const check = async name => {
      await page.evaluate(() => document.fonts.ready);
      const layout = await inspectLayout(page);
      assert.equal(layout.overflow, false, name);
      assert.deepEqual(layout.collisions, [], `${name}: text overlaps`);
      assert.deepEqual(layout.fieldCollisions, [], `${name}: field overlaps`);
      assert.deepEqual(layout.clippedButtons, [], `${name}: clipped controls`);
      assert.deepEqual(errors, [], name);
      await page.screenshot({ path: `${output}/${name}-${theme}-${width}.png`, fullPage: true });
      count++;
    };
    for (const isEmpty of [false, true]) {
      empty = isEmpty;
      await page.goto(`${process.env.DESIGN_PREVIEW_URL || 'http://127.0.0.1:5186'}/salary/penalties`);
      await page.locator('.salary-penalty-tabs').waitFor();
      for (const tab of ['جزاءات', 'سلف', 'الغياب', 'تأخيرات', 'خروج مبكر', 'بصمة واحدة', 'تأمينات']) {
        const button = page.locator('.salary-penalty-tabs').getByRole('button', { name: tab, exact: true });
        await button.click();
        await page.waitForTimeout(300);
        const row = page.locator('.salary-compact-penalties [role="button"][aria-expanded]').first();
        if (!isEmpty) { await row.waitFor(); if (await row.getAttribute('aria-expanded') !== 'true') await row.click(); await row.scrollIntoViewIfNeeded(); }
        else assert.equal(await row.count(), 0, `${tab}: empty rows`);
        await check(`${isEmpty ? 'empty' : 'filled'}-${tab}`);
      }
    }
    empty = false;
    await page.goto(`${process.env.DESIGN_PREVIEW_URL || 'http://127.0.0.1:5186'}/salary/payroll`);
    await page.getByRole('tablist', { name: 'أقسام كشف الشهر' }).waitFor();
    for (const tab of ['الرواتب', 'الشفتات', 'مكافأة الإشراف']) {
      await page.getByRole('tab', { name: tab, exact: true }).click();
      await check(`payroll-${tab}`);
    }
    await page.close();
  }
  console.log(`Passed ${count} populated/empty deduction and payroll tab cases. No financial writes.`);
} finally { await browser.close(); }
