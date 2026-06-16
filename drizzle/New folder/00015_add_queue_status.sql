ALTER TABLE visits ADD COLUMN queueStatus ENUM('checkedIn', 'next', 'clinic', 'treated') DEFAULT 'checkedIn';--> statement-breakpoint
ALTER TABLE visits ADD COLUMN checkedInAt TIMESTAMP NULL;--> statement-breakpoint
ALTER TABLE visits ADD COLUMN movedToNextAt TIMESTAMP NULL;--> statement-breakpoint
ALTER TABLE visits ADD COLUMN movedToClinicAt TIMESTAMP NULL;--> statement-breakpoint
ALTER TABLE visits ADD COLUMN treatedAt TIMESTAMP NULL;--> statement-breakpoint
