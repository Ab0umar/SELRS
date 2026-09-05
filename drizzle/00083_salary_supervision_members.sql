CREATE TABLE IF NOT EXISTS `salary_supervision_members` (
  `id` int AUTO_INCREMENT NOT NULL,
  `emp_cd` varchar(32) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `salary_supervision_members_id` PRIMARY KEY(`id`),
  CONSTRAINT `uq_supervision_member` UNIQUE(`emp_cd`)
);
