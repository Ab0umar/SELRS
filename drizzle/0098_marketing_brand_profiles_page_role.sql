ALTER TABLE marketing_brand_profile
  ADD COLUMN page_role ENUM('center', 'doctor') NOT NULL DEFAULT 'center' AFTER id,
  ADD UNIQUE KEY uq_marketing_brand_profile_role (page_role);
