CREATE TABLE IF NOT EXISTS referral_doctors (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  specialty VARCHAR(255) NOT NULL,
  hospital VARCHAR(255) NOT NULL,
  schedule TEXT NOT NULL,
  address TEXT NOT NULL
);

ALTER TABLE referralLetters
  ADD COLUMN referralDoctorId INT NULL,
  ADD COLUMN referredAddress TEXT NULL,
  ADD COLUMN referredSchedule TEXT NULL;
