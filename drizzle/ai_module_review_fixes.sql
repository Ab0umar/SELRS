CREATE TABLE IF NOT EXISTS ai_operation_requests (
  request_id VARCHAR(36) PRIMARY KEY,
  scope ENUM('marketing','probe') NOT NULL,
  owner INT NOT NULL,
  state ENUM('preflight','accepted','rejected') NOT NULL DEFAULT 'preflight',
  context_json TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ai_marketing_schedule_status (
  page_role ENUM('center','doctor') PRIMARY KEY,
  status ENUM('idle','running','error') NOT NULL DEFAULT 'idle',
  last_run TIMESTAMP NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
