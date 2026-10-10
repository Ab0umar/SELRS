UPDATE marketing_facebook_pages p
JOIN marketing_settings s ON 1 = 1
SET p.content_name = COALESCE(s.clinic_name, p.page_name)
WHERE p.page_role = 'center' AND p.content_name IS NULL;
