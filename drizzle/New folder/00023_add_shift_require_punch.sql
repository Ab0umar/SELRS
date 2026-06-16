ALTER TABLE `attendance_shifts`
  ADD COLUMN `require_punch` tinyint(1) NOT NULL DEFAULT 1
  AFTER `weekday_mask`;
