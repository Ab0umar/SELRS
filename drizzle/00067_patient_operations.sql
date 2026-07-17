CREATE TABLE `patientOperations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`operationType` varchar(50) NOT NULL,
	`operationDate` date,
	`source` enum('sheet','surgery','followup','manual') NOT NULL DEFAULT 'manual',
	`sourceRef` varchar(128) NOT NULL,
	`doctorCode` varchar(64),
	`eye` varchar(16),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `patientOperations_id` PRIMARY KEY(`id`),
	CONSTRAINT `patientOperations_sourceRef_unique` UNIQUE(`sourceRef`)
);
--> statement-breakpoint
CREATE INDEX `idx_patientops_type` ON `patientOperations` (`operationType`,`operationDate`);
--> statement-breakpoint
CREATE INDEX `idx_patientops_patient` ON `patientOperations` (`patientId`,`operationDate`);
