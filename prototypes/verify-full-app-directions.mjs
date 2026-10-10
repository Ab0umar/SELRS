import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

await mkdir('outputs/full-app-directions', { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
const url = pathToFileURL('E:/selrs.cc/prototypes/full-app-directions.html').href;
let cases = 0;
try {
  for (const variant of ['a', 'b', 'c']) {
    for (const width of [320, 768, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${url}?variant=${variant}`);
      for (const theme of ['light', 'dark']) {
        if (theme === 'dark') await page.locator('#theme').click();
        for (const module of ['home', 'dashboard', 'patients', 'bookings', 'operations', 'attendance', 'salary', 'accounting', 'stockroom', 'reports', 'settings']) {
          if (width < 850) await page.locator('#mobile-page').selectOption(module);
          else await page.locator(`nav:visible [data-page="${module}"]`).first().click();
          assert.equal(await page.locator('h1').count(), 1);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${variant}/${width}/${theme}/${module} overflow`);
          if (['home', 'bookings', 'accounting'].includes(module)) await page.screenshot({ path: `outputs/full-app-directions/${variant}-${module}-${theme}-${width}.png`, fullPage: true });
          if (!['home', 'settings'].includes(module)) {
            for (const state of ['empty', 'loading', 'error']) {
              await page.locator('#view-state').selectOption(state);
              await page.locator('.state-message').waitFor();
              assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
              await page.locator('[data-restore]').click();
            }
            await page.locator('#record-search').fill('no-matching-demo-record');
            await page.getByRole('heading', { name: 'No matching records' }).waitFor();
            await page.locator('[data-clear]').click();
            await page.locator('[data-record]').first().click();
            await page.locator('#dialog').waitFor();
            await page.keyboard.press('Escape');
            assert.equal(await page.locator('#dialog').evaluate(el => el.open), false);
          }
          cases++;
        }
        const ratios = await page.evaluate(() => {
          const style = getComputedStyle(document.body);
          const rgb = value => {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 1;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = value; ctx.fillRect(0, 0, 1, 1);
            return Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3);
          };
          const luminance = color => rgb(color).map(c => c / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4).reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i], 0);
          return [['--ink', '--paper'], ['--muted', '--paper'], ['--muted', '--canvas'], ['--ink', '--selected'], ['--on-accent', '--accent'], ['--rail-text', '--rail']].map(([foreground, background]) => {
            const a = luminance(style.getPropertyValue(foreground).trim()), b = luminance(style.getPropertyValue(background).trim());
            return { foreground, background, ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
          });
        });
        assert(ratios.every(pair => pair.ratio >= 4.5), JSON.stringify({ variant, theme, ratios }));
      }
      await page.locator('[data-new]').click();
      await page.locator('#booking-form [name="patient"]').fill('Demo patient test');
      await page.locator('#booking-form [name="time"]').fill('15:20');
      await page.getByRole('button', { name: 'Add to demo book' }).click();
      await page.getByText('Demo patient test', { exact: true }).waitFor();
      await page.locator('#global-search').fill('accounting');
      await page.locator('#global-search').press('Enter');
      await page.getByRole('heading', { name: 'Accounting register', exact: true }).waitFor();
      await page.locator('#branch').selectOption('Kafr El Sheikh center');
      await page.locator('#design-info').click();
      assert.equal(await page.locator('.design-notes').evaluate(el => el.open), true);
      await page.locator('.direction-bar [data-cycle="1"]').click();
      assert.equal(await page.locator('body').getAttribute('data-design'), { a: 'b', b: 'c', c: 'a' }[variant]);
      assert.deepEqual(errors, []);
      await page.close();
    }
  }
  console.log(`Passed ${cases} module/theme/viewport cases, data states, search, record dialogs, demo booking creation, and palette contrast.`);
} finally {
  await browser.close();
}
