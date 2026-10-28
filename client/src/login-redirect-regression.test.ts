import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const homeSource = readFileSync(resolve(__dirname, "pages", "Home.tsx"), "utf8");

describe("login redirect regression", () => {
  it("refreshes the in-memory authenticated user before routing away from login", () => {
    const loginSuccess = homeSource.indexOf('if (!res.ok) {');
    const redirect = homeSource.indexOf('setLocation(', loginSuccess);

    expect(loginSuccess).toBeGreaterThanOrEqual(0);
    expect(redirect).toBeGreaterThan(loginSuccess);
    expect(homeSource.slice(loginSuccess, redirect)).toContain("await refresh()");
  });
});
