CREATE TABLE IF NOT EXISTS `salary_operation_fund_entries` (
  `id` int AUTO_INCREMENT NOT NULL,
  `transaction_date` date NOT NULL,
  `amount` decimal(14,2) NOT NULL,
  `doctor_name` varchar(255) NOT NULL,
  `notes` varchar(500),
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `salary_operation_fund_entries_id` PRIMARY KEY(`id`),
  INDEX `idx_operation_fund_date` (`transaction_date`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `salary_operation_fund_members` (
  `id` int AUTO_INCREMENT NOT NULL,
  `emp_cd` varchar(32) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `salary_operation_fund_members_id` PRIMARY KEY(`id`),
  CONSTRAINT `uq_operation_fund_employee` UNIQUE(`emp_cd`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `salary_eid_bonuses` (
  `id` int AUTO_INCREMENT NOT NULL,
  `title` varchar(120) NOT NULL,
  `bonus_date` date NOT NULL,
  `amount_per_employee` decimal(12,2) NOT NULL,
  `employee_count` int NOT NULL,
  `notes` varchar(500),
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `salary_eid_bonuses_id` PRIMARY KEY(`id`),
  INDEX `idx_eid_bonus_date` (`bonus_date`)
);
