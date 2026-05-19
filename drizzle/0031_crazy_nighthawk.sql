CREATE TABLE `stock_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`itemCode` varchar(100),
	`name` varchar(255) NOT NULL,
	`category` varchar(100),
	`supplier` varchar(255),
	`quantity` int NOT NULL DEFAULT 0,
	`status` enum('متوفر','كمية قليلة','نفذ المخزون') NOT NULL DEFAULT 'متوفر',
	`expiryDate` date,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stock_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `stock_items_itemCode_unique` UNIQUE(`itemCode`)
);
--> statement-breakpoint
CREATE TABLE `stock_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`itemId` int NOT NULL,
	`type` enum('add','dispense') NOT NULL,
	`quantity` int NOT NULL,
	`unitPrice` decimal(10,2),
	`totalValue` decimal(10,2),
	`employeeName` varchar(255),
	`performedBy` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stock_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
RENAME TABLE `accInstagram` TO `accInstapay`;--> statement-breakpoint
DROP INDEX `accInstagram_accessId` ON `accInstapay`;--> statement-breakpoint
ALTER TABLE `accInstapay` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `accInstapay` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `accLoans` ADD `total` decimal(15,2);--> statement-breakpoint
ALTER TABLE `operationListItems` ADD `notes` varchar(500);--> statement-breakpoint
CREATE INDEX `accInstapay_accessId` ON `accInstapay` (`accessId`);