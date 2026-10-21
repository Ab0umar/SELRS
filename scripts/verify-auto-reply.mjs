import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const baseUrl = process.env.DESIGN_PREVIEW_URL || "http://127.0.0.1:5197";
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
    : process.platform === "win32"
      ? { channel: "msedge" }
      : {},
);
await mkdir("outputs/auto-reply", { recursive: true });
const instructionContrasts = [];
const config = {
  sendingEnabled: false,
  facebookPages: {},
  channels: { whatsapp: false, messenger: false, facebook_comment: false },
  model: "gemini-3.8-flash",
  maxReplyChars: 600,
  retentionDays: 30,
  style: "أسلوب مختصر",
  instructions: [],
  hoursEnabled: false,
  hours: [],
  outsideMessage: "رسالة اختبار خارج المواعيد",
  outsideMessageEn: "Test out-of-hours reply",
};
const { instructions: _instructions, ...legacyConfig } = config;
const date = "2026-10-19T00:00:00Z";
const pages = [
  { accountId: "456", label: "الصفحة الأولى" },
  { accountId: "654", label: "الصفحة الثانية" },
];
const conversation = {
  id: 1,
  channel: "whatsapp",
  status: "human",
  participantId: "fixture-customer",
  threadId: "fixture-thread",
  lastActivityAt: date,
  lastInboundAt: date,
  humanReason: "staff_takeover",
};
async function open(width, theme, mode = "populated") {
  const page = await browser.newPage({ viewport: { width, height: 1000 } });
  const errors = [];
  const mutations = [];
  let onboardingFinished = false;
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(
    (value) => localStorage.setItem("theme", value),
    theme,
  );
  if (mode.startsWith("coexist_"))
    await page.addInitScript((order) => {
      window.FB = {
        init() {},
        login(callback, options) {
          if (
            options.config_id !== "345" ||
            options.response_type !== "code" ||
            options.override_default_response_type !== true ||
            options.extras?.version !== "v4" ||
            options.extras?.featureType !== "whatsapp_business_app_onboarding"
          )
            throw new Error(
              "Expected the Meta Builder v4 Coexistence launch contract",
            );
          const assets = () =>
            window.dispatchEvent(
              new MessageEvent("message", {
                origin: "https://www.facebook.com",
                data: JSON.stringify({
                  type: "WA_EMBEDDED_SIGNUP",
                  event: "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
                  data: { phone_number_id: "789", waba_id: "987" },
                }),
              }),
            );
          const code = () =>
            callback({ authResponse: { code: "fixture-one-time-code" } });
          if (order === "coexist_code_first") {
            code();
            setTimeout(assets, 150);
          } else {
            assets();
            setTimeout(code, 150);
          }
        },
      };
    }, mode);
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const methods = url.pathname.split("/api/trpc/")[1]?.split(",") ?? [];
    const results = methods.map((method, index) => {
      if (method === "autoReply.finishOnboarding") onboardingFinished = true;
      const requestInput =
        route.request().method() === "GET"
          ? JSON.parse(url.searchParams.get("input") || "{}")
          : route.request().postDataJSON();
      const input = (
        url.searchParams.has("batch") ? requestInput[index] : requestInput
      )?.json;
      const pageConversations = pages.map((p, i) => ({
        ...conversation,
        id: i + 2,
        channel: "messenger",
        accountId: p.accountId,
        participantId: "same-fixture-customer",
      }));
      const selectedConversation =
        mode === "two_pages"
          ? (pageConversations.find((c) => c.id === input) ??
            pageConversations[0])
          : conversation;
      if (mode === "error" && method === "autoReply.settings")
        return {
          error: {
            json: {
              message: "FIXTURE_STORAGE_UNAVAILABLE",
              code: -32603,
              data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 },
            },
          },
        };
      const values = {
        "auth.me": { id: 999999, role: "admin", name: "اختبار واجهة محلي" },
        "autoReply.settings": {
          config: mode === "legacy_config" ? legacyConfig : config,
          pages,
          workerEnabled: false,
          geminiConfigured: false,
          channels: [
            { channel: "whatsapp", accountId: "", label: "واتساب" },
            ...pages.flatMap((p) =>
              ["messenger", "facebook_comment"].map((channel) => ({
                ...p,
                channel,
              })),
            ),
          ].map((target) => ({
            ...target,
            configured: false,
            checkedAt: null,
            checkOk: false,
            checkFresh: false,
            errorCode: null,
            lastWebhookAt: null,
            lastMobileEchoAt: null,
          })),
        },
        "autoReply.conversations": {
          rows:
            mode === "empty"
              ? []
              : mode === "two_pages"
                ? pageConversations.filter(
                    (c) => !input?.accountId || c.accountId === input.accountId,
                  )
                : [conversation],
          hasMore: false,
        },
        "autoReply.conversation": {
          conversation: selectedConversation,
          jobs: [],
          rows: [
            {
              id: 1,
              direction: "inbound",
              body: "رسالة اختبار محلي",
              state: "received",
              createdAt: date,
            },
          ],
        },
        "autoReply.onboardingStatus": {
          ready: mode.startsWith("coexist_"),
          sdk: null,
          state: onboardingFinished ? "syncing" : "not_started",
          details: onboardingFinished
            ? { contacts: "accepted", history: "accepted" }
            : {},
          updatedAt: null,
        },
        "autoReply.knowledge": [],
        "autoReply.beginOnboarding": {
          id: "c082a534-6342-40e1-90da-dcd2de6bf934",
          appId: "123",
          configId: "345",
          version: "v26.0",
          origin: "https://selrs.cc",
        },
        "autoReply.exchangeOnboardingCode": { ok: true },
        "autoReply.finishOnboarding": { ok: true },
        "autoReply.activity": [],
        "autoReply.test": {
          text: "نتيجة اختبار محلي دون إرسال",
          handoff: true,
          reason: "missing_information",
          sourceIds: [],
          inputTokens: 0,
          outputTokens: 0,
          model: null,
          testOnly: true,
          inWorkingHours: true,
        },
      };
      if (route.request().method() !== "GET") {
        mutations.push(method);
        assert.ok(
          [
            "autoReply.test",
            ...(mode.startsWith("coexist_")
              ? [
                  "autoReply.beginOnboarding",
                  "autoReply.exchangeOnboardingCode",
                  "autoReply.finishOnboarding",
                ]
              : []),
          ].includes(method),
          "Only explicitly isolated fixture mutations may run",
        );
      }
      return { result: { data: { json: values[method] ?? [] } } };
    });
    await route.fulfill({
      json: url.searchParams.has("batch") ? results : (results[0] ?? {}),
    });
  });
  await page.goto(`${baseUrl}/admin-hub/auto-reply`);
  await page.locator(".auto-reply h1").waitFor();
  return { page, errors, mutations };
}
async function checkLayout(page) {
  await page.locator(".auto-reply").evaluate(async (node) => {
    await Promise.all(
      node
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished.catch(() => {})),
    );
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    ),
    false,
    "Page must not overflow horizontally",
  );
  const clipped = await page
    .locator(".auto-reply button:visible")
    .evaluateAll((nodes) =>
      nodes
        .filter((n) => n.scrollWidth > n.clientWidth + 2)
        .map((n) => n.textContent),
    );
  assert.deepEqual(clipped, [], "Buttons must keep their labels visible");
}
try {
  for (const width of [320, 390, 768, 1440])
    for (const theme of ["light", "dark"]) {
      const { page, errors } = await open(width, theme);
      await page.getByRole("button", { name: /fixture-customer/ }).click();
      await page.getByText("رسالة اختبار محلي", { exact: true }).waitFor();
      assert.equal(
        await page
          .getByRole("button", { name: "إرسال رد الموظف", exact: true })
          .isDisabled(),
        true,
      );
      await checkLayout(page);
      await page
        .getByRole("button", { name: "المحادثات", exact: true })
        .focus();
      await page.keyboard.press("Tab");
      assert.equal(
        await page
          .getByRole("button", { name: "معلومات المركز", exact: true })
          .evaluate(
            (node) =>
              node === document.activeElement &&
              parseFloat(getComputedStyle(node).outlineWidth) >= 2,
          ),
        true,
        "Tabs retain keyboard focus with a visible outline",
      );
      for (const tab of [
        "معلومات المركز",
        "الربط والإعدادات",
        "اختبار داخلي",
        "سجل الإرسال",
      ]) {
        await page.getByRole("button", { name: tab, exact: true }).click();
        await checkLayout(page);
        if (tab === "الربط والإعدادات") {
          await page.getByText(/رقم تأكيد الحجوزات منفصل/).waitFor();
          assert.equal(
            await page
              .getByRole("button", { name: "فحص الوصول لدى Meta", exact: true })
              .first()
              .isDisabled(),
            true,
          );
          await page
            .getByRole("button", { name: "إضافة فترة عمل للمراجعة" })
            .click();
          await page
            .getByRole("button", { name: "إضافة تعليمة", exact: true })
            .click();
          await page
            .getByLabel("نص التعليمة 1", { exact: true })
            .fill("تعليمة اختبار أولى");
          await page
            .getByLabel("تطبيق التعليمة 1 على", { exact: true })
            .selectOption("456");
          assert.equal(
            await page
              .getByLabel("تطبيق التعليمة 1 على", { exact: true })
              .inputValue(),
            "456",
          );
          await page
            .getByRole("button", { name: "إضافة تعليمة", exact: true })
            .click();
          await page
            .getByLabel("نص التعليمة 2", { exact: true })
            .fill("تعليمة اختبار ثانية");
          await page.getByLabel("تفعيل التعليمة 2", { exact: true }).uncheck();
          await checkLayout(page);
          const contrast = await page
            .getByLabel("نص التعليمة 1", { exact: true })
            .evaluate((node) => {
              const context = document.createElement("canvas").getContext("2d");
              if (!context) throw new Error("Cannot measure control colors");
              const luminance = (color) => {
                context.clearRect(0, 0, 1, 1);
                context.fillStyle = color;
                context.fillRect(0, 0, 1, 1);
                const rgba = context.getImageData(0, 0, 1, 1).data;
                if (rgba[3] !== 255)
                  throw new Error("Expected opaque control colors");
                const values = Array.from(rgba)
                  .slice(0, 3)
                  .map((value) => {
                    const channel = value / 255;
                    return channel <= 0.04045
                      ? channel / 12.92
                      : ((channel + 0.055) / 1.055) ** 2.4;
                  });
                return (
                  values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722
                );
              };
              const styles = getComputedStyle(node);
              const foreground = luminance(
                styles.webkitTextFillColor || styles.color,
              );
              const background = luminance(styles.backgroundColor);
              return (
                (Math.max(foreground, background) + 0.05) /
                (Math.min(foreground, background) + 0.05)
              );
            });
          assert.ok(
            contrast >= 4.5,
            `Filled instruction contrast ${contrast.toFixed(2)}:1 at ${width}px ${theme}`,
          );
          instructionContrasts.push({ theme, width, ratio: contrast });
          assert.equal(
            await page
              .getByLabel("تفعيل التعليمة 1", { exact: true })
              .isChecked(),
            true,
          );
          assert.equal(
            await page
              .getByLabel("تفعيل التعليمة 2", { exact: true })
              .isChecked(),
            false,
          );
          await checkLayout(page);
          if (width === 390)
            await page.screenshot({
              path: `outputs/auto-reply/instructions-${theme}-390.png`,
              fullPage: true,
            });
          await page
            .getByRole("button", { name: "حذف التعليمة 1", exact: true })
            .click();
          assert.equal(
            await page
              .getByLabel("نص التعليمة 1", { exact: true })
              .inputValue(),
            "تعليمة اختبار ثانية",
          );
          assert.equal(
            await page
              .getByLabel("تفعيل التعليمة 1", { exact: true })
              .isChecked(),
            false,
          );
        }
        if (tab === "اختبار داخلي") {
          await page.getByLabel("القناة", { exact: true }).selectOption("messenger");
          await page.getByLabel("صفحة الاختبار", { exact: true }).selectOption("654");
          await page.getByLabel("رسالة العميل للاختبار").fill("سؤال اختبار");
          await page
            .getByRole("button", { name: "عرض الرد المقترح", exact: true })
            .click();
          await page
            .getByRole("heading", { name: "نتيجة اختبار، لم يُرسل رد" })
            .waitFor();
        }
        if (tab === "معلومات المركز") {
          await page
            .getByRole("button", {
              name: "استيراد خدمات المركز فقط للمراجعة",
              exact: true,
            })
            .waitFor();
          await page
            .getByRole("button", { name: "إضافة معلومة", exact: true })
            .click();
          await page
            .getByLabel("النوع", { exact: true })
            .selectOption("service");
          await page.getByLabel("النوع", { exact: true }).selectOption("price");
          await page.getByLabel("يُستخدم في", { exact: true }).selectOption("654");
          assert.equal(await page.getByLabel("يُستخدم في", { exact: true }).inputValue(), "654");
          await page.getByLabel("يُستخدم في", { exact: true }).selectOption("facebook");
          await page
            .getByRole("button", { name: "إلغاء التعديل", exact: true })
            .click();
        }
      }
      await page
        .getByRole("button", { name: "المحادثات", exact: true })
        .click();
      await checkLayout(page);
      await page.screenshot({
        path: `outputs/auto-reply/${theme}-${width}.png`,
        fullPage: true,
      });
      assert.deepEqual(errors, []);
      await page.close();
    }
  const empty = await open(390, "light", "empty");
  await empty.page.getByText(/لا توجد محادثات مطابقة/).waitFor();
  await empty.page.close();
  const legacy = await open(390, "light", "legacy_config");
  await legacy.page
    .getByRole("button", { name: "الربط والإعدادات", exact: true })
    .click();
  await legacy.page
    .getByRole("button", { name: "إضافة تعليمة", exact: true })
    .click();
  await legacy.page
    .getByLabel("نص التعليمة 1", { exact: true })
    .fill("تعليمة مع إعدادات قديمة");
  assert.deepEqual(legacy.errors, []);
  await legacy.page.close();
  const failed = await open(390, "dark", "error");
  await failed.page
    .getByRole("alert")
    .filter({ hasText: "FIXTURE_STORAGE_UNAVAILABLE" })
    .waitFor();
  await failed.page.close();
  const twoPages = await open(390, "light", "two_pages");
  await twoPages.page.locator(".ar-conversation").first().waitFor();
  assert.equal(await twoPages.page.locator(".ar-conversation").count(), 2);
  await twoPages.page
    .getByLabel("صفحة فيسبوك", { exact: true })
    .selectOption("456");
  await twoPages.page
    .locator(".ar-conversation")
    .filter({ hasText: "الصفحة الأولى" })
    .waitFor();
  assert.equal(await twoPages.page.locator(".ar-conversation").count(), 1);
  await twoPages.page
    .getByLabel("صفحة فيسبوك", { exact: true })
    .selectOption("654");
  await twoPages.page
    .locator(".ar-conversation")
    .filter({ hasText: "الصفحة الثانية" })
    .click();
  await twoPages.page
    .locator(".ar-thread")
    .getByRole("heading", { name: /الصفحة الثانية/ })
    .waitFor();
  await checkLayout(twoPages.page);
  await twoPages.page.screenshot({
    path: "outputs/auto-reply/two-pages-390.png",
    fullPage: true,
  });
  assert.deepEqual(twoPages.errors, []);
  await twoPages.page.close();
  for (const mode of ["coexist_code_first", "coexist_assets_first"]) {
    const signup = await open(390, "dark", mode);
    await signup.page
      .getByRole("button", { name: "الربط والإعدادات", exact: true })
      .click();
    await signup.page
      .getByRole("button", { name: "تجهيز محاولة الربط", exact: true })
      .click();
    await signup.page
      .getByRole("button", {
        name: "فتح Meta لربط رقم خدمة العملاء",
        exact: true,
      })
      .click();
    await signup.page
      .getByRole("status")
      .filter({ hasText: "تم التحقق من أصل واتساب" })
      .waitFor();
    assert.deepEqual(signup.mutations, [
      "autoReply.beginOnboarding",
      "autoReply.exchangeOnboardingCode",
      "autoReply.finishOnboarding",
    ]);
    assert.deepEqual(signup.errors, []);
    await checkLayout(signup.page);
    await signup.page.screenshot({
      path: `outputs/auto-reply/${mode}-390.png`,
      fullPage: true,
    });
    await signup.page.close();
  }
  console.log(
    "Coexistence SDK fixtures: code-before-assets and assets-before-code passed; no live Meta onboarding.",
  );
  console.log(
    "Auto-reply UI: 8 viewport/theme cases, multiple instructions, manual service/price options, page isolation/filter, empty/error states and internal test passed (API fixtures only; no live Meta/Gemini calls).",
  );
  console.log(
    JSON.stringify({
      minimumFilledInstructionContrast: Object.fromEntries(
        ["light", "dark"].map((theme) => [
          theme,
          Number(
            Math.min(
              ...instructionContrasts
                .filter((item) => item.theme === theme)
                .map((item) => item.ratio),
            ).toFixed(2),
          ),
        ]),
      ),
    }),
  );
} finally {
  await browser.close();
}
