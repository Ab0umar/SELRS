CREATE TABLE ai_marketing_jobs (
  id VARCHAR(36) PRIMARY KEY,
  page_role ENUM('center','doctor') NOT NULL,
  post_day ENUM('saturday','tuesday','thursday') NOT NULL,
  topic VARCHAR(255) NOT NULL,
  state ENUM('running','completed','uncertain') NOT NULL DEFAULT 'running',
  generated_json TEXT NULL,
  post_id INT NULL,
  error_code VARCHAR(80) NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
