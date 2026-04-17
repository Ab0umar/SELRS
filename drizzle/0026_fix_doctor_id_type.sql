-- Fix patients.doctorId column type from int to varchar(36) to support UUID doctor IDs
ALTER TABLE `patients` MODIFY COLUMN `doctorId` varchar(36) NULL;
