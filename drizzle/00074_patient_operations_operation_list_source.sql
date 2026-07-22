ALTER TABLE `patientOperations`
MODIFY COLUMN `source` enum('sheet','surgery','followup','service_code','operation_list','manual') NOT NULL DEFAULT 'manual';
