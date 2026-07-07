ALTER TABLE `visits` MODIFY COLUMN `queueStatus` ENUM('checkedIn','next','clinic','clinic1','clinic2','pentacam','treated') DEFAULT 'checkedIn';
--> statement-breakpoint
UPDATE `visits` SET `queueStatus` = 'clinic2' WHERE `queueStatus` = 'clinic' AND `clinicNo` = 2;
--> statement-breakpoint
UPDATE `visits` SET `queueStatus` = 'clinic1' WHERE `queueStatus` = 'clinic' AND (`clinicNo` = 1 OR `clinicNo` IS NULL);
--> statement-breakpoint
ALTER TABLE `visits` MODIFY COLUMN `queueStatus` ENUM('checkedIn','next','clinic1','clinic2','pentacam','treated') DEFAULT 'checkedIn';
--> statement-breakpoint
ALTER TABLE `visits` DROP COLUMN `clinicNo`;
