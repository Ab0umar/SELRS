import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rows: [] as Array<Record<string, unknown>>,
  execute: vi.fn(),
}));
vi.mock("../db", () => ({
  getDbConnection: async () => ({
    execute: mocks.execute,
    release: () => undefined,
  }),
}));
vi.mock("../services/marketing/manusClient", () => ({
  createManusTask: vi.fn(),
  readManusTask: vi.fn(),
  downloadManusFile: vi.fn(),
  ManusRequestError: class extends Error {},
}));
import { createManusTask } from "../services/marketing/manusClient";
import {
  latestMedicalJob,
  maintainMedicalJobs,
  readMedicalProposals,
  startMedicalProposals,
} from "../services/ai/medical";

const input = {
  kind: "field" as const,
  label: "Complaints",
  transcript: "صداع من أسبوعين",
};
const stored = (extra: Record<string, unknown>) => ({
  provider: "gemini",
  engine: "current",
  model: "gemini-test",
  task_id: null,
  input_json: JSON.stringify(input),
  result_json: null,
  failure_message: null,
  created_ms: Date.now() - 600_000,
  ...extra,
});

beforeEach(() => {
  mocks.execute.mockReset();
  mocks.execute.mockImplementation(async (sql: string, params: unknown[]) => {
    if (!sql.startsWith("SELECT")) return [[], []];
    const owner = params[1];
    return [owner === 7 ? mocks.rows : [], []];
  });
});

describe("medical AI job store", () => {
  it("returns a completed result saved before a restart", async () => {
    const jobId = randomUUID();
    const result = {
      proposals: [
        {
          field: "field",
          text: "صداع",
          sources: ["صداع"],
          speaker: "uncertain",
        },
      ],
      warnings: [],
    };
    mocks.rows = [
      stored({ state: "complete", result_json: JSON.stringify(result) }),
    ];
    await expect(readMedicalProposals(7, jobId)).resolves.toEqual({
      status: "complete",
      result,
    });
  });

  it("does not let another user read the stored job", async () => {
    const jobId = randomUUID();
    mocks.rows = [stored({ state: "failed", failure_message: "x" })];
    await expect(readMedicalProposals(8, jobId)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("fails an old Gemini job that was cut off by a restart", async () => {
    const jobId = randomUUID();
    mocks.rows = [stored({ state: "running" })];
    const response = await readMedicalProposals(7, jobId);
    expect(response.status).toBe("failed");
  });

  it("purges expired transcripts and resumes jobs left running by a restart", async () => {
    const jobId = randomUUID();
    mocks.execute.mockImplementation(async (sql: string) => {
      if (sql.startsWith("SELECT job_id,owner_id"))
        return [[{ job_id: jobId, owner_id: 7 }], []];
      if (sql.startsWith("SELECT")) return [[stored({ state: "running" })], []];
      return [[], []];
    });
    await maintainMedicalJobs();
    const statements = mocks.execute.mock.calls.map(([sql]) => String(sql));
    expect(statements[0]).toMatch(/^DELETE FROM medical_ai_jobs WHERE expires_ms</);
    await vi.waitFor(() =>
      expect(mocks.execute).toHaveBeenCalledWith(
        expect.stringMatching(/^UPDATE medical_ai_jobs SET state/),
        ["failed", null, expect.any(String), jobId],
      ),
    );
  });

  it("reports a recent Gemini job as still running", async () => {
    const jobId = randomUUID();
    mocks.rows = [stored({ state: "running", created_ms: Date.now() - 5_000 })];
    await expect(readMedicalProposals(7, jobId)).resolves.toEqual({
      status: "running",
    });
  });
});

describe("latest medical AI job lookup", () => {
  const visit = {
    kind: "conversation" as const,
    mode: "conversation" as const,
    transcript: "مثال تدريبي خيالي. صداع من أسبوعين",
  };
  const row = (extra: Record<string, unknown>) => ({
    job_id: randomUUID(),
    state: "complete",
    input_json: JSON.stringify(visit),
    ...extra,
  });
  // Rows per [owner, visit]; "null" is a job started before the visit was saved.
  let table: Record<string, Array<Record<string, unknown>>>;
  beforeEach(() => {
    table = {};
    mocks.execute.mockImplementation(async (sql: string, params: unknown[]) => {
      const [owner, , , extra] = params;
      const visitKey = sql.includes("visit_id=?") ? String(extra) : "null";
      return [table[`${owner}:${visitKey}`] ?? [], []];
    });
  });

  it("returns the newest full-visit job for the patient and visit, scoped to its owner", async () => {
    const newest = row({ state: "running" });
    table["7:11"] = [newest, row({})];
    await expect(latestMedicalJob(7, 5, 11)).resolves.toEqual({
      jobId: newest.job_id,
      recording: visit,
      state: "running",
    });
    const [sql, params] = mocks.execute.mock.calls[0];
    expect(sql).toMatch(/owner_id=\? AND patient_id=\? AND expires_ms>\? AND visit_id=\? ORDER BY created_ms DESC/);
    expect(params).toEqual([7, 5, expect.any(Number), 11]);
    await expect(latestMedicalJob(8, 5, 11)).resolves.toBeNull();
  });

  it("falls back to a job from the last hour started before the visit had an id", async () => {
    const unsaved = row({});
    table["7:null"] = [unsaved];
    await expect(latestMedicalJob(7, 5, 11)).resolves.toMatchObject({
      jobId: unsaved.job_id,
    });
    const [sql, params] = mocks.execute.mock.calls[1];
    expect(sql).toContain("visit_id IS NULL AND created_ms>?");
    expect(params[3]).toBeGreaterThanOrEqual(Date.now() - 60 * 60 * 1000 - 1000);
    expect(params[3]).toBeLessThanOrEqual(Date.now() - 60 * 60 * 1000);
  });

  it("skips field dictations and recovers nothing from a failed job", async () => {
    table["7:11"] = [
      row({ input_json: JSON.stringify(input) }),
      row({ state: "failed" }),
      row({}),
    ];
    await expect(latestMedicalJob(7, 5, 11)).resolves.toBeNull();
  });

  it("does not block when the job store is unavailable", async () => {
    mocks.execute.mockRejectedValue(new Error("connection refused"));
    await expect(latestMedicalJob(7, 5, 11)).resolves.toBeNull();
  });
});

describe("daily medical AI review cap", () => {
  let owner = 3000;
  let started: number;
  beforeEach(() => {
    owner++;
    started = 0;
    vi.mocked(createManusTask).mockResolvedValue({ task_id: "fictional-task" });
    mocks.execute.mockImplementation(async (sql: string) => [
      sql.startsWith("SELECT COUNT(*)") ? [{ started }] : [],
      [],
    ]);
  });
  const recording = (transcript: string) => ({
    kind: "conversation" as const,
    mode: "dictation" as const,
    transcript,
  });

  it("refuses the 101st review in 24 hours without contacting the provider", async () => {
    started = 100;
    await expect(
      startMedicalProposals(owner, recording("مثال تدريبي خيالي. صداع")),
    ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    expect(createManusTask).not.toHaveBeenCalled();
    const [sql, params] = mocks.execute.mock.calls[0];
    expect(sql).toContain("FROM medical_ai_jobs WHERE owner_id=? AND created_ms>?");
    expect(params[0]).toBe(owner);
  });

  it("allows a review under the cap and does not block when the job store is unavailable", async () => {
    started = 99;
    await expect(
      startMedicalProposals(owner, recording("مثال تدريبي خيالي. صداع"), [], "manus", "current", undefined, { patientId: 1 }),
    ).resolves.toHaveProperty("jobId");
    mocks.execute.mockRejectedValue(Object.assign(new Error("secret SQL value"), { code: "ER_NO_SUCH_TABLE" }));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      await expect(
        startMedicalProposals(owner, recording("مثال تدريبي خيالي. زغللة"), [], "manus", "current", undefined, { patientId: 2 }),
      ).resolves.toHaveProperty("jobId");
      // Only the error code is logged, never the message.
      expect(warn).toHaveBeenCalledWith("[medical-ai] Job store unavailable", { code: "ER_NO_SUCH_TABLE" });
      expect(JSON.stringify(warn.mock.calls)).not.toContain("secret SQL value");
    } finally {
      warn.mockRestore();
    }
  });

  it("stores an unconfirmed Manus creation as failed so it survives a restart and counts", async () => {
    vi.mocked(createManusTask).mockRejectedValueOnce(new Error("socket hang up"));
    await expect(
      startMedicalProposals(owner, recording("مثال تدريبي خيالي. حكة"), [], "manus", "current", undefined, { patientId: 3 }),
    ).rejects.toMatchObject({ code: "BAD_GATEWAY" });
    const calls = mocks.execute.mock.calls.map(([sql, params]) => [String(sql), params]);
    const insert = calls.findIndex(([sql]) => sql.startsWith("INSERT INTO medical_ai_jobs"));
    const update = calls.findIndex(([sql]) => sql.startsWith("UPDATE medical_ai_jobs SET state"));
    expect(insert).toBeGreaterThan(-1);
    expect(calls[insert][1]).toEqual(expect.arrayContaining([owner, 3]));
    expect(update).toBeGreaterThan(insert);
    expect(calls[update][1]).toEqual(["failed", null, expect.stringContaining("Manus"), expect.any(String)]);
  });

  it("keeps the unconfirmed Manus failure when the job store is unavailable", async () => {
    vi.mocked(createManusTask).mockRejectedValueOnce(new Error("socket hang up"));
    mocks.execute.mockRejectedValue(Object.assign(new Error("down"), { code: "ECONNREFUSED" }));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      await expect(
        startMedicalProposals(owner, recording("مثال تدريبي خيالي. دموع"), [], "manus", "current", undefined, { patientId: 4 }),
      ).rejects.toMatchObject({ code: "BAD_GATEWAY" });
    } finally {
      warn.mockRestore();
    }
  });

  it("does not apply when central AI management sets the budget", async () => {
    vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "true");
    started = 500;
    try {
      // The central budget store is not part of this test; only the count matters.
      await startMedicalProposals(owner, recording("مثال تدريبي خيالي. صداع")).catch(() => undefined);
      expect(
        mocks.execute.mock.calls.some(([sql]) => String(sql).startsWith("SELECT COUNT(*)")),
      ).toBe(false);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
