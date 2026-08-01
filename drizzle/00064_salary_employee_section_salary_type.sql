ALTER TABLE `salary_employee_section_settings`
  ADD COLUMN `salary_type` varchar(32) NULL AFTER `section`;
--> statement-breakpoint
UPDATE `salary_employee_section_settings` AS `settings`
INNER JOIN `attendance_employees` AS `employees`
  ON `employees`.`emp_cd` = `settings`.`emp_cd`
SET `settings`.`salary_type` = `employees`.`salary_type`
WHERE `settings`.`salary_type` IS NULL;
