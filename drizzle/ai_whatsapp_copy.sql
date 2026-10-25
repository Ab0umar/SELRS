INSERT INTO ai_core_profiles (workload,provider,model,enabled,daily_requests,daily_tokens,max_concurrent)
VALUES ('whatsapp.marketing','gemini','gemini-3.8-flash',0,20,100000,1);
CREATE TABLE ai_whatsapp_drafts (
 request_id VARCHAR(36) PRIMARY KEY,
 input_hash CHAR(64) NOT NULL,
 created_by INT NOT NULL,
 variants_json TEXT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
