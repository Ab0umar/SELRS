import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ executablePath: 'C:/Users/SELRS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', async route => {
      assert.equal(route.request().method(), 'GET', 'Preview must not write clinical data');
      const u = new URL(route.request().url());
      const results = (u.pathname.split('/api/trpc/')[1]?.split(',') || []).map(method => ({ result: { data: { json:
        method === 'auth.me' ? { id: 99999, role: 'admin', name: 'Test' }
        : method === 'medical.getSystemSetting' ? { value: null } : []
      } } }));
      await route.fulfill({ json: u.searchParams.has('batch') ? results : results[0] });
    });
    await page.goto('http://127.0.0.1:5197/admin-hub/print-settings');
    if (width < 600) await page.getByRole('button', { name: 'المعاينة', exact: true }).click();
    const preview = page.frameLocator('iframe[title="معاينة المستند الفعلي"]');
    await preview.locator('.prescription-paper').waitFor();
    assert.equal(await preview.getByText('اسم تجريبي', { exact: false }).count(), 0);
    await page.getByRole('combobox', { name: 'نوع المستند' }).click();
    await page.getByRole('option', { name: 'خطابات التحويل', exact: true }).click();
    await preview.locator('.report-sheet-body').waitFor();
    if (width === 390) {
      const downloaded = page.waitForEvent('download');
      await page.getByRole('button', { name: 'تجربة PDF', exact: true }).click();
      assert(await (await downloaded).path(), 'Actual-template PDF downloads');
    }
    if (width === 1440) {
      for (const [id, label] of [['tests', 'طلبات التحاليل والفحوصات'], ['radiology', 'طلبات الأشعة'], ['consultant', 'شيت الاستشاري'], ['specialist', 'شيت الأخصائي'], ['lasik', 'شيت الليزك'], ['external', 'الشيت الخارجي'], ['followup', 'شيت المتابعة'], ['refraction', 'مقاس النظارة'], ['clinical-report', 'التقرير السريري'], ['medical-condition', 'تقرير الحالة الطبية'], ['pre-post-op', 'تقرير ما قبل وبعد العملية'], ['offdays', 'إجازات العمليات'], ['summary', 'ملخص المريض'], ['report', 'التقارير الطبية']]) {
        await page.getByRole('combobox', { name: 'نوع المستند' }).click();
        await page.getByRole('option', { name: label, exact: true }).click();
        await preview.locator(`[data-clinical-preview-profile="${id}"]`).waitFor({ timeout: 25000 });
        console.log(`Rendered: ${label}`);
      }
    }
    await page.screenshot({ path: `outputs/clinical-print-settings/actual-${width}.png`, fullPage: true });
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('Actual prescription and referral templates render on mobile and desktop without clinical writes.');
} finally { await browser.close(); }
