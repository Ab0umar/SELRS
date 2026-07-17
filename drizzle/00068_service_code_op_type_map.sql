CREATE TABLE `serviceCodeOpTypeMap` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serviceCode` varchar(64) NOT NULL,
	`operationType` varchar(50) NOT NULL,
	`label` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `serviceCodeOpTypeMap_id` PRIMARY KEY(`id`),
	CONSTRAINT `serviceCodeOpTypeMap_serviceCode_unique` UNIQUE(`serviceCode`)
);
--> statement-breakpoint
ALTER TABLE `patientOperations` MODIFY COLUMN `source` enum('sheet','surgery','followup','service_code','manual') NOT NULL DEFAULT 'manual';
--> statement-breakpoint
INSERT INTO `serviceCodeOpTypeMap` (`serviceCode`, `operationType`, `label`) VALUES
('1503', 'PRK', NULL),
('1504', 'PRK', NULL),
('1509', 'Lasik', NULL),
('1510', 'Lasik', NULL),
('1511', 'PRK', 'PRK استشاري اول'),
('1512', 'PRK', 'PRK استشاري اول'),
('1514', 'PRK', 'PRK اخصائي'),
('1515', 'PRK', 'PRK اخصائي'),
('1516', 'PRK', 'PRK استشاري'),
('1517', 'PRK', 'PRK استشاري'),
('1518', 'Lasik', 'Lasik استشاري'),
('1519', 'Lasik', 'Lasik استشاري'),
('1578', 'Others', 'تثبيت'),
('1579', 'FL', 'فيمتو'),
('1580', 'Others', 'كاستم'),
('1618', 'Lasik', 'Lasik استشاري اول'),
('1619', 'Lasik', 'Lasik استشاري اول');
