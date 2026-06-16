-- Add surgery_center, pentacam_center, pentacam_external to serviceType enum

ALTER TABLE `patients`
  MODIFY COLUMN `serviceType`
    ENUM('consultant','specialist','lasik','surgery','external','pentacam_c','pentacam_ex','pentacam_ex_c','surgery_external','surgery_center','pentacam_center','pentacam_external')
    DEFAULT 'consultant';

--> statement-breakpoint

ALTER TABLE `patient_import_staging`
  MODIFY COLUMN `serviceType`
    ENUM('consultant','specialist','lasik','surgery','external','pentacam_c','pentacam_ex','pentacam_ex_c','surgery_external','surgery_center','pentacam_center','pentacam_external');
