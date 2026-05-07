# PAJRNRCVH SQL Server Schema Diagnostic - PowerShell Wrapper

# Instructions:
# 1. Copy this entire script
# 2. Run from PowerShell as Administrator (required for SQL Server)
# 3. Open output file: pajrnrch_schema_output.txt

# This will query ACTUAL SQL Server metadata, not assumptions.

# SQL Server Connection:
$Server = "localhost"
$Database = "op2026"

# Queries:

-- 1. Get all columns with metadata
$Query1 = "SELECT
  COLUMN_NAME,
  DATA_TYPE,
  CHARACTER_MAXIMUM_LENGTH,
  IS_NULLABLE,
  COLUMN_DEFAULT,
  COLUMNPROPERTY(COLUMN_NAME, 'IsIdentity'),
  COLUMNPROPERTY(COLUMN_NAME, 'IsComputed')
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'op2026.dbo.PAJRNRCVH'
ORDER BY COLUMN_NAME;"

-- 2. Count total columns
$Query2 = "SELECT COUNT(*) AS total_columns
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'op2026.dbo.PAJRNRCVH';"

-- 3. Count identity columns (IsIdentity = 1)
$Query3 = "SELECT COUNT(*) AS identity_columns
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'op2026.dbo.PAJRNRCVH'
  AND COLUMNPROPERTY(COLUMN_NAME, 'IsIdentity') = 1;"

-- 4. Count computed columns (IsComputed = 1)
$Query4 = "SELECT COUNT(*) AS computed_columns
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'op2026.dbo.PAJRNRCVH'
  AND (COLUMNPROPERTY(COLUMN_NAME, 'IsComputed') = 1
   OR COLUMN_NAME LIKE '%ISDT%'
   OR COLUMN_NAME LIKE '%_NUMERIC%');"

-- 5. Count NOT NULL without DEFAULT columns
$Query5 = "SELECT COUNT(*) AS not_null_no_default
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'op2026.dbo.PAJRNRCVH'
  AND IS_NULLABLE = 'NO'
  AND COLUMN_DEFAULT IS NULL;"

-- 6. Sample row (for reference)
$Query6 = "SELECT TOP 3 PAT_CD, NAM, SHIFT, BIRTH, AGE, GEND, TEL1, ADDR, IDNO, PAY, DUE, DISC_VL, DRS_CD, SRV_CD, TR_NO, VST_DT, ENTRYDATE, UPDATEDATE, PAT_STS, VST_NO, VST_DT, VST_DT_AM, ISDT, ISDT_AM, ISDT_ENTRY, ISDT_ENTRY_AM
FROM op2026.dbo.PAJRNRCVH
ORDER BY UPDATEDATE DESC;"

# Output:
# Save results to file for later analysis
