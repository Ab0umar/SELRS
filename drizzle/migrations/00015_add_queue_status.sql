ALTER TABLE visits ADD COLUMN queueStatus ENUM('checkedIn', 'next', 'clinic', 'treated') DEFAULT 'checkedIn';
ALTER TABLE visits ADD COLUMN checkedInAt TIMESTAMP NULL;
ALTER TABLE visits ADD COLUMN movedToNextAt TIMESTAMP NULL;
ALTER TABLE visits ADD COLUMN movedToClinicAt TIMESTAMP NULL;
ALTER TABLE visits ADD COLUMN treatedAt TIMESTAMP NULL;
