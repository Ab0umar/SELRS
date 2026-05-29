CREATE TABLE salary_holidays (
  id int NOT NULL AUTO_INCREMENT,
  date date NOT NULL,
  name varchar(100) NOT NULL DEFAULT '',
  year int NOT NULL,
  month int NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_holiday_date (date)
);
