CREATE TABLE `salary_employee_section_settings` (
  `emp_cd` varchar(32) NOT NULL,
  `section` varchar(32) NOT NULL,
  `attendance_commission_rate` decimal(5,4) NULL,
  `attendance_leave_multiplier` decimal(5,4) NULL,
  `comm_attendance` boolean NOT NULL DEFAULT true,
  `comm_exam` boolean NOT NULL DEFAULT true,
  `comm_pentacam` boolean NOT NULL DEFAULT true,
  `comm_day10` boolean NOT NULL DEFAULT true,
  `comm_overtime` boolean NOT NULL DEFAULT true,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`emp_cd`, `section`)
);
