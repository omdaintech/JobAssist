-- Migration: Optimize User Module Query Performance
-- Date: 2025-10-21
-- Description: Add composite indexes for frequently used query patterns
-- Impact: Improves performance of most common queries in user module

-- ============================================================================
-- HIGH PRIORITY: Optimize exam_log queries
-- ============================================================================
-- This index covers the most frequently executed queries in the user module:
-- - get_exam_progress() - runs on every question request
-- - get_exam_answers() - runs on session completion  
-- - get_last_exam_answer() - runs during answer submission
-- - delete_exam_answers() - runs on session deletion
--
-- Query pattern:
--   SELECT * FROM exam_log 
--   WHERE exam_detail_id = ? AND user_id = ? 
--   ORDER BY question_number

CREATE INDEX IF NOT EXISTS idx_exam_log_user_detail_order 
ON exam_log (exam_detail_id, user_id, question_number);

-- ============================================================================
-- MEDIUM PRIORITY: Optimize usage_log user statistics
-- ============================================================================
-- This index improves user history and statistics queries
-- 
-- Query patterns:
--   SELECT * FROM usage_log 
--   WHERE user_id = ? AND status = 'completed' 
--   ORDER BY timestamp DESC

CREATE INDEX IF NOT EXISTS idx_usage_log_user_status_timestamp 
ON usage_log (user_id, status, timestamp DESC);

-- ============================================================================
-- OPTIONAL (LOW PRIORITY): Optimize session_shares lookups
-- ============================================================================
-- This is optional because share_code already has a UNIQUE index which is fast
-- Only add if you expect high volume of share code lookups with many inactive shares
-- 
-- Uncomment if needed:
-- CREATE INDEX IF NOT EXISTS idx_session_shares_code_active 
-- ON session_shares (share_code, is_active);

-- ============================================================================
-- Verification
-- ============================================================================
-- Verify indexes were created successfully
SELECT 
    'exam_log' as table_name,
    INDEX_NAME,
    COLUMN_NAME,
    SEQ_IN_INDEX,
    NON_UNIQUE
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'exam_log'
  AND INDEX_NAME = 'idx_exam_log_user_detail_order'
ORDER BY SEQ_IN_INDEX;

SELECT 
    'usage_log' as table_name,
    INDEX_NAME,
    COLUMN_NAME,
    SEQ_IN_INDEX,
    NON_UNIQUE
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'usage_log'
  AND INDEX_NAME = 'idx_usage_log_user_status_timestamp'
ORDER BY SEQ_IN_INDEX;

-- ============================================================================
-- Rollback (if needed)
-- ============================================================================
-- To rollback these changes, run:
-- DROP INDEX IF EXISTS idx_exam_log_user_detail_order ON exam_log;
-- DROP INDEX IF EXISTS idx_usage_log_user_status_timestamp ON usage_log;
-- DROP INDEX IF EXISTS idx_session_shares_code_active ON session_shares;

-- ============================================================================
-- Performance Testing Commands
-- ============================================================================
-- Run these EXPLAIN queries before and after migration to verify improvement:

-- Test 1: exam_log query (should use idx_exam_log_user_detail_order)
-- EXPLAIN SELECT * FROM exam_log 
-- WHERE exam_detail_id = 'some_session_id' AND user_id = 'some_user_id' 
-- ORDER BY question_number;

-- Test 2: usage_log query (should use idx_usage_log_user_status_timestamp)
-- EXPLAIN SELECT * FROM usage_log 
-- WHERE user_id = 'some_user_id' AND status = 'completed' 
-- ORDER BY timestamp DESC LIMIT 20;

-- Expected EXPLAIN results:
--   - type: 'ref' or 'range'
--   - key: should show the new composite index name
--   - rows: should be significantly reduced
--   - Extra: should show 'Using index' or 'Using index condition'

