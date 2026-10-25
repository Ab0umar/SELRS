import {
  mysqlTable,
  varchar,
  mysqlEnum,
  boolean,
  int,
  bigint,
  double,
  index,
  char,
  text,
  timestamp,
} from "drizzle-orm/mysql-core";

export const aiMarketingJobs = mysqlTable("ai_marketing_jobs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  pageRole: mysqlEnum("page_role", ["center", "doctor"]).notNull(),
  postDay: mysqlEnum("post_day", ["saturday", "tuesday", "thursday"]).notNull(),
  topic: varchar("topic", { length: 255 }).notNull(),
  state: mysqlEnum("state", ["running", "completed", "uncertain"])
    .default("running")
    .notNull(),
  generatedJson: text("generated_json"),
  imageArtifact: varchar("image_artifact", { length: 1000 }),
  imageUsageId: varchar("image_usage_id", { length: 36 }),
  referenceIds: text("reference_ids"),
  executionId: varchar("execution_id", { length: 36 }),
  postId: int("post_id"),
  errorCode: varchar("error_code", { length: 80 }),
  kind: mysqlEnum("kind", ["post", "image"]).default("post").notNull(),
  sourcePostId: int("source_post_id"),
  postSnapshot: char("post_snapshot", { length: 64 }),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export const aiMarketingRecoveries = mysqlTable(
  "ai_marketing_recoveries",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    jobId: varchar("job_id", { length: 36 }).notNull(),
    action: mysqlEnum("action", ["attach", "image_retry", "blocked"]).notNull(),
    createdBy: int("created_by").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({ job: index("ai_marketing_recovery_job").on(table.jobId) }),
);
export const aiWhatsAppDrafts = mysqlTable("ai_whatsapp_drafts", {
  requestId: varchar("request_id", { length: 36 }).primaryKey(),
  inputHash: char("input_hash", { length: 64 }).notNull(),
  createdBy: int("created_by").notNull(),
  variantsJson: text("variants_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const marketingTopicPublications = mysqlTable(
  "marketing_topic_publications",
  {
    topicKey: char("topic_key", { length: 64 }).primaryKey(),
    normalizedTopic: text("normalized_topic").notNull(),
    postId: int("post_id").notNull(),
    state: mysqlEnum("state", ["publishing", "published"]).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
);

export const aiMarketingScheduler = mysqlTable("ai_marketing_scheduler", {
  pageRole: mysqlEnum("page_role", ["center", "doctor"]).primaryKey(),
  provider: mysqlEnum("provider", ["manus", "central"])
    .default("manus")
    .notNull(),
});
export const aiMarketingScheduleClaims = mysqlTable(
  "ai_marketing_schedule_claims",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    provider: mysqlEnum("provider", ["manus", "central"]).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
);

export const aiCoreProfiles = mysqlTable("ai_core_profiles", {
  workload: varchar("workload", { length: 40 }).primaryKey(),
  provider: mysqlEnum("provider", ["gemini", "manus"]).notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  enabled: boolean("enabled").default(false).notNull(),
  dailyRequests: int("daily_requests", { unsigned: true })
    .default(20)
    .notNull(),
  dailyTokens: int("daily_tokens", { unsigned: true })
    .default(100000)
    .notNull(),
  maxConcurrent: int("max_concurrent", { unsigned: true }).default(2).notNull(),
});

export const aiCoreUsage = mysqlTable(
  "ai_core_usage",
  {
    requestId: varchar("request_id", { length: 36 }).primaryKey(),
    workload: varchar("workload", { length: 40 }).notNull(),
    provider: mysqlEnum("provider", ["gemini", "manus"]).notNull(),
    model: varchar("model", { length: 100 }).notNull(),
    budgetDay: char("budget_day", { length: 10 }).notNull(),
    state: mysqlEnum("state", [
      "reserved",
      "running",
      "completed",
      "failed",
      "uncertain",
    ]).notNull(),
    reservedTokens: int("reserved_tokens", { unsigned: true }).notNull(),
    inputTokens: int("input_tokens", { unsigned: true }).default(0).notNull(),
    outputTokens: int("output_tokens", { unsigned: true }).default(0).notNull(),
    credits: double("credits"),
    taskId: varchar("task_id", { length: 100 }),
    errorCode: varchar("error_code", { length: 60 }),
    createdMs: bigint("created_ms", { mode: "number" }).notNull(),
    updatedMs: bigint("updated_ms", { mode: "number" }).notNull(),
  },
  (table) => ({
    budget: index("ai_core_usage_budget").on(table.workload, table.budgetDay),
    pending: index("ai_core_usage_pending").on(table.state, table.updatedMs),
  }),
);
