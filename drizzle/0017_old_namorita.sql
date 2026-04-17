CREATE TABLE `patient_import_staging` (
	`id` int AUTO_INCREMENT NOT NULL,
	`batchId` varchar(64) NOT NULL,
	`rowNumber` int NOT NULL,
	`patientCode` varchar(50),
	`fullName` varchar(255),
	`dateOfBirthRaw` varchar(64),
	`dateOfBirth` date,
	`gender` enum('male','female'),
	`phone` varchar(20),
	`address` text,
	`branch` enum('examinations','surgery') DEFAULT 'examinations',
	`serviceType` enum('consultant','specialist','lasik','surgery','external'),
	`locationType` enum('center','external'),
	`doctorCode` varchar(64),
	`doctorId` int,
	`status` enum('pending','valid','invalid','applied') NOT NULL DEFAULT 'pending',
	`errors` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `patient_import_staging_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patientServiceEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`serviceCode` varchar(64) NOT NULL,
	`serviceName` varchar(255),
	`source` enum('mssql','manual','import') NOT NULL DEFAULT 'mssql',
	`sourceRef` varchar(128) NOT NULL,
	`serviceDate` date,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `patientServiceEntries_id` PRIMARY KEY(`id`),
	CONSTRAINT `patientServiceEntries_sourceRef_unique` UNIQUE(`sourceRef`)
);
--> statement-breakpoint
CREATE TABLE `push_device_registrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` enum('fcm') NOT NULL DEFAULT 'fcm',
	`platform` enum('android','ios','web') NOT NULL,
	`token` varchar(512) NOT NULL,
	`deviceId` varchar(191),
	`appVersion` varchar(64),
	`build` varchar(64),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	`disabledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `push_device_registrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `ux_push_device_registrations_token` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `examinations` ADD `glassesData` text;--> statement-breakpoint
ALTER TABLE `examinations` ADD `radiologyLabsNotes` text;--> statement-breakpoint
ALTER TABLE `patients` ADD `doctorId` int;--> statement-breakpoint
ALTER TABLE `pentacamResults` ADD `k1OD` varchar(20);--> statement-breakpoint
ALTER TABLE `pentacamResults` ADD `k2OD` varchar(20);--> statement-breakpoint
ALTER TABLE `pentacamResults` ADD `axisOD` varchar(20);--> statement-breakpoint
ALTER TABLE `pentacamResults` ADD `thinnestPointOD` varchar(20);--> statement-breakpoint
ALTER TABLE `pentacamResults` ADD `k1OS` varchar(20);--> statement-breakpoint
ALTER TABLE `pentacamResults` ADD `k2OS` varchar(20);--> statement-breakpoint
ALTER TABLE `pentacamResults` ADD `axisOS` varchar(20);--> statement-breakpoint
ALTER TABLE `pentacamResults` ADD `thinnestPointOS` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `shift` int DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_patient_service_date` ON `patientServiceEntries` (`patientId`,`serviceCode`,`serviceDate`);--> statement-breakpoint
CREATE INDEX `idx_service_source_updated` ON `patientServiceEntries` (`source`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `idx_push_device_user_device` ON `push_device_registrations` (`userId`,`deviceId`);--> statement-breakpoint
CREATE INDEX `idx_push_device_active_user` ON `push_device_registrations` (`userId`,`disabledAt`,`lastSeenAt`);--> statement-breakpoint
CREATE INDEX `idx_operation_list_number` ON `operationListItems` (`listId`,`number`);--> statement-breakpoint
CREATE INDEX `idx_patient_page_updated` ON `patientPageStates` (`patientId`,`page`,`updatedAt`);