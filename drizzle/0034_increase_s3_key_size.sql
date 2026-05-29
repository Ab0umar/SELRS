-- Increase s3_key column size from VARCHAR(255) to VARCHAR(512)
-- This fixes "Data too long for column 's3_key'" errors during S3 migration
-- where s3_key paths like 'blackice/{large_id}/{filename}' exceed 255 chars
ALTER TABLE blackice_uploads MODIFY COLUMN s3_key VARCHAR(512);
