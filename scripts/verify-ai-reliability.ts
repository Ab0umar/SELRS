import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, expect as baseExpect } from "@playwright/test";
const expect = baseExpect.configure({ timeout: 30000 });
const base = process.env.AI_UI_BASE_URL || "http://127.0.0.1:4000";
const output = "outputs/ai-reliability";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
});
const results = [];
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
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const operations = new Map<
        string,
        {
          state: string;
          context: unknown;
          job?: { id: string; state: string; postId: number | null };
        }
      >();
      let marketingState = "rejected",
        medicalEnabled = false;
      let copySubmitted = false;
      let copyFailed = false;
      const calls: Array<{ method: string; input: Record<string, unknown> }> =
        [];
      const profiles = [
        "reply.preview",
        "marketing.text",
        "marketing.image",
        "whatsapp.marketing",
      ].map((workload) => ({
        workload,
        provider: "manus",
        model: "standard",
        enabled: true,
        dailyRequests: 10,
        dailyTokens: 100000,
        maxConcurrent: 2,
      }));
      await page.route("**/api/**", async (route) => {
        const request = route.request(),
          url = new URL(request.url());
        if (!url.pathname.includes("/api/trpc/"))
          return route.fulfill({ contentType: "application/json", body: "{}" });
        const methods = url.pathname.split("/api/trpc/")[1].split(",");
        const raw =
          request.method() === "GET"
            ? JSON.parse(url.searchParams.get("input") || "{}")
            : request.postDataJSON();
        const responses = methods.map((method, index) => {
          const input = raw?.[index]?.json ?? raw?.json ?? {};
          let data: unknown = [];
          if (request.method() !== "GET") calls.push({ method, input });
          if (method === "auth.me")
            data = { id: 999999, role: "admin", name: "اختبار موثوقية معزول" };
          if (method === "aiManagement.status")
            data = {
              enabled: true,
              whatsappCopyAvailable: true,
              credentials: { gemini: true, manus: true, replyGemini: true },
            };
          if (method === "aiManagement.profiles") data = profiles;
          if (method === "aiManagement.models")
            data = [
              { id: "gemini-review", label: "Review", kind: "text" },
              { id: "gemini-review-image", label: "Image", kind: "image" },
            ];
          if (method === "marketing.dashboardSummary")
            data = {
              counts: {
                draft: 0,
                published: 0,
                publishing: 0,
                scheduled: 0,
                failed: 0,
                total: 0,
              },
              recentPosts: [],
            };
          if (method === "marketing.getSchedulerStatus") data = null;
          if (method === "marketing.generationRequest")
            data = operations.get(input.requestId) ?? null;
          if (method === "marketing.generatePost") {
            operations.set(input.requestId, {
              state: marketingState,
              context: input,
            });
            return {
              error: {
                json: {
                  message:
                    marketingState === "rejected"
                      ? "Missing key before generation"
                      : "Outcome unknown",
                  code: -32603,
                  data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 },
                },
              },
            };
          }
          if (method === "medicalAssistant.providerOptions")
            data = {
              managementEnabled: true,
              defaultProvider: "manus",
              central: {
                enabled: medicalEnabled,
                provider: "manus",
                model: "lite",
              },
              gemini: {
                configured: false,
                clinicalEnabled: false,
                model: "gemini-review",
                models: [],
              },
            };
          if (method === "medicalAssistant.startProposals")
            data = { jobId: "00000000-0000-4000-8000-000000000123" };
          if (method === "medicalAssistant.readProposals")
            data = { status: "running" };
          if (method === "marketing.readWhatsAppCopy")
            data = copySubmitted
              ? {
                  requestId: input.requestId,
                  state: copyFailed ? "failed" : "running",
                  variants: null,
                }
              : { requestId: input.requestId, state: null, variants: null };
          if (method === "marketing.generateWhatsAppCopy") {
            copySubmitted = true;
            data = { requestId: input.requestId, variants: null };
          }
          if (method === "aiManagement.runSyntheticProbe") {
            operations.set(input.requestId, {
              state: "rejected",
              context: input,
            });
            return {
              error: {
                json: {
                  message: "AI management: budget",
                  code: -32603,
                  data: { code: "PRECONDITION_FAILED", httpStatus: 412 },
                },
              },
            };
          }
          if (method === "aiManagement.readProbe")
            data = {
              state: operations.get(input.requestId)?.state ?? "reserved",
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
      await page.goto(`${base}/ai/marketing`);
      const generate = page.getByRole("button", {
        name: "توليد النص والصورة",
        exact: true,
      });
      await page
        .getByLabel("صفحة المحتوى", { exact: true })
        .selectOption("doctor");
      await page
        .getByLabel("يوم توليد المنشور", { exact: true })
        .selectOption("tuesday");
      await page
        .getByLabel("موضوع المحتوى", { exact: true })
        .fill("موضوع خيالي للمراجعة");
      await generate.click();
      await expect
        .poll(
          () =>
            calls.filter((call) => call.method === "marketing.generatePost")
              .length,
        )
        .toBe(1);
      await expect(generate).toBeEnabled();
      marketingState = "accepted";
      await generate.click();
      await expect
        .poll(
          () =>
            calls.filter((call) => call.method === "marketing.generatePost")
              .length,
        )
        .toBe(2);
      await expect(generate).toBeDisabled();
      await page.evaluate(() =>
        sessionStorage.removeItem("selrs.ai.marketing.context"),
      );
      await page.reload();
      await expect(generate).toBeDisabled();
      await expect(
        page.getByLabel("صفحة المحتوى", { exact: true }),
      ).toHaveValue("doctor");
      await expect(
        page.getByLabel("يوم توليد المنشور", { exact: true }),
      ).toHaveValue("tuesday");
      await expect(
        page.getByLabel("موضوع المحتوى", { exact: true }),
      ).toHaveValue("موضوع خيالي للمراجعة");
      assert.equal(
        calls.filter((call) => call.method === "marketing.generatePost").length,
        2,
      );
      const pending = calls
        .filter((call) => call.method === "marketing.generatePost")
        .at(-1)!;
      const pendingId = String(pending.input.requestId);
      const trackedOperation = operations.get(pendingId)!;
      trackedOperation.job = {
        id: pendingId,
        state: "uncertain",
        postId: null,
      };
      await expect(
        page.getByText(/حالة الطلب: نتيجة غير محسومة/),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "تجهيز محتوى جديد", exact: true }),
      ).toHaveCount(0);
      trackedOperation.job = { id: pendingId, state: "completed", postId: 42 };
      await expect(
        page.getByRole("button", { name: "تجهيز محتوى جديد", exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "تجهيز محتوى جديد", exact: true })
        .click();
      await expect(generate).toBeEnabled();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        "marketing overflow",
      );
      await page.screenshot({
        path: `${output}/marketing-${theme}-${width}.png`,
        fullPage: true,
      });
      await page.evaluate(() =>
        sessionStorage.setItem(
          "selrs.whatsapp.copy.request.context",
          JSON.stringify({
            requestId: "00000000-0000-4000-8000-000000000456",
            kind: "exam",
            days: ["الثلاثاء"],
          }),
        ),
      );
      await page.goto(`${base}/ai/whatsapp`);
      await expect(
        page.getByRole("button", { name: "صياغة رسالة أخرى", exact: true }),
      ).toHaveCount(0);
      await page
        .getByRole("button", { name: "إعادة إرسال نفس الطلب", exact: true })
        .click();
      await expect
        .poll(
          () =>
            calls.filter(
              (call) => call.method === "marketing.generateWhatsAppCopy",
            ).length,
        )
        .toBe(1);
      assert.deepEqual(
        calls.find((call) => call.method === "marketing.generateWhatsAppCopy")
          ?.input,
        {
          requestId: "00000000-0000-4000-8000-000000000456",
          kind: "exam",
          days: ["الثلاثاء"],
        },
      );
      await expect(
        page.getByRole("combobox", { name: "نوع الرسالة", exact: true }),
      ).toHaveValue("exam");
      await expect(
        page.getByRole("checkbox", { name: "الثلاثاء", exact: true }),
      ).toBeChecked();
      await expect(
        page.getByRole("checkbox", { name: "الأحد", exact: true }),
      ).not.toBeChecked();
      await page.reload();
      await expect(
        page.getByRole("combobox", { name: "نوع الرسالة", exact: true }),
      ).toHaveValue("exam");
      await expect(
        page.getByRole("checkbox", { name: "الثلاثاء", exact: true }),
      ).toBeDisabled();
      await expect(
        page.getByRole("button", { name: "صياغة رسالة أخرى", exact: true }),
      ).toHaveCount(0);
      copyFailed = true;
      await page
        .getByRole("button", { name: "تحديث النتيجة", exact: true })
        .click();
      await page
        .getByRole("button", { name: "صياغة رسالة أخرى", exact: true })
        .click();
      assert.equal(
        await page.evaluate(() =>
          sessionStorage.getItem("selrs.whatsapp.copy.request.context"),
        ),
        null,
      );
      await page.goto(`${base}/ai/medical`);
      await page
        .getByLabel("النص", { exact: true })
        .fill("مثال خيالي: صداع من أسبوع");
      await page
        .getByRole("button", { name: "تجهيز النص للمراجعة", exact: true })
        .click();
      await page.getByRole("checkbox").check();
      await expect(
        page.getByRole("button", {
          name: "إنشاء اقتراحات للمراجعة",
          exact: true,
        }),
      ).toBeDisabled();
      assert.equal(
        calls.filter(
          (call) => call.method === "medicalAssistant.startProposals",
        ).length,
        0,
      );
      medicalEnabled = true;
      await page.reload();
      await page
        .getByLabel("النص", { exact: true })
        .fill("مثال خيالي: صداع من أسبوع");
      await page
        .getByRole("button", { name: "تجهيز النص للمراجعة", exact: true })
        .click();
      await page.getByRole("checkbox").check();
      await page
        .getByRole("button", { name: "إنشاء اقتراحات للمراجعة", exact: true })
        .click();
      await expect
        .poll(
          () =>
            calls.find(
              (call) => call.method === "medicalAssistant.startProposals",
            )?.input.engine,
        )
        .toBe("central");
      await page.goto(`${base}/ai/experiments`);
      await page
        .getByRole("button", { name: "تشغيل تجربة اتصال", exact: true })
        .click();
      await page
        .getByRole("button", { name: "تشغيل التجربة مرة واحدة", exact: true })
        .click();
      await expect
        .poll(
          () =>
            calls.filter(
              (call) => call.method === "aiManagement.runSyntheticProbe",
            ).length,
        )
        .toBe(1);
      await expect(
        page.getByRole("button", { name: "تشغيل تجربة اتصال", exact: true }),
      ).toBeEnabled();
      assert.equal(
        await page.evaluate(() =>
          sessionStorage.getItem("selrs.ai.pending-probe.v1"),
        ),
        null,
      );
      assert.deepEqual(errors, []);
      results.push({
        theme,
        width,
        preflightRejectedUnlocked: "PASS",
        acceptedUnknownRetained: "PASS",
        canonicalMarketingContextRestored: "PASS",
        terminalRequestOutsideRecentHistory: "PASS",
        uncertainRequestCannotBeReplaced: "PASS",
        whatsappContextRestored: "PASS",
        whatsappInterruptedSubmissionSameId: "PASS",
        whatsappUnreservedIdentityRetained: "PASS",
        whatsappConfirmedFailureUnlocks: "PASS",
        disabledMedicalBlocked: "PASS",
        unchangedMedicalUsesCentral: "PASS",
        rejectedProbeUnlocked: "PASS",
        errors,
        api: "intercepted; no real generation or sends",
      });
      await context.close();
    }
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
