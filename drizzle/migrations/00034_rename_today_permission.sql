-- Rename /today permission path to /bookings
-- Reverse: UPDATE user_permissions SET pageId = '/today' WHERE pageId = '/bookings';

UPDATE user_permissions SET pageId = '/bookings' WHERE pageId = '/today';
