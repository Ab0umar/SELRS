ALTER TABLE marketing_posts
  ADD COLUMN page_role ENUM('center', 'doctor') NOT NULL DEFAULT 'center' AFTER platform;
