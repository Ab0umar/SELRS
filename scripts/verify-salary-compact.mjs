import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { inspectLayout } from './lib/layout-scan.mjs';
const output = 'outputs/salary-compact';
await mkdir(output, { recursive: true });
const employee = { empCd: 'TEST001', fullName: 'موظف اختبار إعدادات المرتبات ذو الاسم الطويل', empName: 'موظف اختبار إعدادات المرتبات ذو الاسم الطويل', department: 'مركز', active: true };
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || 'C:/Users/SELRS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
try {
  for (const theme of ['light', 'dark']) for (const width of [320, 390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(value => localStorage.setItem('theme', value), theme);
    await page.route('**/api/**', async route => {
      assert.equal(route.request().method(), 'GET', 'Do not write financial data');
      const url = new URL(route.request().url());
      const responses = (url.pathname.split('/api/trpc/')[1]?.split(',') || []).map(method => ({ result: { data: { json:
        method === 'auth.me' ? { id: 999999, role: 'admin', name: 'اختبار المرتبات' }
        : method === 'salary.listEmployees' ? [employee]
        : method === 'salary.listLateDays' ? [{ ...employee, workDate: '2026-09-01', lateMinutes: 35 }, { ...employee, workDate: '2026-09-02', lateMinutes: 15 }]
        : method.includes('getSystemSetting') ? null : []
      } } }));
      await route.fulfill({ json: url.searchParams.has('batch') ? responses : responses[0] || {} });
    });
    for (const kind of ['settings', 'penalties']) {
      await page.goto(`${process.env.DESIGN_PREVIEW_URL || 'http://127.0.0.1:5186'}/salary/${kind}`);
      if (kind === 'settings') {
        await page.getByRole('tab', { name: 'إعدادات الموظفين الخاصة', exact: true }).click();
        await page.locator('.salary-employee-settings-table tbody tr').first().waitFor();
        await page.locator('.salary-employee-settings-table').scrollIntoViewIfNeeded();
        if (width < 640) {
          const bounds = await page.locator('.salary-employee-settings-table').evaluate(table => ({ width: table.clientWidth, scroll: table.scrollWidth, parent: table.parentElement.clientWidth, style: getComputedStyle(table).width, cells: [...table.querySelectorAll('tbody td')].map(cell => ({ width: cell.clientWidth, scroll: cell.scrollWidth, whiteSpace: getComputedStyle(cell).whiteSpace, display: getComputedStyle(cell).display })) }));
          assert.equal(bounds.scroll <= bounds.parent + 1, true, `Mobile settings must fit without horizontal scrolling: ${JSON.stringify(bounds)}`);
          const cells = await page.locator('.salary-employee-settings-table tbody td').evaluateAll(nodes => nodes.map(node => ({ text: node.innerText.slice(0, 50), x: node.getBoundingClientRect().x, width: node.getBoundingClientRect().width, visibility: getComputedStyle(node).visibility })));
          assert(cells.every(cell => cell.x >= 0 && cell.x + cell.width <= width + 1 && cell.visibility === 'visible'), `Settings cells must stay visible: ${JSON.stringify(cells)}`);
        }
      } else {
        await page.getByRole('button', { name: 'تأخيرات', exact: true }).click();
        const row = page.getByRole('button', { name: `${employee.empName}، تفاصيل التأخيرات`, exact: true });
        await row.click();
        await page.getByRole('table', { name: 'أيام التأخير' }).waitFor();
        await row.scrollIntoViewIfNeeded();
      }
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);
      const layout = await inspectLayout(page);
      assert.equal(layout.overflow, false, `${kind} ${width}: overflow`);
      assert.deepEqual(layout.collisions, [], `${kind} ${width}: text overlaps`);
      assert.deepEqual(layout.fieldCollisions, [], `${kind} ${width}: field overlaps`);
      assert.deepEqual(layout.clippedButtons, [], `${kind} ${width}: clipped controls`);
      assert.deepEqual(errors, []);
      await page.screenshot({ path: `${output}/${kind}-${theme}-${width}.png`, fullPage: true });
    }
    await page.close();
  }
  console.log('16 populated salary layout cases passed. Employee settings and expanded late details; no writes.');
} finally { await browser.close(); }
