ALTER TABLE `attendance_leaves` ADD COLUMN `not_affect_commission` boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE `attendance_daily` ADD COLUMN `leave_not_affect_commission` boolean NOT NULL DEFAULT false;
