ALTER TABLE `kf_examinations` ADD COLUMN `medical_history` json;
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
CREATE TABLE `kf_test_request_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kf_test_request_id` int NOT NULL,
	`test_id` int NOT NULL,
	`result` text,
	CONSTRAINT `kf_test_request_items_id` PRIMARY KEY(`id`)
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
