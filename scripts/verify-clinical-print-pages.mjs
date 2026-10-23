import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ executablePath: 'C:/Users/SELRS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
const base = process.env.DESIGN_PREVIEW_URL || 'http://127.0.0.1:5197';
const profile = { enabled: true, widthMm: 148, heightMm: 210, topMm: 50, bottomMm: 10, leftMm: 10, rightMm: 10, header: 'Test header', footer: 'Test footer' };
try {
  for (const routePath of ['/prescription', '/request-tests', '/sheets/referral']) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', async route => {
      assert.equal(route.request().method(), 'GET', 'No clinical writes');
      const u = new URL(route.request().url());
      const inputs = JSON.parse(u.searchParams.get('input') || '{}');
      const results = (u.pathname.split('/api/trpc/')[1]?.split(',') || []).map((method, index) => ({ result: { data: { json:
        method === 'auth.me' ? { id: 99999, role: 'admin', name: 'Test' }
        : method === 'medical.getSystemSetting' ? { value: (u.searchParams.has('batch') ? inputs[index]?.json?.key : inputs.json?.key) === 'clinical_print_settings_v1' ? { version: 1, profiles: { prescription: profile, tests: profile, referral: profile } } : null }
        : []
      } } }));
      await route.fulfill({ json: u.searchParams.has('batch') ? results : results[0] });
    });
    await page.goto(`${base}${routePath}`);
    const paper = page.locator('[data-configured-print-root]');
    await paper.first().waitFor();
    await page.emulateMedia({ media: 'print' });
    assert(Math.abs(await paper.first().evaluate(el => parseFloat(getComputedStyle(el).width)) - 128 * 96 / 25.4) < 0.2);
    assert.equal(await paper.first().locator(':scope > [data-clinical-print-text]').count(), 2);
    if (routePath === '/request-tests') {
      await page.emulateMedia({ media: 'screen' });
      await page.getByRole('combobox', { name: 'قالب طباعة الطلب' }).click();
      await page.getByRole('option', { name: 'أشعة', exact: true }).click();
      await page.waitForFunction(() => !document.querySelector('[data-configured-print-root]'));
      assert.equal(await page.locator('#clinical-print-settings-style').count(), 0, 'Unconfigured radiology restores the original layout');
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('Actual prescription, test request and referral routes use configured paper geometry; radiology selection restores its own default. No clinical writes.');
} finally { await browser.close(); }
