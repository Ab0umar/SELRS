import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

await mkdir('outputs/full-app-direction-04', { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
let cases = 0;
try {
  for (const width of [320, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL('E:/selrs.cc/prototypes/full-app-direction-04.html').href);
    const navigate = async id => {
      if (width <= 540) await page.locator('#mobile-page').selectOption(id);
      else {
        await page.locator('.menu summary').click();
        await page.locator(`#all-modules [data-page="${id}"]`).click();
      }
    };
    for (const theme of ['light', 'dark']) {
      if (theme === 'dark') await page.locator('#theme').click();
      for (const module of ['home', 'dashboard', 'patients', 'bookings', 'operations', 'attendance', 'salary', 'accounting', 'stockroom', 'reports', 'settings']) {
        await navigate(module);
        assert.equal(await page.locator('h1').count(), 1);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width}/${theme}/${module}`);
        if (['home', 'dashboard', 'bookings', 'patients'].includes(module)) await page.screenshot({ path: `outputs/full-app-direction-04/${module}-${theme}-${width}.png`, fullPage: true });
        if (!['home', 'settings'].includes(module)) {
          for (const state of ['empty', 'loading', 'error']) {
            await page.locator('#state').selectOption(state);
            await page.locator('.message').waitFor();
            await page.locator('[data-restore]').click();
          }
          {
            await page.locator('#search').fill('no-matching-record');
            await page.getByRole('heading', { name: 'No matching records.' }).waitFor();
            await page.locator('[data-clear]').click();
          }
        }
        if (['patients', 'accounting', 'stockroom', 'attendance', 'salary', 'operations'].includes(module)) {
          await page.locator('[data-record]').first().click();
          await page.locator('.inline-detail').waitFor();
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
          await page.locator('[data-feedback]').click();
          await page.locator('.inline-detail [data-record]').click();
        }
        cases++;
      }
    }
    await navigate('bookings');
    await page.locator('[data-action]').click();
    await page.locator('[name="patient"]').fill('Demo patient test');
    await page.locator('[name="time"]').fill('15:20');
    await page.getByRole('button', { name: 'Add demo booking' }).click();
    await page.locator('.agenda-entry-mobile:visible, .agenda-entry:visible').filter({ hasText: '15:20 / Demo patient test' }).first().waitFor();
    await page.locator('#design-notes').click();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#dialog').evaluate(el => el.open), false);
    if (width === 1440) {
      for (const module of ['patients', 'accounting', 'stockroom']) {
        await navigate(module);
        await page.locator('[data-action]').click();
        await page.locator('#sample-form input').first().fill('Demo action check');
        if (module !== 'patients') await page.locator('#sample-form input').last().fill('12');
        await page.locator('#sample-form button.primary').click();
        assert.equal(await page.locator('#dialog').evaluate(el => el.open), false);
      }
      await navigate('salary');
      await page.locator('[data-action]').click();
      await page.locator('[data-go-attendance]').click();
      await page.locator('[data-action]').click();
      assert.equal(await page.locator('#search').inputValue(), 'missing');
      await navigate('operations');
      await page.locator('[data-action]').click();
      assert.equal(await page.locator('#search').inputValue(), 'consent');
      await navigate('reports');
      await page.locator('[data-report]').first().click();
      await page.locator('[data-close]').first().click();
      await page.locator('[data-action]').click();
      await page.locator('#scope-form button').click();
      await navigate('settings');
      await page.locator('#preferences select').selectOption('Kafr El Sheikh center');
      await page.locator('#preferences textarea').fill('Preview feedback');
      await page.locator('#preferences button').click();
      assert.equal(await page.locator('#branch').inputValue(), 'Kafr El Sheikh center');
      await navigate('dashboard');
      await page.locator('[data-patient]').first().click();
      await page.locator('.inline-detail').waitFor();
      await navigate('bookings');
      await page.locator('.agenda-entry:visible').first().click();
      await page.locator('[data-close]').first().click();
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log(`Passed ${cases} module/theme/viewport cases, inline records, data states, and local booking creation.`);
} finally {
  await browser.close();
}
