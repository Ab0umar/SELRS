ALTER TABLE `attendance_shifts`
  ADD COLUMN `branch` enum('operations','center') NULL AFTER `name`,
  ADD COLUMN `device_id` varchar(64) NULL AFTER `branch`,
  ADD INDEX `idx_attendance_shift_branch_device` (`branch`, `device_id`);
