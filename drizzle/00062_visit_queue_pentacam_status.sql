ALTER TABLE `visits` MODIFY COLUMN `queueStatus` ENUM('checkedIn','next','clinic','pentacam','treated') DEFAULT 'checkedIn';
--> statement-breakpoint
ALTER TABLE `visits` ADD COLUMN `movedToPentacamAt` timestamp NULL;
