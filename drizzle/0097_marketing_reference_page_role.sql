ALTER TABLE marketing_reference_designs
  ADD COLUMN page_role ENUM('center', 'doctor') NOT NULL DEFAULT 'center' AFTER mime_type;
