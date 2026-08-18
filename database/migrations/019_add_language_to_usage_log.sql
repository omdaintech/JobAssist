-- Migration: Add language_id to usage_log table
-- Purpose: Enable direct language-specific analytics without joining exam_detail
-- Date: 2025-11-07
-- Author: System

-- Step 1: Add language_id column (nullable first for backfill)
ALTER TABLE usage_log 
ADD COLUMN language_id VARCHAR(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL 
AFTER level;

-- Step 2: Add index for query performance
ALTER TABLE usage_log 
ADD KEY idx_language_id (language_id);

-- Step 3: Backfill existing usage_log records with language_id from exam_detail
-- This will populate all existing records where exam_id exists
UPDATE usage_log ul
INNER JOIN exam_detail ed ON ul.exam_id = ed.id
SET ul.language_id = ed.language_id
WHERE ul.language_id IS NULL;

-- Step 4: Add foreign key constraint
ALTER TABLE usage_log 
ADD CONSTRAINT fk_usage_log_language 
FOREIGN KEY (language_id) REFERENCES languages(id) 
ON DELETE RESTRICT 
ON UPDATE CASCADE;

-- Step 5: Optional - Make NOT NULL after backfill is complete
-- Uncomment the following line if all records have been backfilled and you want to enforce NOT NULL
-- ALTER TABLE usage_log 
-- MODIFY COLUMN language_id VARCHAR(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;

-- Verification queries:
-- Check records without language_id:
-- SELECT COUNT(*) as missing_language_id FROM usage_log WHERE language_id IS NULL;

-- Check language distribution:
-- SELECT l.name, l.code, COUNT(ul.id) as usage_count 
-- FROM usage_log ul 
-- LEFT JOIN languages l ON ul.language_id = l.id 
-- GROUP BY l.id, l.name, l.code 
-- ORDER BY usage_count DESC;

-- Check usage by language and level:
-- SELECT l.name as language, ul.level, COUNT(*) as count 
-- FROM usage_log ul 
-- INNER JOIN languages l ON ul.language_id = l.id 
-- GROUP BY l.id, l.name, ul.level 
-- ORDER BY l.name, ul.level;
