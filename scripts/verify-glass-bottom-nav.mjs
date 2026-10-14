import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { inspectLayout } from './lib/layout-scan.mjs';

await mkdir('outputs/glass-bottom-nav', { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Users/SELRS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
try {
  for (const theme of ['light', 'dark']) for (const width of [320, 390, 600]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.addInitScript(theme => localStorage.setItem('theme', theme), theme);
    await page.route('**/api/**', async route => {
      assert.equal(route.request().method(), 'GET');
      const url = new URL(route.request().url());
      const responses = (url.pathname.split('/api/trpc/')[1]?.split(',') || []).map(method => ({ result: { data: { json: method === 'auth.me' ? { id: 999999, role: 'admin', name: 'اختبار' } : method === 'salary.monthSummary' ? { staffCount: 0, center: {}, clinic: {} } : method.includes('getSystemSetting') ? null : [] } } }));
      await route.fulfill({ json: url.searchParams.has('batch') ? responses : responses[0] });
    });
    await page.goto(`${process.env.DESIGN_PREVIEW_URL || 'http://127.0.0.1:5186'}/salary`);
    const nav = page.locator('[data-app-bottom-nav]');
    await nav.waitFor();
    await page.evaluate(() => document.fonts.ready);
    const box = await nav.boundingBox();
    assert(box.x >= 19 && box.x + box.width <= width - 19, 'Floating inset');
    assert(box.height <= 70, 'Compact navigation height');
    assert(box.width <= 482, 'Constrained tablet width');
    for (const button of await nav.getByRole('button').all()) {
      const bounds = await button.boundingBox();
      assert(bounds.width >= 44 && bounds.height >= 44, 'Touch target');
    }
    const layout = await inspectLayout(page);
    assert.deepEqual(layout.clippedButtons, []);
    await page.screenshot({ path: `outputs/glass-bottom-nav/${theme}-${width}.png`, fullPage: true });
    await nav.getByRole('button', { name: 'المزيد', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    assert.equal(await nav.getByRole('button', { name: 'المزيد', exact: true, includeHidden: true }).getAttribute('aria-expanded'), 'true');
    await page.close();
  }
} finally { await browser.close(); }
console.log('Passed 6 glass navigation viewport/theme cases, touch targets and More menu. No writes.');
