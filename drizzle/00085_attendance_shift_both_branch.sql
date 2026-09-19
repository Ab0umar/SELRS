ALTER TABLE `attendance_shifts`
  MODIFY COLUMN `branch` enum('operations','center','both') NULL;
