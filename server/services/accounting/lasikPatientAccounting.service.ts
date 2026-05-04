import type { PatientLasikSummaryInput } from "../../../shared/accounting/contracts";
import { mapPatientLasikSummaryRows } from "./mappers";
import { mssqlQuery } from "./mssqlAccounting";
import { buildPatientLasikSummarySql } from "./sqlBuilders";

export async function getPatientLasikSummary(input: PatientLasikSummaryInput) {
  const query = buildPatientLasikSummarySql(input);
  const rows = await mssqlQuery<Record<string, unknown>>(query.sql, query.params);
  return mapPatientLasikSummaryRows(rows, input.patientCode);
}
