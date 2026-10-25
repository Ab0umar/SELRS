ALTER TABLE whatsapp_confirmation_attempts ADD COLUMN request_key CHAR(64) NULL;
CREATE UNIQUE INDEX whatsapp_confirmation_request ON whatsapp_confirmation_attempts (request_key);
