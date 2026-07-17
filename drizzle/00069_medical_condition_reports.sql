CREATE TABLE `medicalConditionReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`reportDate` date,
	`condition` text,
	`vaOD` varchar(32),
	`vaOS` varchar(32),
	`complications` text,
	`followUpPlan` text,
	`doctorName` varchar(255),
	`patientNameOverride` varchar(255),
	`patientCodeOverride` varchar(64),
	`patientDobOverride` date,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `medicalConditionReports_id` PRIMARY KEY(`id`)
);
