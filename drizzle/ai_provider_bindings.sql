CREATE TABLE IF NOT EXISTS ai_provider_bindings (
  request_id VARCHAR(36) NOT NULL PRIMARY KEY,
  input_hash CHAR(64) NOT NULL
) ENGINE=InnoDB;
