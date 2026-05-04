import type { DashboardSummaryInput } from "../../../shared/accounting/contracts";
import { mapDashboardSummaryRow } from "./mappers";
import { mssqlQuery } from "./mssqlAccounting";
import { buildDashboardSummarySql } from "./sqlBuilders";

export async function getDashboardSummary(input: DashboardSummaryInput) {
  const query = buildDashboardSummarySql(input);
  const rows = await mssqlQuery<Record<string, unknown>>(query.sql, query.params);
  return mapDashboardSummaryRow(rows[0]);
}
