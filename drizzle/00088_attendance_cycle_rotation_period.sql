ALTER TABLE `attendance_shift_cycles`
  MODIFY COLUMN `period` enum('day','week','month','rotation') NOT NULL;
