CREATE TABLE IF NOT EXISTS `services` (
  `id` varchar(36) NOT NULL,
  `code` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `category` varchar(255),
  `serviceType` varchar(64) NOT NULL,
  `srvTyp` varchar(4),
  `defaultSheet` varchar(64),
  `locationType` varchar(32) DEFAULT 'center',
  `price` decimal(10,2) NOT NULL DEFAULT 0,
  `isActive` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `services_id` PRIMARY KEY(`id`),
  UNIQUE KEY `services_code_unique` (`code`)
);
