CREATE TABLE `referralLetters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`refCode` varchar(32),
	`examDate` date,
	`refractionOD` varchar(64),
	`refractionOS` varchar(64),
	`vaOD` varchar(32),
	`vaOS` varchar(32),
	`vaBestOD` varchar(32),
	`vaBestOS` varchar(32),
	`iopOD` varchar(16),
	`iopOS` varchar(16),
	`slitLamp` text,
	`fundus` text,
	`diagnosisTags` text,
	`reasonForReferral` text,
	`referredPhysician` varchar(255),
	`referredPhysicianTitle` varchar(255),
	`referredFacility` varchar(255),
	`referredDept` varchar(255),
	`physicianName` varchar(255),
	`physicianTitle` varchar(255),
	`physicianLicense` varchar(64),
	`patientNameOverride` varchar(255),
	`patientCodeOverride` varchar(64),
	`patientDobOverride` date,
	`patientGenderOverride` varchar(16),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `referralLetters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `postOpOffdaysCertificates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`operationDate` date,
	`method` varchar(255),
	`vaOD` varchar(32),
	`vaOS` varchar(32),
	`leaveStart` date,
	`returnDate` date,
	`durationDays` int,
	`doctorName` varchar(255),
	`patientNameOverride` varchar(255),
	`patientCodeOverride` varchar(64),
	`patientDobOverride` date,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `postOpOffdaysCertificates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `doctorReports` ADD `patientNameOverride` varchar(255);
--> statement-breakpoint
ALTER TABLE `doctorReports` ADD `patientCodeOverride` varchar(64);
--> statement-breakpoint
ALTER TABLE `doctorReports` ADD `patientDobOverride` date;
--> statement-breakpoint
ALTER TABLE `doctorReports` ADD `patientGenderOverride` varchar(16);
--> statement-breakpoint
ALTER TABLE `surgeries` ADD `patientNameOverride` varchar(255);
--> statement-breakpoint
ALTER TABLE `surgeries` ADD `patientCodeOverride` varchar(64);
--> statement-breakpoint
ALTER TABLE `surgeries` ADD `patientDobOverride` date;
--> statement-breakpoint
ALTER TABLE `surgeries` ADD `patientGenderOverride` varchar(16);
