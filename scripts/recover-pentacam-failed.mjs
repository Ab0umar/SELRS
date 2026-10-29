import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const workspace = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const root = await fs.realpath(path.join(workspace, "Pentacam", "Jpgs"));
const apply = process.argv.includes("--apply");
const files = [];
async function scan(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await scan(full);
    else if (entry.isFile() && /^FAILED_/i.test(entry.name)) files.push(full);
  }
}
await scan(root);
const connection = await mysql.createConnection(process.env.DATABASE_URL);
let rows;
try {
  [rows] = await connection.query("SELECT id, file_name FROM srv100_uploads");
} finally {
  await connection.end();
}
const known = new Set(
  rows.map((row) => String(row.file_name ?? "").toLowerCase()),
);
const targets = new Set();
const operations = [];
for (const source of files.sort()) {
  const targetName = path.basename(source).replace(/^(?:FAILED_)+/i, "");
  const target = path.join(path.dirname(source), targetName);
  if (
    !source.startsWith(root + path.sep) ||
    path.dirname(source) !== path.dirname(target) ||
    !targetName
  )
    throw new Error("Recovery path escaped the Pentacam image directory");
  if (targets.has(target.toLowerCase()))
    throw new Error("Two source files have the same recovery target");
  targets.add(target.toLowerCase());
  const targetInfo = await fs.lstat(target).catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (targetInfo)
    throw new Error("Recovery target exists; no files have been changed");
  const original = await fs.stat(source);
  operations.push({
    source,
    target,
    size: original.size,
    mtimeMs: original.mtimeMs,
    alreadyImported: known.has(targetName.toLowerCase()),
  });
}
const report = {
  mode: apply ? "apply" : "preview",
  files: operations.length,
  alreadyImported: operations.filter((op) => op.alreadyImported).length,
  missingFromDatabase: operations.filter((op) => !op.alreadyImported).length,
  renamed: 0,
};
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const reportDir = path.join(workspace, "outputs", "pentacam-recovery", stamp);
await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(
  path.join(reportDir, "plan.json"),
  JSON.stringify({ ...report, operations }, null, 2),
  { flag: "wx" },
);
if (apply) {
  const journal = await fs.open(path.join(reportDir, "applied.jsonl"), "wx");
  try {
    for (const operation of operations) {
      const current = await fs.stat(operation.source);
      if (
        current.size !== operation.size ||
        current.mtimeMs !== operation.mtimeMs
      )
        throw new Error(
          "A source file changed after preview; stopped without overwriting it",
        );
      // Hard-link creation fails atomically on an existing target, unlike rename on Windows.
      await fs.link(operation.source, operation.target);
      await journal.write(
        JSON.stringify({ ...operation, stage: "linked" }) + "\n",
      );
      await journal.sync();
      const target = await fs.stat(operation.target);
      if (target.ino !== current.ino || target.dev !== current.dev)
        throw new Error("Recovery target identity mismatch; source retained");
      await fs.unlink(operation.source);
      await journal.write(
        JSON.stringify({ ...operation, stage: "renamed" }) + "\n",
      );
      report.renamed++;
    }
  } finally {
    await journal.close();
    await fs.writeFile(
      path.join(reportDir, "summary.json"),
      JSON.stringify(report, null, 2),
    );
  }
}
console.log(JSON.stringify({ ...report, manifestDirectory: reportDir }));
