import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import {
  dateRangeConditions,
  intLiteral,
  likeContains,
  sortKeyword,
  whereClause,
} from "../services/accounting/ledgerSql";

const dialect = new MySqlDialect();
const compile = (query: ReturnType<typeof sql>) => dialect.sqlToQuery(query);

describe("accounting ledger SQL helpers", () => {
  it("binds dates as parameters instead of inlining them", () => {
    const { sql: text, params } = compile(
      sql`SELECT * FROM accLedger${whereClause(
        dateRangeConditions("txDate", "2026-01-01", "2026-01-31"),
      )}`,
    );
    expect(text).toBe(
      "SELECT * FROM accLedger WHERE txDate >= ? AND txDate <= ?",
    );
    expect(params).toEqual(["2026-01-01", "2026-01-31"]);
  });

  it("rejects the backslash break-out payload that defeated quote stripping", () => {
    expect(() => dateRangeConditions("txDate", "\\", " UNION SELECT 1 -- ")).toThrow();
    expect(() => dateRangeConditions("txDate", undefined, "2026-01-01' OR 1=1")).toThrow();
  });

  it("keeps a trailing backslash in free text as data, never as SQL", () => {
    const { sql: text, params } = compile(
      sql`SELECT * FROM accLedger WHERE notes LIKE ${likeContains("abc\\")}`,
    );
    expect(text).toBe("SELECT * FROM accLedger WHERE notes LIKE ?");
    expect(params).toEqual(["%abc\\\\%"]);
  });

  it("treats LIKE wildcards typed by the user literally", () => {
    expect(likeContains("50%_off")).toBe("%50\\%\\_off%");
  });

  it("only emits ASC/DESC and digits for the fragments that cannot be bound", () => {
    expect(compile(sql`${sortKeyword("asc")}`).sql).toBe("ASC");
    expect(compile(sql`${sortKeyword("asc; DROP TABLE x")}`).sql).toBe("DESC");
    expect(compile(sql`${intLiteral(50)}`).sql).toBe("50");
    expect(compile(sql`${intLiteral(Number.NaN)}`).sql).toBe("0");
  });

  it("returns an empty fragment when there are no conditions", () => {
    expect(compile(sql`X${whereClause([])}`).sql).toBe("X");
  });
});

describe("accounting router source guard", () => {
  const source = readFileSync(
    path.resolve(__dirname, "../routers/accounting.ts"),
    "utf8",
  );

  it("does not build SQL literals by stripping or doubling quotes", () => {
    expect(source).not.toMatch(/replace\(\/'\/g/);
  });

  it("never passes an interpolated template to sql.raw", () => {
    for (const match of source.matchAll(/sql\.raw\(\s*`([^`]*)`/g)) {
      expect(match[1]).not.toContain("${");
    }
  });
});
