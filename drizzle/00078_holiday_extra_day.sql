ALTER TABLE `attendance_overtime_days`
  ADD COLUMN `extra_day_enabled` boolean NOT NULL DEFAULT false AFTER `out_enabled`;
