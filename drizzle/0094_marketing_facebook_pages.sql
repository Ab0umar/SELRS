CREATE TABLE marketing_facebook_pages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  page_role ENUM('center', 'doctor') NOT NULL,
  page_id VARCHAR(255) NOT NULL,
  page_name VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,
  category VARCHAR(255) NULL,
  auto_publish BOOLEAN NOT NULL DEFAULT FALSE,
  saturday_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  tuesday_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  thursday_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  publish_hour INT NOT NULL DEFAULT 9,
  topic_direction ENUM('forward', 'reverse') NOT NULL DEFAULT 'forward',
  connected BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_marketing_facebook_page_role (page_role),
  UNIQUE KEY uq_marketing_facebook_page_id (page_id)
);
