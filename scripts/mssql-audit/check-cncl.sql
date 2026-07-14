SELECT c.name, ty.name AS DataType, c.max_length, c.is_nullable
FROM sys.columns c
JOIN sys.tables t ON c.object_id = t.object_id
JOIN sys.types ty ON c.user_type_id = ty.user_type_id
WHERE t.name = 'PAPAT_SRV' AND c.name = 'CNCL';

SELECT TOP 20 CNCL, COUNT(*) AS cnt
FROM op2026.dbo.PAPAT_SRV
GROUP BY CNCL;
