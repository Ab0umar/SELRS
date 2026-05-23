ALTER TABLE `salary_basics`
  ADD COLUMN `yearly_raise` decimal(12,2) NOT NULL DEFAULT 0 AFTER `reception_allowance`;
