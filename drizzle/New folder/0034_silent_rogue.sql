CREATE TABLE `attendance_leave_balances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`emp_cd` varchar(32) NOT NULL,
	`year` int NOT NULL,
	`annual_allocation` int NOT NULL DEFAULT 21,
	`carry_over` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_leave_balances_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_leave_bal_emp_year` UNIQUE(`emp_cd`,`year`)
);
--> statement-breakpoint
CREATE TABLE `attendance_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`emp_cd` varchar(32) NOT NULL,
	`date` date NOT NULL,
	`perm_type` enum('in','out') NOT NULL,
	`duration_minutes` int NOT NULL,
	`approved` boolean NOT NULL DEFAULT false,
	`note` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_permissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attendance_shift_cycle_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`emp_cd` varchar(32) NOT NULL,
	`cycle_id` int NOT NULL,
	`effective_from` date NOT NULL,
	`effective_to` date,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attendance_shift_cycle_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attendance_shift_cycle_slots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cycle_id` int NOT NULL,
	`slot_index` int NOT NULL,
	`shift_id` int NOT NULL,
	CONSTRAINT `attendance_shift_cycle_slots_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_cycle_slot` UNIQUE(`cycle_id`,`slot_index`)
);
--> statement-breakpoint
CREATE TABLE `attendance_shift_cycles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`period` enum('day','week','month') NOT NULL,
	`anchor_date` date NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_shift_cycles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `booking_schedule_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingType` enum('consultant','specialist','lasik','external') NOT NULL,
	`weekdayMask` int NOT NULL DEFAULT 127,
	`isActive` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `booking_schedule_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_booking_schedule_type` UNIQUE(`bookingType`)
);
--> statement-breakpoint
CREATE TABLE `marketing_brand_profile` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dominant_colors` text,
	`color_palette` text,
	`layout_style` text,
	`image_composition` text,
	`branding_style` text,
	`medical_visual_style` text,
	`cta_positioning` text,
	`logo_placement_style` text,
	`overall_aesthetic` text,
	`design_count` int NOT NULL DEFAULT 0,
	`raw_profile` text,
	`built_at` timestamp,
	CONSTRAINT `marketing_brand_profile_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketing_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`post_id` int,
	`action` varchar(100) NOT NULL,
	`status` enum('success','error','info') NOT NULL DEFAULT 'info',
	`message` text,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `marketing_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketing_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text,
	`topic` varchar(255),
	`idea` text,
	`cta` varchar(500),
	`hashtags` text,
	`image_prompt` text,
	`image_url` varchar(1000),
	`platform` enum('facebook','instagram','both') NOT NULL DEFAULT 'facebook',
	`post_day` enum('saturday','tuesday','thursday'),
	`status` enum('draft','published','failed','scheduled') NOT NULL DEFAULT 'draft',
	`fb_post_id` varchar(255),
	`scheduled_at` timestamp,
	`published_at` timestamp,
	`created_by` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketing_posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketing_reference_designs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`filename` varchar(255) NOT NULL,
	`original_name` varchar(255) NOT NULL,
	`file_path` varchar(1000) NOT NULL,
	`file_url` varchar(1000) NOT NULL,
	`mime_type` varchar(100) NOT NULL,
	`file_size` int,
	`style_attributes` text,
	`analyzed_at` timestamp,
	`uploaded_by` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `marketing_reference_designs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketing_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`auto_publish` boolean NOT NULL DEFAULT false,
	`saturday_enabled` boolean NOT NULL DEFAULT true,
	`tuesday_enabled` boolean NOT NULL DEFAULT true,
	`thursday_enabled` boolean NOT NULL DEFAULT true,
	`publish_hour` int NOT NULL DEFAULT 9,
	`fb_page_id` varchar(255),
	`fb_access_token` text,
	`fb_page_name` varchar(255),
	`fb_connected` boolean NOT NULL DEFAULT false,
	`fb_oauth_state` varchar(128),
	`fb_pending_pages` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketing_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patient_portal_bookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`bookingType` enum('consultant','specialist','lasik','external') NOT NULL,
	`requestedDate` date NOT NULL,
	`notes` text,
	`status` enum('pending','confirmed','cancelled','completed') NOT NULL DEFAULT 'pending',
	`staffNotes` text,
	`confirmedDate` date,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `patient_portal_bookings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patient_portal_otps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(20) NOT NULL,
	`code` varchar(6) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`verified` boolean NOT NULL DEFAULT false,
	`attempts` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `patient_portal_otps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patient_portal_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`token` varchar(512) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `patient_portal_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_portal_session_token` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `salary_advances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`emp_cd` varchar(32) NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`reason` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `salary_advances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `salary_basics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`emp_cd` varchar(32) NOT NULL,
	`basic_amount` decimal(12,2) NOT NULL,
	`social_allowance` decimal(12,2) NOT NULL DEFAULT '0',
	`cost_of_living_allowance` decimal(12,2) NOT NULL DEFAULT '0',
	`transport_allowance` decimal(12,2) NOT NULL DEFAULT '0',
	`work_nature_allowance` decimal(12,2) NOT NULL DEFAULT '0',
	`reception_allowance` decimal(12,2) NOT NULL DEFAULT '0',
	`yearly_raise` decimal(12,2) NOT NULL DEFAULT '0',
	`insurance_deduction` decimal(12,2) NOT NULL DEFAULT '0',
	`effective_from` date NOT NULL,
	`effective_to` date,
	`notes` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `salary_basics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `salary_commission_pools` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`section` varchar(32) NOT NULL DEFAULT 'مركز',
	`exam_count` int NOT NULL DEFAULT 0,
	`exam_pool` decimal(14,2) NOT NULL DEFAULT '0',
	`exam_count_consultant` int,
	`exam_count_specialist` int,
	`exam_pool_consultant` decimal(12,2),
	`exam_pool_specialist` decimal(12,2),
	`pentacam_pool` decimal(14,2) NOT NULL DEFAULT '0',
	`cost_of_living_allowance_amount` decimal(12,2) NOT NULL DEFAULT '0',
	`cost_of_living_allowance_count` int NOT NULL DEFAULT 0,
	`cost_of_living_allowance_total` decimal(14,2) NOT NULL DEFAULT '0',
	`transport_allowance_amount` decimal(12,2) NOT NULL DEFAULT '0',
	`transport_allowance_count` int NOT NULL DEFAULT 0,
	`transport_allowance_total` decimal(14,2) NOT NULL DEFAULT '0',
	`cases_450` int NOT NULL DEFAULT 0,
	`cases_400` int NOT NULL DEFAULT 0,
	`cases_350` int NOT NULL DEFAULT 0,
	`cases_250` int NOT NULL DEFAULT 0,
	`notes` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `salary_commission_pools_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_pool_year_month_section` UNIQUE(`year`,`month`,`section`)
);
--> statement-breakpoint
CREATE TABLE `salary_config` (
	`key` varchar(64) NOT NULL,
	`value` varchar(255) NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `salary_config_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `salary_holidays` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` date NOT NULL,
	`name` varchar(100) NOT NULL DEFAULT '',
	`year` int NOT NULL,
	`month` int NOT NULL,
	CONSTRAINT `salary_holidays_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `salary_payroll` (
	`id` int AUTO_INCREMENT NOT NULL,
	`emp_cd` varchar(32) NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`section` varchar(32) NOT NULL DEFAULT 'مركز',
	`basic_salary` decimal(12,2) NOT NULL,
	`working_days` int NOT NULL DEFAULT 0,
	`absent_days` int NOT NULL DEFAULT 0,
	`late_minutes` int NOT NULL DEFAULT 0,
	`early_leave_minutes` int NOT NULL DEFAULT 0,
	`overtime_minutes` int NOT NULL DEFAULT 0,
	`leave_days` int NOT NULL DEFAULT 0,
	`absent_deduction` decimal(12,2) NOT NULL DEFAULT '0',
	`late_deduction` decimal(12,2) NOT NULL DEFAULT '0',
	`early_leave_deduction` decimal(12,2) NOT NULL DEFAULT '0',
	`penalty_deduction` decimal(12,2) NOT NULL DEFAULT '0',
	`advances_deduction` decimal(12,2) NOT NULL DEFAULT '0',
	`insurance_deduction` decimal(12,2) NOT NULL DEFAULT '0',
	`total_deductions` decimal(12,2) NOT NULL DEFAULT '0',
	`deduction_pct` decimal(6,4) NOT NULL DEFAULT '0',
	`leave_multiplier` decimal(4,2) NOT NULL DEFAULT '1',
	`net_basic` decimal(12,2) NOT NULL,
	`attendance_commission` decimal(12,2) NOT NULL DEFAULT '0',
	`exam_commission` decimal(12,2) NOT NULL DEFAULT '0',
	`pentacam_commission` decimal(12,2) NOT NULL DEFAULT '0',
	`cost_of_living_allowance` decimal(12,2) NOT NULL DEFAULT '0',
	`transport_allowance` decimal(12,2) NOT NULL DEFAULT '0',
	`total_commission` decimal(12,2) NOT NULL DEFAULT '0',
	`overtime_pay` decimal(12,2) NOT NULL DEFAULT '0',
	`total_pay` decimal(12,2) NOT NULL,
	`payroll_status` enum('draft','final') NOT NULL DEFAULT 'draft',
	`computed_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `salary_payroll_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_payroll_emp_month_section` UNIQUE(`emp_cd`,`year`,`month`,`section`)
);
--> statement-breakpoint
CREATE TABLE `salary_penalties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`emp_cd` varchar(32) NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`reason` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `salary_penalties_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `salary_raise_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`emp_cd` varchar(32) NOT NULL,
	`year` int NOT NULL,
	`raise_amount` decimal(12,2) NOT NULL,
	`notes` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `salary_raise_history_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_raise_emp_year` UNIQUE(`emp_cd`,`year`)
);
--> statement-breakpoint
CREATE TABLE `shift_attendance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staff_id` int NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`work_date` date NOT NULL,
	`shift_name` varchar(128) NOT NULL,
	`present` boolean NOT NULL DEFAULT true,
	`notes` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shift_attendance_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_staff_date_shift` UNIQUE(`staff_id`,`work_date`,`shift_name`)
);
--> statement-breakpoint
CREATE TABLE `shift_staff` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` varchar(32) NOT NULL,
	`rate_per_shift` decimal(10,2) NOT NULL DEFAULT '0.00',
	`active` boolean NOT NULL DEFAULT true,
	`emp_cd` varchar(64),
	`user_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shift_staff_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shift_staff_cycle` (
	`staff_id` int NOT NULL,
	`day_of_week` int NOT NULL,
	`shift_name` varchar(128) NOT NULL,
	CONSTRAINT `shift_staff_cycle_staff_id_day_of_week_shift_name_pk` PRIMARY KEY(`staff_id`,`day_of_week`,`shift_name`)
);
--> statement-breakpoint
ALTER TABLE `attendance_monthly_report` DROP PRIMARY KEY, DROP COLUMN `id`, ADD PRIMARY KEY (`emp_cd`, `year`, `month`);--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','doctor','nurse','technician','reception','manager','accountant','worker','supervisor') NOT NULL DEFAULT 'reception';--> statement-breakpoint
ALTER TABLE `attendance_employees` ADD `salary_type` varchar(32);--> statement-breakpoint
ALTER TABLE `attendance_employees` ADD `attendance_commission_rate` decimal(5,4);--> statement-breakpoint
ALTER TABLE `attendance_employees` ADD `comm_attendance` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_employees` ADD `comm_exam` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_employees` ADD `comm_pentacam` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_shifts` ADD `allow_ot` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_shifts` ADD `weekday_mask` int DEFAULT 62 NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_shifts` ADD `require_punch` boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_perm_emp_date` ON `attendance_permissions` (`emp_cd`,`date`);--> statement-breakpoint
CREATE INDEX `idx_cycle_emp_from` ON `attendance_shift_cycle_assignments` (`emp_cd`,`effective_from`);--> statement-breakpoint
CREATE INDEX `idx_cycle_id` ON `attendance_shift_cycle_slots` (`cycle_id`);--> statement-breakpoint
CREATE INDEX `idx_marketing_logs_post` ON `marketing_logs` (`post_id`);--> statement-breakpoint
CREATE INDEX `idx_marketing_logs_created` ON `marketing_logs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_marketing_posts_status` ON `marketing_posts` (`status`);--> statement-breakpoint
CREATE INDEX `idx_marketing_posts_day` ON `marketing_posts` (`post_day`);--> statement-breakpoint
CREATE INDEX `idx_marketing_posts_created` ON `marketing_posts` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_ref_designs_created` ON `marketing_reference_designs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_portal_booking_patient` ON `patient_portal_bookings` (`patientId`);--> statement-breakpoint
CREATE INDEX `idx_portal_booking_date` ON `patient_portal_bookings` (`requestedDate`);--> statement-breakpoint
CREATE INDEX `idx_portal_booking_status` ON `patient_portal_bookings` (`status`);--> statement-breakpoint
CREATE INDEX `idx_portal_otp_phone` ON `patient_portal_otps` (`phone`);--> statement-breakpoint
CREATE INDEX `idx_portal_session_patient` ON `patient_portal_sessions` (`patientId`);--> statement-breakpoint
CREATE INDEX `idx_advance_emp_month` ON `salary_advances` (`emp_cd`,`year`,`month`);--> statement-breakpoint
CREATE INDEX `idx_salary_emp` ON `salary_basics` (`emp_cd`);--> statement-breakpoint
CREATE INDEX `idx_payroll_year_month` ON `salary_payroll` (`year`,`month`);--> statement-breakpoint
CREATE INDEX `idx_penalty_emp_month` ON `salary_penalties` (`emp_cd`,`year`,`month`);--> statement-breakpoint
CREATE INDEX `idx_raise_emp` ON `salary_raise_history` (`emp_cd`);--> statement-breakpoint
