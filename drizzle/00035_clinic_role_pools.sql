ALTER TABLE `salary_commission_pools`
  ADD COLUMN `exam_pool_consultant` decimal(12,2) DEFAULT NULL,
  ADD COLUMN `exam_pool_specialist` decimal(12,2) DEFAULT NULL;
