ALTER TABLE `attendance_punches`
  ADD INDEX `idx_punch_device_at` (`device_id`, `punch_at`);
