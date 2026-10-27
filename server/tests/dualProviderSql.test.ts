import "dotenv/config";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import mysql, { type Connection, type Pool } from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/mysql2";
import { getTableConfig, type MySqlTable } from "drizzle-orm/mysql-core";
import {
  marketingPosts,
  marketingSettings,
  marketingFacebookPages,
  marketingLogs,
  marketingBrandProfile,
  marketingGenerationJobs,
  aiMarketingJobs,
  marketingTopicPublications,
  aiWhatsAppDrafts,
  aiMarketingScheduler,
  aiMarketingScheduleClaims,
} from "../../drizzle/schema";
import { publishMarketingPost } from "../services/marketing/publish.service";
import { assertDraftImageAvailable } from "../services/marketing/draftImageClaim";
import { reconcileManusTasks } from "../services/ai/reconcileManus";
import { startManusGeneration } from "../services/marketing/manusGeneration.service";
import { runScheduledPost } from "../services/marketing/scheduler.service";
import {
  claimMarketingSchedule,
  releaseUnusedMarketingSchedule,
} from "../services/ai/marketingScheduler";
import {
  generateCentralMarketingDraft,
  withMarketingBudget,
  marketingUsageId,
} from "../services/ai/marketingDraft";
import { managedReplyPreview } from "../services/ai/replyPreview";
import { generateWhatsAppCopy } from "../services/ai/whatsappCopy";
import { z } from "zod";
const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  db: vi.fn(),
  readSetting: vi.fn(),
}));
vi.mock("../db", async (original) => ({
  ...(await original<typeof import("../db")>()),
  getDbConnection: mocks.connect,
  getDb: mocks.db,
  getSystemSetting: mocks.readSetting,
}));
import {
  readMedicalAssistantSettings,
  saveMedicalAssistantSettings,
} from "../services/ai/medicalSettings";
import { defaultMedicalAssistantSettings } from "../../shared/medical-assistant-settings";
import { AiManagementStore } from "../services/ai/managementStore";
import { runAiManagementProbe } from "../services/ai/management";
import { readMarketingGenerationRequest } from "../services/marketing/generationRequest";
import { readMarketingJobContext } from "../services/marketing/jobContext";
import { trackedAiOperation, readAiOperation } from "../services/ai/operations";
import {
  readMarketingSchedulerStatus,
  setMarketingSchedulerStatus,
} from "../services/marketing/schedulerStatus";

const testUrl = process.env.DATABASE_TEST_URL;
describe.skipIf(!testUrl)(
  "dual-provider accounting in an owned isolated database",
  () => {
    const database = `selrs_test_ai_${randomUUID().replaceAll("-", "")}`;
    let admin: Connection | undefined;
    let pool: Pool | undefined;
    let created = false;
    let isolatedUrl: string;
    let store: AiManagementStore;
    beforeAll(async () => {
      const target = new URL(testUrl!);
      if (
        !/test/i.test(target.pathname) ||
        !/^selrs_test_ai_[a-f0-9]{32}$/.test(database)
      )
        throw new Error("An explicit test target is required");
      if (process.env.DATABASE_URL) {
        const production = new URL(process.env.DATABASE_URL);
        if (
          target.host === production.host &&
          target.pathname === production.pathname
        )
          throw new Error("Test and production databases must differ");
      }
      admin = await mysql.createConnection(testUrl!);
      await admin.query(`CREATE DATABASE \`${database}\``);
      created = true;
      target.pathname = `/${database}`;
      isolatedUrl = target.href;
      pool = mysql.createPool({ uri: target.href, connectionLimit: 3 });
      for (const table of [
        marketingPosts,
        marketingSettings,
        marketingFacebookPages,
        marketingLogs,
        marketingBrandProfile,
        marketingGenerationJobs,
        aiMarketingJobs,
        marketingTopicPublications,
        aiWhatsAppDrafts,
        aiMarketingScheduler,
        aiMarketingScheduleClaims,
      ] as MySqlTable[]) {
        const config = getTableConfig(table);
        const columns = config.columns.map((column) => {
          const identity =
            "autoIncrement" in column && column.autoIncrement
              ? " AUTO_INCREMENT PRIMARY KEY"
              : column.primary
                ? " PRIMARY KEY"
                : "";
          const defaultValue =
            column.name === "state"
              ? ` DEFAULT '${table === marketingGenerationJobs ? "starting" : table === marketingTopicPublications ? "publishing" : "running"}'`
              : column.getSQLType().startsWith("timestamp") && column.hasDefault
                ? " DEFAULT CURRENT_TIMESTAMP"
                : "";
          return `\`${column.name}\` ${column.getSQLType()}${identity}${defaultValue}`;
        });
        await pool.query(
          `CREATE TABLE \`${config.name}\` (${columns.join(",")})`,
        );
      }
      for (const filename of [
        "ai_core_management.sql",
        "ai_provider_bindings.sql",
        "ai_module_review_fixes.sql",
        "ai_marketing_recovery_fixes.sql",
      ]) {
        const migration = await readFile(
          new URL(`../../drizzle/${filename}`, import.meta.url),
          "utf8",
        );
        for (const statement of migration
          .split(";")
          .filter((part) => part.trim()))
          await pool.query(statement);
      }
      await pool.execute(
        "INSERT INTO ai_core_profiles (workload,provider,model,enabled) VALUES ('reply.live','manus','max',1),('whatsapp.marketing','manus','standard',1),('medical.documentation','manus','lite',1)",
      );
      store = new AiManagementStore(() => pool!.getConnection());
      mocks.connect.mockImplementation(() => pool!.getConnection());
      mocks.db.mockImplementation(() => drizzle(pool!));
      await pool.query(
        "CREATE TABLE systemSettings (id INT AUTO_INCREMENT PRIMARY KEY,`key` VARCHAR(255) NOT NULL UNIQUE,value TEXT,createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
      );
      mocks.readSetting.mockImplementation(async (key: string) => {
        const [rows] = await pool!.execute<mysql.RowDataPacket[]>(
          "SELECT value FROM systemSettings WHERE `key`=?",
          [key],
        );
        return rows[0] ?? null;
      });
    });
    afterAll(async () => {
      await pool?.end();
      if (created && /^selrs_test_ai_[a-f0-9]{32}$/.test(database))
        await admin?.query(`DROP DATABASE \`${database}\``);
      await admin?.end();
    });
    it("saves medical processing selection atomically and rolls it back when settings persistence fails", async () => {
      vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "true");
      vi.stubEnv("GEMINI_API_KEY", "fixture");
      vi.stubEnv("MEDICAL_GEMINI_CLINICAL_APPROVED", "true");
      vi.stubEnv("AZURE_SPEECH_KEY", "fixture");
      vi.stubEnv("AZURE_SPEECH_REGION", "westeurope");
      const settings = {
        ...defaultMedicalAssistantSettings,
        processingModel: "gemini:gemini-selected",
      };
      const original = (await store.listProfiles()).find(
        (p) => p.workload === "medical.documentation",
      )!;
      try {
        await saveMedicalAssistantSettings("admin", settings);
        expect(
          (await store.listProfiles()).find(
            (p) => p.workload === "medical.documentation",
          ),
        ).toEqual({
          ...original,
          provider: "gemini",
          model: "gemini-selected",
        });
        expect((await readMedicalAssistantSettings()).processingModel).toBe(
          "gemini:gemini-selected",
        );
        await pool!.query(
          "CREATE TRIGGER reject_medical_setting BEFORE UPDATE ON systemSettings FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='fixture persistence failure'",
        );
        try {
          await expect(
            saveMedicalAssistantSettings("admin", {
              ...settings,
              processingModel: "manus:max",
            }),
          ).rejects.toThrow("fixture persistence failure");
        } finally {
          await pool!.query("DROP TRIGGER reject_medical_setting");
        }
        expect(
          (await store.listProfiles()).find(
            (p) => p.workload === "medical.documentation",
          )?.provider,
        ).toBe("gemini");
        expect((await readMedicalAssistantSettings()).processingModel).toBe(
          "gemini:gemini-selected",
        );
      } finally {
        await store.updateProfile(original);
        vi.unstubAllEnvs();
      }
    });
    it("retains request binding and task identity across store instances", async () => {
      const id = randomUUID();
      await store.reserve(id, "reply.live");
      await store.bindRequest(id, "a".repeat(64));
      await store.attachTask(id, "fixture-manus-task");
      const restarted = new AiManagementStore(() => pool!.getConnection());
      expect(await restarted.boundRequest(id)).toMatchObject({
        provider: "manus",
        model: "max",
        state: "running",
        task_id: "fixture-manus-task",
        input_hash: "a".repeat(64),
      });
      await restarted.complete(
        id,
        { inputTokens: 0, outputTokens: 0, status: "success" },
        2,
      );
      expect(
        (await restarted.listUsage()).find((row) => row.request_id === id),
      ).toMatchObject({ state: "completed", credits: 2 });
      await expect(restarted.reserve(id, "reply.live")).rejects.toThrow(
        "duplicate",
      );
      await expect(restarted.bindRequest(id, "b".repeat(64))).rejects.toThrow();
    });
    it("accounts Gemini medical selection without rewriting the saved Manus profile", async () => {
      const id = randomUUID();
      await store.reserve(
        id,
        "medical.documentation",
        "gemini",
        20000,
        "gemini-selected",
        "gemini",
      );
      expect(
        (await store.listUsage()).find((row) => row.request_id === id),
      ).toMatchObject({
        provider: "gemini",
        model: "gemini-selected",
        reserved_tokens: 20000,
      });
      expect(
        (await store.listProfiles()).find(
          (profile) => profile.workload === "medical.documentation",
        ),
      ).toMatchObject({ provider: "manus", model: "lite" });
    });
    it("allows only one concurrent reservation for the same paid request", async () => {
      const id = randomUUID();
      const results = await Promise.allSettled([
        store.reserve(id, "whatsapp.marketing"),
        store.reserve(id, "whatsapp.marketing"),
      ]);
      expect(
        results.filter((result) => result.status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        results.filter((result) => result.status === "rejected"),
      ).toHaveLength(1);
    });
    it("keeps missing-usage tokens reserved while releasing completed remote concurrency", async () => {
      await pool!.execute(
        "UPDATE ai_core_profiles SET max_concurrent=1 WHERE workload='medical.documentation'",
      );
      // Finish the earlier known medical fixture so only the new request occupies capacity.
      await pool!.execute(
        "UPDATE ai_core_usage SET state='completed',reserved_tokens=0 WHERE workload='medical.documentation'",
      );
      const id = randomUUID();
      await store.reserve(
        id,
        "medical.documentation",
        "gemini",
        18000,
        "gemini-review",
        "gemini",
      );
      await store.complete(id, {
        status: "success",
        inputTokens: 0,
        outputTokens: 0,
        usageKnown: false,
      });
      expect(
        (await store.listUsage()).find((row) => row.request_id === id),
      ).toMatchObject({
        state: "uncertain",
        reserved_tokens: 18000,
        error_code: "usage_metadata_missing",
      });
      await expect(
        store.reserve(
          randomUUID(),
          "medical.documentation",
          "gemini",
          18000,
          "gemini-review",
          "gemini",
        ),
      ).resolves.toBeDefined();
      await pool!.execute(
        "UPDATE ai_core_profiles SET daily_tokens=36000 WHERE workload='medical.documentation'",
      );
      await expect(
        store.reserve(
          randomUUID(),
          "medical.documentation",
          "gemini",
          18000,
          "gemini-review",
          "gemini",
        ),
      ).rejects.toThrow("budget");
      await store.complete(id, {
        status: "success",
        inputTokens: 12,
        outputTokens: 8,
      });
      expect(
        (await store.listUsage()).find((row) => row.request_id === id),
      ).toMatchObject({
        state: "completed",
        reserved_tokens: 0,
        error_code: null,
      });
    });
    it("persists rejection and accepted unknown outcomes, isolating owner and workflow", async () => {
      const rejected = randomUUID();
      await expect(
        trackedAiOperation(
          {
            requestId: rejected,
            scope: "marketing",
            owner: 1,
            context: { pageRole: "doctor", postDay: "tuesday" },
          },
          async () => {
            throw new Error("preflight");
          },
        ),
      ).rejects.toThrow("preflight");
      expect(await readAiOperation(rejected, "marketing", 1)).toMatchObject({
        state: "rejected",
        context: { pageRole: "doctor", postDay: "tuesday" },
      });
      expect(await readAiOperation(rejected, "probe", 1)).toBeNull();
      expect(await readAiOperation(rejected, "marketing", 2)).toBeNull();
      const accepted = randomUUID();
      await expect(
        trackedAiOperation(
          { requestId: accepted, scope: "probe", owner: 1, context: {} },
          async (accept) => {
            await accept();
            throw new Error("network");
          },
        ),
      ).rejects.toThrow("network");
      expect(await readAiOperation(accepted, "probe", 1)).toMatchObject({
        state: "accepted",
      });
      const duplicate = vi.fn();
      await expect(
        trackedAiOperation(
          { requestId: accepted, scope: "probe", owner: 1, context: {} },
          duplicate,
        ),
      ).rejects.toThrow("duplicate");
      expect(duplicate).not.toHaveBeenCalled();
    });
    it("rejects a missing probe credential before acceptance and frees its unused reservation", async () => {
      await pool!.execute(
        "UPDATE ai_core_profiles SET provider='gemini',model='gemini-review',enabled=1 WHERE workload='reply.preview'",
      );
      vi.stubEnv("AUTO_REPLY_GEMINI_KEY", "");
      try {
        const id = randomUUID();
        await expect(
          runAiManagementProbe(store, id, "reply.preview", 1),
        ).rejects.toThrow("unavailable");
        expect(await readAiOperation(id, "probe", 1)).toMatchObject({
          state: "rejected",
        });
        expect(
          (await store.listUsage()).find((row) => row.request_id === id),
        ).toMatchObject({ state: "failed", reserved_tokens: 0 });
      } finally {
        vi.unstubAllEnvs();
      }
    });
    it("stores scheduler status separately for each Facebook page", async () => {
      await setMarketingSchedulerStatus("center", "running");
      await setMarketingSchedulerStatus("doctor", "error");
      expect(await readMarketingSchedulerStatus("center")).toEqual({
        schedulerStatus: "running",
        lastSchedulerRun: null,
      });
      expect(await readMarketingSchedulerStatus("doctor")).toMatchObject({
        schedulerStatus: "error",
        lastSchedulerRun: expect.any(Date),
      });
      await setMarketingSchedulerStatus("doctor", "idle");
      expect(
        (await readMarketingSchedulerStatus("center")).schedulerStatus,
      ).toBe("running");
    });
    it("looks up an old terminal request directly with owner isolation and without a recent-job window", async () => {
      for (const table of ["marketing_generation_jobs", "ai_marketing_jobs"]) {
        const id = randomUUID();
        await pool!.execute(
          `INSERT INTO ${table} (id,created_by,topic,post_day,page_role,post_id,state) VALUES (?,1,'fixture','tuesday','doctor',42,'completed')`,
          [id],
        );
        for (let index = 0; index < 60; index++)
          await pool!.execute(
            `INSERT INTO ${table} (id,created_by,topic,post_day,page_role,state) VALUES (?,1,'newer','saturday','center','running')`,
            [randomUUID()],
          );
        expect(await readMarketingGenerationRequest(id, 1)).toMatchObject({
          state: "accepted",
          job: { id, state: "completed", postId: 42 },
          context: { pageRole: "doctor", postDay: "tuesday" },
        });
        expect(await readMarketingGenerationRequest(id, 2)).toBeNull();
      }
    });
    it("retains the original image model and Facebook asset independently of current profiles", async () => {
      const id = randomUUID();
      await pool!.execute(
        "INSERT INTO ai_marketing_job_context (job_id,provider,image_model,target_page_id) VALUES (?,'gemini','gemini-original-image','page-original')",
        [id],
      );
      expect(await readMarketingJobContext(id, "gemini")).toMatchObject({
        imageModel: "gemini-original-image",
        targetPageId: "page-original",
      });
      expect(await readMarketingJobContext(id, "manus")).toBeNull();
      await pool!.execute(
        "INSERT INTO marketing_generation_jobs (id,created_by,topic,post_day,page_role,state) VALUES (?,1,'fixture','saturday','center','uncertain')",
        [randomUUID()],
      );
    });
    it("keeps a committed publication claim after Facebook succeeds and finalization rolls back", async () => {
      vi.stubEnv("DATABASE_URL", isolatedUrl);
      const fetch = vi
        .fn()
        .mockResolvedValue(
          new Response('{"id":"external-post"}', { status: 200 }),
        );
      vi.stubGlobal("fetch", fetch);
      const base = drizzle(pool!);
      let transactions = 0;
      mocks.db.mockImplementation(() => ({
        select: base.select.bind(base),
        insert: base.insert.bind(base),
        update: base.update.bind(base),
        transaction: (work: (tx: unknown) => Promise<unknown>) =>
          base.transaction(async (tx) => {
            const phase = ++transactions;
            const result = await work(tx);
            if (phase === 2) throw new Error("forced finalization rollback");
            return result;
          }),
      }));
      try {
        await pool!.execute(
          "INSERT INTO marketing_posts (id,title,topic,content,status,page_role) VALUES (8001,'publication fixture','unique publication fixture','synthetic','draft','center')",
        );
        await pool!.execute("INSERT INTO marketing_settings (id) VALUES (1)");
        await pool!.execute(
          "INSERT INTO marketing_facebook_pages (page_role,page_id,page_name,content_name,access_token,connected,auto_publish) VALUES ('center','test-page','fixture','fixture','test-only',1,1)",
        );
        await expect(publishMarketingPost(8001)).rejects.toMatchObject({
          uncertain: true,
        });
        const [rows] = await pool!.query<
          import("mysql2/promise").RowDataPacket[]
        >("SELECT status FROM marketing_posts WHERE id=8001");
        expect(rows[0].status).toBe("publishing");
        await expect(publishMarketingPost(8001)).rejects.toMatchObject({
          uncertain: true,
        });
        expect(fetch).toHaveBeenCalledTimes(1);
        // Even a legacy draft status remains protected by the durable topic reservation.
        await pool!.execute(
          "UPDATE marketing_posts SET status='draft' WHERE id=8001",
        );
        await expect(publishMarketingPost(8001)).rejects.toThrow(
          "الموضوع سبق نشره",
        );
        expect(fetch).toHaveBeenCalledTimes(1);
      } finally {
        mocks.db.mockImplementation(() => drizzle(pool!));
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
      }
    });
    it("reconciles old reply and WhatsApp tasks without accepting or sending their outputs", async () => {
      vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "true");
      try {
        await pool!.execute(
          "UPDATE ai_core_usage SET state='completed' WHERE workload IN ('reply.live','whatsapp.marketing')",
        );
        await pool!.execute(
          "UPDATE ai_core_profiles SET max_concurrent=1 WHERE workload IN ('reply.live','whatsapp.marketing')",
        );
        const ids = [];
        for (const workload of ["reply.live", "whatsapp.marketing"] as const) {
          const id = randomUUID();
          ids.push(id);
          await store.reserve(id, workload);
          await store.attachTask(id, `old-${workload}`);
          await pool!.execute(
            "UPDATE ai_core_usage SET budget_day='2000-01-01',created_ms=0 WHERE request_id=?",
            [id],
          );
          await expect(store.reserve(randomUUID(), workload)).rejects.toThrow(
            "capacity",
          );
        }
        await reconcileManusTasks(store, async () => ({
          status: "stopped",
          has_running_background_jobs: false,
          attachments: [],
          credit_usage: 2,
        }));
        for (const id of ids)
          expect(await store.findRequest(id)).toMatchObject({
            state: "uncertain",
            error_code: "provider_finished_output_pending",
          });
        await expect(
          store.reserve(randomUUID(), "reply.live"),
        ).resolves.toBeDefined();
        await expect(
          store.reserve(randomUUID(), "whatsapp.marketing"),
        ).resolves.toBeDefined();
      } finally {
        vi.unstubAllEnvs();
      }
    });
    it("rolls back a new Manus job and its context if acceptance fails before submission", async () => {
      const id = randomUUID();
      // No provider call is possible: acceptance throws inside the claim transaction.
      const { ENV } = await import("../_core/env");
      const previous = ENV.manusApiKey;
      ENV.manusApiKey = "test-only";
      try {
        await expect(
          startManusGeneration({
            requestId: id,
            topic: "acceptance fixture",
            postDay: "saturday",
            createdBy: 1,
            onAccepted: async () => {
              throw new Error("acceptance failed");
            },
          }),
        ).rejects.toThrow("acceptance failed");
        const [rows] = await pool!.query<
          import("mysql2/promise").RowDataPacket[]
        >("SELECT id FROM marketing_generation_jobs WHERE id=?", [id]);
        expect(rows).toHaveLength(0);
        const [context] = await pool!.query<
          import("mysql2/promise").RowDataPacket[]
        >("SELECT job_id FROM ai_marketing_job_context WHERE job_id=?", [id]);
        expect(context).toHaveLength(0);
      } finally {
        ENV.manusApiKey = previous;
      }
    });
    it("rolls back a central job and its context when acceptance persistence fails", async () => {
      vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "true");
      vi.stubEnv("GEMINI_API_KEY", "test-only");
      await pool!.execute(
        "UPDATE ai_core_profiles SET enabled=1,provider='gemini',model='gemini-test' WHERE workload IN ('marketing.text','marketing.image')",
      );
      const id = randomUUID();
      await expect(
        generateCentralMarketingDraft(
          {
            requestId: id,
            topic: "central acceptance fixture",
            pageRole: "center",
            postDay: "saturday",
            imageModel: "gemini-test-image",
          },
          1,
          async () => {
            throw new Error("acceptance failed");
          },
        ),
      ).rejects.toThrow("acceptance failed");
      const [jobs] = await pool!.query<
        import("mysql2/promise").RowDataPacket[]
      >("SELECT id FROM ai_marketing_jobs WHERE id=?", [id]);
      const [context] = await pool!.query<
        import("mysql2/promise").RowDataPacket[]
      >("SELECT job_id FROM ai_marketing_job_context WHERE job_id=?", [id]);
      expect(jobs).toHaveLength(0);
      expect(context).toHaveLength(0);
      vi.unstubAllEnvs();
    });
    it("rejects unavailable central credentials before creating or accepting a marketing job", async () => {
      vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "true");
      vi.stubEnv("GEMINI_API_KEY", "");
      const id = randomUUID();
      const accept = vi.fn();
      try {
        await expect(
          generateCentralMarketingDraft(
            {
              requestId: id,
              topic: "preflight fixture",
              pageRole: "center",
              postDay: "saturday",
              imageModel: "gemini-test",
            },
            1,
            accept,
          ),
        ).rejects.toThrow("unavailable");
        const [jobs] = await pool!.query<
          import("mysql2/promise").RowDataPacket[]
        >("SELECT id FROM ai_marketing_jobs WHERE id=?", [id]);
        expect(jobs).toHaveLength(0);
        expect(accept).not.toHaveBeenCalled();
      } finally {
        vi.unstubAllEnvs();
      }
    });
    it.each(["reply.live", "whatsapp.marketing", "marketing.text"] as const)(
      "releases %s capacity after a known missing Gemini credential",
      async (workload) => {
        vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "true");
        vi.stubEnv("GEMINI_API_KEY", "");
        vi.stubEnv("AUTO_REPLY_GEMINI_KEY", "");
        const fetch = vi
          .fn()
          .mockRejectedValue(new Error("Unexpected provider call"));
        vi.stubGlobal("fetch", fetch);
        try {
          await pool!.execute(
            "UPDATE ai_core_usage SET state='completed' WHERE workload=?",
            [workload],
          );
          await pool!.execute(
            "UPDATE ai_core_profiles SET provider='gemini',model='gemini-test',enabled=1,max_concurrent=1,daily_requests=1000 WHERE workload=?",
            [workload],
          );
          const id = randomUUID();
          const request = {
            instruction: "Synthetic test only",
            input: "Hello",
          };
          const operation =
            workload === "reply.live"
              ? managedReplyPreview(id, store, workload)(request)
              : workload === "whatsapp.marketing"
                ? generateWhatsAppCopy({ requestId: id, kind: "reminder" }, 1)
                : withMarketingBudget(id, workload, request, (gateway, model) =>
                    gateway.generateJson({
                      ...request,
                      model,
                      workload,
                      schema: z.object({ ok: z.boolean() }),
                      jsonSchema: { type: "object" },
                    }),
                  );
          await expect(operation).rejects.toThrow("configuration");
          const [rows] = await pool!.query<
            import("mysql2/promise").RowDataPacket[]
          >(
            "SELECT state,reserved_tokens FROM ai_core_usage WHERE request_id=?",
            [
              workload === "marketing.text"
                ? marketingUsageId(id, workload)
                : id,
            ],
          );
          expect(rows[0]).toMatchObject({
            state: "failed",
            reserved_tokens: 0,
          });
          await expect(
            store.reserve(randomUUID(), workload),
          ).resolves.toBeDefined();
          expect(fetch).not.toHaveBeenCalled();
        } finally {
          vi.unstubAllEnvs();
          vi.unstubAllGlobals();
        }
      },
    );

    it.each(["missing", "timeout"])(
      "distinguishes Manus %s creation from a known rejection in WhatsApp",
      async (failure) => {
        vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "true");
        const { ENV } = await import("../_core/env");
        const previous = ENV.manusApiKey;
        ENV.manusApiKey = failure === "missing" ? "" : "test-only";
        const fetch = vi
          .fn()
          .mockResolvedValue(
            new Response(
              JSON.stringify({ ok: false, error: { code: "timeout" } }),
              { status: 408 },
            ),
          );
        vi.stubGlobal("fetch", fetch);
        try {
          await pool!.execute(
            "UPDATE ai_core_usage SET state='completed' WHERE workload='whatsapp.marketing'",
          );
          await pool!.execute(
            "UPDATE ai_core_profiles SET provider='manus',model='standard',max_concurrent=1 WHERE workload='whatsapp.marketing'",
          );
          const id = randomUUID();
          await expect(
            generateWhatsAppCopy({ requestId: id, kind: "reminder" }, 1),
          ).rejects.toThrow();
          expect(await store.findRequest(id)).toMatchObject({
            state: failure === "missing" ? "failed" : "uncertain",
          });
          if (failure === "missing") {
            expect(fetch).not.toHaveBeenCalled();
            await expect(
              store.reserve(randomUUID(), "whatsapp.marketing"),
            ).resolves.toBeDefined();
          } else {
            expect(fetch).toHaveBeenCalledOnce();
            await expect(
              store.reserve(randomUUID(), "whatsapp.marketing"),
            ).rejects.toThrow("capacity");
          }
        } finally {
          ENV.manusApiKey = previous;
          vi.unstubAllEnvs();
          vi.unstubAllGlobals();
        }
      },
    );

    it("preserves Gemini capacity when a dispatched request has an unknown network outcome", async () => {
      vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "true");
      vi.stubEnv("AUTO_REPLY_GEMINI_KEY", "test-only");
      const fetch = vi
        .fn()
        .mockRejectedValue(new TypeError("network interruption"));
      vi.stubGlobal("fetch", fetch);
      try {
        await pool!.execute(
          "UPDATE ai_core_usage SET state='completed' WHERE workload='reply.live'",
        );
        const id = randomUUID();
        await expect(
          managedReplyPreview(
            id,
            store,
            "reply.live",
          )({ instruction: "Synthetic test", input: "Hello" }),
        ).rejects.toThrow("provider");
        expect(fetch).toHaveBeenCalled();
        expect(await store.findRequest(id)).toMatchObject({
          state: "uncertain",
        });
        await expect(store.reserve(randomUUID(), "reply.live")).rejects.toThrow(
          "capacity",
        );
      } finally {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
      }
    });

    it("replays a concurrent or interrupted WhatsApp submission under one paid task identity", async () => {
      vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "true");
      const { ENV } = await import("../_core/env");
      const previous = ENV.manusApiKey;
      ENV.manusApiKey = "test-only";
      const fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true, task_id: "one-paid-task" }), {
          status: 200,
        }),
      );
      vi.stubGlobal("fetch", fetch);
      try {
        await pool!.execute(
          "UPDATE ai_core_usage SET state='completed' WHERE workload='whatsapp.marketing'",
        );
        const input = { requestId: randomUUID(), kind: "reminder" };
        await Promise.allSettled([
          generateWhatsAppCopy(input, 1),
          generateWhatsAppCopy(input, 1),
        ]);
        await expect(generateWhatsAppCopy(input, 1)).resolves.toMatchObject({
          variants: null,
        });
        expect(await store.findRequest(input.requestId)).toMatchObject({
          state: "running",
          task_id: "one-paid-task",
        });
        expect(fetch).toHaveBeenCalledOnce();
      } finally {
        ENV.manusApiKey = previous;
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
      }
    });

    it("reconciles abandoned owner-bound Manus probes without settling clinical or unrelated tasks", async () => {
      vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "true");
      try {
        await pool!.execute("UPDATE ai_core_usage SET state='completed'");
        const ids: string[] = [];
        for (const workload of [
          "marketing.text",
          "marketing.image",
          "medical.synthetic",
          "reply.preview",
        ] as const) {
          await pool!.execute(
            "UPDATE ai_core_profiles SET provider='manus',model='standard',enabled=1,max_concurrent=1,daily_requests=1000 WHERE workload=?",
            [workload],
          );
          const id = randomUUID();
          ids.push(id);
          await store.reserve(id, workload);
          await store.attachTask(id, `probe-${workload}`);
          await pool!.execute(
            "INSERT INTO ai_operation_requests (request_id,scope,owner,state,context_json) VALUES (?,'probe',1,'accepted',?)",
            [id, JSON.stringify({ workload })],
          );
          if (workload === "reply.preview")
            await pool!.execute(
              "UPDATE ai_core_usage SET state='uncertain',error_code='provider_finished_output_pending' WHERE request_id=?",
              [id],
            );
          if (workload !== "reply.preview")
            await expect(store.reserve(randomUUID(), workload)).rejects.toThrow(
              "capacity",
            );
        }
        const unrelated = randomUUID();
        await pool!.execute(
          "INSERT INTO ai_core_usage (request_id,workload,provider,model,budget_day,state,reserved_tokens,task_id,created_ms,updated_ms) VALUES (?,'medical.documentation','manus','lite','2000-01-01','running',0,'clinical-task',0,0)",
          [unrelated],
        );
        const read = vi.fn(async () => ({
          status: "stopped",
          has_running_background_jobs: false,
          credit_usage: 2,
          attachments: [],
        }));
        await reconcileManusTasks(store, read);
        expect(read.mock.calls).toHaveLength(4);
        for (const id of ids)
          expect(await store.findRequest(id)).toMatchObject({
            state: "completed",
          });
        expect(await store.findRequest(unrelated)).toMatchObject({
          state: "running",
        });
        for (const workload of [
          "marketing.text",
          "marketing.image",
          "medical.synthetic",
        ] as const)
          await expect(
            store.reserve(randomUUID(), workload),
          ).resolves.toBeDefined();
      } finally {
        vi.unstubAllEnvs();
      }
    });

    it.each([401, 429, 408, 500])(
      "settles Gemini HTTP %s according to whether rejection is definite",
      async (status) => {
        vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "true");
        vi.stubEnv("GEMINI_API_KEY", "test-only");
        const network = vi.fn().mockImplementation(
          async () =>
            new Response(
              JSON.stringify({
                error: {
                  code: status,
                  status: "SYNTHETIC_ERROR",
                  message: "Synthetic provider failure",
                },
              }),
              { status },
            ),
        );
        vi.stubGlobal("fetch", network);
        try {
          await pool!.execute(
            "UPDATE ai_core_usage SET state='completed' WHERE workload='whatsapp.marketing'",
          );
          await pool!.execute(
            "UPDATE ai_core_profiles SET enabled=1,provider='gemini',model='gemini-test',max_concurrent=1,daily_requests=1000 WHERE workload='whatsapp.marketing'",
          );
          const id = randomUUID();
          await expect(
            generateWhatsAppCopy({ requestId: id, kind: "reminder" }, 1),
          ).rejects.toThrow("provider");
          expect(network).toHaveBeenCalled();
          const rejected = status === 401 || status === 429;
          expect(await store.findRequest(id)).toMatchObject({
            state: rejected ? "failed" : "uncertain",
          });
          if (rejected)
            await expect(
              store.reserve(randomUUID(), "whatsapp.marketing"),
            ).resolves.toBeDefined();
          else
            await expect(
              store.reserve(randomUUID(), "whatsapp.marketing"),
            ).rejects.toThrow("capacity");
        } finally {
          vi.unstubAllEnvs();
          vi.unstubAllGlobals();
        }
      },
    );

    it.each(["acquire", "write", "missing_row"])(
      "releases unused WhatsApp capacity after context preparation fails: %s",
      async (failure) => {
        vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "true");
        const network = vi
          .fn()
          .mockRejectedValue(new Error("Unexpected provider call"));
        vi.stubGlobal("fetch", network);
        const original = mocks.connect.getMockImplementation()!;
        let calls = 0;
        let injected = false;
        const id = randomUUID();
        mocks.connect.mockImplementation(async () => {
          calls++;
          if (failure === "acquire" && calls === 3)
            throw new Error("preparation connection failure");
          const connection = await original();
          const execute = connection.execute.bind(connection);
          connection.execute = async (...args: unknown[]) => {
            const sql = typeof args[0] === "string" ? args[0] : "";
            if (
              !injected &&
              failure !== "acquire" &&
              sql.startsWith("UPDATE ai_whatsapp_drafts SET variants_json") &&
              sql.includes("IS NULL")
            ) {
              injected = true;
              if (failure === "write") throw new Error("context write failure");
              await execute(
                "DELETE FROM ai_whatsapp_drafts WHERE request_id=?",
                [id],
              );
            }
            return execute(...args);
          };
          return connection;
        });
        try {
          await pool!.execute(
            "UPDATE ai_core_usage SET state='completed' WHERE workload='whatsapp.marketing'",
          );
          await pool!.execute(
            "UPDATE ai_core_profiles SET enabled=1,provider='manus',model='standard',max_concurrent=1,daily_requests=1000 WHERE workload='whatsapp.marketing'",
          );
          await expect(
            generateWhatsAppCopy({ requestId: id, kind: "reminder" }, 1),
          ).rejects.toThrow("AI_REQUEST_NOT_SUBMITTED");
          expect(await store.findRequest(id)).toMatchObject({
            state: "failed",
            task_id: null,
          });
          await expect(
            store.reserve(randomUUID(), "whatsapp.marketing"),
          ).resolves.toBeDefined();
          expect(network).not.toHaveBeenCalled();
        } finally {
          mocks.connect.mockImplementation(original);
          vi.unstubAllEnvs();
          vi.unstubAllGlobals();
        }
      },
    );

    it.each(["reply.live", "whatsapp.marketing"] as const)(
      "releases %s capacity when binding fails before Manus dispatch",
      async (workload) => {
        vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "true");
        const network = vi
          .fn()
          .mockRejectedValue(new Error("Unexpected provider request"));
        vi.stubGlobal("fetch", network);
        const binding = vi
          .spyOn(AiManagementStore.prototype, "bindRequest")
          .mockRejectedValueOnce(new Error("binding persistence failure"));
        try {
          await pool!.execute(
            "UPDATE ai_core_usage SET state='completed' WHERE workload=?",
            [workload],
          );
          await pool!.execute(
            "UPDATE ai_core_profiles SET enabled=1,provider='manus',model='standard',max_concurrent=1,daily_requests=1000 WHERE workload=?",
            [workload],
          );
          const id = randomUUID();
          const task =
            workload === "reply.live"
              ? managedReplyPreview(
                  id,
                  store,
                  workload,
                )({ instruction: "Synthetic test", input: "Hello" })
              : generateWhatsAppCopy({ requestId: id, kind: "reminder" }, 1);
          await expect(task).rejects.toThrow("AI_REQUEST_NOT_SUBMITTED");
          expect(await store.findRequest(id)).toMatchObject({
            state: "failed",
            task_id: null,
          });
          await expect(
            store.reserve(randomUUID(), workload),
          ).resolves.toBeDefined();
          expect(network).not.toHaveBeenCalled();
        } finally {
          binding.mockRestore();
          vi.unstubAllEnvs();
          vi.unstubAllGlobals();
        }
      },
    );

    it.each(["manus", "central"] as const)(
      "releases an unused %s schedule claim after preflight rejection",
      async (provider) => {
        vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "true");
        vi.stubEnv("GEMINI_API_KEY", "");
        const { ENV } = await import("../_core/env");
        const previous = ENV.manusApiKey;
        ENV.manusApiKey = "";
        const network = vi.fn();
        vi.stubGlobal("fetch", network);
        try {
          await pool!.execute("DELETE FROM marketing_posts");
          await pool!.execute("DELETE FROM marketing_facebook_pages");
          await pool!.execute("DELETE FROM ai_marketing_schedule_claims");
          await pool!.execute("DELETE FROM ai_marketing_scheduler");
          await pool!.execute(
            "INSERT INTO ai_marketing_scheduler (page_role,provider) VALUES ('center',?)",
            [provider],
          );
          await pool!.execute(
            "INSERT INTO marketing_facebook_pages (page_role,page_id,page_name,content_name,access_token,connected,auto_publish,saturday_enabled,tuesday_enabled,thursday_enabled,topic_direction) VALUES ('center','page-test','fixture','fixture','test-only',1,1,1,1,1,'forward')",
          );
          const first = await runScheduledPost("saturday", "center");
          expect(first).toMatchObject({ ok: false });
          const second = await runScheduledPost("saturday", "center");
          expect(second).toMatchObject({ ok: false });
          expect(second.skipped).toBeUndefined();
          const [claims] = await pool!.query<
            import("mysql2/promise").RowDataPacket[]
          >("SELECT id FROM ai_marketing_schedule_claims");
          expect(claims).toHaveLength(0);
          expect(network).not.toHaveBeenCalled();
        } finally {
          ENV.manusApiKey = previous;
          vi.unstubAllEnvs();
          vi.unstubAllGlobals();
        }
      },
    );

    it("retains a schedule claim after an ambiguous provider creation", async () => {
      const { ENV } = await import("../_core/env");
      const previous = ENV.manusApiKey;
      ENV.manusApiKey = "test-only";
      const network = vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ ok: false, error: { code: "unknown" } }),
            { status: 500 },
          ),
        );
      vi.stubGlobal("fetch", network);
      try {
        await pool!.execute(
          "UPDATE ai_marketing_scheduler SET provider='manus' WHERE page_role='center'",
        );
        await expect(
          runScheduledPost("saturday", "center"),
        ).resolves.toMatchObject({ ok: false });
        const [claims] = await pool!.query<
          import("mysql2/promise").RowDataPacket[]
        >("SELECT id FROM ai_marketing_schedule_claims");
        expect(claims).toHaveLength(1);
        const failedStatus = await readMarketingSchedulerStatus("center");
        expect(failedStatus.schedulerStatus).toBe("error");
        await expect(
          releaseUnusedMarketingSchedule(claims[0].id, "manus"),
        ).resolves.toBe(false);
        await expect(
          runScheduledPost("saturday", "center"),
        ).resolves.toMatchObject({ ok: true, jobId: claims[0].id });
        expect(await readMarketingSchedulerStatus("center")).toEqual(
          failedStatus,
        );
        expect(network).toHaveBeenCalledOnce();
      } finally {
        ENV.manusApiKey = previous;
        vi.unstubAllGlobals();
      }
    });

    it("creates only one schedule claim across overlapping catch-up checks", async () => {
      const id = randomUUID();
      const attempts = await Promise.all([
        claimMarketingSchedule(id, "center"),
        claimMarketingSchedule(id, "center"),
      ]);
      expect(attempts.filter((attempt) => attempt.claimed)).toHaveLength(1);
      const [claims] = await pool!.query<
        import("mysql2/promise").RowDataPacket[]
      >("SELECT id FROM ai_marketing_schedule_claims WHERE id=?", [id]);
      expect(claims).toHaveLength(1);
    });

    it("serializes cross-provider image claims under the same draft lock", async () => {
      const base = drizzle(pool!);
      await pool!.execute(
        "INSERT INTO marketing_posts (id,title,status,page_role) VALUES (8002,'image fixture','draft','center')",
      );
      const attempts = await Promise.allSettled(
        ["manus", "gemini"].map((provider) =>
          base.transaction(async (tx) => {
            await tx
              .select()
              .from(marketingPosts)
              .where((await import("drizzle-orm")).eq(marketingPosts.id, 8002))
              .for("update");
            await assertDraftImageAvailable(tx, 8002);
            if (provider === "manus")
              await tx.insert(marketingGenerationJobs).values({
                id: randomUUID(),
                kind: "image",
                topic: "image fixture",
                postDay: "saturday",
                pageRole: "center",
                postId: 8002,
                state: "running",
              });
            else
              await tx.insert(aiMarketingJobs).values({
                id: randomUUID(),
                kind: "image",
                topic: "image fixture",
                postDay: "saturday",
                pageRole: "center",
                sourcePostId: 8002,
                state: "running",
              });
          }),
        ),
      );
      expect(
        attempts.filter((result) => result.status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        attempts.filter((result) => result.status === "rejected"),
      ).toHaveLength(1);
    });
  },
);
