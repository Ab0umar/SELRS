ALTER TABLE attendance_device_settings ADD COLUMN zk40_ip VARCHAR(255) NULL;
--> statement-breakpoint
ALTER TABLE attendance_device_settings ADD COLUMN zk40_port INT NULL DEFAULT 4370;
--> statement-breakpoint
ALTER TABLE attendance_device_settings ADD COLUMN zk40_enabled TINYINT(1) NOT NULL DEFAULT 0;
