import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseURL = process.env.DESIGN_PREVIEW_URL || "http://127.0.0.1:5174";
const output = path.resolve("outputs/antislop-verification");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const results = [];
try {
  for (const theme of ["light", "dark"]) {
    for (const width of [360, 768, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.addInitScript((value) => localStorage.setItem("theme", value), theme);
      const page = await context.newPage();
      const errors = [];
      let authenticatedFixture = false;
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/api/**", async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === "/api/auth/login") {
          await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "تعذر تسجيل الدخول. راجع اسم المستخدم وكلمة المرور." }) });
          return;
        }
        const methods = url.pathname.split("/api/trpc/")[1]?.split(",") ?? [""];
        const responses = methods.map((method) => ({ result: { data: { json:
          method === "auth.me" ? authenticatedFixture ? { id: 999999, role: "admin", name: "اختبار التصميم", username: "design-check" } : null
          : method === "medical.getOpsHealth" ? { dbConnected: true, tunnelConnected: true, patientsCount: 12 }
          : method === "patient.getPatient" ? { id: 999999, fullName: "مريض اختبار التصميم ذو الاسم الطويل للتحقق من التفاف النص", age: 45 }
          : method === "medical.getVisitsByPatient" ? [{ id: 900002, patientId: 999999, visitDate: "2026-10-02", visitType: "كشف" }, { id: 900001, patientId: 999999, visitDate: "2026-10-01", visitType: "متابعة" }]
          : ["accounting.dashboardSummary", "accounting.accLedgerSummary"].includes(method) ? null
          : []
        } } }));
        await route.fulfill({ contentType: "application/json", body: JSON.stringify(url.searchParams.has("batch") ? responses : responses[0]) });
      });
      await page.goto(baseURL);
      await page.locator("#username").waitFor();
      await page.evaluate(() => document.fonts.ready);
      const dimensions = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
      assert.ok(dimensions.content <= dimensions.viewport, `Overflow at ${width}/${theme}`);
      const toggle = page.getByRole("button", { name: "إظهار كلمة المرور" });
      await toggle.focus();
      await page.keyboard.press("Enter");
      assert.equal(await page.locator("#password").getAttribute("type"), "text");
      await page.getByRole("button", { name: "إخفاء كلمة المرور" }).click();
      assert.equal(await page.locator("#password").getAttribute("type"), "password");
      await page.locator("#username").fill("design-check");
      await page.locator("#password").fill("preview-only");
      const remember = page.getByRole("checkbox", { name: "تذكرني" });
      await remember.uncheck();
      assert.equal(await remember.isChecked(), false);
      await page.getByRole("button", { name: "دخول إلى النظام" }).click();
      await page.getByText("تعذر تسجيل الدخول. راجع اسم المستخدم وكلمة المرور.").waitFor();
      assert.equal(await page.locator("#username").inputValue(), "design-check");
      assert.equal(await page.getByRole("link", { name: "دخول المريض" }).getAttribute("href"), "/my/login");
      assert.equal(await page.getByRole("link", { name: "دخول الطبيب" }).getAttribute("href"), "/doctor-portal/login");
      const target = await page.getByRole("button", { name: "دخول إلى النظام" }).boundingBox();
      assert.ok(target.height >= 44);
      const logo = await page.locator("header img").evaluate((image) => image.complete && image.naturalWidth > 0);
      assert.ok(logo, "Brand logo must render");
      const contrast = await page.getByRole("button", { name: "دخول إلى النظام" }).evaluate((element) => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext("2d");
        const luminance = (color) => {
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, 1, 1);
          const rgb = [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).map((v) => {
            const c = v / 255;
            return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          });
          return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
        };
        const style = getComputedStyle(element);
        const fg = luminance(style.color), bg = luminance(style.backgroundColor);
        return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
      });
      assert.ok(contrast >= 4.5, `Submit contrast ${contrast} at ${width}/${theme}`);
      assert.deepEqual(errors, []);
      await page.screenshot({ path: path.join(output, `login-${theme}-${width}.png`), fullPage: true });
      results.push({ theme, width, overflow: false, submitContrast: contrast, passwordToggle: "keyboard and click PASS", remember: "PASS", loginError: "mocked response PASS", portalLinks: "href inspection only", logo: "PASS", errors });
      authenticatedFixture = true;
      await page.goto(`${baseURL}/admin-hub`);
      await page.getByRole("heading", { name: "مركز الإدارة والتحكم" }).waitFor();
      const search = page.getByRole("textbox", { name: "بحث في أدوات الإدارة" });
      await search.fill("no-matching-design-tool");
      await page.getByText("لا توجد أدوات مطابقة للبحث.").waitFor();
      await search.fill("");
      await page.getByText("مرضى اليوم:", { exact: false }).waitFor();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Admin overflow at ${width}/${theme}`);
      assert.deepEqual(errors, []);
      await page.screenshot({ path: path.join(output, `admin-${theme}-${width}.png`), fullPage: true });
      results.push({ view: "admin", theme, width, data: "isolated fixture", searchEmptyState: "PASS", overflow: false, errors });
      for (const [view, routePath] of [["accounting", "/accounting/advances"], ["payroll", "/salary/payroll"], ["patient", "/patient-hub/visits/999999"]]) {
        await page.goto(`${baseURL}${routePath}`);
        if (view === "accounting") {
          await page.getByText("تعذر التحميل", { exact: true }).first().waitFor();
        } else if (view === "payroll") {
          const section = page.getByRole("group", { name: "قسم المرتبات" });
          await section.waitFor();
          const clinic = section.getByRole("button", { name: "عيادة", exact: true });
          await clinic.click();
          assert.equal(await clinic.getAttribute("aria-pressed"), "true");
          await page.getByLabel("الشهر", { exact: true }).selectOption("2");
          assert.equal(await page.getByLabel("الشهر", { exact: true }).inputValue(), "2");
        } else {
          await page.getByText("مريض اختبار التصميم ذو الاسم الطويل للتحقق من التفاف النص", { exact: true }).first().waitFor();
          const older = page.getByRole("button", { name: "زيارة أقدم" });
          await older.click();
          await page.waitForURL(/visitId=900001/);
          if (width === 360) {
            await page.getByRole("button", { name: "المزيد", exact: true }).last().click();
            await page.getByRole("dialog").waitFor();
            await page.keyboard.press("Escape");
            await page.getByRole("dialog").waitFor({ state: "hidden" });
          }
        }
        await page.evaluate(() => document.fonts.ready);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${view} overflow at ${width}/${theme}`);
        assert.deepEqual(errors, []);
        await page.screenshot({ path: path.join(output, `${view}-${theme}-${width}.png`), fullPage: true });
        results.push({ view, theme, width, data: "isolated fixtures", overflow: false, interactions: "PASS", errors });
      }
      await page.goto(`${baseURL}/admin-hub`);
      await page.getByRole("heading", { name: "مركز الإدارة والتحكم" }).waitFor();
      if (width === 360) {
        await page.addStyleTag({ url: `${baseURL}/src/styles/mobile.css?direct` });
        await page.addStyleTag({ url: `${baseURL}/src/styles/design-system.css?direct` });
        await page.evaluate(() => document.fonts.ready);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Native CSS overflow/${theme}`);
        const table = await page.evaluate(() => {
          const wrapper = document.createElement("div");
          wrapper.className = "overflow-x-auto";
          wrapper.innerHTML = "<table><tbody><tr>" + Array.from({ length: 8 }, (_, i) => `<td>التاريخ وبيان الاختبار ${i}</td>`).join("") + "</tr></tbody></table>";
          document.querySelector("main").append(wrapper);
          const cell = wrapper.querySelector("td");
          const grid = wrapper.querySelector("table");
          const result = { overflow: getComputedStyle(wrapper).overflowX, fontSize: parseFloat(getComputedStyle(cell).fontSize), whiteSpace: getComputedStyle(cell).whiteSpace, tableWidth: grid.getBoundingClientRect().width, tableMaxWidth: getComputedStyle(grid).maxWidth, wrapperWidth: wrapper.clientWidth, scrollWidth: wrapper.scrollWidth, scrollable: wrapper.scrollWidth > wrapper.clientWidth };
          wrapper.remove();
          return result;
        });
        assert.equal(table.overflow, "auto");
        assert.ok(table.fontSize >= 14 && table.scrollable, `Wide native tables must scroll with readable text: ${JSON.stringify(table)}`);
        await page.screenshot({ path: path.join(output, `admin-native-css-${theme}-360.png`), fullPage: true });
        results.push({ view: "admin", platform: "native stylesheet browser simulation, not device execution", theme, width, table, errors });
      }
      await context.close();
    }
  }
  await writeFile(path.join(output, "results.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
