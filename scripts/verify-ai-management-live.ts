import "dotenv/config";
import assert from "node:assert/strict";
import { mkdir, writeFile, copyFile, readFile } from "node:fs/promises";
import path from "node:path";
import mysql, { type RowDataPacket } from "mysql2/promise";
import { chromium, expect as baseExpect } from "@playwright/test";
import { authService } from "../server/_core/auth";
import { revokeAuthSession } from "../server/db";
import {
  profileSchema,
  type AiProfile,
} from "../server/services/ai/managementStore";

const expect = baseExpect.configure({ timeout: 120000 });
const base = "http://127.0.0.1:4000";
const evidence = process.argv.includes("--final-status")
  ? "outputs/ai-management-activation/final"
  : process.argv.includes("--reply-live")
    ? "outputs/ai-management-activation/reply-live"
    : process.argv.includes("--medical-workflow")
      ? "outputs/ai-management-activation/medical-workflow"
      : process.argv.includes("--whatsapp-copy") ||
          process.argv.includes("--whatsapp-inspect")
        ? "outputs/ai-management-activation/whatsapp-copy"
        : process.argv.includes("--marketing-recovery")
          ? "outputs/ai-management-activation/recovery"
          : process.argv.includes("--topic-retirement")
            ? "outputs/ai-management-activation/topic-retirement"
            : process.argv.includes("--image-workflow")
              ? "outputs/ai-management-activation/image-workflow"
              : process.argv.includes("--marketing-drafts") ||
                  process.argv.includes("--marketing-inspect")
                ? "outputs/ai-management-activation/marketing"
                : "outputs/ai-management-activation";
const connection = await mysql.createConnection(process.env.DATABASE_URL!);
const sessions: string[] = [];
const touchedWorkloads = new Set<string>();
let originalProfiles: AiProfile[] | undefined;
let adminToken: string | undefined;
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
const checks: string[] = [];

async function sessionFor(role: "admin" | "doctor") {
  const [accounts] = await connection.execute<RowDataPacket[]>(
    "SELECT id, username, role, branch, authVersion FROM users WHERE role=? AND isActive=1 ORDER BY id LIMIT 1",
    [role],
  );
  if (!accounts[0]) return undefined;
  const account = accounts[0];
  const token = await authService.createSessionToken(
    account.id,
    account.username,
    account.role,
    account.branch,
    { expiresInMs: 600000, authVersion: account.authVersion },
  );
  const payload = authService.verifyToken(token);
  assert.ok(payload.jti);
  sessions.push(payload.jti);
  return token;
}

async function rpc(
  method: string,
  token: string,
  input?: unknown,
  mutation = false,
) {
  assert.ok(
    method.startsWith("aiManagement.") ||
      method === "autoReply.test" ||
      method === "autoReply.settings" ||
      method === "medicalAssistant.providerOptions" ||
      method === "medicalAssistant.speechToken" ||
      method.startsWith("marketing."),
  );
  const payload = JSON.stringify({ json: input ?? null });
  const response = await fetch(
    `${base}/api/trpc/${method}${mutation ? "" : `?input=${encodeURIComponent(payload)}`}`,
    {
      method: mutation ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      ...(mutation ? { body: payload } : {}),
    },
  );
  assert.equal(response.status, 200, `Live ${method} HTTP ${response.status}`);
  const envelope = await response.json();
  assert.ok(envelope.result, `Live ${method} rejected`);
  return envelope.result.data.json;
}

async function verifyReplyPreview() {
  assert.ok(adminToken && originalProfiles);
  const engine = process.argv.includes("--reply-live")
    ? "central_live"
    : "central";
  const workload = engine === "central_live" ? "reply.live" : "reply.preview";
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.addCookies([
    {
      name: "app_session_id",
      value: adminToken,
      url: base,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const page = await context.newPage();
  let blockedSends = 0;
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    if (
      request.method() === "GET" ||
      request.url().includes("/api/trpc/autoReply.test")
    )
      return route.continue();
    blockedSends++;
    await route.abort("blockedbyclient");
  });
  await page.goto(`${base}/admin-hub/auto-reply`);
  await page.getByRole("button", { name: "اختبار داخلي", exact: true }).click();
  const panel = page.locator(".ar-panel").filter({
    has: page.getByRole("heading", {
      name: "اختبار داخلي دون إرسال للعملاء",
      exact: true,
    }),
  });
  await expect(panel.getByLabel("محرك المعاينة")).toHaveValue("current");
  await panel.getByLabel("محرك المعاينة").selectOption(engine);
  await panel
    .getByLabel("القناة", { exact: true })
    .selectOption("facebook_comment");
  const pageSelect = panel.getByLabel("صفحة الاختبار", { exact: true });
  const accountId = await pageSelect
    .locator("option")
    .evaluateAll((options) =>
      options
        .map((option) => option.value)
        .find((value) => /^\d+$/.test(value)),
    );
  assert.ok(
    accountId,
    "Configured Facebook page required for isolated public-comment preview",
  );
  await pageSelect.selectOption(accountId);
  await panel.getByLabel("رسالة العميل للاختبار").fill("Hello");
  await panel.getByRole("button", { name: "عرض الرد المقترح" }).click();
  await expect(panel.getByText(/المعاينة المركزية غير متاحة/)).toBeVisible();
  checks.push(
    "disabled central profile fails visibly without falling back to current transport",
  );
  const profile = originalProfiles.find(
    (profile) => profile.workload === workload,
  )!;
  touchedWorkloads.add(profile.workload);
  await rpc(
    "aiManagement.updateProfile",
    adminToken,
    { ...profile, enabled: true },
    true,
  );
  const completed = page.waitForResponse(
    (response) =>
      response.url().includes("/api/trpc/autoReply.test") &&
      response.status() === 200,
  );
  await panel.getByRole("button", { name: "عرض الرد المقترح" }).click();
  const envelope = await (await completed).json();
  const proposal = (Array.isArray(envelope) ? envelope[0] : envelope).result
    .data.json;
  assert.equal(proposal.engine, engine);
  assert.equal(proposal.testOnly, true);
  assert.equal(proposal.model, profile.model);
  assert.equal(proposal.handoff, false);
  assert.ok(proposal.text.length > 0 && proposal.outputTokens > 0);
  await expect(
    panel.getByText("نتيجة اختبار، لم يُرسل رد", { exact: true }),
  ).toBeVisible();
  await panel.screenshot({ path: `${evidence}/reply-preview-live.png` });
  const usage = await rpc("aiManagement.usage", adminToken);
  assert.ok(
    usage.some(
      (row: { request_id: string; state: string }) =>
        row.request_id === proposal.requestId && row.state === "completed",
    ),
  );
  await writeFile(
    `${evidence}/reply-preview-usage.json`,
    JSON.stringify(
      usage.filter(
        (row: { request_id: string }) => row.request_id === proposal.requestId,
      ),
      null,
      2,
    ),
  );
  await assert.rejects(
    rpc(
      "autoReply.test",
      adminToken,
      {
        channel: "facebook_comment",
        accountId,
        text: "Hello",
        engine,
        requestId: proposal.requestId,
      },
      true,
    ),
  );
  assert.equal(blockedSends, 0);
  checks.push(
    "live auto-reply central preview generated from actual UI, persisted usage, and rejected duplicate request ID",
  );
  await context.close();
}

async function verifyMarketingDrafts() {
  assert.ok(adminToken && originalProfiles);
  for (const workload of ["marketing.text", "marketing.image"] as const) {
    const profile = originalProfiles.find(
      (profile) => profile.workload === workload,
    )!;
    assert.equal(
      profile.provider,
      "gemini",
      "Configure Gemini marketing profiles before live test",
    );
    if (!profile.enabled) {
      touchedWorkloads.add(workload);
      await rpc(
        "aiManagement.updateProfile",
        adminToken,
        { ...profile, enabled: true },
        true,
      );
    }
  }
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.addCookies([
    {
      name: "app_session_id",
      value: adminToken,
      url: base,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const page = await context.newPage();
  let publications = 0;
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    if (
      request.method() === "GET" ||
      request.url().includes("/api/trpc/marketing.generateCentralPost")
    )
      return route.continue();
    publications++;
    await route.abort("blockedbyclient");
  });
  const drafts = [];
  for (const pageRole of ["center", "doctor"] as const) {
    await page.goto(`${base}/marketing`);
    const panel = page.getByRole("region", {
      name: "مسودة Gemini المركزية",
      exact: true,
    });
    await expect(panel.getByRole("heading")).toBeVisible();
    const another = panel.getByRole("button", { name: "تجهيز مسودة أخرى" });
    if (pageRole === "doctor") await another.click();
    await panel
      .getByLabel("صفحة مسودة Gemini", { exact: true })
      .selectOption(pageRole);
    const days = await panel
      .getByLabel("يوم مسودة Gemini", { exact: true })
      .locator("option")
      .allTextContents();
    assert.deepEqual(
      days,
      pageRole === "center"
        ? ["الأحد", "الثلاثاء", "الخميس"]
        : ["السبت", "الاثنين", "الأربعاء"],
    );
    const topic =
      pageRole === "center"
        ? "التواصل مع مركز عيون الشروق وحجز الزيارة"
        : "التواصل مع عيادة الأستاذ الدكتور محمد السعدني غرابه";
    await panel.getByLabel("موضوع مسودة Gemini", { exact: true }).fill(topic);
    await panel
      .getByRole("button", { name: "توليد نص وصورة وحفظ مسودة" })
      .click();
    const jobId = await page.evaluate(() =>
      sessionStorage.getItem("selrs.central-marketing.request"),
    );
    assert.ok(jobId);
    if (pageRole === "doctor") {
      await expect
        .poll(
          async () =>
            (await rpc("marketing.centralGenerationJobs", adminToken!)).some(
              (job: { id: string }) => job.id === jobId,
            ),
          { timeout: 20000 },
        )
        .toBe(true);
      await page.reload();
    }
    await expect(
      panel.getByText("المسودة جاهزة بالنص والصورة، ولم تُنشر.", {
        exact: true,
      }),
    ).toBeVisible();
    const jobs = await rpc("marketing.centralGenerationJobs", adminToken);
    const job = jobs.find((job: { id: string }) => job.id === jobId);
    assert.equal(job.state, "completed");
    assert.ok(job.referenceIds.length > 0);
    for (const referenceId of job.referenceIds) {
      const [references] = await connection.execute<RowDataPacket[]>(
        "SELECT page_role FROM marketing_reference_designs WHERE id=?",
        [referenceId],
      );
      assert.equal(references[0].page_role, pageRole);
    }
    const post = await rpc("marketing.getPost", adminToken, { id: job.postId });
    assert.equal(post.status, "draft");
    assert.equal(post.pageRole, pageRole);
    assert.ok(
      post.content.length > 0 &&
        post.imageUrl.startsWith("/uploads/marketing/gemini-"),
    );
    const duplicate = await rpc(
      "marketing.generateCentralPost",
      adminToken,
      { requestId: jobId, topic, pageRole, postDay: "saturday" },
      true,
    );
    assert.equal(duplicate.postId, post.id);
    const [counts] = await connection.execute<RowDataPacket[]>(
      "SELECT COUNT(*) AS total FROM marketing_posts WHERE id=? AND status='draft'",
      [post.id],
    );
    assert.equal(Number(counts[0].total), 1);
    const imageName = path.basename(post.imageUrl);
    const imageDirectory =
      process.env.MARKETING_IMAGE_DIR || path.resolve("uploads/marketing");
    await copyFile(
      path.join(imageDirectory, imageName),
      `${evidence}/${pageRole}-${imageName}`,
    );
    await page.goto(`${base}/marketing/drafts`);
    const rendered = page.locator(`img[src="${post.imageUrl}"]`);
    await expect(rendered.first()).toBeVisible();
    assert.ok(
      await rendered
        .first()
        .evaluate((image: HTMLImageElement) => image.naturalWidth >= 256),
    );
    await rendered
      .first()
      .screenshot({ path: `${evidence}/${pageRole}-draft-image.png` });
    drafts.push({
      id: post.id,
      pageRole,
      title: post.title,
      content: post.content,
      cta: post.cta,
      imageUrl: post.imageUrl,
      state: post.status,
      jobId,
      referenceIds: job.referenceIds,
    });
  }
  assert.equal(publications, 0);
  await writeFile(`${evidence}/drafts.json`, JSON.stringify(drafts, null, 2));
  checks.push(
    "actual Gemini text/image drafts for both pages; correct calendars; existing draft screen renders images; duplicate requests return same post; doctor generation survives browser reload; no publishing",
  );
  await context.close();
}

async function verifyWhatsAppCopy() {
  assert.ok(adminToken && originalProfiles);
  const inspect = process.argv.includes("--whatsapp-inspect");
  const profile = originalProfiles.find(
    (p) => p.workload === "whatsapp.marketing",
  )!;
  assert.ok(profile);
  assert.equal(profile.provider, "gemini");
  if (!inspect && !profile.enabled) {
    touchedWorkloads.add(profile.workload);
    await rpc(
      "aiManagement.updateProfile",
      adminToken,
      { ...profile, enabled: true },
      true,
    );
  }
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  if (inspect) {
    const saved = JSON.parse(await readFile(`${evidence}/draft.json`, "utf8"));
    await context.addInitScript(
      (id) => sessionStorage.setItem("selrs.whatsapp.copy.request", id),
      saved.id,
    );
  }
  await context.addCookies([
    {
      name: "app_session_id",
      value: adminToken,
      url: base,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const page = await context.newPage();
  let blocked = 0;
  await page.route("**/api/**", async (route) => {
    if (
      route.request().method() === "GET" ||
      route.request().url().includes("/api/trpc/marketing.generateWhatsAppCopy")
    )
      return route.continue();
    blocked++;
    await route.abort("blockedbyclient");
  });
  await page.goto(`${base}/marketing/whatsapp`);
  const panel = page.getByRole("region", {
    name: "صياغة رسائل واتساب",
    exact: true,
  });
  if (!inspect) {
    await panel.getByLabel("نوع الرسالة").selectOption("exam");
    await panel.getByLabel("الثلاثاء", { exact: true }).uncheck();
    await panel
      .getByRole("button", { name: "توليد ثلاث صيغ للمراجعة" })
      .click();
  }
  await expect(
    panel.getByRole("button", { name: "نسخ الصيغة 3", exact: true }),
  ).toBeVisible();
  const id = await page.evaluate(() =>
    sessionStorage.getItem("selrs.whatsapp.copy.request"),
  );
  assert.ok(id);
  const result = await rpc("marketing.readWhatsAppCopy", adminToken, {
    requestId: id,
  });
  assert.equal(result.variants.length, 3);
  for (const text of result.variants) {
    assert.ok(text.includes("الأحد والخميس"));
    assert.ok(text.includes("200ج") && text.includes("260ج"));
  }
  await page.reload();
  await expect(
    panel.getByRole("button", { name: "نسخ الصيغة 3", exact: true }),
  ).toBeVisible();
  const [usage] = await connection.execute<RowDataPacket[]>(
    "SELECT state,input_tokens,output_tokens FROM ai_core_usage WHERE request_id=?",
    [id],
  );
  assert.equal(usage.length, 1);
  assert.equal(usage[0].state, "completed");
  for (const index of [1, 2, 3]) {
    await panel
      .getByRole("button", { name: `نسخ الصيغة ${index}`, exact: true })
      .click();
    await expect(panel.getByRole("alert")).toHaveText(`تم نسخ الصيغة ${index}`);
    assert.equal(
      (await page.evaluate(() => navigator.clipboard.readText())).replaceAll("\r\n","\n"),
      result.variants[index - 1],
    );
  }
  const screenshots = [];
  for (const theme of ["light", "dark"]) {
    await page.evaluate((theme) => {
      document.documentElement.classList.toggle("dark", theme === "dark");
    }, theme);
    for (const width of [360, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
      );
      const file = `${evidence}/${theme}-${width}.png`;
      await panel.screenshot({ path: file });
      screenshots.push(file);
    }
  }
  assert.equal(blocked, 0);
  await writeFile(
    `${evidence}/draft.json`,
    JSON.stringify(
      { id, result, usage: usage[0], screenshots, noSending: true },
      null,
      2,
    ),
  );
  checks.push(
    "real Gemini WhatsApp copy via browser; selected center days and prices preserved; reload restores three saved variants; exactly one usage; responsive light/dark; no send mutations",
  );
  if (inspect) {
    await panel.getByRole("button", { name: "صياغة رسالة أخرى" }).click();
    await expect(
      panel.getByRole("button", { name: "توليد ثلاث صيغ للمراجعة" }),
    ).toBeDisabled();
    for (const kind of ["reminder", "lasik", "cataract", "exam"]) {
      await panel.getByLabel("نوع الرسالة").selectOption(kind);
    }
    await panel.getByLabel("الثلاثاء", { exact: true }).uncheck();
    await panel.getByLabel("الثلاثاء", { exact: true }).check();
    checks.push(
      "cached WhatsApp variants copied verbatim; reset and campaign/day controls work; no new generation or settings change",
    );
  }
  await context.close();
}

async function verifyMedicalWorkflow() {
  assert.ok(adminToken && originalProfiles);
  const profile = originalProfiles.find(
    (p) => p.workload === "medical.documentation",
  )!;
  assert.ok(profile);
  assert.equal(profile.provider, "manus");
  if (!profile.enabled) {
    touchedWorkloads.add(profile.workload);
    await rpc(
      "aiManagement.updateProfile",
      adminToken,
      { ...profile, enabled: true },
      true,
    );
  }
  const job = await rpc(
    "aiManagement.startMedicalSynthetic",
    adminToken,
    undefined,
    true,
  );
  const duplicate = await rpc(
    "aiManagement.startMedicalSynthetic",
    adminToken,
    undefined,
    true,
  );
  assert.equal(duplicate.jobId, job.jobId);
  let result:
    { status: string; result?: unknown; message?: string } | undefined;
  await expect
    .poll(
      async () => {
        result = await rpc(
          "aiManagement.readMedicalSynthetic",
          adminToken!,
          job,
        );
        return result!.status;
      },
      { timeout: 300000, intervals: [2500, 5000, 10000] },
    )
    .not.toBe("running");
  await writeFile(
    `${evidence}/result.json`,
    JSON.stringify({ job, result, synthetic: true }, null, 2),
  );
  assert.equal(result?.status, "complete");
  const [usage] = await connection.execute<RowDataPacket[]>(
    "SELECT workload,provider,state,credits,task_id FROM ai_core_usage WHERE request_id=?",
    [job.jobId],
  );
  assert.equal(usage.length, 1);
  assert.equal(usage[0].state, "completed");
  assert.equal(usage[0].provider, "manus");
  await writeFile(`${evidence}/usage.json`, JSON.stringify(usage, null, 2));
  checks.push(
    "actual central Manus synthetic documentation: existing strict source validation, duplicate reuses job, separate credits in central usage; no patient record or automatic apply",
  );
}

async function verifyFinalStatus() {
  assert.ok(adminToken && originalProfiles);
  const reply = await rpc("autoReply.settings", adminToken);
  const medical = await rpc("medicalAssistant.providerOptions", adminToken);
  const scheduler = await rpc(
    "marketing.centralSchedulerProviders",
    adminToken,
  );
  assert.equal(reply.config.engine, "current");
  assert.equal(medical.defaultProvider, "manus");
  assert.equal(medical.gemini.clinicalEnabled, false);
  for (const row of scheduler) assert.equal(row.provider, "manus");
  for (const workload of [
    "reply.live",
    "whatsapp.marketing",
    "medical.documentation",
  ])
    assert.equal(
      originalProfiles.find((p) => p.workload === workload)?.enabled,
      false,
    );
  let speech = "not configured in verifier environment";
  if (process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION) {
    const token = await rpc(
      "medicalAssistant.speechToken",
      adminToken,
      undefined,
      true,
    );
    assert.ok(token.token.length > 128);
    speech = "live Azure exchange passed; token discarded";
  }
  await writeFile(
    `${evidence}/status.json`,
    JSON.stringify(
      {
        replyEngine: reply.config.engine,
        medicalDefault: medical.defaultProvider,
        clinicalGeminiEnabled: medical.gemini.clinicalEnabled,
        scheduler,
        profiles: originalProfiles,
        speech,
        noMessagesSent: true,
      },
      null,
      2,
    ),
  );
  checks.push(
    "deployed defaults preserved; all seven profiles readable; new live features disabled until selected; clinical Gemini still gated; optional Azure exchange verified without retaining token",
  );
}

async function verifyMarketingSurface() {
  assert.ok(adminToken);
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  });
  for (const theme of ["light", "dark"]) {
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: "app_session_id",
        value: adminToken,
        url: base,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    await context.addInitScript(
      (theme) => localStorage.setItem("theme", theme),
      theme,
    );
    const page = await context.newPage();
    await page.route("**/api/**", (route) =>
      route.request().method() === "GET"
        ? route.continue()
        : route.abort("blockedbyclient"),
    );
    for (const width of [360, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`${base}/marketing`);
      const panel = page.getByRole("region", {
        name: "مسودة Gemini المركزية",
        exact: true,
      });
      await expect(panel.getByLabel("موضوع مسودة Gemini")).toBeVisible();
      const clearLocalNotifications = page.getByRole("button", {
        name: "مسح الإشعارات",
        exact: true,
      });
      if (await clearLocalNotifications.isVisible())
        await clearLocalNotifications.click();
      assert.ok(
        await panel.evaluate((node) => node.scrollWidth <= node.clientWidth),
        JSON.stringify(
          await panel.evaluate((node) => ({
            width: node.clientWidth,
            scroll: node.scrollWidth,
            children: [...node.querySelectorAll("*")]
              .filter(
                (child) =>
                  child.getBoundingClientRect().right >
                    node.getBoundingClientRect().right + 1 ||
                  child.getBoundingClientRect().left <
                    node.getBoundingClientRect().left - 1,
              )
              .map((child) => ({
                tag: child.tagName,
                text: child.textContent?.slice(0, 50),
                width: child.getBoundingClientRect().width,
              })),
          })),
        ),
      );
      const targets = await panel
        .locator("button,input,select")
        .evaluateAll((nodes) =>
          nodes.map((node) => node.getBoundingClientRect().height),
        );
      assert.ok(
        targets.every((height) => height >= 43.9),
        JSON.stringify(targets),
      );
      await panel.getByLabel("موضوع مسودة Gemini").fill("مراجعة عرض فقط");
      await panel.getByLabel("موضوع مسودة Gemini").focus();
      await expect(panel.getByLabel("موضوع مسودة Gemini")).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(
        panel.getByRole("button", { name: "توليد نص وصورة وحفظ مسودة" }),
      ).toBeFocused();
      await page.evaluate(
        () => (document.documentElement.style.fontSize = "200%"),
      );
      assert.ok(
        await panel.evaluate((node) => node.scrollWidth <= node.clientWidth),
      );
      await page.evaluate(() => (document.documentElement.style.fontSize = ""));
      await panel.screenshot({
        path: `${evidence}/surface-${theme}-${width}.png`,
      });
    }
    const completed = (
      await rpc("marketing.centralGenerationJobs", adminToken)
    ).find((job: { state: string }) => job.state === "completed");
    assert.ok(completed);
    await page.evaluate(
      (id) => sessionStorage.setItem("selrs.central-marketing.request", id),
      completed.id,
    );
    await page.reload();
    await expect(
      page.getByText("المسودة جاهزة بالنص والصورة، ولم تُنشر.", {
        exact: true,
      }),
    ).toBeVisible();
    const targeted = await rpc("marketing.centralGenerationJob", adminToken, {
      requestId: completed.id,
    });
    assert.equal(targeted.postId, completed.postId);
    await context.close();
  }
  checks.push(
    "marketing panel: light/dark, 360/768/1440 widths, 44px controls, keyboard focus, 200% text resize, no panel overflow, exact request tracking after reload; GET-only inspection without generation",
  );
}

async function verifyImageWorkflow() {
  assert.ok(adminToken);
  const fixtureTitle = `اختبار مؤقت لصورة Gemini ${Date.now()}`;
  const fixture = await rpc(
    "marketing.createPost",
    adminToken,
    {
      title: fixtureTitle,
      content: "تذكير تجريبي بالمتابعة الدورية للعين، دون نشر.",
      topic: "الكشف الدوري",
      imagePrompt: "An empty modern eye examination room, blue and white",
      pageRole: "center",
      postDay: "thursday",
      status: "draft",
    },
    true,
  );
  const postId = fixture.id;
  assert.ok(postId > 0);
  const original = await rpc("marketing.getPost", adminToken, { id: postId });
  assert.equal(
    original.status,
    "draft",
    "Retained verification draft must still be editable",
  );
  const modesBefore = await rpc(
    "marketing.centralSchedulerProviders",
    adminToken,
  );
  const [scheduleBefore] = await connection.query<RowDataPacket[]>(
    "SELECT page_role,auto_publish,saturday_enabled,tuesday_enabled,thursday_enabled,publish_hour FROM marketing_facebook_pages ORDER BY page_role",
  );
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.addCookies([
    {
      name: "app_session_id",
      value: adminToken,
      url: base,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const page = await context.newPage();
  let forbiddenMutations = 0;
  await page.route("**/api/**", async (route) => {
    if (
      route.request().method() === "GET" ||
      route
        .request()
        .url()
        .includes("/api/trpc/marketing.regenerateCentralImage")
    )
      return route.continue();
    forbiddenMutations++;
    await route.abort("blockedbyclient");
  });
  await page.goto(`${base}/marketing/drafts`);
  const button = page.getByRole("button", {
    name: `صورة Gemini للمسودة ${postId}`,
    exact: true,
  });
  await expect(button).toBeEnabled();
  await button.click();
  const saved = await page.evaluate(() =>
    JSON.parse(
      sessionStorage.getItem("selrs.central-marketing.image") || "null",
    ),
  );
  assert.ok(saved?.requestId);
  assert.equal(saved.postId, postId);
  await expect
    .poll(
      async () =>
        Boolean(
          await rpc("marketing.centralGenerationJob", adminToken!, {
            requestId: saved.requestId,
          }),
        ),
      { timeout: 20000 },
    )
    .toBe(true);
  await page.reload();
  await expect(
    page.getByRole("status").filter({ hasText: saved.requestId }),
  ).toContainText("تم تحديث الصورة فقط");
  const updated = await rpc("marketing.getPost", adminToken, { id: postId });
  for (const field of [
    "title",
    "content",
    "idea",
    "cta",
    "hashtags",
    "imagePrompt",
    "pageRole",
    "status",
  ])
    assert.deepEqual(updated[field], original[field], field);
  assert.notEqual(updated.imageUrl, original.imageUrl);
  const image = page.locator(`img[src="${updated.imageUrl}"]`).first();
  await expect(image).toBeVisible();
  assert.ok(
    await image.evaluate((node: HTMLImageElement) => node.naturalWidth >= 256),
  );
  const filename = path.basename(updated.imageUrl);
  await copyFile(
    path.join(
      process.env.MARKETING_IMAGE_DIR || path.resolve("uploads/marketing"),
      filename,
    ),
    `${evidence}/${filename}`,
  );
  await rpc(
    "marketing.regenerateCentralImage",
    adminToken,
    { postId, requestId: saved.requestId },
    true,
  );
  const { marketingUsageId } =
    await import("../server/services/ai/marketingDraft");
  const [count] = await connection.execute<RowDataPacket[]>(
    "SELECT COUNT(*) AS total FROM ai_core_usage WHERE request_id=?",
    [marketingUsageId(saved.requestId, "marketing.image")],
  );
  assert.equal(Number(count[0].total), 1);
  await page.goto(`${base}/marketing/settings`);
  const settings = page.getByRole("region", {
    name: "مزوّد جدولة التسويق",
    exact: true,
  });
  await expect(settings.getByRole("heading")).toBeVisible();
  for (const pageRole of ["center", "doctor"] as const) {
    await settings
      .getByLabel("صفحة مزوّد الجدولة", { exact: true })
      .selectOption(pageRole);
    await expect(
      settings.getByLabel("مزوّد الجدولة", { exact: true }),
    ).toHaveValue(
      modesBefore.find((row: { pageRole: string }) => row.pageRole === pageRole)
        .provider,
    );
  }
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(
      await settings.evaluate((node) => node.scrollWidth <= node.clientWidth),
    );
    const clear = page.getByRole("button", {
      name: "مسح الإشعارات",
      exact: true,
    });
    if (await clear.isVisible()) await clear.click();
    await settings.screenshot({ path: `${evidence}/scheduler-${width}.png` });
  }
  assert.deepEqual(
    await rpc("marketing.centralSchedulerProviders", adminToken),
    modesBefore,
  );
  const [scheduleAfter] = await connection.query<RowDataPacket[]>(
    "SELECT page_role,auto_publish,saturday_enabled,tuesday_enabled,thursday_enabled,publish_hour FROM marketing_facebook_pages ORDER BY page_role",
  );
  assert.deepEqual(scheduleAfter, scheduleBefore);
  assert.equal(forbiddenMutations, 0);
  await writeFile(
    `${evidence}/image-update.json`,
    JSON.stringify(
      {
        postId,
        requestId: saved.requestId,
        previousImage: original.imageUrl,
        newImage: updated.imageUrl,
        textUnchanged: true,
        schedulerProviders: modesBefore,
        schedulingFlagsUnchanged: true,
      },
      null,
      2,
    ),
  );
  const cleanup = await rpc("marketing.getPost", adminToken, { id: postId });
  assert.equal(cleanup.title, fixtureTitle);
  assert.equal(cleanup.content, original.content);
  assert.equal(cleanup.status, "draft");
  await rpc("marketing.deletePost", adminToken, { id: postId }, true);
  checks.push(
    "actual image regenerated through draft button and survived browser reload; text/identity unchanged; duplicate ID has one usage record; provider controls render per-page current settings without changing providers or automatic publishing; no publication; only the newly created temporary test draft was removed",
  );
  await context.close();
}

async function verifyTopicRetirement() {
  assert.ok(adminToken);
  const capabilities = await rpc("aiManagement.status", adminToken);
  assert.equal(
    capabilities.marketingTopicRetirementAvailable,
    true,
    "Updated backend required before this negative test",
  );
  const [topics] = await connection.query<RowDataPacket[]>(
    "SELECT normalized_topic FROM marketing_topic_publications WHERE state='published' LIMIT 1",
  );
  assert.ok(topics[0]);
  const topic = topics[0].normalized_topic;
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.addCookies([
    {
      name: "app_session_id",
      value: adminToken,
      url: base,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const page = await context.newPage();
  await page.route("**/api/**", (route) =>
    route.request().method() === "GET" ||
    route.request().url().includes("/api/trpc/marketing.generateCentralPost")
      ? route.continue()
      : route.abort("blockedbyclient"),
  );
  await page.goto(`${base}/marketing`);
  const panel = page.getByRole("region", {
    name: "مسودة Gemini المركزية",
    exact: true,
  });
  const clear = page.getByRole("button", {
    name: "مسح الإشعارات",
    exact: true,
  });
  if (await clear.isVisible()) await clear.click();
  await panel
    .getByLabel("صفحة مسودة Gemini", { exact: true })
    .selectOption("doctor");
  await panel.getByLabel("موضوع مسودة Gemini", { exact: true }).fill(topic);
  const requestPromise = page.waitForRequest(
    (request) =>
      request.url().includes("/api/trpc/marketing.generateCentralPost") &&
      request.method() === "POST",
  );
  await panel
    .getByRole("button", { name: "توليد نص وصورة وحفظ مسودة" })
    .click();
  const payload = (await requestPromise).postDataJSON();
  const input = payload["0"]?.json ?? payload.json;
  assert.ok(input.requestId);
  await expect(
    panel.getByRole("alert").filter({ hasText: "الموضوع سبق نشره" }),
  ).toBeVisible();
  await panel
    .getByLabel("موضوع مسودة Gemini", { exact: true })
    .fill("موضوع جديد للمراجعة فقط");
  await expect(
    panel.getByRole("button", { name: "توليد نص وصورة وحفظ مسودة" }),
  ).toBeEnabled();
  const [jobs] = await connection.execute<RowDataPacket[]>(
    "SELECT COUNT(*) AS total FROM ai_marketing_jobs WHERE id=?",
    [input.requestId],
  );
  const { marketingUsageId } =
    await import("../server/services/ai/marketingDraft");
  const [usage] = await connection.execute<RowDataPacket[]>(
    "SELECT COUNT(*) AS total FROM ai_core_usage WHERE request_id IN (?,?)",
    [
      marketingUsageId(input.requestId, "marketing.text"),
      marketingUsageId(input.requestId, "marketing.image"),
    ],
  );
  assert.equal(Number(jobs[0].total), 0);
  assert.equal(Number(usage[0].total), 0);
  const legacy = await fetch(`${base}/api/trpc/marketing.generatePost`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      json: {
        requestId: crypto.randomUUID(),
        topic,
        pageRole: "center",
        postDay: "saturday",
      },
    }),
  });
  const error = await legacy.json();
  assert.match(error.error.json.message, /الموضوع سبق نشره/);
  await panel.screenshot({ path: `${evidence}/rejected-topic.png` });
  await writeFile(
    `${evidence}/rejection.json`,
    JSON.stringify(
      {
        topic,
        requestId: input.requestId,
        jobsCreated: 0,
        usageRecords: 0,
        newTopicAllowed: true,
        legacyAlsoRejected: true,
      },
      null,
      2,
    ),
  );
  checks.push(
    "live central UI and Manus route reject an existing published topic across pages before creating jobs or usage; UI recovers to accept a different topic without sending it; no provider calls or Facebook publication",
  );
  await context.close();
}

async function verifyMarketingRecovery() {
  assert.ok(adminToken);
  assert.equal(
    (await rpc("aiManagement.status", adminToken)).marketingRecoveryAvailable,
    true,
  );
  const actor = authService.verifyToken(adminToken).userId;
  const stamp = Date.now();
  const text = {
    title: `اختبار استرجاع مؤقت ${stamp}`,
    content: "نص تجريبي محفوظ للتحقق من الاسترجاع دون إعادة كتابة.",
    cta: "للمراجعة فقط",
    hashtags: "",
    idea: "تحقق داخلي",
    imagePrompt: "Empty eye clinic reception, no people or text",
  };
  const fixture = async (suffix: string) => {
    const id = crypto.randomUUID();
    await connection.execute(
      "INSERT INTO ai_marketing_jobs (id,page_role,post_day,topic,state,generated_json,created_by) VALUES (?,'center','thursday',?,'uncertain',?,?)",
      [id, `استرجاع تجريبي ${stamp} ${suffix}`, JSON.stringify(text), actor],
    );
    return id;
  };
  const paidJob = await fixture("صورة");
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.addCookies([
    {
      name: "app_session_id",
      value: adminToken,
      url: base,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const page = await context.newPage();
  let requests = 0;
  await page.route("**/api/**", async (route) => {
    if (route.request().method() === "GET") return route.continue();
    if (
      route.request().url().includes("/api/trpc/marketing.recoverCentralJob")
    ) {
      requests++;
      return route.continue();
    }
    await route.abort("blockedbyclient");
  });
  await page.goto(`${base}/marketing`);
  const clear = page.getByRole("button", {
    name: "مسح الإشعارات",
    exact: true,
  });
  if (await clear.isVisible()) await clear.click();
  const recovery = page.getByLabel(`استرجاع المهمة ${paidJob}`, {
    exact: true,
  });
  await recovery
    .getByRole("button", { name: "تجربة الصورة فقط", exact: true })
    .click();
  await page.getByRole("button", { name: "إلغاء", exact: true }).click();
  assert.equal(requests, 0);
  await recovery
    .getByRole("button", { name: "تجربة الصورة فقط", exact: true })
    .click();
  const requestPromise = page.waitForRequest(
    (request) =>
      request.url().includes("/api/trpc/marketing.recoverCentralJob") &&
      request.method() === "POST",
  );
  await page
    .getByRole("button", { name: "تأكيد طلب الصورة فقط", exact: true })
    .click();
  const payload = (await requestPromise).postDataJSON();
  const input = payload["0"]?.json ?? payload.json;
  await expect
    .poll(
      async () =>
        ["running", "completed"].includes(
          (
            await rpc("marketing.centralGenerationJob", adminToken!, {
              requestId: paidJob,
            })
          ).state,
        ),
      { timeout: 20000 },
    )
    .toBe(true);
  await page.reload();
  await expect
    .poll(
      async () =>
        (
          await rpc("marketing.centralGenerationJob", adminToken!, {
            requestId: paidJob,
          })
        ).state,
      { timeout: 120000 },
    )
    .toBe("completed");
  const first = await rpc("marketing.centralGenerationJob", adminToken, {
    requestId: paidJob,
  });
  const firstPost = await rpc("marketing.getPost", adminToken, {
    id: first.postId,
  });
  assert.equal(firstPost.content, text.content);
  assert.equal(firstPost.title, text.title);
  assert.equal(firstPost.status, "draft");
  const { marketingUsageId } =
    await import("../server/services/ai/marketingDraft");
  const [usage] = await connection.execute<RowDataPacket[]>(
    "SELECT workload,state,input_tokens,output_tokens FROM ai_core_usage WHERE request_id IN (?,?,?)",
    [
      marketingUsageId(paidJob, "marketing.text"),
      marketingUsageId(paidJob, "marketing.image"),
      marketingUsageId(input.requestId, "marketing.image"),
    ],
  );
  assert.equal(usage.length, 1);
  assert.equal(usage[0].workload, "marketing.image");
  assert.equal(usage[0].state, "completed");
  const imageName = path.basename(firstPost.imageUrl);
  const directory =
    process.env.MARKETING_IMAGE_DIR || path.resolve("uploads/marketing");
  await copyFile(path.join(directory, imageName), `${evidence}/${imageName}`);
  await page.goto(`${base}/marketing/drafts`);
  const renderedImage = page
    .locator(`img[src="${firstPost.imageUrl}"]`)
    .first();
  await expect(renderedImage).toBeVisible();
  assert.ok(
    await renderedImage.evaluate(
      (image: HTMLImageElement) => image.naturalWidth >= 256,
    ),
  );
  const freeJob = await fixture("حفظ");
  await copyFile(
    path.join(directory, imageName),
    path.join(directory, `gemini-${freeJob}${path.extname(imageName)}`),
  );
  await page.goto(`${base}/marketing`);
  const free = page.getByLabel(`استرجاع المهمة ${freeJob}`, { exact: true });
  await free
    .getByRole("button", { name: "استكمال الحفظ بدون توليد", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (
          await rpc("marketing.centralGenerationJob", adminToken!, {
            requestId: freeJob,
          })
        ).state,
    )
    .toBe("completed");
  const freeResult = await rpc("marketing.centralGenerationJob", adminToken, {
    requestId: freeJob,
  });
  const freePost = await rpc("marketing.getPost", adminToken, {
    id: freeResult.postId,
  });
  assert.equal(freePost.content, text.content);
  assert.equal(freeResult.errorCode, "recovered_usage_requires_review");
  const [freeUsage] = await connection.execute<RowDataPacket[]>(
    "SELECT COUNT(*) AS total FROM ai_core_usage WHERE request_id IN (?,?)",
    [
      marketingUsageId(freeJob, "marketing.text"),
      marketingUsageId(freeJob, "marketing.image"),
    ],
  );
  assert.equal(Number(freeUsage[0].total), 0);
  for (const post of [firstPost, freePost]) {
    const current = await rpc("marketing.getPost", adminToken, { id: post.id });
    assert.equal(current.title, text.title);
    assert.equal(current.content, text.content);
    assert.equal(current.status, "draft");
    await rpc("marketing.deletePost", adminToken, { id: post.id }, true);
  }
  await writeFile(
    `${evidence}/verification.json`,
    JSON.stringify(
      {
        paidJob,
        freeJob,
        paidRecoveryId: input.requestId,
        usage,
        freeProviderUsage: 0,
        cachedTextPreserved: true,
        confirmationCancelNoRequest: true,
        browserReloadSafe: true,
        temporaryDraftsRemoved: [firstPost.id, freePost.id],
        noPublication: true,
      },
      null,
      2,
    ),
  );
  checks.push(
    "actual UI recovery: cancelled paid retry sends no request; one Gemini image request reuses saved text and survives reload; cached image recovery makes zero provider requests; only newly created labelled test drafts removed; no publication",
  );
  await context.close();
}

async function main() {
  await mkdir(evidence, { recursive: true });
  const anonymous = await fetch(`${base}/api/trpc/aiManagement.status`);
  assert.equal(anonymous.status, 401);
  checks.push("anonymous HTTP access rejected");
  adminToken = await sessionFor("admin");
  assert.ok(adminToken, "An active administrator is required");
  const doctorToken = await sessionFor("doctor");
  if (doctorToken) {
    const forbidden = await fetch(`${base}/api/trpc/aiManagement.status`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    assert.equal(forbidden.status, 403);
    checks.push("real non-admin HTTP session rejected");
  }
  const status = await rpc("aiManagement.status", adminToken);
  assert.equal(status.enabled, true);
  assert.equal(status.consumersMigrated, false);
  originalProfiles = (await rpc("aiManagement.profiles", adminToken)).map(
    (profile: unknown) => profileSchema.parse(profile),
  );
  assert.equal(originalProfiles.length, 7);
  assert.ok(
    process.argv.includes("--marketing-drafts") ||
      process.argv.includes("--whatsapp-copy") ||
      process.argv.includes("--whatsapp-inspect") ||
      process.argv.includes("--medical-workflow") ||
      process.argv.includes("--reply-live") ||
      process.argv.includes("--final-status") ||
      process.argv.includes("--marketing-recovery") ||
      process.argv.includes("--topic-retirement") ||
      process.argv.includes("--image-workflow") ||
      process.argv.includes("--marketing-inspect")
      ? true
      : process.argv.includes("--reply-preview")
        ? !originalProfiles.find(
            (profile) => profile.workload === "reply.preview",
          )!.enabled
        : originalProfiles.every((profile) => !profile.enabled),
    "Activation must start with disabled profiles",
  );
  checks.push("live enabled management flag and expected probe profile state");
  if (process.argv.includes("--final-status")) {
    await verifyFinalStatus();
    return;
  }
  if (process.argv.includes("--reply-live")) {
    await verifyReplyPreview();
    return;
  }
  if (process.argv.includes("--medical-workflow")) {
    await verifyMedicalWorkflow();
    return;
  }
  if (
    process.argv.includes("--whatsapp-copy") ||
    process.argv.includes("--whatsapp-inspect")
  ) {
    await verifyWhatsAppCopy();
    return;
  }
  if (process.argv.includes("--marketing-recovery")) {
    await verifyMarketingRecovery();
    return;
  }
  if (process.argv.includes("--topic-retirement")) {
    await verifyTopicRetirement();
    return;
  }
  if (process.argv.includes("--image-workflow")) {
    await verifyImageWorkflow();
    return;
  }
  if (process.argv.includes("--marketing-inspect")) {
    await verifyMarketingSurface();
    return;
  }
  if (process.argv.includes("--marketing-drafts")) {
    await verifyMarketingDrafts();
    return;
  }
  if (process.argv.includes("--reply-preview")) {
    await verifyReplyPreview();
    return;
  }
  for (const workload of ["reply.preview", "marketing.image"] as const) {
    const original = originalProfiles.find(
      (profile) => profile.workload === workload,
    )!;
    touchedWorkloads.add(workload);
    await rpc(
      "aiManagement.updateProfile",
      adminToken,
      {
        ...original,
        provider: "gemini",
        model:
          workload === "marketing.image"
            ? "gemini-nano-banana-2.1"
            : "gemini-3.8-flash",
        enabled: true,
      },
      true,
    );
  }
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.addCookies([
    {
      name: "app_session_id",
      value: adminToken,
      url: base,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const page = await context.newPage();
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.name));
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    if (
      request.method() === "GET" ||
      request.url().includes("/api/trpc/aiManagement.runSyntheticProbe")
    )
      return route.continue();
    await route.abort("blockedbyclient");
  });
  await page.goto(`${base}/admin-hub/ai`);
  const root = page.getByRole("region", {
    name: "إدارة الذكاء الاصطناعي والتواصل",
    exact: true,
  });
  await expect(
    root.getByText("إدارة التجارب متاحة", { exact: true }),
  ).toBeVisible();
  await root.getByRole("button", { name: "تجربة توليد نص" }).click();
  await page.getByRole("button", { name: "تشغيل التجربة مرة واحدة" }).click();
  await expect(
    root.getByText("نجح اختبار النص ببيانات ثابتة. لم تُرسل رسائل للعملاء."),
  ).toBeVisible();
  checks.push("live browser Gemini text probe completed");
  await root
    .getByLabel("المهمة", { exact: true })
    .selectOption("marketing.image");
  await root.getByRole("button", { name: "تجربة توليد صورة" }).click();
  await page.getByRole("button", { name: "تشغيل التجربة مرة واحدة" }).click();
  await expect(root.locator("figure img")).toBeVisible();
  assert.ok(
    await root
      .locator("figure img")
      .evaluate((image: HTMLImageElement) => image.naturalWidth >= 256),
  );
  const generated = await root.locator("figure img").getAttribute("src");
  assert.ok(generated?.startsWith("data:image/"));
  const extension = generated.startsWith("data:image/png") ? "png" : "jpg";
  await writeFile(
    `${evidence}/live-image.${extension}`,
    Buffer.from(generated.split(",")[1], "base64"),
  );
  await root
    .locator("figure")
    .screenshot({ path: `${evidence}/live-image-preview.png` });
  checks.push(
    "live browser Gemini image generated and rendered; no publication",
  );
  await page.reload();
  await expect(
    root.getByRole("heading", { name: "آخر الطلبات" }),
  ).toBeVisible();
  const usage = await rpc("aiManagement.usage", adminToken);
  assert.ok(
    usage.some(
      (request: { workload: string; state: string; output_tokens: number }) =>
        request.workload === "marketing.image" &&
        request.state === "completed" &&
        request.output_tokens > 0,
    ),
  );
  assert.ok(
    usage.some(
      (request: { workload: string; state: string }) =>
        request.workload === "reply.preview" && request.state === "completed",
    ),
  );
  assert.deepEqual(pageErrors, []);
  await writeFile(
    `${evidence}/live-usage.json`,
    JSON.stringify(usage, null, 2),
  );
  checks.push("live SQL usage persists across browser reload");
  await context.close();
}

let success = false;
try {
  await main();
  success = true;
} finally {
  try {
    if (originalProfiles && adminToken) {
      for (const profile of originalProfiles.filter((profile) =>
        touchedWorkloads.has(profile.workload),
      ))
        await rpc("aiManagement.updateProfile", adminToken, profile, true);
      checks.push(
        "original settings restored for profiles modified by verification",
      );
    }
  } finally {
    await browser?.close();
    for (const id of sessions) await revokeAuthSession(id);
    await connection.end();
    await writeFile(
      `${evidence}/${process.argv.includes("--marketing-inspect") ? "surface-result" : "live-result"}.json`,
      JSON.stringify(
        {
          success,
          checks,
          temporarySessionsRevoked: sessions.length,
          consumersMigrated: false,
        },
        null,
        2,
      ),
    );
  }
}
console.log(
  JSON.stringify({
    success,
    checks,
    temporarySessionsRevoked: sessions.length,
  }),
);
process.exit(success ? 0 : 1);
