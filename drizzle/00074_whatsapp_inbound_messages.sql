CREATE TABLE `whatsapp_inbound_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`wa_message_id` varchar(128),
	`from_phone` varchar(32),
	`message_type` varchar(32),
	`body` text,
	`raw_payload` text,
	`received_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `whatsapp_inbound_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_whatsapp_inbound_wa_message_id` ON `whatsapp_inbound_messages` (`wa_message_id`);
--> statement-breakpoint
CREATE INDEX `idx_whatsapp_inbound_from_phone` ON `whatsapp_inbound_messages` (`from_phone`);
