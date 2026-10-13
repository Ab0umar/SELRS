import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

await mkdir('outputs/mobile-module-chrome', { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Users/SELRS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
try {
  for (const width of [360, 1440]) for (const path of process.env.DESIGN_VERIFY_PATHS?.split(',') ?? ['/marketing', '/stockroom', '/kf', '/sheets', '/reports', '/patient-hub', '/records/patients']) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const mediaSession = await page.context().newCDPSession(page);
    await mediaSession.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
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
    if (path === '/dashboard') {
      const tabs = page.getByRole('tablist', { name: 'أقسام لوحة التحكم' });
      assert.equal(await tabs.getByRole('tab').count(), 7);
      if (width < 768) {
        const last = tabs.getByRole('tab').last();
        await last.evaluate(node => node.scrollIntoView({ block: 'nearest', inline: 'nearest' }));
        const lastBox = await last.boundingBox();
        assert(lastBox.x >= 0 && lastBox.x + lastBox.width <= width + 1, 'Final dashboard tab is reachable');
        await tabs.getByRole('tab').first().evaluate(node => node.scrollIntoView({ block: 'nearest', inline: 'nearest' }));
      }
    }
    assert.equal(await page.locator('[data-app-top-nav]').evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(255, 255, 255)', 'Top navigation has a neutral surface');
    if (width < 768) {
      for (const tabs of await page.locator('.selrs-app-content nav[aria-label="أقسام الوحدة"], .selrs-app-content [role="tablist"]').all()) {
        if (!(await tabs.isVisible())) continue;
        const style = await tabs.evaluate(node => ({ display: getComputedStyle(node).display, wrap: getComputedStyle(node).flexWrap, height: getComputedStyle(node).height }));
        assert.deepEqual(style, { display: 'flex', wrap: 'nowrap', height: '46px' });
        const items = tabs.locator(':scope > a, :scope > button, :scope > label');
        const positions = await items.evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().top));
        assert(positions.every(top => Math.abs(top - positions[0]) < 1), 'Tabs remain on one row');
      }
      const bottomNav = page.locator('[data-app-bottom-nav]');
      if (await bottomNav.count()) {
        assert.equal(await bottomNav.getByRole('button').count(), 6, 'Five primary destinations plus More');
        const dashboardButton = bottomNav.getByRole('button', { name: 'لوحة التحكم', exact: true });
        assert.equal(await dashboardButton.innerText(), '', 'Dashboard keeps an accessible name without a visible label');
        const box = await bottomNav.boundingBox();
        assert(box.x >= 11 && box.x + box.width <= width - 11, 'Floating bar has side gutters');
        assert(box.y + box.height <= 989, 'Floating bar clears the screen edge');
        assert.match(await bottomNav.evaluate(node => getComputedStyle(node).backdropFilter), /blur\(20px\)/, 'Floating navigation blurs its backdrop');
        assert.match(await bottomNav.evaluate(node => getComputedStyle(node).backgroundColor), /0\.84/, 'Glass surface retains enough opacity for readable controls');
        await mediaSession.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] });
        assert.equal(await bottomNav.evaluate(node => getComputedStyle(node).backdropFilter), 'none');
        assert.equal(await bottomNav.evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(255, 255, 255)');
        await mediaSession.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
        assert.equal(await bottomNav.evaluate(node => getComputedStyle(node).position), 'fixed');
        assert.equal(await page.locator('.selrs-app-content > [data-app-bottom-nav-clearance]').count(), 1, 'Navigation clearance is inside the scrolling content');
        if (path.startsWith('/refraction/')) {
          const lastInput = page.locator('.selrs-app-content input:visible').last();
          assert(await lastInput.count(), 'Refraction form renders real inputs');
          await lastInput.evaluate(node => node.scrollIntoView({ block: 'end', inline: 'nearest' }));
          const inputBox = await lastInput.boundingBox();
          assert(inputBox.y + inputBox.height <= box.y, 'Final refraction input is reachable above the floating bar');
        }
        for (const button of await bottomNav.getByRole('button').all()) {
          const target = await button.boundingBox();
          assert(target.width >= 44 && target.height >= 44);
          const icon = await button.locator('svg').boundingBox();
          assert.equal(icon.width, 24);
          assert.equal(icon.height, 24);
        }
      }
    }
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
  console.log('Passed requested module chrome checks on mobile and desktop; no writes.');
} finally { await browser.close(); }
