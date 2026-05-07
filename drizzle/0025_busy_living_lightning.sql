CREATE TABLE `examination_checklist_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`examinationId` int NOT NULL,
	`patientId` int NOT NULL,
	`generalDiseases` boolean DEFAULT false,
	`pregnancyOrLactation` boolean DEFAULT false,
	`usesAllergySupplementsSteroidsOrPressureMeds` boolean DEFAULT false,
	`acneTreatment` boolean DEFAULT false,
	`familyKeratoconus` boolean DEFAULT false,
	`usesTearSubstituteOrExcessTearsOrSandySensation` boolean DEFAULT false,
	`symptomsWorseWithAirOrAC` boolean DEFAULT false,
	`glaucomaTreatment` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `examination_checklist_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `ux_exam_checklist` UNIQUE(`examinationId`)
);
--> statement-breakpoint
CREATE TABLE `operationBookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingDate` date NOT NULL,
	`weekdayLabel` varchar(80),
	`bookingTime` varchar(20) NOT NULL,
	`doctorName` varchar(255) NOT NULL,
	`operationType` varchar(100) NOT NULL,
	`casesCount` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `operationBookings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` varchar(36) NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(255),
	`serviceType` varchar(64) NOT NULL,
	`srvTyp` varchar(4),
	`defaultSheet` varchar(64),
	`locationType` varchar(32) DEFAULT 'center',
	`price` decimal(10,2) NOT NULL DEFAULT '0',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `services_id` PRIMARY KEY(`id`),
	CONSTRAINT `services_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `visit_schedule_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fullName` varchar(255) NOT NULL,
	`age` int,
	`visitDate` date NOT NULL,
	`phone` varchar(32),
	`service` varchar(128) NOT NULL,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `visit_schedule_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `doctors` ADD `isActive` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `doctors` ADD `locationType` varchar(32) DEFAULT 'center';--> statement-breakpoint
ALTER TABLE `doctors` ADD `doctorType` varchar(32) DEFAULT 'consultant';--> statement-breakpoint
ALTER TABLE `doctors` ADD `createdAt` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `doctors` ADD `updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `medications` ADD `stockPieces` int;--> statement-breakpoint
ALTER TABLE `medications` ADD `inventoryStatus` enum('available','out_of_stock','reserved');--> statement-breakpoint
ALTER TABLE `tests` ADD `priceEgp` varchar(32);--> statement-breakpoint
ALTER TABLE `tests` ADD `durationMinutes` int;--> statement-breakpoint
ALTER TABLE `tests` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `examination_checklist_items` ADD CONSTRAINT `examination_checklist_items_examinationId_examinations_id_fk` FOREIGN KEY (`examinationId`) REFERENCES `examinations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_operation_booking_date` ON `operationBookings` (`bookingDate`);--> statement-breakpoint
CREATE INDEX `idx_visit_schedule_requests_visitDate` ON `visit_schedule_requests` (`visitDate`);