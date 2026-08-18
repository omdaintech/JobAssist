-- Fix Language IDs for Hearing Questions
-- Date: 2025-09-27
-- Description: Update hearing questions to use correct German language_id
-- Status: Fixes hardcoded language_ids that were incorrect in sample data

-- Check current language IDs
-- SELECT id, name, native_name FROM languages WHERE is_active = 1;

-- Update hearing questions to use the correct German language_id
-- This fixes the issue where sample hearing questions used a hardcoded wrong language_id
UPDATE question_bank 
SET language_id = (
    SELECT id FROM languages 
    WHERE LOWER(name) LIKE '%german%' 
    AND is_active = 1 
    LIMIT 1
)
WHERE activity_type = 'hearing'
AND language_id = '6876c221cbe142a4c3f53b30';  -- The incorrect hardcoded ID

-- Verify the update
-- SELECT COUNT(*) as hearing_questions_fixed 
-- FROM question_bank 
-- WHERE activity_type = 'hearing' 
-- AND language_id IN (SELECT id FROM languages WHERE LOWER(name) LIKE '%german%');

-- Show current language breakdown for hearing questions
-- SELECT l.name as language_name, qb.level, COUNT(*) as count
-- FROM question_bank qb
-- JOIN languages l ON qb.language_id = l.id
-- WHERE qb.activity_type = 'hearing'
-- AND qb.is_active = 1
-- GROUP BY l.name, qb.level
-- ORDER BY l.name, qb.level;