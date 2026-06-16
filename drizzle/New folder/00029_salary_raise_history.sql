CREATE TABLE IF NOT EXISTS `salary_raise_history` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `emp_cd` varchar(32) NOT NULL,
  `year` int NOT NULL,
  `raise_amount` decimal(12,2) NOT NULL,
  `notes` varchar(255),
  `created_at` timestamp NOT NULL DEFAULT (now()),
  UNIQUE INDEX `uq_raise_emp_year` (`emp_cd`, `year`),
  INDEX `idx_raise_emp` (`emp_cd`)
);
