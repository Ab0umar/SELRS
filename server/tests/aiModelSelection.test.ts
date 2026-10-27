import { describe, expect, it, vi } from "vitest";
import type { PoolConnection } from "mysql2/promise";
import { AiManagementStore } from "../services/ai/managementStore";

function fixture(enabled = true) {
  const execute = vi
    .fn()
    .mockResolvedValueOnce([
      [
        {
          workload: "marketing.text",
          provider: "gemini",
          model: "gemini-original",
          enabled,
          daily_requests: 10,
          daily_tokens: 100000,
          max_concurrent: 2,
        },
      ],
    ])
    .mockResolvedValueOnce([[]])
    .mockResolvedValueOnce([[{ requests: 0, tokens: 0 }]])
    .mockResolvedValueOnce([[{ pending: 0 }]])
    .mockResolvedValueOnce([{ affectedRows: 1 }]);
  const connection = {
    execute,
    beginTransaction: vi.fn(),
    commit: vi.fn(),
    rollback: vi.fn(),
    release: vi.fn(),
  };
  const store = new AiManagementStore(
    async () => connection as unknown as PoolConnection,
  );
  return { store, execute, connection };
}

describe("request model accounting", () => {
  it("reserves usage with the selected model while retaining workload limits", async () => {
    const { store, execute } = fixture();
    const result = await store.reserve(
      "00000000-0000-4000-8000-000000000001",
      "marketing.text",
      "gemini",
      18000,
      "gemini-selected",
    );
    expect(result).toMatchObject({
      model: "gemini-selected",
      dailyRequests: 10,
      dailyTokens: 100000,
    });
    const insert = execute.mock.calls.find(([sql]) =>
      String(sql).startsWith("INSERT INTO ai_core_usage"),
    );
    expect(insert?.[1]).toContain("gemini-selected");
    expect(
      execute.mock.calls.some(([sql]) =>
        String(sql).includes("UPDATE ai_core_profiles"),
      ),
    ).toBe(false);
  });
  it("does not bypass a disabled workload by choosing a different model", async () => {
    const { store, connection } = fixture(false);
    await expect(
      store.reserve(
        "00000000-0000-4000-8000-000000000002",
        "marketing.text",
        "gemini",
        18000,
        "gemini-selected",
      ),
    ).rejects.toThrow("disabled");
    expect(connection.rollback).toHaveBeenCalled();
    expect(connection.commit).not.toHaveBeenCalled();
  });
  it("rejects a model from a different provider before reserving usage", async () => {
    const { store, execute } = fixture();
    await expect(
      store.reserve(
        "00000000-0000-4000-8000-000000000003",
        "marketing.text",
        "gemini",
        18000,
        "max",
      ),
    ).rejects.toThrow();
    expect(
      execute.mock.calls.some(([sql]) => String(sql).startsWith("INSERT INTO")),
    ).toBe(false);
  });
});
