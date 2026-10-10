import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(pathToFileURL('E:/selrs.cc/prototypes/full-app-directions.html').href + '?variant=b');
  const navigate = id => page.locator(`nav:visible [data-page="${id}"]`).first().click();
  for (const id of ['patients', 'accounting', 'stockroom']) {
    await navigate(id);
    await page.locator('[data-new]').click();
    await page.locator('#dialog form input').first().fill(id === 'patients' ? 'Demo patient check' : '12');
    if (id === 'accounting') await page.locator('#dialog form input').last().fill('Demo entry description');
    await page.locator('#dialog form button').last().click();
    assert.equal(await page.locator('#dialog').evaluate(el => el.open), false);
  }
  await navigate('settings');
  await page.locator('#settings-form select').selectOption('Kafr El Sheikh center');
  await page.locator('#settings-form textarea').fill('Preview feedback');
  await page.locator('#settings-form button').click();
  assert.equal(await page.locator('#branch').inputValue(), 'Kafr El Sheikh center');
  await navigate('salary');
  await page.locator('[data-new]').click();
  await page.locator('#dialog [data-page="attendance"]').click();
  assert.equal(await page.locator('#dialog').evaluate(el => el.open), false);
  await page.locator('[data-new]').click();
  assert.equal(await page.locator('#scope').inputValue(), 'review');
  await navigate('reports');
  await page.locator('[data-new]').click();
  await page.keyboard.press('Escape');
  await navigate('patients');
  await page.locator('[data-record]').first().click();
  await page.locator('[data-demo-review]').click();
  await page.locator('.direction-bar [data-cycle="-1"]').click();
  await page.keyboard.press('ArrowRight');
  await page.locator('#global-search').fill('unknown-module');
  await page.locator('#global-search').press('Enter');
  assert.match(await page.locator('#toast').innerText(), /No matching module/);
  await page.screenshot({ path: 'outputs/full-app-directions/b-patients-final-desktop.png', fullPage: true });
  console.log('Forms, preferences, report preview, payroll-to-attendance, review feedback, reverse cycling, and search feedback passed.');
} finally {
  await browser.close();
}
