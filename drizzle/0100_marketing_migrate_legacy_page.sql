INSERT INTO marketing_facebook_pages (
  page_role,
  page_id,
  page_name,
  access_token,
  auto_publish,
  saturday_enabled,
  tuesday_enabled,
  thursday_enabled,
  publish_hour,
  connected
)
SELECT
  'center',
  fb_page_id,
  COALESCE(fb_page_name, fb_page_id),
  fb_access_token,
  auto_publish,
  saturday_enabled,
  tuesday_enabled,
  thursday_enabled,
  publish_hour,
  fb_connected
FROM marketing_settings
WHERE fb_page_id IS NOT NULL
  AND fb_access_token IS NOT NULL
ON DUPLICATE KEY UPDATE
  page_name = VALUES(page_name),
  access_token = VALUES(access_token),
  auto_publish = VALUES(auto_publish),
  saturday_enabled = VALUES(saturday_enabled),
  tuesday_enabled = VALUES(tuesday_enabled),
  thursday_enabled = VALUES(thursday_enabled),
  publish_hour = VALUES(publish_hour),
  connected = VALUES(connected);
