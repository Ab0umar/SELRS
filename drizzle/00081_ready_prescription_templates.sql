CREATE TABLE IF NOT EXISTS `ready_prescription_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_key` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ready_rx_template_key_uq` (`template_key`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ready_prescription_template_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_id` int NOT NULL,
  `sort_order` int NOT NULL DEFAULT 0,
  `medication_name` varchar(255) NOT NULL,
  `dosage` varchar(100) NULL,
  `frequency` varchar(100) NULL,
  `duration` varchar(100) NULL,
  `instructions` text NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ready_rx_item_template_idx` (`template_id`),
  KEY `ready_rx_item_order_idx` (`template_id`, `sort_order`),
  CONSTRAINT `ready_rx_item_template_fk`
    FOREIGN KEY (`template_id`) REFERENCES `ready_prescription_templates` (`id`)
    ON DELETE CASCADE
);
