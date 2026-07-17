ALTER TABLE `medicalConditionReports` ADD COLUMN `operationType` varchar(100);
--> statement-breakpoint
ALTER TABLE `medicalConditionReports` ADD COLUMN `operationDate` date;
--> statement-breakpoint
ALTER TABLE `medicalConditionReports` ADD COLUMN `includeCurrentStatus` boolean DEFAULT true;
