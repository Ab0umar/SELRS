CREATE TABLE `visitComplaints` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `patientId` int NOT NULL,
  `visitId` int NOT NULL,
  `doctorId` int NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `complaint` text NULL,
  UNIQUE KEY `uq_visit_complaint` (`visitId`)
);
--> statement-breakpoint
CREATE TABLE `visitSymptoms` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `patientId` int NOT NULL,
  `visitId` int NOT NULL,
  `doctorId` int NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `symptoms` text NULL,
  UNIQUE KEY `uq_visit_symptoms` (`visitId`)
);
--> statement-breakpoint
CREATE TABLE `visitDiagnoses` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `patientId` int NOT NULL,
  `visitId` int NOT NULL,
  `doctorId` int NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `diagnosis` text NULL,
  UNIQUE KEY `uq_visit_diagnosis` (`visitId`)
);
--> statement-breakpoint
CREATE TABLE `visitDiagnosisCodes` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `patientId` int NOT NULL,
  `visitId` int NOT NULL,
  `diseaseId` int NOT NULL,
  UNIQUE KEY `uq_visit_disease` (`visitId`, `diseaseId`)
);
--> statement-breakpoint
CREATE TABLE `visitTreatmentPlans` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `patientId` int NOT NULL,
  `visitId` int NOT NULL,
  `doctorId` int NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `treatment` text NULL,
  UNIQUE KEY `uq_visit_treatment` (`visitId`)
);
--> statement-breakpoint
CREATE TABLE `visitDecisions` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `patientId` int NOT NULL,
  `visitId` int NOT NULL,
  `doctorId` int NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `decision` text NULL,
  `followUpDate` timestamp NULL,
  UNIQUE KEY `uq_visit_decision` (`visitId`)
);
--> statement-breakpoint
CREATE TABLE `visitMedicalHistory` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `patientId` int NOT NULL,
  `visitId` int NOT NULL,
  `doctorId` int NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `history` text NULL,
  UNIQUE KEY `uq_visit_history` (`visitId`)
);
--> statement-breakpoint
CREATE TABLE `symptomCatalog` (
  `id` varchar(100) PRIMARY KEY,
  `name` varchar(255) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `visitSymptomCodes` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `patientId` int NOT NULL,
  `visitId` int NOT NULL,
  `symptomId` varchar(100) NOT NULL,
  UNIQUE KEY `uq_visit_symptom_code` (`visitId`, `symptomId`)
);
--> statement-breakpoint
CREATE TABLE `airPuffMeasurements` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `patientId` int NOT NULL,
  `visitId` int NOT NULL,
  `examinationId` int NOT NULL,
  `iopOD` varchar(50) NULL,
  `iopOS` varchar(50) NULL,
  `iop2OD` varchar(50) NULL,
  `iop2OS` varchar(50) NULL,
  `iop3OD` varchar(50) NULL,
  `iop3OS` varchar(50) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_airpuff_examination` (`examinationId`)
);
--> statement-breakpoint
CREATE TABLE `examinationFindings` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `patientId` int NOT NULL,
  `visitId` int NOT NULL,
  `examinationId` int NOT NULL,
  `externalPtosis` boolean NULL,
  `externalSquint` boolean NULL,
  `externalOthers` boolean NULL,
  `externalOthersNote` text NULL,
  `muscleNormal` boolean NULL,
  `muscleAbnormal` boolean NULL,
  `muscleAbnormalNote` text NULL,
  `otherAbnormalities` text NULL,
  `fundusNormal` boolean NULL,
  `fundusAbnormal` boolean NULL,
  `fundusAbnormalNote` text NULL,
  `readingValue` varchar(100) NULL,
  `clinicNotes` text NULL,
  `consultantDrawing` text NULL,
  `consultantDrawingDescription` text NULL,
  `glassesCheck` boolean NULL,
  `xrayCheck` boolean NULL,
  `flapEdgesOD` text NULL,
  `flapBedOD` text NULL,
  `flapEdgesOS` text NULL,
  `flapBedOS` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_examination_findings` (`examinationId`)
);
--> statement-breakpoint
CREATE TABLE `examinationProcedurePlans` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `patientId` int NOT NULL,
  `visitId` int NOT NULL,
  `examinationId` int NOT NULL,
  `eye` enum("OD","OS") NOT NULL,
  `target` text NULL,
  `beforeFlap` text NULL,
  `afterFlap` text NULL,
  `afterTreatment` text NULL,
  `flapReposition` text NULL,
  `ciclo` text NULL,
  `note` text NULL,
  UNIQUE KEY `uq_examination_procedure_eye` (`examinationId`, `eye`)
);
--> statement-breakpoint
CREATE TABLE `fundusFindings` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `patientId` int NOT NULL,
  `visitId` int NOT NULL,
  `examinationId` int NOT NULL,
  `eye` enum("OD","OS") NOT NULL,
  `discStatus` text NULL,
  `cupDiscRatio` text NULL,
  `macuaStatus` text NULL,
  `vesselStatus` text NULL,
  `otherFindings` text NULL,
  UNIQUE KEY `uq_fundus_examination_eye` (`examinationId`, `eye`)
);
--> statement-breakpoint
ALTER TABLE `medicalHistoryChecklist` ADD COLUMN `diabetesDuration` text NULL, ADD COLUMN `otherHistory` text NULL;
--> statement-breakpoint
ALTER TABLE `followupItems` ADD COLUMN `visitId` int NULL;
--> statement-breakpoint
ALTER TABLE `surgeries` ADD COLUMN `visitId` int NULL, ADD COLUMN `eye` varchar(8) NULL, ADD COLUMN `sourceRef` varchar(191) NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_surgeries_source_ref` ON `surgeries` (`sourceRef`);
--> statement-breakpoint
CREATE INDEX `idx_surgeries_visit` ON `surgeries` (`visitId`);

--> statement-breakpoint
ALTER TABLE `surgeries` MODIFY COLUMN `surgeryDate` timestamp NULL;
