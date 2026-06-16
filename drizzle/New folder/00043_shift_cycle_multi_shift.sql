ALTER TABLE `shift_staff_cycle` DROP PRIMARY KEY, ADD PRIMARY KEY (`staff_id`, `day_of_week`, `shift_name`);
