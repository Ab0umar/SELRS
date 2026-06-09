ALTER TABLE `visit_schedule_requests`
  ADD COLUMN `patientType` varchar(32) NULL DEFAULT 'existing'
    AFTER `service`;
