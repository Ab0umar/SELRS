ALTER TABLE `attendance_shifts`
  ADD COLUMN `ot_min_in_minutes` int NOT NULL DEFAULT 0 AFTER `ot_min_minutes`,
  ADD COLUMN `ot_min_out_minutes` int NOT NULL DEFAULT 0 AFTER `ot_min_in_minutes`;
--> statement-breakpoint
UPDATE `attendance_shifts`
SET `ot_min_in_minutes` = `ot_min_minutes`,
    `ot_min_out_minutes` = `ot_min_minutes`;
