CREATE TABLE `afterRefractionData` (
	`id` int AUTO_INCREMENT NOT NULL,
	`examinationId` int NOT NULL,
	`patientId` int NOT NULL,
	`sphereOD` varchar(20),
	`cylinderOD` varchar(20),
	`axisOD` varchar(20),
	`sphereOS` varchar(20),
	`cylinderOS` varchar(20),
	`axisOS` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `afterRefractionData_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `doctors` (
	`id` varchar(36) NOT NULL,
	`code` varchar(64),
	`name` varchar(255),
	CONSTRAINT `doctors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `operationListItems` MODIFY COLUMN `payment` varchar(255);--> statement-breakpoint
ALTER TABLE `patients` MODIFY COLUMN `doctorId` varchar(36);--> statement-breakpoint
ALTER TABLE `operationListItems` ADD `eye` varchar(50);--> statement-breakpoint
ALTER TABLE `operationListItems` ADD `hospital` varchar(255);--> statement-breakpoint
ALTER TABLE `patients` ADD `doctorCode` varchar(64);--> statement-breakpoint
ALTER TABLE `patients` ADD `serviceCode` varchar(64);--> statement-breakpoint
ALTER TABLE `visits` ADD `queueStatus` enum('checkedIn','next','clinic','treated') DEFAULT 'checkedIn';--> statement-breakpoint
ALTER TABLE `visits` ADD `checkedInAt` timestamp;--> statement-breakpoint
ALTER TABLE `visits` ADD `movedToNextAt` timestamp;--> statement-breakpoint
ALTER TABLE `visits` ADD `movedToClinicAt` timestamp;--> statement-breakpoint
ALTER TABLE `visits` ADD `treatedAt` timestamp;--> statement-breakpoint
ALTER TABLE `afterRefractionData` ADD CONSTRAINT `afterRefractionData_examinationId_examinations_id_fk` FOREIGN KEY (`examinationId`) REFERENCES `examinations`(`id`) ON DELETE cascade ON UPDATE no action;