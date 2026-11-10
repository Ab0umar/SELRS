CREATE TABLE IF NOT EXISTS `examinationRecordCompletions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `patientId` int NOT NULL,
  `visitId` int NOT NULL,
  `examinationId` int NOT NULL,
  `markedBy` int NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `examinationRecordCompletions_id` PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_exam_record_completion` (`examinationId`)
);
