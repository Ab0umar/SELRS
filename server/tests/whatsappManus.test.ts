import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
const network = vi.hoisted(() => ({ connection: vi.fn() }));
vi.mock("../db", async (original) => ({
  ...(await original<typeof import("../db")>()),
  getDbConnection: network.connection,
}));
vi.mock("../services/ai/providers/manus", async (original) => ({
  ...(await original<typeof import("../services/ai/providers/manus")>()),
  createManusTask: vi.fn(),
  readManusTask: vi.fn(),
  downloadManusFile: vi.fn(),
}));
import {
  createManusTask,
  readManusTask,
  downloadManusFile,
} from "../services/ai/providers/manus";
import { AiManagementStore } from "../services/ai/managementStore";
import {
  generateWhatsAppCopy,
  readWhatsAppCopy,
} from "../services/ai/whatsappCopy";

const input = {
  requestId: "00000000-0000-4000-8000-000000000001",
  kind: "exam" as const,
  days: ["الأحد", "الخميس"] as Array<"الأحد" | "الخميس">,
};
const hash = createHash("sha256")
  .update(JSON.stringify({ kind: input.kind, days: [...input.days].sort() }))
  .digest("hex");
const execute = vi.fn();
const release = vi.fn();
beforeEach(() => {
  vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "true");
  network.connection.mockResolvedValue({ execute, release });
  vi.spyOn(AiManagementStore.prototype, "reserve").mockResolvedValue({
    workload: "whatsapp.marketing",
    provider: "manus",
    model: "max",
    enabled: true,
    dailyRequests: 10,
    dailyTokens: 100000,
    maxConcurrent: 2,
  });
  vi.spyOn(AiManagementStore.prototype, "bindRequest").mockResolvedValue(
    undefined,
  );
  vi.spyOn(AiManagementStore.prototype, "attachTask").mockResolvedValue(
    undefined,
  );
  vi.spyOn(AiManagementStore.prototype, "complete").mockResolvedValue(
    undefined,
  );
  vi.mocked(createManusTask).mockResolvedValue({ task_id: "whatsapp-task" });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});
describe("Manus WhatsApp drafting", () => {
  it("creates one task, preserves fixed offer facts, and serves cached results without another task", async () => {
    execute
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([
        [{ input_hash: hash, created_by: 42, variants_json: null }],
      ])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);
    expect(await generateWhatsAppCopy(input, 42)).toEqual({
      requestId: input.requestId,
      variants: null,
    });
    expect(createManusTask).toHaveBeenCalledWith(
      expect.stringContaining("response.json"),
      { agentProfile: "max" },
    );
    const bind = vi.mocked(AiManagementStore.prototype.bindRequest).mock
      .calls[0];
    vi.spyOn(AiManagementStore.prototype, "boundRequest").mockResolvedValue({
      provider: "manus",
      model: "max",
      workload: "whatsapp.marketing",
      state: "running",
      task_id: "whatsapp-task",
      created_ms: Date.now(),
      input_hash: bind[1],
    });
    const pending = JSON.stringify({ pending: input });
    execute.mockResolvedValueOnce([
      [{ variants_json: pending, state: "running" }],
    ]);
    vi.mocked(readManusTask).mockResolvedValueOnce({
      status: "running",
      has_running_background_jobs: true,
      attachments: [],
    });
    expect((await readWhatsAppCopy(input.requestId, 42))?.variants).toBeNull();
    execute
      .mockResolvedValueOnce([[{ variants_json: pending, state: "running" }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);
    vi.mocked(readManusTask).mockResolvedValueOnce({
      status: "stopped",
      has_running_background_jobs: false,
      credit_usage: 1,
      attachments: [
        {
          filename: "response.json",
          url: "https://files.manuscdn.com/response.json",
        },
      ],
    });
    vi.mocked(downloadManusFile).mockResolvedValueOnce(
      Buffer.from(
        JSON.stringify({
          openings: ["أهلا وسهلا بيك", "نورت المركز", "يا أهلا بحضرتك"],
        }),
      ),
    );
    const result = await readWhatsAppCopy(input.requestId, 42);
    expect(result?.variants).toHaveLength(3);
    for (const text of result?.variants ?? [])
      expect(text).toContain("أيام الأحد والخميس بـ200ج بدلًا من 260ج");
    expect(AiManagementStore.prototype.complete).toHaveBeenCalledWith(
      input.requestId,
      expect.objectContaining({ status: "success" }),
      1,
    );
    execute.mockResolvedValueOnce([
      [{ variants_json: JSON.stringify(result?.variants), state: "completed" }],
    ]);
    expect((await readWhatsAppCopy(input.requestId, 42))?.variants).toEqual(
      result?.variants,
    );
    expect(createManusTask).toHaveBeenCalledTimes(1);
    expect(readManusTask).toHaveBeenCalledTimes(2);
  });
  it("rejects cross-owner reads before any provider request", async () => {
    execute.mockResolvedValueOnce([[]]);
    expect(await readWhatsAppCopy(input.requestId, 99)).toBeNull();
    expect(readManusTask).not.toHaveBeenCalled();
    expect(createManusTask).not.toHaveBeenCalled();
  });
});
