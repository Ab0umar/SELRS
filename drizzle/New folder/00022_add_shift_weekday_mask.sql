ALTER TABLE `attendance_shifts`
  ADD COLUMN `weekday_mask` int NOT NULL DEFAULT 62
  AFTER `break_minutes`;
