ALTER TABLE `patients` ADD INDEX `idx_patients_phone` (`phone`);
--> statement-breakpoint
ALTER TABLE `visits` ADD INDEX `idx_visits_patient_date` (`patientId`, `visitDate`);
--> statement-breakpoint
ALTER TABLE `visits` ADD INDEX `idx_visits_visit_date` (`visitDate`);
--> statement-breakpoint
ALTER TABLE `examinations` ADD INDEX `idx_examinations_patient` (`patientId`);
--> statement-breakpoint
ALTER TABLE `examinations` ADD INDEX `idx_examinations_visit` (`visitId`);
--> statement-breakpoint
ALTER TABLE `sheet_entries` ADD INDEX `idx_sheet_entries_patient_type` (`patientId`, `sheetType`);
