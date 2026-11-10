ALTER TABLE `attendance_leaves`
  MODIFY COLUMN `type` enum('annual','sick','salary','unpaid','other','paid') NOT NULL;
