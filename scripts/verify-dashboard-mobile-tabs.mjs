import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const css = await Promise.all([
  'client/src/components/layout/mobile-brand-canvas.css',
  'client/src/styles/frontdesk-design.css',
].map(path => readFile(path, 'utf8')));
const browser = await chromium.launch({ executablePath: 'C:/Users/SELRS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
try {
  for (const width of [360, 390, 590]) {
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    await page.setContent(`<style>html { --primary:#003d82; --card:white; --border:#ddd; --foreground:#222 } body { margin:0 } button { display:flex; align-items:center; font:14px sans-serif } ${css.join('\n')}</style>
      <div class="selrs-mobile-brand-canvas"><main class="selrs-app-content"><div class="dashboard-workspace" dir="rtl"><div role="tablist" aria-label="أقسام لوحة التحكم">
      ${['لوحة التحكم', 'مركز المريض', 'الحسابات', 'الحضور', 'المخزن', 'الحجوزات', 'الإدارة'].map((label, index) => `<button role="tab" aria-selected="${index === 0}"><span>${label}</span></button>`).join('')}
      </div></div></main></div>`);
    const tabs = page.getByRole('tablist');
    const positions = await tabs.getByRole('tab').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().top));
    assert(positions.every(top => top === positions[0]), 'All seven tabs occupy one row');
    assert.equal(await tabs.evaluate(node => getComputedStyle(node).display), 'flex');
    if (width < 500) assert(await tabs.evaluate(node => node.scrollWidth > node.clientWidth), 'Tab strip is scrollable when tabs do not fit');
    await tabs.getByRole('tab', { name: 'الإدارة', exact: true }).evaluate(node => node.scrollIntoView({ block: 'nearest', inline: 'nearest' }));
    const final = await tabs.getByRole('tab', { name: 'الإدارة', exact: true }).boundingBox();
    assert(final.x >= -1 && final.x + final.width <= width + 1, 'Last tab is reachable');
    await page.close();
  }
  console.log('All seven dashboard tabs remain in one scrollable row; last tab reachable at 360/390/590px.');
} finally { await browser.close(); }
