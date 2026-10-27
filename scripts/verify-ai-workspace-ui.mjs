import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, expect as baseExpect } from "@playwright/test";

const expect = baseExpect.configure({ timeout: 30000 });
const base = process.env.AI_UI_BASE_URL || "http://127.0.0.1:4000";
const output = "outputs/ai-workspace-ui";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
});
const results = [];
const destinations = [
  ["نظرة عامة", "/ai"],
  ["الرد الآلي والتدريب", "/ai/replies"],
  ["المساعد الطبي", "/ai/medical"],
  ["محتوى التسويق", "/ai/marketing"],
  ["صياغة واتساب", "/ai/whatsapp"],
  ["المزوّدون والحدود", "/ai/settings"],
  ["تجارب الاتصال", "/ai/experiments"],
  ["سجل الاستخدام", "/ai/usage"],
];
try {
  for (const theme of ["light", "dark"])
    for (const width of [360, 768, 1440]) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
      });
      await context.addInitScript(
        (theme) => localStorage.setItem("theme", theme),
        theme,
      );
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      let failStatus = false,
        enabled = true,
        emptyUsage = true,
        saves = 0,
        probes = 0;
      const profiles = [
        "reply.preview",
        "marketing.text",
        "marketing.image",
        "medical.documentation",
        "whatsapp.marketing",
      ].map((workload) => ({
        workload,
        provider: workload === "medical.documentation" ? "manus" : "gemini",
        model:
          workload === "medical.documentation"
            ? "lite"
            : workload === "marketing.image"
              ? "gemini-nano-banana-2.1"
              : "gemini-3.8-flash",
        enabled: true,
        dailyRequests: 10,
        dailyTokens: 100000,
        maxConcurrent: 1,
      }));
      await page.route("**/api/**", async (route) => {
        const request = route.request(),
          url = new URL(request.url());
        if (!url.pathname.includes("/api/trpc/"))
          return route.fulfill({
            contentType: "application/json",
            body: JSON.stringify({ ok: true, version: "ui-verification" }),
          });
        const methods = url.pathname.split("/api/trpc/")[1].split(",");
        const input =
          request.method() === "GET"
            ? JSON.parse(url.searchParams.get("input") || "{}")
            : request.postDataJSON();
        const responses = methods.map((method, index) => {
          const value = input?.[index]?.json ?? input?.json;
          let data = [];
          if (method === "auth.me")
            data = { id: 999999, role: "admin", name: "اختبار واجهة معزول" };
          if (method === "aiManagement.status") {
            if (failStatus)
              return {
                error: {
                  json: {
                    message: "Isolated status failure",
                    code: -32603,
                    data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 },
                  },
                },
              };
            data = {
              enabled,
              marketingDraftAvailable: true,
              whatsappCopyAvailable: true,
              credentials: { gemini: true, replyGemini: true, manus: false },
            };
          }
          if (method === "aiManagement.profiles") data = profiles;
          if (method === "aiManagement.usage")
            data = emptyUsage
              ? []
              : [
                  {
                    request_id: "00000000-0000-4000-8000-000000000001",
                    workload: "marketing.text",
                    provider: "gemini",
                    model: "gemini-3.8-flash",
                    state: "completed",
                    input_tokens: 12,
                    output_tokens: 18,
                    created_ms: 1793010000000,
                  },
                ];
          if (method === "aiManagement.updateProfile") {
            saves++;
            Object.assign(
              profiles.find((profile) => profile.workload === value.workload),
              value,
            );
            data = null;
          }
          if (method === "aiManagement.runSyntheticProbe") {
            probes++;
            data = { state: "completed", output: { ok: true } };
          }
          if (method === "aiManagement.readProbe")
            data = { state: "uncertain" };
          if (
            method.startsWith("autoReply.") ||
            method.startsWith("marketing.")
          )
            return {
              error: {
                json: {
                  message: "Isolated unavailable data",
                  code: -32603,
                  data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 },
                },
              },
            };
          return { result: { data: { json: data } } };
        });
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify(
            url.searchParams.has("batch") ? responses : responses[0],
          ),
        });
      });
      await page.goto(`${base}/admin-hub/ai`);
      await expect(page).toHaveURL(`${base}/ai`);
      const nav = page.getByRole("navigation", {
        name: "أقسام الذكاء الاصطناعي",
        exact: true,
      });
      for (const [label, path] of destinations) {
        await nav.getByRole("link", { name: label, exact: true }).click();
        await expect(page).toHaveURL(`${base}${path}`);
        await expect(
          nav.getByRole("link", { name: label, exact: true }),
        ).toHaveAttribute("aria-current", "page");
        await expect(page.locator("#ai-content")).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${theme}/${width}/${path} overflow`,
        );
      }
      await expect(
        page.getByText("لا توجد طلبات مسجلة. تظهر التجارب هنا بعد تشغيلها."),
      ).toBeVisible();
      await nav
        .getByRole("link", { name: "محتوى التسويق", exact: true })
        .click();
      const marketingNav = page.getByRole("navigation", {
        name: "أقسام محتوى التسويق",
        exact: true,
      });
      for (const path of [
        "/ai/marketing/drafts",
        "/ai/marketing/history",
        "/ai/marketing/brand",
        "/ai/marketing/settings",
        "/ai/marketing/whatsapp",
        "/ai/marketing",
      ]) {
        await marketingNav.locator(`a[href="${path}"]`).click();
        await expect(page).toHaveURL(`${base}${path}`);
        await expect(marketingNav.locator(`a[href="${path}"]`)).toHaveAttribute(
          "aria-current",
          "page",
        );
        await expect(page.locator("#ai-content")).toBeVisible();
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${theme}/${width}/${path} overflow`,
        );
      }
      await page.goto(`${base}/admin-hub/medical-assistant?from=legacy#review`);
      await expect(page).toHaveURL(`${base}/ai/medical?from=legacy#review`);
      await page.goto(`${base}/marketing/drafts`);
      await expect(page).toHaveURL(`${base}/ai/marketing/drafts`);
      await nav
        .getByRole("link", { name: "سجل الاستخدام", exact: true })
        .click();
      emptyUsage = false;
      await page.getByRole("button", { name: "تحديث الحالة" }).click();
      await expect(
        page.getByText("توكنات الإدخال", { exact: true }),
      ).toBeVisible();
      await nav
        .getByRole("link", { name: "المزوّدون والحدود", exact: true })
        .click();
      await page.getByLabel("الحد اليومي للطلبات", { exact: true }).fill("11");
      await page.getByRole("button", { name: "حفظ إعدادات التجربة" }).click();
      await expect(
        page.getByRole("button", { name: "حفظ إعدادات التجربة" }),
      ).toBeDisabled();
      assert.equal(saves, 1);
      await nav
        .getByRole("link", { name: "تجارب الاتصال", exact: true })
        .click();
      await page
        .getByRole("button", { name: "تشغيل تجربة اتصال", exact: true })
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).not.toBeVisible();
      assert.equal(probes, 0);
      await page
        .getByRole("button", { name: "تشغيل تجربة اتصال", exact: true })
        .click();
      await page
        .getByRole("button", { name: "تشغيل التجربة مرة واحدة" })
        .click();
      await expect(
        page.getByText(
          "نجح اختبار النص ببيانات ثابتة. لم تُرسل رسائل للعملاء.",
        ),
      ).toBeVisible();
      assert.equal(probes, 1);
      await page
        .getByLabel("المهمة", { exact: true })
        .selectOption("medical.documentation");
      await expect(
        page.getByText("راجع الاقتراحات الطبية من قسم المساعد الطبي."),
      ).toBeVisible();
      await nav.getByRole("link", { name: "نظرة عامة", exact: true }).click();
      await expect(
        page.getByText("إدارة التجارب متاحة", { exact: true }),
      ).toBeVisible();
      await page.screenshot({
        path: `${output}/${theme}-${width}.png`,
        fullPage: true,
      });
      enabled = false;
      await page.getByRole("button", { name: "تحديث الحالة" }).click();
      await expect(
        page.getByText("إدارة التجارب غير مفعّلة على الخادم", { exact: true }),
      ).toBeVisible();
      failStatus = true;
      await page.reload();
      await expect(
        page.getByRole("alert").filter({ hasText: "تعذر تحميل حالة الموديول" }),
      ).toBeVisible();
      failStatus = false;
      enabled = true;
      await page.getByRole("button", { name: "تحديث الحالة" }).click();
      await expect(
        page.getByText("إدارة التجارب متاحة", { exact: true }),
      ).toBeVisible();
      await page.locator(".ai-skip").focus();
      await page.keyboard.press("Enter");
      await expect(page.locator("#ai-content")).toBeFocused();
      const targets = await nav
        .locator("a")
        .evaluateAll((links) =>
          links.map((link) => link.getBoundingClientRect().height),
        );
      assert.ok(targets.every((height) => height >= 44));
      await page.evaluate(
        () => (document.documentElement.style.fontSize = "200%"),
      );
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        "text resize overflow",
      );
      assert.deepEqual(errors, []);
      await page.goto(`${base}/home`);
      await expect(
        page
          .locator('a[href="/ai"]')
          .filter({ hasText: "الذكاء الاصطناعي" })
          .first(),
      ).toBeVisible();
      results.push({
        theme,
        width,
        navigation: "PASS",
        legacyRedirect: "PASS",
        save: "PASS",
        experiments: "PASS",
        usage: "PASS",
        errorRecovery: "PASS",
        disabled: "PASS",
        keyboard: "PASS",
        textResize: "PASS",
        targets44: "PASS",
        consoleErrors: errors,
        api: "intercepted; no real saves or provider calls",
      });
      await context.close();
    }
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
