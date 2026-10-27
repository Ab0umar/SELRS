import { afterEach, describe, expect, it, vi } from "vitest";
import { AiManagementStore } from "../services/ai/managementStore";
import { reconcileManusTasks } from "../services/ai/reconcileManus";
import type { readManusTask } from "../services/ai/providers/manus";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("independent Manus accounting", () => {
  it("settles finished tasks and keeps running or unknown outcomes reserved", async () => {
    vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "true");
    const store = new AiManagementStore(async () => {
      throw new Error("Unexpected database call");
    });
    vi.spyOn(store, "listUnsettledManus").mockResolvedValue(
      ["finished", "failed", "running", "background", "unknown"].map(
        (task_id) => ({ request_id: task_id, task_id, synthetic_probe: false }),
      ),
    );
    const settle = vi
      .spyOn(store, "recordManusCompletion")
      .mockResolvedValue(undefined);
    const checked = vi
      .spyOn(store, "markManusChecked")
      .mockResolvedValue(undefined);
    const read = vi
      .fn<typeof readManusTask>()
      .mockImplementation(async (id) => {
        if (id === "unknown") throw new Error("transient network failure");
        return {
          status:
            id === "failed"
              ? "error"
              : id === "running"
                ? "running"
                : "stopped",
          has_running_background_jobs: id === "background",
          credit_usage: 2,
          attachments: [],
        };
      });
    await reconcileManusTasks(store, read);
    expect(read).toHaveBeenCalledTimes(5);
    expect(checked).toHaveBeenCalledTimes(5);
    expect(settle.mock.calls).toEqual([
      ["finished", "finished", "success", 2],
      ["failed", "failed", "failed", 2],
    ]);
  });

  it("does not poll when central management is disabled", async () => {
    vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "false");
    const store = new AiManagementStore(async () => {
      throw new Error("Unexpected database call");
    });
    const list = vi.spyOn(store, "listUnsettledManus");
    const read = vi.fn<typeof readManusTask>();
    await reconcileManusTasks(store, read);
    expect(list).not.toHaveBeenCalled();
    expect(read).not.toHaveBeenCalled();
  });
});
