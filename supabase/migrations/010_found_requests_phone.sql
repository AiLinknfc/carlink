-- 010: add finder_phone to found_requests
ALTER TABLE found_requests ADD COLUMN IF NOT EXISTS finder_phone TEXT DEFAULT '';
