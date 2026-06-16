-- Rename /txhub permission path to /treatment
-- Reverse: UPDATE user_permissions SET pageId = '/txhub' WHERE pageId = '/treatment';

UPDATE user_permissions SET pageId = '/treatment' WHERE pageId = '/txhub';
