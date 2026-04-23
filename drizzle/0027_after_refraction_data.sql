CREATE TABLE IF NOT EXISTS `afterRefractionData` (
  `id` int AUTO_INCREMENT NOT NULL,
  `examinationId` int NOT NULL,
  `patientId` int NOT NULL,
  `sphereOD` varchar(20),
  `cylinderOD` varchar(20),
  `axisOD` varchar(20),
  `sphereOS` varchar(20),
  `cylinderOS` varchar(20),
  `axisOS` varchar(20),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `afterRefractionData_id` PRIMARY KEY(`id`),
  UNIQUE KEY `afterRefractionData_exam_unique` (`examinationId`),
  KEY `afterRefractionData_patient_idx` (`patientId`),
  CONSTRAINT `afterRefractionData_examination_fk` FOREIGN KEY (`examinationId`) REFERENCES `examinations`(`id`) ON DELETE CASCADE
);
