-- Add Attendance Device Settings Table
-- Stores persistent fingerprint device configuration (IP, port, enabled state, etc.)
-- Single row (id=1) per deployment, survives server restarts

CREATE TABLE IF NOT EXISTS `attendance_device_settings` (
  `id` int NOT NULL PRIMARY KEY DEFAULT 1,
  `enabled` tinyint(1) NOT NULL DEFAULT 0,
  `ip` varchar(255) NOT NULL DEFAULT '192.168.1.100',
  `port` int NOT NULL DEFAULT 5005,
  `protocol` enum('tcp', 'udp') NOT NULL DEFAULT 'tcp',
  `fallback_to_access` tinyint(1) NOT NULL DEFAULT 1,
  `real_time_sync` tinyint(1) NOT NULL DEFAULT 1,
  `last_config_update` datetime,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ensure only one row can exist
INSERT IGNORE INTO `attendance_device_settings` (id, enabled, ip, port, protocol, fallback_to_access, real_time_sync)
VALUES (1, 0, '192.168.1.100', 5005, 'tcp', 1, 1);
