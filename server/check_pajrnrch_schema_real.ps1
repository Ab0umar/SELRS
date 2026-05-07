# PAJRNRCVH SQL Server Schema Diagnostic - Node.js Version

# Instructions:
# 1. Run: node check_pajrnrch_schema_real.js
# 2. Check output file: pajrnrch_columns.txt

# Connection Details
$Server = "localhost"
$Database = "op2026"

# Query: Get identity columns (IsIdentity = 1)
$Query1 = "SELECT COLUMN_NAME, COLUMNPROPERTY(COLUMN_NAME, 'IsIdentity')
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'op2026.dbo.PAJRNRCVH'
ORDER BY COLUMN_NAME"
