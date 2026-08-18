-- Migration: Set default preferred language for users
-- Purpose: Update existing users with null preferred_language_id to German (687b9e32e94239d063f47070)
-- Date: 2025-10-09

-- Update existing users with null preferred_language_id to German
UPDATE users 
SET preferred_language_id = '687b9e32e94239d063f47070' 
WHERE preferred_language_id IS NULL;

-- Alter table to make preferred_language_id NOT NULL with default value
ALTER TABLE users 
MODIFY COLUMN preferred_language_id VARCHAR(24) NOT NULL DEFAULT '687b9e32e94239d063f47070';

-- Verify the change
SELECT COUNT(*) as total_users, 
       COUNT(preferred_language_id) as users_with_language,
       COUNT(*) - COUNT(preferred_language_id) as users_without_language
FROM users;