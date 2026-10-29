ALTER TABLE `prescriptionItems`
  MODIFY COLUMN `medicationId` int NULL,
  ADD COLUMN `medicationName` varchar(255) NULL;
--> statement-breakpoint
ALTER TABLE `testRequestItems`
  MODIFY COLUMN `testId` int NULL,
  ADD COLUMN `testName` varchar(255) NULL,
  ADD COLUMN `testType` enum('lab','imaging','examination','other') NULL;
