ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','doctor','nurse','technician','reception','manager','accountant','worker','supervisor') NOT NULL DEFAULT 'reception';
