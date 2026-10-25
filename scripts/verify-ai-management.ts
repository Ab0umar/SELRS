import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";
import {
  AiManagementStore,
  AiManagementError,
  type AiProfile,
} from "../server/services/ai/managementStore";
import {
  runAiManagementProbe,
  readAiManagementProbe,
} from "../server/services/ai/management";
import { createAiManagementRouter } from "../server/routers/aiManagement";
import { makeCallerAs } from "../server/tests/helpers/auth";

if (!process.env.DATABASE_URL)
  throw new Error("DATABASE_URL required for isolated verification");
const database = `selrs_ai_test_${randomUUID().replace(/-/g, "")}`;
if (!/^selrs_ai_test_[a-f0-9]{32}$/.test(database))
  throw new Error("Unsafe test database name");
const owner = await mysql.createConnection(process.env.DATABASE_URL);
const checks: string[] = [];
let imageArtifact: string | undefined;
let pool: ReturnType<typeof mysql.createPool> | undefined;
try {
  await owner.query(`CREATE DATABASE \`${database}\``);
  const uri = new URL(process.env.DATABASE_URL);
  uri.pathname = `/${database}`;
  pool = mysql.createPool({
    uri: uri.toString(),
    connectionLimit: 4,
    multipleStatements: true,
  });
  await pool.query(
    await readFile(
      new URL("../drizzle/ai_core_management.sql", import.meta.url),
      "utf8",
    ),
  );
  const store = new AiManagementStore(() => pool!.getConnection());
  const previousEnabled = process.env.AI_CORE_MANAGEMENT_ENABLED;
  process.env.AI_CORE_MANAGEMENT_ENABLED = "true";
  try {
    const router = createAiManagementRouter(store);
    const caller = router.createCaller(makeCallerAs("admin"));
    assert.equal((await caller.profiles()).length, 4);
    await assert.rejects(
      router.createCaller(makeCallerAs("doctor")).usage(),
      (error: unknown) =>
        error instanceof Error && error.message.includes("administrators"),
    );
    assert.deepEqual(await caller.usage(), []);
    checks.push(
      "admin API reads real isolated database and rejects doctor access",
    );
  } finally {
    if (previousEnabled === undefined)
      delete process.env.AI_CORE_MANAGEMENT_ENABLED;
    else process.env.AI_CORE_MANAGEMENT_ENABLED = previousEnabled;
  }
  const profiles = await store.listProfiles();
  assert.equal(profiles.length, 4);
  assert.ok(profiles.every((profile) => !profile.enabled));
  await assert.rejects(
    store.reserve(randomUUID(), "marketing.text"),
    (error: unknown) =>
      error instanceof AiManagementError && error.code === "disabled",
  );
  checks.push("profiles default to disabled");
  const incompatibleId = randomUUID();
  await assert.rejects(
    store.reserve(incompatibleId, "marketing.text", "gemini"),
    (error: unknown) =>
      error instanceof AiManagementError && error.code === "unavailable",
  );
  assert.equal(await store.findRequest(incompatibleId), null);
  checks.push(
    "required provider checked under lock before reservation or billing",
  );
  const text: AiProfile = {
    workload: "marketing.text",
    provider: "gemini",
    model: "gemini-3.8-flash",
    enabled: true,
    dailyRequests: 1,
    dailyTokens: 100000,
    maxConcurrent: 2,
  };
  await store.updateProfile(text);
  const concurrentIds = [randomUUID(), randomUUID()];
  const reservations = await Promise.allSettled(
    concurrentIds.map((id) => store.reserve(id, "marketing.text")),
  );
  assert.equal(
    reservations.filter((reservation) => reservation.status === "fulfilled")
      .length,
    1,
  );
  const acceptedId =
    concurrentIds[
      reservations.findIndex(
        (reservation) => reservation.status === "fulfilled",
      )
    ];
  await assert.rejects(
    store.reserve(acceptedId, "marketing.text"),
    (error: unknown) =>
      error instanceof AiManagementError && error.code === "duplicate",
  );
  checks.push("atomic daily limit and duplicate request protection");
  await store.complete(acceptedId, {
    inputTokens: 10,
    outputTokens: 3,
    status: "success",
  });
  assert.equal((await store.findRequest(acceptedId))?.state, "completed");
  await assert.rejects(
    store.reserve(randomUUID(), "marketing.text"),
    (error: unknown) =>
      error instanceof AiManagementError && error.code === "budget",
  );
  checks.push("completed requests remain in daily request budget");
  await store.updateProfile({
    ...text,
    workload: "reply.preview",
    dailyRequests: 10,
    maxConcurrent: 1,
  });
  const pendingId = randomUUID();
  await store.reserve(pendingId, "reply.preview");
  await store.markUncertain(pendingId);
  const reopened = new AiManagementStore(() => pool!.getConnection());
  assert.equal((await reopened.findRequest(pendingId))?.state, "uncertain");
  await assert.rejects(
    reopened.reserve(randomUUID(), "reply.preview"),
    (error: unknown) =>
      error instanceof AiManagementError && error.code === "capacity",
  );
  checks.push(
    "uncertain reservations persist and continue blocking capacity across connections",
  );
  await store.updateProfile({
    ...text,
    dailyRequests: 10,
    provider: "manus",
    model: "lite",
  });
  const manusId = randomUUID();
  const manusProfile = await store.reserve(manusId, "marketing.text");
  assert.equal(manusProfile.provider, "manus");
  await store.attachTask(manusId, "synthetic-task-id");
  assert.equal(
    (await reopened.findRequest(manusId))?.task_id,
    "synthetic-task-id",
  );
  await store.complete(
    manusId,
    { inputTokens: 0, outputTokens: 0, status: "success" },
    12.5,
  );
  const rows = await store.listUsage();
  assert.equal(
    rows.find((row) => row.request_id === acceptedId)?.provider,
    "gemini",
  );
  assert.equal(rows.find((row) => row.request_id === manusId)?.credits, 12.5);
  checks.push(
    "provider snapshots and Manus credits preserved without equating credits to tokens",
  );
  if (process.argv.includes("--simulate-manus-task")) {
    const originalFetch = globalThis.fetch;
    let creates = 0;
    globalThis.fetch = async (url, options) => {
      const endpoint = String(url);
      if (endpoint.endsWith("/task.create")) {
        creates++;
        const payload = JSON.parse(String(options?.body));
        assert.equal(payload.share_visibility, "private");
        assert.deepEqual(payload.message.connectors, []);
        return Response.json({ ok: true, task_id: "simulated-core-task" });
      }
      if (endpoint.includes("/task.detail?"))
        return Response.json({
          ok: true,
          task: {
            status: "stopped",
            has_running_background_jobs: false,
            credit_usage: 7,
          },
        });
      if (endpoint.includes("/task.listMessages?"))
        return Response.json({ ok: true, messages: [], has_more: false });
      throw new Error("Unexpected network access in simulated Manus test");
    };
    try {
      const requestId = randomUUID();
      assert.equal(
        (await runAiManagementProbe(store, requestId, "marketing.text")).state,
        "running",
      );
      await assert.rejects(
        runAiManagementProbe(store, requestId, "marketing.text"),
      );
      assert.equal(creates, 1);
      assert.equal(
        (await readAiManagementProbe(store, requestId))?.state,
        "completed",
      );
      checks.push(
        "Manus task lifecycle with real SQL and simulated HTTP: private creation, no duplicate billing, persisted completion",
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  }
  if (process.argv.includes("--live-text")) {
    await store.updateProfile({ ...text, dailyRequests: 10 });
    const requestId = randomUUID();
    const result = await runAiManagementProbe(
      store,
      requestId,
      "marketing.text",
    );
    assert.equal(result.state, "completed");
    const saved = (await store.listUsage()).find(
      (row) => row.request_id === requestId,
    );
    assert.equal(saved?.state, "completed");
    assert.ok(Number(saved?.input_tokens) > 0);
    checks.push(
      "live synthetic Gemini JSON request with confirmed durable usage",
    );
  }
  if (process.argv.includes("--live-image")) {
    await store.updateProfile({
      ...text,
      workload: "marketing.image",
      model: "gemini-nano-banana-2.1",
      dailyRequests: 10,
    });
    const requestId = randomUUID();
    const result = await runAiManagementProbe(
      store,
      requestId,
      "marketing.image",
    );
    assert.equal(result.state, "completed");
    if (result.state !== "completed" || !("bytes" in result.output))
      throw new Error("Managed image missing");
    const saved = (await store.listUsage()).find(
      (row) => row.request_id === requestId,
    );
    assert.equal(saved?.state, "completed");
    assert.ok(Number(saved?.output_tokens) > 0);
    const directory = path.resolve(
      "outputs/ai-managed-verification",
      new Date().toISOString().replace(/[:.]/g, "-"),
    );
    await mkdir(directory, { recursive: true });
    const extension =
      result.output.mimeType === "image/jpeg"
        ? "jpg"
        : result.output.mimeType === "image/webp"
          ? "webp"
          : "png";
    imageArtifact = path.join(directory, `managed-image.${extension}`);
    await writeFile(imageArtifact, result.output.bytes);
    await writeFile(
      path.join(directory, "usage.json"),
      JSON.stringify(saved, null, 2),
    );
    checks.push(
      "live managed image generated, saved and usage committed in isolated database",
    );
  }
  const existingTask = process.argv
    .find((argument) => argument.startsWith("--existing-manus-task="))
    ?.split("=")[1];
  if (existingTask) {
    assert.match(existingTask, /^[a-zA-Z0-9_-]{1,100}$/);
    await store.updateProfile({
      ...text,
      provider: "manus",
      model: "lite",
      dailyRequests: 10,
    });
    const requestId = randomUUID();
    await store.reserve(requestId, "marketing.text");
    await store.attachTask(requestId, existingTask);
    assert.equal(
      (await readAiManagementProbe(store, requestId))?.state,
      "completed",
    );
    checks.push(
      "live existing Manus task reconciled with durable completion and no new billed task",
    );
  }
  console.log(
    JSON.stringify({
      ok: true,
      isolatedDatabase: database,
      checks,
      productionTablesChanged: false,
      imageArtifact,
    }),
  );
} finally {
  await pool?.end();
  await owner.query(`DROP DATABASE \`${database}\``);
  await owner.end();
}
