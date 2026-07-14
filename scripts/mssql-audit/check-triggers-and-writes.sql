-- Read-only diagnostic audit for SRV100_Acc's MSSQL write paths.
-- Safe to run in production: SELECT-only, touches no data.
--
-- Purpose: PAPAT_SRV was found to have an enabled trigger that broke a bare
-- OUTPUT clause on INSERT (fixed in code). This script checks every table
-- the app actually writes to for the same risk, plus a few adjacent things
-- worth confirming while we're here (identity columns, computed columns,
-- check constraints) since those can each break assumptions the insert code
-- makes about which columns it's safe to write to directly.

-- 1) Enabled triggers on every table this app INSERTs/UPDATEs into.
--    If any of these (besides PAPAT_SRV, already fixed) shows a row here,
--    check whether that table's INSERT code uses a bare OUTPUT clause.
SELECT
  t.name          AS TableName,
  tr.name         AS TriggerName,
  tr.is_disabled  AS TriggerDisabled,
  CASE WHEN tr.is_disabled = 0 THEN 'ENABLED - blocks bare OUTPUT clause' ELSE 'disabled - safe' END AS Risk
FROM sys.triggers tr
JOIN sys.tables t ON tr.parent_id = t.object_id
WHERE t.name IN ('PAPAT_SRV', 'PAJRNRCVH', 'PAPATMF', 'PAPAT_IO')
ORDER BY t.name, tr.name;

-- 2) Identity columns on those same tables — if the app's INSERT column list
--    ever explicitly includes an identity column, that INSERT would fail.
SELECT
  t.name AS TableName,
  c.name AS IdentityColumn
FROM sys.identity_columns c
JOIN sys.tables t ON c.object_id = t.object_id
WHERE t.name IN ('PAPAT_SRV', 'PAJRNRCVH', 'PAPATMF', 'PAPAT_IO')
ORDER BY t.name;

-- 3) Computed columns — same concern, a computed column can't be targeted
--    by an explicit INSERT column list either.
SELECT
  t.name AS TableName,
  c.name AS ComputedColumn,
  c.definition AS ComputedAs
FROM sys.computed_columns c
JOIN sys.tables t ON c.object_id = t.object_id
WHERE t.name IN ('PAPAT_SRV', 'PAJRNRCVH', 'PAPATMF', 'PAPAT_IO')
ORDER BY t.name;

-- 4) CHECK constraints — could reject a row the app tries to insert (e.g. a
--    QTY > 0 constraint, or a TR_TY IN (1,5,6,8) constraint) with an error
--    the app would now at least log (after today's logging fix), but good
--    to know about proactively rather than by trial and error.
SELECT
  t.name AS TableName,
  cc.name AS ConstraintName,
  cc.definition AS Definition,
  cc.is_disabled AS Disabled
FROM sys.check_constraints cc
JOIN sys.tables t ON cc.parent_object_id = t.object_id
WHERE t.name IN ('PAPAT_SRV', 'PAJRNRCVH', 'PAPATMF', 'PAPAT_IO')
ORDER BY t.name;

-- 5) Foreign keys pointing INTO these tables or OUT of them — a write that
--    violates one would fail with a clear FK error (now logged), but worth
--    seeing the shape of what's enforced.
SELECT
  fk.name AS ForeignKeyName,
  tp.name AS ParentTable,
  tr.name AS ReferencedTable,
  fk.is_disabled AS Disabled
FROM sys.foreign_keys fk
JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
JOIN sys.tables tr ON fk.referenced_object_id = tr.object_id
WHERE tp.name IN ('PAPAT_SRV', 'PAJRNRCVH', 'PAPATMF', 'PAPAT_IO')
   OR tr.name IN ('PAPAT_SRV', 'PAJRNRCVH', 'PAPATMF', 'PAPAT_IO')
ORDER BY tp.name;
