CREATE TABLE IF NOT EXISTS `attendance_leave_balances` (
  `id` int NOT NULL AUTO_INCREMENT,
  `emp_cd` varchar(32) NOT NULL,
  `year` int NOT NULL,
  `annual_allocation` int NOT NULL DEFAULT 21,
  `carry_over` int NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_leave_bal_emp_year` (`emp_cd`, `year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `attendance_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `emp_cd` varchar(32) NOT NULL,
  `date` date NOT NULL,
  `perm_type` enum('in','out') NOT NULL,
  `duration_minutes` int NOT NULL,
  `approved` tinyint(1) NOT NULL DEFAULT 0,
  `note` varchar(255),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_perm_emp_date` (`emp_cd`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
