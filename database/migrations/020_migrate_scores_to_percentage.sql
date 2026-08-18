-- Migration: Convert scores from 0-10 to 0-100 (percentage) scale
-- This updates all existing exam_summary JSON data in the exam_detail table
-- 
-- What it does:
-- - Multiplies activity scores (reading, writing, hearing, speaking) by 10
-- - Multiplies overall_score by 10
-- - Only updates scores that are in 0-10 range (not already converted)
--
-- Usage:
--   mysql -u USER -p DATABASE < migrate_scores_to_percentage.sql
--
-- Or for dry-run (see what would change):
--   mysql -u USER -p DATABASE -e "SELECT id, exam_summary FROM exam_detail WHERE exam_summary IS NOT NULL AND status = 'analyzed' LIMIT 10;"

-- Start transaction
START TRANSACTION;

-- Update exam_summary JSON data
-- This uses MySQL's JSON_SET function to update nested values
UPDATE exam_detail
SET exam_summary = JSON_SET(
    exam_summary,
    -- Update reading score
    '$.activities.reading.score', 
    CASE 
        WHEN JSON_EXTRACT(exam_summary, '$.activities.reading.score') IS NOT NULL 
             AND JSON_EXTRACT(exam_summary, '$.activities.reading.score') BETWEEN 0 AND 10
        THEN ROUND(JSON_EXTRACT(exam_summary, '$.activities.reading.score') * 10, 1)
        ELSE JSON_EXTRACT(exam_summary, '$.activities.reading.score')
    END,
    
    -- Update writing score
    '$.activities.writing.score',
    CASE 
        WHEN JSON_EXTRACT(exam_summary, '$.activities.writing.score') IS NOT NULL 
             AND JSON_EXTRACT(exam_summary, '$.activities.writing.score') BETWEEN 0 AND 10
        THEN ROUND(JSON_EXTRACT(exam_summary, '$.activities.writing.score') * 10, 1)
        ELSE JSON_EXTRACT(exam_summary, '$.activities.writing.score')
    END,
    
    -- Update hearing score
    '$.activities.hearing.score',
    CASE 
        WHEN JSON_EXTRACT(exam_summary, '$.activities.hearing.score') IS NOT NULL 
             AND JSON_EXTRACT(exam_summary, '$.activities.hearing.score') BETWEEN 0 AND 10
        THEN ROUND(JSON_EXTRACT(exam_summary, '$.activities.hearing.score') * 10, 1)
        ELSE JSON_EXTRACT(exam_summary, '$.activities.hearing.score')
    END,
    
    -- Update speaking score
    '$.activities.speaking.score',
    CASE 
        WHEN JSON_EXTRACT(exam_summary, '$.activities.speaking.score') IS NOT NULL 
             AND JSON_EXTRACT(exam_summary, '$.activities.speaking.score') BETWEEN 0 AND 10
        THEN ROUND(JSON_EXTRACT(exam_summary, '$.activities.speaking.score') * 10, 1)
        ELSE JSON_EXTRACT(exam_summary, '$.activities.speaking.score')
    END,
    
    -- Update overall score
    '$.overall.overall_score',
    CASE 
        WHEN JSON_EXTRACT(exam_summary, '$.overall.overall_score') IS NOT NULL 
             AND JSON_EXTRACT(exam_summary, '$.overall.overall_score') BETWEEN 0 AND 10
        THEN ROUND(JSON_EXTRACT(exam_summary, '$.overall.overall_score') * 10, 1)
        ELSE JSON_EXTRACT(exam_summary, '$.overall.overall_score')
    END
)
WHERE exam_summary IS NOT NULL 
  AND status = 'analyzed'
  AND (
      -- Only update records that have scores in 0-10 range (not already converted)
      (JSON_EXTRACT(exam_summary, '$.activities.reading.score') BETWEEN 0 AND 10) OR
      (JSON_EXTRACT(exam_summary, '$.activities.writing.score') BETWEEN 0 AND 10) OR
      (JSON_EXTRACT(exam_summary, '$.activities.hearing.score') BETWEEN 0 AND 10) OR
      (JSON_EXTRACT(exam_summary, '$.activities.speaking.score') BETWEEN 0 AND 10) OR
      (JSON_EXTRACT(exam_summary, '$.overall.overall_score') BETWEEN 0 AND 10)
  );

-- Show how many records were updated
SELECT ROW_COUNT() as 'Records Updated';

-- Commit the transaction
COMMIT;

-- Verify the changes (show sample of updated records)
SELECT 
    id,
    JSON_EXTRACT(exam_summary, '$.activities.reading.score') as reading_score,
    JSON_EXTRACT(exam_summary, '$.activities.writing.score') as writing_score,
    JSON_EXTRACT(exam_summary, '$.overall.overall_score') as overall_score
FROM exam_detail 
WHERE exam_summary IS NOT NULL 
  AND status = 'analyzed'
LIMIT 5;
