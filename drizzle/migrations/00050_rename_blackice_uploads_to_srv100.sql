-- Rename the Pentacam/BlackIce uploads table to its current product name.
-- The application code now references `srv100_uploads`; apply this together
-- with a server rebuild so no running code points at the old name.
RENAME TABLE blackice_uploads TO srv100_uploads;
