import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { inspectLayout } from './lib/layout-scan.mjs';

await mkdir('outputs/main-home-library', { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Users/SELRS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
async function openPage(width, theme, role = 'admin', failPermissions = false) {
  const page = await browser.newPage({ viewport: { width, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(value => localStorage.setItem('theme', value), theme);
  await page.route('**/api/**', async route => {
    assert.equal(route.request().method(), 'GET', 'No writes during home verification');
    const url = new URL(route.request().url());
    const responses = (url.pathname.split('/api/trpc/')[1]?.split(',') ?? []).map(method => {
      if (failPermissions && method === 'medical.getMyPermissions') return { error: { json: { message: 'FIXTURE_PERMISSIONS_FAILED', code: -32003, data: { code: 'FORBIDDEN', httpStatus: 403 } } } };
      const value = method === 'auth.me' ? { id: 999999, role, name: 'Fixture user' } : method === 'medical.getMyPermissions' ? ['/patient-hub'] : [];
      return { result: { data: { json: value } } };
    });
    await route.fulfill({ json: url.searchParams.has('batch') ? responses : responses[0] ?? {} });
  });
  await page.goto(`${process.env.DESIGN_PREVIEW_URL || 'http://127.0.0.1:5186'}/home`);
  if (failPermissions) await page.getByText('Unable to verify page permissions', { exact: true }).waitFor();
  else await page.locator('.main-home-library').waitFor();
  return { page, errors };
}
try {
  for (const width of [320, 390, 768, 1440, 1920]) for (const theme of ['light', 'dark']) {
    const { page, errors } = await openPage(width, theme);
    const tiles = page.locator('.home-app');
    const blocks = page.locator('.home-bento-hero, .home-bento-block');
    const contentWidth = await page.locator('.home-library-content').evaluate(node => ({ content: node.getBoundingClientRect().width, parent: node.parentElement.getBoundingClientRect().width }));
    assert(Math.abs(contentWidth.content - contentWidth.parent) <= 1, 'Home content fills the available page width');
    await page.getByRole('link', { name: 'الاستقبال', exact: true }).waitFor();
    assert((await tiles.count()) + (await blocks.count()) >= 15, 'Existing sections retained');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    const columns = await page.locator('.home-library-grid').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length);
    if (width <= 900) assert.equal(columns, width < 360 ? 3 : 4);
    else assert.equal(columns, 7, 'Wide layouts use the 7-column bento grid');
    assert.equal(await blocks.count(), 4, 'Hero plus three featured blocks');
    for (const tile of await tiles.all()) {
      const box = await tile.boundingBox();
      assert(box.width >= 44 && box.height >= 44);
      assert(box.width <= 180, 'Home tiles stay compact on wide screens');
      const icon = await tile.locator('svg').first().boundingBox();
      assert(icon.width >= 24, 'Home icons stay prominent');
      assert(await tile.locator('h3').evaluate(node => node.scrollWidth <= node.clientWidth + 1));
    }
    await page.evaluate(() => document.fonts.ready);
    const layout = await inspectLayout(page);
    assert.deepEqual(layout.collisions, [], `${theme} ${width}: text overlaps`);
    assert.deepEqual(layout.clippedButtons, [], `${theme} ${width}: clipped controls`);
    await page.screenshot({ path: `outputs/main-home-library/${theme}-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: 'الموظفين', exact: true }).click();
    await page.getByRole('menuitem', { name: 'الحضور', exact: true }).waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('searchbox').fill('الحسابات');
    assert.equal(await tiles.count(), 0);
    assert.equal(await page.locator('.home-bento-block').first().getAttribute('href'), '/accounting');
    await page.getByRole('searchbox').fill('zzzzzz');
    await page.getByText('لا توجد أقسام مطابقة.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'عرض كل الأقسام', exact: true }).click();
    assert(await tiles.count() >= 15);
    assert.deepEqual(errors, []);
    await page.close();
  }
  const restricted = await openPage(390, 'light', 'doctor');
  await restricted.page.getByRole('link', { name: 'مركز المريض', exact: true }).waitFor();
  assert.deepEqual(await restricted.page.locator('a.home-app, a.home-bento-block').evaluateAll(links => links.map(link => link.getAttribute('href')).sort()), ['/account', '/patient-hub']);
  assert.equal(await restricted.page.locator('.home-bento-hero').count(), 0);
  assert.equal(await restricted.page.getByRole('link', { name: 'الحساب', exact: true }).getAttribute('href'), '/account');
  assert.deepEqual(restricted.errors, []);
  await restricted.page.close();
  const failed = await openPage(390, 'light', 'doctor', true);
  assert.equal(await failed.page.locator('.home-app').count(), 0);
  assert.equal(await failed.page.getByRole('button', { name: 'Retry', exact: true }).count(), 1);
  await failed.page.close();
  console.log('Home library passed 10 full-width light/dark responsive cases, navigation/search/employee menu, restricted permissions, and error state. No real writes.');
} finally { await browser.close(); }
