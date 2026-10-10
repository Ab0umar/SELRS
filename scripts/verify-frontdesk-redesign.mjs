import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const output = 'outputs/frontdesk-redesign';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
let cases = 0;
try {
  for (const theme of ['light', 'dark']) for (const width of [320, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    await context.addInitScript(theme => localStorage.setItem('theme', theme), theme);
    const page = await context.newPage();
    const errors = [];
    let state = 'populated', role = 'admin';
    page.on('pageerror', error => errors.push(error.message));
    await page.routeWebSocket('**/ws', socket => socket.onMessage(() => {}));
    await page.route('**/api/**', async route => {
      assert.equal(route.request().method(), 'GET', 'Visual checks must not mutate patient or booking data');
      const url = new URL(route.request().url());
      const responses = (url.pathname.split('/api/trpc/')[1]?.split(',') ?? []).map(method => {
        if (method === 'patientPortal.listBookings' && state === 'error') return { error: { json: { message: 'Isolated fixture failure', code: -32603, data: { code: 'INTERNAL_SERVER_ERROR', httpStatus: 500 } } } };
        const data = method === 'auth.me' ? { id: 999999, role, name: 'اختبار معزول' }
          : method === 'medical.getMyPermissions' ? ['/accounting', '/stockroom']
            : method === 'patientPortal.listBookings' ? state === 'empty' ? [] : [{ id: 999999, patientId: null, guestName: 'حجز اختبار معزول', guestPhone: '01000000000', patientName: null, patientCode: null, patientPhone: null, bookingType: 'consultant', requestedDate: '2026-10-09', confirmedDate: null, status: 'pending', staffNotes: null, notes: null, typeLabel: 'إستشاري', isGuest: true, createdAt: '2026-10-09', branch: 'tanta' }]
              : method === 'medical.getTodayPatientsByQueueStatus' ? []
                : method === 'medical.getTodayOperationLists' ? []
                  : method === 'stockroom.getReports' ? { inventory: [] }
                    : method.includes('getSystemSetting') ? null : [];
        return { result: { data: { json: data } } };
      });
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(url.searchParams.has('batch') ? responses : responses[0]) });
    });
    const base = process.env.DESIGN_PREVIEW_URL || 'http://127.0.0.1:5182';
    const check = async name => {
      await page.waitForTimeout(200);
      assert.deepEqual(errors, [], name);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${name}: overflow`);
      const contrast = await page.locator('.main-home-focused h1, .main-home-focused .home-section-item p, .dashboard-workspace > div > h1, .portal-bookings-workspace h1').evaluateAll(nodes => {
        const ctx = document.createElement('canvas').getContext('2d');
        const luminance = color => {
          ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1);
          const channels = [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).map(value => {
            const c = value / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          });
          return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
        };
        return nodes.filter(node => node.getBoundingClientRect().width > 0).map(node => {
          let parent = node;
          while (parent.parentElement && ['transparent', 'rgba(0, 0, 0, 0)'].includes(getComputedStyle(parent).backgroundColor)) parent = parent.parentElement;
          const a = luminance(getComputedStyle(node).color), b = luminance(getComputedStyle(parent).backgroundColor);
          return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        });
      });
      assert(contrast.every(ratio => ratio >= 4.5), `${name}: text contrast ${contrast}`);
      await page.screenshot({ path: `${output}/${name}-${theme}-${width}.png`, fullPage: true });
      cases++;
    };
    for (role of ['admin', 'staff']) {
      await page.goto(`${base}/home`);
      const home = page.locator('.main-home-focused');
      await home.locator('.home-section-item').first().waitFor();
      assert.equal(await home.locator('h1').evaluate(node => getComputedStyle(node).position), 'static');
      if (role === 'staff') assert.deepEqual((await home.locator('.home-section-item h3').allTextContents()).sort(), ['الحساب', 'الحسابات', 'المخزن'].sort());
      else {
        await home.getByRole('button', { name: /الموظفين/ }).click();
        await page.getByRole('menuitem', { name: 'الحضور', exact: true }).waitFor();
        await page.keyboard.press('Escape');
      }
      await check(`home-${role}`);
    }
    role = 'admin';
    await page.evaluate(theme => { localStorage.clear(); localStorage.setItem('theme', theme); }, theme);
    await page.goto(`${base}/dashboard`);
    const tabs = page.locator('[role="tablist"][aria-label="أقسام لوحة التحكم"]');
    await tabs.waitFor({ timeout: 15000 }).catch(async error => {
      console.log('Dashboard load failure:', page.url(), errors, (await page.locator('body').innerText()).slice(0, 1400));
      throw error;
    });
    await tabs.locator('#dashboard-tab-today').focus();
    await page.keyboard.press('ArrowLeft');
    assert.equal(await tabs.locator('#dashboard-tab-hub').getAttribute('aria-selected'), 'true');
    for (const id of ['today', 'hub', 'accounting', 'attendance', 'stockroom', 'bookings', 'admin']) {
      await tabs.locator(`#dashboard-tab-${id}`).click();
      await page.locator(`#dashboard-panel-${id}`).waitFor();
      await check(`dashboard-${id}`);
    }
    for (state of ['populated', 'empty', 'error']) {
      await page.goto(`${base}/dashboard?tab=bookings`);
      await page.locator('#dashboard-tab-bookings').click();
      const bookings = page.locator('.portal-bookings-workspace');
      await bookings.waitFor();
      if (state === 'error') await bookings.getByText('تعذر تحميل الحجوزات', { exact: true }).waitFor();
      else if (state === 'empty') await bookings.getByText('لا توجد حجوزات بعد', { exact: true }).waitFor();
      else {
        await bookings.getByText('حجز اختبار معزول', { exact: true }).first().waitFor();
        await bookings.getByRole('textbox', { name: 'البحث في الحجوزات', exact: true }).fill('no-match');
        await bookings.getByText('لا توجد حجوزات مطابقة', { exact: true }).waitFor();
        await bookings.getByRole('textbox', { name: 'البحث في الحجوزات', exact: true }).fill('');
      }
      await check(`bookings-${state}`);
      if (state === 'error') {
        state = 'populated';
        await bookings.getByRole('button', { name: 'إعادة المحاولة', exact: true }).click();
        await bookings.getByText('حجز اختبار معزول', { exact: true }).first().waitFor();
      }
    }
    await context.close();
  }
} finally { await browser.close(); }
console.log(`Passed ${cases} frontdesk theme/viewport/state cases with no mutations.`);
