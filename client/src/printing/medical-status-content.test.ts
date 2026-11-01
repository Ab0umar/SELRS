import { describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { sql } from "drizzle-orm";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import { hasMedicalContent, medicalVisitScope } from "../../../server/services/medical-status-content";

const dialect = new MySqlDialect();
describe("medical status indicators", () => {
  it("ignores empty records and placeholders while retaining valid zero measurements", () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec("CREATE TABLE records (value TEXT)");
      for (const value of [null, "", "   ", "{}", "[]", "null", "-", "—", "0", "0.00", "PL", "saved note"]) db.prepare("INSERT INTO records VALUES (?)").run(value);
      const filter = dialect.sqlToQuery(hasMedicalContent([sql.raw("value")]));
      expect(db.prepare(`SELECT value FROM records WHERE ${filter.sql}`).all()).toEqual([
        {value: "0"}, {value: "0.00"}, {value: "PL"}, {value: "saved note"},
      ]);
    } finally { db.close(); }
  });
  it("restricts indicators to the selected visit, excluding historical data", () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec("CREATE TABLE records (visitId INTEGER); INSERT INTO records VALUES (10),(11)");
      const filter = dialect.sqlToQuery(medicalVisitScope(sql.raw("visitId"), [11])!);
      expect(db.prepare(`SELECT visitId FROM records WHERE ${filter.sql}`).all(...filter.params)).toEqual([{visitId: 11}]);
      const empty = dialect.sqlToQuery(medicalVisitScope(sql.raw("visitId"), [])!);
      expect(db.prepare(`SELECT visitId FROM records WHERE ${empty.sql}`).all()).toEqual([]);
      expect(medicalVisitScope(sql.raw("visitId"))).toBeUndefined();
    } finally { db.close(); }
  });
});
