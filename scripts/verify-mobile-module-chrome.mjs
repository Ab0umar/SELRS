import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

await mkdir('outputs/mobile-module-chrome', { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Users/SELRS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
try {
  for (const width of [360, 1440]) for (const path of ['/marketing', '/stockroom', '/kf', '/sheets', '/reports', '/patient-hub', '/records/patients']) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    await page.addInitScript(() => localStorage.setItem('theme', 'light'));
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', async route => {
      assert.equal(route.request().method(), 'GET');
      const url = new URL(route.request().url());
      const fixtures = {
        'auth.me': { id: 999999, role: 'admin', name: 'اختبار' },
        'stockroom.getReports': { inventory: [] },
        'marketing.dashboardSummary': { counts: { total: 0, draft: 0, published: 0, failed: 0, publishing: 0, scheduled: 0 }, recentPosts: [] },
        'marketing.getSettings': {},
        'marketing.getSchedulerStatus': {},
        'medical.getSystemSetting': null,
        'medical.getSheetEntry': null,
        'medical.getUserPageState': null,
        'medical.getPatientPageState': null,
        'medical.getMedicalHistoryByPatient': null,
      };
      const responses = (url.pathname.split('/api/trpc/')[1]?.split(',') ?? []).map(method => ({ result: { data: { json: method in fixtures ? fixtures[method] : [] } } }));
      await route.fulfill({ json: url.searchParams.has('batch') ? responses : responses[0] ?? {} });
    });
    await page.goto((process.env.DESIGN_PREVIEW_URL || 'http://127.0.0.1:5181') + path);
    await page.locator('.selrs-app-content').waitFor();
    await page.waitForTimeout(700);
    for (const summary of await page.locator('.mobile-summary-cards').all()) assert.equal(await summary.isVisible(), width >= 768, 'Summary cards hidden only on mobile');
    for (const header of await page.locator('.records-page-header').all()) {
      const box = await header.boundingBox();
      assert.equal(box.width === 1 && box.height === 1, width < 768, 'Header remains on desktop');
    }
    if (width < 768) {
      if (path === '/patient-hub') {
        for (const surface of await page.locator('.patient-hub-mobile-canvas > header, .patient-hub-mobile-canvas > main').all()) {
          assert.equal(await surface.evaluate(node => getComputedStyle(node).backgroundColor), 'rgba(0, 0, 0, 0)', 'Hub surfaces reveal the continuous canvas');
        }
        assert.equal(await page.locator('.patient-hub-mobile-canvas > header').evaluate(node => getComputedStyle(node).borderBottomWidth), '0px');
      }
      for (const heading of await page.locator('.selrs-app-content [data-page-heading]').all()) {
        const box = await heading.boundingBox();
        assert.equal(box.width, 1, 'Shared page heading is visually hidden');
        assert.equal(box.height, 1);
      }
      for (const commands of await page.locator('.selrs-app-content [data-page-commands]:not(.records-page-header *)').all()) assert(await commands.isVisible(), 'Page commands remain available');
      for (const frame of await page.locator('.mobile-unframed-content, .mobile-stock-category, .mobile-flat-clinical [role="tabpanel"] > div, .mobile-flat-marketing > div.rounded-xl').all()) {
        assert.equal(await frame.evaluate(node => getComputedStyle(node).borderTopWidth), '0px', 'Mobile content unframed');
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    }
    if (path === '/records/patients') {
      assert.equal(await page.getByText('الطباعة تقتصر على التبويب النشط:', { exact: false }).count(), 0);
      assert.equal(await page.getByRole('button', { name: 'طباعة التبويب النشط' }).count(), 0);
    }
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `outputs/mobile-module-chrome/${path.slice(1).replaceAll('/', '-')}-${width}.png`, fullPage: true });
    await page.close();
  }
  console.log('Passed seven module chrome checks on mobile and desktop; no writes.');
} finally { await browser.close(); }
