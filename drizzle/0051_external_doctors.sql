-- External Doctors Module
CREATE TABLE IF NOT EXISTS `external_doctors` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(320),
  `phone` VARCHAR(20),
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `external_doctor_referrals` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `external_doctor_id` INT NOT NULL,
  `patient_code` VARCHAR(50) NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` INT,
  INDEX `idx_ext_dr_ref_doctor_patient` (`external_doctor_id`, `patient_code`),
  INDEX `idx_ext_dr_ref_patient` (`patient_code`)
);

CREATE TABLE IF NOT EXISTS `external_doctor_access_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `external_doctor_id` INT NOT NULL,
  `patient_code` VARCHAR(50) NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_ext_dr_log_doctor` (`external_doctor_id`, `created_at`)
);
