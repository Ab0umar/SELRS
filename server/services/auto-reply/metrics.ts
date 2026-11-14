import { and, eq, gte, inArray } from "drizzle-orm";
import {
  autoReplyConversations as conversations,
  autoReplyJobs as jobs,
  autoReplyMessages as messages,
} from "../../../drizzle/autoReply";
import { getAutoReplyDb, readSettings } from "./store";

export type MetricsJob = {
  channel: string;
  kind: string;
  state: string;
  handoff: boolean;
  inputTokens: number;
  outputTokens: number;
  createdAt: Date;
  updatedAt: Date;
  inboundAt: Date | null;
};

const cairoDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Cairo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function summarizeMetrics(
  rows: MetricsJob[],
  handoffReasons: (string | null)[],
) {
  const autoJobs = rows.filter(
    (row) => row.kind === "auto" && row.state !== "cancelled",
  );
  const sent = rows.filter((row) => row.state === "sent");
  const reasons = new Map<string, number>();
  for (const reason of handoffReasons)
    reasons.set(reason ?? "needs_review", (reasons.get(reason ?? "needs_review") ?? 0) + 1);
  const tokens = new Map<string, { day: string; channel: string; tokens: number }>();
  for (const row of rows) {
    const total = row.inputTokens + row.outputTokens;
    if (!total) continue;
    const day = cairoDay.format(row.createdAt);
    const key = `${day}:${row.channel}`;
    const entry = tokens.get(key) ?? { day, channel: row.channel, tokens: 0 };
    entry.tokens += total;
    tokens.set(key, entry);
  }
  return {
    sentAuto: sent.filter((row) => row.kind === "auto").length,
    sentStaff: sent.filter((row) => row.kind === "manual").length,
    autoJobs: autoJobs.length,
    handoffs: autoJobs.filter((row) => row.handoff).length,
    handoffReasons: [...reasons.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
    // Seconds from the customer's message to Meta accepting the automatic reply.
    medianReplySeconds: median(
      sent
        .filter((row) => row.kind === "auto" && row.inboundAt)
        .map(
          (row) =>
            (row.updatedAt.getTime() - row.inboundAt!.getTime()) / 1000,
        )
        .filter((seconds) => seconds >= 0),
    ),
    tokensByDay: [...tokens.values()].sort(
      (a, b) => b.day.localeCompare(a.day) || a.channel.localeCompare(b.channel),
    ),
  };
}

// Read-only. History is bounded by the retention setting, which purges older rows.
export async function autoReplyMetrics(input: {
  days: number;
  channels: string[];
  accountId?: string;
}) {
  const db = await getAutoReplyDb();
  const since = new Date(Date.now() - input.days * 86400_000);
  const scope = and(
    inArray(conversations.channel, input.channels as never[]),
    input.accountId ? eq(conversations.accountId, input.accountId) : undefined,
  );
  const rows = await db
    .select({
      channel: conversations.channel,
      kind: jobs.kind,
      state: jobs.state,
      handoff: jobs.handoff,
      inputTokens: jobs.inputTokens,
      outputTokens: jobs.outputTokens,
      createdAt: jobs.createdAt,
      updatedAt: jobs.updatedAt,
      inboundAt: messages.createdAt,
    })
    .from(jobs)
    .innerJoin(conversations, eq(conversations.id, jobs.conversationId))
    .leftJoin(messages, eq(messages.id, jobs.inboundId))
    .where(and(scope, gte(jobs.createdAt, since)))
    .limit(20000);
  const handedOff = await db
    .select({ reason: conversations.humanReason })
    .from(conversations)
    .where(
      and(
        scope,
        eq(conversations.status, "human"),
        gte(conversations.lastActivityAt, since),
      ),
    )
    .limit(20000);
  return {
    days: input.days,
    retentionDays: (await readSettings()).retentionDays,
    ...summarizeMetrics(
      rows,
      handedOff.map((row) => row.reason),
    ),
  };
}
