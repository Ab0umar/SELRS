import type { LasikReceiptsInput } from "../../../shared/accounting/contracts";
import { mapReceiptHeaders } from "./mappers";
import { mssqlQuery } from "./mssqlAccounting";
import { buildLasikReceiptsSql } from "./sqlBuilders";

export async function getLasikReceipts(input: LasikReceiptsInput) {
  const query = buildLasikReceiptsSql(input);
  const rows = await mssqlQuery<Record<string, unknown>>(query.sql, query.params);
  return mapReceiptHeaders(rows);
}
