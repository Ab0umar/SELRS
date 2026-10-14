import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { inspectLayout } from './lib/layout-scan.mjs';

await mkdir('outputs/admin-directory', { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Users/SELRS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
async function open(width, theme, healthError = false) {
  const page = await browser.newPage({ viewport: { width, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(value => localStorage.setItem('theme', value), theme);
  await page.route('**/api/**', async route => {
    assert.equal(route.request().method(), 'GET', 'No writes during directory verification');
    const url = new URL(route.request().url());
    const results = (url.pathname.split('/api/trpc/')[1]?.split(',') ?? []).map(method => {
      if (healthError && method === 'medical.getOpsHealth') return { error: { json: { message: 'FIXTURE_HEALTH_UNAVAILABLE', code: -32603, data: { code: 'INTERNAL_SERVER_ERROR', httpStatus: 500 } } } };
      const value = method === 'auth.me' ? { id: 999999, role: 'admin', name: 'Fixture admin' }
        : method === 'medical.getOpsHealth' ? { dbConnected: true, tunnelConnected: true, patientsCount: 42 } : [];
      return { result: { data: { json: value } } };
    });
    await route.fulfill({ json: url.searchParams.has('batch') ? results : results[0] ?? {} });
  });
  await page.goto(`${process.env.DESIGN_PREVIEW_URL || 'http://127.0.0.1:5186'}/admin-hub`);
  await page.locator('.admin-tool-link').first().waitFor();
  return { page, errors };
}
try {
  for (const width of [320, 390, 768, 1440]) for (const theme of ['light', 'dark']) {
    const { page, errors } = await open(width, theme);
    const links = page.locator('.admin-tool-link');
    assert.equal(await links.count(), 23);
    assert.equal(await page.locator('.admin-tool-group').count(), 4);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    assert.equal(await page.locator('.admin-directory-search input').evaluate(node => node.scrollWidth > node.clientWidth + 1), false);
    assert(await page.locator('.admin-directory-search input').evaluate(node => Math.abs(node.getBoundingClientRect().width - node.parentElement.getBoundingClientRect().width) < 2), 'Search input and its icon share the same field bounds');
    await page.getByText('قاعدة البيانات: متصلة', { exact: true }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    const columns = await page.locator('.admin-tool-list').first().evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length);
    assert.equal(columns, width < 360 ? 3 : width <= 1000 ? 4 : 5);
    const iconColors = await page.locator('.admin-tool-icon').evaluateAll(nodes => [...new Set(nodes.map(node => getComputedStyle(node).color))]);
    assert.equal(iconColors.length, 4, 'Distinct category icon colors');
    const layout = await inspectLayout(page);
    assert.deepEqual(layout.collisions, [], `${theme} ${width}: text overlap`);
    assert.deepEqual(layout.clippedButtons, [], `${theme} ${width}: clipped controls`);
    await page.screenshot({ path: `outputs/admin-directory/${theme}-${width}.png`, fullPage: true });
    for (const link of await links.all()) {
      const box = await link.boundingBox();
      assert(box.height >= 44 && box.width >= 44);
      assert.equal(await link.evaluate(node => node.scrollWidth > node.clientWidth + 1), false);
    }
    const filters = page.locator('.admin-category-nav button');
    await filters.nth(1).click();
    assert.equal(await links.count(), 5);
    assert.equal(await page.locator('.admin-tool-group').count(), 1);
    assert.equal(await filters.nth(1).getAttribute('aria-pressed'), 'true');
    await filters.nth(0).click();
    await page.getByRole('searchbox', { name: 'بحث في أدوات الإدارة' }).fill('واتساب');
    assert.equal(await links.count(), 1);
    assert.equal(await links.first().getAttribute('href'), '/admin-hub/whatsapp-inbox');
    await page.getByRole('button', { name: 'مسح البحث', exact: true }).click();
    assert.equal(await links.count(), 23);
    await page.getByRole('searchbox').fill('zzzzzz');
    await page.getByText('لا توجد أدوات مطابقة للتصفية الحالية.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'مسح التصفية', exact: true }).click();
    assert.equal(await links.count(), 23);
    await page.getByRole('searchbox').focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.locator('.admin-tool-link').first().evaluate(node => node === document.activeElement), true);
    assert.deepEqual(errors, []);
    await page.close();
  }
  const failed = await open(390, 'light', true);
  await failed.page.getByText('قاعدة البيانات: تعذر التحقق', { exact: true }).waitFor({ timeout: 30000 });
  assert.equal(await failed.page.getByRole('button', { name: 'إعادة المحاولة', exact: true }).count(), 1);
  assert.equal(await failed.page.locator('.admin-tool-link').count(), 23);
  assert.deepEqual(failed.errors, []);
  await failed.page.close();
  console.log('Admin directory passed 8 responsive light/dark cases, 23 retained routes, 4 groups, category/search/reset, keyboard focus and failed health state. No real writes.');
} finally { await browser.close(); }
