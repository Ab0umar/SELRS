-- Rename /admin-hub permission paths to /booking-triage
-- Reverse: UPDATE user_permissions SET pageId = CONCAT('/admin-hub', SUBSTRING(pageId, LENGTH('/booking-triage') + 1)) WHERE pageId LIKE '/booking-triage%';

UPDATE user_permissions
SET pageId = CONCAT('/booking-triage', SUBSTRING(pageId, LENGTH('/admin-hub') + 1))
WHERE pageId = '/admin-hub' OR pageId LIKE '/admin-hub/%';
