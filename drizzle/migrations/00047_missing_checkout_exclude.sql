CREATE TABLE `salary_missing_checkout_exclude` (
  `id` int NOT NULL AUTO_INCREMENT,
  `emp_cd` varchar(32) NOT NULL,
  `work_date` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_mc_exclude` (`emp_cd`, `work_date`)
);
