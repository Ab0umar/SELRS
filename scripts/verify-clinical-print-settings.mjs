import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { inspectLayout } from './lib/layout-scan.mjs';

await mkdir('outputs/clinical-print-settings', { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Users/SELRS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
const base = process.env.DESIGN_PREVIEW_URL || 'http://127.0.0.1:5197';
let cases = 0;
try {
  for (const width of [320, 390, 1440]) for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width, height: 1050 }, acceptDownloads: true });
    let setting = { version: 1, profiles: {} }, mutations = 0;
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(theme => localStorage.setItem('theme', theme), theme);
    await page.route('**/api/**', async route => {
      const u = new URL(route.request().url());
      const methods = u.pathname.split('/api/trpc/')[1]?.split(',') || [];
      if (route.request().method() !== 'GET') {
        assert.deepEqual(methods, ['medical.updateSystemSetting'], 'Only mocked print-setting saves are allowed');
        const body = route.request().postDataJSON();
        const input = u.searchParams.has('batch') ? body[0].json : body.json;
        assert.equal(input.key, 'clinical_print_settings_v1');
        setting = input.value; mutations++;
      }
      const results = methods.map(method => ({ result: { data: { json: method === 'auth.me' ? { id: 99999, role: 'admin', name: 'Test' }
        : method === 'medical.getSystemSetting' ? { key: 'clinical_print_settings_v1', value: setting }
        : method === 'medical.updateSystemSetting' ? { success: true } : [] } } }));
      await route.fulfill({ json: u.searchParams.has('batch') ? results : results[0] });
    });
    await page.goto(`${base}/admin-hub/print-settings`);
    await page.getByRole('switch', { name: 'تطبيق إعدادات مخصصة' }).waitFor();
    await page.getByRole('switch', { name: 'تطبيق إعدادات مخصصة' }).click();
    await page.getByRole('combobox', { name: 'مقاس الورق' }).click();
    await page.getByRole('option', { name: 'A5', exact: true }).click();
    await page.getByLabel('الهامش العلوي سم', { exact: true }).fill('5');
    await page.getByText('نص إضافي أعلى المستند', { exact: true }).locator('textarea').fill('ترويسة تجريبية');
    await page.getByText('نص إضافي أسفل المستند', { exact: true }).locator('textarea').fill('نص تجريبي\nسطر ثانٍ');
    await page.getByRole('button', { name: 'حفظ إعدادات المستند', exact: true }).click();
    await page.waitForFunction(() => [...document.querySelectorAll('[data-sonner-toast]')].some(node => node.textContent.includes('تم حفظ')));
    assert.equal(mutations, 1);
    assert.equal(setting.profiles.prescription.widthMm, 148);
    assert.equal(setting.profiles.prescription.topMm, 50);
    if (width < 768) await page.getByRole('button', { name: 'المعاينة', exact: true }).click();
    const actual = page.frameLocator('iframe[title="معاينة المستند الفعلي"]');
    await actual.locator('[data-clinical-preview-profile="prescription"]').waitFor();
    await actual.getByText('ترويسة تجريبية', { exact: true }).waitFor();
    await page.screenshot({ path: `outputs/clinical-print-settings/${theme}-${width}.png`, fullPage: true });
    const layout = await inspectLayout(page);
    assert.equal(layout.overflow, false);
    assert.deepEqual(layout.collisions, [], 'No text overlaps');
    assert.deepEqual(layout.clippedButtons, [], 'No clipped controls');
    if (width === 1440 && theme === 'light') {
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'تجربة PDF', exact: true }).click();
      const download = await downloadPromise;
      const bytes = await readFile(await download.path());
      const pdf = await PDFDocument.load(bytes);
      assert(Math.abs(pdf.getPage(0).getWidth() - 148 * 72 / 25.4) < 0.1);
      assert(Math.abs(pdf.getPage(0).getHeight() - 210 * 72 / 25.4) < 0.1);
      assert(pdf.getPageCount() >= 1, 'Actual document produces printable pages');
    }
    await page.getByRole('combobox', { name: 'نوع المستند' }).click();
    await page.getByRole('option', { name: 'طلبات الأشعة', exact: true }).click();
    if (width < 768) await page.getByRole('button', { name: 'الإعدادات', exact: true }).click();
    assert.equal(await page.getByRole('switch', { name: 'تطبيق إعدادات مخصصة' }).isChecked(), false, 'Profiles are independent');
    await page.getByLabel('عرض الورقة سم', { exact: true }).fill('0');
    assert.equal(await page.getByRole('button', { name: 'حفظ إعدادات المستند', exact: true }).isDisabled(), true, 'Invalid paper cannot be saved');
    assert.deepEqual(errors, []);
    await page.close(); cases++;
  }
} finally { await browser.close(); }
console.log(`Passed ${cases} print-settings mobile/desktop/theme cases, mocked save, independent profiles and custom-size PDF. No database writes.`);
