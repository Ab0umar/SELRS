CREATE TABLE `autorefractometryData` (
	`id` int AUTO_INCREMENT NOT NULL,
	`examinationId` int NOT NULL,
	`patientId` int NOT NULL,
	`sphereOD` varchar(20),
	`cylinderOD` varchar(20),
	`axisOD` varchar(20),
	`ucvaOD` varchar(20),
	`bcvaOD` varchar(20),
	`iopOD` varchar(20),
	`sphereOS` varchar(20),
	`cylinderOS` varchar(20),
	`axisOS` varchar(20),
	`ucvaOS` varchar(20),
	`bcvaOS` varchar(20),
	`iopOS` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `autorefractometryData_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `glassesRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`examinationId` int NOT NULL,
	`patientId` int NOT NULL,
	`sOD` varchar(20),
	`cOD` varchar(20),
	`axisOD` varchar(20),
	`pdOD` varchar(20),
	`addOD` varchar(20),
	`bcvaOD` varchar(20),
	`sOS` varchar(20),
	`cOS` varchar(20),
	`axisOS` varchar(20),
	`pdOS` varchar(20),
	`addOS` varchar(20),
	`bcvaOS` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `glassesRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `autorefractometryData` ADD CONSTRAINT `autorefractometryData_examinationId_examinations_id_fk` FOREIGN KEY (`examinationId`) REFERENCES `examinations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `glassesRecords` ADD CONSTRAINT `glassesRecords_examinationId_examinations_id_fk` FOREIGN KEY (`examinationId`) REFERENCES `examinations`(`id`) ON DELETE cascade ON UPDATE no action;