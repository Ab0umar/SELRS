import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

await mkdir('outputs/home-designs', { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Users/SELRS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
try {
  for (const width of [320, 390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('file:///E:/selrs.cc/outputs/main-home-four-designs.html');
    for (const design of ['directory', 'library', 'navigator', 'desk']) {
      await page.locator(`[data-design="${design}"]`).click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${design}: no horizontal overflow at ${width}`);
      assert(await page.locator('.brand img').evaluate(img => img.complete && img.naturalWidth > 0));
      await page.screenshot({ path: `outputs/home-designs/${design}-${width}.png`, fullPage: true });
      const link = page.locator('#app [data-module]').filter({ visible: true }).first();
      await link.click();
      assert(await page.locator('dialog').isVisible());
      await page.getByRole('button', { name: 'رجوع', exact: true }).click();
      await page.getByRole('searchbox').fill('الحسابات');
      assert.equal(await page.locator('#app .no-results').count(), 0);
      await page.getByRole('searchbox').fill('zzzzzz');
      assert.equal(await page.locator('.module-row:not(.bottom *), .app-tile').count(), 0);
    }
    await page.locator('[data-design="desk"]').click();
    await page.getByRole('button', { name: 'تخصيص', exact: true }).click();
    await page.getByRole('checkbox', { name: 'تثبيت المرتبات', exact: true }).check();
    assert.equal(await page.locator('.pin-card[data-module="salary"]').count(), 1);
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('Four HTML concepts passed at 320/390/1440px: logo, overflow, search, module dialogs, and favorites.');
} finally { await browser.close(); }
