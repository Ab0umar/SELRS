CREATE TABLE patient_portal_otps (
  id int NOT NULL AUTO_INCREMENT,
  phone varchar(20) NOT NULL,
  code varchar(6) NOT NULL,
  expiresAt timestamp NOT NULL,
  verified tinyint(1) NOT NULL DEFAULT 0,
  attempts int NOT NULL DEFAULT 0,
  createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_portal_otp_phone (phone)
);
--> statement-breakpoint
CREATE TABLE patient_portal_sessions (
  id int NOT NULL AUTO_INCREMENT,
  patientId int NOT NULL,
  token varchar(512) NOT NULL,
  expiresAt timestamp NOT NULL,
  createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY idx_portal_session_token (token),
  KEY idx_portal_session_patient (patientId)
);
--> statement-breakpoint
CREATE TABLE booking_schedule_config (
  id int NOT NULL AUTO_INCREMENT,
  bookingType enum('consultant','specialist','lasik','external') NOT NULL,
  weekdayMask int NOT NULL DEFAULT 127,
  isActive tinyint(1) NOT NULL DEFAULT 1,
  updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY idx_booking_schedule_type (bookingType)
);
--> statement-breakpoint
CREATE TABLE patient_portal_bookings (
  id int NOT NULL AUTO_INCREMENT,
  patientId int NOT NULL,
  bookingType enum('consultant','specialist','lasik','external') NOT NULL,
  requestedDate date NOT NULL,
  notes text,
  status enum('pending','confirmed','cancelled','completed') NOT NULL DEFAULT 'pending',
  staffNotes text,
  confirmedDate date,
  createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_portal_booking_patient (patientId),
  KEY idx_portal_booking_date (requestedDate),
  KEY idx_portal_booking_status (status)
);
