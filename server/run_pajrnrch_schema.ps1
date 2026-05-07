# PAJRNRCVH SQL Server Schema - PowerShell Diagnostic Script
# Run: powershell -ExecutionPolicy Bypass -File "check_pajrnrch_schema.ps1" -ArgumentList "-Server=localhost","-Database=op2026","-User=sa","-Password="

# SQL Server Connection Details
$Server = "localhost"
$Database = "op2026"

# Get all columns with their metadata
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
ORDER BY COLUMN_NAME"

# Count total columns
$Query2 = "SELECT COUNT(*) AS total_columns
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'op2026.dbo.PAJRNRCVH'"

# Count identity columns (IsIdentity = 1)
$Query3 = "SELECT COUNT(*) AS identity_columns
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'op2026.dbo.PAJRNRCVH'
  AND COLUMNPROPERTY(COLUMN_NAME, 'IsIdentity') = 1"

# Count computed columns (IsComputed = 1)
$Query4 = "SELECT COUNT(*) AS computed_columns
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'op2026.dbo.PAJRNRCVH'
  AND (COLUMNPROPERTY(COLUMN_NAME, 'IsComputed') = 1
   OR COLUMNPROPERTY(COLUMN_NAME, 'IsComputed') IS NULL
   OR COLUMN_NAME LIKE '%ISDT%')"

# Count NOT NULL without DEFAULT columns
$Query5 = "SELECT COUNT(*) AS not_null_no_default
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'op2026.dbo.PAJRNRCVH'
  AND IS_NULLABLE = 'NO'
  AND COLUMN_DEFAULT IS NULL"

# Sample row data
$Query6 = "SELECT TOP 3 PAT_CD, NAM, SHIFT, BIRTH, AGE, GEND, TEL1, ADDR, IDNO, PAY, DUE, DISC_VL, DRS_CD, SRV_CD, TR_NO, VST_DT, ENTRYDATE, UPDATEDATE, PAT_STS, VST_NO, ISDT, ISDT_ENTRY, ISDT_ENTRY_AM, ISDT_ENTRY_AM
FROM op2026.dbo.PAJRNRCVH
ORDER BY UPDATEDATE DESC"
