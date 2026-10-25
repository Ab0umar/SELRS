CREATE TABLE IF NOT EXISTS ai_core_profiles (
  workload VARCHAR(40) PRIMARY KEY,
  provider ENUM('gemini','manus') NOT NULL,
  model VARCHAR(100) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  daily_requests INT UNSIGNED NOT NULL DEFAULT 20,
  daily_tokens INT UNSIGNED NOT NULL DEFAULT 100000,
  max_concurrent INT UNSIGNED NOT NULL DEFAULT 2
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ai_core_usage (
  request_id VARCHAR(36) PRIMARY KEY,
  workload VARCHAR(40) NOT NULL,
  provider ENUM('gemini','manus') NOT NULL,
  model VARCHAR(100) NOT NULL,
  budget_day CHAR(10) NOT NULL,
  state ENUM('reserved','running','completed','failed','uncertain') NOT NULL,
  reserved_tokens INT UNSIGNED NOT NULL,
  input_tokens INT UNSIGNED NOT NULL DEFAULT 0,
  output_tokens INT UNSIGNED NOT NULL DEFAULT 0,
  credits DOUBLE NULL,
  task_id VARCHAR(100) NULL,
  error_code VARCHAR(60) NULL,
  created_ms BIGINT NOT NULL,
  updated_ms BIGINT NOT NULL,
  INDEX ai_core_usage_budget (workload,budget_day),
  INDEX ai_core_usage_pending (state,updated_ms)
) ENGINE=InnoDB;

INSERT IGNORE INTO ai_core_profiles (workload,provider,model) VALUES
('reply.preview','gemini','gemini-3.8-flash'),
('marketing.text','manus','lite'),
('marketing.image','manus','standard'),
('medical.synthetic','gemini','gemini-3.8-flash');
