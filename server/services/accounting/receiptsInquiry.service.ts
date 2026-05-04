import type {
  ReceiptDetailInput,
  ReceiptsInquiryInput,
} from "../../../shared/accounting/contracts";
import {
  mapReceiptDetailRows,
  mapReceiptHeaders,
} from "./mappers";
import { mssqlQuery } from "./mssqlAccounting";
import {
  buildReceiptDetailSql,
  buildReceiptsInquirySql,
} from "./sqlBuilders";

export async function getReceiptsInquiry(input: ReceiptsInquiryInput) {
  const query = buildReceiptsInquirySql(input);
  const rows = await mssqlQuery<Record<string, unknown>>(query.sql, query.params);
  return mapReceiptHeaders(rows);
}

export async function getReceiptDetail(input: ReceiptDetailInput) {
  const query = buildReceiptDetailSql(input);
  const rows = await mssqlQuery<Record<string, unknown>>(query.sql, query.params);
  return mapReceiptDetailRows(rows);
}
