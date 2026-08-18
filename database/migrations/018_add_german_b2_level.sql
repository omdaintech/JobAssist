-- Migration: Add B2 level support across entire application
-- Date: 2025-11-04
-- Description: Comprehensive B2 (Upper Intermediate) support including:
--   - German language supported_levels
--   - question_bank level ENUM
--   - templates level ENUM
--   - credit_rules level ENUM + rules
--   - usage_log level ENUM

-- ===================================================================
-- 1. Update German language to include B2 in supported levels
-- ===================================================================
UPDATE languages 
SET supported_levels = JSON_ARRAY('A1', 'A2', 'B1', 'B2'),
    updated_at = CURRENT_TIMESTAMP
WHERE code = 'german';

-- ===================================================================
-- 2. Add B2 to question_bank level ENUM
-- ===================================================================
ALTER TABLE question_bank 
MODIFY COLUMN level ENUM('A1', 'A2', 'B1', 'B2', 'ALL') NOT NULL;

-- ===================================================================
-- 3. Add B2 to templates level ENUM (also add C1 for future)
-- ===================================================================
ALTER TABLE `templates` 
CHANGE COLUMN `level` `level` ENUM('A1', 'A2', 'B1', 'B2', 'C1', 'ALL') CHARACTER SET 'utf8mb4' COLLATE 'utf8mb4_unicode_ci' NOT NULL;

-- ===================================================================
-- 4. Add B2 to credit_rules level ENUM
-- ===================================================================
ALTER TABLE credit_rules 
MODIFY COLUMN level ENUM('A1', 'A2', 'B1', 'B2', 'ALL') NOT NULL;

-- ===================================================================
-- 5. Add B2 credit rules (practice and exam)
-- ===================================================================
-- B2 practice session rule (2 points, same as A1/A2/B1)
INSERT INTO credit_rules (id, session_type, activity_type, level, points_cost, description, active, created_at)
VALUES (
    '6883967022be817edbf47077',
    'practice',
    'any',
    'B2',
    2,
    'B2 Reading practice session',
    1,
    NOW()
)
ON DUPLICATE KEY UPDATE
    points_cost = 2,
    description = 'B2 Reading practice session',
    active = 1;

-- B2 exam session rule (6 points, same as A1/A2/B1)
INSERT INTO credit_rules (id, session_type, activity_type, level, points_cost, description, active, created_at)
VALUES (
    '6883967022be817edbf4707c',
    'exam',
    'multiple',
    'B2',
    6,
    'B2 Complete exam',
    1,
    NOW()
)
ON DUPLICATE KEY UPDATE
    points_cost = 6,
    description = 'B2 Complete exam',
    active = 1;

-- ===================================================================
-- 6. Add B2 to usage_log level ENUM
-- ===================================================================
ALTER TABLE usage_log 
MODIFY COLUMN level ENUM('A1', 'A2', 'B1', 'B2', 'ALL') NOT NULL;

-- ===================================================================
-- VERIFICATION QUERIES
-- ===================================================================
-- Verify German language update
SELECT id, name, code, supported_levels, updated_at
FROM languages
WHERE code = 'german';

-- Verify question_bank ENUM
SHOW COLUMNS FROM question_bank LIKE 'level';

-- Verify templates ENUM
SHOW COLUMNS FROM templates LIKE 'level';

-- Verify credit_rules ENUM and rules
SHOW COLUMNS FROM credit_rules LIKE 'level';
SELECT id, session_type, activity_type, level, points_cost, description, active
FROM credit_rules
WHERE level = 'B2';

-- Verify usage_log ENUM
SHOW COLUMNS FROM usage_log LIKE 'level';

