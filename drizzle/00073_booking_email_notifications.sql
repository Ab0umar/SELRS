ALTER TABLE `patients` ADD COLUMN `email` varchar(320);
--> statement-breakpoint
ALTER TABLE `patient_portal_bookings` ADD COLUMN `guestEmail` varchar(320);
