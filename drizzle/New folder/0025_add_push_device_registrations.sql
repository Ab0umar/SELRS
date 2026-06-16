CREATE TABLE `push_device_registrations` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `provider` enum('fcm') NOT NULL DEFAULT 'fcm',
  `platform` enum('android','ios','web') NOT NULL,
  `token` varchar(512) NOT NULL,
  `deviceId` varchar(191),
  `appVersion` varchar(64),
  `build` varchar(64),
  `lastSeenAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `disabledAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `push_device_registrations_id` PRIMARY KEY(`id`)
);

CREATE UNIQUE INDEX `ux_push_device_registrations_token` ON `push_device_registrations` (`token`);
CREATE INDEX `idx_push_device_user_device` ON `push_device_registrations` (`userId`,`deviceId`);
CREATE INDEX `idx_push_device_active_user` ON `push_device_registrations` (`userId`,`disabledAt`,`lastSeenAt`);
