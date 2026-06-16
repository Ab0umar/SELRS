-- Expand serviceType enum on patients and patient_import_staging tables
-- to include granular sheet types previously only tracked via service codes.

ALTER TABLE `patients`
  MODIFY COLUMN `serviceType`
    ENUM('consultant','specialist','lasik','surgery','external','pentacam_c','pentacam_ex','pentacam_ex_c','surgery_external')
    NOT NULL DEFAULT 'consultant';

ALTER TABLE `patient_import_staging`
  MODIFY COLUMN `serviceType`
    ENUM('consultant','specialist','lasik','surgery','external','pentacam_c','pentacam_ex','pentacam_ex_c','surgery_external');
