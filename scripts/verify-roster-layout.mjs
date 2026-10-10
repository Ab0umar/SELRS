import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

await mkdir('outputs/roster-layout', { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Users/SELRS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
try {
  for (const width of [360, 768, 1024, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    page.setDefaultTimeout(15000);
    await page.addInitScript(() => {
      window.open = () => ({
        document: { open() {}, write: html => { window.rosterPrintHtml = html; }, close() {} },
        addEventListener() {}, removeEventListener() {}, focus() {}, print() { window.rosterPrintCalled = true; }, close() {},
      });
    });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', async route => {
      assert.equal(route.request().method(), 'GET');
      const url = new URL(route.request().url());
      const methods = url.pathname.split('/api/trpc/')[1]?.split(',') ?? [];
      const responses = methods.map(method => ({ result: { data: { json:
        method === 'auth.me' ? { id: 999999, role: 'admin', name: 'اختبار' }
        : method === 'salary.getShiftSchedule' ? {
          staff: [{ id: 1, name: 'د. محمد عبدالرحيم', type: 'doctor' }, { id: 2, name: 'رامز شمس', type: 'tech' }],
          attendance: Array.from({ length: 30 }, (_, index) => {
            const date = new Date(Date.UTC(2026, 8, 26 + index));
            return [0, 1, 2, 3].map(slot => ({ id: index * 4 + slot + 1, staffId: slot < 2 ? 1 : 2,
              workDate: date.toISOString().slice(0, 10), shiftName: slot % 2 ? 'Night' : 'Morning',
              startTime: slot % 2 ? '13:00' : '09:00', endTime: slot % 2 ? '19:00' : '15:00', present: true }));
          }).flat(),
        }
        : method.includes('getSystemSetting') ? null : []
      } } }));
      await route.fulfill({ json: url.searchParams.has('batch') ? responses : responses[0] ?? {} });
    });
    await page.goto((process.env.DESIGN_PREVIEW_URL || 'http://127.0.0.1:5181') + '/attendance/shift-schedule');
    await page.locator('.roster-workspace').waitFor();
    assert.equal(await page.getByRole('button', { name: 'الكل', exact: true }).count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    if (width < 768) {
      const period = page.locator('.roster-mobile-period');
      assert.equal(await period.getByRole('button', { name: 'طباعة جدول الشفتات أو حفظه PDF' }).count(), 1);
      await period.getByRole('button', { name: 'الشهر التالي', exact: true }).click();
      await period.getByRole('button', { name: 'الشهر السابق', exact: true }).click();
      const tools = page.locator('.roster-mobile-tools');
      assert.equal(await tools.getAttribute('open'), null);
      await tools.locator('summary').click();
      await page.getByRole('button', { name: /^إضافة وردية يوم/ }).first().click();
      await page.getByRole('dialog').waitFor();
      await page.keyboard.press('Escape');
      await period.getByRole('button', { name: 'طباعة جدول الشفتات أو حفظه PDF' }).click();
      await tools.getByRole('button', { name: 'توليد', exact: true }).waitFor();
      await tools.getByRole('button', { name: 'العطلات', exact: true }).click();
      await tools.getByRole('heading', { name: 'العطلات الرسمية' }).waitFor();
      await tools.locator('summary').click();
    } else {
      const grid = page.locator('.roster-week-grid').first();
      assert.equal(await grid.locator(':scope > div').count(), 6);
      const tracks = await grid.evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length);
      assert.equal(tracks, 6);
      await page.getByRole('button', { name: 'لوحات الروستر', exact: true }).click();
      await page.getByRole('menuitem', { name: 'ملخص الروستر', exact: true }).click();
      await page.locator('.roster-menu[data-panel="summary"]').waitFor();
      await page.locator('.roster-menu button').first().click();
      const row = page.locator('.roster-entry-row').first();
      await row.waitFor();
      assert.equal(await row.locator('.roster-entry-time').innerText(), '09:00 - 15:00');
      const sizes = await row.evaluate(node => {
        const name = node.querySelector('.roster-entry-name').getBoundingClientRect();
        const menu = node.querySelector('.roster-entry-menu').getBoundingClientRect();
        return { nameLeft: name.left, menuRight: menu.right, menuWidth: menu.width, rowWidth: node.getBoundingClientRect().width };
      });
      assert(sizes.menuWidth <= 33 && sizes.nameLeft >= sizes.menuRight - 1, JSON.stringify(sizes));
      await row.getByRole('button', { name: /^إجراءات وردية/ }).click();
      await page.getByRole('menuitem', { name: 'تعديل وقت الوردية', exact: true }).click();
      await page.getByRole('dialog').waitFor();
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'طباعة / حفظ PDF', exact: true }).click();
    }
    await page.waitForFunction(() => window.rosterPrintCalled === true);
    const printHtml = await page.evaluate(() => window.rosterPrintHtml);
    assert(printHtml.includes('روستر') && printHtml.includes('date-range') && printHtml.includes('dir="rtl"'), 'Print document must retain the roster period and RTL layout');
    assert(printHtml.includes('روستر الأطباء') && !printHtml.includes('رامز'), 'Doctor print must exclude technicians');
    await page.getByRole('button', { name: 'الفنيين', exact: true }).filter({ visible: true }).click();
    if (width >= 768) {
      await page.locator('.roster-entry-name').first().waitFor();
      const names = await page.locator('.roster-entry-name').allTextContents();
      assert(names.every(name => name.includes('رامز') && !name.includes('عبدالرحيم')));
      await page.getByRole('button', { name: 'طباعة / حفظ PDF', exact: true }).click();
    } else {
      await page.locator('.roster-mobile-period').getByRole('button', { name: 'طباعة جدول الشفتات أو حفظه PDF' }).click();
    }
    await page.waitForFunction(() => window.rosterPrintHtml?.includes('روستر الفنيين'));
    const techPrint = await page.evaluate(() => window.rosterPrintHtml);
    assert(techPrint.includes('رامز') && !techPrint.includes('عبدالرحيم'), 'Technician print must exclude doctors');
    await page.getByRole('button', { name: 'الأطباء', exact: true }).filter({ visible: true }).click();
    await page.getByRole('button', { name: 'الأطباء', exact: true }).filter({ visible: true }).evaluate(node => {
      if (node.getAttribute('aria-pressed') !== 'true') throw new Error('Doctor roster must be active');
    });
    await page.waitForTimeout(200);
    await page.evaluate(() => { document.querySelector('[data-app-scroll-container]').scrollTop = 0; });
    await page.screenshot({ path: `outputs/roster-layout/${width}.png`, fullPage: true });
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('Passed roster layout/navigation at four widths; all requests read-only.');
} finally { await browser.close(); }
