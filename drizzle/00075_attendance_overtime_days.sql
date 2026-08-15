CREATE TABLE IF NOT EXISTS `attendance_overtime_days` (
  `emp_cd` varchar(32) NOT NULL,
  `work_date` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`emp_cd`, `work_date`),
  KEY `idx_attendance_overtime_date` (`work_date`)
);
