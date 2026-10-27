import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { escapeHtml } from "./escapeHtml";

const read = (relative: string) =>
  readFileSync(new URL(relative, import.meta.url), "utf8");

describe("AbsentReport print markup", () => {
  it("escapes employee names before they reach innerHTML", () => {
    const source = read("../features/salary/AbsentReport.tsx");
    expect(source).not.toMatch(/<td[^>]*>\$\{name\}/);
    expect(source.match(/escapeHtml\(name\)/g)).toHaveLength(2);
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
    );
  });
});

describe("offline query cache", () => {
  const source = read("./appRuntime.ts");
  const safeList = source.slice(
    source.indexOf("const SAFE_QUERY_FRAGMENTS"),
    source.indexOf("type PersistedQueryEntry"),
  );

  it("does not persist patient state, user lists or permissions", () => {
    for (const fragment of [
      "getPatientPageState",
      "getAllUsers",
      "getTeamPermissions",
      "getUserPermissionState",
      "getPatientStats",
    ]) {
      expect(safeList).not.toContain(fragment);
    }
  });

  it("is cleared with the stored session", () => {
    expect(source).toContain("export const clearOfflineQueryCache");
    expect(read("../main.tsx")).toMatch(
      /removeItem\("token"\);\s*clearOfflineQueryCache\(\);/,
    );
    expect(read("../_core/hooks/useAuth.ts")).toMatch(
      /removeItem\("token"\);\s*clearOfflineQueryCache\(\);/,
    );
  });
});
