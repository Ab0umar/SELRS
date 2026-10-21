ALTER TABLE `auto_reply_connections` ADD COLUMN `account_id` varchar(128) NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE `auto_reply_connections` DROP PRIMARY KEY, ADD PRIMARY KEY (`channel`, `account_id`);
