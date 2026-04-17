-- Add locationType column to services table
ALTER TABLE services ADD COLUMN locationType VARCHAR(50) COMMENT 'center or external';

-- Add index on locationType
ALTER TABLE services ADD INDEX idx_service_location (locationType);
