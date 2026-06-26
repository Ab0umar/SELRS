ALTER TABLE `attendance_shifts` ADD COLUMN `ot_min_minutes` int NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `attendance_shifts` ADD COLUMN `ot_max_minutes` int NOT NULL DEFAULT 0;
