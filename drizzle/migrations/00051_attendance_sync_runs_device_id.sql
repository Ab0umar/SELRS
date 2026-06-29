ALTER TABLE `attendance_sync_runs` ADD COLUMN `device_id` varchar(64) NULL;
--> statement-breakpoint
CREATE INDEX `idx_device_id` ON `attendance_sync_runs` (`device_id`);
