import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

// Run the actual importer with isolated filesystem, database and S3 boundaries.
// Importing the server entry directly also initializes unrelated web integrations.
const source = ts.createSourceFile(
  "index.ts",
  readFileSync(new URL("../_core/index.ts", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest,
  true,
);
const functions = new Set([
  "startSrv100FolderImporter",
  "renameWithFailureSuffix",
]);
const executable = ts.transpileModule(
  source.statements
    .filter(
      (node) =>
        ts.isFunctionDeclaration(node) && functions.has(node.name?.text ?? ""),
    )
    .map((node) => node.getText(source))
    .join("\n"),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.None,
    },
  },
).outputText;

function importerFixture({
  empty = false,
  existing = false,
  failLookup = false,
  loseInsertAck = false,
  suffixCollision = false,
} = {}) {
  const root = "/fixture";
  const name = "1234_OD_Refractive.JPG";
  const files = new Map([
    [
      `${root}/1234/${name}`,
      empty ? Buffer.alloc(0) : Buffer.from("synthetic-image"),
    ],
  ]);
  if (suffixCollision)
    files.set(
      `${root}/1234/1234_OD_Refractive_FAILED.JPG`,
      Buffer.from("retained"),
    );
  const stored = new Set(existing ? [name] : []);
  const upload = vi.fn(async () => {});
  const lookup = vi.fn();
  const insert = vi.fn();
  let databaseUnavailable = failLookup;
  let interval: (() => void) | undefined;
  const context = vm.createContext({
    path: path.posix,
    Buffer,
    Date,
    Set,
    Number,
    String,
    Array,
    Object,
    srv100DbCycleBusy: false,
    getSrv100FolderImportOptions: () => ({
      enabled: true,
      sourceDir: root,
      processedDir: root,
      pollIntervalMs: 10000,
      minFileAgeMs: 1,
      maxFilesPerCycle: 100,
      sourcePrinter: "Pentacam",
    }),
    mkdir: async () => {},
    readdir: async (dir: string) =>
      dir === root
        ? [{ name: "1234", isDirectory: () => true, isFile: () => false }]
        : [...files.keys()]
            .filter((file) => path.posix.dirname(file) === dir)
            .map((file) => ({
              name: path.posix.basename(file),
              isDirectory: () => false,
              isFile: () => true,
            })),
    stat: async () => ({ isFile: () => true, mtimeMs: 0 }),
    readFile: async (file: string) => files.get(file),
    exists: async (file: string) => files.has(file),
    rename: async (from: string, to: string) => {
      if (files.has(to)) throw new Error("Must not overwrite");
      const bytes = files.get(from);
      if (!bytes) throw new Error("Missing source");
      files.set(to, bytes);
      files.delete(from);
    },
    IMPORTABLE_IMAGE_EXT: /\.(jpg|jpeg|png)$/i,
    withDb: async (callback: (connection: unknown) => Promise<unknown>) =>
      callback({
        query: async (sql: string, args: string[] = []) => {
          if (sql.startsWith("SELECT file_name"))
            return [[...stored].map((file_name) => ({ file_name })), []];
          if (sql.startsWith("SELECT id")) {
            lookup();
            if (databaseUnavailable)
              throw Object.assign(new Error("Connection refused"), {
                code: "ECONNREFUSED",
              });
            return [stored.has(args[0]) ? [{ id: 1 }] : [], []];
          }
          if (sql.includes("INSERT INTO")) {
            insert();
            stored.add(args[0]);
            if (loseInsertAck) {
              loseInsertAck = false;
              throw Object.assign(new Error("Acknowledgement lost"), {
                code: "ECONNRESET",
              });
            }
            return [{ insertId: 1 }, []];
          }
          throw new Error("Unexpected database operation");
        },
      }),
    guessMimeType: () => "image/jpeg",
    uploadToS3: upload,
    getSrv100OcrLinkOptions: () => ({ enabled: false }),
    setInterval: (callback: () => void) => {
      interval = callback;
    },
    console: { log: () => {}, warn: () => {}, error: () => {} },
  });
  vm.runInContext(executable, context);
  const settle = async () => {
    for (let i = 0; i < 20; i++)
      await new Promise<void>((resolve) => setImmediate(resolve));
    expect(context.srv100DbCycleBusy).toBe(false);
  };
  return {
    files,
    upload,
    lookup,
    insert,
    stored,
    name,
    async start() {
      await context.startSrv100FolderImporter();
      await settle();
    },
    async next() {
      interval!();
      await settle();
    },
    recoverDatabase() {
      databaseUnavailable = false;
    },
  };
}

describe("Pentacam folder import failure recovery", () => {
  it("keeps the patient code and retries the same file after a database outage", async () => {
    const fixture = importerFixture({ failLookup: true });
    await fixture.start();
    expect([...fixture.files.keys()]).toEqual([
      `/fixture/1234/${fixture.name}`,
    ]);
    expect(fixture.upload).not.toHaveBeenCalled();
    fixture.recoverDatabase();
    await fixture.next();
    expect(fixture.insert).toHaveBeenCalledTimes(1);
    expect(fixture.upload).toHaveBeenCalledTimes(1);
    await fixture.next();
    expect(fixture.upload).toHaveBeenCalledTimes(1);
  });
  it("does not upload or insert images whose canonical names are already imported", async () => {
    const fixture = importerFixture({ existing: true });
    await fixture.start();
    await fixture.next();
    expect(fixture.upload).not.toHaveBeenCalled();
    expect(fixture.insert).not.toHaveBeenCalled();
  });
  it("does not duplicate an insert or upload when a successful database write loses its acknowledgement", async () => {
    const fixture = importerFixture({ loseInsertAck: true });
    await fixture.start();
    await fixture.next();
    expect(fixture.stored.has(fixture.name)).toBe(true);
    expect(fixture.insert).toHaveBeenCalledTimes(1);
    expect(fixture.upload).toHaveBeenCalledTimes(1);
    expect([...fixture.files.keys()]).toEqual([
      `/fixture/1234/${fixture.name}`,
    ]);
  });
  it("marks an empty file at the end of its name and excludes it from retries", async () => {
    const fixture = importerFixture({ empty: true, suffixCollision: true });
    await fixture.start();
    await fixture.next();
    expect([...fixture.files.keys()].sort()).toEqual([
      "/fixture/1234/1234_OD_Refractive_FAILED.JPG",
      "/fixture/1234/1234_OD_Refractive_FAILED_1.JPG",
    ]);
    expect(fixture.upload).not.toHaveBeenCalled();
    expect(fixture.lookup).not.toHaveBeenCalled();
  });
});
