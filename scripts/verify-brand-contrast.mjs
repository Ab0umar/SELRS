import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const BASE = process.env.DESIGN_PREVIEW_URL || "http://127.0.0.1:5177";
const NATIVE = process.env.EMULATE_NATIVE === "1";
const executablePath =
  process.env.CHROMIUM_PATH ||
  "C:/Users/SELRS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe";
const PAGES = ["/home", "/attendance", "/accounting", "/salary"];
const fixtures = {
  "auth.me": { id: 999999, role: "admin", name: "اختبار واجهة" },
  "attendance.dashboardSummary": {
    presentToday: 0, absentToday: 0, lateToday: 0, presentNow: 0,
    missingCheckoutYesterday: 0, shifts: [],
  },
  "salary.monthSummary": { staffCount: 3, finalCount: 1, totalPay: 24000, totalCommissions: 3200, totalPenalties: 100 },
};

const browser = await chromium.launch({ executablePath });
const failures = [];
let cases = 0;
try {
  for (const theme of ["light", "dark"])
    for (const width of [360, 1440])
      for (const path of PAGES) {
        const context = await browser.newContext({ viewport: { width, height: 900 } });
        await context.addInitScript(
          ([t, native]) => {
            localStorage.setItem("theme", t);
          },
          [theme, NATIVE],
        );
        const page = await context.newPage();
        // The native shell loads mobile.css instead of web.css; swap it in so the
        // Android stylesheet is checked without needing the Capacitor plugins.
        if (NATIVE) await page.route(/styles\/web\.css/, (route) => route.continue({ url: route.request().url().replace("styles/web.css", "styles/mobile.css") }));
        await page.route("**/api/**", async (route) => {
          const url = new URL(route.request().url());
          if (!url.pathname.includes("/api/trpc/")) return route.fulfill({ json: { ok: true, files: [], count: 0 } });
          const out = url.pathname.split("/api/trpc/")[1].split(",").map((m) => ({ result: { data: { json: m in fixtures ? fixtures[m] : [] } } }));
          return route.fulfill({ json: url.searchParams.has("batch") ? out : out[0] });
        });
        await page.goto(BASE + path);
        await page.locator(".selrs-app-content, .main-home-library").first().waitFor({ timeout: 30000 });
        await page.waitForTimeout(3000);
        const low = await page.evaluate(() => {
          const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const a = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: a[0], g: a[1], b: a[2], a: a.length > 3 ? a[3] : 1 }; };
          const lum = ({ r, g, b }) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
          const ratio = (x, y) => { const a = lum(x), b = lum(y); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
          const bgOf = (el) => { const layers = []; for (let e = el; e; e = e.parentElement) { const p = parse(getComputedStyle(e).backgroundColor); if (p && p.a > 0) { layers.push(p); if (p.a >= 1) break; } } let cur = layers.length && layers[layers.length - 1].a >= 1 ? layers.pop() : { r: 255, g: 255, b: 255 }; while (layers.length) { const l = layers.pop(); cur = { r: l.r * l.a + cur.r * (1 - l.a), g: l.g * l.a + cur.g * (1 - l.a), b: l.b * l.a + cur.b * (1 - l.a) }; } return cur; };
          const out = [];
          for (const el of document.querySelectorAll("body *")) {
            const text = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim().length > 1).map((n) => n.textContent.trim()).join(" ");
            if (!text) continue;
            const cs = getComputedStyle(el);
            if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity === 0) continue;
            const rect = el.getBoundingClientRect();
            if (rect.width < 2 || rect.height < 2) continue;
            const fg = parse(cs.color); if (!fg) continue;
            const bg = bgOf(el);
            const mixed = { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a) };
            const size = parseFloat(cs.fontSize);
            const need = size >= 24 || (size >= 18.66 && +cs.fontWeight >= 700) ? 3 : 4.5;
            const cr = ratio(mixed, bg);
            if (cr < need) out.push(`${text.slice(0, 24)} ${cr.toFixed(2)}<${need}`);
          }
          return out.slice(0, 5);
        });
        for (const item of low) failures.push(`${theme} ${width} ${path} text ${item}`);
        // keyboard focus ring must be visible against its own surface
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");
        const ring = await page.evaluate(() => {
          const el = document.activeElement; if (!el || el === document.body) return null;
          const cs = getComputedStyle(el);
          const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const a = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: a[0], g: a[1], b: a[2], a: a.length > 3 ? a[3] : 1 }; };
          const lum = ({ r, g, b }) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
          let bg = { r: 255, g: 255, b: 255 };
          for (let e = el; e; e = e.parentElement) { const p = parse(getComputedStyle(e).backgroundColor); if (p && p.a >= 1) { bg = p; break; } }
          const color = parse(cs.outlineColor); const visible = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0;
          if (!visible || !color) return { visible: false, tag: el.tagName };
          const a = lum(color), b = lum(bg);
          return { visible: true, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), tag: el.tagName };
        });
        if (ring && ring.visible && ring.ratio < 3) failures.push(`${theme} ${width} ${path} focus ring ${ring.ratio.toFixed(2)}<3 on ${ring.tag}`);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${path} overflows`);
        cases++;
        await context.close();
      }
} finally {
  await browser.close();
}
assert.deepEqual(failures, [], `Contrast failures:\n${failures.join("\n")}`);
console.log(`Passed ${cases} contrast / focus ring / overflow checks${NATIVE ? " (mobile.css swapped in for web.css)" : ""}.`);
