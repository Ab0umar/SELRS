CREATE TABLE `followupItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`followupSheetId` int NOT NULL,
	`tableIndex` int NOT NULL,
	`followupDate` timestamp,
	`followupName` varchar(255),
	`vaOD` varchar(50),
	`vaOS` varchar(50),
	`refracOD` text,
	`refracOS` text,
	`flapOD` text,
	`flapOS` text,
	`iopOD` varchar(50),
	`iopOS` varchar(50),
	`treatment` text,
	`notes` text,
	`rightEye` boolean DEFAULT false,
	`leftEye` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `followupItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `followupSheets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`sheetType` enum('consultant','specialist','lasik','external') NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `followupSheets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_followup_sheet_table` ON `followupItems` (`followupSheetId`,`tableIndex`);--> statement-breakpoint
CREATE INDEX `idx_followup_patient_type` ON `followupSheets` (`patientId`,`sheetType`);--> statement-breakpoint
ALTER TABLE `examinations` DROP COLUMN `fundusData`;