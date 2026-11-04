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
import {
  maintainMedicalJobs,
  readMedicalProposals,
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
