ALTER TABLE marketing_reference_designs
  ADD COLUMN analysis_status VARCHAR(20) NOT NULL DEFAULT 'pending' AFTER style_attributes,
  ADD COLUMN analysis_error TEXT NULL AFTER analysis_status;
