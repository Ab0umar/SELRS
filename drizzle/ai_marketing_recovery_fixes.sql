ALTER TABLE marketing_generation_jobs MODIFY COLUMN state ENUM('starting','running','completed','failed','uncertain') NOT NULL DEFAULT 'starting';
CREATE TABLE IF NOT EXISTS ai_marketing_job_context (
  job_id VARCHAR(36) PRIMARY KEY,
  provider ENUM('manus','gemini') NOT NULL,
  image_model VARCHAR(100) NULL,
  target_page_id VARCHAR(100) NULL
) ENGINE=InnoDB;
