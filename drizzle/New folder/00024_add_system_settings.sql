CREATE TABLE IF NOT EXISTS `systemSettings` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `key` varchar(255) NOT NULL,
  `value` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `systemSettings_key_unique` UNIQUE(`key`)
);
