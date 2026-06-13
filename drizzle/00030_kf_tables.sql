-- KF Module: create isolated kf_* tables (MySQL only, no MSSQL)

CREATE TABLE IF NOT EXISTS `kf_patients` (
  `kf_id` INT NOT NULL AUTO_INCREMENT,
  `kf_code` VARCHAR(20) NOT NULL,
  `full_name` VARCHAR(255) NOT NULL,
  `date_of_birth` DATE,
  `age` INT,
  `gender` ENUM('male','female'),
  `national_id` VARCHAR(20),
  `phone` VARCHAR(20),
  `alternate_phone` VARCHAR(20),
  `address` TEXT,
  `occupation` VARCHAR(255),
  `medical_history` TEXT,
  `allergies` TEXT,
  `notes` TEXT,
  `selrs_patient_code` VARCHAR(50),
  `created_by_user_id` INT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`kf_id`),
  UNIQUE KEY `kf_patients_kf_code_unique` (`kf_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `kf_visits` (
  `kf_visit_id` INT NOT NULL AUTO_INCREMENT,
  `kf_patient_id` INT NOT NULL,
  `visit_date` DATE NOT NULL,
  `visit_type` ENUM('consultation','examination','followup','operation') DEFAULT 'consultation',
  `doctor_name` VARCHAR(255),
  `status` ENUM('scheduled','arrived','in_progress','completed','cancelled') DEFAULT 'scheduled',
  `notes` TEXT,
  `created_by_user_id` INT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`kf_visit_id`),
  KEY `kf_visits_patient_idx` (`kf_patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `kf_examinations` (
  `kf_exam_id` INT NOT NULL AUTO_INCREMENT,
  `kf_patient_id` INT NOT NULL,
  `kf_visit_id` INT,
  `exam_date` DATE NOT NULL,
  `right_va` VARCHAR(20),
  `left_va` VARCHAR(20),
  `right_refraction` JSON,
  `left_refraction` JSON,
  `iop_right` VARCHAR(20),
  `iop_left` VARCHAR(20),
  `diagnosis` TEXT,
  `plan` TEXT,
  `notes` TEXT,
  `doctor_name` VARCHAR(255),
  `examined_by_user_id` INT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`kf_exam_id`),
  KEY `kf_exam_patient_idx` (`kf_patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `kf_operations` (
  `kf_op_id` INT NOT NULL AUTO_INCREMENT,
  `kf_patient_id` INT NOT NULL,
  `kf_visit_id` INT,
  `op_date` DATE NOT NULL,
  `op_type` VARCHAR(255) NOT NULL,
  `eye` ENUM('right','left','both'),
  `doctor_name` VARCHAR(255),
  `status` ENUM('scheduled','completed','cancelled') DEFAULT 'scheduled',
  `notes` TEXT,
  `created_by_user_id` INT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`kf_op_id`),
  KEY `kf_op_patient_idx` (`kf_patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `kf_followups` (
  `kf_followup_id` INT NOT NULL AUTO_INCREMENT,
  `kf_patient_id` INT NOT NULL,
  `kf_visit_id` INT,
  `kf_op_id` INT,
  `followup_date` DATE NOT NULL,
  `notes` TEXT,
  `status` ENUM('scheduled','completed','missed') DEFAULT 'scheduled',
  `created_by_user_id` INT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`kf_followup_id`),
  KEY `kf_followup_patient_idx` (`kf_patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
