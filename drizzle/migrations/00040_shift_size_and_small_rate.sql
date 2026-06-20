ALTER TABLE `attendance_shifts` ADD COLUMN `shift_size` varchar(8) NOT NULL DEFAULT 'auto';
--> statement-breakpoint
ALTER TABLE `attendance_shifts` ADD COLUMN `auto_small_threshold_min` int NOT NULL DEFAULT 270;
--> statement-breakpoint
ALTER TABLE `shift_staff` ADD COLUMN `rate_small_shift` decimal(10,2) NOT NULL DEFAULT '0.00';
