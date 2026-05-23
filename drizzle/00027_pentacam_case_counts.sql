ALTER TABLE `salary_commission_pools`
  ADD COLUMN `cases_450` int NOT NULL DEFAULT 0 AFTER `pentacam_pool`,
  ADD COLUMN `cases_400` int NOT NULL DEFAULT 0 AFTER `cases_450`,
  ADD COLUMN `cases_350` int NOT NULL DEFAULT 0 AFTER `cases_400`,
  ADD COLUMN `cases_250` int NOT NULL DEFAULT 0 AFTER `cases_350`;
