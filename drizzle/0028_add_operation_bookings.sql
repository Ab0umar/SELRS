CREATE TABLE IF NOT EXISTS `operationBookings` (
  `id` int AUTO_INCREMENT NOT NULL,
  `bookingDate` date NOT NULL,
  `weekdayLabel` varchar(80),
  `bookingTime` varchar(20) NOT NULL,
  `doctorName` varchar(255) NOT NULL,
  `operationType` varchar(100) NOT NULL,
  `casesCount` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `operationBookings_id` PRIMARY KEY(`id`),
  KEY `idx_operation_booking_date` (`bookingDate`)
);
