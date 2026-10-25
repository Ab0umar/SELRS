import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import type { AiUsage, AiWorkload } from "./gateway";
const workloadSchema = z.enum([
  "reply.preview",
  "reply.live",
  "marketing.text",
  "marketing.image",
  "medical.synthetic",
  "whatsapp.marketing",
  "medical.documentation",
]);

export const profileSchema = z
  .object({
    workload: workloadSchema,
    provider: z.enum(["gemini", "manus"]),
    model: z.string().min(1).max(100),
    enabled: z.boolean(),
    dailyRequests: z.number().int().min(1).max(1000),
    dailyTokens: z.number().int().min(16384).max(10000000),
    maxConcurrent: z.number().int().min(1).max(5),
  })
  .strict()
  .superRefine((profile, context) => {
    if (
      profile.workload === "medical.documentation" &&
      profile.provider !== "manus"
    )
      context.addIssue({
        code: "custom",
        message:
          "Medical documentation keeps Manus; Gemini requires a separate clinical review",
        path: ["provider"],
      });
    if (
      profile.provider === "gemini"
        ? !/^gemini-[a-z0-9.-]+$/.test(profile.model)
        : !["standard", "lite", "max"].includes(profile.model)
    )
      context.addIssue({
        code: "custom",
        message: "Model does not match provider",
        path: ["model"],
      });
    if (
      ["medical.synthetic", "whatsapp.marketing", "reply.live"].includes(
        profile.workload,
      ) &&
      profile.provider !== "gemini"
    )
      context.addIssue({
        code: "custom",
        message: "This workload uses Gemini only",
        path: ["provider"],
      });
  });
export type AiProfile = z.infer<typeof profileSchema>;
export class AiManagementError extends Error {
  constructor(
    readonly code:
      "disabled" | "budget" | "capacity" | "duplicate" | "unavailable",
  ) {
    super(`AI management: ${code}`);
  }
}
type ConnectionFactory = () => Promise<PoolConnection>;
const usageRowSchema = z.object({
  request_id: z.string().uuid(),
  workload: workloadSchema,
  provider: z.enum(["gemini", "manus"]),
  model: z.string(),
  state: z.enum(["reserved", "running", "completed", "failed", "uncertain"]),
  reserved_tokens: z.coerce.number().nonnegative(),
  input_tokens: z.coerce.number().nonnegative(),
  output_tokens: z.coerce.number().nonnegative(),
  credits: z.coerce.number().nullable(),
  task_id: z.string().nullable(),
  error_code: z.string().nullable(),
  created_ms: z.coerce.number(),
  updated_ms: z.coerce.number(),
});

function budgetDay() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
function profileFromRow(row: RowDataPacket): AiProfile {
  return profileSchema.parse({
    workload: row.workload,
    provider: row.provider,
    model: row.model,
    enabled: Boolean(row.enabled),
    dailyRequests: row.daily_requests,
    dailyTokens: row.daily_tokens,
    maxConcurrent: row.max_concurrent,
  });
}

export class AiManagementStore {
  constructor(private readonly connect: ConnectionFactory) {}
  private async connection<T>(
    work: (connection: PoolConnection) => Promise<T>,
  ): Promise<T> {
    const connection = await this.connect();
    try {
      return await work(connection);
    } finally {
      connection.release();
    }
  }

  listProfiles() {
    return this.connection(async (connection) => {
      const [rows] = await connection.query<RowDataPacket[]>(
        "SELECT * FROM ai_core_profiles ORDER BY workload",
      );
      return rows.map(profileFromRow);
    });
  }

  updateProfile(input: AiProfile) {
    const profile = profileSchema.parse(input);
    return this.connection(async (connection) => {
      await connection.execute(
        "UPDATE ai_core_profiles SET provider=?,model=?,enabled=?,daily_requests=?,daily_tokens=?,max_concurrent=? WHERE workload=?",
        [
          profile.provider,
          profile.model,
          profile.enabled,
          profile.dailyRequests,
          profile.dailyTokens,
          profile.maxConcurrent,
          profile.workload,
        ],
      );
    });
  }

  reserve(
    requestId: string,
    workload: AiWorkload,
    requiredProvider?: AiProfile["provider"],
    tokenReservation = 16384,
  ): Promise<AiProfile> {
    z.string().uuid().parse(requestId);
    return this.connection(async (connection) => {
      await connection.beginTransaction();
      try {
        const [profiles] = await connection.execute<RowDataPacket[]>(
          "SELECT * FROM ai_core_profiles WHERE workload=? FOR UPDATE",
          [workload],
        );
        if (!profiles[0]) throw new AiManagementError("unavailable");
        const profile = profileFromRow(profiles[0]);
        if (requiredProvider && profile.provider !== requiredProvider)
          throw new AiManagementError("unavailable");
        const [known] = await connection.execute<RowDataPacket[]>(
          "SELECT request_id FROM ai_core_usage WHERE request_id=?",
          [requestId],
        );
        if (known.length) throw new AiManagementError("duplicate");
        if (!profile.enabled) throw new AiManagementError("disabled");
        const day = budgetDay();
        const [budget] = await connection.execute<RowDataPacket[]>(
          "SELECT COUNT(*) AS requests,COALESCE(SUM(GREATEST(reserved_tokens,input_tokens+output_tokens)),0) AS tokens FROM ai_core_usage WHERE workload=? AND budget_day=?",
          [workload, day],
        );
        const [pending] = await connection.execute<RowDataPacket[]>(
          "SELECT COUNT(*) AS pending FROM ai_core_usage WHERE workload=? AND state IN ('reserved','running','uncertain')",
          [workload],
        );
        const tokens = profile.provider === "gemini" ? tokenReservation : 0;
        if (
          Number(budget[0].requests) >= profile.dailyRequests ||
          (profile.provider === "gemini" &&
            Number(budget[0].tokens) + tokens > profile.dailyTokens)
        )
          throw new AiManagementError("budget");
        if (Number(pending[0].pending) >= profile.maxConcurrent)
          throw new AiManagementError("capacity");
        const now = Date.now();
        await connection.execute(
          "INSERT INTO ai_core_usage (request_id,workload,provider,model,budget_day,state,reserved_tokens,created_ms,updated_ms) VALUES (?,?,?,?,?,'reserved',?,?,?)",
          [
            requestId,
            workload,
            profile.provider,
            profile.model,
            day,
            tokens,
            now,
            now,
          ],
        );
        await connection.commit();
        return profile;
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    });
  }

  complete(
    requestId: string,
    usage: Pick<AiUsage, "inputTokens" | "outputTokens" | "status">,
    credits: number | null = null,
  ) {
    return this.connection(async (connection) => {
      await connection.execute(
        "UPDATE ai_core_usage SET state=?,reserved_tokens=0,input_tokens=?,output_tokens=?,credits=?,updated_ms=? WHERE request_id=? AND state IN ('reserved','running','uncertain')",
        [
          usage.status === "success" ? "completed" : "failed",
          usage.inputTokens,
          usage.outputTokens,
          credits,
          Date.now(),
          requestId,
        ],
      );
    });
  }

  markUncertain(requestId: string) {
    return this.connection(async (connection) => {
      await connection.execute(
        "UPDATE ai_core_usage SET state='uncertain',error_code='provider_or_persistence_uncertain',updated_ms=? WHERE request_id=? AND state IN ('reserved','running')",
        [Date.now(), requestId],
      );
    });
  }

  attachTask(requestId: string, taskId: string) {
    return this.connection(async (connection) => {
      await connection.execute(
        "UPDATE ai_core_usage SET state='running',task_id=?,updated_ms=? WHERE request_id=? AND state='reserved'",
        [taskId, Date.now(), requestId],
      );
    });
  }

  findRequest(requestId: string) {
    return this.connection(async (connection) => {
      const [rows] = await connection.execute<RowDataPacket[]>(
        "SELECT provider,state,task_id FROM ai_core_usage WHERE request_id=?",
        [requestId],
      );
      if (!rows[0]) return null;
      return z
        .object({
          provider: z.enum(["gemini", "manus"]),
          state: z.enum([
            "reserved",
            "running",
            "completed",
            "failed",
            "uncertain",
          ]),
          task_id: z.string().nullable(),
        })
        .parse(rows[0]);
    });
  }

  listUsage() {
    return this.connection(async (connection) => {
      const [rows] = await connection.query<RowDataPacket[]>(
        "SELECT request_id,workload,provider,model,state,reserved_tokens,input_tokens,output_tokens,credits,task_id,error_code,created_ms,updated_ms FROM ai_core_usage ORDER BY created_ms DESC LIMIT 100",
      );
      return z.array(usageRowSchema).parse(rows);
    });
  }
}
