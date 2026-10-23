ALTER TABLE `auto_reply_knowledge` MODIFY COLUMN `content` mediumtext NOT NULL;
--> statement-breakpoint
ALTER TABLE `auto_reply_knowledge` ADD COLUMN `source_url` varchar(2048) NULL;
--> statement-breakpoint
ALTER TABLE `auto_reply_conversations` ADD COLUMN `context_reset_at` bigint NULL;
