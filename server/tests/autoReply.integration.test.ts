import "dotenv/config";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  beginOnboarding,
  exchangeOnboardingCode,
  finishOnboarding,
  initiateCoexistenceSync,
} from "../services/auto-reply/coexistence";
import {
  readCoexistenceCredentials,
  saveCoexistenceCredentials,
} from "../services/auto-reply/coexistence-credentials";
import {
  enqueueCoexistenceChanges,
  processCoexistenceQueue,
} from "../services/auto-reply/coexistence-sync";
import mysql, { type Pool, type Connection } from "mysql2/promise";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import { eq, sql } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("../db", () => ({
  getDb: vi.fn(),
  getDbConnection: vi.fn(),
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));
import { getDb, getDbConnection } from "../db";
import {
  autoReplyConversations as conversations,
  autoReplyJobs as jobs,
  autoReplyKnowledge as knowledge,
  autoReplyConnections as connections,
  autoReplyMessages as messages,
  autoReplyOnboarding as onboarding,
  autoReplySyncEvents as syncEvents,
  autoReplyContacts as contacts,
} from "../../drizzle/autoReply";
import { autoReplySettingsSchema } from "../../shared/auto-reply";
import { services as catalogServices } from "../../drizzle/schema";
import {
  conversationContext,
  ingestEvents,
  queueManualReply,
  readSettings,
  saveSettings,
  setConversationStatus,
  purgeExpiredConversations,
  recordDeliveryReceipts,
  withKnowledgeUpdate,
} from "../services/auto-reply/store";
import { hash } from "../services/auto-reply/policy";
import { connectionFingerprint } from "../services/auto-reply/providers";
import { runAutoReplyTick } from "../services/auto-reply/worker";
import type { InboundEvent } from "../services/auto-reply/events";
import { autoReplyRouter } from "../routers/autoReply";
import { makeCallerAs } from "./helpers/auth";

const testUrl = process.env.DATABASE_TEST_URL;
const productionUrl = process.env.DATABASE_URL;
describe.skipIf(!testUrl)(
  "auto-reply durable processing (isolated MySQL)",
  () => {
    let pool: Pool;
    let admin: Connection | undefined;
    const database = `selrs_test_reply_${randomUUID().replaceAll("-", "")}`;
    let created = false;
    let db: MySql2Database;
    let vaultDirectory: string;
    const tableNames = [
      "ai_core_usage",
      "ai_core_profiles",
      "auto_reply_sync_events",
      "auto_reply_contacts",
      "auto_reply_onboarding",
      "auto_reply_jobs",
      "auto_reply_messages",
      "auto_reply_events",
      "auto_reply_conversations",
      "auto_reply_knowledge",
      "auto_reply_connections",
      "auto_reply_settings",
      "services",
    ];
    beforeAll(async () => {
      const target = new URL(testUrl!);
      if (productionUrl) {
        const production = new URL(productionUrl);
        if (
          target.hostname === production.hostname &&
          (target.port || "3306") === (production.port || "3306") &&
          target.pathname === production.pathname
        )
          throw new Error("Refusing to use the production database");
      }
      if (!/test/i.test(target.pathname))
        throw new Error("Use an explicitly named test database");
      admin = await mysql.createConnection(testUrl!);
      await admin.query(`CREATE DATABASE \`${database}\``);
      created = true;
      target.pathname = `/${database}`;
      pool = mysql.createPool({
        uri: target.href,
        connectionLimit: 5,
        timezone: "local",
      });
      db = drizzle(pool);
      vi.mocked(getDb).mockResolvedValue(db);
      vi.mocked(getDbConnection).mockImplementation(() => pool.getConnection());
      const core = await readFile(
        new URL("../../drizzle/ai_core_management.sql", import.meta.url),
        "utf8",
      );
      for (const statement of core.split(";").filter((s) => s.trim()))
        await pool.query(statement);
      for (const file of [
        "0104_auto_reply.sql",
        "0105_auto_reply_facebook_pages.sql",
        "0106_auto_reply_coexistence.sql",
        "0107_auto_reply_targets.sql",
        "0108_auto_reply_teaching.sql",
      ]) {
        const migration = await readFile(
          new URL(`../../drizzle/${file}`, import.meta.url),
          "utf8",
        );
        for (const statement of migration
          .split("--> statement-breakpoint")
          .map((s) => s.trim())
          .filter(Boolean))
          await pool.query(statement);
      }
      const serviceMigration = await readFile(
        new URL(
          "../../drizzle/New folder/0025_busy_living_lightning.sql",
          import.meta.url,
        ),
        "utf8",
      );
      const serviceStatement = serviceMigration
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .find((s) => s.startsWith("CREATE TABLE `services`"));
      if (!serviceStatement)
        throw new Error("Service catalog migration missing");
      await pool.query(serviceStatement);
    });
    beforeEach(async () => {
      vaultDirectory = mkdtempSync(
        join(tmpdir(), "selrs-coexistence-db-test-"),
      );
      vi.stubEnv(
        "AUTO_REPLY_CREDENTIAL_FILE",
        join(vaultDirectory, "whatsapp.enc"),
      );
      vi.stubEnv("AUTO_REPLY_CREDENTIAL_KEY", "ab".repeat(32));
      vi.stubEnv("AUTO_REPLY_COEXISTENCE_ENABLED", "true");
      vi.stubEnv("AUTO_REPLY_EMBEDDED_SIGNUP_CONFIG_ID", "345");
      vi.stubEnv("AUTO_REPLY_PUBLIC_ORIGIN", "https://selrs.cc");
      vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "999");
      for (const table of tableNames)
        await pool.query(`TRUNCATE TABLE \`${table}\``);
      vi.stubEnv("AUTO_REPLY_META_APP_SECRET", "fixture-secret");
      vi.stubEnv("AUTO_REPLY_META_APP_ID", "123");
      vi.stubEnv("AUTO_REPLY_META_GRAPH_VERSION", "v25.0");
      vi.stubEnv("AUTO_REPLY_VERIFY_TOKEN", "fixture-verify");
      vi.stubEnv("AUTO_REPLY_WHATSAPP_PHONE_ID", "789");
      vi.stubEnv("AUTO_REPLY_WHATSAPP_WABA_ID", "987");
      vi.stubEnv("AUTO_REPLY_WHATSAPP_TOKEN", "fixture-wa-token");
      vi.stubEnv("AUTO_REPLY_GEMINI_KEY", "fixture-gemini");
      vi.stubEnv("AUTO_REPLY_WORKER_ENABLED", "true");
      vi.stubEnv("AUTO_REPLY_PAGE_ID", "456");
      vi.stubEnv("AUTO_REPLY_PAGE_TOKEN", "first-page-token");
      vi.stubEnv("AUTO_REPLY_PAGE_2_ID", "654");
      vi.stubEnv("AUTO_REPLY_PAGE_2_TOKEN", "second-page-token");
    });
    afterEach(() => {
      if (vaultDirectory)
        rmSync(vaultDirectory, { recursive: true, force: true });
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    });
    afterAll(async () => {
      await pool?.end();
      if (created && /^selrs_test_reply_[a-f0-9]{32}$/.test(database))
        await admin?.query(`DROP DATABASE \`${database}\``);
      await admin?.end();
    });
    function event(id = "m1", text = "عنوان الفرع"): InboundEvent {
      return {
        key: hash(id),
        channel: "whatsapp",
        accountId: "789",
        participantId: "201000000000",
        threadId: "201000000000",
        providerId: id,
        text,
        at: new Date(),
        humanEcho: false,
        unsupported: false,
        deleted: false,
      };
    }
    async function enable() {
      const config = autoReplySettingsSchema.parse({
        sendingEnabled: true,
        channels: { whatsapp: true, messenger: false, facebook_comment: false },
      });
      await saveSettings(config, 1);
      await db
        .insert(connections)
        .values({
          channel: "whatsapp",
          accountId: "789",
          checkedAt: new Date(),
          checkOk: true,
          fingerprint: connectionFingerprint("whatsapp"),
          lastWebhookAt: new Date(),
          lastMobileEchoAt: new Date(),
        })
        .onDuplicateKeyUpdate({
          set: {
            checkOk: true,
            checkedAt: new Date(),
            fingerprint: connectionFingerprint("whatsapp"),
            lastWebhookAt: new Date(),
            lastMobileEchoAt: new Date(),
          },
        });
      await db.insert(knowledge).values({
        kind: "branch",
        title: "عنوان الفرع",
        content: "العنوان المعتمد للاختبار",
        keywords: "عنوان address",
        approved: true,
      });
      return config;
    }
    function mockNetwork(metaStatus = 200, geminiStatus = 200) {
      const fetcher = vi.fn(async (url: string) =>
        url.includes("generativelanguage")
          ? Response.json(
              {
                candidates: [
                  {
                    finishReason: "STOP",
                    content: {
                      parts: [
                        {
                          text: JSON.stringify({
                            text: "العنوان المعتمد للاختبار",
                            handoff: false,
                            sourceIds: [1],
                          }),
                        },
                      ],
                    },
                  },
                ],
                usageMetadata: {
                  promptTokenCount: 10,
                  candidatesTokenCount: 5,
                },
              },
              { status: geminiStatus },
            )
          : Response.json(
              metaStatus === 200
                ? { messages: [{ id: "sent-1" }] }
                : { error: { message: "sensitive provider payload" } },
              { status: metaStatus },
            ),
      );
      vi.stubGlobal("fetch", fetcher);
      return fetcher;
    }
    async function enablePages() {
      const config = await enable();
      await saveSettings(
        {
          ...config,
          channels: {
            ...config.channels,
            messenger: true,
            facebook_comment: true,
          },
          facebookPages: {
            "456": { messenger: true, facebook_comment: true },
            "654": { messenger: true, facebook_comment: true },
          },
        },
        1,
      );
      for (const accountId of ["456", "654"])
        for (const channel of ["messenger", "facebook_comment"] as const)
          await db.insert(connections).values({
            channel,
            accountId,
            checkOk: true,
            checkedAt: new Date(),
            fingerprint: connectionFingerprint(channel, accountId),
            lastWebhookAt: new Date(),
          });
    }
    function pageEvent(
      accountId: string,
      channel: "messenger" | "facebook_comment" = "messenger",
    ): InboundEvent {
      return {
        ...event(),
        key: hash(`${channel}:${accountId}:same-message`),
        channel,
        accountId,
        participantId: "same-person",
        threadId:
          channel === "messenger" ? "same-person" : `${accountId}-comment`,
        providerId: "same-message",
      };
    }
    it.each(["messenger", "facebook_comment"] as const)(
      "isolates both pages in the %s worker and inbox",
      async (channel) => {
        await enablePages();
        await ingestEvents([
          pageEvent("456", channel),
          pageEvent("654", channel),
        ]);
        const requests: { url: string; authorization: string | null }[] = [];
        vi.stubGlobal(
          "fetch",
          vi.fn(async (url: string, init: RequestInit) => {
            if (url.includes("generativelanguage"))
              return Response.json({
                candidates: [
                  {
                    finishReason: "STOP",
                    content: {
                      parts: [
                        {
                          text: JSON.stringify({
                            text: "العنوان المعتمد للاختبار",
                            handoff: false,
                            sourceIds: [1],
                          }),
                        },
                      ],
                    },
                  },
                ],
              });
            requests.push({
              url,
              authorization: new Headers(init.headers).get("Authorization"),
            });
            return Response.json({
              message_id: `sent-${requests.length}`,
              id: `sent-${requests.length}`,
            });
          }),
        );
        await runAutoReplyTick();
        await runAutoReplyTick();
        expect(requests).toEqual(
          ["456", "654"].map((id) => ({
            url: `https://graph.facebook.com/v25.0/${channel === "messenger" ? `${id}/messages` : `${id}-comment/comments`}`,
            authorization: `Bearer ${id === "456" ? "first-page-token" : "second-page-token"}`,
          })),
        );
        expect((await db.select().from(jobs)).map((j) => j.state)).toEqual([
          "sent",
          "sent",
        ]);
        const inbox = await autoReplyRouter
          .createCaller(makeCallerAs("admin"))
          .conversations({ accountId: "654" });
        expect(inbox.rows).toHaveLength(1);
        expect(inbox.rows[0].accountId).toBe("654");
      },
    );
    it.each([
      "success",
      "private_denied",
      "public_failed",
      "private_uncertain",
    ])(
      "handles price-comment delivery %s without false confirmations or duplicate private messages",
      async (scenario) => {
        await enablePages();
        const inbound = {
          ...pageEvent("654", "facebook_comment"),
          text: "سعر الكشف بكام؟",
        };
        await db.insert(knowledge).values({
          kind: "service",
          title: "الكشف",
          content: "سعر الكشف 260 جنيه",
          keywords: "سعر الكشف",
          approved: true,
        });
        const [fact] = await db
          .select()
          .from(knowledge)
          .where(eq(knowledge.title, "الكشف"));
        await ingestEvents([inbound]);
        const requests: { url: string; body: Record<string, unknown> }[] = [];
        vi.stubGlobal(
          "fetch",
          vi.fn(async (url: string, init: RequestInit) => {
            if (url.includes("generativelanguage"))
              return Response.json({
                candidates: [
                  {
                    finishReason: "STOP",
                    content: {
                      parts: [
                        {
                          text: JSON.stringify({
                            text: "سعر الكشف 260 جنيه",
                            handoff: false,
                            sourceIds: [fact.id],
                          }),
                        },
                      ],
                    },
                  },
                ],
              });
            requests.push({ url, body: JSON.parse(String(init.body)) });
            if (url.endsWith("/messages")) {
              if (scenario === "private_denied")
                return Response.json({ error: { code: 10 } }, { status: 403 });
              if (scenario === "private_uncertain")
                throw new Error("network interrupted");
              return Response.json({ message_id: "private-price" });
            }
            if (scenario === "public_failed")
              return Response.json({ error: { code: 4 } }, { status: 429 });
            return Response.json({ id: "public-confirmation" });
          }),
        );
        await runAutoReplyTick();
        await runAutoReplyTick();
        expect(requests[0]).toEqual({
          url: "https://graph.facebook.com/v25.0/654/messages",
          body: {
            recipient: { comment_id: "654-comment" },
            message: { text: "سعر الكشف 260 جنيه" },
          },
        });
        expect(requests).toHaveLength(scenario.startsWith("private_") ? 1 : 2);
        if (requests[1])
          expect(requests[1].body).toEqual({
            message: "تم إرسال التفاصيل في رسالة خاصة.",
          });
        const [job] = await db.select().from(jobs);
        expect(job.state).toBe(
          scenario === "success"
            ? "sent"
            : scenario === "private_denied"
              ? "failed"
              : "unknown",
        );
        if (scenario === "success") {
          expect(
            (await db.select().from(messages))
              .filter((m) => m.direction === "bot")
              .map((m) => m.body),
          ).toEqual(["سعر الكشف 260 جنيه", "تم إرسال التفاصيل في رسالة خاصة."]);
          await ingestEvents([
            {
              ...pageEvent("654"),
              key: hash("private-echo"),
              providerId: "private-price",
              humanEcho: true,
            },
          ]);
          expect(
            (await db.select().from(conversations)).filter(
              (c) => c.channel === "messenger",
            ),
          ).toHaveLength(0);
        }
      },
    );
    it("saves free-form Teach AI content with a page target and cancels stale proposals", async () => {
      await enablePages();
      await ingestEvents([pageEvent("456")]);
      const caller = autoReplyRouter.createCaller(makeCallerAs("admin"));
      await caller.saveTeaching({
        title: "كل معلومات الصفحة",
        content: "المياه البيضاء تبدأ من 15000 جنيه. الفحوصات خارج التكلفة.",
        targetPage: "456",
        enabled: true,
      });
      expect((await caller.teaching())[0]).toMatchObject({
        kind: "teach_ai",
        targetPage: "456",
        approved: true,
      });
      expect((await readSettings()).knowledgeMode).toBe("teach_ai");
      expect((await db.select().from(jobs))[0].state).toBe("cancelled");
    });
    it("clears AI context without deleting messages or changing staff takeover", async () => {
      await enablePages();
      await ingestEvents([
        { ...pageEvent("456"), at: new Date(Date.now() - 5000) },
      ]);
      const [conversation] = await db.select().from(conversations);
      await setConversationStatus(conversation.id, "human");
      const caller = autoReplyRouter.createCaller(makeCallerAs("admin"));
      await expect(
        caller.clearAIHistory({ conversationId: conversation.id }),
      ).resolves.toEqual({ count: 1 });
      expect((await conversationContext(conversation.id)).rows).toEqual([]);
      expect(await db.select().from(messages)).toHaveLength(1);
      expect((await db.select().from(conversations))[0].status).toBe("human");
    });
    it("keeps a greeting conversation open so the next question can be answered automatically", async () => {
      await enablePages();
      const greeting = { ...pageEvent("456"), text: "سلام عليكم" };
      await ingestEvents([greeting]);
      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string, init: RequestInit) => {
          if (!url.includes("generativelanguage"))
            return Response.json({ message_id: "greeting-reply" });
          const message = JSON.parse(
            JSON.parse(String(init.body)).contents[0].parts[0].text,
          ).message;
          return Response.json({
            candidates: [
              {
                finishReason: "STOP",
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        text:
                          message === "سلام عليكم"
                            ? "وعليكم السلام، نقدر نساعدك إزاي؟"
                            : "العنوان المعتمد للاختبار",
                        handoff: false,
                        sourceIds: message === "سلام عليكم" ? [] : [1],
                      }),
                    },
                  ],
                },
              },
            ],
          });
        }),
      );
      await runAutoReplyTick();
      expect((await db.select().from(conversations))[0].status).toBe("open");
      await db.update(connections).set({ lastSentAt: null });
      await ingestEvents([
        {
          ...greeting,
          key: hash("next-question"),
          providerId: "next-question",
          text: "عنوان الفرع؟",
          at: new Date(),
        },
      ]);
      await runAutoReplyTick();
      expect((await db.select().from(jobs)).map((j) => j.state)).toEqual([
        "sent",
        "sent",
      ]);
      expect((await db.select().from(conversations))[0].status).toBe("open");
    });
    it("persists page-specific knowledge and uses only that page's facts in the worker", async () => {
      await enablePages();
      await db.delete(knowledge);
      for (const targetPage of ["456", "654"])
        await db.insert(knowledge).values({
          kind: "branch",
          title: `عنوان ${targetPage}`,
          content: `عنوان خاص بصفحة ${targetPage}`,
          keywords: "عنوان address",
          approved: true,
          targetPage,
        });
      const facts = await db.select().from(knowledge);
      await ingestEvents([pageEvent("456"), pageEvent("654")]);
      const prompts: string[] = [];
      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string, init: RequestInit) => {
          if (!url.includes("generativelanguage"))
            return Response.json({ message_id: `sent-${prompts.length}` });
          const prompt = JSON.parse(String(init.body)).systemInstruction
            .parts[0].text;
          prompts.push(prompt);
          const fact = facts.find((f) => prompt.includes(f.content));
          if (!fact) throw new Error("No approved page fact");
          expect(facts.filter((f) => prompt.includes(f.content))).toHaveLength(
            1,
          );
          return Response.json({
            candidates: [
              {
                finishReason: "STOP",
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        text: fact.content,
                        handoff: false,
                        sourceIds: [fact.id],
                      }),
                    },
                  ],
                },
              },
            ],
          });
        }),
      );
      await runAutoReplyTick();
      await runAutoReplyTick();
      expect(prompts).toHaveLength(2);
      expect((await db.select().from(jobs)).map((j) => j.state)).toEqual([
        "sent",
        "sent",
      ]);
    });
    it("disables automation on one page while leaving the other page enabled", async () => {
      await enablePages();
      const config = await readSettings();
      await saveSettings(
        {
          ...config,
          facebookPages: {
            ...config.facebookPages,
            "456": { messenger: false, facebook_comment: false },
          },
        },
        1,
      );
      await ingestEvents([pageEvent("456"), pageEvent("654")]);
      const [job] = await db.select().from(jobs);
      const [c] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, job.conversationId));
      expect(await db.select().from(jobs)).toHaveLength(1);
      expect(c.accountId).toBe("654");
    });
    it("cannot reuse page one's approval for page two", async () => {
      await enablePages();
      await db
        .update(connections)
        .set({ checkOk: false })
        .where(eq(connections.accountId, "654"));
      await ingestEvents([pageEvent("654")]);
      const network = mockNetwork();
      await runAutoReplyTick();
      expect((await db.select().from(jobs))[0]).toMatchObject({
        state: "failed",
        errorCode: "CONNECTION_NOT_VERIFIED",
      });
      expect(network).not.toHaveBeenCalled();
    });
    it("imports only the services-page catalog, keeps approval explicit and does not duplicate imports", async () => {
      await db.insert(catalogServices).values([
        {
          id: "center-service",
          code: "fixture-center",
          name: "خدمة المركز",
          serviceType: "exam",
          price: "120.00",
          locationType: "center",
          isActive: true,
        },
        {
          id: "zero-service",
          code: "fixture-zero",
          name: "خدمة بلا سعر معتمد",
          serviceType: "exam",
          price: "0",
          locationType: "center",
          isActive: true,
        },
        {
          id: "inactive-service",
          code: "fixture-inactive",
          name: "خدمة متوقفة",
          serviceType: "exam",
          price: "50",
          locationType: "center",
          isActive: false,
        },
        {
          id: "external-service",
          code: "fixture-external",
          name: "خدمة خارجية",
          serviceType: "exam",
          price: "50",
          locationType: "external",
          isActive: true,
        },
      ]);
      await db.insert(knowledge).values({
        kind: "service",
        title: "فحص من مصدر قديم",
        content: "معلومة قديمة",
        source: "tests:legacy",
        keywords: "",
        approved: false,
      });
      const caller = autoReplyRouter.createCaller(makeCallerAs("admin"));
      expect(await caller.importCatalog()).toEqual({ count: 2 });
      expect(await caller.importCatalog()).toEqual({ count: 0 });
      const visible = await caller.knowledge();
      expect(visible.map((row) => row.source).sort()).toEqual([
        "services:center-service",
        "services:zero-service",
      ]);
      expect(visible.every((row) => !row.approved)).toBe(true);
      expect(
        visible.find((row) => row.source === "services:zero-service")?.content,
      ).toContain("السعر غير معتمد للنشر");
      expect(await db.select().from(knowledge)).toHaveLength(3);
    });
    it("excludes legacy test knowledge even if previously approved and refuses reapproval", async () => {
      await db.insert(knowledge).values({
        kind: "service",
        title: "عنوان قديم",
        content: "عنوان غير مسموح من الفحوص",
        source: "tests:legacy",
        keywords: "عنوان",
        approved: true,
      });
      const [legacy] = await db.select().from(knowledge);
      const caller = autoReplyRouter.createCaller(makeCallerAs("admin"));
      expect(await caller.knowledge()).toEqual([]);
      const fetcher = vi.fn();
      vi.stubGlobal("fetch", fetcher);
      expect(
        await caller.test({ channel: "messenger", text: "عنوان" }),
      ).toMatchObject({
        handoff: true,
        reason: "missing_information",
        model: null,
      });
      expect(fetcher).not.toHaveBeenCalled();
      await expect(
        caller.saveKnowledge({
          id: legacy.id,
          kind: "service",
          title: legacy.title,
          content: legacy.content,
          keywords: "عنوان",
          approved: true,
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
    it("persists enabled and disabled administrator instructions without replacing legacy style", async () => {
      const config = autoReplySettingsSchema.parse({
        style: "تعليمات عامة سابقة",
        instructions: [
          { text: "قاعدة أولى", enabled: true },
          { text: "قاعدة ثانية", enabled: false },
        ],
      });
      await saveSettings(config, 1);
      expect(await readSettings()).toMatchObject({
        style: config.style,
        instructions: config.instructions,
        sendingEnabled: false,
      });
    });
    it("allows manual service and price knowledge independently of the catalog import", async () => {
      const caller = autoReplyRouter.createCaller(makeCallerAs("admin"));
      const values = {
        title: "معلومة إدارة",
        content: "محتوى للمراجعة",
        keywords: "",
        approved: false,
      };
      for (const kind of ["service", "price"] as const)
        await caller.saveKnowledge({ ...values, kind });
      await caller.saveKnowledge({ ...values, kind: "faq" });
      const rows = await caller.knowledge();
      expect(rows.map((row) => row.kind).sort()).toEqual([
        "faq",
        "price",
        "service",
      ]);
      expect(rows.every((row) => row.source === null && !row.approved)).toBe(
        true,
      );
    });
    it("stores inbound messages with sending disabled by default", async () => {
      await ingestEvents([event()]);
      expect((await readSettings()).sendingEnabled).toBe(false);
      expect(await db.select().from(jobs)).toHaveLength(0);
      expect((await db.select().from(messages))[0].direction).toBe("inbound");
    });
    it("deduplicates concurrent redelivery in a real transaction", async () => {
      await enable();
      const inbound = event();
      await Promise.all([ingestEvents([inbound]), ingestEvents([inbound])]);
      expect(await db.select().from(messages)).toHaveLength(1);
      expect(await db.select().from(jobs)).toHaveLength(1);
    });
    it("sends only once when two workers race", async () => {
      await enable();
      await ingestEvents([event()]);
      const network = mockNetwork();
      await Promise.all([runAutoReplyTick(), runAutoReplyTick()]);
      expect((await db.select().from(jobs))[0]).toMatchObject({
        state: "sent",
        attempts: 1,
        inputTokens: 10,
        outputTokens: 5,
      });
      expect(
        (await db.select().from(messages)).filter((m) => m.direction === "bot"),
      ).toHaveLength(1);
      expect(
        network.mock.calls.filter(([url]) => url.includes("graph.facebook")),
      ).toHaveLength(1);
    });
    it("accepts either enabled central provider when saving without enabling delivery", async () => {
      vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "true");
      vi.stubEnv("AUTO_REPLY_GEMINI_KEY", "");
      await pool.query(
        "INSERT INTO ai_core_profiles (workload,provider,model,enabled) VALUES ('reply.live','manus','lite',1)",
      );
      const caller = autoReplyRouter.createCaller(makeCallerAs("admin"));
      const input = autoReplySettingsSchema.parse({
        engine: "central",
        sendingEnabled: false,
        topK: null,
      });
      await expect(caller.saveSettings(input)).resolves.toEqual({ ok: true });
      await pool.query(
        "UPDATE ai_core_profiles SET provider='gemini',model='gemini-selected' WHERE workload='reply.live'",
      );
      await expect(
        caller.saveSettings({ ...input, model: "gemini-selected" }),
      ).resolves.toEqual({ ok: true });
      expect((await readSettings()).engine).toBe("central");
      expect(await db.select().from(jobs)).toHaveLength(0);
    });
    it("runs the optional central engine through durable worker guards and existing delivery", async () => {
      const config = await enable();
      await saveSettings({ ...config, engine: "central" }, 1);
      vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "true");
      await pool.query(
        "INSERT INTO ai_core_profiles (workload,provider,model,enabled) VALUES ('reply.live','gemini','gemini-3.8-flash',1)",
      );
      await ingestEvents([event()]);
      mockNetwork();
      await Promise.all([runAutoReplyTick(), runAutoReplyTick()]);
      expect((await db.select().from(jobs))[0]).toMatchObject({
        state: "sent",
        inputTokens: 10,
        outputTokens: 5,
      });
      const [usage] = await pool.query<mysql.RowDataPacket[]>(
        "SELECT state,workload FROM ai_core_usage",
      );
      expect(usage).toMatchObject([
        { state: "completed", workload: "reply.live" },
      ]);
      expect(
        (await db.select().from(messages)).filter(
          (row) => row.direction === "bot",
        ),
      ).toHaveLength(1);
    });
    it("never rebills central generation after an ambiguous provider outcome even if a job is requeued", async () => {
      const config = await enable();
      await saveSettings({ ...config, engine: "central" }, 1);
      vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "true");
      await pool.query(
        "INSERT INTO ai_core_profiles (workload,provider,model,enabled) VALUES ('reply.live','gemini','gemini-3.8-flash',1)",
      );
      await ingestEvents([event()]);
      const network = vi.fn(async () => {
        throw new Error("synthetic network timeout");
      });
      vi.stubGlobal("fetch", network);
      await runAutoReplyTick();
      expect((await db.select().from(jobs))[0].state).toBe("unknown");
      const [usage] = await pool.query<mysql.RowDataPacket[]>(
        "SELECT state,reserved_tokens FROM ai_core_usage",
      );
      expect(usage[0].state).toBe("uncertain");
      expect(usage[0].reserved_tokens).toBeGreaterThan(0);
      await db.update(jobs).set({ state: "retry", availableAt: new Date(0) });
      await db.update(conversations).set({ status: "open" });
      await runAutoReplyTick();
      expect((await db.select().from(jobs))[0].state).toBe("unknown");
      expect(network).toHaveBeenCalledTimes(1);
      expect(
        (await db.select().from(messages)).filter(
          (row) => row.direction === "bot",
        ),
      ).toHaveLength(0);
    });
    it("persists a human request even while sending is stopped", async () => {
      await ingestEvents([event("human", "عايز موظف")]);
      expect((await db.select().from(conversations))[0].status).toBe("human");
      const config = await enable();
      await ingestEvents([event("next", "عنوان الفرع")]);
      expect(await db.select().from(jobs)).toHaveLength(0);
      expect(config.sendingEnabled).toBe(true);
    });
    it("keeps an English conversation in English when handing off a later Arabic request", async () => {
      await ingestEvents([event("first-english", "Hello")]);
      await enable();
      await ingestEvents([event("later-clinical", "علاج وجع العين")]);
      mockNetwork();
      await runAutoReplyTick();
      const outbound = (await db.select().from(messages)).find(
        (m) => m.direction === "bot",
      );
      expect(outbound?.body).toMatch(/[A-Za-z]/);
      expect(outbound?.body).not.toMatch(/[\u0600-\u06ff]/);
      expect((await db.select().from(conversations))[0].status).toBe("human");
    });
    it("cancels queued automation on staff takeover, and resume handles only new messages", async () => {
      await enable();
      await ingestEvents([event()]);
      const [c] = await db.select().from(conversations);
      await setConversationStatus(c.id, "human");
      await runAutoReplyTick();
      expect((await db.select().from(jobs))[0].state).toBe("cancelled");
      await setConversationStatus(c.id, "open");
      await ingestEvents([event("m2")]);
      expect((await db.select().from(jobs)).map((j) => j.state)).toEqual([
        "cancelled",
        "pending",
      ]);
    });
    it.each(["kill_switch", "knowledge_revoked"])(
      "rechecks %s after Gemini has begun",
      async (change) => {
        const config = await enable();
        await ingestEvents([event()]);
        let release!: () => void;
        let started!: () => void;
        const pending = new Promise<void>((resolve) => {
          release = resolve;
        });
        const entered = new Promise<void>((resolve) => {
          started = resolve;
        });
        const network = vi.fn(async () => {
          started();
          await pending;
          return Response.json({
            candidates: [
              {
                finishReason: "STOP",
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        text: "العنوان المعتمد للاختبار",
                        handoff: false,
                        sourceIds: [1],
                      }),
                    },
                  ],
                },
              },
            ],
          });
        });
        vi.stubGlobal("fetch", network);
        const running = runAutoReplyTick();
        await entered;
        if (change === "kill_switch")
          await saveSettings({ ...config, sendingEnabled: false }, 1);
        else
          await withKnowledgeUpdate(async (tx) =>
            tx.update(knowledge).set({ approved: false }),
          );
        release();
        await running;
        expect((await db.select().from(jobs))[0].state).toBe("cancelled");
        expect(
          (await db.select().from(messages)).filter(
            (m) => m.direction === "bot",
          ),
        ).toHaveLength(0);
      },
    );
    it("hands off an interrupted send without ever sending it again", async () => {
      await enable();
      await ingestEvents([event()]);
      await db
        .update(jobs)
        .set({ state: "sending", leaseUntil: new Date(Date.now() - 1000) });
      const network = mockNetwork();
      await runAutoReplyTick();
      expect((await db.select().from(jobs))[0].state).toBe("unknown");
      expect((await db.select().from(conversations))[0].status).toBe("human");
      expect(network).not.toHaveBeenCalled();
    });
    it("never exposes a database exception containing message text", async () => {
      vi.mocked(getDb).mockRejectedValueOnce(
        new Error("SQL parameters: private-customer-text"),
      );
      await expect(
        autoReplyRouter.createCaller(makeCallerAs("admin")).settings(),
      ).rejects.toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
        message: "AUTO_REPLY_STORAGE_ERROR",
      });
    });
    it.each([
      [429, "retry"],
      [500, "unknown"],
      [403, "failed"],
    ])(
      "handles Meta %s as %s without an unbounded retry",
      async (code, state) => {
        await enable();
        await ingestEvents([event()]);
        mockNetwork(Number(code));
        await runAutoReplyTick();
        const [job] = await db.select().from(jobs);
        expect(job.state).toBe(state);
        if (state === "retry") {
          await db
            .update(jobs)
            .set({ attempts: 2, availableAt: new Date(Date.now() - 1000) })
            .where(eq(jobs.id, job.id));
          await runAutoReplyTick();
          expect((await db.select().from(jobs))[0].state).toBe("failed");
        }
        expect(
          (await db.select().from(messages)).filter(
            (m) => m.direction === "bot",
          ),
        ).toHaveLength(0);
      },
    );
    it("hands off after bounded Gemini failures without sending", async () => {
      await enable();
      await ingestEvents([event()]);
      mockNetwork(200, 503);
      for (let n = 0; n < 3; n++) {
        await db.update(jobs).set({ availableAt: new Date(Date.now() - 1000) });
        await runAutoReplyTick();
      }
      expect((await db.select().from(jobs))[0]).toMatchObject({
        state: "failed",
        errorCode: "GEMINI_HTTP_503",
        attempts: 3,
      });
      expect((await db.select().from(conversations))[0].status).toBe("human");
      expect(
        (await db.select().from(messages)).filter((m) => m.direction === "bot"),
      ).toHaveLength(0);
    });
    it("deduplicates manual requests and pauses automation", async () => {
      await enable();
      await ingestEvents([event()]);
      const [c] = await db.select().from(conversations);
      const first = await queueManualReply(c.id, "رد موظف", "request-1");
      const second = await queueManualReply(c.id, "رد موظف", "request-1");
      expect(first).toEqual(second);
      expect((await db.select().from(conversations))[0].status).toBe("human");
      expect(
        (await db.select().from(jobs)).filter((j) => j.kind === "manual"),
      ).toHaveLength(1);
    });
    it.each(["echo", "manual"])(
      "resumes automation on the next customer message after %s staff reply",
      async (mode) => {
        await enable();
        await ingestEvents([event()]);
        const [c] = await db.select().from(conversations);
        if (mode === "echo")
          await ingestEvents([{ ...event("staff"), humanEcho: true }]);
        else await queueManualReply(c.id, "رد موظف", "resume-request");
        await ingestEvents([event("next-customer")]);
        expect((await db.select().from(conversations))[0]).toMatchObject({
          status: "open",
          humanReason: null,
        });
        expect(
          (await db.select().from(jobs)).filter(
            (job) => job.kind === "auto" && job.state === "pending",
          ),
        ).toHaveLength(1);
      },
    );
    it("preserves explicit takeover after a staff echo and a customer message", async () => {
      await enable();
      await ingestEvents([event()]);
      const [c] = await db.select().from(conversations);
      await setConversationStatus(c.id, "human");
      await ingestEvents([{ ...event("staff"), humanEcho: true }]);
      await ingestEvents([event("next-customer")]);
      expect((await db.select().from(conversations))[0]).toMatchObject({
        status: "human",
        humanReason: "staff_takeover",
      });
      expect(
        (await db.select().from(jobs)).filter(
          (job) => job.kind === "auto" && job.state === "pending",
        ),
      ).toHaveLength(0);
    });
    it("does not reopen or extend a reply window on a staff echo", async () => {
      await enable();
      const inbound = event();
      inbound.at = new Date(Date.now() - 25 * 3600_000);
      await ingestEvents([inbound]);
      const [c] = await db.select().from(conversations);
      await ingestEvents([{ ...event("staff"), humanEcho: true }]);
      const [current] = await db.select().from(conversations);
      expect(current.status).toBe("human");
      expect(current.lastInboundAt.getTime()).toBe(c.lastInboundAt.getTime());
      await expect(
        queueManualReply(c.id, "reply", "request-2"),
      ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    });
    it("preserves a newer pending response when an older message arrives", async () => {
      await enable();
      await ingestEvents([event()]);
      await ingestEvents([
        { ...event("older"), at: new Date(Date.now() - 3600_000) },
      ]);
      expect((await db.select().from(jobs))[0].state).toBe("pending");
      expect(await db.select().from(messages)).toHaveLength(2);
    });
    it("applies delivery receipts without retrying a failed accepted send", async () => {
      await enable();
      await ingestEvents([event()]);
      mockNetwork();
      await runAutoReplyTick();
      await recordDeliveryReceipts([
        {
          channel: "whatsapp",
          providerId: "sent-1",
          state: "failed",
          at: new Date(),
        },
      ]);
      expect((await db.select().from(jobs))[0]).toMatchObject({
        state: "failed",
        errorCode: "META_DELIVERY_FAILED",
      });
      expect((await db.select().from(conversations))[0].status).toBe("human");
    });
    it("claims onboarding once and binds it to the initiating admin session", async () => {
      const attempt = await beginOnboarding(1, "session-one");
      await expect(beginOnboarding(2, "session-two")).rejects.toThrow(
        "COEXISTENCE_ATTEMPT_ACTIVE",
      );
      await expect(
        exchangeOnboardingCode(attempt.id, "code", 2, "session-one"),
      ).rejects.toThrow("COEXISTENCE_ATTEMPT_EXPIRED");
      await expect(
        exchangeOnboardingCode(attempt.id, "code", 1, "other-session"),
      ).rejects.toThrow("COEXISTENCE_ATTEMPT_EXPIRED");
      vi.stubGlobal(
        "fetch",
        vi.fn(async () =>
          Response.json({ access_token: "fixture-business-token-secret" }),
        ),
      );
      await exchangeOnboardingCode(
        attempt.id,
        "short-lived-code",
        1,
        "session-one",
      );
      const row = (await db.select().from(onboarding))[0];
      expect(row.tokenCipher).not.toContain("fixture-business-token-secret");
      expect(JSON.stringify(row)).not.toContain("short-lived-code");
      await expect(
        exchangeOnboardingCode(
          attempt.id,
          "short-lived-code",
          1,
          "session-one",
        ),
      ).rejects.toThrow("COEXISTENCE_CODE_ALREADY_USED");
      expect(fetch).toHaveBeenCalledTimes(1);
    });
    it("rejects booking assets before any Graph mutation and records uncertain exchange without retry", async () => {
      const attempt = await beginOnboarding(1, "session");
      const network = vi.fn(async () => {
        throw new Error("network dropped");
      });
      vi.stubGlobal("fetch", network);
      await expect(
        finishOnboarding(
          attempt.id,
          {
            event: "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
            phoneId: "999",
            wabaId: "987",
          },
          1,
          "session",
        ),
      ).rejects.toThrow("WHATSAPP_CONFIRMATION_NUMBER_RESERVED");
      expect(network).not.toHaveBeenCalled();
      await expect(
        exchangeOnboardingCode(attempt.id, "code", 1, "session"),
      ).rejects.toThrow("TOKEN_EXCHANGE_FAILED_OR_UNKNOWN");
      await expect(
        exchangeOnboardingCode(attempt.id, "code", 1, "session"),
      ).rejects.toThrow("COEXISTENCE_CODE_ALREADY_USED");
      expect(network).toHaveBeenCalledTimes(1);
    });
    it("completes verified Coexistence without registering the phone or enabling sending", async () => {
      const attempt = await beginOnboarding(1, "session");
      const network = vi.fn(async (input: string, options?: RequestInit) => {
        const path = new URL(input).pathname;
        if (path.endsWith("oauth/access_token"))
          return Response.json({
            access_token: "fixture-business-token-secret",
          });
        if (path.endsWith("debug_token"))
          return Response.json({
            data: {
              app_id: "123",
              is_valid: true,
              scopes: [
                "whatsapp_business_messaging",
                "whatsapp_business_management",
              ],
            },
          });
        if (path.endsWith("/789"))
          return Response.json({
            id: "789",
            is_on_biz_app: true,
            platform_type: "CLOUD_API",
          });
        if (path.endsWith("phone_numbers"))
          return Response.json({ data: [{ id: "789" }] });
        if (path.endsWith("subscribed_apps"))
          return Response.json(
            options?.method === "POST"
              ? { success: true }
              : { data: [{ whatsapp_business_api_data: { id: "123" } }] },
          );
        throw new Error("Unexpected Graph operation");
      });
      vi.stubGlobal("fetch", network);
      await exchangeOnboardingCode(attempt.id, "one-time-code", 1, "session");
      await finishOnboarding(
        attempt.id,
        {
          event: "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
          phoneId: "789",
          wabaId: "987",
        },
        1,
        "session",
      );
      expect(readCoexistenceCredentials()).toMatchObject({
        phoneId: "789",
        wabaId: "987",
        attemptId: attempt.id,
      });
      expect((await db.select().from(onboarding))[0]).toMatchObject({
        state: "syncing",
        tokenCipher: null,
      });
      expect((await readSettings()).sendingEnabled).toBe(false);
      expect(
        network.mock.calls.some(([url]) =>
          new URL(url).pathname.endsWith("/register"),
        ),
      ).toBe(false);
      expect(process.env.WHATSAPP_PHONE_NUMBER_ID).toBe("999");
    });
    it("rejects onboarding mutations outside admin role or exact configured origin", async () => {
      await expect(
        autoReplyRouter
          .createCaller(makeCallerAs("receptionist"))
          .beginOnboarding(),
      ).rejects.toThrow();
      const context = makeCallerAs("admin");
      context.req.headers.origin = "https://selrs.cc.evil.test";
      context.req.headers.cookie = "app_session_id=fixture-session";
      await expect(
        autoReplyRouter.createCaller(context).beginOnboarding(),
      ).rejects.toThrow("COEXISTENCE_ORIGIN_INVALID");
      expect(await db.select().from(onboarding)).toHaveLength(0);
    });
    async function syncedAttempt() {
      const attempt = await beginOnboarding(1, "session");
      await db
        .update(onboarding)
        .set({
          state: "syncing",
          details: {
            phoneId: "789",
            wabaId: "987",
            contacts: "not_started",
            history: "not_started",
          },
        })
        .where(eq(onboarding.id, attempt.id));
      saveCoexistenceCredentials({
        token: "fixture-business-token-secret",
        phoneId: "789",
        wabaId: "987",
        attemptId: attempt.id,
      });
      return attempt;
    }
    it("never repeats a synchronization POST after timeout, including on another tick", async () => {
      await syncedAttempt();
      const network = vi.fn(async () => {
        throw new Error("timeout after acceptance");
      });
      vi.stubGlobal("fetch", network);
      await initiateCoexistenceSync();
      await initiateCoexistenceSync();
      expect(network).toHaveBeenCalledTimes(2);
      expect((await db.select().from(onboarding))[0].details).toMatchObject({
        history: "unknown",
        contacts: "unknown",
      });
    });
    it("imports history idempotently without jobs or a live reply window, and honors consent refusal", async () => {
      await syncedAttempt();
      const payload = {
        object: "whatsapp_business_account",
        entry: [
          {
            id: "987",
            changes: [
              {
                field: "history",
                value: {
                  metadata: { phone_number_id: "789" },
                  history: [
                    {
                      metadata: { phase: 0, chunk_order: 1, progress: 100 },
                      threads: [
                        {
                          id: "201111111111",
                          messages: [
                            {
                              id: "history-1",
                              from: "201111111111",
                              timestamp: String(
                                Math.floor(Date.now() / 1000) - 3600,
                              ),
                              type: "text",
                              text: { body: "سؤال من السجل" },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              },
            ],
          },
        ],
      };
      await enqueueCoexistenceChanges(payload);
      await enqueueCoexistenceChanges(payload);
      expect(await db.select().from(syncEvents)).toHaveLength(1);
      await processCoexistenceQueue();
      await processCoexistenceQueue();
      expect(await db.select().from(messages)).toHaveLength(1);
      expect((await db.select().from(messages))[0]).toMatchObject({
        direction: "history_inbound",
        state: "imported",
      });
      expect((await db.select().from(conversations))[0]).toMatchObject({
        status: "human",
        lastInboundAt: new Date(0),
      });
      expect(await db.select().from(jobs)).toHaveLength(0);
      expect((await db.select().from(syncEvents))[0].payloadCipher).toBeNull();
      await enqueueCoexistenceChanges({
        object: "whatsapp_business_account",
        entry: [
          {
            id: "987",
            changes: [
              {
                field: "history",
                value: {
                  metadata: { phone_number_id: "789" },
                  history: [{ errors: [{ code: 2593109 }] }],
                },
              },
            ],
          },
        ],
      });
      await processCoexistenceQueue();
      expect((await db.select().from(onboarding))[0].details.history).toBe(
        "declined",
      );
    });
    it("keeps newer conversation context after older history arrives late", async () => {
      await syncedAttempt();
      await ingestEvents([event("fresh-message", "رسالة جديدة")]);
      const conversation = (await db.select().from(conversations))[0];
      await enqueueCoexistenceChanges({
        object: "whatsapp_business_account",
        entry: [
          {
            id: "987",
            changes: [
              {
                field: "history",
                value: {
                  metadata: { phone_number_id: "789" },
                  history: [
                    {
                      metadata: { phase: 0, chunk_order: 1, progress: 100 },
                      threads: [
                        {
                          id: "201000000000",
                          messages: [
                            {
                              id: "late-history",
                              from: "201000000000",
                              timestamp: String(
                                Math.floor(Date.now() / 1000) - 3600,
                              ),
                              type: "text",
                              text: { body: "رسالة أقدم وصلت متأخرة" },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              },
            ],
          },
        ],
      });
      await processCoexistenceQueue();
      const context = await conversationContext(conversation.id);
      expect(context.rows.map((row) => row.body)).toEqual([
        "رسالة أقدم وصلت متأخرة",
        "رسالة جديدة",
      ]);
      expect((await db.select().from(conversations))[0].lastInboundAt).toEqual(
        conversation.lastInboundAt,
      );
    });
    it("keeps contacts isolated and prevents delayed adds from undoing removal", async () => {
      await syncedAttempt();
      const payload = (action: string, timestamp: number) => ({
        object: "whatsapp_business_account",
        entry: [
          {
            id: "987",
            changes: [
              {
                field: "smb_app_state_sync",
                value: {
                  metadata: { phone_number_id: "789" },
                  state_sync: [
                    {
                      type: "contact",
                      action,
                      contact: {
                        phone_number: "201111111111",
                        full_name: "اسم اختبار",
                      },
                      metadata: { timestamp: String(timestamp) },
                    },
                  ],
                },
              },
            ],
          },
        ],
      });
      const now = Math.floor(Date.now() / 1000);
      await enqueueCoexistenceChanges(payload("remove", now));
      await processCoexistenceQueue();
      await enqueueCoexistenceChanges(payload("add", now - 60));
      await processCoexistenceQueue();
      const row = (await db.select().from(contacts))[0];
      expect(row.sourceAt.getTime()).toBe(now * 1000);
      expect(row.nameCipher).not.toContain("اسم اختبار");
    });
    it("keeps the internal test separate from real inbox and sending", async () => {
      await enable();
      mockNetwork();
      const result = await autoReplyRouter
        .createCaller(makeCallerAs("admin"))
        .test({ channel: "whatsapp", text: "عنوان الفرع" });
      expect(result.testOnly).toBe(true);
      expect(result.text).toBe("العنوان المعتمد للاختبار");
      expect(await db.select().from(conversations)).toHaveLength(0);
      expect(await db.select().from(jobs)).toHaveLength(0);
    });
    it("purges expired conversation content but keeps event tombstones", async () => {
      await enable();
      await ingestEvents([event()]);
      await db
        .update(conversations)
        .set({ lastActivityAt: new Date(Date.now() - 40 * 86400_000) });
      await purgeExpiredConversations();
      expect(await db.select().from(conversations)).toHaveLength(0);
      expect(await db.select().from(messages)).toHaveLength(0);
      await ingestEvents([event()]);
      expect(await db.select().from(conversations)).toHaveLength(0);
    });
  },
);
