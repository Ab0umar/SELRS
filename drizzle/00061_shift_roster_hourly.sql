ALTER TABLE `shift_staff`
  ADD COLUMN `main_shift_minutes` int NOT NULL DEFAULT 360 AFTER `rate_small_shift`;

--> statement-breakpoint
ALTER TABLE `shift_attendance`
  ADD COLUMN `start_time` varchar(5) NULL AFTER `shift_name`,
  ADD COLUMN `end_time` varchar(5) NULL AFTER `start_time`;
