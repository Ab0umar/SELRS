CREATE TABLE `auto_reply_onboarding` (
  `id` varchar(36) NOT NULL PRIMARY KEY,
  `user_id` int NOT NULL,
  `session_hash` varchar(64) NOT NULL,
  `state` varchar(32) NOT NULL DEFAULT 'created',
  `token_cipher` text,
  `details` json NOT NULL,
  `created_at` bigint NOT NULL,
  `expires_at` bigint NOT NULL,
  `updated_at` bigint NOT NULL,
  INDEX `ar_onboarding_state` (`state`, `updated_at`)
);
--> statement-breakpoint
CREATE TABLE `auto_reply_sync_events` (
  `id` varchar(64) NOT NULL PRIMARY KEY,
  `attempt_id` varchar(36) NOT NULL,
  `field` varchar(32) NOT NULL,
  `payload_cipher` mediumtext,
  `state` varchar(16) NOT NULL DEFAULT 'pending',
  `attempts` int NOT NULL DEFAULT 0,
  `created_at` bigint NOT NULL,
  INDEX `ar_sync_queue` (`state`, `created_at`)
);
--> statement-breakpoint
CREATE TABLE `auto_reply_contacts` (
  `id` varchar(64) NOT NULL PRIMARY KEY,
  `account_id` varchar(128) NOT NULL,
  `phone` varchar(64) NOT NULL,
  `name_cipher` text NOT NULL,
  `source_at` bigint NOT NULL,
  `updated_at` bigint NOT NULL,
  INDEX `ar_contacts_account` (`account_id`)
);
