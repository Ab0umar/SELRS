import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

await mkdir('outputs/main-home', { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Users/SELRS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
try {
  for (const width of [360, 768, 1440]) for (const role of ['admin', 'staff']) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', async route => {
      assert.equal(route.request().method(), 'GET');
      const url = new URL(route.request().url());
      const responses = (url.pathname.split('/api/trpc/')[1]?.split(',') ?? []).map(method => ({ result: { data: { json:
        method === 'auth.me' ? { id: 999999, name: 'اختبار', role }
        : method === 'medical.getMyPermissions' ? ['/accounting', '/stockroom']
        : method.includes('getSystemSetting') ? null : []
      } } }));
      await route.fulfill({ json: url.searchParams.has('batch') ? responses : responses[0] ?? {} });
    });
    await page.goto((process.env.DESIGN_PREVIEW_URL || 'http://127.0.0.1:5181') + '/home');
    const home = page.locator('.main-home-focused');
    await home.locator('.home-section-item').first().waitFor();
    const canvas = await page.locator('.selrs-mobile-brand-canvas').evaluate(node => getComputedStyle(node).backgroundImage);
    assert.equal(canvas.includes('linear-gradient'), width < 768, 'Blue canvas is mobile-only');
    if (width < 768) {
      assert(canvas.includes('rgb(220, 238, 255) 520px'), 'Page fades to the same light-blue surface');
      assert.equal(await page.locator('.selrs-mobile-brand-canvas').evaluate(node => getComputedStyle(node).getPropertyValue('--background').trim()), '#dceeff');
      assert.equal(await page.locator('[data-app-top-nav]').evaluate(node => getComputedStyle(node).backgroundImage), canvas, 'Header and page share the same gradient stops');
      assert((await page.locator('[data-app-top-nav]').evaluate(node => getComputedStyle(node).backgroundImage)).includes('rgb(0, 61, 130)'));
      assert.equal(await home.locator('.home-section-item').first().evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(220, 238, 255)');
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    assert.equal(await home.getByText('MAIN MENU', { exact: true }).count(), 0);
    const items = home.locator('.home-section-item');
    const fit = await items.evaluateAll(nodes => nodes.every(node => node.scrollWidth <= node.clientWidth + 1));
    assert(fit, `All labels fit: ${width} ${role}`);
    if (role === 'admin') {
      assert.equal(await home.locator('.home-section-group').count(), 3);
      assert.equal(await home.locator('a[href="/accounting"]').count(), 1);
      assert.equal(await home.locator('a[href="/pentacam"]').count(), 0);
      assert.equal(await home.locator('section[aria-label="العمل اليومي"] a[href="/kf"]').count(), 1);
      assert.equal(await home.locator('section[aria-label="الإدارة والموظفين"] a[href="/stockroom"]').count(), 1);
      await home.getByRole('button', { name: /الموظفين/ }).click();
      await page.getByRole('menuitem', { name: 'الحضور', exact: true }).waitFor();
      await page.getByRole('menuitem', { name: 'المرتبات', exact: true }).waitFor();
      await page.keyboard.press('Escape');
      await page.getByRole('menu').waitFor({ state: 'hidden' });
    } else {
      const labels = await home.locator('.home-section-item h3').allTextContents();
      assert.deepEqual(labels.sort(), ['الحساب', 'الحسابات', 'المخزن'].sort());
    }
    if (width === 360) assert.equal(await home.locator('.home-section-grid').first().evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length), 2);
    await page.evaluate(() => { document.querySelector('[data-app-scroll-container]').scrollTop = 0; });
    await page.screenshot({ path: `outputs/main-home/${width}-${role}.png`, fullPage: true });
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('Passed main home at three widths and two permission profiles; no writes.');
} finally { await browser.close(); }
