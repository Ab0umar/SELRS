import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium, expect as baseExpect } from "@playwright/test";
const expect = baseExpect.configure({ timeout: 30000 });

const output = "outputs/ai-management-ui";
await mkdir(output, { recursive: true });
const image = await readFile(
  "outputs/ai-managed-verification/2026-10-24T10-20-06-564Z/managed-image.jpg",
);
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
});
const results = [];
try {
  for (const theme of ["light", "dark"]) {
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
      let enabled = false,
        failSave = false,
        failStatus = false,
        uncertain = false,
        calls = 0,
        saves = 0;
      const profiles = [
        "reply.preview",
        "marketing.text",
        "marketing.image",
        "medical.synthetic",
        "whatsapp.marketing",
        "medical.documentation",
        "reply.live",
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
      const failure = {
        error: {
          json: {
            message: "Isolated verification failure",
            code: -32603,
            data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 },
          },
        },
      };
      await page.route("**/api/**", async (route) => {
        const request = route.request(),
          url = new URL(request.url());
        const methods = url.pathname.split("/api/trpc/")[1]?.split(",") ?? [];
        const input =
          request.method() === "GET"
            ? JSON.parse(url.searchParams.get("input") || "{}")
            : request.postDataJSON();
        const responses = methods.map((method, index) => {
          const value = input?.[index]?.json ?? input?.json;
          let data = [];
          if (method === "auth.me")
            data = { id: 999999, role: "admin", name: "اختبار معزول" };
          if (method === "aiManagement.status") {
            if (failStatus) return failure;
            data = {
              enabled,
              consumersMigrated: false,
              credentials: { gemini: true, replyGemini: true, manus: false },
            };
          }
          if (method === "aiManagement.profiles") data = profiles;
          if (method === "aiManagement.usage")
            data = [
              {
                request_id: "00000000-0000-4000-8000-000000000001",
                workload: "marketing.image",
                provider: "gemini",
                model: "gemini-nano-banana-2.1",
                state: "completed",
                reserved_tokens: 8192,
                input_tokens: 53,
                output_tokens: 2159,
                credits: null,
                task_id: null,
                error_code: null,
                created_ms: 1792837200000,
                updated_ms: 1792837200000,
              },
            ];
          if (method === "aiManagement.updateProfile") {
            saves++;
            if (failSave) return failure;
            Object.assign(
              profiles.find((profile) => profile.workload === value.workload),
              value,
            );
            data = undefined;
          }
          if (method === "aiManagement.runSyntheticProbe") {
            calls++;
            assert.deepEqual(Object.keys(value).sort(), [
              "requestId",
              "workload",
            ]);
            assert.match(value.requestId, /^[a-f0-9-]{36}$/);
            data = uncertain
              ? { state: "running", requestId: value.requestId }
              : {
                  state: "completed",
                  output:
                    value.workload === "marketing.image"
                      ? {
                          mimeType: "image/jpeg",
                          bytes: image.length,
                          imageDataUrl: `data:image/jpeg;base64,${image.toString("base64")}`,
                        }
                      : { ok: true },
                };
          }
          if (method === "aiManagement.readProbe")
            data = { state: "uncertain" };
          return { result: { data: { json: data ?? null } } };
        });
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify(
            url.searchParams.has("batch") ? responses : responses[0],
          ),
        });
      });
      await page.goto("http://127.0.0.1:4000/ai/settings");
      const root = page.getByRole("region", {
        name: "إدارة الذكاء الاصطناعي والتواصل",
        exact: true,
      });
      await expect(
        root.getByText("إدارة التجارب غير مفعّلة على الخادم", { exact: true }),
      ).toBeVisible();
      assert.equal(await root.locator("form").count(), 0);
      enabled = true;
      await root.getByRole("button", { name: "تحديث الحالة" }).click();
      await expect(root.getByLabel("الموديل", { exact: true })).toBeVisible();
      await root.getByLabel("الحد اليومي للطلبات", { exact: true }).fill("11");
      failSave = true;
      await root.getByRole("button", { name: "حفظ إعدادات التجربة" }).click();
      await expect(
        root.getByRole("status").filter({ hasText: "تعذرت العملية" }),
      ).toBeVisible();
      assert.equal(
        await root
          .getByLabel("الحد اليومي للطلبات", { exact: true })
          .inputValue(),
        "11",
      );
      failSave = false;
      await root.getByRole("button", { name: "حفظ إعدادات التجربة" }).click();
      await expect(
        root.getByRole("button", { name: "حفظ إعدادات التجربة" }),
      ).toHaveJSProperty("disabled", true);
      assert.equal(saves, 2);
      await page.goto("http://127.0.0.1:4000/ai/experiments");
      await root.getByRole("button", { name: "تشغيل تجربة اتصال", exact: true }).click();
      await page.getByRole("button", { name: "إلغاء", exact: true }).click();
      assert.equal(calls, 0);
      await root.getByRole("button", { name: "تشغيل تجربة اتصال", exact: true }).click();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).not.toBeVisible();
      await root.getByRole("button", { name: "تشغيل تجربة اتصال", exact: true }).click();
      await page
        .getByRole("button", { name: "تشغيل التجربة مرة واحدة" })
        .click();
      await expect(
        root.getByText(
          "نجح اختبار النص ببيانات ثابتة. لم تُرسل رسائل للعملاء.",
        ),
      ).toBeVisible();
      assert.equal(calls, 1);
      await root
        .getByLabel("المهمة", { exact: true })
        .selectOption("marketing.image");
      await root.getByRole("button", { name: "تشغيل تجربة اتصال", exact: true }).click();
      await page
        .getByRole("button", { name: "تشغيل التجربة مرة واحدة" })
        .click();
      await expect(root.locator("figure img")).toBeVisible();
      assert.ok(
        await root
          .locator("figure img")
          .evaluate((node) => node.naturalWidth > 0),
      );
      assert.equal(calls, 2);
      await page.goto("http://127.0.0.1:4000/ai/settings");
      await root
        .getByLabel("المهمة", { exact: true })
        .selectOption("medical.documentation");
      await expect(root.getByLabel("المزوّد", { exact: true })).toHaveValue(
        "manus",
      );
      await expect(
        root
          .getByLabel("المزوّد", { exact: true })
          .locator('option[value="gemini"]'),
      ).toHaveJSProperty("disabled", false);
      assert.equal(
        await root.getByRole("button", { name: "تجربة توليد نص" }).count(),
        0,
      );
      for (const workload of ["whatsapp.marketing", "reply.live"]) {
        await root.getByLabel("المهمة", { exact: true }).selectOption(workload);
        await expect(root.getByLabel("المزوّد", { exact: true })).toHaveValue(
          "gemini",
        );
        await expect(
          root
            .getByLabel("المزوّد", { exact: true })
            .locator('option[value="manus"]'),
        ).toHaveJSProperty("disabled", false);
      }
      await page.goto("http://127.0.0.1:4000/ai/experiments");
      await root
        .getByLabel("المهمة", { exact: true })
        .selectOption("marketing.image");
      await page.evaluate(() => document.fonts.ready);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${theme}/${width}: overflow`,
      );
      const sizes = await root
        .locator("button,input:not([type=checkbox]),select,a")
        .evaluateAll((nodes) =>
          nodes.map((node) => ({
            text: node.textContent,
            height: node.getBoundingClientRect().height,
          })),
        );
      assert.ok(
        sizes.every((size) => size.height >= 43.9),
        JSON.stringify(sizes),
      );
      await page.screenshot({
        path: `${output}/${theme}-${width}.png`,
        fullPage: true,
      });
      await page.evaluate(
        () => (document.documentElement.style.fontSize = "200%"),
      );
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${theme}/${width}: text resize overflow`,
      );
      await page.evaluate(() => (document.documentElement.style.fontSize = ""));
      uncertain = true;
      await root.getByRole("button", { name: "تشغيل تجربة اتصال", exact: true }).click();
      await page
        .getByRole("button", { name: "تشغيل التجربة مرة واحدة" })
        .click();
      await expect(
        root.getByText("النتيجة غير محسومة", { exact: true }),
      ).toBeVisible();
      await page.reload();
      await expect(
        root.getByRole("button", { name: "تشغيل تجربة اتصال", exact: true }),
      ).toBeDisabled();
      await root.getByRole("button", { name: "متابعة نفس الطلب" }).click();
      assert.equal(calls, 3);
      await page.evaluate(() => sessionStorage.clear());
      failStatus = true;
      await page.reload();
      await expect(root.getByRole("alert")).toContainText(
        "تعذر تحميل حالة الموديول",
      );
      failStatus = false;
      await root.getByRole("button", { name: "تحديث الحالة" }).click();
      await expect(root.getByLabel("المهمة", { exact: true })).toBeVisible();
      assert.deepEqual(errors, []);
      results.push({
        theme,
        width,
        disabledState: "PASS",
        saveFailureAndRecovery: "PASS",
        confirmAndEscape: "PASS",
        textAndImagePreview: "PASS",
        pendingReloadAndNoDuplicate: "PASS",
        statusErrorRecovery: "PASS",
        targets44: "PASS",
        textResize200: "PASS",
        overflow: false,
        api: "intercepted; no provider requests",
      });
      await context.close();
    }
  }
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
