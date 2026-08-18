-- Add Missing Foreign Key Constraints
-- Migration: 006_add_missing_foreign_keys.sql
-- Date: 2024-12-19
-- Purpose: Add FK constraints that were missing from the database but defined in SQLAlchemy models

-- Check if languages table exists before adding constraints
SELECT 'Adding foreign key constraints for language references' as status;

-- Add FK constraint for users.preferred_language_id -> languages.id
-- Only add if constraint doesn't already exist
SET @constraint_exists = (
    SELECT COUNT(*) 
    FROM information_schema.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = 'cefr_practice' 
    AND TABLE_NAME = 'users' 
    AND COLUMN_NAME = 'preferred_language_id' 
    AND REFERENCED_TABLE_NAME = 'languages'
);

SET @sql = IF(@constraint_exists = 0, 
    'ALTER TABLE users ADD CONSTRAINT fk_users_preferred_language FOREIGN KEY (preferred_language_id) REFERENCES languages(id) ON DELETE SET NULL',
    'SELECT "FK constraint fk_users_preferred_language already exists" as status'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add FK constraint for users.school_id -> schools.id  
-- Only add if constraint doesn't already exist
SET @constraint_exists = (
    SELECT COUNT(*) 
    FROM information_schema.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = 'cefr_practice' 
    AND TABLE_NAME = 'users' 
    AND COLUMN_NAME = 'school_id' 
    AND REFERENCED_TABLE_NAME = 'schools'
);

SET @sql = IF(@constraint_exists = 0, 
    'ALTER TABLE users ADD CONSTRAINT fk_users_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT',
    'SELECT "FK constraint fk_users_school already exists" as status'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add FK constraint for exam_detail.language_id -> languages.id
-- Only add if constraint doesn't already exist
SET @constraint_exists = (
    SELECT COUNT(*) 
    FROM information_schema.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = 'cefr_practice' 
    AND TABLE_NAME = 'exam_detail' 
    AND COLUMN_NAME = 'language_id' 
    AND REFERENCED_TABLE_NAME = 'languages'
);

SET @sql = IF(@constraint_exists = 0, 
    'ALTER TABLE exam_detail ADD CONSTRAINT fk_exam_detail_language FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE SET NULL',
    'SELECT "FK constraint fk_exam_detail_language already exists" as status'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add FK constraint for exam_detail.created_by_school_id -> schools.id (if column exists)
-- Check if column exists first
SET @column_exists = (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'cefr_practice' 
    AND TABLE_NAME = 'exam_detail' 
    AND COLUMN_NAME = 'created_by_school_id'
);

SET @constraint_exists = IF(@column_exists > 0, (
    SELECT COUNT(*) 
    FROM information_schema.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = 'cefr_practice' 
    AND TABLE_NAME = 'exam_detail' 
    AND COLUMN_NAME = 'created_by_school_id' 
    AND REFERENCED_TABLE_NAME = 'schools'
), 1); -- If column doesn't exist, skip constraint

SET @sql = IF(@column_exists > 0 AND @constraint_exists = 0, 
    'ALTER TABLE exam_detail ADD CONSTRAINT fk_exam_detail_created_by_school FOREIGN KEY (created_by_school_id) REFERENCES schools(id) ON DELETE SET NULL',
    'SELECT "FK constraint fk_exam_detail_created_by_school skipped or already exists" as status'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify the constraints were added
SELECT 'Verification: Current foreign key constraints' as status;
SELECT 
    CONSTRAINT_NAME, 
    TABLE_NAME, 
    COLUMN_NAME, 
    REFERENCED_TABLE_NAME, 
    REFERENCED_COLUMN_NAME 
FROM information_schema.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = 'cefr_practice' 
AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, COLUMN_NAME;
