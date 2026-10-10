import "dotenv/config";
import mysql, { type Connection, type RowDataPacket } from "mysql2/promise";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  planTestCatalogMerges,
  remapTemplateTestIds,
  type MergeableTest,
} from "../shared/test-catalog-duplicates";

const linkedColumns = [
  { table: "testfavorites", column: "testId" },
  { table: "testrequestitems", column: "testId" },
  { table: "kf_test_request_items", column: "test_id" },
];

async function addReferenceColumns(connection: Connection) {
  const [columns] = await connection.query<RowDataPacket[]>(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tests'",
  );
  const names = new Set(columns.map((column) => String(column.COLUMN_NAME)));
  const additions = [
    !names.has("referenceRanges") ? "ADD COLUMN referenceRanges JSON NULL" : "",
    !names.has("noNormalRange")
      ? "ADD COLUMN noNormalRange BOOLEAN NOT NULL DEFAULT FALSE"
      : "",
  ].filter(Boolean);
  if (additions.length)
    await connection.query(`ALTER TABLE tests ${additions.join(", ")}`);
}

async function verifyLinkedColumns(connection: Connection) {
  const [columns] = await connection.query<RowDataPacket[]>(
    "SELECT TABLE_NAME,COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND COLUMN_NAME IN ('testId','test_id')",
  );
  const expected = new Set(
    linkedColumns.map(({ table, column }) =>
      `${table}:${column}`.toLowerCase(),
    ),
  );
  if (
    columns.length !== expected.size ||
    columns.some(
      (column) =>
        !expected.has(
          `${column.TABLE_NAME}:${column.COLUMN_NAME}`.toLowerCase(),
        ),
    )
  )
    throw new Error("Unexpected test references; review before merging");
  const [engines] = await connection.query<RowDataPacket[]>(
    "SELECT TABLE_NAME,ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND LOWER(TABLE_NAME) IN ('tests','testfavorites','testrequestitems','kf_test_request_items','systemsettings')",
  );
  if (
    engines.length !== 5 ||
    engines.some((table) => table.ENGINE !== "InnoDB")
  )
    throw new Error("Catalog merge requires transactional tables");
}

async function writeCatalogBackup(snapshot: unknown) {
  const directory = resolve("output/test-catalog-backups");
  await mkdir(directory, { recursive: true });
  const backup = resolve(
    directory,
    `${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  await writeFile(backup, JSON.stringify(snapshot, null, 2), {
    flag: "wx",
    encoding: "utf8",
  });
  return backup;
}

async function readLinkedIds(connection: Connection, removeIds: number[]) {
  const snapshots: { table: string; column: string; rows: RowDataPacket[] }[] =
    [];
  if (!removeIds.length) return snapshots;
  for (const link of linkedColumns) {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT id, \`${link.column}\` FROM \`${link.table}\` WHERE \`${link.column}\` IN (?) FOR UPDATE`,
      [removeIds],
    );
    snapshots.push({ ...link, rows });
  }
  return snapshots;
}

async function applyMerges(
  connection: Connection,
  plan: ReturnType<typeof planTestCatalogMerges>,
) {
  for (const merge of plan.merges) {
    const { type, category, description, normalRange, unit, referenceRanges } =
      merge.updates;
    await connection.execute(
      "UPDATE tests SET type=?,category=?,description=?,normalRange=?,unit=?,referenceRanges=? WHERE id=?",
      [
        type,
        category,
        description,
        normalRange,
        unit,
        referenceRanges == null ? null : JSON.stringify(referenceRanges),
        merge.keepId,
      ],
    );
    for (const link of linkedColumns) {
      await connection.query(
        `UPDATE \`${link.table}\` SET \`${link.column}\`=? WHERE \`${link.column}\` IN (?)`,
        [merge.keepId, merge.removeIds],
      );
    }
    const [deleted] = await connection.query<mysql.ResultSetHeader>(
      "DELETE FROM tests WHERE id IN (?)",
      [merge.removeIds],
    );
    if (deleted.affectedRows !== merge.removeIds.length)
      throw new Error("Catalog merge delete count mismatch");
  }
}

async function mergeCatalog(connection: Connection, apply: boolean) {
  await connection.beginTransaction();
  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      "SELECT * FROM tests ORDER BY id FOR UPDATE",
    );
    const plan = planTestCatalogMerges(rows as MergeableTest[]);
    console.log(
      JSON.stringify(
        {
          mode: apply ? "apply" : "preview",
          scanned: rows.length,
          merges: plan.merges.map(({ keepId, removeIds, name }) => ({
            keepId,
            removeIds,
            name,
          })),
          conflicts: plan.conflicts,
        },
        null,
        2,
      ),
    );
    if (!apply) {
      await connection.rollback();
      return;
    }
    const removeIds = plan.merges.flatMap((merge) => merge.removeIds);
    const links = await readLinkedIds(connection, removeIds);
    const [settings] = await connection.query<RowDataPacket[]>(
      "SELECT id,value FROM systemsettings WHERE `key`='ready_template_overrides' FOR UPDATE",
    );
    const mapping = new Map(
      plan.merges.flatMap((merge) =>
        merge.removeIds.map((id) => [id, merge.keepId] as const),
      ),
    );
    const updatedSettings = settings.map((setting) => ({
      id: setting.id,
      value: JSON.stringify(
        remapTemplateTestIds(
          JSON.parse(String(setting.value || "{}")),
          mapping,
        ),
      ),
    }));
    const backup = await writeCatalogBackup({
      catalog: rows,
      links,
      settings,
      plan,
    });
    await applyMerges(connection, plan);
    for (const setting of updatedSettings)
      await connection.execute("UPDATE systemsettings SET value=? WHERE id=?", [
        setting.value,
        setting.id,
      ]);
    await connection.commit();
    console.log(
      JSON.stringify({
        removed: removeIds.length,
        retained: rows.length - removeIds.length,
        backup,
      }),
    );
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing");
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    await verifyLinkedColumns(connection);
    if (process.argv.includes("--apply")) {
      const [catalog] = await connection.query(
        "SELECT * FROM tests ORDER BY id",
      );
      await writeCatalogBackup({ catalog, purpose: "before-schema-change" });
      await addReferenceColumns(connection);
    }
    await mergeCatalog(connection, process.argv.includes("--apply"));
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message.replace(/mysql:\/\/[^\s]+/g, "<REDACTED>")
      : "Catalog maintenance failed",
  );
  process.exitCode = 1;
});
