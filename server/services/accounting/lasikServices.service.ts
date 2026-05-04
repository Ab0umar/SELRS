import type { LasikServicesInput } from "../../../shared/accounting/contracts";
import { mapServiceRows } from "./mappers";
import { mssqlQuery } from "./mssqlAccounting";
import { buildLasikServicesSql } from "./sqlBuilders";

export async function getLasikServices(input: LasikServicesInput) {
  const query = buildLasikServicesSql(input);
  const rows = await mssqlQuery<Record<string, unknown>>(query.sql, query.params);
  return mapServiceRows(rows);
}
