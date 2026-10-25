-- One-time migration. Keep historical requests and cancellations.
ALTER TABLE visit_schedule_requests
  ADD COLUMN patientId INT NULL,
  ADD COLUMN status ENUM('scheduled', 'registered', 'cancelled') NOT NULL DEFAULT 'scheduled',
  ADD INDEX idx_visit_schedule_patient_status (patientId, status);
