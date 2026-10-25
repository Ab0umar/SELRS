CREATE TABLE whatsapp_confirmation_attempts (
 id VARCHAR(36) PRIMARY KEY,
 kind VARCHAR(40) NOT NULL,
 sender_phone_id VARCHAR(64) NOT NULL,
 recipient_phone VARCHAR(32) NULL,
 patient_name VARCHAR(255) NULL,
 template_name VARCHAR(100) NOT NULL,
 language VARCHAR(20) NOT NULL,
 state VARCHAR(20) NOT NULL,
 provider_message_id VARCHAR(255) NULL,
 event_ms BIGINT NULL,
 error_code VARCHAR(40) NULL,
 error_details TEXT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY whatsapp_confirmation_provider (provider_message_id),
 INDEX whatsapp_confirmation_created (created_at),
 INDEX whatsapp_confirmation_recipient (recipient_phone,created_at)
) ENGINE=InnoDB;
CREATE TABLE whatsapp_confirmation_receipts (
 id CHAR(64) PRIMARY KEY,
 sender_phone_id VARCHAR(64) NOT NULL,
 recipient_phone VARCHAR(32) NULL,
 provider_message_id VARCHAR(255) NOT NULL,
 state VARCHAR(20) NOT NULL,
 event_ms BIGINT NOT NULL,
 error_code VARCHAR(40) NULL,
 error_details TEXT NULL,
 received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX whatsapp_confirmation_receipt_message (sender_phone_id,provider_message_id),
 INDEX whatsapp_confirmation_receipt_received (received_at)
) ENGINE=InnoDB;
