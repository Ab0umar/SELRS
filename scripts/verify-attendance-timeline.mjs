import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { inspectLayout } from './lib/layout-scan.mjs';

const base = process.env.DESIGN_PREVIEW_URL || 'http://127.0.0.1:5185';
const output = 'outputs/attendance-timeline';
await mkdir(output, { recursive: true });
const rows = [
  { empCd: '11', empName: 'داليا الغراب', status: 'present', firstIn: '2026-10-13T08:43:00', lastOut: '2026-10-13T15:08:00', lateMinutes: 0 },
  { empCd: '13', empName: 'مصطفى طه', status: 'missing_checkout', firstIn: null, lastOut: '2026-10-13T18:57:00' },
  { empCd: '18', empName: 'موظف تجريبي باسم طويل لاختبار التفاف النص في سجل الحضور اليومي', status: 'present', firstIn: '2026-10-13T09:02:00', lastOut: '2026-10-13T15:09:00', lateMinutes: 15 },
  { empCd: '19', empName: 'عصام', status: 'partial', firstIn: '2026-10-13T08:55:00', lastOut: null },
  { empCd: '24', empName: 'أحمد محمد', status: 'leave', firstIn: null, lastOut: null },
  { empCd: '28', empName: 'موظف غائب', status: 'absent', firstIn: null, lastOut: null },
];
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || 'C:/Users/SELRS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
try {
  for (const theme of ['light', 'dark']) for (const width of [320, 390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, isMobile: width < 768, hasTouch: width < 1100 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(value => localStorage.setItem('theme', value), theme);
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url());
      const methods = url.pathname.split('/api/trpc/')[1]?.split(',') || [];
      assert.equal(route.request().method(), 'GET', 'Timeline verification must not write');
      const data = methods.map(method => ({ result: { data: { json:
        method === 'auth.me' ? { id: 999999, role: 'admin', name: 'اختبار الحضور' }
        : method === 'attendance.dailyByDate' ? rows
        : method === 'attendance.dashboardSummary' ? { bySection: { center: {}, clinic: {} } }
        : []
      } } }));
      await route.fulfill({ json: url.searchParams.has('batch') ? data : data[0] || {} });
    });
    await page.goto(`${base}/attendance`);
    const register = page.locator('.attendance-today-register');
    await register.locator('.attendance-timeline-entry').first().waitFor();
    assert.equal(await register.locator('.attendance-timeline-entry').count(), 6);
    for (const key of ['complete', 'review', 'other']) {
      assert.equal(await register.locator(`#today-register-${key}`).locator('..').locator('li').count(), 2);
    }
    await page.evaluate(() => document.fonts.ready);
    await register.scrollIntoViewIfNeeded();
    const layout = await inspectLayout(page);
    assert.equal(layout.overflow, false);
    assert.deepEqual(layout.collisions, []);
    assert.deepEqual(layout.fieldCollisions, []);
    assert.deepEqual(layout.clippedButtons, []);
    await register.screenshot({ path: `${output}/${theme}-${width}.png` });
    const search = register.getByRole('textbox', { name: 'البحث في سجل اليوم' });
    await search.fill('13');
    assert.equal(await register.locator('li').count(), 1);
    assert.equal(await register.locator('li').innerText().then(text => text.includes('مصطفى طه')), true);
    await search.fill('');
    await register.getByRole('combobox').selectOption('late');
    assert.equal(await register.locator('li').count(), 1);
    await search.fill('لا توجد نتيجة');
    assert.equal(await register.locator('li').count(), 0);
    await register.getByText(/لا توجد نتائج تطابق/).waitFor();
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('8 timeline viewport/theme cases passed: groups, late status, search, filter, empty state and text geometry. No real writes.');
} finally { await browser.close(); }
