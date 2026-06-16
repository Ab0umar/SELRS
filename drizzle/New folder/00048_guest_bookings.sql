ALTER TABLE patient_portal_bookings MODIFY COLUMN patientId int NULL;
--> statement-breakpoint
ALTER TABLE patient_portal_bookings ADD COLUMN guestName varchar(100) NULL AFTER patientId;
--> statement-breakpoint
ALTER TABLE patient_portal_bookings ADD COLUMN guestPhone varchar(20) NULL AFTER guestName;
