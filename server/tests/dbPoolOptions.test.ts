import { describe, expect, it } from "vitest";
import { getDbPoolOptions } from "../_core/dbPoolOptions";

describe("getDbPoolOptions", () => {
  it("bounds the wait queue by default", () => {
    const o = getDbPoolOptions({});
    expect(o.queueLimit).toBe(200);
    expect(o.connectionLimit).toBe(20);
    expect(o.maxIdle).toBeLessThanOrEqual(o.connectionLimit);
  });

  it("reads overrides and clamps nonsense", () => {
    expect(getDbPoolOptions({ DB_POOL_LIMIT: "40" } as any).connectionLimit).toBe(40);
    expect(getDbPoolOptions({ DB_POOL_LIMIT: "0" } as any).connectionLimit).toBe(2);
    expect(getDbPoolOptions({ DB_POOL_LIMIT: "9999" } as any).connectionLimit).toBe(100);
    expect(getDbPoolOptions({ DB_POOL_QUEUE_LIMIT: "abc" } as any).queueLimit).toBe(200);
    expect(getDbPoolOptions({ DB_POOL_QUEUE_LIMIT: "0" } as any).queueLimit).toBe(1);
  });
});
