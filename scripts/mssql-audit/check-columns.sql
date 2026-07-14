SELECT
  t.name AS TableName,
  c.name AS ColumnName,
  ty.name AS DataType,
  c.max_length,
  c.is_nullable,
  c.is_identity
FROM sys.columns c
JOIN sys.tables t ON c.object_id = t.object_id
JOIN sys.types ty ON c.user_type_id = ty.user_type_id
WHERE t.name IN ('PAPAT_SRV', 'PAJRNRCVH', 'PAPATMF', 'PAPAT_IO', 'SRVCMF', 'SRVLSTD')
ORDER BY t.name, c.column_id;
