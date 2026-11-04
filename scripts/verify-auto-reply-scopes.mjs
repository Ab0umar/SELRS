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
  model: "gemini-2.5-flash",
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
  const requests = [];
  let fixtureConfig = structuredClone(
    mode === "legacy_config" ? legacyConfig : config,
  );
  const teachingRows = [];
  let onboardingFinished = false;
  page.on("pageerror", (error) => {
    errors.push(error.message);
    console.error("Fixture browser error:", error.message);
  });
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
      requests.push({ method, input });
      if (method === "autoReply.saveSettings")
        fixtureConfig = structuredClone(input);
      const pageConversations = pages.map((p, i) => ({
        ...conversation,
        id: i + 2,
        channel: "messenger",
        accountId: p.accountId,
        participantId: "same-fixture-customer",
      }));
      const selectedConversation =
        pageConversations.find((c) => c.id === input) ?? conversation;
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
          config: fixtureConfig,
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
                : [conversation, ...pageConversations].filter(
                    (c) =>
                      (!input?.channel || c.channel === input.channel) &&
                      (!input?.accountId || c.accountId === input.accountId),
                  ),
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
        "autoReply.teaching": teachingRows,
        "autoReply.models": [
          {
            id: "gemini-3.8-flash",
            label: "Gemini 3.8 Flash",
            outputTokenLimit: 8192,
          },
          {
            id: "gemini-2.5-flash",
            label: "Gemini 2.5 Flash",
            topK: 40,
            outputTokenLimit: 8192,
          },
        ],
        "autoReply.saveTeaching": { ok: true },
        "autoReply.clearAIHistory": { count: 1 },
        "autoReply.saveSettings": { ok: true },
        "autoReply.previewWebsite": {
          url: "https://example.com/public",
          title: "موقع اختبار محلي",
          content: "محتوى موقع اختبار معلن، دون قراءة موقع حقيقي. ".repeat(12),
          truncated: false,
        },
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
        if (method === "autoReply.saveTeaching")
          teachingRows.push({
            id: teachingRows.length + 1000,
            kind: input.sourceUrl ? "website" : "teach_ai",
            title: input.title,
            content: input.content,
            targetPage: input.targetPage,
            approved: input.enabled,
            sourceUrl: input.sourceUrl,
            updatedAt: date,
          });
        assert.ok(
          [
            "autoReply.test",
            "autoReply.saveTeaching",
            "autoReply.previewWebsite",
            "autoReply.clearAIHistory",
            "autoReply.saveSettings",
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
  return {
    page,
    errors,
    mutations,
    teachingRows,
    requests,
    getConfig: () => fixtureConfig,
  };
}
async function checkLayout(page) {
  await page
    .locator(".auto-reply")
    .first()
    .evaluate(async (node) => {
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
const goScope = (page, name) =>
  page
    .getByRole("navigation", { name: "جهة الرد الآلي", exact: true })
    .getByRole("button", { name, exact: true })
    .click();
const goTab = (page, name) =>
  page
    .getByRole("navigation", { name: "أقسام الرد الآلي", exact: true })
    .getByRole("button", { name, exact: true })
    .click();
async function saveSettings(page) {
  assert.deepEqual(
    await page.locator(".ar-settings :invalid").evaluateAll((nodes) =>
      nodes.map((n) => ({
        label: n.getAttribute("aria-label"),
        value: n.value,
        message: n.validationMessage,
      })),
    ),
    [],
    "Settings fields must be valid before saving",
  );
  const mutation = page.waitForResponse(
    (r) =>
      r.url().includes("autoReply.saveSettings") &&
      r.request().method() === "POST",
  );
  const response = page.waitForResponse(
    (r) =>
      r.url().includes("autoReply.settings") && r.request().method() === "GET",
  );
  await page
    .getByRole("button", { name: "حفظ إعدادات الرد الآلي", exact: true })
    .click();
  await mutation;
  await response;
}
async function addText(page, title) {
  await page
    .getByRole("button", { name: "إضافة نص للتعليم", exact: true })
    .click();
  await page.getByLabel("اسم المحتوى (اختياري)", { exact: true }).fill(title);
  await page
    .getByLabel("النص الذي يتعلم منه المساعد", { exact: true })
    .fill("محتوى اختبار محلي دون بيانات عملاء.");
  await page.getByRole("button", { name: "حفظ المحتوى", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
}
try {
  for (const width of [320, 390, 768, 1440])
    for (const theme of ["light", "dark"]) {
      const { page, errors, requests, teachingRows, getConfig } = await open(
        width,
        theme,
      );
      await page.getByRole("button", { name: /fixture-customer/ }).click();
      await page.getByRole("dialog").waitFor();
      await page.getByText("رسالة اختبار محلي", { exact: true }).waitFor();
      await checkLayout(page);
      if ([390, 1440].includes(width))
        await page.screenshot({
          path: `outputs/auto-reply/scoped-dialog-${theme}-${width}.png`,
          fullPage: true,
          animations: "disabled",
        });
      await page.keyboard.press("Escape");
      assert.equal(await page.locator(".ar-conversation:visible").count(), 1);
      await goScope(page, "صفحة المركز");
      assert.equal(
        await page
          .getByRole("navigation", { name: "القنوات", exact: true })
          .getByRole("button")
          .count(),
        2,
      );
      await goTab(page, "Teach AI");
      await addText(page, "نص المركز للاختبار");
      assert.equal(teachingRows[0].targetPage, "456");
      await goScope(page, "صفحة العيادة");
      await goTab(page, "Teach AI");
      assert.equal(await page.locator(".ar-teaching-card").count(), 0);
      await addText(page, "نص العيادة للاختبار");
      assert.equal(teachingRows[1].targetPage, "654");
      await goScope(page, "المشترك");
      assert.equal(await page.locator(".ar-teaching-card").count(), 0);
      await addText(page, "نص مشترك للاختبار");
      assert.equal(teachingRows[2].targetPage, "all");
      assert.equal(await page.locator(".ar-teaching-card").count(), 1);
      await goScope(page, "واتساب");
      await goTab(page, "ذاكرة وحدود الرد");
      await page
        .getByLabel("عدد الرسائل التي يتذكرها المساعد", { exact: true })
        .fill("4");
      await saveSettings(page);
      assert.equal(getConfig().targets.whatsapp.historyMessageLimit, 4);
      await goScope(page, "صفحة المركز");
      await goTab(page, "ذاكرة وحدود الرد");
      assert.equal(
        await page
          .getByLabel("عدد الرسائل التي يتذكرها المساعد", { exact: true })
          .inputValue(),
        "12",
      );
      await page
        .getByLabel("عدد الرسائل التي يتذكرها المساعد", { exact: true })
        .fill("7");
      page.once("dialog", (dialog) => dialog.dismiss());
      await goScope(page, "صفحة العيادة");
      await page
        .getByRole("navigation", { name: "جهة الرد الآلي" })
        .getByRole("button", { name: "صفحة المركز", exact: true })
        .getAttribute("aria-pressed")
        .then((value) => assert.equal(value, "true"));
      assert.equal(
        await page
          .getByLabel("عدد الرسائل التي يتذكرها المساعد", { exact: true })
          .inputValue(),
        "7",
      );
      await saveSettings(page);
      assert.equal(getConfig().targets["456"].historyMessageLimit, 7);
      assert.equal(getConfig().targets.whatsapp.historyMessageLimit, 4);
      page.once("dialog", (dialog) => dialog.accept());
      await page
        .getByRole("button", { name: "مسح سياق الذكاء الاصطناعي", exact: true })
        .click();
      await page.getByText(/تم بدء سياق جديد/).waitFor();
      assert.equal(
        requests.filter((r) => r.method === "autoReply.clearAIHistory").at(-1)
          .input.targetPage,
        "456",
      );
      await goTab(page, "الرد والتعليمات");
      await page
        .getByRole("button", { name: "إضافة تعليمة", exact: true })
        .click();
      await page
        .getByLabel("نص التعليمة 1", { exact: true })
        .fill("تعليمة خاصة بالمركز فقط.");
      await saveSettings(page);
      assert.equal(getConfig().instructions[0].targetPage, "456");
      await goTab(page, "التشغيل والمواعيد");
      await page
        .getByLabel("تشغيل الرد الآلي على ماسنجر", { exact: true })
        .check();
      await page
        .getByRole("button", { name: "إضافة فترة عمل للمراجعة" })
        .click();
      await page
        .getByLabel("إرسال رسالة خارج المواعيد", { exact: true })
        .check();
      await saveSettings(page);
      assert.equal(getConfig().targets["456"].hoursEnabled, true);
      assert.equal(getConfig().targets.whatsapp.hoursEnabled, false);
      assert.equal(getConfig().facebookPages["456"].messenger, true);
      assert.equal(getConfig().facebookPages["654"]?.messenger ?? false, false);
      await goTab(page, "السجل");
      await page
        .getByRole("navigation", { name: "القنوات", exact: true })
        .getByRole("button", { name: "كومينت", exact: true })
        .click();
      await page.getByText(/لا توجد مهام إرسال/).waitFor();
      assert.equal(
        requests.filter((r) => r.method === "autoReply.activity").at(-1).input
          .accountId,
        "456",
      );
      assert.equal(
        requests.filter((r) => r.method === "autoReply.activity").at(-1).input
          .channel,
        "facebook_comment",
      );
      await goTab(page, "اختبار داخلي");
      await page
        .getByLabel("رسالة العميل للاختبار", { exact: true })
        .fill("عنوان الفرع");
      await page
        .getByRole("button", { name: "عرض الرد المقترح", exact: true })
        .click();
      await page
        .getByRole("heading", {
          name: "نتيجة اختبار، لم يُرسل رد",
          exact: true,
        })
        .waitFor();
      assert.equal(
        requests.filter((r) => r.method === "autoReply.test").at(-1).input
          .accountId,
        "456",
      );
      for (const tab of [
        "المحادثات",
        "Teach AI",
        "الربط والفحص",
        "التشغيل والمواعيد",
        "الرد والتعليمات",
        "ذاكرة وحدود الرد",
        "السجل",
      ]) {
        await goTab(page, tab);
        await checkLayout(page);
        if ([390, 1440].includes(width))
          await page.screenshot({
            path: `outputs/auto-reply/scoped-${tab}-${theme}-${width}.png`,
            fullPage: true,
            animations: "disabled",
          });
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
  for (const mode of ["coexist_code_first", "coexist_assets_first"]) {
    const { page, errors } = await open(390, "dark", mode);
    await goTab(page, "الربط والفحص");
    await page
      .locator("summary")
      .filter({ hasText: "إدارة ربط واتساب مع الموبايل" })
      .click();
    await page
      .getByRole("button", { name: "تجهيز محاولة الربط", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "فتح Meta لربط رقم خدمة العملاء",
        exact: true,
      })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "تم التحقق من أصل واتساب" })
      .waitFor();
    assert.deepEqual(errors, []);
    await page.close();
  }
  const empty = await open(390, "light", "empty");
  await empty.page.getByText(/لا توجد محادثات مطابقة/).waitFor();
  await empty.page.close();
  const failed = await open(390, "dark", "error");
  await failed.page
    .getByRole("alert")
    .filter({ hasText: "FIXTURE_STORAGE_UNAVAILABLE" })
    .waitFor();
  await failed.page.close();
  console.log(
    "Scope-first Auto Reply: 8 viewport/theme cases passed, isolated scopes, dialogs, independent history/schedules, scoped log/reset/test, empty/error and Coexistence ordering. API fixtures only; no live messages.",
  );
} finally {
  await browser.close();
}
