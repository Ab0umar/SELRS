CREATE TABLE `login_rate_limits` (
  `key` varchar(255) NOT NULL,
  `attempts` int NOT NULL DEFAULT 0,
  `reset_at` timestamp NOT NULL,
  PRIMARY KEY (`key`)
);
