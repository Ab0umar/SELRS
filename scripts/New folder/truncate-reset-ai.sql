-- Reset AUTO_INCREMENT to 1 by truncating patients table

-- Step 1: Disable foreign key checks
SET FOREIGN_KEY_CHECKS = 0;

-- Step 2: TRUNCATE patients table (this resets AUTO_INCREMENT to 1)
TRUNCATE TABLE patients;

-- Step 3: Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Step 4: Verify AUTO_INCREMENT is now 1
SELECT AUTO_INCREMENT FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'patients';

-- Step 5: Verify patients table is empty
SELECT COUNT(*) as patient_count FROM patients;
