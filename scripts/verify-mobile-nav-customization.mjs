import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const output = 'outputs/mobile-nav-customization';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
try {
  for (const theme of ['light', 'dark']) for (const width of [360, 390, 600]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addInitScript(theme => localStorage.setItem('theme', theme), theme);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', async route => {
      assert.equal(route.request().method(), 'GET', 'Customization must not write server data');
      const url = new URL(route.request().url());
      const responses = (url.pathname.split('/api/trpc/')[1]?.split(',') ?? []).map(method => ({ result: { data: { json:
        method === 'auth.me' ? { id: 999999, role: 'admin', name: 'اختبار التنقل' }
        : method === 'medical.getSystemSetting' ? null : []
      } } }));
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(url.searchParams.has('batch') ? responses : responses[0]) });
    });
    await page.goto(`${process.env.DESIGN_PREVIEW_URL || 'http://127.0.0.1:5176'}/sheets`);
    const nav = page.getByRole('navigation', { name: 'التنقل الرئيسي', exact: true });
    await nav.getByRole('button', { name: 'المزيد', exact: true }).click();
    await page.getByRole('button', { name: 'تخصيص شريط التنقل', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'تقديم الحسابات', exact: true }).click();
    await dialog.getByRole('button', { name: 'تقديم الحسابات', exact: true }).click();
    await dialog.getByRole('switch', { name: 'إظهار العمليات', exact: true }).click();
    await dialog.getByRole('switch', { name: 'إظهار المخزن', exact: true }).click();
    await page.screenshot({ path: `${output}/editor-${theme}-${width}.png`, fullPage: true });
    const keys = await page.evaluate(() => JSON.parse(localStorage.getItem('selrs:bottom-nav-admin')));
    assert.deepEqual(keys.slice(0, 3), ['dashboard', 'accounting', 'patients']);
    assert.equal(keys.includes('operations'), false);
    assert.equal(keys.includes('stockroom'), true);
    await page.reload();
    await nav.getByRole('button', { name: 'المزيد', exact: true }).waitFor();
    assert.deepEqual(await nav.getByRole('button').allTextContents(), ['لوحة التحكم', 'الحسابات', 'مركز المريض', 'المرتبات', 'المزيد']);
    await nav.getByRole('button', { name: 'المزيد', exact: true }).click();
    await page.getByRole('button', { name: 'تخصيص شريط التنقل', exact: true }).click();
    assert.equal(await page.getByRole('switch', { name: 'إظهار العمليات', exact: true }).isChecked(), false);
    assert.equal(await page.getByRole('switch', { name: 'إظهار المخزن', exact: true }).isChecked(), true);
    assert.deepEqual(errors, []);
    await context.close();
  }
} finally { await browser.close(); }
console.log('Passed 6 mobile navigation customization and reload cases.');
