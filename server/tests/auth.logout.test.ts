import { describe, expect, it } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import {
  AUTH_COOKIE_NAME,
  LEGACY_AUTH_COOKIE_NAME,
} from "../_core/auth";

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

function createAuthContext(): {
  ctx: TrpcContext;
  clearedCookies: CookieCall[];
} {
  const clearedCookies: CookieCall[] = [];
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("clears each current and legacy session cookie variant", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(15);
    expect(new Set(clearedCookies.map(({ name }) => name))).toEqual(
      new Set([AUTH_COOKIE_NAME, LEGACY_AUTH_COOKIE_NAME]),
    );
    expect(
      clearedCookies.filter(({ name }) => name === AUTH_COOKIE_NAME),
    ).toHaveLength(10);
    expect(
      clearedCookies.filter(({ name }) => name === LEGACY_AUTH_COOKIE_NAME),
    ).toHaveLength(5);
    expect(
      clearedCookies.every(({ options }) => options.maxAge === -1),
    ).toBe(true);
  });
});
