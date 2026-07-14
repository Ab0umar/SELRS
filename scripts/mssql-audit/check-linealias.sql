SELECT TOP 5
  1 AS grp,
  h.SEC_CD AS secCd,
  RTRIM(LTRIM(CONVERT(VARCHAR(40), h.PAT_CD))) AS patientCode,
  h.NAM AS patientName,
  h.TR_NO AS trNo,
  h.TR_DT AS trDate,
  h.TR_TY AS trTy,
  h.SHFT AS shiftCode,
  s.CA_CD AS companyCode,
  s.DISC_VL AS lineDiscount,
  s.SRV_CD AS serviceCode,
  s.LN_NO AS lineNumber,
  s.SRV_BY1 AS doctorCode,
  s.QTY AS quantity,
  ISNULL(s.QTY, 0) * ISNULL(s.PRC, 0) AS price,
  h.TOTL AS receiptTotal,
  ISNULL(s.QTY, 0) * ISNULL(s.PRC, 0) AS lineGross,
  ISNULL(s.PA_VL, 0) - ISNULL(s.DISC_VL, 0) AS linePaid,
  ISNULL(s.CA_VL, 0) - ISNULL(s.DISC_CA, 0) AS companyValue
FROM PAJRNRCVH h
JOIN PAPAT_SRV s
  ON h.SEC_CD = s.SEC_CD
 AND h.TR_TY = s.TR_TY
 AND h.TR_NO = s.TR_NO
WHERE h.SEC_CD = 15
  AND h.TR_TY = 1
  AND h.TR_NO = 3192
  AND ISNULL(CONVERT(varchar(10), s.CNCL), '0') IN ('', '0');
