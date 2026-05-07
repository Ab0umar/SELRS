ALTER TABLE `push_device_registrations` DROP INDEX IF EXISTS `ux_push_device_registrations_token`;
ALTER TABLE `push_device_registrations` MODIFY COLUMN `token` varchar(2048) NOT NULL;
