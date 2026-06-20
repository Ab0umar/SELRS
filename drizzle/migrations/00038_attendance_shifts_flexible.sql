ALTER TABLE `attendance_shifts` ADD COLUMN `is_flexible` boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE `attendance_shifts` ADD COLUMN `flex_in_from` varchar(8);
--> statement-breakpoint
ALTER TABLE `attendance_shifts` ADD COLUMN `flex_in_to` varchar(8);
--> statement-breakpoint
ALTER TABLE `attendance_shifts` ADD COLUMN `flex_out_from` varchar(8);
--> statement-breakpoint
ALTER TABLE `attendance_shifts` ADD COLUMN `flex_out_to` varchar(8);
