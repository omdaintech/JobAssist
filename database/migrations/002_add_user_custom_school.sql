-- Migration: Add user_custom_school JSON field to users table
-- Date: 2025-09-14
-- Description: Add user_custom_school JSON field for school-specific custom data
--              Restricted to keys: student_code, batch, remark

-- Add the user_custom_school column to users table
ALTER TABLE users 
ADD COLUMN user_custom_school JSON DEFAULT ('{}');

-- Add comment to document allowed keys
ALTER TABLE users 
MODIFY COLUMN user_custom_school JSON DEFAULT ('{}') 
COMMENT 'School-specific custom data. ALLOWED KEYS ONLY: student_code, batch, remark. DO NOT add new keys without explicit instruction.';

-- Create index for JSON queries if needed
-- CREATE INDEX idx_users_custom_school_student_code ON users ((JSON_UNQUOTE(JSON_EXTRACT(user_custom_school, '$.student_code'))));
-- CREATE INDEX idx_users_custom_school_batch ON users ((JSON_UNQUOTE(JSON_EXTRACT(user_custom_school, '$.batch'))));
