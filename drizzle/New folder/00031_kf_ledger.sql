-- KF Module: create kf_ledger table for manual cash entries

CREATE TABLE IF NOT EXISTS `kf_ledger` (
  `kf_ledger_id`        INT            NOT NULL AUTO_INCREMENT,
  `entry_date`          DATE           NOT NULL,
  `income`              INT            NOT NULL DEFAULT 0,
  `expense`             INT            NOT NULL DEFAULT 0,
  `notes`               VARCHAR(500),
  `created_by_user_id`  INT,
  `created_at`          TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`kf_ledger_id`),
  KEY `kf_ledger_date_idx` (`entry_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
