ALTER TABLE ai_marketing_jobs
  ADD COLUMN image_artifact VARCHAR(1000) NULL,
  ADD COLUMN image_usage_id VARCHAR(36) NULL,
  ADD COLUMN execution_id VARCHAR(36) NULL;
CREATE TABLE ai_marketing_recoveries (
  id VARCHAR(36) PRIMARY KEY,
  job_id VARCHAR(36) NOT NULL,
  action ENUM('attach','image_retry','blocked') NOT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX ai_marketing_recovery_job (job_id)
) ENGINE=InnoDB;
