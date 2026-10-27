import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, expect as baseExpect } from "@playwright/test";
import { defaultAutoReplySettings } from "../shared/auto-reply";

const expect = baseExpect.configure({ timeout: 30000 });
const base = process.env.AI_UI_BASE_URL || "http://127.0.0.1:4000";
const output = "outputs/ai-section-models";
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
        (value) => localStorage.setItem("theme", value),
        theme,
      );
      await context.addInitScript(() =>
        sessionStorage.setItem(
          "selrs.ai.marketing.assistant",
          "manus:standard",
        ),
      );
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const config = { ...defaultAutoReplySettings };
      const medicalSettings = {
        speechProvider: "azure",
        maxRecordingMinutes: 8,
        showDiagnostics: true,
        processingModel: "gemini:gemini-current",
      };
      const profiles = [
        "marketing.text",
        "marketing.image",
        "whatsapp.marketing",
        "reply.live",
        "medical.documentation",
      ].map((workload) => ({
        workload,
        provider: "gemini",
        model:
          workload === "marketing.image"
            ? "gemini-current-image"
            : "gemini-current",
        enabled: true,
        dailyRequests: 20,
        dailyTokens: 100000,
        maxConcurrent: 2,
      }));
      const calls: Array<{ method: string; input: Record<string, unknown> }> =
        [];
      let jobs: Array<Record<string, unknown>> = [];
      let centralPolls = 0;
      let copyReady = false;
      await page.route("**/api/**", async (route) => {
        const request = route.request(),
          url = new URL(request.url());
        if (!url.pathname.includes("/api/trpc/"))
          return route.fulfill({
            contentType: "application/json",
            body: '{"ok":true}',
          });
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
            data = {
              id: 999999,
              role: "admin",
              name: "اختبار معزول للموديلات",
            };
          if (method === "aiManagement.status")
            data = {
              enabled: true,
              whatsappCopyAvailable: true,
              replyPreviewAvailable: true,
              credentials: { gemini: true, replyGemini: true, manus: true },
            };
          if (method === "aiManagement.profiles") data = profiles;
          if (method === "aiManagement.models")
            data = [
              { id: "gemini-current", label: "Current", kind: "text" },
              { id: "gemini-alternative", label: "Alternative", kind: "text" },
              {
                id: "gemini-current-image",
                label: "Current Image",
                kind: "image",
              },
            ];
          if (method === "aiManagement.updateProfile") {
            Object.assign(
              profiles.find((profile) => profile.workload === input.workload)!,
              input,
            );
            data = null;
          }
          if (method === "marketing.dashboardSummary")
            data = {
              recentPosts: [],
              counts: {
                draft: 0,
                publishing: 0,
                published: 0,
                failed: 0,
                scheduled: 0,
                total: 0,
              },
            };
          if (method === "marketing.getSettings") data = { autoPublish: false };
          if (method === "marketing.listPosts")
            data = [
              {
                id: 42,
                title: "مسودة اختبار خيالية",
                content: "محتوى عام للاختبار",
                topic: "LASIK",
                imagePrompt: "Empty clinic",
                status: "draft",
                postDay: "saturday",
                pageRole: "center",
                imageUrl: null,
              },
            ];
          if (method === "marketing.generateImageForPost")
            data = { jobId: input.requestId };
          if (method === "marketing.generationRequest") {
            const job = jobs.find((job) => job.id === input.requestId);
            const submitted = calls.find(
              (call) =>
                call.method === "marketing.generatePost" &&
                call.input.requestId === input.requestId,
            )?.input;
            data = submitted
              ? { state: "accepted", context: submitted, job: job ?? null }
              : null;
          }
          if (method === "marketing.getSchedulerStatus")
            data = {
              autoPublish: false,
              fbConnected: true,
              saturdayEnabled: true,
              tuesdayEnabled: true,
              thursdayEnabled: true,
              publishHour: input?.pageRole === "doctor" ? 17 : 9,
              lastSchedulerRun: null,
              schedulerStatus: "idle",
              nextRun: null,
            };
          if (method === "marketing.runSchedulerNow")
            data = { ok: true, skipped: "اختبار معزول" };
          if (method === "marketing.setPageAutoPublish") data = { ok: true };
          if (method === "marketing.generationJobs")
            data = jobs.filter((job) => job.provider === "manus");
          if (method === "marketing.centralGenerationJobs")
            data = jobs.filter((job) => job.provider === "gemini");
          if (method === "marketing.generatePost") {
            const assistant = input.assistant as { provider: string };
            jobs = [
              {
                id: input.requestId,
                provider: assistant.provider,
                state: "completed",
                topic: input.topic,
                postId: 42,
                pageRole: input.pageRole,
                errorCode: null,
                referenceIds: [],
                createdAt: new Date().toISOString(),
              },
            ];
            data = { jobId: input.requestId, topic: input.topic };
          }
          if (method === "medicalAssistant.settings") data = medicalSettings;
          if (method === "medicalAssistant.speechOptions")
            data = {
              azure: { configured: true },
              gemini: { configured: true, clinicalEnabled: true },
            };
          if (method === "medicalAssistant.saveSettings") {
            Object.assign(medicalSettings, input);
            const [provider, ...model] =
              medicalSettings.processingModel.split(":");
            Object.assign(
              profiles.find(
                (profile) => profile.workload === "medical.documentation",
              )!,
              { provider, model: model.join(":") },
            );
            data = medicalSettings;
          }
          if (method === "medicalAssistant.providerOptions")
            data = {
              managementEnabled: true,
              defaultProvider: medicalSettings.processingModel.startsWith(
                "gemini:",
              )
                ? "gemini"
                : "manus",
              central: profiles.find(
                (profile) => profile.workload === "medical.documentation",
              ),
              gemini: {
                configured: true,
                clinicalEnabled: true,
                model: "gemini-current",
                models: [
                  { id: "gemini-current", label: "Current" },
                  { id: "gemini-alternative", label: "Alternative" },
                ],
              },
            };
          if (method === "medicalAssistant.startProposals")
            data = { jobId: "00000000-0000-4000-8000-000000000001" };
          if (method === "medicalAssistant.readProposals")
            data = { status: "running" };
          if (method === "autoReply.settings")
            data = {
              config,
              pages: [],
              workerEnabled: false,
              centralAvailable: true,
            };
          if (method === "autoReply.models")
            data = [
              { id: config.model, label: config.model },
              { id: "gemini-alternative", label: "Alternative" },
            ];
          if (method === "autoReply.saveSettings") {
            Object.assign(config, input);
            data = { ok: true };
          }
          if (method === "autoReply.conversations")
            data = { rows: [], total: 0, page: 1 };
          if (method === "autoReply.test") {
            if (
              input.engine === "central_live" &&
              profiles.find((profile) => profile.workload === "reply.live")
                ?.provider === "manus" &&
              ++centralPolls === 1
            )
              return {
                error: {
                  json: {
                    message: "AI_TASK_PENDING",
                    code: -32603,
                    data: { code: "BAD_GATEWAY", httpStatus: 502 },
                  },
                },
              };
            data = {
              text: "رد اختبار معزول",
              sourceIds: [],
              handoff: false,
              model:
                input.engine === "central_live"
                  ? `${profiles.find((profile) => profile.workload === "reply.live")?.provider}:${profiles.find((profile) => profile.workload === "reply.live")?.model}`
                  : config.model,
              inputTokens: 1,
              outputTokens: 1,
              inWorkingHours: true,
            };
          }
          if (method === "marketing.generateWhatsAppCopy")
            data = { requestId: input.requestId, variants: null };
          if (method === "marketing.readWhatsAppCopy")
            data = {
              requestId: input.requestId,
              state: copyReady ? "completed" : "running",
              variants: copyReady
                ? [
                    "أهلا وسهلا، مثال صياغة أول",
                    "نورت المركز، مثال صياغة ثان",
                    "يا أهلا بحضرتك، مثال صياغة ثالث",
                  ]
                : null,
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
      const picker = page.getByLabel("المساعد والموديل", { exact: true });
      await expect(picker).toHaveCount(1);
      await expect(picker).toHaveValue(
        "gemini:gemini-current|gemini-current-image",
      );
      await expect(
        page.getByRole("button", { name: "توليد النص والصورة", exact: true }),
      ).toHaveCount(1);
      await picker.selectOption("manus:max");
      await page
        .getByLabel("موضوع المحتوى", { exact: true })
        .fill("LASIK اختبار معزول");
      await page
        .getByLabel("صفحة المحتوى", { exact: true })
        .selectOption("doctor");
      const dayPicker = page.getByLabel("يوم توليد المنشور", { exact: true });
      await expect(dayPicker.locator("option")).toHaveText([
        "السبت — تصحيح الإبصار والبنتاكام",
        "الاثنين — المياه البيضاء والقرنية",
        "الأربعاء — صحة العيون العامة",
      ]);
      await dayPicker.selectOption("tuesday");
      await page
        .getByRole("button", { name: "تشغيل الآن", exact: true })
        .click();
      await expect
        .poll(
          () =>
            calls.filter((call) => call.method === "marketing.runSchedulerNow")
              .length,
        )
        .toBe(1);
      assert.deepEqual(
        calls.find((call) => call.method === "marketing.runSchedulerNow")!
          .input,
        { day: "tuesday", pageRole: "doctor" },
      );
      await page.getByRole("button", { name: "النشر التلقائي: موقوف" }).click();
      await expect
        .poll(
          () =>
            calls.filter(
              (call) => call.method === "marketing.setPageAutoPublish",
            ).length,
        )
        .toBe(1);
      assert.deepEqual(
        calls.find((call) => call.method === "marketing.setPageAutoPublish")!
          .input,
        { autoPublish: true, pageRole: "doctor" },
      );
      await page
        .getByRole("button", { name: "توليد النص والصورة", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "تجهيز محتوى جديد", exact: true }),
      ).toBeVisible();
      assert.deepEqual(
        calls.filter((call) => call.method === "marketing.generatePost")[0]
          .input.assistant,
        { provider: "manus", model: "max" },
      );
      assert.equal(
        calls.filter((call) => call.method === "marketing.generatePost")[0]
          .input.pageRole,
        "doctor",
      );
      assert.equal(
        calls.filter((call) => call.method === "marketing.generatePost")[0]
          .input.postDay,
        "tuesday",
      );
      await expect(picker).toBeDisabled();
      await page.reload();
      await expect(
        page.getByRole("button", { name: "توليد النص والصورة", exact: true }),
      ).toBeDisabled();
      assert.equal(
        calls.filter((call) => call.method === "marketing.generatePost").length,
        1,
      );
      await page
        .getByRole("button", { name: "تجهيز محتوى جديد", exact: true })
        .click();
      await picker.selectOption(
        "gemini:gemini-alternative|gemini-current-image",
      );
      await page
        .getByLabel("موضوع المحتوى", { exact: true })
        .fill("LASIK اختبار Gemini");
      await page
        .getByRole("button", { name: "توليد النص والصورة", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "تجهيز محتوى جديد", exact: true }),
      ).toBeVisible();
      assert.deepEqual(
        calls.filter((call) => call.method === "marketing.generatePost")[1]
          .input.assistant,
        {
          provider: "gemini",
          model: "gemini-alternative",
          imageModel: "gemini-current-image",
        },
      );

      if (process.env.AI_UI_MARKETING_ONLY === "true") {
        assert.deepEqual(errors, []);
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        await page.screenshot({
          path: `${output}/provider-default-${theme}-${width}.png`,
          fullPage: true,
        });
        results.push({
          theme,
          width,
          configuredGeminiDefault: "PASS",
          staleManusSelectionIgnored: "PASS",
          explicitProviderOverrides: "PASS",
          pendingReloadNoDuplicate: "PASS",
          errors,
          api: "intercepted; no provider calls or publishing",
        });
        await context.close();
        continue;
      }
      await page.goto(`${base}/ai/marketing/drafts`);
      await page.getByRole("button", { name: "توليد AI", exact: true }).click();
      await expect
        .poll(
          () =>
            calls.filter(
              (call) => call.method === "marketing.generateImageForPost",
            ).length,
        )
        .toBe(1);
      assert.match(
        String(
          calls.find(
            (call) => call.method === "marketing.generateImageForPost",
          )!.input.requestId,
        ),
        /^[a-f0-9-]{36}$/i,
      );
      await page.goto(`${base}/ai/medical`);
      await expect(picker).toHaveCount(1);
      await expect(picker).toHaveValue("gemini:gemini-current");
      await picker.selectOption("manus:max");
      await page
        .getByRole("button", {
          name: "حفظ الإعدادات لكل المستخدمين",
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("button", {
          name: "حفظ الإعدادات لكل المستخدمين",
          exact: true,
        }),
      ).toBeDisabled();
      await page
        .locator("#admin-medical-transcript")
        .fill("مثال تدريبي خيالي: صداع من أسبوعين");
      await page
        .getByRole("button", { name: "تجهيز النص للمراجعة", exact: true })
        .click();
      await expect(picker).toHaveCount(1);
      await page
        .locator('section[aria-label="AI proposal review"]')
        .getByRole("checkbox")
        .check();
      await page
        .getByRole("button", { name: "إنشاء اقتراحات للمراجعة", exact: true })
        .click();
      await expect(
        page.getByText("Manus is processing.", { exact: false }),
      ).toBeVisible();
      assert.equal(
        calls.find((call) => call.method === "medicalAssistant.startProposals")
          ?.input.model,
        "max",
      );

      await page.goto(`${base}/ai/medical`);
      await picker.selectOption("gemini:gemini-alternative");
      await page
        .getByRole("button", {
          name: "حفظ الإعدادات لكل المستخدمين",
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("button", {
          name: "حفظ الإعدادات لكل المستخدمين",
          exact: true,
        }),
      ).toBeDisabled();
      await page
        .locator("#admin-medical-transcript")
        .fill("مثال تدريبي خيالي آخر");
      await page
        .getByRole("button", { name: "تجهيز النص للمراجعة", exact: true })
        .click();
      await page
        .locator('section[aria-label="AI proposal review"]')
        .getByRole("checkbox")
        .check();
      await page
        .getByRole("button", { name: "إنشاء اقتراحات للمراجعة", exact: true })
        .click();
      await expect(
        page.getByText("Gemini is processing.", { exact: false }),
      ).toBeVisible();
      assert.equal(
        calls.filter(
          (call) => call.method === "medicalAssistant.startProposals",
        )[1].input.provider,
        "gemini",
      );
      assert.equal(
        calls.filter(
          (call) => call.method === "medicalAssistant.startProposals",
        )[1].input.model,
        "gemini-alternative",
      );

      await page.goto(`${base}/ai/replies`);
      await expect(picker).toHaveCount(1);
      await picker.selectOption("gemini:gemini-alternative");
      await page
        .getByRole("button", { name: "حفظ اختيار المساعد", exact: true })
        .click();
      await expect(
        page.getByText("الموديل الفعلي:", { exact: false }),
      ).toContainText("gemini-alternative");
      await page
        .getByRole("button", { name: "اختبار داخلي", exact: true })
        .click();
      await expect(
        page.getByLabel("محرك المعاينة", { exact: true }),
      ).toHaveCount(0);
      await page.getByLabel("رسالة العميل للاختبار").fill("اختبار فقط");
      await page
        .getByRole("button", { name: "عرض الرد المقترح", exact: true })
        .click();
      await expect(
        page.getByText("نتيجة اختبار، لم يُرسل رد", { exact: true }),
      ).toBeVisible();
      assert.equal(
        calls.find((call) => call.method === "autoReply.test")?.input.engine,
        "central_live",
      );
      assert.equal(config.model, "gemini-alternative");

      await picker.selectOption("manus:max");
      await page
        .getByRole("button", { name: "حفظ اختيار المساعد", exact: true })
        .click();
      await expect(
        page.getByText("الموديل الفعلي:", { exact: false }),
      ).toContainText("manus:max");
      await page
        .getByRole("button", { name: "عرض الرد المقترح", exact: true })
        .click();
      await expect(
        page.getByText("المساعد يجهّز الرد.", { exact: false }),
      ).toBeVisible();
      await page.reload();
      await expect(picker).toBeDisabled();
      await page
        .getByRole("button", { name: "اختبار داخلي", exact: true })
        .click();
      await page
        .getByRole("button", { name: "عرض الرد المقترح", exact: true })
        .click();
      await expect(
        page.getByText("نتيجة اختبار، لم يُرسل رد", { exact: true }),
      ).toBeVisible();
      const centralCalls = calls
        .filter(
          (call) =>
            call.method === "autoReply.test" &&
            call.input.engine === "central_live",
        )
        .slice(1);
      assert.equal(centralCalls.length, 2);
      assert.equal(
        centralCalls[0].input.requestId,
        centralCalls[1].input.requestId,
      );
      assert.equal(
        profiles.find((profile) => profile.workload === "reply.live")?.provider,
        "manus",
      );

      await page.goto(`${base}/ai/whatsapp`);
      await expect(picker).toHaveCount(1);
      await picker.selectOption("gemini:gemini-alternative");
      const generateCopy = page.getByRole("button", {
        name: "توليد ثلاث صيغ للمراجعة",
        exact: true,
      });
      await expect(generateCopy).toBeDisabled();
      await page
        .getByRole("button", { name: "حفظ اختيار المساعد", exact: true })
        .click();
      await expect(generateCopy).toBeEnabled();
      assert.equal(
        profiles.find((profile) => profile.workload === "whatsapp.marketing")
          ?.model,
        "gemini-alternative",
      );
      await picker.selectOption("manus:max");
      await page
        .getByRole("button", { name: "حفظ اختيار المساعد", exact: true })
        .click();
      await expect(generateCopy).toBeEnabled();
      assert.equal(
        profiles.find((profile) => profile.workload === "whatsapp.marketing")
          ?.provider,
        "manus",
      );
      await generateCopy.click();
      await expect
        .poll(
          () =>
            calls.filter(
              (call) => call.method === "marketing.generateWhatsAppCopy",
            ).length,
        )
        .toBe(1);
      await expect(picker).toBeDisabled();
      await page.reload();
      await expect(picker).toHaveValue("manus:max");
      await expect(picker).toBeDisabled();
      copyReady = true;
      await page
        .getByRole("button", { name: "تحديث النتيجة", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "نسخ الصيغة 1", exact: true }),
      ).toBeVisible();
      assert.equal(
        calls.filter((call) => call.method === "marketing.generateWhatsAppCopy")
          .length,
        1,
      );
      await page.evaluate(() => document.fonts.ready);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${theme}/${width}: overflow`,
      );
      assert.deepEqual(errors, []);
      await page.screenshot({
        path: `${output}/${theme}-${width}.png`,
        fullPage: true,
      });
      results.push({
        theme,
        width,
        singleSelectorPerSection: "PASS",
        oneMarketingForm: "PASS",
        manusAndGeminiDispatch: "PASS",
        pendingReloadNoDuplicate: "PASS",
        medicalModel: "PASS",
        replyPreviewUsesActiveModel: "PASS",
        whatsappSavedSelection: "PASS",
        bothProvidersInAllFourSections: "PASS",
        manusReplyAndWhatsAppResume: "PASS",
        errors,
        api: "intercepted; no real provider calls, sends or publishing",
      });
      await context.close();
    }
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
