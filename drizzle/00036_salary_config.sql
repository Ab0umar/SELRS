CREATE TABLE `salary_config` (
  `key` varchar(64) NOT NULL,
  `value` varchar(255) NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
);

INSERT INTO `salary_config` (`key`, `value`) VALUES
  ('attendance_rate_3', '0.25'),
  ('attendance_rate_5', '0.15'),
  ('attendance_rate_7', '0.10'),
  ('attendance_rate_10', '0.05');
