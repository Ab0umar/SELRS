CREATE TABLE IF NOT EXISTS `auto_reply_settings` (
  `id` int NOT NULL PRIMARY KEY,
  `config` json NOT NULL,
  `revision` int NOT NULL DEFAULT 0,
  `updated_by` int NULL,
  `updated_at` bigint NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `auto_reply_knowledge` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `kind` varchar(32) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `keywords` text NOT NULL,
  `source` varchar(100) NULL,
  `approved` boolean NOT NULL DEFAULT false,
  `updated_by` int NULL,
  `updated_at` bigint NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `auto_reply_conversations` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `identity_hash` varchar(64) NOT NULL,
  `channel` varchar(32) NOT NULL,
  `account_id` varchar(128) NOT NULL,
  `participant_id` varchar(128) NOT NULL,
  `thread_id` varchar(255) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'open',
  `human_reason` varchar(64) NULL,
  `last_inbound_at` bigint NOT NULL,
  `last_activity_at` bigint NOT NULL,
  `revision` int NOT NULL DEFAULT 0,
  UNIQUE KEY `ar_conversation_identity` (`identity_hash`),
  KEY `ar_conversation_activity` (`last_activity_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `auto_reply_events` (
  `id` varchar(64) NOT NULL PRIMARY KEY,
  `received_at` bigint NOT NULL,
  KEY `ar_event_received` (`received_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `auto_reply_messages` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `conversation_id` int NOT NULL,
  `event_key` varchar(64) NOT NULL,
  `provider_id` varchar(255) NULL,
  `direction` varchar(20) NOT NULL,
  `body` text NOT NULL,
  `state` varchar(32) NOT NULL DEFAULT 'received',
  `created_at` bigint NOT NULL,
  UNIQUE KEY `ar_message_event` (`event_key`),
  KEY `ar_message_conversation` (`conversation_id`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `auto_reply_jobs` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `conversation_id` int NOT NULL,
  `inbound_id` int NULL,
  `request_key` varchar(64) NOT NULL,
  `kind` varchar(16) NOT NULL,
  `handoff` boolean NOT NULL DEFAULT false,
  `body` text NULL,
  `state` varchar(32) NOT NULL DEFAULT 'pending',
  `attempts` int NOT NULL DEFAULT 0,
  `available_at` bigint NOT NULL,
  `lease_until` bigint NULL,
  `claim` varchar(36) NULL,
  `revision` int NOT NULL,
  `provider_id` varchar(255) NULL,
  `error_code` varchar(64) NULL,
  `model` varchar(100) NULL,
  `input_tokens` int NOT NULL DEFAULT 0,
  `output_tokens` int NOT NULL DEFAULT 0,
  `created_at` bigint NOT NULL,
  `updated_at` bigint NOT NULL,
  UNIQUE KEY `ar_job_request` (`request_key`),
  KEY `ar_job_queue` (`state`, `available_at`),
  KEY `ar_job_conversation` (`conversation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `auto_reply_connections` (
  `channel` varchar(32) NOT NULL PRIMARY KEY,
  `checked_at` bigint NULL,
  `check_ok` boolean NOT NULL DEFAULT false,
  `fingerprint` varchar(64) NULL,
  `error_code` varchar(64) NULL,
  `last_webhook_at` bigint NULL,
  `last_mobile_echo_at` bigint NULL,
  `last_sent_at` bigint NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
