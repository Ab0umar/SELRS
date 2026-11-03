CREATE TABLE IF NOT EXISTS medical_ai_jobs (
  job_id VARCHAR(36) PRIMARY KEY,
  owner_id INT NOT NULL,
  patient_id INT NULL,
  visit_id INT NULL,
  provider ENUM('manus','gemini') NOT NULL,
  engine ENUM('current','central') NOT NULL,
  model VARCHAR(100) NULL,
  task_id VARCHAR(100) NULL,
  state ENUM('running','complete','failed') NOT NULL DEFAULT 'running',
  input_json MEDIUMTEXT NOT NULL,
  result_json MEDIUMTEXT NULL,
  failure_message VARCHAR(500) NULL,
  created_ms BIGINT NOT NULL,
  expires_ms BIGINT NOT NULL,
  INDEX medical_ai_jobs_expiry (expires_ms),
  INDEX medical_ai_jobs_patient (patient_id, created_ms)
) ENGINE=InnoDB
