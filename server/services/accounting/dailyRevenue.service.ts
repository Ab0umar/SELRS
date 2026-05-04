import type { DailyRevenueInput } from "../../../shared/accounting/contracts";
import { mapDailyRevenueRows } from "./mappers";
import { mssqlQuery } from "./mssqlAccounting";
import { buildDailyRevenueSql } from "./sqlBuilders";

export async function getDailyRevenue(input: DailyRevenueInput) {
  const query = buildDailyRevenueSql(input);
  const rows = await mssqlQuery<Record<string, unknown>>(query.sql, query.params);
  return mapDailyRevenueRows(rows);
}
