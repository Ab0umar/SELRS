CREATE TABLE `salary_supervision_bonus` (
  `id` int NOT NULL AUTO_INCREMENT,
  `emp_cd` varchar(32) NOT NULL,
  `year` int NOT NULL,
  `month` int NOT NULL,
  `section` varchar(32) NOT NULL DEFAULT 'مركز',
  `amount` decimal(12,2) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_supervision_bonus` (`emp_cd`, `year`, `month`, `section`)
);
