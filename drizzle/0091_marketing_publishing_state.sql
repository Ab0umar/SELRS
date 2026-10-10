ALTER TABLE marketing_posts
  MODIFY COLUMN status ENUM('draft', 'publishing', 'published', 'failed', 'scheduled')
  NOT NULL DEFAULT 'draft';
