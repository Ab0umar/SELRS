ALTER TABLE ai_marketing_jobs
  ADD COLUMN kind ENUM('post','image') NOT NULL DEFAULT 'post',
  ADD COLUMN source_post_id INT NULL,
  ADD COLUMN post_snapshot CHAR(64) NULL,
  MODIFY COLUMN created_by INT NULL,
  ADD INDEX ai_marketing_image_pending (source_post_id,state);
CREATE TABLE ai_marketing_scheduler (
  page_role ENUM('center','doctor') PRIMARY KEY,
  provider ENUM('manus','central') NOT NULL DEFAULT 'manus'
) ENGINE=InnoDB;
INSERT INTO ai_marketing_scheduler (page_role,provider) VALUES ('center','manus'),('doctor','manus');
CREATE TABLE ai_marketing_schedule_claims (
  id VARCHAR(36) PRIMARY KEY,
  provider ENUM('manus','central') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
