ALTER TABLE `patient_portal_otps`
  MODIFY COLUMN `code` varchar(64) NOT NULL,
  ADD COLUMN `challengeId` varchar(36) NULL,
  ADD COLUMN `patientId` int NULL,
  ADD UNIQUE INDEX `idx_portal_otp_challenge` (`challengeId`),
  ADD INDEX `idx_portal_otp_patient` (`patientId`, `verified`);

UPDATE `patient_portal_otps` SET `verified` = true WHERE `challengeId` IS NULL;
