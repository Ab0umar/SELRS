/**
 * Diagnose why a patient code may be missing from Accounting receipts inquiry.
 *
 * Usage (repo root):
 *   PATIENT_CODE=0013 node --import tsx scripts/accounting/diagnose-patient-code.ts
 */

import "dotenv/config";

async function main() {
  const patientCode = process.env.PATIENT_CODE?.trim() || "0013";
  const secCd = Number(process.env.SECTION_CODE ?? "15");

  const { mssqlQuery } = await import("../../server/services/accounting/mssqlAccounting");

  console.log(`Patient code sample (string, preserves leading zeros): "${patientCode}"`);
  console.log(`Section filter for inquiry-style counts: SEC_CD = ${secCd}\n`);

  const row = async (sql: string, params: Record<string, unknown>) => {
    const rows = await mssqlQuery<Record<string, unknown>>(sql, params);
    return rows[0];
  };

  const mf = await row(`SELECT COUNT_BIG(*) AS n FROM PAPATMF WHERE PAT_CD = @patientCode`, {
    patientCode,
  });
  console.log(`[1] PAPATMF rows (PAT_CD = @patientCode): ${Number(mf?.n ?? 0)}`);

  const hdr = await row(`SELECT COUNT_BIG(*) AS n FROM PAJRNRCVH WHERE PAT_CD = @patientCode`, {
    patientCode,
  });
  console.log(`[2] PAJRNRCVH rows (any SEC_CD): ${Number(hdr?.n ?? 0)}`);

  const srv = await row(`SELECT COUNT_BIG(*) AS n FROM PAPAT_SRV WHERE PAT_CD = @patientCode`, {
    patientCode,
  });
  console.log(`[3] PAPAT_SRV rows (by PAT_CD on detail): ${Number(srv?.n ?? 0)}`);

  const bySec = await mssqlQuery<{ SEC_CD: number; cnt: unknown }>(
    `SELECT SEC_CD, COUNT_BIG(*) AS cnt FROM PAJRNRCVH WHERE PAT_CD = @patientCode GROUP BY SEC_CD ORDER BY SEC_CD`,
    { patientCode },
  );
  console.log("[4] PAJRNRCVH SEC_CD breakdown:");
  for (const r of bySec) {
    console.log(`    SEC_CD=${r.SEC_CD}  receipts=${Number(r.cnt)}`);
  }

  const hdrCncl = await row(
    `SELECT COUNT_BIG(*) AS n FROM PAJRNRCVH WHERE PAT_CD = @patientCode AND CNCL IS NOT NULL`,
    { patientCode },
  );
  console.log(`[5a] Headers with CNCL NOT NULL: ${Number(hdrCncl?.n ?? 0)}`);

  const srvCncl = await row(
    `SELECT COUNT_BIG(*) AS n FROM PAPAT_SRV WHERE PAT_CD = @patientCode AND CNCL IS NOT NULL`,
    { patientCode },
  );
  console.log(`[5b] Detail lines with CNCL NOT NULL: ${Number(srvCncl?.n ?? 0)}`);

  const headerOnlySec = await row(
    `
SELECT COUNT_BIG(*) AS n
FROM PAJRNRCVH h
WHERE h.PAT_CD = @patientCode
  AND h.SEC_CD = @secCd
  AND NOT EXISTS (
    SELECT 1
    FROM PAPAT_SRV s
    WHERE s.SEC_CD = h.SEC_CD
      AND s.TR_TY = h.TR_TY
      AND s.TR_NO = h.TR_NO
  )
`.trim(),
    { patientCode, secCd },
  );
  console.log(
    `[6] Headers in SEC_CD=${secCd} with NO matching PAPAT_SRV line (inner-join invisible): ${Number(headerOnlySec?.n ?? 0)}`,
  );

  console.log("\nNotes:");
  console.log("- PAT_CD is compared as a bound string parameter (no numeric coercion).");
  console.log("- Default Patient Inquiry applies a date range from URL; narrow ranges exclude older receipts.");
  console.log("- INNER JOIN receipts inquiry hides rows from [6]; patient-filtered inquiry uses LEFT JOIN.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
