ALTER TABLE marketing_settings
  ADD COLUMN fb_oauth_role ENUM('center', 'doctor') NULL DEFAULT 'center' AFTER fb_pending_pages;
