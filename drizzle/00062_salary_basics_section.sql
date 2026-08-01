ALTER TABLE `salary_basics`
  ADD COLUMN `section` varchar(32) NOT NULL DEFAULT 'مركز' AFTER `emp_cd`,
  ADD INDEX `idx_salary_emp_section` (`emp_cd`, `section`);

--> statement-breakpoint
UPDATE `salary_basics` sb
INNER JOIN `attendance_employees` ae ON ae.`emp_cd` = sb.`emp_cd`
SET sb.`section` = 'عيادة'
WHERE ae.`department` IN ('عيادة', 'clinic');
