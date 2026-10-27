import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getTestDb } from "./setup";

const migrationPath = path.resolve(
  process.cwd(),
  "drizzle/0109_core_lookup_indexes.sql",
);
const migration = readFileSync(migrationPath, "utf8");
const schema = readFileSync(path.resolve(process.cwd(), "drizzle/schema.ts"), "utf8");

const migrationIndexes = [
  ...migration.matchAll(/ADD INDEX `(\w+)` \(([^)]*)\)/g),
].map((m) => ({
  name: m[1],
  columns: m[2].split(",").map((c) => c.trim().replace(/`/g, "")),
}));

describe("core lookup indexes (migration 0109)", () => {
  it("separates statements with the marker the runner expects", () => {
    const statements = migration.split("--> statement-breakpoint");
    expect(statements).toHaveLength(6);
    // One index per statement: the runner skips a whole statement on ER_DUP_KEYNAME.
    for (const statement of statements) {
      expect(statement.match(/ALTER TABLE/g)).toHaveLength(1);
      expect(statement.match(/ADD INDEX/g)).toHaveLength(1);
    }
  });

  it("is mirrored by the drizzle schema", () => {
    expect(migrationIndexes).toHaveLength(6);
    for (const { name } of migrationIndexes) {
      expect(schema).toContain(`index("${name}")`);
    }
  });

  it("creates every index on the test database, and can be applied twice", async () => {
    const db = await getTestDb();
    for (let run = 0; run < 2; run++) {
      for (const statement of migration.split("--> statement-breakpoint")) {
        try {
          await db.execute(statement.trim() as any);
        } catch (error: any) {
          const code = error?.code ?? error?.cause?.code;
          if (code !== "ER_DUP_KEYNAME") throw error;
        }
      }
    }
    const [rows]: any = await db.execute(
      `SELECT index_name AS name, GROUP_CONCAT(column_name ORDER BY seq_in_index) AS cols
         FROM information_schema.statistics
        WHERE table_schema = DATABASE()
        GROUP BY table_name, index_name` as any,
    );
    const found = new Map<string, string>(
      rows.map((r: any) => [r.name, r.cols]),
    );
    for (const { name, columns } of migrationIndexes) {
      expect(found.get(name), name).toBe(columns.join(","));
    }
  });
});
