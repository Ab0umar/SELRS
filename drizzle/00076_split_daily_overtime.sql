ALTER TABLE `attendance_daily`
  ADD COLUMN `overtime_in_minutes` int NOT NULL DEFAULT 0 AFTER `early_leave_min`,
  ADD COLUMN `overtime_out_minutes` int NOT NULL DEFAULT 0 AFTER `overtime_in_minutes`;
--> statement-breakpoint

ALTER TABLE `attendance_overtime_days`
  ADD COLUMN `in_enabled` boolean NOT NULL DEFAULT false AFTER `work_date`,
  ADD COLUMN `out_enabled` boolean NOT NULL DEFAULT false AFTER `in_enabled`;
--> statement-breakpoint

UPDATE `attendance_overtime_days`
SET `in_enabled` = true, `out_enabled` = true;
--> statement-breakpoint

ALTER TABLE `attendance_shifts`
  ADD COLUMN `allow_ot_in` boolean NOT NULL DEFAULT false AFTER `allow_ot`,
  ADD COLUMN `allow_ot_out` boolean NOT NULL DEFAULT false AFTER `allow_ot_in`;
--> statement-breakpoint

UPDATE `attendance_shifts`
SET `allow_ot_in` = `allow_ot`, `allow_ot_out` = `allow_ot`;
