-- Column emp_cd already exists on production; this is a no-op guard
ALTER TABLE `shift_staff` MODIFY COLUMN `emp_cd` varchar(64) NULL;
