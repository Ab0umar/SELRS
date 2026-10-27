import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { inspectLayout } from './lib/layout-scan.mjs';

await mkdir('outputs/admin-directory', { recursive: true });
const TOOL_COUNT = 22;
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
  for (const width of [320, 390, 768, 1440, 1920]) for (const theme of ['light', 'dark']) {
    const { page, errors } = await open(width, theme);
    const links = page.locator('.admin-tool-link');
    const tiles = page.locator('.admin-bento-tile');
    const blocks = page.locator('.admin-bento-hero, .admin-bento-block');
    const contentWidth = await page.locator('[data-admin-hub] > main').evaluate(node => ({ content: node.getBoundingClientRect().width, parent: node.parentElement.getBoundingClientRect().width }));
    assert(Math.abs(contentWidth.content - contentWidth.parent) <= 1, 'Administration content fills the available page width');
    assert.equal(await links.count(), TOOL_COUNT);
    const counts = await page.locator('.admin-category-nav button').evaluateAll(buttons => buttons.map(button => Number(button.lastElementChild.textContent.replace(/[٠-٩]/g, digit => '٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))));
    assert.deepEqual(counts, [22, 4, 5, 5, 8], 'Category badges count consolidated cards, not hidden child links');
    assert.equal(await blocks.count(), 4, 'Hero plus three featured blocks');
    assert.equal(await tiles.count(), TOOL_COUNT - 4, 'Remaining tools render as compact bento tiles');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    assert.equal(await page.locator('.admin-directory-search input').evaluate(node => node.scrollWidth > node.clientWidth + 1), false);
    assert(await page.locator('.admin-directory-search input').evaluate(node => Math.abs(node.getBoundingClientRect().width - node.parentElement.getBoundingClientRect().width) < 2), 'Search input and its icon share the same field bounds');
    await page.getByText('قاعدة البيانات: متصلة', { exact: true }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    const columns = await page.locator('.admin-tool-list').first().evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length);
    if (width <= 650) assert.equal(columns, 3);
    else if (width <= 1000) assert.equal(columns, 4);
    else assert.equal(columns, 7, 'Wide layouts use the 7-column bento grid');
    const layout = await inspectLayout(page);
    assert.deepEqual(layout.collisions, [], `${theme} ${width}: text overlap`);
    assert.deepEqual(layout.clippedButtons, [], `${theme} ${width}: clipped controls`);
    await page.screenshot({ path: `outputs/admin-directory/${theme}-${width}.png`, fullPage: true });
    for (const tile of await tiles.all()) {
      const box = await tile.boundingBox();
      assert(box.height >= 44 && box.width >= 44);
      assert(box.width <= 270, 'Administration tiles stay compact');
      const icon = await tile.locator('svg').first().boundingBox();
      assert(icon.width >= 20, 'Administration icons stay prominent');
      assert.equal(await tile.evaluate(node => node.scrollWidth > node.clientWidth + 1), false);
    }
    // Verify category filter promotion
    await page.locator('.admin-category-nav button').nth(2).click();
    assert.equal(await page.locator('.admin-bento-hero').getAttribute('href'), '/admin-hub/services');
    await page.locator('.admin-category-nav button').first().click();
    assert.equal(await links.count(), TOOL_COUNT);
    // Verify search filter
    await page.getByRole('searchbox', { name: 'بحث في أدوات الإدارة' }).fill('واتساب');
    assert.equal(await links.count(), 2);
    assert.deepEqual((await links.evaluateAll(nodes => nodes.map(n => n.getAttribute('href')))).sort(), ['/admin-hub/ai', '/admin-hub/whatsapp-inbox']);
    await page.getByRole('searchbox', { name: 'بحث في أدوات الإدارة' }).fill('سجل العمليات');
    assert.deepEqual(await links.evaluateAll(nodes => nodes.map(n => n.getAttribute('href'))), ['/admin-hub/legacy-patients']);
    await page.getByRole('searchbox', { name: 'بحث في أدوات الإدارة' }).fill('المساعد الطبي');
    assert.deepEqual(await links.evaluateAll(nodes => nodes.map(n => n.getAttribute('href'))), ['/admin-hub/ai']);
    await page.getByRole('button', { name: 'مسح البحث', exact: true }).click();
    assert.equal(await links.count(), TOOL_COUNT);
    await page.getByRole('searchbox').fill('zzzzzz');
    await page.getByText('لا توجد أدوات مطابقة للتصفية الحالية.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'مسح التصفية', exact: true }).click();
    assert.equal(await links.count(), TOOL_COUNT);
    assert.deepEqual(errors, []);
    await page.close();
  }
  const failed = await open(390, 'light', true);
  await failed.page.getByText('قاعدة البيانات: تعذر التحقق', { exact: true }).waitFor({ timeout: 30000 });
  assert.equal(await failed.page.getByRole('button', { name: 'إعادة المحاولة', exact: true }).count(), 1);
  assert.equal(await failed.page.locator('.admin-tool-link').count(), TOOL_COUNT);
  await failed.page.evaluate(() => {
    localStorage.setItem(
      'selrs:bento-usage:admin:999999',
      JSON.stringify({
        '/admin-hub/whatsapp-inbox': { count: 6, updatedAt: 400 },
        '/admin-hub/patients': { count: 4, updatedAt: 300 },
        '/examinations/catalog': { count: 2, updatedAt: 200 },
      }),
    );
    window.dispatchEvent(new CustomEvent('selrs-card-usage-updated'));
  });
  assert.equal(await failed.page.locator('.admin-bento-hero').getAttribute('href'), '/admin-hub/whatsapp-inbox');
  assert.deepEqual(
    await failed.page.locator('.admin-bento-block').evaluateAll(links => links.map(link => link.getAttribute('href'))),
    ['/admin-hub/patients', '/examinations/catalog', '/admin-hub/users'],
  );
  assert.deepEqual(failed.errors, []);
  await failed.page.close();
  console.log(`Admin directory passed 10 compact full-width responsive cases, ${TOOL_COUNT} bento tools, category filters, search/reset, and failed health state. No real writes.`);
} finally { await browser.close(); }
