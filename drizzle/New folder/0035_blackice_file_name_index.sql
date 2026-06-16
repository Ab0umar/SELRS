-- Add index on file_name so UPDATE/SELECT WHERE file_name IN (...) uses an index lookup
-- instead of a full-table scan on blackice_uploads (which stores large file_data BLOBs).
ALTER TABLE blackice_uploads ADD INDEX idx_file_name (file_name(255));
