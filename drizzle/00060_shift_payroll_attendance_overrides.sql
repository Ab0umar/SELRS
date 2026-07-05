CREATE TABLE `shift_payroll_attendance_overrides` (
  `id` int AUTO_INCREMENT NOT NULL,
  `staff_id` int NOT NULL,
  `year` int NOT NULL,
  `month` int NOT NULL,
  `big_attended` int,
  `small_attended` int,
  `updated_by` int,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `shift_payroll_attendance_overrides_id` PRIMARY KEY(`id`),
  CONSTRAINT `uq_shift_payroll_override_staff_month` UNIQUE(`staff_id`,`year`,`month`)
);
