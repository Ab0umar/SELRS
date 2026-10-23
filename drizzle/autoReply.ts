import {
  mysqlTable,
  int,
  varchar,
  text,
  mediumtext,
  json,
  boolean,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/mysql-core";
import { autoReplyTime } from "./autoReplyTime";
import type { AutoReplyChannel, AutoReplySettings } from "../shared/auto-reply";

export type CoexistenceDetails = {
  phoneId?: string;
  wabaId?: string;
  history?: string;
  contacts?: string;
  historyRequestId?: string;
  contactsRequestId?: string;
  historyProgress?: number;
  historyChunks?: string[];
  errorCode?: string;
};
export const autoReplyOnboarding = mysqlTable(
  "auto_reply_onboarding",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: int("user_id").notNull(),
    sessionHash: varchar("session_hash", { length: 64 }).notNull(),
    state: varchar("state", { length: 32 }).notNull().default("created"),
    tokenCipher: text("token_cipher"),
    details: json("details").$type<CoexistenceDetails>().notNull(),
    createdAt: autoReplyTime("created_at").notNull(),
    expiresAt: autoReplyTime("expires_at").notNull(),
    updatedAt: autoReplyTime("updated_at").notNull(),
  },
  (t) => [index("ar_onboarding_state").on(t.state, t.updatedAt)],
);
export const autoReplySyncEvents = mysqlTable(
  "auto_reply_sync_events",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    attemptId: varchar("attempt_id", { length: 36 }).notNull(),
    field: varchar("field", { length: 32 }).notNull(),
    payloadCipher: mediumtext("payload_cipher"),
    state: varchar("state", { length: 16 }).notNull().default("pending"),
    attempts: int("attempts").notNull().default(0),
    createdAt: autoReplyTime("created_at").notNull(),
  },
  (t) => [index("ar_sync_queue").on(t.state, t.createdAt)],
);
export const autoReplyContacts = mysqlTable(
  "auto_reply_contacts",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    accountId: varchar("account_id", { length: 128 }).notNull(),
    phone: varchar("phone", { length: 64 }).notNull(),
    nameCipher: text("name_cipher").notNull(),
    sourceAt: autoReplyTime("source_at").notNull(),
    updatedAt: autoReplyTime("updated_at").notNull(),
  },
  (t) => [index("ar_contacts_account").on(t.accountId)],
);

export const autoReplySettings = mysqlTable("auto_reply_settings", {
  id: int("id").primaryKey(),
  config: json("config").$type<AutoReplySettings>().notNull(),
  revision: int("revision").default(0).notNull(),
  updatedBy: int("updated_by"),
  updatedAt: autoReplyTime("updated_at")
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date())
    .notNull(),
});
export const autoReplyKnowledge = mysqlTable("auto_reply_knowledge", {
  targetPage: varchar("target_page", { length: 32 }).notNull().default("all"),
  id: int("id").autoincrement().primaryKey(),
  kind: varchar("kind", { length: 32 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: mediumtext("content").notNull(),
  sourceUrl: varchar("source_url", { length: 2048 }),
  keywords: text("keywords").notNull(),
  source: varchar("source", { length: 100 }),
  approved: boolean("approved").default(false).notNull(),
  updatedBy: int("updated_by"),
  updatedAt: autoReplyTime("updated_at")
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date())
    .notNull(),
});
export const autoReplyConversations = mysqlTable(
  "auto_reply_conversations",
  {
    contextResetAt: autoReplyTime("context_reset_at"),
    id: int("id").autoincrement().primaryKey(),
    identityHash: varchar("identity_hash", { length: 64 }).notNull(),
    channel: varchar("channel", { length: 32 })
      .$type<AutoReplyChannel>()
      .notNull(),
    accountId: varchar("account_id", { length: 128 }).notNull(),
    participantId: varchar("participant_id", { length: 128 }).notNull(),
    threadId: varchar("thread_id", { length: 255 }).notNull(),
    status: varchar("status", { length: 20 }).default("open").notNull(),
    humanReason: varchar("human_reason", { length: 64 }),
    lastInboundAt: autoReplyTime("last_inbound_at").notNull(),
    lastActivityAt: autoReplyTime("last_activity_at")
      .$defaultFn(() => new Date())
      .notNull(),
    revision: int("revision").default(0).notNull(),
  },
  (t) => [
    uniqueIndex("ar_conversation_identity").on(t.identityHash),
    index("ar_conversation_activity").on(t.lastActivityAt),
  ],
);
export const autoReplyEvents = mysqlTable(
  "auto_reply_events",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    receivedAt: autoReplyTime("received_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => [index("ar_event_received").on(t.receivedAt)],
);
export const autoReplyMessages = mysqlTable(
  "auto_reply_messages",
  {
    id: int("id").autoincrement().primaryKey(),
    conversationId: int("conversation_id").notNull(),
    eventKey: varchar("event_key", { length: 64 }).notNull(),
    providerId: varchar("provider_id", { length: 255 }),
    direction: varchar("direction", { length: 20 }).notNull(),
    body: text("body").notNull(),
    state: varchar("state", { length: 32 }).default("received").notNull(),
    createdAt: autoReplyTime("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex("ar_message_event").on(t.eventKey),
    index("ar_message_conversation").on(t.conversationId, t.id),
  ],
);
export const autoReplyJobs = mysqlTable(
  "auto_reply_jobs",
  {
    id: int("id").autoincrement().primaryKey(),
    conversationId: int("conversation_id").notNull(),
    inboundId: int("inbound_id"),
    requestKey: varchar("request_key", { length: 64 }).notNull(),
    kind: varchar("kind", { length: 16 }).notNull(),
    handoff: boolean("handoff").default(false).notNull(),
    body: text("body"),
    state: varchar("state", { length: 32 }).default("pending").notNull(),
    attempts: int("attempts").default(0).notNull(),
    availableAt: autoReplyTime("available_at")
      .$defaultFn(() => new Date())
      .notNull(),
    leaseUntil: autoReplyTime("lease_until"),
    claim: varchar("claim", { length: 36 }),
    revision: int("revision").notNull(),
    providerId: varchar("provider_id", { length: 255 }),
    errorCode: varchar("error_code", { length: 64 }),
    model: varchar("model", { length: 100 }),
    inputTokens: int("input_tokens").default(0).notNull(),
    outputTokens: int("output_tokens").default(0).notNull(),
    createdAt: autoReplyTime("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: autoReplyTime("updated_at")
      .$defaultFn(() => new Date())
      .$onUpdateFn(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex("ar_job_request").on(t.requestKey),
    index("ar_job_queue").on(t.state, t.availableAt),
    index("ar_job_conversation").on(t.conversationId),
  ],
);
export const autoReplyConnections = mysqlTable(
  "auto_reply_connections",
  {
    channel: varchar("channel", { length: 32 })
      .$type<AutoReplyChannel>()
      .notNull(),
    accountId: varchar("account_id", { length: 128 }).notNull().default(""),
    checkedAt: autoReplyTime("checked_at"),
    checkOk: boolean("check_ok").default(false).notNull(),
    fingerprint: varchar("fingerprint", { length: 64 }),
    errorCode: varchar("error_code", { length: 64 }),
    lastWebhookAt: autoReplyTime("last_webhook_at"),
    lastMobileEchoAt: autoReplyTime("last_mobile_echo_at"),
    lastSentAt: autoReplyTime("last_sent_at"),
  },
  (t) => [primaryKey({ columns: [t.channel, t.accountId] })],
);
