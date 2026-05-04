import type {
  LasikRevenueSummaryInput,
  ServiceRevenueInput,
} from "../../../shared/accounting/contracts";
import {
  mapLasikRevenueSummaryRow,
  mapServiceRevenueRows,
} from "./mappers";
import { mssqlQuery } from "./mssqlAccounting";
import {
  buildLasikRevenueSummarySql,
  buildServiceRevenueSql,
} from "./sqlBuilders";

export async function getServiceRevenue(input: ServiceRevenueInput) {
  const query = buildServiceRevenueSql(input);
  const rows = await mssqlQuery<Record<string, unknown>>(query.sql, query.params);
  return mapServiceRevenueRows(rows);
}

export async function getLasikRevenueSummary(input: LasikRevenueSummaryInput) {
  const query = buildLasikRevenueSummarySql(input);
  const rows = await mssqlQuery<Record<string, unknown>>(query.sql, query.params);
  return mapLasikRevenueSummaryRow(rows[0], input);
}
