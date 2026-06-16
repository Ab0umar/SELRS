CREATE TABLE `shift_staff_cycle` (
  `staff_id` int NOT NULL,
  `day_of_week` tinyint NOT NULL,
  `shift_name` varchar(128) NOT NULL,
  PRIMARY KEY (`staff_id`, `day_of_week`)
);
