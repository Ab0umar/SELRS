/**
 * Shift already-stored ADMS punches whose device clock was wrong for a while.
 * Dry run by default; pass --apply to write.
 *
 *   npx tsx scripts/fix-adms-clock-window.ts --sn GED7254500027 \
 *     --from "2026-10-28 00:00:00" --to "2026-10-28 12:00:00" --minutes -60 [--apply]
 *
 * Set the same window in ZK_ADMS_TIME_FIXES so a device re-upload of its old log
 * lands on the corrected time instead of recreating the wrong rows.
 */
import "dotenv/config";
import { and, eq, gte, lt } from "drizzle-orm";
import { getDb } from "../server/db";
import { attendancePunches } from "../drizzle/schema";

function arg(name: string): string {
  const i = process.argv.indexOf(`--${name}`);
  const v = i >= 0 ? process.argv[i + 1] : undefined;
  if (!v) throw new Error(`missing --${name}`);
  return v;
}

(async () => {
  const sn = arg("sn");
  const from = new Date(arg("from").replace(" ", "T"));
  const to = new Date(arg("to").replace(" ", "T"));
  const minutes = Number(arg("minutes"));
  const apply = process.argv.includes("--apply");
  if (isNaN(from.getTime()) || isNaN(to.getTime()) || !Number.isFinite(minutes)) throw new Error("bad arguments");

  const db: any = await getDb();
  if (!db) throw new Error("db unavailable");
  const rows = await db
    .select()
    .from(attendancePunches)
    .where(and(eq(attendancePunches.deviceId, sn), gte(attendancePunches.punchAt, from), lt(attendancePunches.punchAt, to)));

  console.log(`${apply ? "APPLY" : "DRY RUN"}: ${rows.length} punches of ${sn} in [${arg("from")}, ${arg("to")}) shift ${minutes} min`);
  for (const r of rows) {
    const next = new Date(r.punchAt.getTime() + minutes * 60_000);
    console.log(`  #${r.id} emp ${r.empCd}: ${r.punchAt.toString().slice(4, 24)} -> ${next.toString().slice(4, 24)}`);
    if (!apply) continue;
    await db
      .update(attendancePunches)
      .set({ punchAt: next, sourceRowId: `${r.empCd}_${next.getTime()}` })
      .where(eq(attendancePunches.id, r.id));
  }
  process.exit(0);
})().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
