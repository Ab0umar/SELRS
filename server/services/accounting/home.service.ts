import type { ExtendedDashboardSummaryOutput, TransactionsInput, TransactionsOutput } from "../../../shared/accounting/contracts";
import { getDashboardSummary } from "./dashboardSummary.service";
import { buildReceiptsInquirySql } from "./sqlBuilders";
import { mssqlQuery } from "./mssqlAccounting";
import { mapReceiptHeader } from "./mappers";

export async function getExtendedDashboardSummary(input: { sectionCode?: number }): Promise<ExtendedDashboardSummaryOutput> {
  return getDashboardSummary(input);
}

export async function getTransactions(input: TransactionsInput): Promise<TransactionsOutput> {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const { sql, params } = buildReceiptsInquirySql({
    fromDate: todayStr,
    toDate: todayStr,
    sectionCode: input.sectionCode,
    limit: input.limit ?? 20,
  });

  const rows = await mssqlQuery<Record<string, unknown>>(sql, params);
  return rows.map((row) => mapReceiptHeader(row));
}
