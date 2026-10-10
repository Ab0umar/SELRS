import { expect, it } from "vitest";
import { hasNotEnded } from "./visibleAssignments";

it.each([
  ["2026-10-04", false],
  ["2026-10-05", true],
  ["2026-10-06", true],
  [null, true],
  [undefined, true],
])("keeps assignment ending %s visible: %s", (effectiveTo, visible) => {
  expect(hasNotEnded({ effectiveTo }, "2026-10-05")).toBe(visible);
});
