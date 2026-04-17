-- Truncate patients table (resets AUTO_INCREMENT to 1)
TRUNCATE TABLE patients;

-- Verify AUTO_INCREMENT is reset
SELECT AUTO_INCREMENT FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'patients';

-- View current state
SELECT COUNT(*) as total, MIN(id) as min_id, MAX(id) as max_id FROM patients;
