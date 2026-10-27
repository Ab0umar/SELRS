import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as db from "../db";
import { appRouter } from "../routers";
import { makeCallerAs } from "./helpers/auth";
import { cleanupTables, getTestDb } from "./setup";

// 1x1 PNG
// Never touch the real bucket from a test: force the blob-in-database fallback.
vi.mock("../_core/s3", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../_core/s3")>()),
  uploadToS3: vi.fn().mockRejectedValue(new Error("S3 disabled in tests")),
}));

const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAHcDZxgAAAABJRU5ErkJggg==";

async function reset() {
  await cleanupTables(await getTestDb(), "srv100_uploads");
}

describe.sequential("KF exam images never appear on a main-system patient with the same id", () => {
  beforeEach(reset);
  afterEach(reset);

  async function seed(sharedId: number) {
    const admin = appRouter.createCaller(makeCallerAs("admin"));
    const kf = await admin.kf.uploadExamImage({
      kfPatientId: sharedId,
      fileName: "kf-exam.png",
      mimeType: "image/png",
      fileDataBase64: PNG_BASE64,
    });
    const main = await admin.medical.uploadDiagnosisImage({
      patientId: sharedId,
      fileName: "main-diagnosis.png",
      mimeType: "image/png",
      fileDataBase64: PNG_BASE64,
    });
    return { admin, kf, main };
  }

  it("the patient portal lists only the main system's images for that id", async () => {
    const { kf, main } = await seed(37);
    const caller = appRouter.createCaller({
      ...makeCallerAs("reception"),
      user: null,
      patientSession: { patientId: 37, phone: "01000000000", token: "t" },
    });
    const scans = await caller.patientPortal.getMyScans();
    expect(scans.map((s) => s.id)).toEqual([main.id]);
    expect(scans.map((s) => s.id)).not.toContain(kf.id);
  });

  it("db readers used by the pentacam screens skip KF rows", async () => {
    const { kf, main } = await seed(38);
    const byPatient = await db.getSrv100UploadsByPatient(38, 50);
    expect(byPatient.map((r) => Number(r.id))).toEqual([main.id]);
    const everything = await db.getAllSrv100Uploads(100);
    expect(everything.map((r: any) => Number(r.id))).toContain(main.id);
    expect(everything.map((r: any) => Number(r.id))).not.toContain(kf.id);
  });

  it("KF's own listing still finds its images", async () => {
    const { admin, kf, main } = await seed(39);
    const images = await admin.kf.listExamImages({ kfPatientId: 39 });
    expect(images.map((i: any) => i.id)).toEqual([kf.id]);
    expect(images.map((i: any) => i.id)).not.toContain(main.id);
  });
});

describe("every reader of main-system patient images excludes KF rows", () => {
  const serverDir = path.resolve(__dirname, "..");
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
      const full = path.join(dir, entry);
      if (entry === "node_modules" || entry === "tests") return [];
      return statSync(full).isDirectory()
        ? files(full)
        : /\.ts$/.test(entry)
          ? [full]
          : [];
    });

  it("each query that selects srv100_uploads by patient_id also filters on source_printer", () => {
    const offenders: string[] = [];
    for (const file of files(serverDir)) {
      const lines = readFileSync(file, "utf8").split(String.fromCharCode(10));
      lines.forEach((line, index) => {
        if (!/FROM srv100_uploads/i.test(line)) return;
        const statement = lines.slice(index, index + 8).join(" ");
        const end = statement.search(/(ORDER BY|LIMIT|`\s*[,)])/i);
        const body = end === -1 ? statement : statement.slice(0, end);
        const selectsByPatient = /patient_id\s*=\s*(\?|\$\{)/.test(body);
        if (selectsByPatient && !/notKfUploadSql|source_printer/.test(body)) {
          offenders.push(`${path.relative(serverDir, file)}:${index + 1}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it("the file endpoint refuses patients and external doctors for KF images", () => {
    const source = readFileSync(path.join(serverDir, "_core/index.ts"), "utf8");
    expect(source).toContain("if (sourcePrinter === KF_EXAM_SOURCE) return canReadKfUpload(req);");
    expect(source).toContain("canReadSrv100Upload(req, row.patient_id, row.source_printer)");
  });
});
