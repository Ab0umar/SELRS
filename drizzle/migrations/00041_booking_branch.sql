ALTER TABLE `booking_schedule_config` ADD COLUMN `branch` VARCHAR(20) NOT NULL DEFAULT '';
--> statement-breakpoint
DROP INDEX `idx_booking_schedule_type` ON `booking_schedule_config`;
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_booking_schedule_type_branch` ON `booking_schedule_config` (`bookingType`, `branch`);
--> statement-breakpoint
ALTER TABLE `booking_closures` ADD COLUMN `branch` VARCHAR(20) NULL;
--> statement-breakpoint
ALTER TABLE `patient_portal_bookings` ADD COLUMN `branch` VARCHAR(20) NULL;
