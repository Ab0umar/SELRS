import fs from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';

const root = process.cwd();
const baseUrl = process.env.SELRS_REVIEW_URL || 'http://localhost:4000';
const outDir = path.join(root, '.work', 'previews');
const reportPath = path.join(root, '.work', 'review', 'site-review.json');
const viewports = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'wide', width: 1920, height: 1080 },
];

await fs.mkdir(outDir, { recursive: true });
await fs.mkdir(path.dirname(reportPath), { recursive: true });

const browserPath = process.env.SELRS_BROWSER_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ headless: true, executablePath: browserPath });
const page = await browser.newPage();
const consoleMessages = [];
const requestFailures = [];
page.on('console', (message) => {
  if (message.type() === 'error' || message.type() === 'warning') {
    consoleMessages.push({ type: message.type(), text: message.text() });
  }
});
page.on('requestfailed', (request) => {
  requestFailures.push({ url: request.url(), failure: request.failure()?.errorText || 'unknown' });
});

async function inspectPage(targetPage, url, name, capture = true) {
  await targetPage.goto(url, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 800));
  const metrics = await targetPage.evaluate(() => {
    const rect = document.documentElement.getBoundingClientRect();
    const body = document.body?.getBoundingClientRect();
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const controls = [...document.querySelectorAll('button, a, input, select, textarea')]
      .filter(visible)
      .slice(0, 120)
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        text: (el.innerText || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').trim().slice(0, 100),
        type: el.getAttribute('type'),
        href: el.getAttribute('href'),
        ariaLabel: el.getAttribute('aria-label'),
        title: el.getAttribute('title'),
        width: Math.round(el.getBoundingClientRect().width),
        height: Math.round(el.getBoundingClientRect().height),
      }));
    const headings = [...document.querySelectorAll('h1,h2,h3')].filter(visible).map((el) => el.innerText.trim()).filter(Boolean);
    const images = [...document.images].filter(visible).map((img) => ({ src: img.currentSrc || img.src, alt: img.alt }));
    const focusable = [...document.querySelectorAll('button,a,input,select,textarea,[tabindex]')].filter(visible);
    const mobileNav = document.querySelector('nav[aria-label="التنقل الرئيسي"]');
    const scrollContainer = document.querySelector('[data-app-scroll-container]');
    const rectOf = (el) => el ? (() => { const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height), position: getComputedStyle(el).position }; })() : null;
    return {
      title: document.title,
      url: location.href,
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      viewport: { width: innerWidth, height: innerHeight },
      document: { scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, scrollHeight: document.documentElement.scrollHeight },
      body: { width: Math.round(body?.width || 0), height: Math.round(body?.height || 0) },
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      headings,
      controls,
      images,
      visibleFormControls: focusable.length,
      mobileNav: rectOf(mobileNav),
      scrollContainer: rectOf(scrollContainer),
      unlabeledInputs: [...document.querySelectorAll('input,select,textarea')].filter(visible).filter((el) => {
        const id = el.id;
        return !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby') && !(id && document.querySelector(`label[for="${CSS.escape(id)}"]`));
      }).length,
      unlabeledInputDetails: [...document.querySelectorAll('input,select,textarea')].filter(visible).filter((el) => {
        const id = el.id;
        return !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby') && !(id && document.querySelector(`label[for="${CSS.escape(id)}"]`));
      }).slice(0, 12).map((el) => ({
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute('type'),
        name: el.getAttribute('name'),
        placeholder: el.getAttribute('placeholder'),
        value: el.getAttribute('value'),
      })),
    };
  });
  if (capture) {
    await targetPage.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });
  }
  return metrics;
}

const result = { baseUrl, public: [], authenticated: [], consoleMessages, requestFailures };
for (const viewport of viewports) {
  await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1 });
  result.public.push({ viewport: viewport.name, metrics: await inspectPage(page, `${baseUrl}/login`, `login-${viewport.name}`) });
}

const username = process.env.SELRS_REVIEW_USER;
const password = process.env.SELRS_REVIEW_PASS;
if (username && password) {
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
  const userInput = await page.$('input[autocomplete="username"], input[name="username"], input[type="text"]');
  const passInput = await page.$('input[autocomplete="current-password"], input[name="password"], input[type="password"]');
  if (userInput && passInput) {
    await userInput.click({ clickCount: 3 });
    await userInput.type(username);
    await passInput.click({ clickCount: 3 });
    await passInput.type(password);
    const submit = await page.$('button[type="submit"]');
    if (submit) await submit.click();
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  const authUrl = page.url();
  if (!authUrl.endsWith('/login')) {
    for (const viewport of viewports) {
      await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1 });
      result.authenticated.push({ viewport: viewport.name, metrics: await inspectPage(page, authUrl, `authenticated-${viewport.name}`) });
    }
    result.routes = [];
    for (const route of ['/today', '/workflow', '/patient-hub', '/accounting']) {
      for (const viewport of [viewports[0], viewports[2]]) {
        await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1 });
        result.routes.push({ route, viewport: viewport.name, metrics: await inspectPage(page, `${baseUrl}${route}`, `route-${route.slice(1).replaceAll('/', '-')}-${viewport.name}`) });
      }
    }
    const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => ({ text: (a.innerText || '').trim(), href: a.href })).filter((x) => x.href.startsWith(location.origin)).slice(0, 80));
    result.authenticatedLinks = links;
  } else {
    result.loginAttempt = { success: false, url: authUrl };
  }
}

await fs.writeFile(reportPath, JSON.stringify(result, null, 2), 'utf8');
await browser.close();
console.log(JSON.stringify({ reportPath, publicViewports: result.public.length, authenticatedViewports: result.authenticated.length, loginAttempt: result.loginAttempt || null, consoleErrors: result.consoleMessages.length, requestFailures: result.requestFailures.length }, null, 2));
