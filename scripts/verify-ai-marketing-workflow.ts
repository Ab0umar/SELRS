import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import mysql, { type RowDataPacket } from "mysql2/promise";
import { MARKETING_IMAGE_PEOPLE_POLICY } from "../server/services/marketing/imagePolicy";

const originalUrl = process.env.DATABASE_URL;
assert.ok(originalUrl);
const database = `selrs_ai_workflow_${randomUUID().replace(/-/g, "")}`;
assert.match(database, /^selrs_ai_workflow_[a-f0-9]{32}$/);
const owner = await mysql.createConnection(originalUrl);
const source = new URL(originalUrl).pathname.slice(1);
assert.match(source, /^[a-zA-Z0-9_]+$/);
const url = new URL(originalUrl);
url.pathname = `/${database}`;
const directory = path.resolve("outputs/ai-workflow-isolated", database);
let pool: ReturnType<typeof mysql.createPool> | undefined;
const checks: string[] = [];
let calls = 0;
let textCalls = 0;
let imageCalls = 0;
const originalFetch = globalThis.fetch;
let intercept: (() => Promise<void>) | undefined;
try {
  await owner.query(`CREATE DATABASE \`${database}\``);
  pool = mysql.createPool({ uri: url.toString(), multipleStatements: true });
  for (const table of [
    "marketing_posts",
    "marketing_generation_jobs",
    "marketing_brand_profile",
    "marketing_logs",
    "marketing_settings",
    "marketing_facebook_pages",
    "marketing_reference_designs",
  ]) {
    const [exists] = await owner.execute<RowDataPacket[]>(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME=?",
      [source, table],
    );
    if (!exists.length && table === "marketing_brand_profile") continue;
    await pool.query(
      `CREATE TABLE \`${table}\` LIKE \`${source}\`.\`${table}\``,
    );
  }
  const [brands] = await owner.execute<RowDataPacket[]>(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME LIKE 'marketing_brand%'",
    [source],
  );
  for (const row of brands) {
    const table = String(row.TABLE_NAME);
    assert.match(table, /^marketing_brand[a-z_]+$/);
    await pool.query(
      `CREATE TABLE IF NOT EXISTS \`${table}\` LIKE \`${source}\`.\`${table}\``,
    );
  }
  for (const migration of [
    "ai_core_management.sql",
    "ai_marketing_jobs.sql",
    "ai_marketing_workflow.sql",
    "marketing_topic_publications.sql",
    "ai_marketing_recovery.sql",
    "ai_marketing_references.sql",
    "ai_whatsapp_copy.sql",
    "ai_medical_documentation.sql",
  ])
    await pool.query(
      await fs.readFile(path.join("drizzle", migration), "utf8"),
    );
  await pool.query(
    "UPDATE ai_core_profiles SET provider='gemini', model='gemini-3.8-flash', enabled=1",
  );
  await pool.query(
    "UPDATE ai_core_profiles SET model='gemini-nano-banana-2.1' WHERE workload='marketing.image'",
  );
  await pool.query(
    "UPDATE ai_core_profiles SET provider='manus',model='lite' WHERE workload='medical.documentation'",
  );
  process.env.DATABASE_URL = url.toString();
  process.env.MARKETING_IMAGE_DIR = directory;
  process.env.AI_CORE_MANAGEMENT_ENABLED = "true";
  process.env.GEMINI_API_KEY = "isolated-sdk-boundary";
  process.env.MANUS_API_KEY = "isolated-manus-boundary";
  let metaCalls = 0;
  globalThis.fetch = async (url, options) => {
    const endpoint = String(url);
    if (endpoint.includes("api.manus.ai"))
      return new Response(
        JSON.stringify(
          endpoint.includes("task.detail")
            ? {
                ok: true,
                task: {
                  status: "stopped",
                  has_running_background_jobs: false,
                  credit_usage: 2.5,
                },
              }
            : endpoint.includes("task.listMessages")
              ? {
                  ok: true,
                  messages: [
                    {
                      assistant_message: {
                        delivery_kind: "result",
                        attachments: [
                          {
                            filename: "medical-proposals.json",
                            url: "https://files.manuscdn.com/medical-fixture.json",
                          },
                        ],
                      },
                    },
                  ],
                }
              : {
                  ok: true,
                  task_id: "isolated-manus-task",
                  task_url: "https://manus.im/app/isolated",
                },
        ),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    if (endpoint === "https://files.manuscdn.com/medical-fixture.json")
      return new Response(
        JSON.stringify({
          proposals: [
            {
              field: "field",
              text: "صداع من أسبوعين",
              sources: ["صداع من أسبوعين"],
              speaker: "patient",
            },
          ],
          warnings: [],
        }),
      );
    if (endpoint.includes("graph.facebook.com")) {
      metaCalls++;
      return new Response(
        JSON.stringify({
          id: "isolated-facebook-id",
          post_id: "isolated-facebook-id",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    calls++;
    await intercept?.();
    const body = JSON.parse(String(options?.body || "{}"));
    if (!body.generationConfig?.responseModalities) {
      textCalls++;
      return new Response(
        JSON.stringify({
          candidates: [
            {
              finishReason: "STOP",
              content: {
                parts: [
                  {
                    text: JSON.stringify(
                      (
                        body.generationConfig?.responseJsonSchema ??
                        body.generationConfig?.responseSchema
                      )?.properties?.openings
                        ? {
                            openings: [
                              "أهلًا بيك في مركز عيون الشروق.",
                              "صحة عيونك تهمنا في مركز عيون الشروق.",
                              "رسالة ليك من مركز عيون الشروق.",
                            ],
                          }
                        : {
                            title: "Synthetic scheduled draft",
                            content: "Synthetic non-clinical reminder",
                            cta: "Book an appointment",
                            hashtags: "#test",
                            idea: "Reminder",
                            imagePrompt: "Empty clinic",
                          },
                    ),
                  },
                ],
              },
            },
          ],
          usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    assert.ok(
      body.systemInstruction.parts
        .map((part: { text?: string }) => part.text ?? "")
        .join("\n")
        .includes(MARKETING_IMAGE_PEOPLE_POLICY),
    );
    imageCalls++;
    return new Response(
      JSON.stringify({
        candidates: [
          {
            finishReason: "STOP",
            content: {
              parts: [
                {
                  inlineData: {
                    mimeType: "image/png",
                    data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=",
                  },
                },
              ],
            },
          },
        ],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20 },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };
  const { regenerateCentralMarketingImage } =
    await import("../server/services/ai/marketingDraft");
  const { claimMarketingSchedule, saveMarketingSchedulerProvider } =
    await import("../server/services/ai/marketingScheduler");
  const first = randomUUID();
  const claims = await Promise.all([
    claimMarketingSchedule(first, "center"),
    claimMarketingSchedule(first, "center"),
  ]);
  assert.equal(claims.filter((claim) => claim.claimed).length, 1);
  await saveMarketingSchedulerProvider({
    pageRole: "center",
    provider: "central",
  });
  assert.equal((await claimMarketingSchedule(first, "center")).claimed, false);
  checks.push(
    "one concurrent schedule owner; changing provider cannot claim the same cycle again",
  );
  await pool.query(
    "INSERT INTO marketing_posts (id,title,content,topic,idea,cta,hashtags,image_prompt,image_url,page_role,status) VALUES (990001,'Original title','Original body','Eye exam','Original idea','Original CTA','#test','Original prompt','/original.png','center','draft')",
  );
  const positive = randomUUID();
  await regenerateCentralMarketingImage(
    { requestId: positive, postId: 990001 },
    1,
  );
  const [posts] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM marketing_posts WHERE id=990001",
  );
  assert.equal(posts[0].content, "Original body");
  assert.equal(posts[0].title, "Original title");
  assert.equal(posts[0].image_prompt, "Original prompt");
  assert.notEqual(posts[0].image_url, "/original.png");
  const [jobs] = await pool.execute<RowDataPacket[]>(
    "SELECT state FROM ai_marketing_jobs WHERE id=?",
    [positive],
  );
  assert.equal(jobs[0].state, "completed");
  await regenerateCentralMarketingImage(
    { requestId: positive, postId: 990001 },
    1,
  );
  assert.equal(calls, 1);
  checks.push(
    "image-only generation preserves text, persists image and does not repeat provider call for duplicate ID",
  );
  const before = posts[0].image_url;
  intercept = async () => {
    await pool!.query(
      "UPDATE marketing_posts SET title='Concurrent operator edit' WHERE id=990001",
    );
  };
  const stale = randomUUID();
  await regenerateCentralMarketingImage(
    { requestId: stale, postId: 990001 },
    1,
  );
  const [changed] = await pool.query<RowDataPacket[]>(
    "SELECT title,image_url FROM marketing_posts WHERE id=990001",
  );
  assert.equal(changed[0].title, "Concurrent operator edit");
  assert.equal(changed[0].image_url, before);
  const [staleJobs] = await pool.execute<RowDataPacket[]>(
    "SELECT state FROM ai_marketing_jobs WHERE id=?",
    [stale],
  );
  assert.equal(staleJobs[0].state, "uncertain");
  checks.push(
    "concurrent draft edit prevents stale generated image from replacing the current image",
  );
  intercept = undefined;
  await pool.query(
    "INSERT INTO marketing_settings (id,clinic_name) VALUES (1,'Synthetic center')",
  );
  await pool.query(
    "INSERT INTO marketing_facebook_pages (page_role,page_id,page_name,content_name,access_token,connected,auto_publish) VALUES ('center','isolated-center','Synthetic center','Synthetic center','isolated-token',1,0),('doctor','isolated-doctor','Synthetic doctor','Synthetic doctor','isolated-token',1,0)",
  );
  const { runScheduledPost } =
    await import("../server/services/marketing/scheduler.service");
  const central = await runScheduledPost("tuesday", "center");
  assert.equal(central.ok, true, central.error);
  assert.ok(central.postId);
  assert.equal(central.published, false);
  assert.equal(metaCalls, 0);
  const repeated = await runScheduledPost("tuesday", "center");
  assert.ok(repeated.skipped);
  const legacy = await runScheduledPost("tuesday", "doctor");
  assert.equal(legacy.ok, true, legacy.error);
  assert.ok(legacy.jobId);
  assert.equal(legacy.published, false);
  await pool.query(
    "UPDATE marketing_facebook_pages SET auto_publish=1 WHERE page_role='center'",
  );
  intercept = async () => {
    await pool!.query(
      "UPDATE marketing_facebook_pages SET auto_publish=0 WHERE page_role='center'",
    );
  };
  const stopped = await runScheduledPost("saturday", "center");
  assert.equal(stopped.ok, true, stopped.error);
  assert.equal(stopped.published, false);
  assert.equal(metaCalls, 0);
  intercept = undefined;
  await pool.query(
    "UPDATE marketing_facebook_pages SET auto_publish=1 WHERE page_role='center'",
  );
  const published = await runScheduledPost("thursday", "center");
  assert.equal(published.ok, true, published.error);
  assert.equal(published.published, true);
  assert.equal(metaCalls, 1);
  checks.push(
    "real SQL scheduler dispatch: central saves draft when automatic publishing is off, default doctor uses Manus, central publishes through existing publisher only when enabled; Meta and AI HTTP boundaries simulated; repeated cycle skipped",
  );
  const { publishMarketingPost } =
    await import("../server/services/marketing/publish.service");
  await pool.query(
    "INSERT INTO marketing_posts (id,title,content,topic,page_role,status) VALUES (990010,'LASIK one','Synthetic','LASIK','center','draft'),(990011,'LASIK two','Synthetic','الليزك','doctor','draft')",
  );
  const competing = await Promise.allSettled([
    publishMarketingPost(990010),
    publishMarketingPost(990011),
  ]);
  assert.equal(
    competing.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.equal(metaCalls, 2);
  const [winner] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM marketing_posts WHERE id IN (990010,990011) AND status='published'",
  );
  assert.equal(winner.length, 1);
  await pool.execute("DELETE FROM marketing_posts WHERE id=?", [winner[0].id]);
  const losingId = winner[0].id === 990010 ? 990011 : 990010;
  await assert.rejects(publishMarketingPost(losingId));
  const callsBefore = calls;
  const { generateCentralMarketingDraft } =
    await import("../server/services/ai/marketingDraft");
  await assert.rejects(
    generateCentralMarketingDraft(
      {
        requestId: randomUUID(),
        topic: "LASIK",
        pageRole: "center",
        postDay: "saturday",
      },
      1,
    ),
  );
  assert.equal(calls, callsBefore);
  assert.equal(metaCalls, 2);
  checks.push(
    "same-topic concurrent publications across pages call Meta once; topic retirement survives published-post deletion; repeat generation rejected before provider call",
  );
  const { marketingRecoveryPlan, recoverCentralMarketing } =
    await import("../server/services/ai/marketingRecovery");
  const { AiManagementStore } =
    await import("../server/services/ai/managementStore");
  const { getDbConnection } = await import("../server/db");
  const { marketingUsageId } =
    await import("../server/services/ai/marketingDraft");
  const store = new AiManagementStore(getDbConnection);
  const cached = {
    title: "Saved recovery title",
    content: "Saved recovery body",
    cta: "Saved CTA",
    hashtags: "#saved",
    idea: "Saved idea",
    imagePrompt: "Empty clinic",
  };
  async function recoveryFixture(topic = `Recovery ${randomUUID()}`) {
    const id = randomUUID();
    await pool!.execute(
      "INSERT INTO ai_marketing_jobs (id,page_role,post_day,topic,state,generated_json,created_by) VALUES (?,'center','thursday',?,'uncertain',?,1)",
      [id, topic, JSON.stringify(cached)],
    );
    return id;
  }
  const resume = await recoveryFixture();
  assert.equal((await marketingRecoveryPlan(resume)).action, "image_retry");
  const textBefore = textCalls,
    imagesBefore = imageCalls;
  await recoverCentralMarketing(
    { jobId: resume, requestId: randomUUID(), allowImageGeneration: false },
    1,
  );
  assert.equal(imageCalls, imagesBefore);
  const resumeId = randomUUID();
  assert.equal(
    (
      await recoverCentralMarketing(
        { jobId: resume, requestId: resumeId, allowImageGeneration: true },
        1,
      )
    ).action,
    "done",
  );
  await recoverCentralMarketing(
    { jobId: resume, requestId: resumeId, allowImageGeneration: true },
    1,
  );
  assert.equal(imageCalls, imagesBefore + 1);
  assert.equal(textCalls, textBefore);
  const [resumed] = await pool.execute<RowDataPacket[]>(
    "SELECT p.content,p.title,p.status FROM marketing_posts p JOIN ai_marketing_jobs j ON j.post_id=p.id WHERE j.id=?",
    [resume],
  );
  assert.equal(resumed[0].content, cached.content);
  assert.equal(resumed[0].title, cached.title);
  assert.equal(resumed[0].status, "draft");
  const concurrent = await recoveryFixture();
  const concurrentUsage = marketingUsageId(concurrent, "marketing.image");
  await store.reserve(concurrentUsage, "marketing.image", "gemini");
  await store.complete(concurrentUsage, {
    inputTokens: 10,
    outputTokens: 20,
    status: "failed",
  });
  await Promise.all([
    recoverCentralMarketing(
      {
        jobId: concurrent,
        requestId: randomUUID(),
        allowImageGeneration: true,
      },
      1,
    ),
    recoverCentralMarketing(
      {
        jobId: concurrent,
        requestId: randomUUID(),
        allowImageGeneration: true,
      },
      1,
    ),
  ]);
  assert.equal(imageCalls, imagesBefore + 2);
  assert.equal(textCalls, textBefore);
  checks.push(
    "saved text reused verbatim; image retry requires explicit consent; duplicate and concurrent recovery requests create one image request without regenerating text or publishing",
  );
  const uncertain = await recoveryFixture();
  const uncertainUsage = marketingUsageId(uncertain, "marketing.image");
  await store.reserve(uncertainUsage, "marketing.image", "gemini");
  await store.markUncertain(uncertainUsage);
  assert.equal(
    (await marketingRecoveryPlan(uncertain)).reason,
    "provider_uncertain",
  );
  const beforeBlocked = calls;
  await recoverCentralMarketing(
    { jobId: uncertain, requestId: randomUUID(), allowImageGeneration: true },
    1,
  );
  assert.equal(calls, beforeBlocked);
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=",
    "base64",
  );
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(
    path.join(directory, `gemini-output-${uncertainUsage}.png`),
    png,
  );
  const localPlan = await marketingRecoveryPlan(uncertain);
  assert.equal(localPlan.action, "attach");
  assert.equal(localPlan.usageReview, true);
  await recoverCentralMarketing(
    { jobId: uncertain, requestId: randomUUID(), allowImageGeneration: false },
    1,
  );
  assert.equal(calls, beforeBlocked);
  assert.equal((await store.findRequest(uncertainUsage))?.state, "uncertain");
  const [review] = await pool.execute<RowDataPacket[]>(
    "SELECT state,error_code FROM ai_marketing_jobs WHERE id=?",
    [uncertain],
  );
  assert.equal(review[0].state, "completed");
  assert.equal(review[0].error_code, "recovered_usage_requires_review");
  const missing = await recoveryFixture();
  const missingUsage = marketingUsageId(missing, "marketing.image");
  await store.reserve(missingUsage, "marketing.image", "gemini");
  await store.complete(missingUsage, {
    inputTokens: 10,
    outputTokens: 20,
    status: "success",
  });
  assert.equal(
    (await marketingRecoveryPlan(missing)).reason,
    "paid_image_missing",
  );
  assert.equal((await marketingRecoveryPlan(stale)).reason, "draft_changed");
  const retired = await recoveryFixture("LASIK");
  assert.equal((await marketingRecoveryPlan(retired)).reason, "topic_retired");
  checks.push(
    "unknown provider outcome blocks paid retry; valid saved image attaches with zero provider calls while unknown cost remains reserved for review; missing paid artifact, edited draft and retired topic block unsafe recovery",
  );
  const finalization = await recoveryFixture();
  await pool.query(
    "CREATE TRIGGER ai_recovery_insert_failure BEFORE INSERT ON marketing_posts FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Isolated finalization failure'",
  );
  const beforeFinalization = calls;
  await recoverCentralMarketing(
    {
      jobId: finalization,
      requestId: randomUUID(),
      allowImageGeneration: true,
    },
    1,
  );
  assert.equal(calls, beforeFinalization + 1);
  assert.equal((await marketingRecoveryPlan(finalization)).action, "attach");
  await pool.query("DROP TRIGGER ai_recovery_insert_failure");
  await recoverCentralMarketing(
    {
      jobId: finalization,
      requestId: randomUUID(),
      allowImageGeneration: false,
    },
    1,
  );
  assert.equal(calls, beforeFinalization + 1);
  assert.equal((await marketingRecoveryPlan(finalization)).action, "done");
  checks.push(
    "image bytes survive failed SQL draft finalization; a later recovery completes the draft without another provider call",
  );
  const referenceDirectory = path.join(directory, "reference-designs");
  await fs.mkdir(referenceDirectory, { recursive: true });
  await fs.writeFile(path.join(referenceDirectory, "center.png"), png);
  await fs.writeFile(path.join(referenceDirectory, "doctor.png"), png);
  await pool.execute(
    "INSERT INTO marketing_reference_designs (id,filename,original_name,file_path,file_url,mime_type,page_role,file_size,analysis_status) VALUES (990001,'center.png','center.png',?,'/fixture/center.png','image/png','center',?,'analyzed'),(990002,'doctor.png','doctor.png',?,'/fixture/doctor.png','image/png','doctor',?,'analyzed')",
    [
      path.join(referenceDirectory, "center.png"),
      png.length,
      path.join(referenceDirectory, "doctor.png"),
      png.length,
    ],
  );
  const { marketingReferences } =
    await import("../server/services/ai/marketingReferences");
  assert.deepEqual((await marketingReferences("center")).ids, [990001]);
  assert.deepEqual((await marketingReferences("doctor")).ids, [990002]);
  checks.push(
    "reference bytes are loaded exclusively from the selected page's analysed brand-library assets",
  );
  const { generateWhatsAppCopy, readWhatsAppCopy } =
    await import("../server/services/ai/whatsappCopy");
  const copyRequest = {
    requestId: randomUUID(),
    kind: "exam" as const,
    days: ["الأحد" as const, "الخميس" as const],
  };
  const beforeCopy = calls;
  const concurrentCopies = await Promise.allSettled([
    generateWhatsAppCopy(copyRequest, 1),
    generateWhatsAppCopy(copyRequest, 1),
  ]);
  assert.equal(
    concurrentCopies.filter((result) => result.status === "fulfilled").length,
    1,
  );
  const copies = await generateWhatsAppCopy(copyRequest, 1);
  assert.equal(calls, beforeCopy + 1);
  assert.equal(copies.variants.length, 3);
  for (const text of copies.variants) {
    assert.ok(
      text.includes("200ج") &&
        text.includes("260ج") &&
        text.includes("الأحد والخميس") &&
        text.includes("الأخصائي فقط"),
    );
    assert.ok(text.includes("https://wa.me/201285800309"));
  }
  assert.equal(await readWhatsAppCopy(copyRequest.requestId, 2), null);
  await assert.rejects(
    generateWhatsAppCopy({ ...copyRequest, kind: "lasik", days: undefined }, 1),
  );
  assert.equal(metaCalls, 2);
  checks.push(
    "WhatsApp copy: one paid request under concurrency, cached variants after reload, owner isolation, exact public prices and selected days, no recipient access or sending",
  );
  const { startMedicalProposals, readMedicalProposals } =
    await import("../server/services/ai/medical");
  const recording = {
    kind: "field" as const,
    label: "Complaints",
    transcript: "صداع من أسبوعين",
  };
  const medicalJobs = await Promise.all([
    startMedicalProposals(999, recording, [], "manus", "central"),
    startMedicalProposals(999, recording, [], "manus", "central"),
  ]);
  assert.equal(medicalJobs[0].jobId, medicalJobs[1].jobId);
  await assert.rejects(readMedicalProposals(998, medicalJobs[0].jobId));
  const medical = await readMedicalProposals(999, medicalJobs[0].jobId);
  assert.equal(medical.status, "complete");
  const [medicalUsage] = await pool.execute<RowDataPacket[]>(
    "SELECT * FROM ai_core_usage WHERE request_id=?",
    [medicalJobs[0].jobId],
  );
  assert.equal(medicalUsage.length, 1);
  assert.equal(medicalUsage[0].state, "completed");
  assert.equal(medicalUsage[0].credits, 2.5);
  assert.ok(!JSON.stringify(medicalUsage).includes(recording.transcript));
  await assert.rejects(
    startMedicalProposals(1001, recording, [], "gemini", "central"),
  );
  checks.push(
    "central medical Manus: concurrent identical submissions share one job and usage; owner isolation and source validation; credits recorded separately with no transcript in usage; Gemini clinical rejected",
  );
  console.log(
    JSON.stringify({
      ok: true,
      checks,
      database,
      providerBoundary: "simulated Google SDK HTTP; real SQL and filesystem",
      productionDataChanged: false,
    }),
  );
} finally {
  globalThis.fetch = originalFetch;
  await pool?.end();
  await owner.query(`DROP DATABASE IF EXISTS \`${database}\``);
  await owner.end();
}
process.exit(0);
