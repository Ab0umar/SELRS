ALTER TABLE `stock_transactions` ADD COLUMN `transactionDate` date;
--> statement-breakpoint
UPDATE `stock_transactions` SET `transactionDate` = DATE(`createdAt`) WHERE `transactionDate` IS NULL;
