ALTER TABLE `auto_reply_conversations` ADD COLUMN `handoff_notified_at` bigint NULL;
--> statement-breakpoint
UPDATE `auto_reply_conversations` SET `handoff_notified_at` = UNIX_TIMESTAMP() * 1000 WHERE `status` = 'human' AND `handoff_notified_at` IS NULL;
