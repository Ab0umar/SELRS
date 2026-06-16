CREATE TABLE `kf_ledger` (
	`kf_ledger_id` int AUTO_INCREMENT NOT NULL,
	`entry_date` date NOT NULL,
	`income` int NOT NULL DEFAULT 0,
	`expense` int NOT NULL DEFAULT 0,
	`notes` varchar(500),
	`created_by_user_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kf_ledger_kf_ledger_id` PRIMARY KEY(`kf_ledger_id`)
);
--> statement-breakpoint
ALTER TABLE `attendance_employees` ADD `attendance_leave_multiplier` decimal(5,4);