-- Inspect sample PAJRNRCVH rows

SELECT TOP 5 *
FROM op2026.dbo.PAJRNRCVH
ORDER BY UPDATEDATE DESC;

-- Expected fields based on OP legacy:
-- PAT_CD (voucher) - PRIMARY KEY
-- NAM (name) - required
-- GEND (gender) - typically optional
-- MARITAL (marital status) - typically optional
-- BIRTH (birth date) - required
-- AGE (age) - computed from BIRTH
-- TEL1 (phone) - optional
-- ADDR (address) - optional
-- ENTRYDATE (entry date) - required
-- UPDATEDATE (update date) - computed/auto
