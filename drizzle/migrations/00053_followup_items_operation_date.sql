ALTER TABLE `followupItems` ADD COLUMN `operationDate` timestamp;
--> statement-breakpoint
ALTER TABLE `followupItems` ADD COLUMN `operationType` varchar(50);
