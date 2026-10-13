import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ executablePath: 'C:/Users/SELRS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
await mkdir('outputs/app-surfaces', { recursive: true });
const css = (await Promise.all([
  'client/src/styles/design-system.css',
  'client/src/components/layout/mobile-brand-canvas.css',
  'client/src/styles/app-surfaces.css',
].map(path => readFile(path, 'utf8')))).join('\n');
try {
  for (const theme of ['light', 'dark']) for (const width of [320, 390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(value => localStorage.setItem('theme', value), theme);
    await page.route('**/api/**', async route => {
      assert.equal(route.request().method(), 'GET', 'Surface verification must not write');
      const url = new URL(route.request().url());
      const responses = (url.pathname.split('/api/trpc/')[1]?.split(',') ?? []).map(method => {
        const value = method === 'auth.me' ? { id: 999999, role: 'admin', name: 'Fixture user' }
          : method === 'attendance.dashboardSummary' ? { bySection: { center: {}, clinic: {} } }
          : [];
        return { result: { data: { json: value } } };
      });
      await route.fulfill({ json: url.searchParams.has('batch') ? responses : responses[0] ?? {} });
    });
    for (const route of ['/home', '/attendance', '/accounting', '/salary']) {
      await page.goto(`${process.env.DESIGN_PREVIEW_URL || 'http://127.0.0.1:5182'}${route}`);
      await page.locator('.selrs-app-content').waitFor();
      if (route === '/home') await page.locator('.home-app').first().waitFor();
      if (route === '/attendance') await page.locator('.attendance-home-focused').waitFor();
      const expected = theme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(18, 24, 32)';
      const surface = theme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(32, 41, 54)';
      assert.equal(await page.locator('.selrs-app-content').evaluate(node => getComputedStyle(node).backgroundColor), expected, `${route} ${theme} canvas`);
      assert.equal(await page.locator('[data-app-top-nav]').evaluate(node => getComputedStyle(node).backgroundColor), surface);
      if (route === '/home') assert.equal(await page.locator('.home-app').first().evaluate(node => getComputedStyle(node).backgroundColor), surface);
      if (route === '/attendance') assert.equal(await page.locator('.attendance-home-pane').first().evaluate(node => getComputedStyle(node).backgroundColor), surface);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.screenshot({ path: `outputs/app-surfaces/${route.slice(1)}-${theme}-${width}.png`, fullPage: true });
      assert.deepEqual(errors, []);
    }
    await page.setContent(`<style>.bg-white,.bg-card{background:white}.border{border:1px solid gray}[data-medical-file-overlay]{background:rgba(0,0,0,.4)}${css}</style>
      <div class="selrs-mobile-brand-canvas"><main class="selrs-app-content">
      <div data-medical-file-overlay><div data-medical-file-surface class="bg-card border">Medical file</div></div>
      <div data-print-document class="bg-white">Paper<input></div>
      <div class="final-report-sheet bg-white">Final report</div></main></div>`);
    assert.equal(await page.locator('[data-medical-file-overlay]').evaluate(node => getComputedStyle(node).backgroundColor), 'rgba(0, 0, 0, 0.4)');
    assert.equal(await page.locator('[data-medical-file-surface]').evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(255, 255, 255)');
    for (const selector of ['[data-print-document]', '.final-report-sheet']) {
      assert.equal(await page.locator(selector).evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(255, 255, 255)', selector);
    }
    await page.close();
  }
  console.log('24 screen cases passed: approved light/dark canvas and surfaces, responsive layouts, opaque overlay and protected paper. No real writes.');
} finally { await browser.close(); }
