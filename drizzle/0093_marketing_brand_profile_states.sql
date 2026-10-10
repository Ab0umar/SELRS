ALTER TABLE marketing_brand_profile
  ADD COLUMN typography_style TEXT NULL AFTER logo_placement_style,
  ADD COLUMN rebuild_status VARCHAR(20) NOT NULL DEFAULT 'idle' AFTER built_at,
  ADD COLUMN rebuild_error TEXT NULL AFTER rebuild_status,
  ADD COLUMN rebuild_started_at TIMESTAMP NULL AFTER rebuild_error;
