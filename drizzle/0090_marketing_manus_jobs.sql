CREATE TABLE IF NOT EXISTS marketing_generation_jobs (
  id VARCHAR(36) PRIMARY KEY,
  task_id VARCHAR(64) NULL,
  kind ENUM('post', 'image') NOT NULL,
  state ENUM('starting', 'running', 'completed', 'failed') NOT NULL DEFAULT 'starting',
  topic VARCHAR(255) NOT NULL,
  post_day ENUM('saturday', 'tuesday', 'thursday') NOT NULL,
  post_id INT NULL,
  post_version TIMESTAMP NULL,
  created_by INT NULL,
  error TEXT NULL,
  credits INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_marketing_generation_state (state)
);
