import "dotenv/config";
import mysql from "mysql2/promise";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  LAB_REFERENCE_CATALOG,
  planLabReferenceUpdate,
  type LabCatalogRow,
} from "../shared/lab-reference-catalog";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing");
  const apply = process.argv.includes("--apply");
  for (const entry of LAB_REFERENCE_CATALOG) {
    if (
      entry.normalRange.length > 255 ||
      entry.unit.length > 64 ||
      !entry.sources.length
    )
      throw new Error(`Invalid reference: ${entry.name}`);
  }
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    connectTimeout: 10000,
  });
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      "SELECT id,name,type,normalRange,unit,description FROM tests WHERE type = 'lab' ORDER BY id FOR UPDATE",
    );
    const rows = result as LabCatalogRow[];
    const updates = rows.flatMap((row) => {
      const update = planLabReferenceUpdate(row);
      return update ? [update] : [];
    });
    console.log(
      JSON.stringify(
        {
          mode: apply ? "apply" : "preview",
          scanned: rows.length,
          updates: updates.map(({ id, name, normalRange, unit }) => ({
            id,
            name,
            normalRange,
            unit,
          })),
          skipped: rows
            .filter((row) => !updates.some((update) => update.id === row.id))
            .map(({ id, name }) => ({ id, name })),
        },
        null,
        2,
      ),
    );
    if (!apply) {
      await connection.rollback();
      return;
    }
    const directory = resolve("outputs/lab-reference-catalog");
    await mkdir(directory, { recursive: true });
    const backup = resolve(
      directory,
      `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
    );
    await writeFile(
      backup,
      JSON.stringify(
        {
          before: rows.filter((row) =>
            updates.some((update) => update.id === row.id),
          ),
          after: updates,
        },
        null,
        2,
      ),
      { encoding: "utf8", flag: "wx" },
    );
    for (const update of updates) {
      const [changed] = await connection.execute<mysql.ResultSetHeader>(
        "UPDATE tests SET normalRange=?,unit=?,description=? WHERE id=? AND name=? AND type='lab'",
        [
          update.normalRange,
          update.unit,
          update.description,
          update.id,
          update.name,
        ],
      );
      if (changed.affectedRows !== 1)
        throw new Error(`Catalog row changed: ${update.id}`);
    }
    await connection.commit();
    console.log(JSON.stringify({ updated: updates.length, backup }));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}
main().catch((error) => {
  console.error(
    JSON.stringify({
      error:
        error instanceof Error
          ? error.message.replace(/mysql:\/\/[^\s]+/g, "<REDACTED>")
          : "Failed",
    }),
  );
  process.exitCode = 1;
});
