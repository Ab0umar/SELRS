import { describe, expect, it } from "vitest";
import { getOperationColumnId } from "./operation-columns";

describe("daily operation grouping", () => {
  it.each([
    "femto lasik",
    "Femto LASIK",
    "فيمتو ليزك",
    "فمتو ليزك",
    "F.S",
    "F.L",
    "سمايل",
  ])("places %s in the femto column before matching LASIK", (name) =>
    expect(getOperationColumnId(name)).toBe("femto"),
  );
  it.each(["LASIK", "ليزك", "PRK"])("keeps %s in laser", (name) =>
    expect(getOperationColumnId(name)).toBe("laser"),
  );
  it("preserves surgery and catch-all categories", () => {
    expect(getOperationColumnId("cataract")).toBe("surgery");
    expect(getOperationColumnId("unlisted operation")).toBe("other");
  });
});
