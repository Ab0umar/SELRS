-- Fix attendance_leave_balances: add id PK + timestamps, change PK to unique index
ALTER TABLE `attendance_leave_balances`
  ADD COLUMN `id` int NOT NULL AUTO_INCREMENT FIRST,
  ADD COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `carry_over`,
  ADD COLUMN `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `createdAt`,
  DROP PRIMARY KEY,
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_leave_bal_emp_year` (`emp_cd`, `year`);

-- Remove outdated updated_at (replaced by updatedAt)
ALTER TABLE `attendance_leave_balances`
  DROP COLUMN `updated_at`;

-- Fix attendance_permissions: rename type column (enum column name mismatch) + add timestamps
ALTER TABLE `attendance_permissions`
  CHANGE COLUMN `type` `perm_type` enum('in','out') NOT NULL,
  ADD COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `note`,
  ADD COLUMN `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `createdAt`;

-- Rename created_at → drop it (createdAt added above already)
ALTER TABLE `attendance_permissions`
  DROP COLUMN `created_at`;
