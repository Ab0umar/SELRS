import "dotenv/config";
import * as db from "../server/db";
import { getDb } from "../server/db";
import { userPermissions } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * One-off backfill for pages that gained their own permission entry.
 *
 * `ProtectedRoute` grants a child path by parent-prefix match only while the
 * child has no permission definition of its own. Once we defined these paths in
 * `client/src/lib/page-permissions.ts`, roles holding just the parent lost them.
 * This script re-grants each child wherever the parent is already held, so the
 * new granularity starts from the access people had before.
 *
 * Safe to re-run: it only ever adds entries that are missing.
 *
 * Usage:
 *   pnpm tsx scripts/backfill-inherited-permissions.ts          (dry run)
 *   pnpm tsx scripts/backfill-inherited-permissions.ts --apply
 */

/** child path -> path it used to inherit access from */
const INHERITED_CHILDREN: Record<string, string> = {
  "/salary/basics": "/salary",
  "/salary/settings": "/salary",
  "/salary/shift-staff": "/salary",
  "/salary/shift-payroll": "/salary",
  "/salary/absent-report": "/salary",
  "/salary/current-data": "/salary",
  "/workflow-hub/prototype": "/workflow-hub",
  "/kf/bookings": "/kf",
  // `/today` only redirects to `/bookings`, which had no definition until now —
  // anyone granted `/today` was meant to reach the page behind it.
  "/bookings": "/today",
};

const APPLY = process.argv.includes("--apply");

/**
 * Returns the entries to add so `child` is held at the same access level the
 * parent is held at (`id`, `id:r` and `id:rw` are stored independently).
 */
function missingChildEntries(permissions: string[], child: string): string[] {
  const held = new Set(permissions);
  const parent = INHERITED_CHILDREN[child];
  const additions: string[] = [];
  for (const suffix of ["", ":r", ":rw"]) {
    if (held.has(`${parent}${suffix}`) && !held.has(`${child}${suffix}`)) {
      additions.push(`${child}${suffix}`);
    }
  }
  return additions;
}

async function backfillRoles() {
  const teamPermissions = await db.getTeamPermissions();
  const updates: Record<string, string[]> = {};

  for (const [role, permissions] of Object.entries(teamPermissions)) {
    const list = Array.isArray(permissions) ? permissions : [];
    const additions = Object.keys(INHERITED_CHILDREN).flatMap((child) =>
      missingChildEntries(list, child),
    );
    if (additions.length === 0) continue;
    updates[role] = db.normalizePermissionList([...list, ...additions]);
    console.log(`  role ${role}: +${additions.length} → ${additions.join(", ")}`);
  }

  if (Object.keys(updates).length === 0) {
    console.log("  no role changes needed");
    return;
  }
  if (APPLY) await db.setTeamPermissions(updates as any);
}

async function backfillUsers() {
  const drizzleDb = await getDb();
  if (!drizzleDb) throw new Error("Database not available");

  const rows = await drizzleDb.select().from(userPermissions);
  const byUser = new Map<number, string[]>();
  for (const row of rows) {
    const userId = Number((row as any).userId);
    const pageId = String((row as any).pageId ?? "").trim();
    if (!userId || !pageId) continue;
    byUser.set(userId, [...(byUser.get(userId) ?? []), pageId]);
  }

  let touchedUsers = 0;
  let addedRows = 0;

  for (const [userId, permissions] of byUser) {
    const additions = Object.keys(INHERITED_CHILDREN).flatMap((child) =>
      missingChildEntries(permissions, child),
    );
    if (additions.length === 0) continue;
    touchedUsers += 1;
    addedRows += additions.length;
    console.log(`  user ${userId}: +${additions.length} → ${additions.join(", ")}`);
    if (!APPLY) continue;
    for (const pageId of additions) {
      await drizzleDb
        .insert(userPermissions)
        .values({ userId, pageId })
        .onDuplicateKeyUpdate({ set: { pageId } });
    }
  }

  if (touchedUsers === 0) console.log("  no user overrides need changes");
  else console.log(`  ${touchedUsers} user(s), ${addedRows} entr(ies)`);
}

async function main() {
  console.log(APPLY ? "Applying backfill…" : "Dry run — pass --apply to write.");
  console.log("\nRole permissions:");
  await backfillRoles();
  console.log("\nPer-user overrides:");
  await backfillUsers();
  console.log(APPLY ? "\nDone." : "\nDry run complete — nothing was written.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Backfill failed:", error);
    process.exit(1);
  });
