CREATE TABLE `kf_examinations` (
	`kf_exam_id` int AUTO_INCREMENT NOT NULL,
	`kf_patient_id` int NOT NULL,
	`kf_visit_id` int,
	`exam_date` date NOT NULL,
	`right_va` varchar(20),
	`left_va` varchar(20),
	`right_refraction` json,
	`left_refraction` json,
	`iop_right` varchar(20),
	`iop_left` varchar(20),
	`diagnosis` text,
	`plan` text,
	`notes` text,
	`doctor_name` varchar(255),
	`examined_by_user_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kf_examinations_kf_exam_id` PRIMARY KEY(`kf_exam_id`)
);
--> statement-breakpoint
CREATE TABLE `kf_followups` (
	`kf_followup_id` int AUTO_INCREMENT NOT NULL,
	`kf_patient_id` int NOT NULL,
	`kf_visit_id` int,
	`kf_op_id` int,
	`followup_date` date NOT NULL,
	`notes` text,
	`status` enum('scheduled','completed','missed') DEFAULT 'scheduled',
	`created_by_user_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kf_followups_kf_followup_id` PRIMARY KEY(`kf_followup_id`)
);
--> statement-breakpoint
CREATE TABLE `kf_operations` (
	`kf_op_id` int AUTO_INCREMENT NOT NULL,
	`kf_patient_id` int NOT NULL,
	`kf_visit_id` int,
	`op_date` date NOT NULL,
	`op_type` varchar(255) NOT NULL,
	`eye` enum('right','left','both'),
	`doctor_name` varchar(255),
	`status` enum('scheduled','completed','cancelled') DEFAULT 'scheduled',
	`notes` text,
	`created_by_user_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kf_operations_kf_op_id` PRIMARY KEY(`kf_op_id`)
);
--> statement-breakpoint
CREATE TABLE `kf_patients` (
	`kf_id` int AUTO_INCREMENT NOT NULL,
	`kf_code` varchar(20) NOT NULL,
	`full_name` varchar(255) NOT NULL,
	`date_of_birth` date,
	`age` int,
	`gender` enum('male','female'),
	`national_id` varchar(20),
	`phone` varchar(20),
	`alternate_phone` varchar(20),
	`address` text,
	`occupation` varchar(255),
	`medical_history` text,
	`allergies` text,
	`notes` text,
	`selrs_patient_code` varchar(50),
	`created_by_user_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kf_patients_kf_id` PRIMARY KEY(`kf_id`),
	CONSTRAINT `kf_patients_kf_code_unique` UNIQUE(`kf_code`)
);
--> statement-breakpoint
CREATE TABLE `kf_visits` (
	`kf_visit_id` int AUTO_INCREMENT NOT NULL,
	`kf_patient_id` int NOT NULL,
	`visit_date` date NOT NULL,
	`visit_type` enum('consultation','examination','followup','operation') DEFAULT 'consultation',
	`doctor_name` varchar(255),
	`status` enum('scheduled','arrived','in_progress','completed','cancelled') DEFAULT 'scheduled',
	`notes` text,
	`created_by_user_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kf_visits_kf_visit_id` PRIMARY KEY(`kf_visit_id`)
);
--> statement-breakpoint
ALTER TABLE `attendance_employees` ADD `comm_day10` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `visit_schedule_requests` ADD `patientType` varchar(32) DEFAULT 'existing';