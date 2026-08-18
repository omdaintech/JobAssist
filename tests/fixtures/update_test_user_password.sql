-- Update password for test user for testing
-- New password: TestPass123
-- Run this on your LOCAL MySQL database ONLY (not production!)

UPDATE users 
SET password_hash = '$2b$12$ae89LOOfHGnyxwFLpwzOoOXWak8Uw8aUfNp.crXFM/scgx2YyGO/K'
WHERE email = 'testuser@example.com';

-- Verify update
SELECT id, email, name, current_level, is_active 
FROM users 
WHERE email = 'testuser@example.com';

