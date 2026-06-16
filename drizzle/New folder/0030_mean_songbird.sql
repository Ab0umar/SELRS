CREATE TABLE `accAdvances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accessId` int NOT NULL,
	`txDate` date NOT NULL,
	`advance` decimal(15,2),
	`repayment` decimal(15,2),
	`notes` varchar(500),
	`employee` varchar(200),
	`total` decimal(15,2),
	`syncedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `accAdvances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `accCategories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accessId` int NOT NULL,
	`name` varchar(200),
	`entity` varchar(200),
	`isPaid` boolean DEFAULT false,
	`syncedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `accCategories_id` PRIMARY KEY(`id`),
	CONSTRAINT `accCategories_accessId` UNIQUE(`accessId`)
);
--> statement-breakpoint
CREATE TABLE `accEmployees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accessId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`syncedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `accEmployees_id` PRIMARY KEY(`id`),
	CONSTRAINT `accEmployees_accessId` UNIQUE(`accessId`)
);
--> statement-breakpoint
CREATE TABLE `accHome` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accessId` int NOT NULL,
	`txDate` date NOT NULL,
	`total` decimal(15,2),
	`balance` decimal(15,2),
	`inAmount` decimal(15,2),
	`outAmount` decimal(15,2),
	`notes` varchar(500),
	`syncedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `accHome_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `accInstagram` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accessId` int NOT NULL,
	`txDate` date NOT NULL,
	`total` decimal(15,2),
	`balance` decimal(15,2),
	`inAmount` decimal(15,2),
	`outAmount` decimal(15,2),
	`notes` varchar(500),
	`syncedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `accInstagram_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `accLedger` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accessId` int NOT NULL,
	`total` decimal(15,2),
	`balance` decimal(15,2),
	`income` decimal(15,2),
	`expense` decimal(15,2),
	`txDate` date NOT NULL,
	`notes` varchar(500),
	`syncedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `accLedger_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `accLoans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accessId` int NOT NULL,
	`name` varchar(200),
	`amount` decimal(15,2),
	`repayment` decimal(15,2),
	`remaining` decimal(15,2),
	`txDate` date NOT NULL,
	`notes` text,
	`syncedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `accLoans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `accSaadany` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accessId` int NOT NULL,
	`txDate` date NOT NULL,
	`withdrawals` decimal(15,2),
	`repayment` decimal(15,2),
	`notes` varchar(500),
	`total` decimal(15,2),
	`syncedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `accSaadany_id` PRIMARY KEY(`id`),
	CONSTRAINT `accSaadany_accessId` UNIQUE(`accessId`)
);
--> statement-breakpoint
CREATE INDEX `accAdvances_accessId` ON `accAdvances` (`accessId`);--> statement-breakpoint
CREATE INDEX `accHome_accessId` ON `accHome` (`accessId`);--> statement-breakpoint
CREATE INDEX `accInstagram_accessId` ON `accInstagram` (`accessId`);--> statement-breakpoint
CREATE INDEX `accLedger_accessId` ON `accLedger` (`accessId`);--> statement-breakpoint
CREATE INDEX `accLoans_accessId` ON `accLoans` (`accessId`);