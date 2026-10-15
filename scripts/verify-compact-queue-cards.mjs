import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { inspectLayout } from './lib/layout-scan.mjs';

await mkdir('outputs/compact-queue-cards', { recursive: true });
const patients = [
  { id: 999991, visitId: 42, fullName: 'سارة محمد', doctorName: 'د. محمد السعدني', serviceType: 'consultant', checkedInTime: '10:31', queueStatus: 'clinic1', locationType: 'center' },
  { id: 999992, visitId: 43, fullName: 'مريض تجريبي باسم طويل للتحقق من التفاف اسم المريض', doctorName: 'د. محمد السعدني', serviceType: 'specialist', checkedInTime: '12:09', queueStatus: 'clinic2', locationType: 'center', visitType: 'followup', hasQueueCompletionData: true },
  { id: 999993, fullName: 'مريض بدون مسار زيارة', checkedInTime: '13:02', queueStatus: 'pentacam', locationType: 'center' },
  { id: 999994, visitId: 44, fullName: 'مريض ليزك', serviceType: 'lasik', checkedInTime: '13:15', queueStatus: 'checkedIn', locationType: 'center' },
  { id: 999995, visitId: 45, fullName: 'مريض خارجي', serviceType: 'external', checkedInTime: '13:30', queueStatus: 'clinic1', locationType: 'center' },
  { id: 999996, visitId: 46, fullName: 'أحمد عبدالله', serviceType: 'consultant', checkedInTime: '13:40', queueStatus: 'treated', locationType: 'center' },
  { id: 999997, visitId: 47, fullName: 'جمال أحمد', doctorName: 'د. محمد', serviceType: 'lasik', checkedInTime: '13:45', queueStatus: 'treated', locationType: 'center', visitType: 'followup' },
];
const browser = await chromium.launch({ executablePath: 'C:/Users/SELRS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
let cases = 0;
try {
  for (const theme of ['light', 'dark']) for (const width of [320, 390, 430, 1440]) for (const path of ['/today', '/dashboard']) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(theme => localStorage.setItem('theme', theme), theme);
    await page.route('**/api/**', async route => {
      assert.equal(route.request().method(), 'GET', 'Do not write patient data');
      const url = new URL(route.request().url());
      const results = (url.pathname.split('/api/trpc/')[1]?.split(',') || []).map(method => ({ result: { data: { json:
        method === 'auth.me' ? { id: 999999, role: 'admin', name: 'اختبار' }
        : method === 'medical.getTodayPatientsByQueueStatus' ? patients
        : method === 'medical.getPatientMedicalStatus' ? {}
        : method.includes('getSystemSetting') ? null : []
      } } }));
      await route.fulfill({ json: url.searchParams.has('batch') ? results : results[0] });
    });
    await page.goto(`${process.env.DESIGN_PREVIEW_URL || 'http://127.0.0.1:5188'}${path}`);
    const cards = page.locator('[data-queue-patient-card]');
    await cards.first().waitFor();
    assert.equal(await cards.count(), 5);
    await page.evaluate(() => document.fonts.ready);
    await cards.first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: `outputs/compact-queue-cards/${path.slice(1)}-${theme}-${width}.png`, fullPage: true });
    if (width < 768) {
      const short = await cards.first().boundingBox();
      const grid = await page.locator('.queue-workspace-list').boundingBox();
      assert(short.width <= (grid.width - 6) / 2 + 1, 'Two cards share each mobile row');
      const long = await cards.nth(1).boundingBox();
      assert(Math.abs(short.y - long.y) <= 1 && Math.abs(short.x - long.x) > 1, 'First two patients are side by side');
      const actions = await cards.first().locator('.queue-patient-actions button').evaluateAll(nodes => nodes.filter(node => node.getClientRects().length).map(node => node.getBoundingClientRect().top));
      assert.equal(new Set(actions).size, 1, 'Primary commands share one compact row');
      const framePadding = await page.locator('.queue-patient-frame-body').evaluate(node => getComputedStyle(node).padding);
      assert.equal(framePadding, '0px', 'No nested frame padding on mobile');
      for (const button of await cards.first().getByRole('button').all()) {
        const box = await button.boundingBox();
        if (!box) continue;
        assert(box.width >= 44 && box.height >= 44, 'Preserve touch targets');
      }
      assert.equal(await cards.first().locator('.queue-patient-actions button:visible').count(), 3);
      const compact = await page.locator('[data-patient-id="999994"]').boundingBox();
      assert(compact.height <= 140, 'Short cards without a clinic have no padded empty body');
      assert.equal(await cards.first().locator('.queue-patient-service-rail small').innerText(), 'عيادة ١');
      assert.equal(await page.locator('[data-patient-id="999992"] .queue-patient-service-rail small').innerText(), 'عيادة ٢');
      assert.equal(await page.locator('[data-patient-id="999993"] .queue-patient-service-rail small').innerText(), 'بنتاكام');
      assert.equal(await cards.first().locator('.queue-patient-service-rail > span').evaluate(el => getComputedStyle(el).display), 'flex');
      await cards.first().getByRole('button', { name: 'المزيد من إجراءات المريض' }).click();
      for (const label of ['طباعة روشتة', 'طباعة طلب تحاليل', 'طباعة مقاس النظارة', 'حذف المريض']) {
        assert.equal(await page.getByRole('menuitem', { name: label, exact: true }).count(), 1);
      }
      await page.keyboard.press('Escape');
      await page.getByRole('menu').waitFor({ state: 'hidden' });
      const specialist = page.locator('[data-patient-id="999992"]');
      await specialist.getByRole('button', { name: 'المزيد من إجراءات المريض' }).click();
      assert.equal(await page.getByRole('menuitem', { name: 'تحديد كمعالج', exact: true }).count(), 1);
      await page.keyboard.press('Escape');
      await page.getByRole('menu').waitFor({ state: 'hidden' });
      await page.evaluate(() => { window.__queuePrintUrls = []; window.open = url => { window.__queuePrintUrls.push(String(url)); return null; }; });
      for (const [label, route] of [['طباعة روشتة', '/prescription/999991'], ['طباعة طلب تحاليل', '/request-tests/999991'], ['طباعة مقاس النظارة', '/refraction/999991']]) {
        await page.locator('[data-patient-id="999991"]').getByRole('button', { name: 'المزيد من إجراءات المريض' }).click();
        await page.getByRole('menuitem', { name: label, exact: true }).click();
        await page.getByRole('menu').waitFor({ state: 'hidden' });
        const opened = await page.evaluate(() => window.__queuePrintUrls.at(-1));
        const url = new URL(opened, page.url());
        assert.equal(url.pathname, route);
        assert.match(url.searchParams.get('visitDate'), /^\d{4}-\d{2}-\d{2}$/);
      }
    } else {
      assert.equal(await cards.first().locator('.queue-patient-service-rail').isVisible(), false);
      assert.equal(await cards.first().getByRole('button', { name: 'طباعة روشتة', exact: true }).isVisible(), true);
      assert.equal(await cards.first().getByRole('button', { name: 'المزيد من إجراءات المريض' }).count(), 0);
    }
    const colors = await page.locator('[data-service-type]:not([data-service-type="unknown"])').evaluateAll(nodes => nodes.map(el => getComputedStyle(el).backgroundColor));
    assert.equal(new Set(colors).size, 4, 'Four service color families');
    const layout = await inspectLayout(page);
    assert.equal(layout.overflow, false);
    assert.deepEqual(layout.collisions, [], `${path} ${width}: text collision`);
    assert.deepEqual(layout.clippedButtons, [], `${path} ${width}: clipped controls`);
    assert.equal(await page.locator('[data-patient-id="999991"]').getByRole('button', { name: 'فتح مسار الزيارة', exact: true }).count(), 1, `${path} ${theme} ${width}: visit control`);
    assert.equal(await page.locator('[data-patient-id="999993"]').getByRole('button', { name: 'فتح مسار الزيارة', exact: true }).count(), 0);
    await cards.first().getByRole('button', { name: 'طباعة الشيتات والتقارير', exact: true }).click();
    await page.getByRole('menu').waitFor();
    await page.keyboard.press('Escape');
    await page.locator('[role="menu"]').waitFor({ state: 'hidden' });
    await page.screenshot({ path: `outputs/compact-queue-cards/${path.slice(1)}-${theme}-${width}.png`, fullPage: true });
    if (width < 768) {
      await page.getByRole('button', { name: /^معالج/ }).click();
      assert.equal(await cards.count(), 2);
      for (const card of await cards.all()) assert((await card.boundingBox()).height <= 140, 'Treated card stays compact');
      await page.screenshot({ path: `outputs/compact-queue-cards/${path.slice(1)}-treated-${theme}-${width}.png`, fullPage: true });
    }
    assert.deepEqual(errors, []);
    await page.close();
    cases++;
  }
} finally { await browser.close(); }
console.log(`Passed ${cases} compact queue route/theme/viewport cases, print menu and visit controls. No patient writes.`);
