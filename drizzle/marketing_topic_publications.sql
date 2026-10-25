CREATE TABLE marketing_topic_publications (
  topic_key CHAR(64) PRIMARY KEY,
  normalized_topic TEXT NOT NULL,
  post_id INT NOT NULL,
  state ENUM('publishing','published') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
