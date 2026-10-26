import { describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import { resolveLoginYear } from "../integrations/mssqlYears";
import {
  currentMssqlYear,
  getMssqlYear,
  isMssqlYearAuto,
} from "../integrations/mssqlYear";
import { mssqlYearContext } from "../_core/mssqlYearContext";
import { ENV } from "../_core/env";

const current = currentMssqlYear();

describe("resolveLoginYear", () => {
  const available = async () => [current, current - 1, current - 2];

  it("treats empty, 'auto' and the current year as automatic", async () => {
    for (const raw of [undefined, null, "", "auto", current, String(current)]) {
      expect(await resolveLoginYear(raw, available)).toEqual({ ok: true, year: null });
    }
  });

  it("accepts an older year that exists on the server", async () => {
    expect(await resolveLoginYear(String(current - 1), available)).toEqual({
      ok: true,
      year: current - 1,
    });
  });

  it("rejects years that do not exist and anything that is not a plain year", async () => {
    for (const raw of [current - 9, "abc", "2025; DROP", 20250, -1, {}, [2025]]) {
      expect(await resolveLoginYear(raw, available)).toEqual({ ok: false });
    }
  });
});

describe("mssqlYearContext (real Express)", () => {
  it("scopes each request to the year signed into its token", async () => {
    const { default: express } = await import("express");
    const app = express();
    app.use(mssqlYearContext);
    app.get("/year", (_req, res) =>
      res.json({ year: getMssqlYear(), auto: isMssqlYearAuto() }),
    );
    const server = app.listen(0);
    try {
      const { port } = server.address() as { port: number };
      const sign = (payload: object) =>
        jwt.sign(payload, ENV.JWT_SECRET, { algorithm: "HS256" });
      const get = async (headers: Record<string, string> = {}) =>
        (await fetch(`http://127.0.0.1:${port}/year`, { headers })).json();

      expect(await get()).toEqual({ year: current, auto: true });
      expect(
        await get({ authorization: `Bearer ${sign({ mssqlYear: current - 1 })}` }),
      ).toEqual({ year: current - 1, auto: false });
      expect(
        await get({ authorization: `Bearer ${sign({ mssqlYear: null })}` }),
      ).toEqual({ year: current, auto: true });
      // forged / invalid values never select a database
      expect(
        await get({ authorization: `Bearer ${sign({ mssqlYear: "2020 OR 1=1" })}` }),
      ).toEqual({ year: current, auto: true });
      const forged = jwt.sign({ mssqlYear: 2021 }, "x".repeat(40));
      expect(await get({ authorization: `Bearer ${forged}` })).toEqual({
        year: current,
        auto: true,
      });
    } finally {
      server.close();
    }
  });
});
