CREATE TABLE `kf_prescription_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kf_prescription_id` int NOT NULL,
	`medication_id` int,
	`medication_name` varchar(255) NOT NULL,
	`dosage` varchar(128),
	`frequency` varchar(128),
	`duration` varchar(128),
	`instructions` text,
	CONSTRAINT `kf_prescription_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kf_prescriptions` (
	`kf_prescription_id` int AUTO_INCREMENT NOT NULL,
	`kf_patient_id` int NOT NULL,
	`kf_visit_id` int,
	`kf_exam_id` int,
	`doctor_name` varchar(255),
	`prescription_date` timestamp NOT NULL DEFAULT (now()),
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kf_prescriptions_kf_prescription_id` PRIMARY KEY(`kf_prescription_id`)
);
--> statement-breakpoint
CREATE TABLE `kf_test_request_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kf_test_request_id` int NOT NULL,
	`test_id` int NOT NULL,
	`result` text,
	CONSTRAINT `kf_test_request_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kf_test_requests` (
	`kf_test_request_id` int AUTO_INCREMENT NOT NULL,
	`kf_patient_id` int NOT NULL,
	`kf_visit_id` int,
	`kf_exam_id` int,
	`request_date` date NOT NULL,
	`status` enum('pending','completed','cancelled') NOT NULL DEFAULT 'pending',
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kf_test_requests_kf_test_request_id` PRIMARY KEY(`kf_test_request_id`)
);
--> statement-breakpoint
CREATE TABLE `medicalConditionReportTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`operationType` varchar(100),
	`condition` text,
	`complications` text,
	`followUpPlan` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `medicalConditionReportTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `medicalConditionReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`reportDate` date,
	`operationType` varchar(100),
	`operationDate` date,
	`condition` text,
	`includeCurrentStatus` boolean DEFAULT true,
	`vaOD` varchar(32),
	`vaOS` varchar(32),
	`complications` text,
	`followUpPlan` text,
	`doctorName` varchar(255),
	`patientNameOverride` varchar(255),
	`patientCodeOverride` varchar(64),
	`patientDobOverride` date,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `medicalConditionReports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patientOperations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`operationType` varchar(50) NOT NULL,
	`operationDate` date,
	`source` enum('sheet','surgery','followup','service_code','operation_list','manual') NOT NULL DEFAULT 'manual',
	`sourceRef` varchar(128) NOT NULL,
	`doctorCode` varchar(64),
	`eye` varchar(16),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `patientOperations_id` PRIMARY KEY(`id`),
	CONSTRAINT `patientOperations_sourceRef_unique` UNIQUE(`sourceRef`)
);
--> statement-breakpoint
CREATE TABLE `postOpOffdaysCertificates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`operationDate` date,
	`method` varchar(255),
	`vaOD` varchar(32),
	`vaOS` varchar(32),
	`leaveStart` date,
	`returnDate` date,
	`durationDays` int,
	`doctorName` varchar(255),
	`patientNameOverride` varchar(255),
	`patientCodeOverride` varchar(64),
	`patientDobOverride` date,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `postOpOffdaysCertificates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referralLetters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`refCode` varchar(32),
	`examDate` date,
	`refractionOD` varchar(64),
	`refractionOS` varchar(64),
	`vaOD` varchar(32),
	`vaOS` varchar(32),
	`vaBestOD` varchar(32),
	`vaBestOS` varchar(32),
	`iopOD` varchar(16),
	`iopOS` varchar(16),
	`slitLamp` text,
	`fundus` text,
	`diagnosisTags` text,
	`reasonForReferral` text,
	`referredPhysician` varchar(255),
	`referredPhysicianTitle` varchar(255),
	`referredFacility` varchar(255),
	`referredDept` varchar(255),
	`physicianName` varchar(255),
	`physicianTitle` varchar(255),
	`physicianLicense` varchar(64),
	`patientNameOverride` varchar(255),
	`patientCodeOverride` varchar(64),
	`patientDobOverride` date,
	`patientGenderOverride` varchar(16),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `referralLetters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `salary_missing_checkout_exclude` (
	`id` int AUTO_INCREMENT NOT NULL,
	`emp_cd` varchar(32) NOT NULL,
	`work_date` date NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `salary_missing_checkout_exclude_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_mc_exclude` UNIQUE(`emp_cd`,`work_date`)
);
--> statement-breakpoint
CREATE TABLE `salary_supervision_bonus` (
	`id` int AUTO_INCREMENT NOT NULL,
	`emp_cd` varchar(32) NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`section` varchar(32) NOT NULL DEFAULT 'مركز',
	`amount` decimal(12,2) NOT NULL DEFAULT '0',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `salary_supervision_bonus_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_supervision_bonus` UNIQUE(`emp_cd`,`year`,`month`,`section`)
);
--> statement-breakpoint
CREATE TABLE `serviceCodeOpTypeMap` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serviceCode` varchar(64) NOT NULL,
	`operationType` varchar(50) NOT NULL,
	`label` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `serviceCodeOpTypeMap_id` PRIMARY KEY(`id`),
	CONSTRAINT `serviceCodeOpTypeMap_serviceCode_unique` UNIQUE(`serviceCode`)
);
--> statement-breakpoint
CREATE TABLE `shift_payroll_attendance_overrides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staff_id` int NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`big_attended` int,
	`small_attended` int,
	`updated_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shift_payroll_attendance_overrides_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_shift_payroll_override_staff_month` UNIQUE(`staff_id`,`year`,`month`)
);
--> statement-breakpoint
ALTER TABLE `booking_schedule_config` DROP INDEX `idx_booking_schedule_type`;--> statement-breakpoint
ALTER TABLE `followupSheets` MODIFY COLUMN `sheetType` enum('consultant','specialist','lasik','surgery','external','pentacam_c','pentacam_ex','pentacam_ex_c','surgery_external','surgery_center','pentacam_center','pentacam_external') NOT NULL;--> statement-breakpoint
ALTER TABLE `patient_import_staging` MODIFY COLUMN `serviceType` enum('consultant','specialist','lasik','surgery','external','pentacam_c','pentacam_ex','pentacam_ex_c','surgery_external','surgery_center','pentacam_center','pentacam_external');--> statement-breakpoint
ALTER TABLE `patients` MODIFY COLUMN `serviceType` enum('consultant','specialist','lasik','surgery','external','pentacam_c','pentacam_ex','pentacam_ex_c','surgery_external','surgery_center','pentacam_center','pentacam_external') DEFAULT 'consultant';--> statement-breakpoint
ALTER TABLE `visits` MODIFY COLUMN `queueStatus` enum('checkedIn','next','clinic1','clinic2','pentacam','treated') DEFAULT 'checkedIn';--> statement-breakpoint
ALTER TABLE `accAdvances` ADD `emp_cd` varchar(32);--> statement-breakpoint
ALTER TABLE `attendance_daily` ADD `leave_type` varchar(16);--> statement-breakpoint
ALTER TABLE `attendance_daily` ADD `leave_not_affect_commission` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_device_settings` ADD `zk40_ip` varchar(255);--> statement-breakpoint
ALTER TABLE `attendance_device_settings` ADD `zk40_port` int DEFAULT 4370;--> statement-breakpoint
ALTER TABLE `attendance_device_settings` ADD `zk40_enabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_device_settings` ADD `zk40_protocol` enum('adms','tcp') DEFAULT 'adms' NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_device_settings` ADD `fk_protocol` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_device_settings` ADD `comm_password` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_device_settings` ADD `adms_enabled` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_device_settings` ADD `adms_detected_offset_hours` int;--> statement-breakpoint
ALTER TABLE `attendance_employees` ADD `job_title` varchar(64);--> statement-breakpoint
ALTER TABLE `attendance_employees` ADD `comm_overtime` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_leaves` ADD `not_affect_commission` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_permissions` ADD `not_affect_salary` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_shifts` ADD `ot_min_minutes` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_shifts` ADD `ot_max_minutes` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_shifts` ADD `is_flexible` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_shifts` ADD `flex_in_from` varchar(8);--> statement-breakpoint
ALTER TABLE `attendance_shifts` ADD `flex_in_to` varchar(8);--> statement-breakpoint
ALTER TABLE `attendance_shifts` ADD `flex_out_from` varchar(8);--> statement-breakpoint
ALTER TABLE `attendance_shifts` ADD `flex_out_to` varchar(8);--> statement-breakpoint
ALTER TABLE `attendance_shifts` ADD `shift_size` varchar(8) DEFAULT 'auto' NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_shifts` ADD `auto_small_threshold_min` int DEFAULT 270 NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_sync_runs` ADD `device_id` varchar(64);--> statement-breakpoint
ALTER TABLE `booking_closures` ADD `branch` varchar(20);--> statement-breakpoint
ALTER TABLE `booking_schedule_config` ADD `branch` varchar(20) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `doctorReports` ADD `patientNameOverride` varchar(255);--> statement-breakpoint
ALTER TABLE `doctorReports` ADD `patientCodeOverride` varchar(64);--> statement-breakpoint
ALTER TABLE `doctorReports` ADD `patientDobOverride` date;--> statement-breakpoint
ALTER TABLE `doctorReports` ADD `patientGenderOverride` varchar(16);--> statement-breakpoint
ALTER TABLE `followupItems` ADD `operationDate` timestamp;--> statement-breakpoint
ALTER TABLE `followupItems` ADD `operationType` varchar(50);--> statement-breakpoint
ALTER TABLE `kf_examinations` ADD `medical_history` json;--> statement-breakpoint
ALTER TABLE `kf_patients` ADD `doctor_name` varchar(255);--> statement-breakpoint
ALTER TABLE `medicalHistoryChecklist` ADD `thyroid` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `medicalHistoryChecklist` ADD `autoimmune` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `medicalHistoryChecklist` ADD `familyKeratoconus` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `medicalHistoryChecklist` ADD `glaucoma` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `patient_portal_bookings` ADD `guestEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `patient_portal_bookings` ADD `branch` varchar(20);--> statement-breakpoint
ALTER TABLE `patients` ADD `email` varchar(320);--> statement-breakpoint
ALTER TABLE `salary_payroll` ADD `attendance_commission_raw` decimal(12,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `salary_payroll` ADD `exam_commission_raw` decimal(12,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `salary_payroll` ADD `pentacam_commission_raw` decimal(12,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `salary_penalties` ADD `penalty_days` decimal(5,2);--> statement-breakpoint
ALTER TABLE `salary_penalties` ADD `penalty_date` date;--> statement-breakpoint
ALTER TABLE `shift_staff` ADD `rate_small_shift` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `stock_transactions` ADD `destination` varchar(100);--> statement-breakpoint
ALTER TABLE `stock_transactions` ADD `transactionDate` date;--> statement-breakpoint
ALTER TABLE `surgeries` ADD `patientNameOverride` varchar(255);--> statement-breakpoint
ALTER TABLE `surgeries` ADD `patientCodeOverride` varchar(64);--> statement-breakpoint
ALTER TABLE `surgeries` ADD `patientDobOverride` date;--> statement-breakpoint
ALTER TABLE `surgeries` ADD `patientGenderOverride` varchar(16);--> statement-breakpoint
ALTER TABLE `visit_schedule_requests` ADD `branch` varchar(20);--> statement-breakpoint
ALTER TABLE `visits` ADD `movedToPentacamAt` timestamp;--> statement-breakpoint
ALTER TABLE `visits` ADD `preTreatedQueueStatus` enum('checkedIn','next','clinic1','clinic2','pentacam');--> statement-breakpoint
ALTER TABLE `booking_schedule_config` ADD CONSTRAINT `idx_booking_schedule_type_branch` UNIQUE(`bookingType`,`branch`);--> statement-breakpoint
CREATE INDEX `idx_patientops_type` ON `patientOperations` (`operationType`,`operationDate`);--> statement-breakpoint
CREATE INDEX `idx_patientops_patient` ON `patientOperations` (`patientId`,`operationDate`);--> statement-breakpoint
CREATE INDEX `idx_device_id` ON `attendance_sync_runs` (`device_id`);