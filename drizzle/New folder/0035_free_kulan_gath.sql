CREATE TABLE `attendance_shift_change_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`emp_cd` varchar(32) NOT NULL,
	`request_type` enum('daily','weekly','monthly','swap') NOT NULL,
	`new_shift_id` int,
	`weekday_mask` int,
	`cycle_id` int,
	`swap_emp_cd` varchar(32),
	`date_from` date NOT NULL,
	`date_to` date,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`note` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_shift_change_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `booking_closures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`label` varchar(255) NOT NULL,
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`bookingType` enum('consultant','specialist','lasik','external','followup'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `booking_closures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `external_doctor_access_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`external_doctor_id` int NOT NULL,
	`patient_code` varchar(50) NOT NULL,
	`action` varchar(100) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `external_doctor_access_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `external_doctor_referrals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`external_doctor_id` int NOT NULL,
	`patient_code` varchar(50) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`created_by` int,
	CONSTRAINT `external_doctor_referrals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `external_doctors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(100) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`full_name` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(20),
	`doctor_code` varchar(64),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `external_doctors_id` PRIMARY KEY(`id`),
	CONSTRAINT `external_doctors_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
ALTER TABLE `booking_schedule_config` MODIFY COLUMN `bookingType` enum('consultant','specialist','lasik','external','followup') NOT NULL;--> statement-breakpoint
ALTER TABLE `marketing_brand_profile` MODIFY COLUMN `raw_profile` mediumtext;--> statement-breakpoint
ALTER TABLE `patient_portal_bookings` MODIFY COLUMN `patientId` int;--> statement-breakpoint
ALTER TABLE `patient_portal_bookings` MODIFY COLUMN `bookingType` enum('consultant','specialist','lasik','external','followup') NOT NULL;--> statement-breakpoint
ALTER TABLE `marketing_settings` ADD `clinic_name` varchar(255) DEFAULT 'مركزك لطب العيون';--> statement-breakpoint
ALTER TABLE `marketing_settings` ADD `last_scheduler_run` timestamp;--> statement-breakpoint
ALTER TABLE `marketing_settings` ADD `scheduler_status` varchar(20) DEFAULT 'idle';--> statement-breakpoint
ALTER TABLE `patient_portal_bookings` ADD `guestName` varchar(100);--> statement-breakpoint
ALTER TABLE `patient_portal_bookings` ADD `guestPhone` varchar(20);--> statement-breakpoint
ALTER TABLE `patient_portal_sessions` ADD `pushSubscription` text;--> statement-breakpoint
CREATE INDEX `idx_request_emp` ON `attendance_shift_change_requests` (`emp_cd`);--> statement-breakpoint
CREATE INDEX `idx_ext_dr_log_doctor` ON `external_doctor_access_logs` (`external_doctor_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_ext_dr_ref_doctor_patient` ON `external_doctor_referrals` (`external_doctor_id`,`patient_code`);--> statement-breakpoint
CREATE INDEX `idx_ext_dr_ref_patient` ON `external_doctor_referrals` (`patient_code`);