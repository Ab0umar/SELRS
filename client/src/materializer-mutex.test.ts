import { describe, expect, it, vi } from "vitest";
import {
  withMaterializerTransaction,
  withMysqlAdvisoryLock,
} from "../../server/services/attendance/materializerMutex";

function makeConnection(lockAcquired = 1) {
  const query = vi.fn(
    async (statement: string) =>
      [
        statement.includes("GET_LOCK") ? [{ lockAcquired }] : [{ released: 1 }],
      ] as any,
  );
  const release = vi.fn();
  const destroy = vi.fn();
  return { connection: { query, release, destroy }, query, release, destroy };
}

describe("attendance materializer mutex", () => {
  it("holds and releases the lock around successful work", async () => {
    const mock = makeConnection();
    const work = vi.fn(async () => "done");

    await expect(
      withMysqlAdvisoryLock(mock.connection, "attendance-test", 5, work),
    ).resolves.toBe("done");

    expect(work).toHaveBeenCalledOnce();
    expect(mock.query).toHaveBeenCalledTimes(2);
    expect(mock.query.mock.calls[1]?.[0]).toContain("RELEASE_LOCK");
    expect(mock.release).toHaveBeenCalledOnce();
  });

  it("releases the lock and connection when work fails", async () => {
    const mock = makeConnection();

    await expect(
      withMysqlAdvisoryLock(mock.connection, "attendance-test", 5, async () => {
        throw new Error("forced failure");
      }),
    ).rejects.toThrow("forced failure");

    expect(mock.query).toHaveBeenCalledTimes(2);
    expect(mock.release).toHaveBeenCalledOnce();
  });

  it("does not run work when another materializer owns the lock", async () => {
    const mock = makeConnection(0);
    const work = vi.fn(async () => "should not run");

    await expect(
      withMysqlAdvisoryLock(mock.connection, "attendance-test", 5, work),
    ).rejects.toThrow("Attendance materialization is already running");

    expect(work).not.toHaveBeenCalled();
    expect(mock.query).toHaveBeenCalledOnce();
    expect(mock.release).toHaveBeenCalledOnce();
  });

  it("commits the daily transaction and monthly follow-up before releasing", async () => {
    const mock = makeConnection();
    const events: string[] = [];
    const db = {
      transaction: async (work: (tx: object) => Promise<string>) => {
        events.push("transaction-start");
        const result = await work({ tx: true });
        events.push("transaction-commit");
        return result;
      },
    };

    await withMaterializerTransaction(
      mock.connection,
      db,
      async (tx) => {
        expect(tx).toEqual({ tx: true });
        events.push("daily-work");
        return "complete";
      },
      async () => {
        events.push("monthly-follow-up");
      },
    );

    expect(events).toEqual([
      "transaction-start",
      "daily-work",
      "transaction-commit",
      "monthly-follow-up",
    ]);
    expect(mock.query.mock.calls[1]?.[0]).toContain("RELEASE_LOCK");
    expect(mock.release).toHaveBeenCalledOnce();
  });
});
