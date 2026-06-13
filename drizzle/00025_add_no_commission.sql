ALTER TABLE `attendance_employees`
  ADD COLUMN `comm_attendance` boolean NOT NULL DEFAULT true,
  ADD COLUMN `comm_exam`       boolean NOT NULL DEFAULT true,
  ADD COLUMN `comm_pentacam`   boolean NOT NULL DEFAULT true;
