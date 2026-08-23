-- Replace the "lasik" portal-booking type with "pentacam". This bookingType
-- enum is scoped to patient_portal_bookings / booking_schedule_config /
-- booking_closures only (the "حجز موعد / كشف" scheduling flow) — unrelated
-- to the separate patients.serviceType "lasik" value used elsewhere.
--
-- MySQL enum columns reject any value not already in their current
-- definition, so renaming a value requires: widen the enum to include BOTH
-- the old and new values, migrate the data, then narrow it to the final
-- list.
--
-- patient_portal_bookings holds actual historical appointment requests, so
-- old "lasik" ones are converted to "consultant" per instruction.
-- booking_schedule_config / booking_closures are configuration rows keyed by
-- (bookingType, branch) — these are renamed to "pentacam" directly (not
-- merged into "consultant") to avoid colliding with the existing
-- "consultant" config row for the same branch under the unique index.
ALTER TABLE patient_portal_bookings MODIFY COLUMN bookingType ENUM('consultant','specialist','lasik','pentacam','external','followup') NOT NULL;
--> statement-breakpoint
ALTER TABLE booking_schedule_config MODIFY COLUMN bookingType ENUM('consultant','specialist','lasik','pentacam','external','followup') NOT NULL;
--> statement-breakpoint
ALTER TABLE booking_closures MODIFY COLUMN bookingType ENUM('consultant','specialist','lasik','pentacam','external','followup');
--> statement-breakpoint
UPDATE patient_portal_bookings SET bookingType = 'consultant' WHERE bookingType = 'lasik';
--> statement-breakpoint
UPDATE booking_schedule_config SET bookingType = 'pentacam' WHERE bookingType = 'lasik';
--> statement-breakpoint
UPDATE booking_closures SET bookingType = 'pentacam' WHERE bookingType = 'lasik';
--> statement-breakpoint
ALTER TABLE patient_portal_bookings MODIFY COLUMN bookingType ENUM('consultant','specialist','pentacam','external','followup') NOT NULL;
--> statement-breakpoint
ALTER TABLE booking_schedule_config MODIFY COLUMN bookingType ENUM('consultant','specialist','pentacam','external','followup') NOT NULL;
--> statement-breakpoint
ALTER TABLE booking_closures MODIFY COLUMN bookingType ENUM('consultant','specialist','pentacam','external','followup');
