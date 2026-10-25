import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, expect as baseExpect } from "@playwright/test";
const expect = baseExpect.configure({ timeout: 30000 });
const directory = "outputs/admin-medical-assistant";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
});
const results = [];
try {
  for (const theme of ["light", "dark"])
    for (const width of [360, 768, 1440]) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        permissions: ["clipboard-read", "clipboard-write"],
      });
      await context.addInitScript(
        (theme) => localStorage.setItem("theme", theme),
        theme,
      );
      const page = await context.newPage();
      const errors = [],
        mutations = [];
      let starts = 0;
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/api/**", async (route) => {
        const request = route.request(),
          url = new URL(request.url());
        if (request.method() !== "GET") mutations.push(url.pathname);
        const methods = url.pathname.split("/api/trpc/")[1]?.split(",") || [];
        const raw =
          request.method() === "GET"
            ? JSON.parse(url.searchParams.get("input") || "{}")
            : JSON.parse(request.postData() || "{}");
        const responses = methods.map((method, index) => {
          let data = [];
          const input = (raw[index] ?? raw).json;
          if (method === "auth.me")
            data = { id: 999999, role: "admin", name: "اختبار معزول" };
          if (method === "medicalAssistant.providerOptions")
            data = {
              defaultProvider: "manus",
              central: { enabled: true, model: "lite" },
              gemini: { clinicalEnabled: false },
            };
          if (method === "medicalAssistant.startProposals") {
            starts++;
            assert.equal(input.consentConfirmed, true);
            assert.equal(input.engine, "current");
            data = { jobId: "00000000-0000-4000-8000-000000000001" };
          }
          if (method === "medicalAssistant.readProposals")
            data = {
              status: "complete",
              result: {
                proposals: [
                  {
                    field: "complaints",
                    text: "ملاحظة تدريبية خيالية",
                    sources: ["ملاحظة تدريبية خيالية"],
                    speaker: "doctor",
                  },
                  {
                    field: "treatment",
                    text: "نص تدريبي للمراجعة فقط",
                    sources: ["ملاحظة تدريبية خيالية"],
                    speaker: "doctor",
                  },
                ],
                warnings: ["مثال خيالي للاختبار"],
              },
            };
          if (method === "medicalAssistant.speechToken")
            return {
              error: {
                json: {
                  message:
                    "Synthetic audio test; no microphone or Azure request",
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
      await page.goto("http://127.0.0.1:4000/admin-hub");
      await page.locator('a[href="/admin-hub/medical-assistant"]').click();
      const panel = page.getByRole("region", {
        name: "المساعد الطبي",
        exact: true,
      });
      await expect(
        panel.getByRole("heading", { name: "المساعد الطبي", exact: true }),
      ).toBeVisible();
      const prepare = panel.getByRole("button", {
        name: "تجهيز النص للمراجعة",
      });
      await expect(prepare).toBeDisabled();
      await panel
        .getByLabel("النص", { exact: true })
        .fill("ملاحظة تدريبية خيالية");
      await panel
        .getByRole("button", { name: "تسجيل صوتي", exact: true })
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).not.toBeVisible();
      await expect(panel.getByLabel("النص", { exact: true })).toHaveValue(
        "ملاحظة تدريبية خيالية",
      );
      await panel
        .getByLabel("نوع التسجيل", { exact: true })
        .selectOption("conversation");
      await panel
        .getByLabel("نوع التسجيل", { exact: true })
        .selectOption("dictation");
      await prepare.click();
      await expect(panel.getByLabel("النص", { exact: true })).toBeDisabled();
      const generate = panel.getByRole("button", {
        name: "إنشاء اقتراحات للمراجعة",
      });
      await expect(generate).toBeDisabled();
      await expect(panel.getByLabel("محرك المعالجة")).toHaveValue("current");
      await panel.getByRole("checkbox").check();
      await generate.click();
      await expect(
        panel.getByRole("button", { name: "نسخ النص المُراجع" }),
      ).toHaveCount(2);
      assert.equal(starts, 1);
      assert.equal(
        await panel
          .getByRole("button", {
            name: /Append to open form|Approve proposal for this field/,
          })
          .count(),
        0,
      );
      await panel
        .getByLabel("Proposal: complaints")
        .fill("نص خيالي راجعه الطبيب");
      await panel
        .getByRole("button", { name: "نسخ النص المُراجع" })
        .first()
        .click();
      assert.equal(
        await page.evaluate(() => navigator.clipboard.readText()),
        "نص خيالي راجعه الطبيب",
      );
      await panel
        .getByText("الاقتباسات من النص الأصلي", { exact: true })
        .first()
        .click();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      await page.screenshot({
        path: `${directory}/${theme}-${width}.png`,
        fullPage: true,
      });
      await page.evaluate(
        () => (document.documentElement.style.fontSize = "200%"),
      );
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      await page.evaluate(() => (document.documentElement.style.fontSize = ""));
      page.once("dialog", (dialog) => dialog.dismiss());
      await panel.getByRole("button", { name: "العودة لتعديل النص" }).click();
      await expect(panel.getByLabel("النص", { exact: true })).toBeDisabled();
      page.once("dialog", (dialog) => dialog.accept());
      await panel.getByRole("button", { name: "العودة لتعديل النص" }).click();
      await expect(panel.getByLabel("النص", { exact: true })).toBeEnabled();
      assert.ok(
        mutations.every((method) =>
          /medicalAssistant\.(speechToken|startProposals|readProposals)/.test(
            method,
          ),
        ),
      );
      assert.deepEqual(errors, []);
      results.push({
        theme,
        width,
        route: true,
        recordingDialog: true,
        manualTranscript: true,
        consentRequired: true,
        currentDefault: true,
        copyReviewedText: true,
        noPatientSave: true,
        textResize200: true,
        network: "intercepted; no provider requests",
      });
      await context.close();
    }
  await writeFile(
    `${directory}/results.json`,
    JSON.stringify(results, null, 2),
  );
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
