import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { inspectLayout } from './lib/layout-scan.mjs';

await mkdir('outputs/archive-mobile', { recursive: true });
const patients = [{ id: 991, patientCode: '0001', fullName: 'مريض تجريبي باسم طويل للتحقق من التفاف النص', phone: '01000000001', doctorName: 'د. طبيب تجريبي', dateOfBirth: '1988-01-01', gender: 'male', lastVisit: '2026-10-17', createdAt: '2026-01-01', services: [{ id: 1, serviceName: 'خدمة تجريبية باسم طويل', serviceDate: '2026-10-17' }] }];
const operations = [{ id: 1, patientId: 991, patientCode: '0001', patientFullName: patients[0].fullName, operationType: 'PRK', operationDate: '2026-10-17', eye: 'OU', doctorName: 'د. طبيب تجريبي', source: 'manual', notes: 'ملاحظات تجريبية طويلة للتحقق من ظهور كل البيانات دون قص' }];
const reference = [{ id: 991, patientCode: '0001', fullName: patients[0].fullName, sphereOD: '-0.25', cylinderOD: '-1.00', axisOD: '90', sphereOS: '0', cylinderOS: '-1.00', axisOS: '180', k1OD: '42', k2OD: '44', thicknessOD: '550', k1OS: '43', k2OS: '45', thicknessOS: '551', diagnosis: 'نص تجريبي طويل للتحقق من قراءة البيانات كاملة على شاشة الموبايل', operationType: 'PRK', lastVisit: '2026-10-17' }];
const counts = ['PRK', 'Lasik', 'FL', 'FS', 'IOL', 'ICL', 'Cataract', 'Squint', 'Others'].map((operationType, i) => ({ operationType, count: i + 1 }));
const browser = await chromium.launch({ executablePath: 'C:/Users/SELRS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
const state = process.env.ARCHIVE_STATE || 'ready';
let cases = 0;
try {
  for (const width of (state === 'ready' ? [320, 390, 768, 1440] : [390])) for (const theme of (state === 'ready' ? ['light', 'dark'] : ['light'])) for (const tab of ['patients', 'operations', 'reference']) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(theme => localStorage.setItem('theme', theme), theme);
    await page.route('**/api/**', async route => {
      assert.equal(route.request().method(), 'GET', 'No patient or operation writes');
      const u = new URL(route.request().url()); requests.push(u.toString());
      const results = (u.pathname.split('/api/trpc/')[1]?.split(',') || []).map(method => state === 'error' && ['legacyPatients.search', 'opHistory.getTypeCounts', 'opHistory.listByType', 'medical.searchMedicalReference'].includes(method) ? { error: { json: { message: 'Fixture unavailable', code: -32603, data: { code: 'INTERNAL_SERVER_ERROR', httpStatus: 500 } } } } : ({ result: { data: { json:
        method === 'auth.me' ? { id: 99999, role: 'admin', name: 'Test' }
        : method === 'legacyPatients.search' ? { patients: state === 'empty' ? [] : patients }
        : method === 'opHistory.getTypeCounts' ? state === 'empty' ? [] : counts
        : method === 'opHistory.listByType' ? { rows: state === 'empty' ? [] : operations }
        : method === 'medical.searchMedicalReference' ? { rows: state === 'empty' ? [] : reference, total: state === 'empty' ? 0 : 1 }
        : method.includes('getSystemSetting') ? null : []
      } } }));
      await route.fulfill({ json: u.searchParams.has('batch') ? results : results[0] });
    });
    await page.goto(`${process.env.DESIGN_PREVIEW_URL || 'http://127.0.0.1:5196'}/archive?tab=${tab}`);
    if (state !== 'ready') {
      if (state === 'error') await page.locator('.archive-page [role="alert"]').first().waitFor();
      else await page.getByText(/لا توجد/).first().waitFor();
      const layout = await inspectLayout(page);
      assert.equal(layout.overflow, false);
      assert.deepEqual(layout.collisions, []);
      assert.deepEqual(layout.clippedButtons, []);
      await page.screenshot({ path: `outputs/archive-mobile/${tab}-${state}.png`, fullPage: true });
      assert.deepEqual(errors, []);
      await page.close(); cases++; continue;
    }
    const table = page.locator(`[data-archive-records="${tab}"]`);
    await table.locator('tbody tr').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `outputs/archive-mobile/${tab}-${theme}-${width}.png`, fullPage: true });
    const layout = await inspectLayout(page);
    assert.equal(layout.overflow, false, `${tab} ${width}: page overflow`);
    assert.deepEqual(layout.collisions, [], `${tab} ${width}: text collision`);
    assert.deepEqual(layout.clippedButtons, [], `${tab} ${width}: clipped controls`);
    assert.equal(await table.locator('tbody tr').count(), 1);
    if (width < 768) {
      assert.equal(await table.evaluate(el => getComputedStyle(el).display), 'block');
      assert.equal(await table.locator('tbody tr').evaluate(el => getComputedStyle(el).display), 'grid');
      const scrollLeaks = await page.locator('.archive-page [data-slot="table-container"], .archive-page .overflow-x-auto').evaluateAll(nodes => nodes.filter(el => el.scrollWidth > el.clientWidth + 2).map(el => el.className));
      assert.deepEqual(scrollLeaks, [], JSON.stringify(await table.evaluate(el => [el, el.querySelector('tbody'), el.querySelector('tbody tr'), ...el.querySelectorAll('tbody td')].map(n => ({ tag: n.tagName, width: n.getBoundingClientRect().width, min: getComputedStyle(n).minWidth, display: getComputedStyle(n).display, columns: getComputedStyle(n).gridTemplateColumns })))));
      for (const td of await table.locator('tbody td').all()) assert(await td.getAttribute('data-label'), 'Each mobile value is labelled');
      if (tab === 'operations') {
        assert.equal(await page.locator('.archive-operation-type-button:visible').count(), 0);
        await page.getByRole('combobox', { name: 'نوع العملية', exact: true }).click();
        await page.getByRole('option').filter({ hasText: '(ICL)' }).click();
        await page.waitForTimeout(200);
        assert(requests.some(url => decodeURIComponent(url).includes('ICL')), 'Type filter reaches the query');
      }
      if (tab === 'reference') {
        const min = await page.getByRole('spinbutton', { name: 'الحد الأدنى للشرط 1' }).boundingBox();
        const max = await page.getByRole('spinbutton', { name: 'الحد الأقصى للشرط 1' }).boundingBox();
        assert(Math.abs(min.y - max.y) < 2, 'Range fields share a row');
        await page.getByRole('button', { name: 'إضافة شرط', exact: true }).click();
        assert.equal(await page.locator('.archive-criterion').count(), 2);
        await page.getByRole('button', { name: 'حذف الشرط', exact: true }).last().click();
        assert.equal(await page.locator('.archive-criterion').count(), 1);
        await page.getByRole('button', { name: 'طول نظر', exact: true }).click();
        assert.equal(await page.getByRole('spinbutton', { name: 'الحد الأدنى للشرط 1' }).inputValue(), '0.25');
      }
    } else {
      assert.equal(await table.evaluate(el => getComputedStyle(el).display), 'table', 'Desktop retains the table');
      if (tab === 'operations') assert.equal(await page.locator('.archive-operation-type-button:visible').count(), 9);
    }
    await page.emulateMedia({ media: 'print' });
    const printed = await table.evaluate(el => {
      const read = () => [getComputedStyle(el).display, getComputedStyle(el.querySelector('tbody tr')).display, getComputedStyle(el.querySelector('thead')).clipPath];
      const current = read();
      const sheets = [...document.styleSheets].filter(sheet => sheet.ownerNode?.dataset?.viteDevId?.includes('/archive-mobile.css'));
      sheets.forEach(sheet => { sheet.disabled = true; });
      const original = read();
      sheets.forEach(sheet => { sheet.disabled = false; });
      return { current, original };
    });
    assert.deepEqual(printed.current, printed.original, 'Print layout remains unchanged');
    assert.equal(printed.current[2], 'none', 'Print column headings remain visible');
    assert.deepEqual(errors, []);
    await page.close(); cases++;
  }
} finally { await browser.close(); }
console.log(`Passed ${cases} archive ${state} cases: mobile layout, filters, desktop and print. No data writes.`);
