-- Check if PAJRNRCVH table matches legacy OP expectations

-- 1. Check for NOT NULL constraint on key columns
-- Legacy OP requires PAT_CD, NAM1-3, and others to be NOT NULL (no empty PK)

SELECT
  COUNT(*) AS total_rows,
  SUM(CASE WHEN PAT_CD IS NULL THEN 1 ELSE 0 END) AS missing_required_key
FROM op2026.dbo.PAJRNRCVH;

-- 2. Check which columns are NOT NULLABLE (identity columns)
-- Identity columns should NOT be manually filled unless explicitly required by business logic

SELECT
  COLUMN_NAME,
  COLUMNPROPERTY(Column_Name, 'IsIdentity'),
  IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'op2026.dbo.PAJRNRCVH'
  AND COLUMNPROPERTY(Column_Name, 'IsIdentity') = 1;

-- 3. Check which columns have DEFAULT constraints
-- Default values are set by DB and should not be overridden unless necessary

SELECT
  COLUMN_NAME,
  COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'op2026.dbo.PAJRNRCVH'
  AND COLUMN_DEFAULT IS NOT NULL;

-- 4. Sample existing PAJRNRCVH rows to understand field patterns
-- Check first 10 rows for reference

SELECT TOP 10 *
FROM op2026.dbo.PAJRNRCVH
ORDER BY UPDATEDATE DESC;

-- 5. Check computed column types
-- ISDATE, ISDT_ENTRY should be computed (have DT logic)
-- TR_NO, PRNTD should be identity columns

SELECT
  COLUMN_NAME,
  DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'op2026.dbo.PAJRNRCVH'
  AND COLUMN_NAME IN ('ISDATE', 'ISDT_ENTRY', 'TR_NO', 'PRNTD')
ORDER BY COLUMN_NAME;

-- 6. Get column list for insert validation
SELECT
  COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'op2026.dbo.PAJRNRCVH'
ORDER BY ORDINAL_POSITION;
