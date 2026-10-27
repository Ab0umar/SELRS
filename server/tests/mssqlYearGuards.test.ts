import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const serverDir = path.resolve(__dirname, "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (entry === "node_modules" || entry === "tests") return [];
    return statSync(full).isDirectory()
      ? sourceFiles(full)
      : /\.(ts|tsx)$/.test(entry) && !entry.endsWith(".test.ts")
        ? [full]
        : [];
  });
}

describe("MSSQL year is never hard-coded", () => {
  it("has no opNNNN database literal in server code", () => {
    const isComment = (line: string) => /^\s*(\/\/|\*|\/\*)/.test(line);
    const offenders = sourceFiles(serverDir).filter((file) =>
      readFileSync(file, "utf8")
        .split(String.fromCharCode(10))
        .filter((line) => !isComment(line))
        .some((line) =>
          /['"`]op20\d\d[.'"`]|op20\d\d\.(dbo|INFORMATION_SCHEMA)/.test(line),
        ),
    );
    expect(offenders.map((f) => path.relative(serverDir, f))).toEqual([]);
  });
});

describe("MSSQL write entry points check the year first", () => {
  const source = readFileSync(
    path.join(serverDir, "integrations/mssqlPatients.ts"),
    "utf8",
  );
  const writers = [
    "insertPatientToMssql",
    "upsertPatientToMssql",
    "ensurePatientServiceInMssql",
    "editReceiptServiceLine",
    "addServiceReceiptInMssql",
    "addMultiServiceReceiptInMssql",
    "deletePatientFromMssqlByCode",
    "deletePatientServicesFromMssqlByCode",
    "renamePatientCodeInMssql",
    "deleteSinglePatientServiceFromMssqlByCode",
    "backfillPapatSrvNamesInMssql",
  ];

  it.each(writers)("%s calls assertMssqlWritable()", (name) => {
    const start = source.indexOf(`export async function ${name}(`);
    expect(start).toBeGreaterThan(-1);
    const next = source.indexOf("\nexport ", start + 10);
    const body = source.slice(start, next === -1 ? undefined : next);
    expect(body).toContain("assertMssqlWritable();");
  });

  it("runs MySQL imports against the current year", () => {
    for (const name of [
      "syncPatientsFromMssql",
      "syncSinglePatientFromMssql",
      "createOrSyncPatientFromMssql",
    ]) {
      expect(source).toContain(`withCurrentMssqlYear(() => ${name}Impl(...args))`);
    }
  });
});

describe("direct-pool receipt edits in accounting", () => {
  const source = readFileSync(path.join(serverDir, "routers/accounting.ts"), "utf8");
  it.each(["deleteReceipt", "updateReceipt"])("%s checks the year", (name) => {
    const start = source.indexOf(`  ${name}: makeAccWriteProcedure`);
    const body = source.slice(start, start + 600);
    expect(body).toContain("assertMssqlWritable();");
  });
});
