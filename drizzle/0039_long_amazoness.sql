CREATE TABLE `attendance_overtime_days` (
	`emp_cd` varchar(32) NOT NULL,
	`work_date` date NOT NULL,
	`in_enabled` boolean NOT NULL DEFAULT false,
	`out_enabled` boolean NOT NULL DEFAULT false,
	`extra_day_enabled` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_overtime_days_emp_cd_work_date_pk` PRIMARY KEY(`emp_cd`,`work_date`)
);
--> statement-breakpoint
CREATE TABLE `ready_prescription_template_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`template_id` int NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`medication_name` varchar(255) NOT NULL,
	`dosage` varchar(100),
	`frequency` varchar(100),
	`duration` varchar(100),
	`instructions` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ready_prescription_template_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ready_prescription_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`template_key` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ready_prescription_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `ready_rx_template_key_uq` UNIQUE(`template_key`)
);
--> statement-breakpoint
CREATE TABLE `salary_employee_section_settings` (
	`emp_cd` varchar(32) NOT NULL,
	`section` varchar(32) NOT NULL,
	`salary_type` varchar(32),
	`attendance_commission_rate` decimal(5,4),
	`attendance_leave_multiplier` decimal(5,4),
	`comm_attendance` boolean NOT NULL DEFAULT true,
	`comm_exam` boolean NOT NULL DEFAULT true,
	`comm_pentacam` boolean NOT NULL DEFAULT true,
	`comm_day10` boolean NOT NULL DEFAULT true,
	`comm_overtime` boolean NOT NULL DEFAULT true,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `salary_employee_section_settings_emp_cd_section_pk` PRIMARY KEY(`emp_cd`,`section`)
);
--> statement-breakpoint
CREATE TABLE `whatsapp_inbound_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`wa_message_id` varchar(128),
	`from_phone` varchar(32),
	`message_type` varchar(32),
	`body` text,
	`raw_payload` text,
	`received_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `whatsapp_inbound_messages_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_whatsapp_inbound_wa_message_id` UNIQUE(`wa_message_id`)
);
--> statement-breakpoint
ALTER TABLE `attendance_daily` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `attendance_daily` MODIFY COLUMN `shift_id` int NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `attendance_daily` MODIFY COLUMN `shift_id` int NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_permissions` MODIFY COLUMN `perm_type` enum('in','out','mission') NOT NULL;--> statement-breakpoint
ALTER TABLE `booking_closures` MODIFY COLUMN `bookingType` enum('consultant','specialist','pentacam','external','followup');--> statement-breakpoint
ALTER TABLE `booking_schedule_config` MODIFY COLUMN `bookingType` enum('consultant','specialist','pentacam','external','followup') NOT NULL;--> statement-breakpoint
ALTER TABLE `patient_portal_bookings` MODIFY COLUMN `bookingType` enum('consultant','specialist','pentacam','external','followup') NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_daily` ADD PRIMARY KEY(`emp_cd`,`work_date`,`shift_id`);--> statement-breakpoint
ALTER TABLE `attendance_daily` ADD `overtime_in_minutes` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_daily` ADD `overtime_out_minutes` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_shifts` ADD `allow_ot_in` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_shifts` ADD `allow_ot_out` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_shifts` ADD `ot_min_in_minutes` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_shifts` ADD `ot_min_out_minutes` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `salary_basics` ADD `section` varchar(32) DEFAULT 'مركز' NOT NULL;--> statement-breakpoint
ALTER TABLE `shift_attendance` ADD `start_time` varchar(5);--> statement-breakpoint
ALTER TABLE `shift_attendance` ADD `end_time` varchar(5);--> statement-breakpoint
ALTER TABLE `shift_staff` ADD `main_shift_minutes` int DEFAULT 360 NOT NULL;--> statement-breakpoint
ALTER TABLE `visits` ADD `treatedByUserId` int;--> statement-breakpoint
CREATE INDEX `idx_attendance_overtime_date` ON `attendance_overtime_days` (`work_date`);--> statement-breakpoint
CREATE INDEX `ready_rx_item_template_idx` ON `ready_prescription_template_items` (`template_id`);--> statement-breakpoint
CREATE INDEX `ready_rx_item_order_idx` ON `ready_prescription_template_items` (`template_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `idx_whatsapp_inbound_from_phone` ON `whatsapp_inbound_messages` (`from_phone`);--> statement-breakpoint
CREATE INDEX `idx_salary_emp_section` ON `salary_basics` (`emp_cd`,`section`);