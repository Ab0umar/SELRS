import { execSync } from "child_process";
import path from "path";

const LABEL = "[acc-sync]";
const INTERVAL_MS = 30 * 60 * 1000; // every 30 minutes

function getSyncScriptPath(): string {
  return path.resolve(process.cwd(), "server", "scripts", "sync-access-db.ts");
}

function runSync(): void {
  const script = getSyncScriptPath();
  try {
    const output = execSync(`npx tsx "${script}"`, {
      encoding: "utf8",
      timeout: 120_000,
    });
    console.log(`${LABEL} Auto-sync completed`, output.slice(-200).trim());
  } catch (e: any) {
    const log = [e.stdout, e.stderr].filter(Boolean).join("\n").slice(0, 500);
    console.error(`${LABEL} Auto-sync failed:`, log || e.message);
  }
}

export function startAccSyncScheduler(): void {
  setInterval(() => {
    void runSync();
  }, INTERVAL_MS);
  console.log(`${LABEL} Scheduler started — runs every 30 minutes`);
}
