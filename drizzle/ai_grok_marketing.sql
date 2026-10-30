ALTER TABLE ai_core_profiles MODIFY COLUMN provider ENUM('gemini','manus','grok') NOT NULL;
ALTER TABLE ai_core_usage MODIFY COLUMN provider ENUM('gemini','manus','grok') NOT NULL;
ALTER TABLE ai_marketing_job_context MODIFY COLUMN provider ENUM('manus','gemini','grok') NOT NULL;
