import type {
  ReceiptDetailInput,
  ReceiptsInquiryInput,
} from "../../../shared/accounting/contracts";
import { mapReceiptDetailRows, mapReceiptHeaders } from "./mappers";
import { mssqlQuery } from "./mssqlAccounting";
import { buildReceiptDetailSql, buildReceiptsInquirySql } from "./sqlBuilders";
import type { MySql2Database } from "drizzle-orm/mysql2";

export async function getReceiptsInquiry(input: ReceiptsInquiryInput) {
  const query = buildReceiptsInquirySql(input);
  const rows = await mssqlQuery<Record<string, unknown>>(
    query.sql,
    query.params,
  );
  return mapReceiptHeaders(rows);
}

export async function getReceiptDetail(input: ReceiptDetailInput) {
  const query = buildReceiptDetailSql(input);
  const rows = await mssqlQuery<Record<string, unknown>>(
    query.sql,
    query.params,
  );
  return mapReceiptDetailRows(rows);
}

export async function syncAccountingPatientServices(patientCode: string): Promise<void> {
  const { getDb } = await import("../../db");
  const { patients, patientServiceEntries } = await import("../../../drizzle/schema");
  const { eq, and, or, like } = await import("drizzle-orm");
  const { mssqlDbName, mssqlTable, getMssqlYear, currentMssqlYear } = await import("../../integrations/mssqlYear");
  if (getMssqlYear() !== currentMssqlYear()) {
    throw new Error("مزامنة MySQL متاحة لإيصالات السنة الحالية فقط");
  }
  const connection = await getDb() as MySql2Database<typeof import("../../../drizzle/schema")> | null;
  if (!connection) throw new Error("MySQL غير متاح");
  const [patient] = await connection.select().from(patients).where(eq(patients.patientCode, patientCode)).limit(1);
  if (!patient) throw new Error("المريض غير موجود في MySQL؛ شغّل مزامنة المرضى أولاً");
  await connection.transaction(async (tx) => {
    await tx.select({id: patients.id}).from(patients).where(eq(patients.id, patient.id)).for("update");
  const rows = await mssqlQuery<{serviceCode: string; serviceDate: string | null; trNo: string; sectionCode: number; trTy: number; lineNo: number}>(`
    SELECT CONVERT(varchar(64), s.SRV_CD) AS serviceCode, CONVERT(varchar(10), s.DT, 120) AS serviceDate,
      CONVERT(varchar(40), s.TR_NO) AS trNo, s.SEC_CD AS sectionCode, s.TR_TY AS trTy, s.LN_NO AS lineNo
    FROM ${mssqlDbName()}.dbo.PAPAT_SRV s
    WHERE s.PAT_CD = @patientCode
      AND ISNULL(CONVERT(varchar(10), s.CNCL), '0') IN ('', '0')
      AND EXISTS (SELECT 1 FROM ${mssqlTable("PAJRNRCVH")} h WHERE h.PAT_CD=s.PAT_CD
        AND h.SEC_CD=s.SEC_CD AND h.TR_TY=s.TR_TY AND h.TR_NO=s.TR_NO
        AND ISNULL(CONVERT(varchar(10), h.CNCL), '0') IN ('', '0'))
    ORDER BY s.DT DESC, s.LN_NO DESC`, {patientCode});
    await tx.delete(patientServiceEntries).where(and(eq(patientServiceEntries.patientId, patient.id),
      or(eq(patientServiceEntries.source, "mssql"), like(patientServiceEntries.sourceRef, `manual:accounting:${patientCode}:%`))));
    const entries = [...new Map(rows.filter(row => String(row.serviceCode ?? "").trim()).map(row => ({
      patientId: patient.id, serviceCode: String(row.serviceCode).trim(), source: "mssql" as const,
      sourceRef: `mssql:PAPAT_SRV:${patientCode}:${String(row.serviceCode).trim()}:${row.trNo}`,
      serviceDate: row.serviceDate ? new Date(`${row.serviceDate}T12:00:00`) : null,
    })).map(entry => [entry.sourceRef, entry])).values()];
    for (let index = 0; index < entries.length; index += 200) {
      await tx.insert(patientServiceEntries).values(entries.slice(index, index + 200));
    }
    await tx.update(patients).set({serviceCode: entries[0]?.serviceCode ?? null}).where(eq(patients.id, patient.id));
  });
}
