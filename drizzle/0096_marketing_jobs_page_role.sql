ALTER TABLE marketing_generation_jobs
  ADD COLUMN page_role ENUM('center', 'doctor') NOT NULL DEFAULT 'center' AFTER topic;
