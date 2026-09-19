CREATE TABLE IF NOT EXISTS `whatsapp_marketing_subscriptions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `phone` varchar(32) NOT NULL,
  `patient_id` int,
  `status` enum('pending','subscribed','unsubscribed') NOT NULL DEFAULT 'pending',
  `source` varchar(64) NOT NULL,
  `responded_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `whatsapp_marketing_subscriptions_id` PRIMARY KEY(`id`),
  CONSTRAINT `uq_whatsapp_marketing_subscription_phone` UNIQUE(`phone`)
);--> statement-breakpoint
CREATE INDEX `idx_whatsapp_marketing_subscription_status` ON `whatsapp_marketing_subscriptions` (`status`);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `whatsapp_marketing_campaigns` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(255) NOT NULL,
  `kind` enum('opt_in','promotion') NOT NULL,
  `template_name` varchar(255) NOT NULL,
  `status` enum('draft','sending','sent','failed') NOT NULL DEFAULT 'draft',
  `created_by` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `sent_at` timestamp NULL,
  CONSTRAINT `whatsapp_marketing_campaigns_id` PRIMARY KEY(`id`)
);--> statement-breakpoint
CREATE INDEX `idx_whatsapp_marketing_campaign_created` ON `whatsapp_marketing_campaigns` (`created_at`);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `whatsapp_marketing_deliveries` (
  `id` int AUTO_INCREMENT NOT NULL,
  `campaign_id` int NOT NULL,
  `patient_id` int,
  `recipient_phone` varchar(32) NOT NULL,
  `status` enum('accepted','failed') NOT NULL DEFAULT 'accepted',
  `meta_message_id` varchar(128),
  `error_message` text,
  `sent_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `whatsapp_marketing_deliveries_id` PRIMARY KEY(`id`)
);--> statement-breakpoint
CREATE INDEX `idx_whatsapp_marketing_delivery_campaign` ON `whatsapp_marketing_deliveries` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `idx_whatsapp_marketing_delivery_recipient` ON `whatsapp_marketing_deliveries` (`recipient_phone`);
