ALTER TABLE booking_schedule_config MODIFY COLUMN bookingType enum('consultant','specialist','lasik','external','followup') NOT NULL;
--> statement-breakpoint
ALTER TABLE patient_portal_bookings MODIFY COLUMN bookingType enum('consultant','specialist','lasik','external','followup') NOT NULL;
