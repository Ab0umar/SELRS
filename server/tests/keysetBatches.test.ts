import { describe, expect, it } from "vitest";
import { walkByKeyset } from "../lib/keysetBatches";

type Row = { id: number; linked: boolean; linkable: boolean };

describe("walkByKeyset", () => {
  const table = (): Row[] =>
    Array.from({ length: 11 }, (_, i) => ({ id: i + 1, linked: false, linkable: i % 2 === 0 }));

  const run = async (rows: Row[], batch: number) => {
    const seen: number[] = [];
    await walkByKeyset(
      async (afterId, limit) =>
        rows.filter((r) => !r.linked && r.id > afterId).slice(0, limit),
      batch,
      async (batchRows) => {
        for (const r of batchRows) {
          seen.push(r.id);
          if (r.linkable) r.linked = true;
        }
      },
    );
    return seen;
  };

  it("visits every row even though handled rows leave the filter", async () => {
    expect(await run(table(), 3)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it("stops on an empty table", async () => {
    expect(await run([], 3)).toEqual([]);
  });

  it("would skip rows with OFFSET semantics (documents the bug)", async () => {
    const rows = table();
    const seen: number[] = [];
    let offset = 0;
    for (;;) {
      const batch = rows.filter((r) => !r.linked).slice(offset, offset + 3);
      if (!batch.length) break;
      offset += batch.length;
      for (const r of batch) {
        seen.push(r.id);
        if (r.linkable) r.linked = true;
      }
    }
    expect(seen.length).toBeLessThan(11);
  });
});
