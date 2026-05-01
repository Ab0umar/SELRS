-- تشغيل يدوي إذا لم تُولَّد الهجرة تلقائياً: جدول طلبات تحديد الموعد (استقبال)
CREATE TABLE IF NOT EXISTS `visit_schedule_requests` (
  `id` int AUTO_INCREMENT NOT NULL,
  `fullName` varchar(255) NOT NULL,
  `age` int,
  `visitDate` date NOT NULL,
  `phone` varchar(32),
  `service` varchar(128) NOT NULL,
  `createdByUserId` int,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `visit_schedule_requests_id` PRIMARY KEY(`id`),
  KEY `idx_visit_schedule_requests_visitDate` (`visitDate`)
);
