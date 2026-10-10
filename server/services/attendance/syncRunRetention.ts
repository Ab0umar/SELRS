import { sql } from "drizzle-orm";
import { getDb } from "../../db";

export async function pruneAttendanceSyncRuns(): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Keep each device's latest successful checkpoint even when it is older than
  // the history window; deleting it would make the next poll reimport history.
  await db.execute(sql`
    DELETE history FROM attendance_sync_runs history
    LEFT JOIN (
      SELECT MAX(id) AS checkpoint_id FROM attendance_sync_runs
      WHERE status IN ('ok', 'partial') AND high_water_mark IS NOT NULL
      GROUP BY device_id, source
    ) checkpoints ON checkpoints.checkpoint_id = history.id
    WHERE history.started_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
      AND checkpoints.checkpoint_id IS NULL
  `);
}
