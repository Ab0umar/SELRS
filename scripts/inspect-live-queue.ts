import "dotenv/config";
import * as db from "../server/db";

const dateIso = process.argv[2] ?? "2026-08-19";
const statuses = ["checkedIn", "next", "clinic1", "clinic2", "pentacam", "treated"] as const;
const rows = (await Promise.all(
  statuses.map((queueStatus) => db.getTodayVisitsByQueueStatus(dateIso, queueStatus)),
)).flat() as Array<Record<string, unknown>>;

const normalize = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();
const targets = rows.filter((row) =>
  ["clinic1", "clinic2", "pentacam"].includes(String(row.queueStatus)),
);

const output = [];
for (const row of targets) {
  const visitId = Number(row.id ?? 0);
  output.push({
    name: normalize(row.patientFullName),
    patientId: Number(row.patientId ?? 0),
    visitId,
    queueStatus: row.queueStatus,
    visitType: row.visitType,
    hasQueueCompletionData: row.hasQueueCompletionData,
    liveEligibility: visitId > 0 ? await db.visitHasQueueCompletionData(visitId) : null,
  });
}
console.log(JSON.stringify({ dateIso, rows: output }, null, 2));
